package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"
)

// Mailer sends transactional email through Resend (https://resend.com —
// simple HTTP API, free tier). With no RESEND_API_KEY the reset link is
// logged to the server console instead, so the flow stays testable in dev.
type Mailer struct {
	apiKey string
	client *http.Client
}

func NewMailer(apiKey string) *Mailer {
	return &Mailer{apiKey: apiKey, client: &http.Client{Timeout: 15 * time.Second}}
}

func (m *Mailer) SendPasswordReset(ctx context.Context, to, link string) {
	if m.apiKey == "" {
		log.Printf("[auth] RESEND_API_KEY not set — password reset link for %s: %s", to, link)
		return
	}
	body, _ := json.Marshal(map[string]any{
		// Resend's shared onboarding sender works without domain
		// verification; swap for a verified domain sender in production.
		"from":    "Ground0 <onboarding@resend.dev>",
		"to":      []string{to},
		"subject": "Reset your Ground0 password",
		"html": `<p>Someone (hopefully you) asked to reset the password for this Ground0 account.</p>` +
			`<p><a href="` + link + `">Set a new password</a> — this link works once and expires in 1 hour.</p>` +
			`<p>If this wasn't you, ignore this email; your password is unchanged.</p>`,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		log.Printf("[auth] reset email to %s failed: %v", to, err)
		return
	}
	req.Header.Set("Authorization", "Bearer "+m.apiKey)
	req.Header.Set("Content-Type", "application/json")
	resp, err := m.client.Do(req)
	if err != nil {
		log.Printf("[auth] reset email to %s failed: %v", to, err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(resp.Body)
		log.Printf("[auth] reset email to %s failed: status %d: %s", to, resp.StatusCode, string(raw))
	}
}
