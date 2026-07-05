package fix

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"ground0.dev/goserver/internal/httpserver"
	"ground0.dev/goserver/internal/llm"
)

type Handler struct{ llm *llm.Client }

func NewHandler(client *llm.Client) *Handler { return &Handler{llm: client} }

func (h *Handler) Fix(w http.ResponseWriter, r *http.Request) {
	var f Finding
	if !httpserver.DecodeJSON(w, r, &f) {
		return
	}
	if strings.TrimSpace(f.Title) == "" {
		httpserver.StudioError(w, http.StatusBadRequest, "a finding title is required")
		return
	}
	if f.Studio != "agent" {
		f.Studio = "cloud"
	}
	httpserver.StudioData(w, Generate(r.Context(), h.llm, f))
}

func Mount(r chi.Router, h *Handler) {
	r.Post("/api/studio/fix", h.Fix)
}
