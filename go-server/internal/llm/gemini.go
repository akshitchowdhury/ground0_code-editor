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

// geminiProvider calls Google's Gemini API over raw HTTP/JSON. Free tier, no
// card required (key from https://aistudio.google.com/apikey).
// gemini-2.5-flash is fast and well within free-tier quota for these uses.
type geminiProvider struct {
	apiKey string
	client *http.Client
}

const geminiModel = "gemini-2.5-flash"

func newGeminiProvider(apiKey string) *geminiProvider {
	return &geminiProvider{apiKey: apiKey, client: &http.Client{Timeout: 60 * time.Second}}
}

func (p *geminiProvider) name() string { return "gemini" }

type geminiPart struct {
	Text string `json:"text"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
	Role  string       `json:"role,omitempty"`
}

type geminiRequest struct {
	SystemInstruction *geminiContent  `json:"systemInstruction,omitempty"`
	Contents          []geminiContent `json:"contents"`
	GenerationConfig  struct {
		ResponseMimeType string `json:"responseMimeType"`
	} `json:"generationConfig"`
}

type geminiResponse struct {
	Candidates []struct {
		Content geminiContent `json:"content"`
	} `json:"candidates"`
}

func (p *geminiProvider) generateJSON(ctx context.Context, system, prompt string) (string, error) {
	var reqBody geminiRequest
	reqBody.SystemInstruction = &geminiContent{Parts: []geminiPart{{Text: system}}}
	reqBody.Contents = []geminiContent{{Parts: []geminiPart{{Text: prompt}}}}
	reqBody.GenerationConfig.ResponseMimeType = "application/json"

	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", geminiModel, p.apiKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

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
	var out geminiResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", err
	}
	if len(out.Candidates) == 0 || len(out.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("empty response")
	}
	return out.Candidates[0].Content.Parts[0].Text, nil
}
