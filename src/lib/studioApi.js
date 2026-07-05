// Client for the Go backend's design-studio endpoints (/api/studio/*).
// Mirrors src/lib/api.js's conventions but unwraps the studio {data,error}
// envelope. Unlike api.js, these calls are NOT fail-soft — analyze/simulate/
// loadtest/cost results are the actual content of the review/load/cost
// panels, so callers decide how to handle a failure (keep last-good state
// with a warning, per the offline-first philosophy used elsewhere).
async function studioRequest(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.error) {
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return body.data
}

// ---------- Architecture Studio ----------

export function analyzeCloud(nodes, edges) {
  return studioRequest('/api/studio/cloud/analyze', { method: 'POST', body: JSON.stringify({ nodes, edges }) })
}

export function simulateCloud(nodes, edges, targetId) {
  return studioRequest('/api/studio/cloud/simulate', { method: 'POST', body: JSON.stringify({ nodes, edges, targetId }) })
}

export function loadTestCloud(nodes, edges, rps) {
  return studioRequest('/api/studio/cloud/loadtest', { method: 'POST', body: JSON.stringify({ nodes, edges, rps }) })
}

export function loadFlowCloud(nodes, edges, rps) {
  return studioRequest('/api/studio/cloud/loadflow', { method: 'POST', body: JSON.stringify({ nodes, edges, rps }) })
}

export function costCloud(nodes, rps, instanceCounts) {
  return studioRequest('/api/studio/cloud/cost', { method: 'POST', body: JSON.stringify({ nodes, rps, instanceCounts }) })
}

let cloudSpecsPromise = null
export function fetchCloudSpecs() {
  if (!cloudSpecsPromise) cloudSpecsPromise = studioRequest('/api/studio/cloud/specs')
  return cloudSpecsPromise
}

// AI: turn a plain-English prompt into a starter design (AI, or a
// keyword-matched template fallback — always returns a usable design).
export function generateCloud(prompt) {
  return studioRequest('/api/studio/cloud/generate', { method: 'POST', body: JSON.stringify({ prompt }) })
}

// ---------- Shared: AI fix suggestion for a review finding ----------

export function fixFinding({ studio, title, detail, category, level }) {
  return studioRequest('/api/studio/fix', {
    method: 'POST',
    body: JSON.stringify({ studio, title, detail, category, level }),
  })
}

// ---------- Agentic Studio ----------

export function analyzeAgent(nodes, edges, blueprintId) {
  return studioRequest('/api/studio/agent/analyze', { method: 'POST', body: JSON.stringify({ nodes, edges, blueprintId }) })
}

export function simulateAgent(nodes, edges, mode) {
  return studioRequest('/api/studio/agent/simulate', { method: 'POST', body: JSON.stringify({ nodes, edges, mode }) })
}

export function profileAgent(nodes) {
  return studioRequest('/api/studio/agent/profile', { method: 'POST', body: JSON.stringify({ nodes }) })
}

let agentSpecsPromise = null
export function fetchAgentSpecs() {
  if (!agentSpecsPromise) agentSpecsPromise = studioRequest('/api/studio/agent/specs')
  return agentSpecsPromise
}
