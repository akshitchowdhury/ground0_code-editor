package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"log"
	"net/http"
	"net/url"
	"strings"

	"github.com/go-chi/chi/v5"
	"ground0.dev/goserver/internal/cache"
	"ground0.dev/goserver/internal/httpserver"
)

type Handler struct {
	svc         *Service
	kv          cache.KV
	providers   map[string]*Provider
	frontendURL string
}

func NewHandler(svc *Service, kv cache.KV, providers map[string]*Provider, frontendURL string) *Handler {
	return &Handler{svc: svc, kv: kv, providers: providers, frontendURL: frontendURL}
}

// setSessionCookie/clearSessionCookie: HttpOnly + SameSite=Lax; Secure only
// over TLS so the cookie still works on plain-http localhost dev.
func (h *Handler) setSessionCookie(w http.ResponseWriter, r *http.Request, raw string) {
	http.SetCookie(w, &http.Cookie{
		Name: h.svc.CookieName, Value: raw, Path: "/",
		HttpOnly: true, SameSite: http.SameSiteLaxMode, Secure: r.TLS != nil,
		MaxAge: int(h.svc.TTL.Seconds()),
	})
}

func (h *Handler) clearSessionCookie(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name: h.svc.CookieName, Value: "", Path: "/",
		HttpOnly: true, SameSite: http.SameSiteLaxMode, Secure: r.TLS != nil,
		MaxAge: -1,
	})
}

// authErr maps service errors to the right status without leaking internals.
func authErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrUnavailable):
		httpserver.Error(w, http.StatusServiceUnavailable, err.Error())
	case errors.Is(err, ErrBadCredentials):
		httpserver.Error(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, ErrEmailTaken), errors.Is(err, ErrWeakPassword), errors.Is(err, ErrBadEmail):
		httpserver.Error(w, http.StatusBadRequest, err.Error())
	default:
		log.Printf("[auth] %v", err)
		httpserver.Error(w, http.StatusBadRequest, err.Error())
	}
}

// ---------- email / password ----------

type registerBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var body registerBody
	if !httpserver.DecodeJSON(w, r, &body) {
		return
	}
	user, token, err := h.svc.Register(r.Context(), body.Email, body.Password, body.Name)
	if err != nil {
		authErr(w, err)
		return
	}
	h.setSessionCookie(w, r, token)
	httpserver.JSON(w, http.StatusOK, map[string]any{"user": user})
}

type loginBody struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var body loginBody
	if !httpserver.DecodeJSON(w, r, &body) {
		return
	}
	user, token, err := h.svc.Login(r.Context(), body.Email, body.Password)
	if err != nil {
		authErr(w, err)
		return
	}
	h.setSessionCookie(w, r, token)
	httpserver.JSON(w, http.StatusOK, map[string]any{"user": user})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie(h.svc.CookieName); err == nil {
		h.svc.Logout(r.Context(), c.Value)
	}
	h.clearSessionCookie(w, r)
	httpserver.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	userID := UserID(r)
	if userID == "" {
		httpserver.Error(w, http.StatusUnauthorized, "not signed in")
		return
	}
	user, err := h.svc.UserByID(r.Context(), userID)
	if err != nil || user.ID == "" {
		httpserver.Error(w, http.StatusUnauthorized, "not signed in")
		return
	}
	httpserver.JSON(w, http.StatusOK, map[string]any{"user": user})
}

// Providers tells the login page which sign-in methods are actually live,
// so OAuth buttons only render when client ids are configured.
func (h *Handler) Providers(w http.ResponseWriter, r *http.Request) {
	_, google := h.providers["google"]
	_, github := h.providers["github"]
	httpserver.JSON(w, http.StatusOK, map[string]any{
		"available": h.svc.Available(), // false = no DB, guest mode only
		"google":    google,
		"github":    github,
	})
}

// ---------- password reset ----------

type forgotBody struct {
	Email string `json:"email"`
}

func (h *Handler) Forgot(w http.ResponseWriter, r *http.Request) {
	var body forgotBody
	if !httpserver.DecodeJSON(w, r, &body) {
		return
	}
	if err := h.svc.ForgotPassword(r.Context(), body.Email, h.frontendURL); err != nil {
		authErr(w, err)
		return
	}
	// Always "ok" — whether the account exists is not disclosed.
	httpserver.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

type resetBody struct {
	Token       string `json:"token"`
	NewPassword string `json:"newPassword"`
}

func (h *Handler) Reset(w http.ResponseWriter, r *http.Request) {
	var body resetBody
	if !httpserver.DecodeJSON(w, r, &body) {
		return
	}
	if err := h.svc.ResetPassword(r.Context(), body.Token, body.NewPassword); err != nil {
		authErr(w, err)
		return
	}
	httpserver.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ---------- OAuth ----------

func (h *Handler) oauthProvider(w http.ResponseWriter, r *http.Request) *Provider {
	p, ok := h.providers[chi.URLParam(r, "provider")]
	if !ok {
		httpserver.Error(w, http.StatusNotFound,
			"this sign-in provider is not configured — set its OAUTH client id/secret in .env and restart the Go server")
		return nil
	}
	return p
}

// OAuthStart generates the CSRF state and redirects the browser to the
// provider's consent screen. This is a top-level navigation, not a fetch.
func (h *Handler) OAuthStart(w http.ResponseWriter, r *http.Request) {
	p := h.oauthProvider(w, r)
	if p == nil {
		return
	}
	if !h.svc.Available() {
		http.Redirect(w, r, h.frontendRedirect("sign-in requires the database — start Postgres and retry"), http.StatusFound)
		return
	}
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		httpserver.Error(w, http.StatusInternalServerError, "could not start sign-in")
		return
	}
	state := base64.RawURLEncoding.EncodeToString(buf)
	storeState(r.Context(), h.kv, state)
	http.Redirect(w, r, p.Config.AuthCodeURL(state), http.StatusFound)
}

// OAuthCallback validates state, exchanges the code, fetches the identity,
// signs the user in, and sends the browser back to the app. Errors also
// redirect back (with ?authError=...) — the browser is mid-navigation here,
// so a JSON error would strand the user on a blank API page.
func (h *Handler) OAuthCallback(w http.ResponseWriter, r *http.Request) {
	p := h.oauthProvider(w, r)
	if p == nil {
		return
	}
	q := r.URL.Query()
	if errMsg := q.Get("error"); errMsg != "" {
		http.Redirect(w, r, h.frontendRedirect("sign-in was cancelled"), http.StatusFound)
		return
	}
	if !checkState(r.Context(), h.kv, q.Get("state")) {
		http.Redirect(w, r, h.frontendRedirect("sign-in expired — please try again"), http.StatusFound)
		return
	}
	token, err := p.Config.Exchange(r.Context(), q.Get("code"))
	if err != nil {
		log.Printf("[auth] %s code exchange failed: %v", p.Name, err)
		http.Redirect(w, r, h.frontendRedirect("sign-in failed — please try again"), http.StatusFound)
		return
	}
	ou, err := p.FetchUser(r.Context(), p.Config.Client(r.Context(), token))
	if err != nil {
		log.Printf("[auth] %s userinfo failed: %v", p.Name, err)
		http.Redirect(w, r, h.frontendRedirect("sign-in failed — please try again"), http.StatusFound)
		return
	}
	_, session, err := h.svc.LoginWithOAuth(r.Context(), p.Name, ou)
	if err != nil {
		log.Printf("[auth] %s login failed: %v", p.Name, err)
		http.Redirect(w, r, h.frontendRedirect(err.Error()), http.StatusFound)
		return
	}
	h.setSessionCookie(w, r, session)
	http.Redirect(w, r, h.frontendURL, http.StatusFound)
}

func (h *Handler) frontendRedirect(errMsg string) string {
	return strings.TrimRight(h.frontendURL, "/") + "/login?authError=" + url.QueryEscape(errMsg)
}

func Mount(r chi.Router, h *Handler) {
	r.Post("/api/auth/register", h.Register)
	r.Post("/api/auth/login", h.Login)
	r.Post("/api/auth/logout", h.Logout)
	r.Get("/api/auth/me", h.Me)
	r.Get("/api/auth/providers", h.Providers)
	r.Post("/api/auth/password/forgot", h.Forgot)
	r.Post("/api/auth/password/reset", h.Reset)
	r.Get("/api/auth/oauth/{provider}/start", h.OAuthStart)
	r.Get("/api/auth/oauth/{provider}/callback", h.OAuthCallback)
}
