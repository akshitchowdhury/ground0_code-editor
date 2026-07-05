// profile.go ports src/lib/agent/profile.js's buildProfile — turns a design
// into "what kind of agent this produces" (archetype, customization method,
// resulting capabilities/effort/data needs).
package agent

import (
	"context"
	"fmt"

	"ground0.dev/goserver/internal/model"
)

type methodInfo struct {
	effort string
	data   string
	result string
	note   string
}

var methodProfile = map[string]methodInfo{
	"Zero-shot prompting": {"Lowest", "None", "A general assistant driven entirely by instructions.",
		"Quality rides on the base model and prompt. Adds no new knowledge or specialized behavior — but it's instant and free to iterate."},
	"Few-shot prompting": {"Low", "A handful of examples", "A steerable assistant that mimics your examples in-context.",
		"Great for locking in a format or tone with zero training."},
	"Prompted + RAG": {"Medium", "Documents to index", "A knowledgeable assistant grounded in your live data.",
		"Updatable without retraining, can cite sources, and cuts hallucination. The default for Q&A over private/fresh data."},
	"Fine-tuned": {"High", "100s–1000s of labeled examples", "A specialist tuned for a narrow style, format or skill.",
		"Bakes in behavior, not facts. Needs a solid eval set to avoid silent regressions."},
	"Fine-tuned + RAG": {"Highest", "Labeled examples + documents", "A specialist that also answers from live data — the strongest combination.",
		"Behavior comes from tuning, knowledge from retrieval. Most moving parts to maintain."},
	"RLHF / preference-aligned": {"Very high", "Human preference comparisons", "An aligned, on-brand conversational agent.",
		"Aligns tone and safety — not knowledge. Normally applied after supervised fine-tuning."},
}

type Trait struct {
	Label string `json:"label"`
	Value string `json:"value"`
}

type Profile struct {
	Empty     bool   `json:"empty"`
	Archetype string `json:"archetype,omitempty"`
	Summary   string `json:"summary,omitempty"`
	Note      string `json:"note,omitempty"`
	Method    string `json:"method,omitempty"`
	// NOT omitempty — see the comment on LoadTestResult in
	// internal/studio/cloud/loadtest.go: omitempty drops a slice key
	// entirely when it has zero elements, and the frontend always does
	// `.length`/iterates on these assuming the key exists.
	Traits       []Trait  `json:"traits"`
	Capabilities []string `json:"capabilities"`
}

// BuildProfile ports src/lib/agent/profile.js's buildProfile.
func BuildProfile(ctx context.Context, repo *SpecsRepo, nodes []model.Node) Profile {
	agents := nodesOfKind(nodes, "agent")
	llms := nodesOfKind(nodes, "llm")
	brains := append(append([]model.Node{}, agents...), llms...)
	tools := nodesOfKind(nodes, "tool")
	trainings := nodesOfKind(nodes, "training")
	var promptNode *model.Node
	if p := nodesOfKind(nodes, "prompt"); len(p) > 0 {
		promptNode = &p[0]
	}

	if len(brains) == 0 {
		return Profile{Empty: true, Archetype: "Empty pipeline",
			Summary: "Add an Agent or LLM, then wire up knowledge, tools and safety to see what kind of agent you're building."}
	}

	hasRAG := hasKind(nodes, "retriever") && hasKind(nodes, "vectordb")
	fineTune, rlhf := false, false
	for _, t := range trainings {
		switch configString(t.Config, "method") {
		case "fine-tune":
			fineTune = true
		case "rlhf":
			rlhf = true
		}
	}
	fewShot := false
	if promptNode != nil {
		fewShot, _ = configBool(promptNode.Config, "fewShot")
	}
	var memNode *model.Node
	if m := nodesOfKind(nodes, "memory"); len(m) > 0 {
		memNode = &m[0]
	}

	var method string
	switch {
	case rlhf:
		method = "RLHF / preference-aligned"
	case fineTune && hasRAG:
		method = "Fine-tuned + RAG"
	case fineTune:
		method = "Fine-tuned"
	case hasRAG:
		method = "Prompted + RAG"
	case fewShot:
		method = "Few-shot prompting"
	default:
		method = "Zero-shot prompting"
	}
	mi := methodProfile[method]

	var primary *model.Node
	if len(agents) > 0 {
		primary = &agents[0]
	} else if len(llms) > 0 {
		primary = &llms[0]
	}
	pattern := ""
	if primary != nil {
		pattern = configString(primary.Config, "pattern")
	}

	var archetype string
	switch {
	case hasKind(nodes, "router") || len(agents) >= 2:
		archetype = "Multi-agent system"
	case len(tools) > 0 && len(agents) > 0:
		archetype = "Tool-using agent (ReAct)"
	case hasRAG:
		archetype = "Retrieval-augmented assistant"
	case fineTune && len(agents) == 0:
		archetype = "Fine-tuned specialist"
	case memNode != nil && len(agents) > 0:
		archetype = "Conversational agent"
	case len(llms) > 0 && len(agents) == 0:
		archetype = "Single LLM call"
	default:
		archetype = "Basic agent"
	}

	var capabilities []string
	if hasRAG {
		capabilities = append(capabilities, "Answers grounded in your documents (RAG)")
	}
	if len(tools) > 0 {
		suffix := "s"
		if len(tools) == 1 {
			suffix = ""
		}
		capabilities = append(capabilities, fmt.Sprintf("Takes actions through %d tool%s", len(tools), suffix))
	}
	if memNode != nil {
		if configString(memNode.Config, "memType") == "long" {
			capabilities = append(capabilities, "Remembers facts across sessions")
		} else {
			capabilities = append(capabilities, "Remembers the conversation")
		}
	}
	if hasKind(nodes, "router") || len(agents) >= 2 {
		capabilities = append(capabilities, "Delegates to specialist agents")
	}
	if hasKind(nodes, "guardrail") {
		capabilities = append(capabilities, "Filters unsafe input / output")
	}
	if hasKind(nodes, "human") {
		capabilities = append(capabilities, "Routes risky actions to a human")
	}
	if len(capabilities) == 0 {
		capabilities = []string{"Generates text from the prompt alone"}
	}

	models := repo.ModelsByID(ctx)
	var model_ *Model
	if primary != nil {
		if m, ok := models[configString(primary.Config, "model")]; ok {
			model_ = &m
		}
	}
	steps := 1.0
	if len(agents) > 0 {
		if s, ok := configNumber(agents[0].Config, "maxSteps"); ok && s > 0 {
			steps = s
		}
	}
	costLevel := "Medium"
	if model_ != nil && model_.Tier == "frontier" && steps > 4 {
		costLevel = "High"
	} else if model_ != nil && model_.Tier == "small" && steps <= 3 {
		costLevel = "Low"
	}

	modelLabel := "—"
	if model_ != nil {
		modelLabel = model_.Label
	}
	reasoning := "single-shot"
	if len(agents) > 0 {
		if label, ok := AgentPatterns[pattern]; ok {
			reasoning = label
		} else if pattern != "" {
			reasoning = pattern
		} else {
			reasoning = "loop"
		}
	}

	traits := []Trait{
		{"Model", modelLabel},
		{"Customization", method},
		{"Reasoning", reasoning},
		{"Build effort", mi.effort},
		{"Data needed", mi.data},
		{"Est. cost / latency", costLevel},
	}

	return Profile{
		Empty: false, Archetype: archetype, Summary: mi.result, Note: mi.note,
		Method: method, Traits: traits, Capabilities: capabilities,
	}
}
