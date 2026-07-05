package progress

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"ground0.dev/goserver/internal/auth"
	"ground0.dev/goserver/internal/httpserver"
)

type Handler struct{ store Store }

func NewHandler(store Store) *Handler { return &Handler{store: store} }

// Progress sync is authenticated as of Phase 3: the user id comes from the
// session cookie, never from the client (the Express-era `?userId=` was
// trusted as-is — any caller could read anyone's progress). Guests get a
// 401, which api.js fails soft on: their progress lives in localStorage.

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	prog, err := h.store.GetProgress(r.Context(), auth.UserID(r))
	if err != nil {
		httpserver.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpserver.JSON(w, http.StatusOK, map[string]any{"progress": prog})
}

type putBody struct {
	ModuleID  string `json:"moduleId"`
	Completed []any  `json:"completed"`
}

func (h *Handler) Put(w http.ResponseWriter, r *http.Request) {
	var body putBody
	if !httpserver.DecodeJSON(w, r, &body) {
		return
	}
	if body.ModuleID == "" || body.Completed == nil {
		httpserver.Error(w, http.StatusBadRequest, "moduleId and completed[] required")
		return
	}
	if err := h.store.SetProgress(r.Context(), auth.UserID(r), body.ModuleID, body.Completed); err != nil {
		httpserver.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpserver.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func Mount(r chi.Router, h *Handler) {
	r.Get("/api/progress", auth.RequireUser(h.Get))
	r.Put("/api/progress", auth.RequireUser(h.Put))
}
