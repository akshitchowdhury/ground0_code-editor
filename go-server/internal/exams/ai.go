package exams

import (
	"context"
	"fmt"
	"strings"

	"ground0.dev/goserver/internal/llm"
)

// AI generates exam questions + feedback through the shared LLM client
// (Gemini → Groq → Anthropic). Every method returns nil on failure so the
// exam flow falls back to the offline bank / heuristic feedback — a missing
// or exhausted key never breaks exams.
type AI struct{ llm *llm.Client }

func NewAI(client *llm.Client) *AI { return &AI{llm: client} }

func (a *AI) Enabled() bool { return a != nil && a.llm.Enabled() }

// Client exposes the shared LLM client for exam features beyond
// question/feedback generation (e.g. the study plan).
func (a *AI) Client() *llm.Client {
	if a == nil {
		return nil
	}
	return a.llm
}

// ---------- question generation ----------

type rawQuestion struct {
	Domain       string   `json:"domain"`
	Scenario     string   `json:"scenario"`
	Question     string   `json:"question"`
	Options      []string `json:"options"`
	CorrectIndex int      `json:"correctIndex"`
	Explanation  string   `json:"explanation"`
}

type generatedQuestions struct {
	Questions []rawQuestion `json:"questions"`
}

const questionGenSystem = "You are an expert exam author for cloud and DevOps certifications and technical interviews. " +
	"You write realistic, current, unambiguous multiple-choice questions with plausible distractors. " +
	"Vary difficulty from foundational to challenging. Never reuse the same correct option index pattern; " +
	"distribute correct answers across positions 0-3."

func questionGenPrompt(exam Exam, count int) string {
	return fmt.Sprintf(
		"Write %d multiple-choice questions for: %s.\n"+
			"Question style: %s.\n"+
			"Spread questions across these domains (cover as many as possible, label each question with exactly one): %s.\n"+
			"Each question has exactly 4 options. Use the scenario field for scenario-based questions (empty string otherwise).\n\n"+
			`Respond with ONLY a JSON object of the shape {"questions":[{"domain":string,"scenario":string,"question":string,"options":[string,string,string,string],"correctIndex":number,"explanation":string}]} — no markdown, no commentary.`,
		count, exam.Name, exam.Style, strings.Join(exam.Domains, "; "))
}

// normalizeQuestions validates and truncates raw model output, dropping
// anything malformed rather than failing the exam.
func normalizeQuestions(exam Exam, raw []rawQuestion, count int) []Question {
	out := make([]Question, 0, count)
	for _, q := range raw {
		if q.Question == "" || len(q.Options) != 4 || q.CorrectIndex < 0 || q.CorrectIndex > 3 {
			continue
		}
		domain := exam.Domains[0]
		for _, d := range exam.Domains {
			if d == q.Domain {
				domain = q.Domain
				break
			}
		}
		out = append(out, Question{
			ID:           fmt.Sprintf("q%d", len(out)+1),
			Domain:       domain,
			Scenario:     q.Scenario,
			Question:     q.Question,
			Options:      q.Options,
			CorrectIndex: q.CorrectIndex,
			Explanation:  q.Explanation,
		})
		if len(out) >= count {
			break
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func (a *AI) GenerateQuestions(ctx context.Context, exam Exam, count int) []Question {
	if !a.Enabled() {
		return nil
	}
	var data generatedQuestions
	if !a.llm.GenerateInto(ctx, questionGenSystem, questionGenPrompt(exam, count), &data) {
		return nil
	}
	return normalizeQuestions(exam, data.Questions, count)
}

// ---------- feedback generation ----------

const feedbackSystem = "You are a supportive but honest exam coach for cloud certifications and DevOps interviews. " +
	"You give specific, actionable feedback grounded in the actual mistakes made — never generic filler."

func feedbackPrompt(exam Exam, graded []GradedQuestion, score, total int, breakdown []DomainBreakdown) string {
	var wrong []GradedQuestion
	for _, g := range graded {
		if !g.Correct {
			wrong = append(wrong, g)
		}
	}

	var breakdownLines strings.Builder
	for _, d := range breakdown {
		fmt.Fprintf(&breakdownLines, "- %s: %d/%d\n", d.Domain, d.Correct, d.Total)
	}

	var wrongSection string
	if len(wrong) > 0 {
		var b strings.Builder
		b.WriteString("Questions they got WRONG:\n")
		for _, g := range wrong {
			userAnswer := "(skipped)"
			if g.UserIndex != nil && *g.UserIndex >= 0 && *g.UserIndex < len(g.Options) {
				userAnswer = g.Options[*g.UserIndex]
			}
			fmt.Fprintf(&b, "- [%s] %s\n  Their answer: %s\n  Correct: %s\n",
				g.Domain, g.Question, userAnswer, g.Options[g.CorrectIndex])
		}
		wrongSection = b.String() + "\n"
	} else {
		wrongSection = "They answered every question correctly.\n\n"
	}

	return fmt.Sprintf(
		"A learner just completed a %d-question mock exam: %s. Score: %d/%d.\n\n"+
			"Per-domain results:\n%s\n"+
			"%s"+
			"Give them feedback: overall summary, their strengths, the key areas to improve (with why and a concrete action each), and next steps.\n\n"+
			`Respond with ONLY a JSON object of the shape {"summary":string,"strengths":[string],"areasToImprove":[{"topic":string,"why":string,"action":string}],"nextSteps":[string],"verdict":string} — no markdown, no commentary.`,
		total, exam.Name, score, total, breakdownLines.String(), wrongSection)
}

func (a *AI) GenerateFeedback(ctx context.Context, exam Exam, graded []GradedQuestion, score, total int, breakdown []DomainBreakdown) *Feedback {
	if !a.Enabled() {
		return nil
	}
	var fb Feedback
	if !a.llm.GenerateInto(ctx, feedbackSystem, feedbackPrompt(exam, graded, score, total, breakdown), &fb) {
		return nil
	}
	return &fb
}
