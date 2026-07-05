package exams

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"ground0.dev/goserver/internal/llm"
)

// studyplan.go builds an adaptive study plan by aggregating a learner's
// per-domain performance across ALL their completed attempts, then crafting
// a focused plan (LLM, or a heuristic fallback from the same aggregates).

type DomainStat struct {
	ExamType string `json:"examType"`
	ExamName string `json:"examName"`
	Domain   string `json:"domain"`
	Correct  int    `json:"correct"`
	Total    int    `json:"total"`
	Attempts int    `json:"attempts"`
	Pct      int    `json:"pct"`
}

type StudyStep struct {
	Topic  string `json:"topic"`
	Why    string `json:"why"`
	Action string `json:"action"`
}

type StudyPlan struct {
	Empty     bool         `json:"empty"`
	Summary   string       `json:"summary"`
	Focus     []StudyStep  `json:"focus"`
	Strengths []string     `json:"strengths"`
	Attempts  int          `json:"attempts"`
	Source    string       `json:"source"` // "ai" | "heuristic"
	Stats     []DomainStat `json:"stats"`
}

// aggregateDomains re-grades every completed session per domain and rolls the
// results up by (examType, domain). Cross-attempt, so repeated drilling of a
// weak domain shows up as it improves.
func aggregateDomains(sessions []Session) []DomainStat {
	type key struct{ examType, domain string }
	acc := map[key]*DomainStat{}
	attemptsByType := map[string]int{}

	for _, sess := range sessions {
		attemptsByType[sess.ExamType]++
		for _, q := range sess.Questions {
			k := key{sess.ExamType, q.Domain}
			stat := acc[k]
			if stat == nil {
				name := sess.ExamType
				if exam, ok := ExamTypes[sess.ExamType]; ok {
					name = exam.Name
				}
				stat = &DomainStat{ExamType: sess.ExamType, ExamName: name, Domain: q.Domain}
				acc[k] = stat
			}
			stat.Total++
			if idx, ok := sess.Answers[q.ID]; ok && idx == q.CorrectIndex {
				stat.Correct++
			}
		}
	}

	out := make([]DomainStat, 0, len(acc))
	for k, stat := range acc {
		stat.Attempts = attemptsByType[k.examType]
		if stat.Total > 0 {
			stat.Pct = int(float64(stat.Correct) / float64(stat.Total) * 100)
		}
		out = append(out, *stat)
	}
	// Weakest first — that's the drill order.
	sort.Slice(out, func(i, j int) bool {
		if out[i].Pct != out[j].Pct {
			return out[i].Pct < out[j].Pct
		}
		return out[i].Total > out[j].Total
	})
	return out
}

// BuildStudyPlan aggregates then asks the LLM for a plan, falling back to a
// heuristic built from the same stats + each exam's canned advice.
func BuildStudyPlan(ctx context.Context, client *llm.Client, sessions []Session) StudyPlan {
	if len(sessions) == 0 {
		return StudyPlan{Empty: true, Summary: "Take a mock exam and your personalised study plan will appear here — it adapts to the domains you find hardest.", Stats: []DomainStat{}, Focus: []StudyStep{}, Strengths: []string{}}
	}
	stats := aggregateDomains(sessions)

	if client.Enabled() {
		if plan, ok := aiStudyPlan(ctx, client, sessions, stats); ok {
			return plan
		}
	}
	return heuristicStudyPlan(sessions, stats)
}

func aiStudyPlan(ctx context.Context, client *llm.Client, sessions []Session, stats []DomainStat) (StudyPlan, bool) {
	var b strings.Builder
	fmt.Fprintf(&b, "A learner has completed %d mock exam attempt(s). Their per-domain accuracy across ALL attempts:\n", len(sessions))
	for _, s := range stats {
		fmt.Fprintf(&b, "- [%s] %s: %d%% (%d/%d correct)\n", s.ExamName, s.Domain, s.Pct, s.Correct, s.Total)
	}
	b.WriteString("\nCreate a focused, adaptive study plan that prioritises their weakest domains. " +
		"Respond with ONLY a JSON object of the shape " +
		`{"summary":"2-3 encouraging sentences on where they stand","focus":[{"topic":"domain","why":"what the numbers show","action":"a concrete study action"}],"strengths":["a strong area",...]}` +
		" — 2-4 focus items (weakest first), no markdown.")

	const system = "You are an expert certification coach. You build specific, motivating, actionable study plans " +
		"grounded in the learner's real per-domain results — never generic filler."

	var plan StudyPlan
	if !client.GenerateInto(ctx, system, b.String(), &plan) || strings.TrimSpace(plan.Summary) == "" {
		return StudyPlan{}, false
	}
	plan.Empty = false
	plan.Attempts = len(sessions)
	plan.Source = "ai"
	plan.Stats = stats
	if plan.Focus == nil {
		plan.Focus = []StudyStep{}
	}
	if plan.Strengths == nil {
		plan.Strengths = []string{}
	}
	return plan, true
}

func heuristicStudyPlan(sessions []Session, stats []DomainStat) StudyPlan {
	plan := StudyPlan{Attempts: len(sessions), Source: "heuristic", Stats: stats, Focus: []StudyStep{}, Strengths: []string{}}

	// Overall accuracy for the summary line.
	totalCorrect, totalQ := 0, 0
	for _, s := range stats {
		totalCorrect += s.Correct
		totalQ += s.Total
	}
	pct := 0
	if totalQ > 0 {
		pct = int(float64(totalCorrect) / float64(totalQ) * 100)
	}
	switch {
	case pct >= 80:
		plan.Summary = fmt.Sprintf("Strong work — %d%% correct across %d attempt(s). You're near passing standard; tighten up the last soft spots below.", pct, len(sessions))
	case pct >= 55:
		plan.Summary = fmt.Sprintf("Solid foundation — %d%% across %d attempt(s). A few domains need focused review before you'd pass comfortably.", pct, len(sessions))
	default:
		plan.Summary = fmt.Sprintf("Early days — %d%% across %d attempt(s). The weak domains below are clear targets; drilling them will move your score fast.", pct, len(sessions))
	}

	// Weakest domains (under 70%) become focus items, using the exam's
	// canned advice for the concrete action.
	for _, s := range stats {
		if s.Pct >= 70 || s.Total == 0 {
			continue
		}
		action := "Review the related Ground0: Cloud lessons for this domain, then retake a focused mock exam."
		if exam, ok := ExamTypes[s.ExamType]; ok {
			if a := exam.Advice[s.Domain]; a != "" {
				action = a
			}
		}
		plan.Focus = append(plan.Focus, StudyStep{
			Topic:  s.Domain,
			Why:    fmt.Sprintf("Only %d%% correct so far (%d/%d) — your weakest area in %s.", s.Pct, s.Correct, s.Total, s.ExamName),
			Action: action,
		})
		if len(plan.Focus) >= 4 {
			break
		}
	}
	if len(plan.Focus) == 0 {
		plan.Focus = append(plan.Focus, StudyStep{
			Topic:  "Consistency",
			Why:    "No domain is dragging you down — you're scoring evenly.",
			Action: "Take a fresh full-length mock under timed conditions to lock in exam stamina.",
		})
	}

	// Strong domains (>= 80%) become strengths.
	for _, s := range stats {
		if s.Pct >= 80 && s.Total > 0 {
			plan.Strengths = append(plan.Strengths, fmt.Sprintf("%s — %d%% in %s", s.Domain, s.Pct, s.ExamName))
		}
	}
	return plan
}
