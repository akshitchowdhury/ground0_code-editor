package cloud

import (
	"net/http"
	"strings"

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

func (h *Handler) Analyze(w http.ResponseWriter, r *http.Request) {
	var g model.Graph
	if !httpserver.DecodeJSON(w, r, &g) {
		return
	}
	httpserver.StudioData(w, AnalyzeArchitecture(g))
}

type simulateBody struct {
	model.Graph
	TargetID string `json:"targetId"`
}

func (h *Handler) Simulate(w http.ResponseWriter, r *http.Request) {
	var body simulateBody
	if !httpserver.DecodeJSON(w, r, &body) {
		return
	}
	httpserver.StudioData(w, BuildSimulation(body.Graph, body.TargetID))
}

type rpsBody struct {
	model.Graph
	RPS int `json:"rps"`
}

func (h *Handler) LoadTest(w http.ResponseWriter, r *http.Request) {
	var body rpsBody
	if !httpserver.DecodeJSON(w, r, &body) {
		return
	}
	rps := body.RPS
	if rps == 0 {
		rps = 1000
	}
	httpserver.StudioData(w, RunLoadTest(r.Context(), h.repo, body.Graph, rps))
}

func (h *Handler) LoadFlow(w http.ResponseWriter, r *http.Request) {
	var body rpsBody
	if !httpserver.DecodeJSON(w, r, &body) {
		return
	}
	rps := body.RPS
	if rps == 0 {
		rps = 1000
	}
	httpserver.StudioData(w, BuildLoadFlow(r.Context(), h.repo, body.Graph, rps))
}

type costBody struct {
	Nodes          []model.Node   `json:"nodes"`
	RPS            float64        `json:"rps"`
	InstanceCounts map[string]int `json:"instanceCounts"`
}

func (h *Handler) Cost(w http.ResponseWriter, r *http.Request) {
	var body costBody
	if !httpserver.DecodeJSON(w, r, &body) {
		return
	}
	httpserver.StudioData(w, EstimateCost(r.Context(), h.repo, body.Nodes, body.RPS, body.InstanceCounts))
}

type specsResponse struct {
	InstanceTypes []InstanceType     `json:"instanceTypes"`
	DBClasses     []DBClass          `json:"dbClasses"`
	CacheTypes    []CacheType        `json:"cacheTypes"`
	Constants     map[string]float64 `json:"constants"`
}

func (h *Handler) Specs(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	httpserver.StudioData(w, specsResponse{
		InstanceTypes: h.repo.InstanceTypes(ctx),
		DBClasses:     h.repo.DBClasses(ctx),
		CacheTypes:    h.repo.CacheTypes(ctx),
		Constants:     h.repo.Constants(ctx),
	})
}

type generateBody struct {
	Prompt string `json:"prompt"`
}

// Generate turns a plain-English description into a starter design. Always
// succeeds (AI, or a keyword-matched template) so the UI never dead-ends.
func (h *Handler) Generate(w http.ResponseWriter, r *http.Request) {
	var body generateBody
	if !httpserver.DecodeJSON(w, r, &body) {
		return
	}
	if strings.TrimSpace(body.Prompt) == "" {
		httpserver.StudioError(w, http.StatusBadRequest, "describe what you want to build")
		return
	}
	httpserver.StudioData(w, Generate(r.Context(), h.llm, body.Prompt))
}

func Mount(r chi.Router, h *Handler) {
	r.Post("/api/studio/cloud/analyze", h.Analyze)
	r.Post("/api/studio/cloud/simulate", h.Simulate)
	r.Post("/api/studio/cloud/loadtest", h.LoadTest)
	r.Post("/api/studio/cloud/loadflow", h.LoadFlow)
	r.Post("/api/studio/cloud/cost", h.Cost)
	r.Get("/api/studio/cloud/specs", h.Specs)
	r.Post("/api/studio/cloud/generate", h.Generate)
}
