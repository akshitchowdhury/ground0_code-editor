package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"ground0.dev/goserver/internal/cache"
	"ground0.dev/goserver/internal/config"
)

// OAuthUser is the normalized identity fetched from a provider's userinfo
// endpoint after the code exchange.
type OAuthUser struct {
	ProviderUserID string
	Email          string
	Name           string
	Photo          string
}

// Provider wraps an oauth2.Config plus the provider-specific userinfo fetch.
type Provider struct {
	Name      string
	Config    *oauth2.Config
	FetchUser func(ctx context.Context, client *http.Client) (OAuthUser, error)
}

// stateTTL bounds how long an OAuth consent screen can sit open before the
// CSRF state expires.
const stateTTL = 10 * time.Minute

// NewProviders builds the configured providers from env config; providers
// with no client id/secret simply aren't offered (the frontend asks
// /api/auth/providers which are live).
func NewProviders(cfg config.Config) map[string]*Provider {
	providers := map[string]*Provider{}

	if cfg.GoogleClientID != "" && cfg.GoogleClientSecret != "" {
		providers["google"] = &Provider{
			Name: "google",
			Config: &oauth2.Config{
				ClientID:     cfg.GoogleClientID,
				ClientSecret: cfg.GoogleClientSecret,
				RedirectURL:  cfg.GoogleRedirectURL,
				Endpoint:     google.Endpoint,
				Scopes:       []string{"openid", "email", "profile"},
			},
			FetchUser: fetchGoogleUser,
		}
	}

	if cfg.GitHubClientID != "" && cfg.GitHubClientSecret != "" {
		providers["github"] = &Provider{
			Name: "github",
			Config: &oauth2.Config{
				ClientID:     cfg.GitHubClientID,
				ClientSecret: cfg.GitHubClientSecret,
				RedirectURL:  cfg.GitHubRedirectURL,
				// GitHub has no x/oauth2 sub-package; its two endpoints are
				// stable, documented constants.
				Endpoint: oauth2.Endpoint{
					AuthURL:  "https://github.com/login/oauth/authorize",
					TokenURL: "https://github.com/login/oauth/access_token",
				},
				Scopes: []string{"read:user", "user:email"},
			},
			FetchUser: fetchGitHubUser,
		}
	}

	return providers
}

// ---------- CSRF state (stored in the shared KV cache) ----------

func storeState(ctx context.Context, kv cache.KV, state string) {
	if kv != nil {
		kv.SetJSON(ctx, "auth:oauthstate:"+state, true, stateTTL)
	}
}

func checkState(ctx context.Context, kv cache.KV, state string) bool {
	if kv == nil || state == "" {
		return false
	}
	var ok bool
	if err := kv.GetJSON(ctx, "auth:oauthstate:"+state, &ok); err != nil {
		return false
	}
	kv.Del(ctx, "auth:oauthstate:"+state) // single use
	return ok
}

// ---------- userinfo fetchers ----------

func getJSON(ctx context.Context, client *http.Client, url string, dest any) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("userinfo: status %d: %s", resp.StatusCode, string(raw))
	}
	return json.Unmarshal(raw, dest)
}

func fetchGoogleUser(ctx context.Context, client *http.Client) (OAuthUser, error) {
	var info struct {
		Sub     string `json:"sub"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	if err := getJSON(ctx, client, "https://openidconnect.googleapis.com/v1/userinfo", &info); err != nil {
		return OAuthUser{}, err
	}
	return OAuthUser{ProviderUserID: info.Sub, Email: info.Email, Name: info.Name, Photo: info.Picture}, nil
}

func fetchGitHubUser(ctx context.Context, client *http.Client) (OAuthUser, error) {
	var info struct {
		ID        int64  `json:"id"`
		Login     string `json:"login"`
		Name      string `json:"name"`
		Email     string `json:"email"`
		AvatarURL string `json:"avatar_url"`
	}
	if err := getJSON(ctx, client, "https://api.github.com/user", &info); err != nil {
		return OAuthUser{}, err
	}
	email := info.Email
	if email == "" {
		// The profile email is empty when the user keeps it private — the
		// user:email scope still allows listing verified addresses.
		var emails []struct {
			Email    string `json:"email"`
			Primary  bool   `json:"primary"`
			Verified bool   `json:"verified"`
		}
		if err := getJSON(ctx, client, "https://api.github.com/user/emails", &emails); err == nil {
			for _, e := range emails {
				if e.Primary && e.Verified {
					email = e.Email
					break
				}
			}
			if email == "" {
				for _, e := range emails {
					if e.Verified {
						email = e.Email
						break
					}
				}
			}
		}
	}
	name := info.Name
	if name == "" {
		name = info.Login
	}
	return OAuthUser{ProviderUserID: fmt.Sprintf("%d", info.ID), Email: email, Name: name, Photo: info.AvatarURL}, nil
}
