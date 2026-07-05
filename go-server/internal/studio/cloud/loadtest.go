// loadtest.go ports src/lib/cloud/loadtest.js — the traffic/capacity
// simulator. Catalog lookups (instance rps, db qps, next-size-up) go through
// SpecsRepo (Postgres+cache) instead of specs.js's compiled constants.
package cloud

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"ground0.dev/goserver/internal/model"
)

const managedCapacity = 1e9 // managed services we treat as effectively elastic

// specsSnapshot is fetched once per request (SpecsRepo is itself cached, so
// this is cheap) and threaded through the capacity/cost math, replacing
// specs.js's directly-imported constants.
type specsSnapshot struct {
	instanceByID map[string]InstanceType
	instanceIDs  []string // sort_order, for "next size up"
	dbClassByID  map[string]DBClass
	dbClassIDs   []string
	cacheByID    map[string]CacheType
	constants    map[string]float64
}

func loadSpecsSnapshot(ctx context.Context, repo *SpecsRepo) specsSnapshot {
	instances := repo.InstanceTypes(ctx)
	instanceByID := map[string]InstanceType{}
	instanceIDs := make([]string, len(instances))
	for i, it := range instances {
		instanceByID[it.ID] = it
		instanceIDs[i] = it.ID
	}
	dbClasses := repo.DBClasses(ctx)
	dbClassByID := map[string]DBClass{}
	dbClassIDs := make([]string, len(dbClasses))
	for i, c := range dbClasses {
		dbClassByID[c.ID] = c
		dbClassIDs[i] = c.ID
	}
	cacheTypes := repo.CacheTypes(ctx)
	cacheByID := map[string]CacheType{}
	for _, c := range cacheTypes {
		cacheByID[c.ID] = c
	}
	return specsSnapshot{
		instanceByID: instanceByID, instanceIDs: instanceIDs,
		dbClassByID: dbClassByID, dbClassIDs: dbClassIDs,
		cacheByID: cacheByID, constants: repo.Constants(ctx),
	}
}

func (s specsSnapshot) instanceRPS(t string) int {
	if it, ok := s.instanceByID[t]; ok {
		return it.RPS
	}
	return 500
}
func (s specsSnapshot) instanceHourly(t string) float64 {
	if it, ok := s.instanceByID[t]; ok {
		return it.Hourly
	}
	return 0.05
}
func (s specsSnapshot) dbQPS(c string) int {
	if d, ok := s.dbClassByID[c]; ok {
		return d.QPS
	}
	return 1500
}
func (s specsSnapshot) dbHourly(c string) float64 {
	if d, ok := s.dbClassByID[c]; ok {
		return d.Hourly
	}
	return 0.07
}
func (s specsSnapshot) cacheHourly(t string) float64 {
	if c, ok := s.cacheByID[t]; ok {
		return c.Hourly
	}
	return 0.017
}
func (s specsSnapshot) nextInstanceType(t string) string {
	for i, id := range s.instanceIDs {
		if id == t && i < len(s.instanceIDs)-1 {
			return s.instanceIDs[i+1]
		}
	}
	return ""
}
func (s specsSnapshot) nextDBClass(c string) string {
	for i, id := range s.dbClassIDs {
		if id == c && i < len(s.dbClassIDs)-1 {
			return s.dbClassIDs[i+1]
		}
	}
	return ""
}
func (s specsSnapshot) constant(key string) float64 { return s.constants[key] }

var nonEndpointKinds = map[string]bool{
	"internet": true, "nat": true, "dns": true, "cdn": true, "waf": true, "lb": true, "gateway": true, "client": true, "edge": true,
}

func mainPath(nodes []model.Node, edges []model.Edge) []model.Node {
	out := map[string][]string{}
	for _, n := range nodes {
		out[n.ID] = nil
	}
	for _, e := range edges {
		if _, ok := out[e.From]; !ok {
			continue
		}
		if _, ok := out[e.To]; !ok {
			continue
		}
		out[e.From] = append(out[e.From], e.To)
	}
	var entry *model.Node
	for i := range nodes {
		if nodes[i].Kind == "internet" {
			entry = &nodes[i]
			break
		}
	}
	if entry == nil {
		return nil
	}
	byID := map[string]model.Node{}
	for _, n := range nodes {
		byID[n.ID] = n
	}
	prev := map[string]string{}
	dist := map[string]int{entry.ID: 0}
	queue := []string{entry.ID}
	for len(queue) > 0 {
		id := queue[0]
		queue = queue[1:]
		for _, to := range out[id] {
			if _, ok := dist[to]; !ok {
				dist[to] = dist[id] + 1
				prev[to] = id
				queue = append(queue, to)
			}
		}
	}
	var reachable []string
	for id := range dist {
		if id != entry.ID {
			reachable = append(reachable, id)
		}
	}
	if len(reachable) == 0 {
		return nil
	}
	var data []string
	for _, id := range reachable {
		if byID[id].Kind == "database" {
			data = append(data, id)
		}
	}
	pool := data
	if len(pool) == 0 {
		for _, id := range reachable {
			if !nonEndpointKinds[byID[id].Kind] {
				pool = append(pool, id)
			}
		}
	}
	if len(pool) == 0 {
		pool = reachable
	}
	sort.Slice(pool, func(i, j int) bool { return dist[pool[i]] > dist[pool[j]] })
	target := pool[0]

	var path []string
	cur := target
	path = append(path, cur)
	for {
		p, ok := prev[cur]
		if !ok {
			break
		}
		cur = p
		path = append([]string{cur}, path...)
	}
	out2 := make([]model.Node, len(path))
	for i, id := range path {
		out2[i] = byID[id]
	}
	return out2
}

type tierCapacity struct {
	capacity        float64
	scaledInstances int
	ceiling         float64
	scalable        bool
}

func capacityOf(specs specsSnapshot, node model.Node, incoming float64) tierCapacity {
	c := node.Config
	switch node.Kind {
	case "compute", "container":
		instanceType := configString(c, "instanceType")
		per := float64(specs.instanceRPS(instanceType))
		base, hasBase := configNumber(c, "instances")
		if !hasBase || base < 1 {
			base = 1
		}
		autoScale, _ := configBool(c, "autoScale")
		maxInstances, hasMax := configNumber(c, "maxInstances")
		if !hasMax || maxInstances < base {
			maxInstances = base
		}
		max := base
		if autoScale {
			max = maxInstances
		}
		scaled := base
		if autoScale {
			needed := 0.0
			if per > 0 {
				needed = incoming / per
			}
			scaled = maxFloat(base, ceilFloat(needed))
			scaled = minFloat(max, scaled)
		}
		return tierCapacity{capacity: per * scaled, scaledInstances: int(scaled), ceiling: per * max, scalable: false}
	case "database":
		if node.Type == "dynamodb" {
			return tierCapacity{capacity: managedCapacity, scalable: true}
		}
		dbClass := configString(c, "dbClass")
		readReplicas, _ := configNumber(c, "readReplicas")
		cap := float64(specs.dbQPS(dbClass)) * (1 + 0.8*readReplicas)
		return tierCapacity{capacity: cap, scalable: false}
	case "cache":
		return tierCapacity{capacity: 250000, scalable: false}
	default:
		return tierCapacity{capacity: managedCapacity, scalable: true}
	}
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
func ceilFloat(v float64) float64 {
	i := int(v)
	if float64(i) < v {
		return float64(i + 1)
	}
	return float64(i)
}

type Tier struct {
	ID              string     `json:"id"`
	Name            string     `json:"name"`
	Icon            string     `json:"icon,omitempty"`
	Kind            string     `json:"kind"`
	Incoming        int        `json:"incoming"`
	Capacity        int        `json:"capacity"`
	Util            float64    `json:"util"`
	ScaledInstances int        `json:"scaledInstances,omitempty"`
	Scalable        bool       `json:"scalable"`
	Node            model.Node `json:"node"`
}

type Recommendation struct {
	ID     string         `json:"id"`
	NodeID *string        `json:"nodeId"`
	Level  string         `json:"level"`
	Label  string         `json:"label"`
	Detail string         `json:"detail"`
	Patch  map[string]any `json:"patch"`
}

type BottleneckRef struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type LoadTestResult struct {
	OK          bool           `json:"ok"`
	Reason      *string        `json:"reason,omitempty"`
	RPS         int            `json:"rps,omitempty"`
	ServedRPS   int            `json:"servedRps,omitempty"`
	SuccessRate float64        `json:"successRate,omitempty"`
	LatencyMs   *int           `json:"latencyMs"`
	Overloaded  bool           `json:"overloaded,omitempty"`
	Status      string         `json:"status,omitempty"`
	HasCache    bool           `json:"hasCache,omitempty"`
	Bottleneck  *BottleneckRef `json:"bottleneck"`
	// NOT omitempty below: Go's omitempty drops a slice/map key when it has
	// zero elements (not just when nil) — the frontend always does
	// `result.recommendations.length` etc. assuming the key exists, so an
	// omitted key (e.g. "no recommendations for a healthy load test")
	// crashes it with "Cannot read properties of undefined". Always
	// serialize these as `[]`/`{}`, never a missing key.
	Tiers           []Tier           `json:"tiers"`
	InstanceCounts  map[string]int   `json:"instanceCounts"`
	Recommendations []Recommendation `json:"recommendations"`
}

// RunLoadTest ports src/lib/cloud/loadtest.js's runLoadTest.
func RunLoadTest(ctx context.Context, repo *SpecsRepo, g model.Graph, rps int) LoadTestResult {
	path := mainPath(g.Nodes, g.Edges)
	if path == nil {
		return LoadTestResult{OK: false, Reason: reason(`Connect a "Users / Internet" node to your system, then run the test.`)}
	}
	specs := loadSpecsSnapshot(ctx, repo)

	pathIDs := map[string]bool{}
	for _, n := range path {
		pathIDs[n.ID] = true
	}
	cacheBacked := false
	for _, n := range g.Nodes {
		if n.Kind != "cache" {
			continue
		}
		for _, e := range g.Edges {
			if e.To == n.ID && pathIDs[e.From] {
				cacheBacked = true
				break
			}
		}
		if cacheBacked {
			break
		}
	}

	load := float64(rps)
	cacheApplied := false
	var tiers []Tier
	instanceCounts := map[string]int{}
	cacheHitRatio := specs.constant("cacheHitRatio")
	cdnOffload := specs.constant("cdnOffload")

	for _, node := range path {
		if node.Kind == "internet" {
			continue
		}
		incoming := load
		if node.Kind == "database" && cacheBacked && !cacheApplied {
			incoming = load * (1 - cacheHitRatio)
		}
		cap := capacityOf(specs, node, incoming)
		util := 0.0
		if cap.capacity > 0 {
			util = incoming / cap.capacity
		}
		if cap.scaledInstances > 0 {
			instanceCounts[node.ID] = cap.scaledInstances
		}
		tiers = append(tiers, Tier{
			ID: node.ID, Name: node.DisplayName(), Icon: node.Icon, Kind: node.Kind,
			Incoming: roundInt(incoming), Capacity: roundInt(cap.capacity), Util: util,
			ScaledInstances: cap.scaledInstances, Scalable: cap.scalable, Node: node,
		})
		switch node.Kind {
		case "cdn":
			load *= 1 - cdnOffload
		case "cache":
			load *= 1 - cacheHitRatio
			cacheApplied = true
		}
	}

	var bottleneck *Tier
	for i := range tiers {
		if tiers[i].Scalable {
			continue
		}
		if bottleneck == nil || tiers[i].Util > bottleneck.Util {
			bottleneck = &tiers[i]
		}
	}
	maxUtil := 0.0
	if bottleneck != nil {
		maxUtil = bottleneck.Util
	}

	baseLatency := specs.constant("baseLatencyMs")
	var status string
	var successRate float64
	var latencyMs *int
	overloaded := false
	switch {
	case maxUtil <= 0.7:
		status = "Healthy"
		successRate = 1
		l := roundInt(baseLatency + maxUtil*25)
		latencyMs = &l
	case maxUtil <= 1:
		status = "Degraded"
		successRate = 1
		l := roundInt(minFloat(1500, baseLatency/(1.02-maxUtil)))
		latencyMs = &l
	default:
		status = "Overloaded"
		successRate = 1 / maxUtil
		overloaded = true
	}

	var bottleneckRef *BottleneckRef
	if bottleneck != nil {
		bottleneckRef = &BottleneckRef{ID: bottleneck.ID, Name: bottleneck.Name}
	}

	if tiers == nil {
		tiers = []Tier{}
	}
	return LoadTestResult{
		OK: true, RPS: rps, ServedRPS: roundInt(float64(rps) * successRate), SuccessRate: successRate,
		LatencyMs: latencyMs, Overloaded: overloaded, Status: status, HasCache: cacheBacked,
		Bottleneck: bottleneckRef, Tiers: tiers, InstanceCounts: instanceCounts,
		Recommendations: recommend(specs, bottleneck, cacheBacked, maxUtil),
	}
}

func roundInt(v float64) int { return int(v + 0.5) }

func strPtr(s string) *string { return &s }

func mergeConfig(c map[string]any, overrides map[string]any) map[string]any {
	out := map[string]any{}
	for k, v := range c {
		out[k] = v
	}
	for k, v := range overrides {
		out[k] = v
	}
	return out
}

// recommend ports loadtest.js's recommend() — one-click config-patch fixes
// for the bottleneck tier.
func recommend(specs specsSnapshot, b *Tier, hasCache bool, maxUtil float64) []Recommendation {
	recs := []Recommendation{}
	if b == nil || maxUtil <= 0.7 {
		if b != nil && maxUtil < 0.18 && (b.Kind == "compute" || b.Kind == "container") {
			instances, hasInstances := configNumber(b.Node.Config, "instances")
			autoScale, _ := configBool(b.Node.Config, "autoScale")
			if !autoScale && hasInstances && instances > 1 {
				recs = append(recs, Recommendation{
					ID: "downsize", NodeID: strPtr(b.ID), Level: "cost",
					Label:  "Right-size to save money",
					Detail: fmt.Sprintf("%s is barely used at this traffic. Drop to 1 instance (or enable Auto Scaling) to cut cost.", b.Name),
					Patch:  map[string]any{"config": mergeConfig(b.Node.Config, map[string]any{"instances": 1.0})},
				})
			}
		}
		return recs
	}

	c := b.Node.Config
	instanceType := configString(c, "instanceType")
	per := float64(specs.instanceRPS(instanceType))
	autoScale, _ := configBool(c, "autoScale")
	maxInstances, _ := configNumber(c, "maxInstances")

	if b.Kind == "compute" || b.Kind == "container" {
		needed := 0.0
		if per > 0 {
			needed = ceilFloat(float64(b.Incoming) / per)
		}
		if !autoScale {
			recs = append(recs,
				Recommendation{
					ID: "autoscale", NodeID: strPtr(b.ID), Level: "fix",
					Label:  "Enable Auto Scaling",
					Detail: fmt.Sprintf("Let %s scale out automatically (up to %d instances) when traffic rises, instead of a fixed fleet.", b.Name, int(maxFloat(maxInstances, needed))),
					Patch:  map[string]any{"config": mergeConfig(c, map[string]any{"autoScale": true, "maxInstances": maxFloat(maxInstances, needed)})},
				},
				Recommendation{
					ID: "scaleout", NodeID: strPtr(b.ID), Level: "fix",
					Label:  fmt.Sprintf("Scale out to %d instances", int(needed)),
					Detail: fmt.Sprintf("%s needs ~%d× %s to absorb %d req/s.", b.Name, int(needed), instanceType, b.Incoming),
					Patch:  map[string]any{"config": mergeConfig(c, map[string]any{"instances": needed})},
				},
			)
		} else if needed > maxInstances {
			recs = append(recs, Recommendation{
				ID: "raisemax", NodeID: strPtr(b.ID), Level: "fix",
				Label:  fmt.Sprintf("Raise max instances to %d", int(needed)),
				Detail: fmt.Sprintf("Auto Scaling is capped at %d; it needs to reach ~%d to keep up.", int(maxInstances), int(needed)),
				Patch:  map[string]any{"config": mergeConfig(c, map[string]any{"maxInstances": needed})},
			})
		}
		if bigger := specs.nextInstanceType(instanceType); bigger != "" {
			recs = append(recs, Recommendation{
				ID: "upsize", NodeID: strPtr(b.ID), Level: "fix",
				Label:  fmt.Sprintf("Upgrade to %s", bigger),
				Detail: "A larger instance type handles more per node — fewer instances to manage.",
				Patch:  map[string]any{"config": mergeConfig(c, map[string]any{"instanceType": bigger})},
			})
		}
	}

	if b.Kind == "database" {
		readReplicas, _ := configNumber(c, "readReplicas")
		recs = append(recs, Recommendation{
			ID: "replica", NodeID: strPtr(b.ID), Level: "fix",
			Label:  "Add a read replica",
			Detail: fmt.Sprintf("Offload read queries from %s to a replica to multiply read throughput.", b.Name),
			Patch:  map[string]any{"config": mergeConfig(c, map[string]any{"readReplicas": readReplicas + 1})},
		})
		dbClass := configString(c, "dbClass")
		if bigger := specs.nextDBClass(dbClass); bigger != "" {
			recs = append(recs, Recommendation{
				ID: "dbupsize", NodeID: strPtr(b.ID), Level: "fix",
				Label:  fmt.Sprintf("Upgrade to %s", bigger),
				Detail: "A bigger DB class raises sustained query throughput.",
				Patch:  map[string]any{"config": mergeConfig(c, map[string]any{"dbClass": bigger})},
			})
		}
		if !hasCache {
			recs = append(recs, Recommendation{
				ID: "addcache", NodeID: nil, Level: "advice",
				Label:  "Add an ElastiCache cache",
				Detail: fmt.Sprintf("Drag an ElastiCache node in front of %s and wire the app to it — it absorbs ~80%% of reads so the DB sees far less load.", b.Name),
				Patch:  nil,
			})
		}
	}
	return recs
}

// ── Load-flow visualisation on the design board ──

type NodeStatus struct {
	Level    string `json:"level"`
	Util     int    `json:"util"`
	Scalable bool   `json:"scalable"`
}

type LoadFlowResult struct {
	OK         bool           `json:"ok"`
	Status     string         `json:"status,omitempty"`
	ServedRPS  int            `json:"servedRps,omitempty"`
	Bottleneck *BottleneckRef `json:"bottleneck"`
	// NOT omitempty — see the comment on LoadTestResult above.
	Recommendations []Recommendation      `json:"recommendations"`
	Steps           []Step                `json:"steps"`
	NodeStatus      map[string]NodeStatus `json:"nodeStatus"`
	Reason          *string               `json:"reason,omitempty"`
}

func edgeBetween(edges []model.Edge, a, b string) *model.Edge {
	for i := range edges {
		e := edges[i]
		if (e.From == a && e.To == b) || (e.From == b && e.To == a) {
			return &edges[i]
		}
	}
	return nil
}

func fmtRps(rps int) string {
	if rps >= 1000 {
		v := float64(rps) / 1000
		if rps%1000 != 0 {
			return fmt.Sprintf("%.1fk", v)
		}
		return fmt.Sprintf("%.0fk", v)
	}
	return fmt.Sprintf("%d", rps)
}

func commaInt(n int) string {
	s := fmt.Sprintf("%d", n)
	neg := strings.HasPrefix(s, "-")
	if neg {
		s = s[1:]
	}
	var parts []string
	for len(s) > 3 {
		parts = append([]string{s[len(s)-3:]}, parts...)
		s = s[:len(s)-3]
	}
	parts = append([]string{s}, parts...)
	out := strings.Join(parts, ",")
	if neg {
		out = "-" + out
	}
	return out
}

func levelOfTier(t Tier) string {
	if t.Scalable {
		return "ok"
	}
	if t.Util > 1 {
		return "over"
	}
	if t.Util > 0.7 {
		return "warn"
	}
	return "ok"
}

// BuildLoadFlow ports src/lib/cloud/loadtest.js's buildLoadFlow — turns a
// load test into an animatable board sequence.
func BuildLoadFlow(ctx context.Context, repo *SpecsRepo, g model.Graph, rps int) LoadFlowResult {
	result := RunLoadTest(ctx, repo, g, rps)
	if !result.OK {
		return LoadFlowResult{OK: false, Reason: result.Reason, Steps: []Step{}, NodeStatus: map[string]NodeStatus{}}
	}

	var entry *model.Node
	for i := range g.Nodes {
		if g.Nodes[i].Kind == "internet" {
			entry = &g.Nodes[i]
			break
		}
	}

	nodeStatus := map[string]NodeStatus{}
	if entry != nil {
		nodeStatus[entry.ID] = NodeStatus{Level: "ok", Util: 100, Scalable: true}
	}
	for _, t := range result.Tiers {
		nodeStatus[t.ID] = NodeStatus{Level: levelOfTier(t), Util: roundInt(t.Util * 100), Scalable: t.Scalable}
	}

	var steps []Step
	prevID := ""
	if entry != nil {
		prevID = entry.ID
	}
	blocked := false
	for _, t := range result.Tiers {
		if blocked {
			break
		}
		level := levelOfTier(t)
		verdict := "ok"
		if level == "over" {
			verdict = "blocked"
		} else if level == "warn" {
			verdict = "insecure"
		}
		color := ""
		if level == "ok" {
			color = colorGreen
		}
		pct := roundInt(t.Util * 100)
		var note string
		switch level {
		case "over":
			fixLabel := ""
			for _, r := range result.Recommendations {
				if r.Label != "" {
					fixLabel = r.Label
					break
				}
			}
			note = fmt.Sprintf("⚠ OVERFLOW at %s: %s req/s hitting only %s capacity (%d%%). The connection breaks — requests are dropping.", t.Name, commaInt(t.Incoming), commaInt(t.Capacity), pct)
			if fixLabel != "" {
				note += fmt.Sprintf(" Fix: %s.", fixLabel)
			}
		case "warn":
			note = fmt.Sprintf("%s is running hot — %d%% of capacity (%s/%s req/s). Latency climbing; close to the limit.", t.Name, pct, commaInt(t.Incoming), commaInt(t.Capacity))
		default:
			if t.Scalable {
				note = fmt.Sprintf("%s scales automatically — absorbing %s req/s comfortably.", t.Name, commaInt(t.Incoming))
			} else {
				note = fmt.Sprintf("%s: %d%% used (%s/%s req/s). Healthy.", t.Name, pct, commaInt(t.Incoming), commaInt(t.Capacity))
			}
		}
		if prevID != "" {
			var ref StepEdgeRef
			if e := edgeBetween(g.Edges, prevID, t.ID); e != nil {
				ref = edgeRef(*e)
			} else {
				ref = StepEdgeRef{ID: fmt.Sprintf("lf%d", len(steps))}
			}
			packet := fmt.Sprintf("%s rps", fmtRps(t.Incoming))
			if level == "over" {
				packet = "⚠ overflow"
			}
			steps = append(steps, Step{Edge: ref, From: prevID, To: t.ID, Verdict: verdict, Color: color, Note: note, Packet: packet})
		}
		if verdict == "blocked" {
			blocked = true
		}
		prevID = t.ID
	}

	if !blocked && entry != nil {
		steps = append(steps, Step{
			Edge: StepEdgeRef{ID: fmt.Sprintf("lf%d", len(steps))}, From: prevID, To: entry.ID,
			Verdict: "ok", Color: colorGreen,
			Note:   fmt.Sprintf("Every tier held up — %s req/s served and the response flows back to the user. ✓", fmtRps(result.ServedRPS)),
			Packet: "200 OK ◀",
		})
	}

	if steps == nil {
		steps = []Step{}
	}
	return LoadFlowResult{
		OK: !blocked, Status: result.Status, ServedRPS: result.ServedRPS, Bottleneck: result.Bottleneck,
		Recommendations: result.Recommendations, Steps: steps, NodeStatus: nodeStatus, Reason: nil,
	}
}
