// Thin client for the Ground0: Cloud backend (Go, proxied at /api).
// Every read helper fails soft — the learning UI must keep working when the
// backend isn't running; only the exam lab hard-requires it.
//
// Identity comes from the session cookie as of Phase 3 (custom Go auth):
// the backend derives the user from the cookie, so no userId is ever sent.
// Guests have no session — progress calls 401 (and fail soft here, since
// localStorage is their source of truth) and exams run without history.

async function request(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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

export async function fetchCloudProgress() {
  try {
    const { progress } = await request('/api/progress')
    return progress
  } catch {
    return null
  }
}

export function syncCloudProgress(moduleId, completed) {
  // Fire-and-forget; localStorage remains the source of truth offline.
  request('/api/progress', {
    method: 'PUT',
    body: JSON.stringify({ moduleId, completed }),
  }).catch(() => {})
}

export function startExam(examType, count) {
  return request('/api/exams', {
    method: 'POST',
    body: JSON.stringify({ examType, count }),
  })
}

export function submitExam(sessionId, answers) {
  return request(`/api/exams/${sessionId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  })
}

export async function fetchExamHistory() {
  try {
    const { exams } = await request('/api/exams')
    return exams
  } catch {
    return null
  }
}

// Adaptive study plan built from the signed-in user's per-domain results
// across attempts (AI, or a heuristic fallback). Empty for guests.
export async function fetchStudyPlan() {
  try {
    return await request('/api/exams/studyplan')
  } catch {
    return null
  }
}

// ---------- auth ----------

export async function fetchMe() {
  const { user } = await request('/api/auth/me')
  return user
}

export async function fetchAuthProviders() {
  try {
    return await request('/api/auth/providers')
  } catch {
    return { available: false, google: false, github: false }
  }
}

export async function apiRegister(email, password, name) {
  const { user } = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })
  return user
}

export async function apiLogin(email, password) {
  const { user } = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return user
}

export function apiLogout() {
  return request('/api/auth/logout', { method: 'POST' }).catch(() => {})
}

export function apiForgotPassword(email) {
  return request('/api/auth/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function apiResetPassword(token, newPassword) {
  return request('/api/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })
}
