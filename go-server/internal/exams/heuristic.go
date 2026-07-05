package exams

import "fmt"

// HeuristicFeedback mirrors server/ai.js's heuristicFeedback — canned but
// data-driven feedback built from the domain breakdown, used when no AI
// provider is configured or every provider fails.
func HeuristicFeedback(exam Exam, score, total int, breakdown []DomainBreakdown) *Feedback {
	pct := 0
	if total > 0 {
		pct = int(float64(score) / float64(total) * 100)
	}

	var weak, strong []DomainBreakdown
	for _, d := range breakdown {
		if d.Total == 0 {
			continue
		}
		ratio := float64(d.Correct) / float64(d.Total)
		if ratio < 0.6 {
			weak = append(weak, d)
		}
		if ratio >= 0.75 {
			strong = append(strong, d)
		}
	}

	var summary string
	switch {
	case pct >= 80:
		summary = fmt.Sprintf("Strong performance — %d/%d (%d%%). You're operating near a passing standard for this exam; now it's about consistency and closing the last gaps.", score, total, pct)
	case pct >= 55:
		summary = fmt.Sprintf("Solid foundation — %d/%d (%d%%). You understand the core concepts but a few domains need focused review before you'd pass comfortably.", score, total, pct)
	default:
		summary = fmt.Sprintf("Early days — %d/%d (%d%%). Don't be discouraged: the gaps are clearly identifiable below, and targeted study will move this score quickly.", score, total, pct)
	}

	strengths := make([]string, 0, len(strong))
	for _, d := range strong {
		strengths = append(strengths, fmt.Sprintf("Good command of %s (%d/%d correct).", d.Domain, d.Correct, d.Total))
	}
	if len(strengths) == 0 {
		strengths = []string{"You completed the full exam — reviewing every explanation below is itself a powerful study technique."}
	}

	weakSource := weak
	if len(weakSource) == 0 {
		for _, d := range breakdown {
			if d.Correct < d.Total {
				weakSource = append(weakSource, d)
			}
		}
	}
	if len(weakSource) > 4 {
		weakSource = weakSource[:4]
	}
	areas := make([]AreaToImprove, 0, len(weakSource))
	for _, d := range weakSource {
		action := exam.Advice[d.Domain]
		if action == "" {
			action = "Review the related Ground0: Cloud lessons and retake a focused mock exam."
		}
		areas = append(areas, AreaToImprove{
			Topic:  d.Domain,
			Why:    fmt.Sprintf("You scored %d/%d in this domain.", d.Correct, d.Total),
			Action: action,
		})
	}

	lastStep := "Work through the matching Ground0: Cloud learning modules before your next attempt."
	if pct >= 80 {
		lastStep = "Schedule the real exam / interviews — you are close."
	}

	verdict := "Keep building — foundations first."
	if pct >= 80 {
		verdict = "Ready or nearly ready — keep sharp."
	} else if pct >= 55 {
		verdict = "On track — drill the weak domains."
	}

	return &Feedback{
		Summary:        summary,
		Strengths:      strengths,
		AreasToImprove: areas,
		NextSteps: []string{
			"Re-read the explanation for every question you missed — the reasoning matters more than the answer.",
			"Study the weak domains above, then retake a mock exam and compare your domain breakdown.",
			lastStep,
		},
		Verdict: verdict,
	}
}
