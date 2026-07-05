// Package config loads Ground0's Go backend configuration from the
// environment. Mirrors the env vars the legacy Express server already reads
// (DATABASE_URL, ANTHROPIC_API_KEY) plus the ones added for this migration.
package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// loadDotenv mirrors Express's `import 'dotenv/config'`. The repo's .env
// lives at the repo root, but `npm run goserver` runs `go run` with cwd
// go-server/ — so check both the working directory and its parent. A
// missing .env is not an error (matches the Node side's zero-config default).
func loadDotenv() {
	for _, path := range []string{".env", "../.env"} {
		if err := godotenv.Load(path); err == nil {
			return
		}
	}
}

type Config struct {
	Port         string
	DatabaseURL  string
	RedisURL     string
	AnthropicKey string
	GeminiKey    string
	GroqKey      string

	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string

	GitHubClientID     string
	GitHubClientSecret string
	GitHubRedirectURL  string

	SessionCookieName string
	SessionTTLHours   int
	FrontendURL       string
	ResendAPIKey      string
}

func Load() Config {
	loadDotenv()
	return Config{
		Port:         getEnv("GO_PORT", "4100"),
		DatabaseURL:  os.Getenv("DATABASE_URL"),
		RedisURL:     getEnv("REDIS_URL", "redis://localhost:6379/0"),
		AnthropicKey: os.Getenv("ANTHROPIC_API_KEY"),
		GeminiKey:    os.Getenv("GEMINI_API_KEY"),
		GroqKey:      os.Getenv("GROQ_API_KEY"),

		GoogleClientID:     os.Getenv("GOOGLE_OAUTH_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
		GoogleRedirectURL:  os.Getenv("GOOGLE_OAUTH_REDIRECT_URL"),

		GitHubClientID:     os.Getenv("GITHUB_OAUTH_CLIENT_ID"),
		GitHubClientSecret: os.Getenv("GITHUB_OAUTH_CLIENT_SECRET"),
		GitHubRedirectURL:  os.Getenv("GITHUB_OAUTH_REDIRECT_URL"),

		SessionCookieName: getEnv("SESSION_COOKIE_NAME", "g0_session"),
		SessionTTLHours:   getEnvInt("SESSION_TTL_HOURS", 720),
		FrontendURL:       getEnv("FRONTEND_URL", "http://localhost:5173"),
		ResendAPIKey:      os.Getenv("RESEND_API_KEY"),
	}
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return fallback
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
