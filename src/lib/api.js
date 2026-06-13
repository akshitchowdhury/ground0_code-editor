// Thin client for the Ground0: Cloud backend (Express, proxied at /api).
// Every helper fails soft — the learning UI must keep working when the
// backend isn't running; only the exam lab hard-requires it.
import { load, save } from './storage.js'

export function getUserId(user) {
  if (user?.email) return user.email
  let anon = load('anonId')
  if (!anon) {
    anon = `anon-${Math.random().toString(36).slice(2, 10)}`
    save('anonId', anon)
  }
  return anon
}

async function request(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export async function fetchHealth() {
  try {
    return await request('/api/health')
  } catch {
    return null
  }
}

export async function fetchCloudProgress(userId) {
  try {
    const { progress } = await request(`/api/progress?userId=${encodeURIComponent(userId)}`)
    return progress
  } catch {
    return null
  }
}

export function syncCloudProgress(userId, moduleId, completed) {
  // Fire-and-forget; localStorage remains the source of truth offline.
  request('/api/progress', {
    method: 'PUT',
    body: JSON.stringify({ userId, moduleId, completed }),
  }).catch(() => {})
}

export function startExam(userId, examType, count) {
  return request('/api/exams', {
    method: 'POST',
    body: JSON.stringify({ userId, examType, count }),
  })
}

export function submitExam(sessionId, answers) {
  return request(`/api/exams/${sessionId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  })
}

export async function fetchExamHistory(userId) {
  try {
    const { exams } = await request(`/api/exams?userId=${encodeURIComponent(userId)}`)
    return exams
  } catch {
    return null
  }
}
