package exams

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"ground0.dev/goserver/internal/auth"
	"ground0.dev/goserver/internal/httpserver"
)

type Handler struct {
	store Store
	ai    *AI
}

func NewHandler(store Store, ai *AI) *Handler { return &Handler{store: store, ai: ai} }

// publicQuestion strips answers/explanations before sending to the client —
// mirrors server/index.js's POST /api/exams response mapping.
type publicQuestion struct {
	ID       string   `json:"id"`
	Domain   string   `json:"domain"`
	Scenario string   `json:"scenario"`
	Question string   `json:"question"`
	Options  []string `json:"options"`
}

type createBody struct {
	ExamType string `json:"examType"`
	Count    int    `json:"count"`
}

// Create ports Express's `POST /api/exams`, with one Phase 3 change: the
// exam's owner comes from the session cookie, not a client-supplied userId.
// Guests can still take exams — their sessions are stored with no user
// (NULL user_id) and simply have no server-side history.
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var body createBody
	if !httpserver.DecodeJSON(w, r, &body) {
		return
	}
	exam, ok := ExamTypes[body.ExamType]
	if !ok {
		httpserver.Error(w, http.StatusBadRequest, "valid examType required")
		return
	}
	n := body.Count
	if n == 0 {
		n = 10
	}
	if n < 3 {
		n = 3
	}
	if n > 15 {
		n = 15
	}

	source := "ai"
	questions := h.ai.GenerateQuestions(r.Context(), exam, n)
	if questions == nil {
		source = "bank"
		questions = SampleQuestions(body.ExamType, n)
	}

	id := uuid.NewString()
	if err := h.store.CreateExam(r.Context(), CreateExamInput{
		ID: id, UserID: auth.UserID(r), ExamType: body.ExamType, Source: source,
		Questions: questions, Total: len(questions),
	}); err != nil {
		httpserver.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	publicQuestions := make([]publicQuestion, len(questions))
	for i, q := range questions {
		publicQuestions[i] = publicQuestion{ID: q.ID, Domain: q.Domain, Scenario: q.Scenario, Question: q.Question, Options: q.Options}
	}

	httpserver.JSON(w, http.StatusOK, map[string]any{
		"sessionId": id,
		"examType":  body.ExamType,
		"examName":  exam.Name,
		"source":    source,
		"questions": publicQuestions,
	})
}

type submitBody struct {
	Answers map[string]int `json:"answers"`
}

// Submit matches Express's `POST /api/exams/:id/submit`.
func (h *Handler) Submit(w http.ResponseWriter, r *http.Request) {
	var body submitBody
	if !httpserver.DecodeJSON(w, r, &body) {
		return
	}
	id := chi.URLParam(r, "id")
	session, err := h.store.GetExam(r.Context(), id)
	if err != nil {
		httpserver.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if session == nil {
		httpserver.Error(w, http.StatusNotFound, "exam session not found")
		return
	}
	if session.Status == "completed" {
		httpserver.Error(w, http.StatusConflict, "exam already submitted")
		return
	}
	if body.Answers == nil {
		httpserver.Error(w, http.StatusBadRequest, "answers required")
		return
	}

	exam := ExamTypes[session.ExamType]
	graded := make([]GradedQuestion, len(session.Questions))
	score := 0
	for i, q := range session.Questions {
		var userIndex *int
		if idx, ok := body.Answers[q.ID]; ok {
			v := idx
			userIndex = &v
		}
		correct := userIndex != nil && *userIndex == q.CorrectIndex
		if correct {
			score++
		}
		graded[i] = GradedQuestion{
			ID: q.ID, Domain: q.Domain, Scenario: q.Scenario, Question: q.Question, Options: q.Options,
			CorrectIndex: q.CorrectIndex, Explanation: q.Explanation, UserIndex: userIndex, Correct: correct,
		}
	}
	total := len(graded)

	var domainBreakdown []DomainBreakdown
	for _, domain := range exam.Domains {
		var inDomain []GradedQuestion
		for _, g := range graded {
			if g.Domain == domain {
				inDomain = append(inDomain, g)
			}
		}
		if len(inDomain) == 0 {
			continue
		}
		correct := 0
		for _, g := range inDomain {
			if g.Correct {
				correct++
			}
		}
		domainBreakdown = append(domainBreakdown, DomainBreakdown{Domain: domain, Total: len(inDomain), Correct: correct})
	}

	feedback := h.ai.GenerateFeedback(r.Context(), exam, graded, score, total, domainBreakdown)
	if feedback == nil {
		feedback = HeuristicFeedback(exam, score, total, domainBreakdown)
	}

	if err := h.store.CompleteExam(r.Context(), session.ID, body.Answers, score, feedback); err != nil {
		httpserver.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpserver.JSON(w, http.StatusOK, map[string]any{
		"score": score, "total": total, "domainBreakdown": domainBreakdown,
		"results": graded, "feedback": feedback, "source": session.Source,
	})
}

// History ports Express's `GET /api/exams?userId=`, but the user now comes
// from the session. Guests (no session) get an empty history rather than an
// error — ExamLab renders that as "no attempts yet".
func (h *Handler) History(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r)
	if userID == "" {
		httpserver.JSON(w, http.StatusOK, map[string]any{"exams": []ExamHistoryEntry{}})
		return
	}
	exams, err := h.store.ListExams(r.Context(), userID, 10)
	if err != nil {
		httpserver.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	if exams == nil {
		exams = []ExamHistoryEntry{}
	}
	httpserver.JSON(w, http.StatusOK, map[string]any{"exams": exams})
}

// StudyPlan returns an adaptive plan built from the signed-in user's
// per-domain performance across attempts. Guests (no session / no history)
// get an empty plan the UI renders as a prompt to take an exam.
func (h *Handler) StudyPlan(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserID(r)
	if userID == "" {
		httpserver.JSON(w, http.StatusOK, BuildStudyPlan(r.Context(), nil, nil))
		return
	}
	sessions, err := h.store.CompletedSessions(r.Context(), userID, 25)
	if err != nil {
		httpserver.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpserver.JSON(w, http.StatusOK, BuildStudyPlan(r.Context(), h.ai.Client(), sessions))
}

func Mount(r chi.Router, h *Handler) {
	r.Post("/api/exams", h.Create)
	r.Post("/api/exams/{id}/submit", h.Submit)
	r.Get("/api/exams", h.History)
	r.Get("/api/exams/studyplan", h.StudyPlan)
}
