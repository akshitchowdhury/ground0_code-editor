// AI layer for mock exams. Generates exam questions and personalized
// post-exam feedback with the Anthropic SDK using structured JSON outputs.
// When ANTHROPIC_API_KEY is missing (or a call fails), callers fall back to
// the offline question bank / heuristic feedback so the app keeps working.
import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-opus-4-8'

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null

export const aiEnabled = Boolean(client)

const QUESTIONS_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          domain: { type: 'string', description: 'Exactly one of the provided exam domains' },
          scenario: {
            type: 'string',
            description: 'Short real-world scenario setting up the question. Empty string if not needed.',
          },
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' }, description: 'Exactly 4 answer options' },
          correctIndex: { type: 'integer', description: '0-based index of the correct option (0-3)' },
          explanation: {
            type: 'string',
            description: 'Why the correct answer is right and the distractors are wrong, 1-3 sentences',
          },
        },
        required: ['domain', 'scenario', 'question', 'options', 'correctIndex', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
}

const FEEDBACK_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Encouraging 2-3 sentence overall assessment of the performance' },
    strengths: { type: 'array', items: { type: 'string' }, description: '2-4 specific strengths shown' },
    areasToImprove: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: 'The weak area / domain' },
          why: { type: 'string', description: 'What the mistakes reveal' },
          action: { type: 'string', description: 'Concrete study action to fix it' },
        },
        required: ['topic', 'why', 'action'],
        additionalProperties: false,
      },
      description: '1-4 key areas to improve, most important first',
    },
    nextSteps: { type: 'array', items: { type: 'string' }, description: '2-3 concrete next steps' },
    verdict: {
      type: 'string',
      description: 'One short line on readiness, e.g. "On track — keep drilling weak domains"',
    },
  },
  required: ['summary', 'strengths', 'areasToImprove', 'nextSteps', 'verdict'],
  additionalProperties: false,
}

function extractJson(response) {
  const block = response.content.find((b) => b.type === 'text')
  return block ? JSON.parse(block.text) : null
}

export async function generateQuestions(exam, count) {
  if (!client) return null
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system:
        'You are an expert exam author for cloud and DevOps certifications and technical interviews. ' +
        'You write realistic, current, unambiguous multiple-choice questions with plausible distractors. ' +
        'Vary difficulty from foundational to challenging. Never reuse the same correct option index pattern; ' +
        'distribute correct answers across positions 0-3.',
      messages: [
        {
          role: 'user',
          content:
            `Write ${count} multiple-choice questions for: ${exam.name}.\n` +
            `Question style: ${exam.style}.\n` +
            `Spread questions across these domains (cover as many as possible, label each question with exactly one): ${exam.domains.join('; ')}.\n` +
            `Each question has exactly 4 options. Use the scenario field for scenario-based questions (empty string otherwise).`,
        },
      ],
      output_config: { format: { type: 'json_schema', schema: QUESTIONS_SCHEMA } },
    })
    const data = extractJson(response)
    if (!data?.questions?.length) return null
    // Validate and normalize — drop anything malformed rather than failing the exam.
    const questions = data.questions
      .filter(
        (q) =>
          q.question &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          Number.isInteger(q.correctIndex) &&
          q.correctIndex >= 0 &&
          q.correctIndex <= 3,
      )
      .slice(0, count)
      .map((q, i) => ({
        id: `q${i + 1}`,
        domain: exam.domains.includes(q.domain) ? q.domain : exam.domains[0],
        scenario: q.scenario || '',
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation || '',
      }))
    return questions.length ? questions : null
  } catch (err) {
    console.warn(`[ai] question generation failed: ${err.message}`)
    return null
  }
}

export async function generateFeedback(exam, graded, score, total, domainBreakdown) {
  if (!client) return null
  try {
    const wrong = graded.filter((g) => !g.correct)
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      system:
        'You are a supportive but honest exam coach for cloud certifications and DevOps interviews. ' +
        'You give specific, actionable feedback grounded in the actual mistakes made — never generic filler.',
      messages: [
        {
          role: 'user',
          content:
            `A learner just completed a ${total}-question mock exam: ${exam.name}. Score: ${score}/${total}.\n\n` +
            `Per-domain results:\n${domainBreakdown
              .map((d) => `- ${d.domain}: ${d.correct}/${d.total}`)
              .join('\n')}\n\n` +
            (wrong.length
              ? `Questions they got WRONG:\n${wrong
                  .map(
                    (g) =>
                      `- [${g.domain}] ${g.question}\n  Their answer: ${g.options[g.userIndex] ?? '(skipped)'}\n  Correct: ${g.options[g.correctIndex]}`,
                  )
                  .join('\n')}\n\n`
              : 'They answered every question correctly.\n\n') +
            'Give them feedback: overall summary, their strengths, the key areas to improve (with why and a concrete action each), and next steps.',
        },
      ],
      output_config: { format: { type: 'json_schema', schema: FEEDBACK_SCHEMA } },
    })
    return extractJson(response)
  } catch (err) {
    console.warn(`[ai] feedback generation failed: ${err.message}`)
    return null
  }
}

// Heuristic feedback when AI is unavailable — built from the domain breakdown
// plus the exam's canned study advice.
export function heuristicFeedback(exam, score, total, domainBreakdown) {
  const pct = total ? Math.round((score / total) * 100) : 0
  const weak = domainBreakdown.filter((d) => d.total > 0 && d.correct / d.total < 0.6)
  const strong = domainBreakdown.filter((d) => d.total > 0 && d.correct / d.total >= 0.75)

  const summary =
    pct >= 80
      ? `Strong performance — ${score}/${total} (${pct}%). You're operating near a passing standard for this exam; now it's about consistency and closing the last gaps.`
      : pct >= 55
        ? `Solid foundation — ${score}/${total} (${pct}%). You understand the core concepts but a few domains need focused review before you'd pass comfortably.`
        : `Early days — ${score}/${total} (${pct}%). Don't be discouraged: the gaps are clearly identifiable below, and targeted study will move this score quickly.`

  return {
    summary,
    strengths: strong.length
      ? strong.map((d) => `Good command of ${d.domain} (${d.correct}/${d.total} correct).`)
      : ['You completed the full exam — reviewing every explanation below is itself a powerful study technique.'],
    areasToImprove: (weak.length ? weak : domainBreakdown.filter((d) => d.correct < d.total))
      .slice(0, 4)
      .map((d) => ({
        topic: d.domain,
        why: `You scored ${d.correct}/${d.total} in this domain.`,
        action: exam.advice[d.domain] || 'Review the related Ground0: Cloud lessons and retake a focused mock exam.',
      })),
    nextSteps: [
      'Re-read the explanation for every question you missed — the reasoning matters more than the answer.',
      'Study the weak domains above, then retake a mock exam and compare your domain breakdown.',
      pct >= 80
        ? 'Schedule the real exam / interviews — you are close.'
        : 'Work through the matching Ground0: Cloud learning modules before your next attempt.',
    ],
    verdict:
      pct >= 80 ? 'Ready or nearly ready — keep sharp.' : pct >= 55 ? 'On track — drill the weak domains.' : 'Keep building — foundations first.',
  }
}
