// simulate.go ports src/lib/agent/simulate.js — the Agentic Studio's flow
// simulator (ingestion → setup → live request → ops sweep lifecycle).
package agent

import "ground0.dev/goserver/internal/model"

const (
	stageRequest   = "rgb(34 211 238)"  // cyan
	stageIngestion = "rgb(167 139 250)" // violet
	stageOps       = "rgb(52 211 153)"  // emerald
)

type StepEdgeRef struct {
	ID   string `json:"id"`
	From string `json:"from,omitempty"`
	To   string `json:"to,omitempty"`
}

type Step struct {
	Edge    StepEdgeRef `json:"edge"`
	From    string      `json:"from"`
	To      string      `json:"to"`
	Verdict string      `json:"verdict"`
	Color   string      `json:"color,omitempty"`
	Note    string      `json:"note"`
	Packet  string      `json:"packet"`
}

type AgentSimResult struct {
	OK        bool    `json:"ok"`
	BlockedAt *int    `json:"blockedAt"`
	Steps     []Step  `json:"steps"`
	Mode      string  `json:"mode"`
	Reason    *string `json:"reason"`
}

type simCtx struct {
	byID    map[string]model.Node
	edges   []model.Edge
	steps   []Step
	covered map[string]bool
	blocked bool
	mode    string
}

func (s *simCtx) name(id string) string {
	if n, ok := s.byID[id]; ok {
		if dn := n.DisplayName(); dn != "" {
			return dn
		}
	}
	return id
}

func (s *simCtx) edgeBetween(a, b string) *model.Edge {
	for i := range s.edges {
		e := s.edges[i]
		if (e.From == a && e.To == b) || (e.From == b && e.To == a) {
			return &s.edges[i]
		}
	}
	return nil
}

type hopOpts struct {
	packet  string
	note    string
	verdict string
	color   string
}

func normalizeOpts(o hopOpts) hopOpts {
	if o.verdict == "" {
		o.verdict = "ok"
	}
	if o.color == "" {
		o.color = stageRequest
	}
	return o
}

// pushReal adds a step only if a real edge exists; returns false silently
// otherwise (used for ingestion legs, which shouldn't block the whole sim).
func (s *simCtx) pushReal(fromID, toID string, o hopOpts) bool {
	real := s.edgeBetween(fromID, toID)
	if real == nil {
		return false
	}
	o = normalizeOpts(o)
	s.covered[real.ID] = true
	s.steps = append(s.steps, Step{Edge: StepEdgeRef{ID: real.ID, From: real.From, To: real.To}, From: fromID, To: toID, Packet: o.packet, Note: o.note, Verdict: o.verdict, Color: o.color})
	return true
}

// hop adds a step for a real edge, or blocks the simulation if the wire is
// missing (used for the live-request path, where a missing wire is fatal).
func (s *simCtx) hop(fromID, toID string, o hopOpts) {
	if s.blocked {
		return
	}
	real := s.edgeBetween(fromID, toID)
	if real == nil {
		s.steps = append(s.steps, Step{
			Edge: StepEdgeRef{ID: fmtV(len(s.steps))}, From: fromID, To: toID, Packet: "✗", Verdict: "blocked",
			Note: "No connection between " + s.name(fromID) + " and " + s.name(toID) + " — draw the wire so data can flow.",
		})
		s.blocked = true
		return
	}
	o = normalizeOpts(o)
	s.covered[real.ID] = true
	s.steps = append(s.steps, Step{Edge: StepEdgeRef{ID: real.ID, From: real.From, To: real.To}, From: fromID, To: toID, Packet: o.packet, Note: o.note, Verdict: o.verdict, Color: o.color})
}

// leg adds a synthetic (non-wire) step — used for return legs like
// "top-k chunks" that don't correspond to a drawn edge.
func (s *simCtx) leg(fromID, toID string, packet, note string, o hopOpts) {
	if s.blocked {
		return
	}
	o = normalizeOpts(o)
	s.steps = append(s.steps, Step{Edge: StepEdgeRef{ID: fmtV(len(s.steps))}, From: fromID, To: toID, Packet: packet, Note: note, Verdict: o.verdict, Color: o.color})
}

func fmtV(i int) string {
	digits := "0123456789"
	if i < 10 {
		return "v" + string(digits[i])
	}
	// simple decimal formatting for the rare >9-step case
	buf := []byte{}
	n := i
	for n > 0 {
		buf = append([]byte{digits[n%10]}, buf...)
		n /= 10
	}
	return "v" + string(buf)
}

func (s *simCtx) done() AgentSimResult {
	if len(s.steps) == 0 {
		return AgentSimResult{OK: !s.blocked, Steps: []Step{}, Mode: s.mode, Reason: reasonPtr("Nothing to simulate yet — wire up the pipeline first.")}
	}
	var blockedAt *int
	if s.blocked {
		i := len(s.steps) - 1
		blockedAt = &i
	}
	return AgentSimResult{OK: !s.blocked, BlockedAt: blockedAt, Steps: s.steps, Mode: s.mode, Reason: nil}
}

func reasonPtr(s string) *string { return &s }

func findKind(nodes []model.Node, kind string) *model.Node {
	for i := range nodes {
		if nodes[i].Kind == kind {
			return &nodes[i]
		}
	}
	return nil
}

// SimulateAgent ports src/lib/agent/simulate.js's simulateAgent.
func SimulateAgent(g model.Graph, mode string) AgentSimResult {
	if mode == "" {
		mode = "lifecycle"
	}
	byID := map[string]model.Node{}
	for _, n := range g.Nodes {
		byID[n.ID] = n
	}
	s := &simCtx{byID: byID, edges: g.Edges, covered: map[string]bool{}, mode: mode}

	data := findKind(g.Nodes, "data")
	embedder := findKind(g.Nodes, "embedder")
	vdb := findKind(g.Nodes, "vectordb")
	retriever := findKind(g.Nodes, "retriever")
	guardrail := findKind(g.Nodes, "guardrail")
	router := findKind(g.Nodes, "router")
	out := findKind(g.Nodes, "output")
	promptNode := findKind(g.Nodes, "prompt")
	memNode := findKind(g.Nodes, "memory")

	ingestion := func() {
		if data != nil && embedder != nil {
			s.pushReal(data.ID, embedder.ID, hopOpts{packet: "chunks", color: stageIngestion,
				note: "Offline ingestion (runs once, before any request): your documents are split into chunks…"})
		}
		if embedder != nil && vdb != nil {
			s.pushReal(embedder.ID, vdb.ID, hopOpts{packet: "vectors", color: stageIngestion,
				note: "…embedded into vectors and indexed in the vector DB, ready to be searched at query time."})
		}
	}

	if mode == "ingestion" {
		ingestion()
		return s.done()
	}

	entry := findKind(g.Nodes, "app")
	if entry == nil {
		return AgentSimResult{OK: false, Reason: reasonPtr("Add a User / App node to simulate an incoming request."), Steps: []Step{}, Mode: mode}
	}
	brain := findKind(g.Nodes, "agent")
	if brain == nil {
		brain = findKind(g.Nodes, "llm")
	}
	if brain == nil {
		return AgentSimResult{OK: false, Reason: reasonPtr("Add an Agent or LLM — the pipeline has nothing to reason with."), Steps: []Step{}, Mode: mode}
	}

	if mode == "lifecycle" {
		ingestion()
	}

	// ── SETUP (loaded each request) ──
	if promptNode != nil {
		s.pushReal(promptNode.ID, brain.ID, hopOpts{packet: "system prompt", note: "The agent starts each request with its system prompt — role, rules and output format."})
	}
	if memNode != nil {
		s.pushReal(memNode.ID, brain.ID, hopOpts{packet: "history", note: "Conversation memory is loaded so the agent remembers the context of the chat."})
	}

	// ── LIVE REQUEST ──
	secure := guardrail != nil
	preBrain := entry.ID
	if guardrail != nil {
		s.hop(entry.ID, guardrail.ID, hopOpts{packet: "request", note: s.name(entry.ID) + " sends the request in — guardrails screen it first (prompt-injection, PII, toxicity)."})
		preBrain = guardrail.ID
	}

	if router != nil {
		packet, verdict, note := "clean input", "ok", "The screened request reaches the supervisor, which decides which agent should handle it."
		if !secure {
			packet, verdict, note = "request", "insecure", "The request reaches the supervisor with no guardrail screening it first (prompt-injection risk)."
		}
		s.hop(preBrain, router.ID, hopOpts{packet: packet, verdict: verdict, note: note})
		s.hop(router.ID, brain.ID, hopOpts{packet: "route", note: "The supervisor routes the request to " + s.name(brain.ID) + "."})
	} else {
		packet, verdict, note := "clean input", "ok", "The input passes the guardrail and reaches the agent."
		if !secure {
			packet, verdict, note = "request", "insecure", "The request reaches the agent — but no guardrail screened it first. Untrusted input straight to the model is a prompt-injection risk."
		}
		s.hop(preBrain, brain.ID, hopOpts{packet: packet, verdict: verdict, note: note})
	}

	// RAG query round-trip.
	if retriever != nil && !s.blocked {
		s.hop(brain.ID, retriever.ID, hopOpts{packet: "query", color: stageIngestion, note: "The agent needs facts, so it queries the retriever."})
		if !s.blocked {
			if vdb != nil {
				s.hop(retriever.ID, vdb.ID, hopOpts{packet: "similarity search", color: stageIngestion, note: "The retriever embeds the query and searches the vector DB for the top-k closest chunks."})
				s.leg(vdb.ID, retriever.ID, "top-k chunks", "The most relevant chunks come back…", hopOpts{color: stageIngestion})
				s.leg(retriever.ID, brain.ID, "context", "…and are handed to the agent as grounding context (this is RAG).", hopOpts{color: stageIngestion})
			} else {
				s.steps = append(s.steps, Step{Edge: StepEdgeRef{ID: fmtV(len(s.steps))}, From: retriever.ID, To: retriever.ID, Packet: "no vector DB", Note: "The retriever has no vector database to search — the RAG pipeline is incomplete.", Verdict: "blocked"})
				s.blocked = true
			}
		}
	}

	// Tool act → observe.
	var toolNeighbor *model.Node
	for i := range g.Edges {
		e := g.Edges[i]
		var otherID string
		if e.From == brain.ID {
			otherID = e.To
		} else if e.To == brain.ID {
			otherID = e.From
		} else {
			continue
		}
		if n, ok := byID[otherID]; ok && n.Kind == "tool" {
			toolNeighbor = &n
			break
		}
	}
	if toolNeighbor != nil && !s.blocked {
		sideFx1, _ := configBool(toolNeighbor.Config, "sideEffecting")
		sideFx2, _ := configBool(toolNeighbor.Config, "write")
		sideFx := sideFx1 || sideFx2
		human := findKind(g.Nodes, "human")
		humanWired := human != nil && (s.edgeBetween(brain.ID, human.ID) != nil || s.edgeBetween(human.ID, toolNeighbor.ID) != nil)
		if sideFx && humanWired {
			s.hop(brain.ID, human.ID, hopOpts{packet: "approve?", note: "The agent wants to run " + s.name(toolNeighbor.ID) + " (an irreversible action) — a human reviews and approves first."})
			s.hop(human.ID, toolNeighbor.ID, hopOpts{packet: "approved ✓", note: "Approved — the action runs safely under human oversight."})
		} else {
			verdict := "ok"
			note := "The agent calls " + s.name(toolNeighbor.ID) + " and waits for the result."
			if sideFx {
				verdict = "insecure"
				note = s.name(toolNeighbor.ID) + " runs an irreversible action with no human approval — risky."
			}
			s.hop(brain.ID, toolNeighbor.ID, hopOpts{packet: "tool call", verdict: verdict, note: note})
		}
		s.leg(toolNeighbor.ID, brain.ID, "observation", "The result flows back and the agent reasons again — the act → observe loop at the heart of an agent.", hopOpts{})
	}

	// Response → and back to the user.
	if out != nil && !s.blocked {
		s.hop(brain.ID, out.ID, hopOpts{packet: "final answer", note: "The agent finishes and produces the final response."})
		s.leg(out.ID, entry.ID, "response ✓", "The response travels back to "+s.name(entry.ID)+" — the user has their answer. Request complete.", hopOpts{})
	} else if out == nil && !s.blocked {
		s.leg(brain.ID, entry.ID, "answer ✓", "The agent's answer is returned to "+s.name(entry.ID)+" — request complete. (Add a Response node to mark the output explicitly.)", hopOpts{})
	}

	// ── SUPPORTING SWEEP (lifecycle only) ──
	if mode == "lifecycle" && !s.blocked {
		for _, e := range g.Edges {
			if s.covered[e.ID] {
				continue
			}
			a, ok1 := byID[e.From]
			b, ok2 := byID[e.To]
			if !ok1 || !ok2 {
				continue
			}
			legal := ClassifyAgentEdge(a, b)
			if !legal.OK {
				s.steps = append(s.steps, Step{Edge: StepEdgeRef{ID: e.ID, From: e.From, To: e.To}, From: e.From, To: e.To, Packet: "⚠ invalid", Note: "Invalid wiring — " + legal.Reason, Verdict: "insecure", Color: stageRequest})
				s.covered[e.ID] = true
				continue
			}
			packet, note, color := supportingRole(a, b)
			s.steps = append(s.steps, Step{Edge: StepEdgeRef{ID: e.ID, From: e.From, To: e.To}, From: e.From, To: e.To, Packet: packet, Note: note, Verdict: "ok", Color: color})
			s.covered[e.ID] = true
		}
	}

	return s.done()
}

// supportingRole ports simulate.js's supportingRole — packet/note/colour for
// a "supporting" link off the live request path.
func supportingRole(a, b model.Node) (packet, note, color string) {
	has := func(k string) bool { return a.Kind == k || b.Kind == k }
	switch {
	case has("eval"):
		return "test cases", "Offline — the eval set scores the agent against fixed test cases. This runs in CI / before deploy, not during a live request.", stageOps
	case has("observability"):
		return "trace", "Continuous — every step (tokens, tool calls, cost, latency) is traced to observability for debugging and monitoring.", stageOps
	case has("training"):
		return "training data", "Offline — this dataset fine-tunes / aligns the model ahead of time, not at request time.", stageIngestion
	case has("human"):
		return "oversight", "A human can step in to approve risky or low-confidence actions.", stageRequest
	case has("memory"):
		return "memory", "Conversation / long-term memory is read and written across turns.", stageRequest
	case has("prompt"):
		return "system", "The system prompt configures the model on every call.", stageRequest
	case has("data") || has("embedder") || has("vectordb"):
		return "index", "Part of the offline ingestion pipeline that indexes your knowledge.", stageIngestion
	case has("tool"):
		return "tool", "A tool the agent can call when it decides to act.", stageRequest
	case has("router") || has("agent"):
		return "route", "The supervisor can dispatch a request to this agent.", stageRequest
	default:
		return "data", "A supporting connection in the pipeline.", stageRequest
	}
}
