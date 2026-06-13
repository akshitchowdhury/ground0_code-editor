// Python execution via Pyodide (CPython on WebAssembly). The ~10 MB
// runtime is lazy-loaded from CDN on the first run and cached for the
// rest of the session.
const PYODIDE_VERSION = 'v0.26.4'
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`

let pyodidePromise = null

function injectScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = src
    el.onload = resolve
    el.onerror = () => reject(new Error('Failed to load the Python runtime. Check your internet connection.'))
    document.head.appendChild(el)
  })
}

export function isPythonReady() {
  return pyodidePromise !== null
}

async function getPyodide(onStatus) {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      onStatus?.('Downloading Python runtime (one-time, ~10 MB)…')
      if (!window.loadPyodide) {
        await injectScript(PYODIDE_BASE + 'pyodide.js')
      }
      onStatus?.('Starting Python interpreter…')
      return window.loadPyodide({ indexURL: PYODIDE_BASE })
    })()
    pyodidePromise.catch(() => {
      pyodidePromise = null // allow retry after a failed load
    })
  }
  return pyodidePromise
}

export async function runPython(code, { onOutput, onStatus }) {
  const pyodide = await getPyodide(onStatus)
  onStatus?.(null)

  pyodide.setStdout({ batched: (text) => onOutput({ level: 'log', text }) })
  pyodide.setStderr({ batched: (text) => onOutput({ level: 'error', text }) })

  try {
    // Each run gets a fresh global namespace so state doesn't leak.
    const namespace = pyodide.globals.get('dict')()
    const result = await pyodide.runPythonAsync(code, { globals: namespace })
    if (result !== undefined && result !== null) {
      onOutput({ level: 'log', text: String(result) })
    }
    namespace.destroy()
  } catch (err) {
    // Trim pyodide's internal frames from the traceback for readability.
    const message = String(err.message || err)
    const lines = message.split('\n')
    const start = lines.findIndex((l) => l.includes('File "<exec>"'))
    onOutput({
      level: 'error',
      text: start > 0 ? ['Traceback (most recent call last):', ...lines.slice(start)].join('\n') : message,
    })
  }
}
