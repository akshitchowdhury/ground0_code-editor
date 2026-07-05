package agent

import (
	"context"
	"fmt"

	"ground0.dev/goserver/internal/model"
)

var levelWeight = map[string]int{"critical": 30, "high": 17, "warn": 9, "info": 4}
var safetyCats = map[string]bool{"safety": true}
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
	SafetyScore      int       `json:"safetyScore"`
	DesignScore      int       `json:"designScore"`
	Overall          int       `json:"overall"`
	Verdict          Verdict   `json:"verdict"`
	Empty            bool      `json:"empty"`
}

type findingAdder struct{ findings []Finding }

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

func nodesOfKind(nodes []model.Node, kind string) []model.Node {
	var out []model.Node
	for _, n := range nodes {
		if n.Kind == kind {
			out = append(out, n)
		}
	}
	return out
}

func hasKind(nodes []model.Node, kind string) bool {
	for _, n := range nodes {
		if n.Kind == kind {
			return true
		}
	}
	return false
}

func idsOf(nodes []model.Node) []string {
	ids := make([]string, len(nodes))
	for i, n := range nodes {
		ids[i] = n.ID
	}
	return ids
}

// AnalyzeAgent ports src/lib/agent/analyze.js's analyzeAgent rule-by-rule.
// blueprintID is the currently-selected AGENT_BLUEPRINTS id (or "" if none) —
// only its identity matters here (a couple of blueprint-specific checks),
// the full blueprint catalog (icons/labels/templates) stays frontend-only.
func AnalyzeAgent(ctx context.Context, repo *SpecsRepo, g model.Graph, blueprintID string) AnalyzeResult {
	nodes, edges := g.Nodes, g.Edges

	if len(nodes) == 0 {
		return AnalyzeResult{Findings: []Finding{}, Verdict: Verdict{Label: "Empty canvas", Tone: "warn"}, Empty: true}
	}

	byID := map[string]model.Node{}
	for _, n := range nodes {
		byID[n.ID] = n
	}
	fa := &findingAdder{findings: []Finding{}}

	adj := map[string][]string{}
	for _, n := range nodes {
		adj[n.ID] = nil
	}
	for _, e := range edges {
		if _, ok := adj[e.From]; !ok {
			continue
		}
		if _, ok := adj[e.To]; !ok {
			continue
		}
		adj[e.From] = append(adj[e.From], e.To)
		adj[e.To] = append(adj[e.To], e.From)
	}
	neighborsOf := func(id string) []model.Node {
		var out []model.Node
		for _, nb := range adj[id] {
			if n, ok := byID[nb]; ok {
				out = append(out, n)
			}
		}
		return out
	}
	hasNeighborKind := func(id, kind string) bool {
		for _, nb := range neighborsOf(id) {
			if nb.Kind == kind {
				return true
			}
		}
		return false
	}

	// 0. Illogical wiring.
	invalidCount := 0
	for _, e := range edges {
		from, ok1 := byID[e.From]
		to, ok2 := byID[e.To]
		if !ok1 || !ok2 {
			continue
		}
		res := ClassifyAgentEdge(from, to)
		if res.Level == "illegal" {
			invalidCount++
			fa.add("critical", "correctness", fmt.Sprintf("Invalid wiring: %s → %s", from.DisplayName(), to.DisplayName()), res.Reason, []string{from.ID, to.ID})
		}
	}

	agents := nodesOfKind(nodes, "agent")
	brains := append(append([]model.Node{}, agents...), nodesOfKind(nodes, "llm")...)
	tools := nodesOfKind(nodes, "tool")
	trainings := nodesOfKind(nodes, "training")
	hasGuardrail := hasKind(nodes, "guardrail")

	// 1. No reasoning at all.
	if len(nodes) > 0 && len(brains) == 0 {
		fa.add("critical", "correctness", "No agent or LLM in the pipeline",
			"Every agentic system needs a reasoning model. Drop an Agent (looping) or LLM (single-shot) onto the canvas.", nil)
	}

	// 2. Unbounded agent loop.
	for _, a := range agents {
		max, ok := configNumber(a.Config, "maxSteps")
		if !ok || max <= 0 {
			fa.add("high", "reliability", a.DisplayName()+" has no step limit",
				"An agent loop with no maximum number of steps can run forever and burn unbounded tokens/cost. Set a max-step (recursion) limit — typically 4–10.", []string{a.ID})
		}
	}

	// 3. Side-effecting tools with no human-in-the-loop.
	for _, t := range tools {
		sideEffecting, _ := configBool(t.Config, "sideEffecting")
		write, _ := configBool(t.Config, "write")
		if !sideEffecting && !write {
			continue
		}
		if !hasNeighborKind(t.ID, "human") {
			fa.add("high", "safety", t.DisplayName()+" can act with no human approval",
				fmt.Sprintf("%s performs an irreversible / side-effecting action. Route it through a Human-in-the-loop node (or a strict guardrail) so a person approves before it runs.", t.DisplayName()),
				[]string{t.ID})
		}
	}

	// 4. No guardrails on a user-facing system.
	if len(brains) > 0 && !hasGuardrail {
		fa.add("warn", "safety", "No guardrails",
			"Add input/output guardrails — prompt-injection and jailbreak filtering, PII redaction, toxicity and output-schema validation. They are your safety net against untrusted input.",
			idsOf(brains))
	}

	// 5. Unsandboxed code execution.
	for _, t := range tools {
		sandboxed, _ := configBool(t.Config, "sandboxed")
		if configString(t.Config, "toolType") == "code" && !sandboxed {
			fa.add("high", "safety", t.DisplayName()+" runs code unsandboxed",
				"Model-written code must run in an isolated sandbox with no access to the host filesystem, secrets or network. Enable sandboxing.", []string{t.ID})
		}
	}

	// 6. RAG pipeline incomplete.
	hasRetriever := hasKind(nodes, "retriever")
	hasVectordb := hasKind(nodes, "vectordb")
	hasEmbedder := hasKind(nodes, "embedder")
	hasData := hasKind(nodes, "data")
	if hasRetriever && !hasVectordb {
		fa.add("warn", "correctness", "Retriever has no vector database",
			"A retriever needs a vector database to search. Wire: Knowledge → Embedding model → Vector DB → Retriever → Agent.",
			idsOf(nodesOfKind(nodes, "retriever")))
	}
	if hasData && len(trainings) == 0 && !(hasEmbedder && hasVectordb && hasRetriever) {
		fa.add("warn", "correctness", "Knowledge source is not usable yet",
			"Your knowledge source isn't wired into a retrieval pipeline. To make the agent use it, add the missing pieces: Embedding model → Vector DB → Retriever.",
			idsOf(nodesOfKind(nodes, "data")))
	}

	// 7. Fine-tuning used to add knowledge.
	var fineTunes []model.Node
	for _, t := range trainings {
		if configString(t.Config, "method") == "fine-tune" {
			fineTunes = append(fineTunes, t)
		}
	}
	if len(fineTunes) > 0 && hasData && !hasRetriever {
		fa.add("warn", "data", "Fine-tuning won't add knowledge",
			"Fine-tuning teaches style, format and skills — not facts. To give the agent your documents' knowledge, use RAG (Embedder → Vector DB → Retriever), not fine-tuning.",
			idsOf(fineTunes))
	}

	// 8. Fine-tune dataset too small / unlabeled.
	for _, t := range fineTunes {
		n, _ := configNumber(t.Config, "examples")
		if n < 100 {
			fa.add("warn", "data", fmt.Sprintf("%s: too few examples", t.DisplayName()),
				fmt.Sprintf("Fine-tuning on ~%d examples rarely helps. Aim for hundreds to thousands of high-quality, labeled examples — or stick with prompting + RAG.", int(n)),
				[]string{t.ID})
		}
		if labeled, present := configBool(t.Config, "labeled"); present && !labeled {
			fa.add("warn", "data", fmt.Sprintf("%s: data is unlabeled", t.DisplayName()),
				"Supervised fine-tuning needs labeled input→output pairs. Unlabeled data can't be used directly — label it or choose a different approach.",
				[]string{t.ID})
		}
	}

	// 9. No evaluation.
	if len(brains) > 0 && !hasKind(nodes, "eval") {
		fa.add("warn", "reliability", "No eval / test set",
			"Without a fixed evaluation set you can't measure quality, compare prompts/models, or catch regressions. Add an Eval node — evaluation is the backbone of a reliable agent.", nil)
	}

	// 10. No observability.
	if len(brains) > 0 && !hasKind(nodes, "observability") {
		fa.add("info", "reliability", "No observability / tracing",
			"Add tracing to record each run's steps, tool calls, tokens, cost and latency — you'll need it to debug and to control spend in production.", nil)
	}

	// 11. No system prompt.
	if len(brains) > 0 && !hasKind(nodes, "prompt") {
		fa.add("info", "correctness", "No system prompt",
			"Define a system prompt: the agent's role, rules, tone and output format. It's the cheapest, fastest lever on behavior.", nil)
	}

	// 12. Multi-turn chat without memory.
	if blueprintID == "chatbot" && !hasKind(nodes, "memory") {
		fa.add("warn", "correctness", "Chatbot has no memory",
			"A multi-turn conversational agent needs short-term memory to retain context across turns, or it forgets everything after each message.", nil)
	}

	// 13. Tool-using blueprint with no tools.
	if (blueprintID == "react-tool" || blueprintID == "workflow") && len(tools) == 0 {
		fa.add("warn", "correctness", "No tools to act with",
			"A tool-using / automation agent needs at least one tool (API, search, DB, action) — otherwise it can only talk, not do.", nil)
	}

	// 14. Model capability mismatch.
	models := repo.ModelsByID(ctx)
	for _, a := range agents {
		m, ok := models[configString(a.Config, "model")]
		if !ok {
			continue
		}
		maxSteps, _ := configNumber(a.Config, "maxSteps")
		usesTools := hasNeighborKind(a.ID, "tool")
		if m.Reasoning <= 2 && (usesTools || maxSteps > 2) {
			fa.add("info", "cost", fmt.Sprintf("%s: model may be too weak", a.DisplayName()),
				"Small models struggle with multi-step tool reasoning. For a planner that calls tools, a stronger model (GPT-4o / Claude / Llama 70B) is usually worth it.", []string{a.ID})
		}
	}
	for _, l := range nodesOfKind(nodes, "llm") {
		m, ok := models[configString(l.Config, "model")]
		if ok && m.Tier == "frontier" && len(fineTunes) > 0 {
			fa.add("info", "cost", fmt.Sprintf("%s: frontier model for a narrow task", l.DisplayName()),
				"For a fine-tuned classification/extraction task, a small model is far cheaper at scale and often just as good once tuned.", []string{l.ID})
		}
	}

	// 15. Tools without auth.
	for _, t := range tools {
		toolType := configString(t.Config, "toolType")
		auth, present := configBool(t.Config, "auth")
		if (toolType == "api" || toolType == "db" || toolType == "action") && present && !auth {
			fa.add("info", "safety", fmt.Sprintf("%s: no authentication", t.DisplayName()),
				"Authenticate and scope tool access with least privilege. An unauthenticated tool the model can call is an open door.", []string{t.ID})
		}
	}

	// 16. Orphan nodes.
	for _, n := range nodes {
		if n.Kind == "app" {
			continue
		}
		if len(adj[n.ID]) == 0 {
			fa.add("warn", "reliability", n.DisplayName()+" is not connected",
				fmt.Sprintf("%s has no connections, so it plays no part in the flow. Wire it in or remove it.", n.DisplayName()), []string{n.ID})
		}
	}

	// 17 / 18. Missing entry / output.
	if len(nodes) > 0 && !hasKind(nodes, "app") {
		fa.add("info", "correctness", "No entry point", "Add a User / App node so a request has somewhere to enter and you can simulate the flow.", nil)
	}
	if len(brains) > 0 && !hasKind(nodes, "output") {
		fa.add("info", "correctness", "No response node", "Add a Response node so the pipeline has a clear, final output back to the user.", nil)
	}

	// 19. Multiple agents without a supervisor.
	if len(agents) >= 2 && !hasKind(nodes, "router") {
		fa.add("info", "correctness", "Multiple agents, no supervisor",
			"Coordinate several agents with a Supervisor / Router that routes each request to the right specialist.", idsOf(agents))
	}

	// ── scoring ──
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
	safetyScore := clampScore(100 - penalty(func(f Finding) bool { return safetyCats[f.Category] }))
	designScore := clampScore(100 - penalty(func(f Finding) bool {
		return !safetyCats[f.Category] && !correctnessCats[f.Category]
	}))
	overall := roundInt(float64(correctnessScore+safetyScore+designScore) / 3)

	var verdict Verdict
	hasCritical, hasHigh := false, false
	for _, f := range fa.findings {
		if f.Level == "critical" {
			hasCritical = true
		}
		if f.Level == "high" {
			hasHigh = true
		}
	}
	switch {
	case invalidCount > 0:
		verdict = Verdict{Label: "Invalid wiring", Tone: "bad"}
	case hasCritical:
		verdict = Verdict{Label: "Broken", Tone: "bad"}
	case hasHigh:
		verdict = Verdict{Label: "Risky", Tone: "bad"}
	case overall >= 90:
		verdict = Verdict{Label: "Production-ready", Tone: "good"}
	case overall >= 70:
		verdict = Verdict{Label: "Promising", Tone: "warn"}
	default:
		verdict = Verdict{Label: "Needs work", Tone: "warn"}
	}

	return AnalyzeResult{
		Findings: fa.findings, CorrectnessScore: correctnessScore, SafetyScore: safetyScore,
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

func roundInt(v float64) int { return int(v + 0.5) }
