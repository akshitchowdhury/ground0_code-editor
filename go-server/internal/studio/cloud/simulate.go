package cloud

import (
	"fmt"

	"ground0.dev/goserver/internal/model"
)

// Response-leg / stage colours, mirroring src/lib/cloud/simulate.js.
const (
	colorGreen  = "rgb(74 222 128)"
	colorAmber  = "rgb(245 158 11)"
	colorViolet = "rgb(167 139 250)"
	colorEgress = "rgb(251 146 60)"
)

var (
	managedTo  = map[string]bool{"internet": true, "edge": true, "dns": true, "cdn": true, "waf": true, "client": true}
	sgExempt   = map[string]bool{"internet": true, "edge": true, "dns": true, "cdn": true, "waf": true, "lb": true, "gateway": true, "client": true}
	infraKinds = map[string]bool{
		"internet": true, "nat": true, "dns": true, "cdn": true, "waf": true, "lb": true, "gateway": true, "client": true, "edge": true,
	}
	dataTierKinds    = map[string]bool{"database": true, "cache": true, "storage": true}
	computeTierKinds = map[string]bool{"compute": true, "container": true, "serverless": true}
)

// StepEdgeRef is the `edge` field of a Step — either a real graph edge
// (id/from/to/port) or a synthetic one for a hop the canvas doesn't have a
// drawn wire for (e.g. a response leg reusing the forward edge's id, or a
// placeholder like `{id: "eg-out"}`).
type StepEdgeRef struct {
	ID   string `json:"id"`
	From string `json:"from,omitempty"`
	To   string `json:"to,omitempty"`
	Port int    `json:"port,omitempty"`
}

type Step struct {
	Edge    StepEdgeRef `json:"edge"`
	From    string      `json:"from"`
	To      string      `json:"to"`
	Port    int         `json:"port,omitempty"`
	Verdict string      `json:"verdict"`
	Color   string      `json:"color,omitempty"`
	Note    string      `json:"note"`
	Packet  string      `json:"packet"`
}

type SimResult struct {
	OK         bool    `json:"ok"`
	BlockedAt  *int    `json:"blockedAt"`
	Target     string  `json:"target,omitempty"`
	TargetName string  `json:"targetName,omitempty"`
	Steps      []Step  `json:"steps"`
	Reason     *string `json:"reason"`
	Egress     bool    `json:"egress,omitempty"`
}

func reason(s string) *string { return &s }

func edgeRef(e model.Edge) StepEdgeRef {
	return StepEdgeRef{ID: e.ID, From: e.From, To: e.To, Port: e.Port}
}

func buildAdjacency(nodes []model.Node, edges []model.Edge) map[string][]model.Edge {
	adj := map[string][]model.Edge{}
	valid := map[string]bool{}
	for _, n := range nodes {
		adj[n.ID] = nil
		valid[n.ID] = true
	}
	for _, e := range edges {
		if valid[e.From] && valid[e.To] {
			adj[e.From] = append(adj[e.From], e)
		}
	}
	return adj
}

// findPath is a BFS shortest-edge-path search between two node ids.
func findPath(adj map[string][]model.Edge, fromID, toID string) []model.Edge {
	if fromID == toID {
		return []model.Edge{}
	}
	prev := map[string]model.Edge{}
	seen := map[string]bool{fromID: true}
	queue := []string{fromID}
	for len(queue) > 0 {
		id := queue[0]
		queue = queue[1:]
		for _, e := range adj[id] {
			if seen[e.To] {
				continue
			}
			seen[e.To] = true
			prev[e.To] = e
			if e.To == toID {
				var path []model.Edge
				cur := toID
				for cur != fromID {
					edge := prev[cur]
					path = append([]model.Edge{edge}, path...)
					cur = edge.From
				}
				return path
			}
			queue = append(queue, e.To)
		}
	}
	return nil
}

// pickTarget picks the request's endpoint: prefer a data tier (database >
// storage > cache), then the deepest compute node, then the deepest
// non-infrastructure node. Never infrastructure (NAT/LB/edge/internet/...).
func pickTarget(nodes []model.Node, adj map[string][]model.Edge, entryID string, byID map[string]model.Node) string {
	dist := map[string]int{entryID: 0}
	queue := []string{entryID}
	for len(queue) > 0 {
		id := queue[0]
		queue = queue[1:]
		for _, e := range adj[id] {
			if _, ok := dist[e.To]; !ok {
				dist[e.To] = dist[id] + 1
				queue = append(queue, e.To)
			}
		}
	}
	var reachable []string
	for id := range dist {
		if id != entryID {
			reachable = append(reachable, id)
		}
	}
	if len(reachable) == 0 {
		return ""
	}

	rank := func(id string) int {
		switch byID[id].Kind {
		case "database":
			return 0
		case "storage":
			return 1
		default:
			return 2
		}
	}
	farthestBy := func(pool []string, rankOf func(string) int) string {
		best := ""
		bestRank, bestDist := 1<<30, -1
		for _, id := range pool {
			r := 0
			if rankOf != nil {
				r = rankOf(id)
			}
			d := dist[id]
			if best == "" || r < bestRank || (r == bestRank && d > bestDist) {
				best, bestRank, bestDist = id, r, d
			}
		}
		return best
	}

	var data []string
	for _, id := range reachable {
		if dataTierKinds[byID[id].Kind] {
			data = append(data, id)
		}
	}
	if len(data) > 0 {
		return farthestBy(data, rank)
	}

	var compute []string
	for _, id := range reachable {
		if computeTierKinds[byID[id].Kind] {
			compute = append(compute, id)
		}
	}
	if len(compute) > 0 {
		return farthestBy(compute, nil)
	}

	var pool []string
	for _, id := range reachable {
		if !infraKinds[byID[id].Kind] {
			pool = append(pool, id)
		}
	}
	if len(pool) == 0 {
		return ""
	}
	return farthestBy(pool, nil)
}

func evalHop(from, to model.Node, port int) (verdict, note string) {
	legal := classifyEdge(from, to)
	if !legal.OK {
		return "blocked", "Blocked — illogical setup. " + legal.Reason
	}
	allowsPort := managedTo[to.Kind]
	if !allowsPort {
		for _, p := range to.Ports {
			if p == port {
				allowsPort = true
				break
			}
		}
	}
	if !allowsPort {
		return "blocked", fmt.Sprintf("Blocked: %s's security group does not allow inbound :%d. Open it (or fix the source port) to let traffic through.", to.DisplayName(), port)
	}
	if statefulKinds[to.Kind] && (isInternetNode(from) || publicEntryKinds[from.Kind]) {
		return "insecure", fmt.Sprintf("Reaches %s, but data tiers should sit behind the app tier — not directly behind %s.", to.DisplayName(), from.DisplayName())
	}
	if to.OpenToInternet && !sgExempt[to.Kind] {
		return "insecure", fmt.Sprintf("Reaches %s on :%d, but its security group is open to 0.0.0.0/0 — tighten it.", to.DisplayName(), port)
	}
	return "ok", fmt.Sprintf("%s → %s on :%d — accepted.", from.DisplayName(), to.DisplayName(), port)
}

func forwardSteps(path []model.Edge, byID map[string]model.Node) ([]Step, *int) {
	var steps []Step
	var blockedAt *int
	for _, e := range path {
		from, to := byID[e.From], byID[e.To]
		verdict, note := evalHop(from, to, e.Port)
		steps = append(steps, Step{Edge: edgeRef(e), From: from.ID, To: to.ID, Port: e.Port, Verdict: verdict, Note: note, Packet: fmt.Sprintf(":%d", e.Port)})
		if verdict == "blocked" {
			i := len(steps) - 1
			blockedAt = &i
			break
		}
	}
	return steps, blockedAt
}

func responseSteps(path []model.Edge, byID map[string]model.Node) []Step {
	var steps []Step
	for i := len(path) - 1; i >= 0; i-- {
		e := path[i]
		src, dst := byID[e.To], byID[e.From]
		last := i == 0
		note := fmt.Sprintf("%s returns its result up to %s.", src.DisplayName(), dst.DisplayName())
		packet := "response ◀"
		if last {
			note = fmt.Sprintf("%s sends the response back to %s. 200 OK — the user has their answer. Full request → response cycle complete. ✓", src.DisplayName(), dst.DisplayName())
			packet = "200 OK ◀"
		}
		steps = append(steps, Step{Edge: edgeRef(e), From: src.ID, To: dst.ID, Port: e.Port, Verdict: "ok", Color: colorGreen, Note: note, Packet: packet})
	}
	return steps
}

type cacheAside struct {
	appID     string
	cacheEdge model.Edge
	dbEdge    model.Edge
}

func findCacheAside(nodes []model.Node, edges []model.Edge, byID map[string]model.Node) *cacheAside {
	for _, n := range nodes {
		if !computeKinds[n.Kind] {
			continue
		}
		var cacheEdge, dbEdge *model.Edge
		for i := range edges {
			e := edges[i]
			if e.From != n.ID {
				continue
			}
			if to, ok := byID[e.To]; ok {
				if to.Kind == "cache" && cacheEdge == nil {
					cacheEdge = &edges[i]
				}
				if to.Kind == "database" && dbEdge == nil {
					dbEdge = &edges[i]
				}
			}
		}
		if cacheEdge != nil && dbEdge != nil {
			return &cacheAside{appID: n.ID, cacheEdge: *cacheEdge, dbEdge: *dbEdge}
		}
	}
	return nil
}

func portAllowed(n model.Node, port int) bool {
	for _, p := range n.Ports {
		if p == port {
			return true
		}
	}
	return false
}

func buildCacheAsideSim(entry model.Node, ca *cacheAside, adj map[string][]model.Edge, byID map[string]model.Node) *SimResult {
	app, cache, db := byID[ca.appID], byID[ca.cacheEdge.To], byID[ca.dbEdge.To]
	toApp := findPath(adj, entry.ID, ca.appID)
	if toApp == nil || len(toApp) == 0 {
		return nil
	}

	steps, blockedAt := forwardSteps(toApp, byID)
	if blockedAt != nil {
		return &SimResult{OK: false, BlockedAt: blockedAt, Target: ca.appID, TargetName: app.DisplayName(), Steps: steps, Reason: nil}
	}

	cachePort, dbPort := ca.cacheEdge.Port, ca.dbEdge.Port

	// 1. Check the cache first.
	if !portAllowed(cache, cachePort) {
		steps = append(steps, Step{
			Edge: edgeRef(ca.cacheEdge), From: app.ID, To: cache.ID, Port: cachePort, Verdict: "blocked",
			Note:   fmt.Sprintf("Blocked: %s's security group does not allow inbound :%d, so the app can't reach the cache.", cache.DisplayName(), cachePort),
			Packet: fmt.Sprintf(":%d", cachePort),
		})
		i := len(steps) - 1
		return &SimResult{OK: false, BlockedAt: &i, Target: cache.ID, TargetName: cache.DisplayName(), Steps: steps, Reason: nil}
	}
	steps = append(steps, Step{
		Edge: edgeRef(ca.cacheEdge), From: app.ID, To: cache.ID, Port: cachePort, Verdict: "ok",
		Note:   fmt.Sprintf("Cache-aside: %s checks %s first. On a HIT it returns from memory in <1 ms and never touches the database.", app.DisplayName(), cache.DisplayName()),
		Packet: fmt.Sprintf("GET :%d", cachePort),
	})

	// 2. Miss — fall through to the database.
	steps = append(steps, Step{
		Edge: edgeRef(ca.cacheEdge), From: cache.ID, To: app.ID, Port: cachePort, Verdict: "ok", Color: colorAmber,
		Note:   fmt.Sprintf("Cache MISS — this key isn't cached yet, so %s falls through to the database.", app.DisplayName()),
		Packet: "MISS ◀",
	})

	// 3. Query the database.
	if !portAllowed(db, dbPort) {
		steps = append(steps, Step{
			Edge: edgeRef(ca.dbEdge), From: app.ID, To: db.ID, Port: dbPort, Verdict: "blocked",
			Note:   fmt.Sprintf("Blocked: %s's security group does not allow inbound :%d.", db.DisplayName(), dbPort),
			Packet: fmt.Sprintf(":%d", dbPort),
		})
		i := len(steps) - 1
		return &SimResult{OK: false, BlockedAt: &i, Target: db.ID, TargetName: db.DisplayName(), Steps: steps, Reason: nil}
	}
	steps = append(steps, Step{
		Edge: edgeRef(ca.dbEdge), From: app.ID, To: db.ID, Port: dbPort, Verdict: "ok",
		Note:   fmt.Sprintf("%s queries %s for the data.", app.DisplayName(), db.DisplayName()),
		Packet: fmt.Sprintf(":%d", dbPort),
	})

	// 4. Database returns the row.
	steps = append(steps, Step{
		Edge: edgeRef(ca.dbEdge), From: db.ID, To: app.ID, Port: dbPort, Verdict: "ok", Color: colorGreen,
		Note:   fmt.Sprintf("%s returns the row to %s.", db.DisplayName(), app.DisplayName()),
		Packet: "row ◀",
	})

	// 5. Populate the cache so the next read is a HIT.
	steps = append(steps, Step{
		Edge: edgeRef(ca.cacheEdge), From: app.ID, To: cache.ID, Port: cachePort, Verdict: "ok", Color: colorViolet,
		Note:   fmt.Sprintf("%s writes the result into %s (SET). The next read of this key is a HIT — served from memory, no DB round-trip.", app.DisplayName(), cache.DisplayName()),
		Packet: "SET",
	})

	// 6. Response back to the user.
	steps = append(steps, responseSteps(toApp, byID)...)

	return &SimResult{OK: true, BlockedAt: nil, Target: db.ID, TargetName: cache.DisplayName() + " + " + db.DisplayName(), Steps: steps, Reason: nil}
}

type egress struct {
	appID    string
	nat      model.Node
	internet *model.Node
	inEdge   model.Edge
	outEdge  *model.Edge
}

func findEgress(nodes []model.Node, edges []model.Edge, byID map[string]model.Node) *egress {
	var nat *model.Node
	for i := range nodes {
		if nodes[i].Kind == "nat" {
			nat = &nodes[i]
			break
		}
	}
	if nat == nil {
		return nil
	}
	var inEdge *model.Edge
	for i := range edges {
		e := edges[i]
		if e.To == nat.ID {
			if from, ok := byID[e.From]; ok && computeTierKinds[from.Kind] {
				inEdge = &edges[i]
				break
			}
		}
	}
	if inEdge == nil {
		return nil
	}
	var outEdge *model.Edge
	for i := range edges {
		e := edges[i]
		if e.From == nat.ID {
			if to, ok := byID[e.To]; ok && to.Kind == "internet" {
				outEdge = &edges[i]
				break
			}
		}
	}
	var internet *model.Node
	if outEdge != nil {
		n := byID[outEdge.To]
		internet = &n
	} else {
		for i := range nodes {
			if nodes[i].Kind == "internet" {
				internet = &nodes[i]
				break
			}
		}
	}
	return &egress{appID: inEdge.From, nat: *nat, internet: internet, inEdge: *inEdge, outEdge: outEdge}
}

func egressSteps(eg *egress, byID map[string]model.Node) []Step {
	app := byID[eg.appID]
	nat, internet := eg.nat, eg.internet
	port := eg.inEdge.Port
	if port == 0 {
		port = 443
	}
	steps := []Step{{
		Edge: edgeRef(eg.inEdge), From: app.ID, To: nat.ID, Port: port, Verdict: "ok", Color: colorEgress,
		Note:   fmt.Sprintf("Outbound egress — %s needs to fetch OS patches / install packages / call a third-party API. A private subnet has no route to the internet of its own, so it goes OUT through %s.", app.DisplayName(), nat.DisplayName()),
		Packet: "egress →",
	}}
	if internet != nil {
		outRef := StepEdgeRef{ID: "eg-out"}
		oport := 443
		if eg.outEdge != nil {
			outRef = edgeRef(*eg.outEdge)
			if eg.outEdge.Port != 0 {
				oport = eg.outEdge.Port
			}
		}
		steps = append(steps,
			Step{
				Edge: outRef, From: nat.ID, To: internet.ID, Port: oport, Verdict: "ok", Color: colorEgress,
				Note:   fmt.Sprintf("%s swaps the private source IP for its own public IP (source NAT) and forwards the request to the internet — the only way out for private instances.", nat.DisplayName()),
				Packet: "→ internet",
			},
			Step{
				Edge: outRef, From: internet.ID, To: nat.ID, Port: oport, Verdict: "ok", Color: colorGreen,
				Note:   fmt.Sprintf("The external service responds to %s.", nat.DisplayName()),
				Packet: "← reply",
			},
		)
	}
	steps = append(steps, Step{
		Edge: edgeRef(eg.inEdge), From: nat.ID, To: app.ID, Port: port, Verdict: "ok", Color: colorGreen,
		Note:   fmt.Sprintf("%s routes the reply back to %s. Crucially, the internet could NOT have opened this connection itself — NAT is outbound-only, so the private subnet stays unreachable from the internet. ✓", nat.DisplayName(), app.DisplayName()),
		Packet: "← back",
	})
	return steps
}

func withEgress(sim *SimResult, eg *egress, byID map[string]model.Node) *SimResult {
	if eg == nil || !sim.OK {
		return sim
	}
	sim.Egress = true
	sim.Steps = append(sim.Steps, egressSteps(eg, byID)...)
	return sim
}

// BuildSimulation ports src/lib/cloud/simulate.js's buildSimulation.
func BuildSimulation(g model.Graph, targetID string) SimResult {
	nodes, edges := g.Nodes, g.Edges
	byID := map[string]model.Node{}
	for _, n := range nodes {
		byID[n.ID] = n
	}
	adj := buildAdjacency(nodes, edges)

	var entry *model.Node
	for i := range nodes {
		if isInternetNode(nodes[i]) {
			entry = &nodes[i]
			break
		}
	}
	if entry == nil {
		return SimResult{OK: false, Reason: reason(`Add a "Users / Internet" node to simulate an incoming request.`), Steps: []Step{}}
	}

	eg := findEgress(nodes, edges, byID)

	ca := findCacheAside(nodes, edges, byID)
	if ca != nil {
		matchesTarget := targetID == "" || targetID == ca.cacheEdge.To || targetID == ca.dbEdge.To || targetID == ca.appID
		if matchesTarget {
			if sim := buildCacheAsideSim(*entry, ca, adj, byID); sim != nil {
				return *withEgress(sim, eg, byID)
			}
		}
	}

	target := targetID
	if target == "" || byID[target].ID == "" {
		target = pickTarget(nodes, adj, entry.ID, byID)
	}
	if target == "" {
		return SimResult{OK: false, Reason: reason("Nothing is connected to the internet entry point yet."), Steps: []Step{}}
	}

	path := findPath(adj, entry.ID, target)
	if path == nil || len(path) == 0 {
		return SimResult{OK: false, Reason: reason(fmt.Sprintf("No connected path from the internet to %s. Draw the missing connection.", byID[target].DisplayName())), Steps: []Step{}}
	}

	steps, blockedAt := forwardSteps(path, byID)
	if blockedAt == nil {
		steps = append(steps, responseSteps(path, byID)...)
	}

	sim := &SimResult{OK: blockedAt == nil, BlockedAt: blockedAt, Target: target, TargetName: byID[target].DisplayName(), Steps: steps, Reason: nil}
	return *withEgress(sim, eg, byID)
}

// SimulationTargets returns the nodes a user can choose as a simulation
// target — data tiers, compute (the app), and queues. Pass-through
// infrastructure is never a request endpoint.
func SimulationTargets(nodes []model.Node) []model.Node {
	var out []model.Node
	for _, n := range nodes {
		if dataTierKinds[n.Kind] || computeTierKinds[n.Kind] || n.Kind == "queue" {
			out = append(out, n)
		}
	}
	if out == nil {
		out = []model.Node{}
	}
	return out
}
