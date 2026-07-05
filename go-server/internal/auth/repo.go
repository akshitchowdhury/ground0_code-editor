// Package auth is Ground0's custom auth service (Phase 3): email/password
// accounts, Google/GitHub OAuth (authorization-code flow), and opaque
// server-side sessions delivered as an HttpOnly cookie. Only SHA-256 hashes
// of session/reset tokens are stored — the raw token lives only in the
// browser's cookie / the reset email.
package auth

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// User is the account shape returned to the frontend.
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	PhotoURL  string    `json:"photoURL,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

// Repo persists auth state in Postgres. Auth (unlike progress/exams) has no
// in-memory fallback — accounts that evaporate on restart are worse than no
// accounts, so with no DATABASE_URL the auth endpoints return 503 and the
// app keeps working in guest mode only.
type Repo struct{ pool *pgxpool.Pool }

func NewRepo(pool *pgxpool.Pool) *Repo { return &Repo{pool: pool} }

func (r *Repo) Available() bool { return r != nil && r.pool != nil }

var ErrUnavailable = errors.New("auth requires a database (DATABASE_URL not configured)")

// ---------- users ----------

const userCols = `id::text, email, COALESCE(display_name, ''), COALESCE(photo_url, ''), created_at`

func scanUser(row pgx.Row) (User, error) {
	var u User
	err := row.Scan(&u.ID, &u.Email, &u.Name, &u.PhotoURL, &u.CreatedAt)
	return u, err
}

func (r *Repo) CreateUser(ctx context.Context, email, name, photoURL string) (User, error) {
	return scanUser(r.pool.QueryRow(ctx, `
		INSERT INTO users (email, display_name, photo_url)
		VALUES ($1, NULLIF($2, ''), NULLIF($3, ''))
		RETURNING `+userCols, email, name, photoURL))
}

// GetUserByEmail returns (User{}, nil) with a zero ID when no user exists.
func (r *Repo) GetUserByEmail(ctx context.Context, email string) (User, error) {
	u, err := scanUser(r.pool.QueryRow(ctx,
		`SELECT `+userCols+` FROM users WHERE lower(email) = lower($1)`, email))
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, nil
	}
	return u, err
}

func (r *Repo) GetUserByID(ctx context.Context, id string) (User, error) {
	u, err := scanUser(r.pool.QueryRow(ctx,
		`SELECT `+userCols+` FROM users WHERE id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, nil
	}
	return u, err
}

// ---------- credentials ----------

func (r *Repo) UpsertCredential(ctx context.Context, userID, passwordHash string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO credentials (user_id, password_hash, updated_at)
		VALUES ($1, $2, now())
		ON CONFLICT (user_id) DO UPDATE SET password_hash = $2, updated_at = now()
	`, userID, passwordHash)
	return err
}

// GetCredential returns ("", nil) when the user has no password row
// (OAuth-only account).
func (r *Repo) GetCredential(ctx context.Context, userID string) (string, error) {
	var hash string
	err := r.pool.QueryRow(ctx,
		`SELECT password_hash FROM credentials WHERE user_id = $1`, userID).Scan(&hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return hash, err
}

// ---------- oauth identities ----------

// GetIdentityUser returns ("", nil) when the (provider, providerUserID)
// pair has never been linked.
func (r *Repo) GetIdentityUser(ctx context.Context, provider, providerUserID string) (string, error) {
	var userID string
	err := r.pool.QueryRow(ctx, `
		SELECT user_id::text FROM oauth_identities
		WHERE provider = $1 AND provider_user_id = $2
	`, provider, providerUserID).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return userID, err
}

func (r *Repo) LinkIdentity(ctx context.Context, userID, provider, providerUserID string) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO oauth_identities (user_id, provider, provider_user_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (provider, provider_user_id) DO NOTHING
	`, userID, provider, providerUserID)
	return err
}

// ---------- sessions ----------

func (r *Repo) CreateSession(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)
	`, userID, tokenHash, expiresAt)
	return err
}

// GetSessionUser returns ("", nil) for a missing/expired/revoked session.
func (r *Repo) GetSessionUser(ctx context.Context, tokenHash string) (string, error) {
	var userID string
	err := r.pool.QueryRow(ctx, `
		SELECT user_id::text FROM sessions
		WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
	`, tokenHash).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return userID, err
}

func (r *Repo) RevokeSession(ctx context.Context, tokenHash string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`, tokenHash)
	return err
}

// RevokeAllSessions logs the user out everywhere (used after password reset).
func (r *Repo) RevokeAllSessions(ctx context.Context, userID string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, userID)
	return err
}

// ---------- password reset ----------

func (r *Repo) CreateResetToken(ctx context.Context, userID, tokenHash string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)
	`, userID, tokenHash, expiresAt)
	return err
}

// UseResetToken atomically consumes a valid token (single-use) and returns
// its user id, or ("", nil) if the token is unknown, expired, or spent.
func (r *Repo) UseResetToken(ctx context.Context, tokenHash string) (string, error) {
	var userID string
	err := r.pool.QueryRow(ctx, `
		UPDATE password_reset_tokens SET used_at = now()
		WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
		RETURNING user_id::text
	`, tokenHash).Scan(&userID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return userID, err
}
