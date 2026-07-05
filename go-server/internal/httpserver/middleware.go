package httpserver

import "net/http"

// CORS mirrors the Express server's permissive `cors()` (no allow-listed
// origin — a local learning-sandbox app, not a public multi-tenant service),
// but reflects the request's Origin (rather than "*") and sets
// Allow-Credentials, since Phase 3 sessions ride on a cookie sent via
// `fetch(..., { credentials: 'include' })` — browsers reject wildcard
// Access-Control-Allow-Origin on credentialed requests.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if origin := r.Header.Get("Origin"); origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type,Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
