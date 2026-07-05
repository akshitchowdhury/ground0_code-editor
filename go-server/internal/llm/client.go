// Package llm is a provider-agnostic JSON-generating LLM client with a
// free-first fallback chain: Gemini (free tier) → Groq (free tier) →
// Anthropic (paid, optional). Every caller pairs it with its own offline
// fallback, so a nil client (no keys) or an all-providers-failed result is
// never fatal — the feature just serves its built-in response instead.
//
// This generalizes the pattern first written for exam feedback; the exams
// package now builds on it too.
package llm

import (
	"context"
	"encoding/json"
	"log"
	"strings"
)

// provider is one LLM backend. generateJSON must return the model's raw
// response text (expected to be a JSON object) or an error; the client turns
// errors into "try the next provider".
type provider interface {
	name() string
	generateJSON(ctx context.Context, system, prompt string) (string, error)
}

type Client struct {
	providers []provider
}

// New builds the fallback chain from whichever keys are set, in free-first
// order. Returns nil when no keys are configured — callers treat a nil
// *Client as "AI disabled" and use their offline fallback.
func New(geminiKey, groqKey, anthropicKey string) *Client {
	var providers []provider
	if geminiKey != "" {
		providers = append(providers, newGeminiProvider(geminiKey))
	}
	if groqKey != "" {
		providers = append(providers, newGroqProvider(groqKey))
	}
	if anthropicKey != "" {
		providers = append(providers, newAnthropicProvider(anthropicKey))
	}
	if len(providers) == 0 {
		return nil
	}
	return &Client{providers: providers}
}

func (c *Client) Enabled() bool { return c != nil && len(c.providers) > 0 }

// Providers lists the active provider names (free-first order) for logging.
func (c *Client) Providers() []string {
	if c == nil {
		return nil
	}
	names := make([]string, len(c.providers))
	for i, p := range c.providers {
		names[i] = p.name()
	}
	return names
}

// GenerateJSON tries each provider in order and returns the first raw JSON
// text, or ("", false) if the client is nil or every provider failed.
func (c *Client) GenerateJSON(ctx context.Context, system, prompt string) (string, bool) {
	if c == nil {
		return "", false
	}
	for _, p := range c.providers {
		text, err := p.generateJSON(ctx, system, prompt)
		if err != nil {
			log.Printf("[llm] %s unavailable, trying next: %v", p.name(), err)
			continue
		}
		if cleaned := stripCodeFence(text); cleaned != "" {
			return cleaned, true
		}
	}
	return "", false
}

// GenerateInto is GenerateJSON plus json.Unmarshal into dest. Returns false
// (leaving dest untouched) if generation failed or the JSON didn't parse.
func (c *Client) GenerateInto(ctx context.Context, system, prompt string, dest any) bool {
	text, ok := c.GenerateJSON(ctx, system, prompt)
	if !ok {
		return false
	}
	if err := json.Unmarshal([]byte(text), dest); err != nil {
		log.Printf("[llm] response was not valid JSON: %v", err)
		return false
	}
	return true
}

// stripCodeFence tolerates models that wrap JSON in ```json … ``` despite
// being asked for raw JSON (Groq/Llama do this occasionally).
func stripCodeFence(s string) string {
	s = strings.TrimSpace(s)
	if !strings.HasPrefix(s, "```") {
		return s
	}
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```")
	if i := strings.LastIndex(s, "```"); i >= 0 {
		s = s[:i]
	}
	return strings.TrimSpace(s)
}
