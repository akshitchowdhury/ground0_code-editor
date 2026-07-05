package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// anthropicProvider calls the Anthropic Messages API over raw HTTP/JSON
// (there is no official Anthropic Go SDK). Anthropic has no free tier, so
// this is the optional paid fallback behind Gemini and Groq.
type anthropicProvider struct {
	apiKey string
	client *http.Client
}

const (
	anthropicModel  = "claude-opus-4-8"
	anthropicAPIURL = "https://api.anthropic.com/v1/messages"
)

func newAnthropicProvider(apiKey string) *anthropicProvider {
	return &anthropicProvider{apiKey: apiKey, client: &http.Client{Timeout: 90 * time.Second}}
}

func (p *anthropicProvider) name() string { return "anthropic" }

type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type anthropicRequest struct {
	Model     string             `json:"model"`
	MaxTokens int                `json:"max_tokens"`
	System    string             `json:"system"`
	Messages  []anthropicMessage `json:"messages"`
}

type anthropicResponse struct {
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
}

func (p *anthropicProvider) generateJSON(ctx context.Context, system, prompt string) (string, error) {
	// Anthropic has no strict json response-format flag; the system prompt
	// instructs JSON-only and the client strips any stray code fence.
	body, err := json.Marshal(anthropicRequest{
		Model:     anthropicModel,
		MaxTokens: 8000,
		System:    system + "\n\nRespond with ONLY a single JSON object — no prose, no markdown fences.",
		Messages:  []anthropicMessage{{Role: "user", Content: prompt}},
	})
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, anthropicAPIURL, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", p.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := p.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("status %d: %s", resp.StatusCode, string(raw))
	}
	var out anthropicResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", err
	}
	for _, b := range out.Content {
		if b.Type == "text" && b.Text != "" {
			return b.Text, nil
		}
	}
	return "", fmt.Errorf("empty response")
}
