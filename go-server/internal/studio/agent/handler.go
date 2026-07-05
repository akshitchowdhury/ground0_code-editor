package agent

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"ground0.dev/goserver/internal/httpserver"
	"ground0.dev/goserver/internal/llm"
	"ground0.dev/goserver/internal/model"
)

type Handler struct {
	repo *SpecsRepo
	llm  *llm.Client
}

func NewHandler(repo *SpecsRepo, client *llm.Client) *Handler {
	return &Handler{repo: repo, llm: client}
}

type analyzeBody struct {
	model.Graph
	BlueprintID string `json:"blueprintId"`
}

func (h *Handler) Analyze(w http.ResponseWriter, r *http.Request) {
	var body analyzeBody
	if !httpserver.DecodeJSON(w, r, &body) {
		return
	}
	httpserver.StudioData(w, AnalyzeAgent(r.Context(), h.repo, body.Graph, body.BlueprintID))
}

type simulateBody struct {
	model.Graph
	Mode string `json:"mode"`
}

func (h *Handler) Simulate(w http.ResponseWriter, r *http.Request) {
	var body simulateBody
	if !httpserver.DecodeJSON(w, r, &body) {
		return
	}
	httpserver.StudioData(w, SimulateAgent(body.Graph, body.Mode))
}

type profileBody struct {
	Nodes []model.Node `json:"nodes"`
}

func (h *Handler) Profile(w http.ResponseWriter, r *http.Request) {
	var body profileBody
	if !httpserver.DecodeJSON(w, r, &body) {
		return
	}
	httpserver.StudioData(w, BuildProfile(r.Context(), h.repo, body.Nodes))
}

type specsResponse struct {
	Models        []Model           `json:"models"`
	AgentPatterns map[string]string `json:"agentPatterns"`
}

func (h *Handler) Specs(w http.ResponseWriter, r *http.Request) {
	httpserver.StudioData(w, specsResponse{Models: h.repo.Models(r.Context()), AgentPatterns: AgentPatterns})
}

func Mount(r chi.Router, h *Handler) {
	r.Post("/api/studio/agent/analyze", h.Analyze)
	r.Post("/api/studio/agent/simulate", h.Simulate)
	r.Post("/api/studio/agent/profile", h.Profile)
	r.Get("/api/studio/agent/specs", h.Specs)
}
