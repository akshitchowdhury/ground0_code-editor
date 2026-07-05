package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"ground0.dev/goserver/internal/cache"
)

// bcryptCost 12 ≈ 250ms/hash on typical hardware — the 2026 default for a
// non-bank threat model; revisit if login latency becomes a UX issue.
const bcryptCost = 12

const resetTokenTTL = time.Hour

// Session lookups are cached briefly so every authenticated request doesn't
// hit Postgres; kept short so logout/revocation propagates fast.
const sessionCacheTTL = 60 * time.Second

var (
	ErrBadCredentials = errors.New("invalid email or password")
	ErrEmailTaken     = errors.New("an account with this email already exists")
	ErrWeakPassword   = errors.New("password must be at least 8 characters")
	ErrBadEmail       = errors.New("a valid email address is required")
)

type Service struct {
	repo       *Repo
	kv         cache.KV
	mailer     *Mailer
	CookieName string
	TTL        time.Duration
}

func NewService(repo *Repo, kv cache.KV, mailer *Mailer, cookieName string, ttlHours int) *Service {
	return &Service{
		repo: repo, kv: kv, mailer: mailer,
		CookieName: cookieName, TTL: time.Duration(ttlHours) * time.Hour,
	}
}

func (s *Service) Available() bool { return s.repo.Available() }

// newToken returns (raw, sha256hex(raw)). The raw value goes in the cookie /
// reset email; only the hash is persisted.
func newToken() (string, string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", "", err
	}
	raw := base64.RawURLEncoding.EncodeToString(buf)
	return raw, hashToken(raw), nil
}

func hashToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// ---------- register / login ----------

func (s *Service) Register(ctx context.Context, email, password, name string) (User, string, error) {
	if !s.Available() {
		return User{}, "", ErrUnavailable
	}
	email = normalizeEmail(email)
	if len(email) < 3 || !strings.Contains(email, "@") {
		return User{}, "", ErrBadEmail
	}
	if len(password) < 8 {
		return User{}, "", ErrWeakPassword
	}

	existing, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return User{}, "", err
	}
	if existing.ID != "" {
		// If the account exists but is OAuth-only (no password row), setting
		// a password via register would let anyone claim it — refuse and
		// point the user at login / reset instead.
		return User{}, "", ErrEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return User{}, "", err
	}
	user, err := s.repo.CreateUser(ctx, email, name, "")
	if err != nil {
		return User{}, "", err
	}
	if err := s.repo.UpsertCredential(ctx, user.ID, string(hash)); err != nil {
		return User{}, "", err
	}
	token, err := s.IssueSession(ctx, user.ID)
	return user, token, err
}

func (s *Service) Login(ctx context.Context, email, password string) (User, string, error) {
	if !s.Available() {
		return User{}, "", ErrUnavailable
	}
	email = normalizeEmail(email)
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return User{}, "", err
	}
	if user.ID == "" {
		// Burn a bcrypt compare anyway so "no such user" and "wrong
		// password" take the same time (no account enumeration via timing).
		_ = bcrypt.CompareHashAndPassword(
			[]byte("$2a$12$C6UzMDM.H6dfI/f/IKcEeO5cO5rtRuIt3Nn1AzFEiTLxCmMBWDCZG"), []byte(password))
		return User{}, "", ErrBadCredentials
	}
	hash, err := s.repo.GetCredential(ctx, user.ID)
	if err != nil {
		return User{}, "", err
	}
	if hash == "" {
		return User{}, "", errors.New("this account signs in with Google/GitHub — use those buttons, or reset a password for it")
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return User{}, "", ErrBadCredentials
	}
	token, err := s.IssueSession(ctx, user.ID)
	return user, token, err
}

// ---------- sessions ----------

func (s *Service) IssueSession(ctx context.Context, userID string) (string, error) {
	raw, hash, err := newToken()
	if err != nil {
		return "", err
	}
	if err := s.repo.CreateSession(ctx, userID, hash, time.Now().Add(s.TTL)); err != nil {
		return "", err
	}
	return raw, nil
}

// Authenticate resolves a raw session token to a user id ("" = no session).
func (s *Service) Authenticate(ctx context.Context, raw string) string {
	if raw == "" || !s.Available() {
		return ""
	}
	hash := hashToken(raw)
	key := "auth:session:" + hash
	var cached string
	if s.kv != nil {
		if err := s.kv.GetJSON(ctx, key, &cached); err == nil && cached != "" {
			return cached
		}
	}
	userID, err := s.repo.GetSessionUser(ctx, hash)
	if err != nil || userID == "" {
		return ""
	}
	if s.kv != nil {
		s.kv.SetJSON(ctx, key, userID, sessionCacheTTL)
	}
	return userID
}

func (s *Service) Logout(ctx context.Context, raw string) {
	if raw == "" || !s.Available() {
		return
	}
	hash := hashToken(raw)
	if s.kv != nil {
		s.kv.Del(ctx, "auth:session:"+hash)
	}
	_ = s.repo.RevokeSession(ctx, hash)
}

func (s *Service) UserByID(ctx context.Context, id string) (User, error) {
	if !s.Available() {
		return User{}, ErrUnavailable
	}
	return s.repo.GetUserByID(ctx, id)
}

// ---------- OAuth sign-in ----------

// LoginWithOAuth links or creates the account for a provider identity and
// issues a session. Matching order: (provider, provider_user_id) first, then
// account-linking by verified email, then a brand-new user.
func (s *Service) LoginWithOAuth(ctx context.Context, provider string, ou OAuthUser) (User, string, error) {
	if !s.Available() {
		return User{}, "", ErrUnavailable
	}
	if ou.Email == "" {
		return User{}, "", fmt.Errorf("%s did not return an email address for this account", provider)
	}
	email := normalizeEmail(ou.Email)

	userID, err := s.repo.GetIdentityUser(ctx, provider, ou.ProviderUserID)
	if err != nil {
		return User{}, "", err
	}
	var user User
	if userID != "" {
		if user, err = s.repo.GetUserByID(ctx, userID); err != nil {
			return User{}, "", err
		}
	} else {
		if user, err = s.repo.GetUserByEmail(ctx, email); err != nil {
			return User{}, "", err
		}
		if user.ID == "" {
			if user, err = s.repo.CreateUser(ctx, email, ou.Name, ou.Photo); err != nil {
				return User{}, "", err
			}
		}
		if err := s.repo.LinkIdentity(ctx, user.ID, provider, ou.ProviderUserID); err != nil {
			return User{}, "", err
		}
	}
	token, err := s.IssueSession(ctx, user.ID)
	return user, token, err
}

// ---------- password reset ----------

// ForgotPassword always reports success to the caller (no account
// enumeration); the email is only sent when the account actually exists.
func (s *Service) ForgotPassword(ctx context.Context, email, frontendURL string) error {
	if !s.Available() {
		return ErrUnavailable
	}
	user, err := s.repo.GetUserByEmail(ctx, normalizeEmail(email))
	if err != nil || user.ID == "" {
		return nil
	}
	raw, hash, err := newToken()
	if err != nil {
		return nil
	}
	if err := s.repo.CreateResetToken(ctx, user.ID, hash, time.Now().Add(resetTokenTTL)); err != nil {
		return nil
	}
	link := strings.TrimRight(frontendURL, "/") + "/login?resetToken=" + raw
	s.mailer.SendPasswordReset(ctx, user.Email, link)
	return nil
}

func (s *Service) ResetPassword(ctx context.Context, rawToken, newPassword string) error {
	if !s.Available() {
		return ErrUnavailable
	}
	if len(newPassword) < 8 {
		return ErrWeakPassword
	}
	// Constant-time-ish guard against absurd inputs before hitting the DB.
	if subtle.ConstantTimeEq(int32(len(rawToken)), 0) == 1 {
		return errors.New("reset link is invalid or has expired")
	}
	userID, err := s.repo.UseResetToken(ctx, hashToken(rawToken))
	if err != nil {
		return err
	}
	if userID == "" {
		return errors.New("reset link is invalid or has expired")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcryptCost)
	if err != nil {
		return err
	}
	if err := s.repo.UpsertCredential(ctx, userID, string(hash)); err != nil {
		return err
	}
	// Log the user out everywhere — a reset means the old password (and any
	// session created with it) can no longer be trusted.
	return s.repo.RevokeAllSessions(ctx, userID)
}
