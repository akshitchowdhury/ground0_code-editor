// Package fix generates an actionable "how do I fix this" explanation for a
// review finding from either studio (cloud architecture or agent pipeline).
// LLM-first with a curated static fallback library, so it always returns
// something useful without an API key.
package fix

import (
	"context"
	"strings"

	"ground0.dev/goserver/internal/llm"
)

// Finding is the subset of a studio finding the fix generator needs.
type Finding struct {
	Studio   string `json:"studio"` // "cloud" | "agent"
	Title    string `json:"title"`
	Detail   string `json:"detail"`
	Category string `json:"category"`
	Level    string `json:"level"`
}

// Result is what the Fix-it expander renders.
type Result struct {
	Explanation string   `json:"explanation"`
	Steps       []string `json:"steps"`
	Snippet     string   `json:"snippet,omitempty"`
	Language    string   `json:"language,omitempty"` // e.g. "hcl", "yaml", "python"
	Source      string   `json:"source"`             // "ai" | "library"
}

const cloudSystem = "You are a senior AWS solutions architect and DevOps engineer. Given a review finding " +
	"about a cloud architecture, explain concisely how to fix it and give concrete steps. When a config " +
	"snippet genuinely helps, provide a SHORT Terraform (HCL) snippet — otherwise omit it. Be practical and specific."

const agentSystem = "You are a senior LLM/agent engineer. Given a review finding about an AI-agent pipeline, " +
	"explain concisely how to fix it and give concrete steps. When a short code snippet genuinely helps " +
	"(Python / config), provide it — otherwise omit it. Be practical and specific."

func prompt(f Finding) string {
	return "Finding (" + f.Level + " / " + f.Category + "): " + f.Title + "\n" +
		"Detail: " + f.Detail + "\n\n" +
		"Respond with ONLY a JSON object of the shape " +
		`{"explanation":"1-2 sentences on why this matters and the fix","steps":["step 1","step 2"],"snippet":"optional short code/config, or empty string","language":"hcl|yaml|python|"}` +
		" — no markdown, no commentary."
}

// Generate returns a fix suggestion. Never errors — uses the static library
// when the LLM is unavailable or returns nothing usable.
func Generate(ctx context.Context, client *llm.Client, f Finding) Result {
	if client.Enabled() {
		system := cloudSystem
		if f.Studio == "agent" {
			system = agentSystem
		}
		var r Result
		if client.GenerateInto(ctx, system, prompt(f), &r) && strings.TrimSpace(r.Explanation) != "" {
			r.Source = "ai"
			if r.Steps == nil {
				r.Steps = []string{}
			}
			return r
		}
	}
	return libraryFix(f)
}
