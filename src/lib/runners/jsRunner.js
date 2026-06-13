// Runs user JavaScript inside a sandboxed, hidden iframe and streams
// console output back via postMessage. Each run gets a fresh iframe so
// state never leaks between runs. Top-level await is supported by
// wrapping the program in an async IIFE.

let currentIframe = null
let currentListener = null

function cleanup() {
  if (currentListener) {
    window.removeEventListener('message', currentListener)
    currentListener = null
  }
  if (currentIframe) {
    currentIframe.remove()
    currentIframe = null
  }
}

const HARNESS = `
<script>
  const RUN_ID = '__RUN_ID__';
  function serialize(value, depth) {
    depth = depth || 0;
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    const t = typeof value;
    if (t === 'string') return depth === 0 ? value : JSON.stringify(value);
    if (t === 'number' || t === 'boolean' || t === 'bigint') return String(value);
    if (t === 'function') return '[Function: ' + (value.name || 'anonymous') + ']';
    if (t === 'symbol') return value.toString();
    if (value instanceof Error) return value.stack || (value.name + ': ' + value.message);
    if (value instanceof Date) return value.toISOString();
    if (depth > 2) return Array.isArray(value) ? '[Array]' : '[Object]';
    if (Array.isArray(value)) {
      return '[' + value.map(v => serialize(v, depth + 1)).join(', ') + ']';
    }
    if (value instanceof Map) {
      return 'Map(' + value.size + ') {' + [...value.entries()].map(([k, v]) => serialize(k, depth + 1) + ' => ' + serialize(v, depth + 1)).join(', ') + '}';
    }
    if (value instanceof Set) {
      return 'Set(' + value.size + ') {' + [...value].map(v => serialize(v, depth + 1)).join(', ') + '}';
    }
    try {
      const keys = Object.keys(value);
      return '{ ' + keys.map(k => k + ': ' + serialize(value[k], depth + 1)).join(', ') + ' }';
    } catch {
      return String(value);
    }
  }
  function send(level, args) {
    parent.postMessage({ source: 'g0-js-runner', runId: RUN_ID, type: 'console', level, text: args.map(a => serialize(a, 0)).join(' ') }, '*');
  }
  ['log', 'info', 'warn', 'error', 'debug'].forEach(level => {
    console[level] = (...args) => send(level === 'debug' ? 'log' : level, args);
  });
  window.onerror = (msg, src, line, col) => {
    parent.postMessage({ source: 'g0-js-runner', runId: RUN_ID, type: 'console', level: 'error', text: msg + (line ? ' (line ' + (line - window.__codeStartLine + 1) + ')' : '') }, '*');
    return true;
  };
  window.onunhandledrejection = (e) => {
    send('error', ['Uncaught (in promise)', e.reason]);
  };
<\/script>
`

export function runJavaScript(code, { onOutput, onDone }) {
  cleanup()

  const runId = String(Date.now()) + Math.random().toString(36).slice(2)
  const iframe = document.createElement('iframe')
  iframe.setAttribute('sandbox', 'allow-scripts')
  iframe.style.display = 'none'
  currentIframe = iframe

  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    onDone?.()
  }

  currentListener = (event) => {
    const data = event.data
    if (!data || data.source !== 'g0-js-runner' || data.runId !== runId) return
    if (data.type === 'console') onOutput(data)
    if (data.type === 'done') finish()
  }
  window.addEventListener('message', currentListener)

  const userProgram = `
<script>
  window.__codeStartLine = 0;
  (async () => {
    try {
${code}
    } catch (err) {
      parent.postMessage({ source: 'g0-js-runner', runId: '${runId}', type: 'console', level: 'error', text: err instanceof Error ? (err.name + ': ' + err.message) : String(err) }, '*');
    } finally {
      parent.postMessage({ source: 'g0-js-runner', runId: '${runId}', type: 'done' }, '*');
    }
  })();
<\/script>`

  iframe.srcdoc = `<!doctype html><html><head>${HARNESS.replaceAll('__RUN_ID__', runId)}</head><body>${userProgram}</body></html>`
  document.body.appendChild(iframe)

  // Safety net: if the program never signals completion (e.g. infinite
  // pending promise), report done after a generous timeout.
  setTimeout(finish, 15000)

  return () => {
    cleanup()
    finish()
  }
}
