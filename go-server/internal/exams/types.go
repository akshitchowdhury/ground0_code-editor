package exams

import "time"

// Session mirrors an exam_sessions row (server/db.js's getExam shape).
type Session struct {
	ID          string
	UserID      string
	ExamType    string
	Status      string
	Source      string
	Questions   []Question
	Answers     map[string]int
	Score       *int
	Total       *int
	Feedback    *Feedback
	CreatedAt   time.Time
	CompletedAt *time.Time
}

// ExamHistoryEntry is the shape returned by GET /api/exams (listExams).
type ExamHistoryEntry struct {
	ID        string    `json:"id"`
	ExamType  string    `json:"examType"`
	Source    string    `json:"source"`
	Score     *int      `json:"score"`
	Total     *int      `json:"total"`
	CreatedAt time.Time `json:"createdAt"`
}

// GradedQuestion is one entry in the submit response's `results[]`.
type GradedQuestion struct {
	ID           string   `json:"id"`
	Domain       string   `json:"domain"`
	Scenario     string   `json:"scenario"`
	Question     string   `json:"question"`
	Options      []string `json:"options"`
	CorrectIndex int      `json:"correctIndex"`
	Explanation  string   `json:"explanation"`
	UserIndex    *int     `json:"userIndex"`
	Correct      bool     `json:"correct"`
}

type DomainBreakdown struct {
	Domain  string `json:"domain"`
	Total   int    `json:"total"`
	Correct int    `json:"correct"`
}

type AreaToImprove struct {
	Topic  string `json:"topic"`
	Why    string `json:"why"`
	Action string `json:"action"`
}

type Feedback struct {
	Summary        string          `json:"summary"`
	Strengths      []string        `json:"strengths"`
	AreasToImprove []AreaToImprove `json:"areasToImprove"`
	NextSteps      []string        `json:"nextSteps"`
	Verdict        string          `json:"verdict"`
}
