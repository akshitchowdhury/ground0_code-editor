package cloud

import (
	"fmt"

	"ground0.dev/goserver/internal/model"
)

var levelWeight = map[string]int{"critical": 30, "high": 17, "warn": 9, "info": 4, "ok": 0}
var securityCats = map[string]bool{"security": true, "iam": true, "storage": true}
var correctnessCats = map[string]bool{"correctness": true}

type Finding struct {
	ID       string   `json:"id"`
	Level    string   `json:"level"`
	Category string   `json:"category"`
	Title    string   `json:"title"`
	Detail   string   `json:"detail"`
	NodeIDs  []string `json:"nodeIds"`
}

type Verdict struct {
	Label string `json:"label"`
	Tone  string `json:"tone"`
}

type AnalyzeResult struct {
	Findings         []Finding `json:"findings"`
	CorrectnessScore int       `json:"correctnessScore"`
	SecurityScore    int       `json:"securityScore"`
	DesignScore      int       `json:"designScore"`
	Overall          int       `json:"overall"`
	Verdict          Verdict   `json:"verdict"`
	Empty            bool      `json:"empty"`
}

type adjacency struct {
	out, inc, undirected map[string][]string
}

func buildGraph(nodes []model.Node, edges []model.Edge) adjacency {
	a := adjacency{out: map[string][]string{}, inc: map[string][]string{}, undirected: map[string][]string{}}
	for _, n := range nodes {
		a.out[n.ID] = []string{}
		a.inc[n.ID] = []string{}
		a.undirected[n.ID] = []string{}
	}
	for _, e := range edges {
		if _, ok := a.out[e.From]; !ok {
			continue
		}
		if _, ok := a.out[e.To]; !ok {
			continue
		}
		a.out[e.From] = append(a.out[e.From], e.To)
		a.inc[e.To] = append(a.inc[e.To], e.From)
		a.undirected[e.From] = append(a.undirected[e.From], e.To)
		a.undirected[e.To] = append(a.undirected[e.To], e.From)
	}
	return a
}

func reachableFromInternet(nodes []model.Node, g adjacency) map[string]bool {
	seen := map[string]bool{}
	var stack []string
	for _, n := range nodes {
		if isInternetNode(n) {
			seen[n.ID] = true
			stack = append(stack, n.ID)
		}
	}
	for len(stack) > 0 {
		id := stack[len(stack)-1]
		stack = stack[:len(stack)-1]
		for _, next := range g.out[id] {
			if !seen[next] {
				seen[next] = true
				stack = append(stack, next)
			}
		}
	}
	return seen
}

// findingAdder accumulates findings in encounter order, matching analyze.js's
// sequential `add()` calls (finding ids embed a running per-category index).
type findingAdder struct {
	findings []Finding
}

func (a *findingAdder) add(level, category, title, detail string, nodeIDs []string) {
	if nodeIDs == nil {
		nodeIDs = []string{}
	}
	a.findings = append(a.findings, Finding{
		ID: fmt.Sprintf("%s-%d", category, len(a.findings)), Level: level, Category: category,
		Title: title, Detail: detail, NodeIDs: nodeIDs,
	})
}

func configBool(cfg map[string]any, key string) (bool, bool) {
	if cfg == nil {
		return false, false
	}
	v, ok := cfg[key]
	if !ok {
		return false, false
	}
	b, _ := v.(bool)
	return b, true
}

func configString(cfg map[string]any, key string) string {
	if cfg == nil {
		return ""
	}
	s, _ := cfg[key].(string)
	return s
}

func configNumber(cfg map[string]any, key string) (float64, bool) {
	if cfg == nil {
		return 0, false
	}
	switch v := cfg[key].(type) {
	case float64:
		return v, true
	case int:
		return float64(v), true
	}
	return 0, false
}

// AnalyzeArchitecture ports src/lib/cloud/analyze.js's analyzeArchitecture
// rule-by-rule. See that file for the rationale behind each check.
func AnalyzeArchitecture(g model.Graph) AnalyzeResult {
	nodes, edges := g.Nodes, g.Edges

	if len(nodes) == 0 {
		return AnalyzeResult{
			Findings: []Finding{}, Verdict: Verdict{Label: "Empty canvas", Tone: "warn"}, Empty: true,
		}
	}

	byID := map[string]model.Node{}
	for _, n := range nodes {
		byID[n.ID] = n
	}
	graph := buildGraph(nodes, edges)
	reachable := reachableFromInternet(nodes, graph)
	fa := &findingAdder{findings: []Finding{}}

	// ── TOPOLOGY: illogical / impossible wiring ──
	invalidCount := 0
	for _, e := range edges {
		from, ok1 := byID[e.From]
		to, ok2 := byID[e.To]
		if !ok1 || !ok2 {
			continue
		}
		res := classifyEdge(from, to)
		if res.Level == "illegal" {
			invalidCount++
			fa.add("critical", "correctness", fmt.Sprintf("Illogical connection: %s → %s", from.DisplayName(), to.DisplayName()),
				res.Reason, []string{from.ID, to.ID})
		}
	}

	// ── SECURITY ──

	// 1. Stateful data in a non-private subnet.
	for _, n := range nodes {
		if isStateful(n) && n.Tier != "private" {
			fa.add("critical", "security", n.DisplayName()+" is not in a private subnet",
				fmt.Sprintf("Databases and caches should never sit in a %q tier. Move %s into a private subnet so it is unreachable from the internet.", n.Tier, n.DisplayName()),
				[]string{n.ID})
		}
	}

	// 2. Stateful data directly reachable from the internet (1 hop) or open to 0.0.0.0/0.
	for _, n := range nodes {
		if !isStateful(n) {
			continue
		}
		directFromEdge := false
		for _, src := range graph.inc[n.ID] {
			s, ok := byID[src]
			if ok && (isInternetNode(s) || publicEntryKinds[s.Kind]) {
				directFromEdge = true
				break
			}
		}
		if n.OpenToInternet || directFromEdge {
			detail := fmt.Sprintf("%s receives traffic straight from an internet-facing component. Put a compute/app tier in front of it.", n.DisplayName())
			if n.OpenToInternet {
				detail = fmt.Sprintf("%s's security group allows 0.0.0.0/0. Data tiers must only accept traffic from the application tier.", n.DisplayName())
			}
			fa.add("critical", "security", n.DisplayName()+" is exposed to the internet", detail, []string{n.ID})
		}
	}

	// 3. Sensitive ports open to the whole internet.
	for _, n := range nodes {
		if !n.OpenToInternet {
			continue
		}
		var bad []int
		for _, p := range n.Ports {
			if _, ok := sensitivePorts[p]; ok {
				bad = append(bad, p)
			}
		}
		if len(bad) > 0 {
			names := ""
			nonSSHOrRDP := false
			for i, p := range bad {
				if i > 0 {
					names += ", "
				}
				names += fmt.Sprintf("%s (%d)", sensitivePorts[p], p)
				if p != 22 && p != 3389 {
					nonSSHOrRDP = true
				}
			}
			level := "high"
			if nonSSHOrRDP {
				level = "critical"
			}
			fa.add(level, "security", fmt.Sprintf("%s opens %s to 0.0.0.0/0", n.DisplayName(), names),
				"Administrative and database ports must not be open to the whole internet. Restrict the security group to a bastion/VPN or the app tier.",
				[]string{n.ID})
		}
	}

	// 4. Compute exposed directly to the internet (no LB / gateway in front).
	for _, n := range nodes {
		if !isCompute(n) {
			continue
		}
		directFromInternet := false
		for _, src := range graph.inc[n.ID] {
			if s, ok := byID[src]; ok && isInternetNode(s) {
				directFromInternet = true
				break
			}
		}
		if n.OpenToInternet || directFromInternet {
			fa.add("high", "security", n.DisplayName()+" is directly internet-facing",
				fmt.Sprintf("Put a load balancer or API gateway in front of %s instead of exposing the instance. The compute tier should live in a private subnet.", n.DisplayName()),
				[]string{n.ID})
		}
	}

	// 4b. Frontend/client talking straight to a data tier.
	for _, n := range nodes {
		if !isStateful(n) {
			continue
		}
		fromClient := false
		for _, src := range graph.inc[n.ID] {
			if s, ok := byID[src]; ok && s.Kind == "client" {
				fromClient = true
				break
			}
		}
		if fromClient {
			fa.add("high", "security", n.DisplayName()+" is queried directly by the frontend",
				fmt.Sprintf("A client / frontend is wired straight to %s. Put a backend / API tier in between — clients must never hold database credentials or hit the database directly.", n.DisplayName()),
				[]string{n.ID})
		}
	}

	// 5. No WAF in front of a public entry point.
	var publicEntries []model.Node
	for _, n := range nodes {
		if publicEntryKinds[n.Kind] && reachable[n.ID] {
			publicEntries = append(publicEntries, n)
		}
	}
	hasWaf := false
	for _, n := range nodes {
		if n.Kind == "waf" {
			hasWaf = true
			break
		}
	}
	if len(publicEntries) > 0 && !hasWaf {
		ids := make([]string, len(publicEntries))
		for i, n := range publicEntries {
			ids[i] = n.ID
		}
		fa.add("warn", "security", "No Web Application Firewall",
			"Public entry points are exposed without a WAF. Add one to filter common web exploits and abusive traffic.", ids)
	}

	// 6. Plaintext-only edge at the front door (HTTP without HTTPS).
	for _, e := range edges {
		from, ok1 := byID[e.From]
		to, ok2 := byID[e.To]
		if !ok1 || !ok2 {
			continue
		}
		if (isInternetNode(from) || from.Kind == "edge") && e.Port == 80 {
			fa.add("warn", "security", "Traffic enters over plain HTTP",
				fmt.Sprintf("The edge %s → %s uses port 80. Serve over HTTPS (443) and redirect HTTP so credentials are never sent in the clear.", from.DisplayName(), to.DisplayName()),
				[]string{from.ID, to.ID})
		}
	}

	// 7. Over-privileged IAM role (wildcard *).
	for _, n := range nodes {
		if (isCompute(n) || n.Kind == "serverless") && configString(n.Config, "iam") == "admin" {
			fa.add("high", "iam", n.DisplayName()+" uses an over-privileged IAM role",
				fmt.Sprintf("%s is attached to an admin / wildcard (*:*) policy. Grant least privilege — scope the role to only the actions and resources it actually needs.", n.DisplayName()),
				[]string{n.ID})
		}
	}

	// 8. Encryption at rest.
	for _, n := range nodes {
		if enc, present := configBool(n.Config, "encrypted"); present && !enc {
			level := "warn"
			if n.Kind == "database" {
				level = "high"
			}
			fa.add(level, "storage", n.DisplayName()+" is not encrypted at rest",
				fmt.Sprintf("Turn on encryption at rest (KMS) for %s. It is a one-click setting and is expected for anything storing data.", n.DisplayName()),
				[]string{n.ID})
		}
	}

	// 9. Public object storage.
	for _, n := range nodes {
		if pub, _ := configBool(n.Config, "public"); n.Kind == "storage" && pub {
			fa.add("critical", "storage", n.DisplayName()+" is a public bucket",
				fmt.Sprintf("%s allows public access. Enable \"Block Public Access\" and serve files via CloudFront with an origin access identity instead.", n.DisplayName()),
				[]string{n.ID})
		}
	}

	// 10. Prefer SSM Session Manager over open SSH.
	var sshNodes []string
	for _, n := range nodes {
		for _, p := range n.Ports {
			if p == 22 {
				sshNodes = append(sshNodes, n.ID)
				break
			}
		}
	}
	if len(sshNodes) > 0 {
		fa.add("info", "security", "Prefer SSM Session Manager over SSH",
			"A component exposes port 22 (SSH). In production, use AWS Systems Manager Session Manager for shell access — no inbound port to open, and every session is audit-logged.",
			sshNodes)
	}

	// ── RELIABILITY / PERFORMANCE / NETWORK / COST ──

	var computeNodes []model.Node
	for _, n := range nodes {
		if isCompute(n) {
			computeNodes = append(computeNodes, n)
		}
	}

	hasLb := false
	for _, n := range nodes {
		if n.Kind == "lb" || n.Kind == "gateway" {
			hasLb = true
			break
		}
	}
	if len(computeNodes) >= 2 && !hasLb {
		ids := make([]string, len(computeNodes))
		for i, n := range computeNodes {
			ids[i] = n.ID
		}
		fa.add("warn", "reliability", "No load balancer for multiple compute targets",
			"You have more than one compute component but no load balancer. Add one so traffic is distributed and a single instance failing does not take the app down.", ids)
	}

	// 8. Single-instance compute = single point of failure.
	for _, n := range computeNodes {
		instances, hasInstances := configNumber(n.Config, "instances")
		if !hasInstances {
			instances = 1
			if n.Kind == "serverless" {
				instances = 99
			}
		}
		autoScale, _ := configBool(n.Config, "autoScale")
		if !autoScale && instances <= 1 {
			fa.add("warn", "reliability", n.DisplayName()+" is a single point of failure",
				fmt.Sprintf("%s runs a single instance with no auto scaling. Use an Auto Scaling Group across multiple AZs for resilience and to handle load spikes.", n.DisplayName()),
				[]string{n.ID})
		}
	}

	// 9. Database without Multi-AZ.
	for _, n := range nodes {
		if n.Kind != "database" {
			continue
		}
		if multiAz, present := configBool(n.Config, "multiAz"); present && !multiAz {
			fa.add("info", "reliability", n.DisplayName()+" is not Multi-AZ",
				fmt.Sprintf("Enable Multi-AZ on %s so a standby in another availability zone can take over automatically if the primary fails.", n.DisplayName()),
				[]string{n.ID})
		}
	}

	// Automated backups on relational databases.
	for _, n := range nodes {
		if n.Type != "rds" {
			continue
		}
		if backups, present := configBool(n.Config, "backups"); present && !backups {
			fa.add("warn", "reliability", n.DisplayName()+" has no automated backups",
				fmt.Sprintf("Enable automated snapshots / point-in-time recovery on %s, or a failure means permanent data loss.", n.DisplayName()),
				[]string{n.ID})
		}
	}

	// Private compute with no NAT Gateway for outbound traffic.
	var privateCompute []model.Node
	for _, n := range computeNodes {
		if n.Tier == "private" {
			privateCompute = append(privateCompute, n)
		}
	}
	hasNat := false
	for _, n := range nodes {
		if n.Kind == "nat" {
			hasNat = true
			break
		}
	}
	if len(privateCompute) > 0 && !hasNat {
		ids := make([]string, len(privateCompute))
		for i, n := range privateCompute {
			ids[i] = n.ID
		}
		fa.add("warn", "network", "No NAT Gateway for private subnets",
			"Private instances cannot reach the internet for OS patches, package installs or third-party APIs without a NAT Gateway (or VPC endpoints) for outbound traffic.", ids)
	}

	// Burstable dev-size instances under sustained production traffic.
	for _, n := range computeNodes {
		autoScale, _ := configBool(n.Config, "autoScale")
		if configString(n.Config, "instanceType") == "t3.micro" && !autoScale && reachable[n.ID] {
			fa.add("info", "performance", n.DisplayName()+" runs on a burstable t3.micro",
				"t3.micro is a small burstable type — fine for dev, risky for sustained production load. Pick a larger type or enable Auto Scaling, then run a load test to size it.",
				[]string{n.ID})
		}
	}

	hasDatabase := false
	hasCache := false
	hasCdn := false
	var cacheIDs []string
	for _, n := range nodes {
		switch n.Kind {
		case "database":
			hasDatabase = true
		case "cache":
			hasCache = true
			cacheIDs = append(cacheIDs, n.ID)
		case "cdn":
			hasCdn = true
		}
	}

	// A cache is never the system of record — it must have a database behind it.
	if hasCache && !hasDatabase {
		if cacheIDs == nil {
			cacheIDs = []string{}
		}
		fa.add("high", "correctness", "Cache has no database behind it",
			"A cache (Redis / ElastiCache) is volatile and only speeds up reads — it cannot be the source of truth. Add a database for the cache to read through (cache-aside) and to persist data; a cache can never stand alone as the data tier.",
			cacheIDs)
	}

	if hasDatabase && len(reachable) > 1 && !hasCache && !hasCdn {
		fa.add("info", "performance", "No caching layer",
			"Add a CDN for static content and/or an in-memory cache (ElastiCache) in front of the database to cut latency and read load.", nil)
	}

	// 11. Orphan nodes (placed but wired to nothing).
	for _, n := range nodes {
		if isInternetNode(n) {
			continue
		}
		if len(graph.undirected[n.ID]) == 0 {
			fa.add("warn", "correctness", n.DisplayName()+" is not connected",
				fmt.Sprintf("%s has no connections, so no traffic can reach it. Wire it into the flow or remove it.", n.DisplayName()),
				[]string{n.ID})
		}
	}

	// 12. Services present but no entry point at all.
	hasInternetEntry := false
	for _, n := range nodes {
		if isInternetNode(n) {
			hasInternetEntry = true
			break
		}
	}
	if len(nodes) > 0 && !hasInternetEntry && (hasLb || len(computeNodes) > 0) {
		fa.add("info", "correctness", "No internet entry point",
			"Drop a \"Users / Internet\" node and connect it to your front door so you can simulate a real request end-to-end.", nil)
	}

	// ── SCORING ──
	penalty := func(keep func(Finding) bool) int {
		s := 0
		for _, f := range fa.findings {
			if keep(f) {
				s += levelWeight[f.Level]
			}
		}
		return s
	}
	correctnessScore := clampScore(100 - penalty(func(f Finding) bool { return correctnessCats[f.Category] }))
	securityScore := clampScore(100 - penalty(func(f Finding) bool { return securityCats[f.Category] }))
	designScore := clampScore(100 - penalty(func(f Finding) bool {
		return !securityCats[f.Category] && !correctnessCats[f.Category]
	}))
	overall := int(roundHalfAwayFromZero(float64(correctnessScore+securityScore+designScore) / 3))

	hasCritical := false
	for _, f := range fa.findings {
		if f.Level == "critical" {
			hasCritical = true
			break
		}
	}
	var verdict Verdict
	switch {
	case invalidCount > 0:
		verdict = Verdict{Label: "Invalid setup", Tone: "bad"}
	case hasCritical:
		verdict = Verdict{Label: "Insecure", Tone: "bad"}
	case overall >= 90:
		verdict = Verdict{Label: "Well-architected", Tone: "good"}
	case overall >= 70:
		verdict = Verdict{Label: "Solid, with gaps", Tone: "warn"}
	default:
		verdict = Verdict{Label: "Needs work", Tone: "warn"}
	}

	return AnalyzeResult{
		Findings: fa.findings, CorrectnessScore: correctnessScore, SecurityScore: securityScore,
		DesignScore: designScore, Overall: overall, Verdict: verdict, Empty: false,
	}
}

func clampScore(v int) int {
	if v < 0 {
		return 0
	}
	if v > 100 {
		return 100
	}
	return v
}

func roundHalfAwayFromZero(v float64) float64 {
	if v < 0 {
		return -roundHalfAwayFromZero(-v)
	}
	return float64(int(v + 0.5))
}
