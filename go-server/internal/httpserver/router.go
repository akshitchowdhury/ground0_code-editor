package httpserver

import "github.com/go-chi/chi/v5"

// NewRouter returns a bare chi.Mux with the shared middleware chain applied.
// Domain packages (progress, exams, studio/cloud, studio/agent, auth) mount
// their own routes onto it via their own Mount(r *chi.Mux, ...) functions.
func NewRouter() *chi.Mux {
	r := chi.NewRouter()
	r.Use(CORS)
	return r
}
