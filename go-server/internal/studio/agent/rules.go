// Package agent ports src/lib/agent/{rules,analyze,simulate,profile}.js —
// the Agentic Studio's connection-legality/rules/simulation/profile engines
// — to Go. Pure functions operating on model.Graph; catalog lookups (MODELS)
// go through specs_repo.go.
package agent

import (
	"strings"

	"ground0.dev/goserver/internal/model"
)

// ALLOWED_TARGETS: allowed target kinds for each source kind — a hub-and-
// spoke role-based allow-list (agent graphs aren't a strict left→right rank
// like the Cloud studio's rules.js).
var allowedTargets = map[string][]string{
	"app":           {"guardrail", "router", "agent", "llm"},
	"guardrail":     {"agent", "llm", "router", "output"},
	"prompt":        {"agent", "llm"},
	"memory":        {"agent", "llm"},
	"training":      {"agent", "llm"},
	"data":          {"embedder", "training", "vectordb"},
	"embedder":      {"vectordb", "retriever"},
	"vectordb":      {"retriever"},
	"retriever":     {"vectordb", "agent", "llm"},
	"agent":         {"retriever", "tool", "human", "memory", "output", "observability", "router", "agent", "llm", "guardrail"},
	"llm":           {"tool", "output", "observability", "memory", "guardrail", "retriever"},
	"router":        {"agent", "llm", "output", "observability"},
	"tool":          {"agent", "llm", "human"},
	"human":         {"tool", "agent", "llm", "output"},
	"eval":          {"agent", "llm", "router"},
	"observability": {"agent", "llm", "router"},
	"output":        {},
}

var role = map[string]string{
	"app": "the entry point", "output": "the final response", "agent": "the reasoning agent",
	"llm": "the model", "router": "the supervisor", "data": "a knowledge source",
	"embedder": "the embedding model", "vectordb": "the vector database", "retriever": "the retriever",
	"tool": "a tool", "human": "the human reviewer", "memory": "memory", "prompt": "the system prompt",
	"training": "a training dataset", "guardrail": "guardrails", "eval": "the eval set", "observability": "observability",
}

func roleOf(kind string) string {
	if r, ok := role[kind]; ok {
		return r
	}
	return kind
}

func capitalize(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

func suggestTargets(fk string) string {
	targets, ok := allowedTargets[fk]
	if !ok || len(targets) == 0 {
		return ""
	}
	seen := map[string]bool{}
	var names []string
	for _, k := range targets {
		n := roleOf(k)
		if !seen[n] {
			seen[n] = true
			names = append(names, n)
			if len(names) >= 4 {
				break
			}
		}
	}
	return capitalize(roleOf(fk)) + " usually connects to: " + strings.Join(names, ", ") + "."
}

// ClassifyAgentEdge ports src/lib/agent/rules.js's classifyAgentEdge.
func ClassifyAgentEdge(from, to model.Node) EdgeClassification {
	if from.ID == to.ID {
		return EdgeClassification{false, "illegal", "self", "A component cannot connect to itself."}
	}

	fk, tk := from.Kind, to.Kind
	fname, tname := from.DisplayName(), to.DisplayName()

	if tk == "app" {
		return EdgeClassification{false, "illegal", "into-entry",
			tname + " is the entry point — requests start there, you don't wire into it. The reply returns to the user automatically; connect to a Response node for the final output instead."}
	}
	if fk == "output" {
		return EdgeClassification{false, "illegal", "from-output",
			fname + " is the final response — it's the end of the pipeline, so nothing comes after it. Remove this connection."}
	}

	if allowed, ok := allowedTargets[fk]; ok {
		for _, t := range allowed {
			if t == tk {
				return EdgeClassification{true, "ok", "ok", fname + " → " + tname + "."}
			}
		}
	}

	if fk == "data" && (tk == "agent" || tk == "llm") {
		return EdgeClassification{false, "illegal", "knowledge-direct",
			"A knowledge source can't plug straight into " + tname + " — the model can't read raw documents. Build the RAG pipeline: " + fname + " → Embedding model → Vector DB → Retriever → " + tname + "."}
	}
	if (fk == "vectordb" || fk == "embedder") && (tk == "agent" || tk == "llm") {
		return EdgeClassification{false, "illegal", "rag-skip",
			fname + " feeds the retrieval pipeline, not the model directly. Wire it through a Retriever, then the Retriever to " + tname + "."}
	}
	if fk == "tool" && tk == "output" {
		return EdgeClassification{false, "illegal", "tool-to-output",
			"A tool's result goes back to the agent to reason over — not straight to the response. Wire " + fname + " → Agent → Response."}
	}

	return EdgeClassification{false, "illegal", "invalid",
		fname + " (" + roleOf(fk) + ") doesn't connect to " + tname + " (" + roleOf(tk) + ") in an agent pipeline. " + suggestTargets(fk)}
}

// EdgeClassification mirrors the Cloud studio's shape — see
// internal/studio/cloud/rules.go for the field meanings.
type EdgeClassification struct {
	OK     bool   `json:"ok"`
	Level  string `json:"level"`
	Code   string `json:"code"`
	Reason string `json:"reason"`
}
