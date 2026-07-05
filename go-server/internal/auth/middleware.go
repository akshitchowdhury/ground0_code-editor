package auth

import (
	"context"
	"net/http"

	"ground0.dev/goserver/internal/httpserver"
)

type ctxKey int

const userIDKey ctxKey = iota

// WithUser is applied to the whole router: if a valid session cookie is
// present, the authenticated user id rides along in the request context.
// It never rejects — endpoints that require auth use RequireUser.
func (s *Service) WithUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if c, err := r.Cookie(s.CookieName); err == nil && c.Value != "" {
			if userID := s.Authenticate(r.Context(), c.Value); userID != "" {
				r = r.WithContext(context.WithValue(r.Context(), userIDKey, userID))
			}
		}
		next.ServeHTTP(w, r)
	})
}

// UserID returns the authenticated user's id, or "" for guests/anonymous.
func UserID(r *http.Request) string {
	id, _ := r.Context().Value(userIDKey).(string)
	return id
}

// RequireUser guards endpoints that only make sense for signed-in users
// (progress sync, exam history). Guests get a 401 the frontend fails soft
// on — their data lives in localStorage, per the app's offline-first design.
func RequireUser(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if UserID(r) == "" {
			httpserver.Error(w, http.StatusUnauthorized, "sign in required")
			return
		}
		next(w, r)
	}
}
