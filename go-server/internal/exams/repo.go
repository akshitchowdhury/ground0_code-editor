package exams

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CreateExamInput struct {
	ID        string
	UserID    string
	ExamType  string
	Source    string
	Questions []Question
	Total     int
}

type Store interface {
	Kind() string
	CreateExam(ctx context.Context, in CreateExamInput) error
	// GetExam returns (nil, nil) if no session with that id exists.
	GetExam(ctx context.Context, id string) (*Session, error)
	CompleteExam(ctx context.Context, id string, answers map[string]int, score int, feedback *Feedback) error
	ListExams(ctx context.Context, userID string, limit int) ([]ExamHistoryEntry, error)
	// CompletedSessions returns a user's completed exams WITH questions +
	// answers, so the study-plan builder can re-grade them per domain.
	CompletedSessions(ctx context.Context, userID string, limit int) ([]Session, error)
}

// ---------- Postgres ----------

type pgStore struct{ pool *pgxpool.Pool }

func NewPgStore(pool *pgxpool.Pool) Store { return &pgStore{pool: pool} }

func (s *pgStore) Kind() string { return "postgres" }

func (s *pgStore) CreateExam(ctx context.Context, in CreateExamInput) error {
	questionsRaw, err := json.Marshal(in.Questions)
	if err != nil {
		return err
	}
	// user_id is a nullable UUID since migration 0004 — guests (no session)
	// store NULL and simply have no server-side history.
	var userID any
	if in.UserID != "" {
		userID = in.UserID
	}
	_, err = s.pool.Exec(ctx, `
		INSERT INTO exam_sessions (id, user_id, exam_type, status, source, questions, total)
		VALUES ($1, $2, $3, 'active', $4, $5, $6)
	`, in.ID, userID, in.ExamType, in.Source, questionsRaw, in.Total)
	return err
}

func (s *pgStore) GetExam(ctx context.Context, id string) (*Session, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, COALESCE(user_id::text, ''), exam_type, status, source, questions, answers, score, total, feedback, created_at, completed_at
		FROM exam_sessions WHERE id = $1
	`, id)

	var (
		sess                                  Session
		questionsRaw, answersRaw, feedbackRaw []byte
	)
	err := row.Scan(&sess.ID, &sess.UserID, &sess.ExamType, &sess.Status, &sess.Source,
		&questionsRaw, &answersRaw, &sess.Score, &sess.Total, &feedbackRaw, &sess.CreatedAt, &sess.CompletedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	if err := json.Unmarshal(questionsRaw, &sess.Questions); err != nil {
		return nil, err
	}
	if len(answersRaw) > 0 {
		_ = json.Unmarshal(answersRaw, &sess.Answers)
	}
	if len(feedbackRaw) > 0 {
		var fb Feedback
		if err := json.Unmarshal(feedbackRaw, &fb); err == nil {
			sess.Feedback = &fb
		}
	}
	return &sess, nil
}

func (s *pgStore) CompleteExam(ctx context.Context, id string, answers map[string]int, score int, feedback *Feedback) error {
	answersRaw, err := json.Marshal(answers)
	if err != nil {
		return err
	}
	feedbackRaw, err := json.Marshal(feedback)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
		UPDATE exam_sessions
		SET status = 'completed', answers = $2, score = $3, feedback = $4, completed_at = now()
		WHERE id = $1
	`, id, answersRaw, score, feedbackRaw)
	return err
}

func (s *pgStore) ListExams(ctx context.Context, userID string, limit int) ([]ExamHistoryEntry, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, exam_type, source, score, total, created_at
		FROM exam_sessions WHERE user_id = $1 AND status = 'completed'
		ORDER BY created_at DESC LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ExamHistoryEntry
	for rows.Next() {
		var e ExamHistoryEntry
		if err := rows.Scan(&e.ID, &e.ExamType, &e.Source, &e.Score, &e.Total, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *pgStore) CompletedSessions(ctx context.Context, userID string, limit int) ([]Session, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, exam_type, source, questions, answers, score, total, created_at
		FROM exam_sessions WHERE user_id = $1 AND status = 'completed'
		ORDER BY created_at DESC LIMIT $2
	`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Session
	for rows.Next() {
		var sess Session
		var questionsRaw, answersRaw []byte
		if err := rows.Scan(&sess.ID, &sess.ExamType, &sess.Source, &questionsRaw, &answersRaw, &sess.Score, &sess.Total, &sess.CreatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(questionsRaw, &sess.Questions); err != nil {
			continue
		}
		if len(answersRaw) > 0 {
			_ = json.Unmarshal(answersRaw, &sess.Answers)
		}
		sess.Status = "completed"
		out = append(out, sess)
	}
	return out, rows.Err()
}

// ---------- In-memory fallback ----------

type memoryStore struct {
	mu    sync.Mutex
	exams map[string]*Session
}

func NewMemoryStore() Store { return &memoryStore{exams: map[string]*Session{}} }

func (s *memoryStore) Kind() string { return "memory" }

func (s *memoryStore) CreateExam(_ context.Context, in CreateExamInput) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	total := in.Total
	s.exams[in.ID] = &Session{
		ID: in.ID, UserID: in.UserID, ExamType: in.ExamType, Status: "active", Source: in.Source,
		Questions: in.Questions, Total: &total, CreatedAt: time.Now(),
	}
	return nil
}

func (s *memoryStore) GetExam(_ context.Context, id string) (*Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, ok := s.exams[id]
	if !ok {
		return nil, nil
	}
	cp := *sess
	return &cp, nil
}

func (s *memoryStore) CompleteExam(_ context.Context, id string, answers map[string]int, score int, feedback *Feedback) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	sess, ok := s.exams[id]
	if !ok {
		return nil
	}
	sess.Status = "completed"
	sess.Answers = answers
	sc := score
	sess.Score = &sc
	sess.Feedback = feedback
	now := time.Now()
	sess.CompletedAt = &now
	return nil
}

func (s *memoryStore) ListExams(_ context.Context, userID string, limit int) ([]ExamHistoryEntry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var matches []*Session
	for _, sess := range s.exams {
		if sess.UserID == userID && sess.Status == "completed" {
			matches = append(matches, sess)
		}
	}
	sort.Slice(matches, func(i, j int) bool { return matches[i].CreatedAt.After(matches[j].CreatedAt) })
	if len(matches) > limit {
		matches = matches[:limit]
	}
	out := make([]ExamHistoryEntry, len(matches))
	for i, sess := range matches {
		out[i] = ExamHistoryEntry{ID: sess.ID, ExamType: sess.ExamType, Source: sess.Source, Score: sess.Score, Total: sess.Total, CreatedAt: sess.CreatedAt}
	}
	return out, nil
}

func (s *memoryStore) CompletedSessions(_ context.Context, userID string, limit int) ([]Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var matches []*Session
	for _, sess := range s.exams {
		if sess.UserID == userID && sess.Status == "completed" {
			matches = append(matches, sess)
		}
	}
	sort.Slice(matches, func(i, j int) bool { return matches[i].CreatedAt.After(matches[j].CreatedAt) })
	if len(matches) > limit {
		matches = matches[:limit]
	}
	out := make([]Session, len(matches))
	for i, sess := range matches {
		out[i] = *sess
	}
	return out, nil
}
