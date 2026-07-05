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

// groqProvider calls Groq's OpenAI-compatible chat completions API. Free
// tier, very fast (key from https://console.groq.com/keys).
// llama-3.3-70b-versatile is a capable, free model with JSON-object output.
type groqProvider struct {
	apiKey string
	client *http.Client
}

const groqModel = "llama-3.3-70b-versatile"

func newGroqProvider(apiKey string) *groqProvider {
	return &groqProvider{apiKey: apiKey, client: &http.Client{Timeout: 60 * time.Second}}
}

func (p *groqProvider) name() string { return "groq" }

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqRequest struct {
	Model          string        `json:"model"`
	Messages       []groqMessage `json:"messages"`
	ResponseFormat struct {
		Type string `json:"type"`
	} `json:"response_format"`
	Temperature float64 `json:"temperature"`
}

type groqResponse struct {
	Choices []struct {
		Message groqMessage `json:"message"`
	} `json:"choices"`
}

func (p *groqProvider) generateJSON(ctx context.Context, system, prompt string) (string, error) {
	var reqBody groqRequest
	reqBody.Model = groqModel
	reqBody.Messages = []groqMessage{{Role: "system", Content: system}, {Role: "user", Content: prompt}}
	reqBody.ResponseFormat.Type = "json_object"
	reqBody.Temperature = 0.7

	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.groq.com/openai/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.apiKey)

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
	var out groqResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", err
	}
	if len(out.Choices) == 0 || out.Choices[0].Message.Content == "" {
		return "", fmt.Errorf("empty response")
	}
	return out.Choices[0].Message.Content, nil
}
