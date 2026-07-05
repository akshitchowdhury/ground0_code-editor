// Package httpserver holds the chi router, middleware, and shared JSON
// response helpers used by every route package.
package httpserver

import (
	"encoding/json"
	"net/http"
)

// JSON writes v as a JSON response body, matching the plain (non-enveloped)
// shape the legacy Express routes use for Phase 1 (progress/exams) so the
// wire format is byte-for-byte identical during the side-by-side migration.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Error writes { "error": message } with the given status, matching
// Express's `res.status(code).json({ error: '...' })` pattern.
func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, map[string]string{"error": message})
}

// studioEnvelope is the { data, error } wrapper used by Phase 2's
// /api/studio/* endpoints (new surface, not bound to Express parity).
type studioEnvelope struct {
	Data  any     `json:"data"`
	Error *string `json:"error"`
}

func StudioData(w http.ResponseWriter, v any) {
	JSON(w, http.StatusOK, studioEnvelope{Data: v})
}

func StudioError(w http.ResponseWriter, status int, message string) {
	JSON(w, status, studioEnvelope{Error: &message})
}

// DecodeJSON decodes the request body into dst, returning false and writing
// a 400 response if the body is missing/malformed.
func DecodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	if r.Body == nil {
		Error(w, http.StatusBadRequest, "request body required")
		return false
	}
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(dst); err != nil {
		Error(w, http.StatusBadRequest, "invalid JSON body")
		return false
	}
	return true
}
