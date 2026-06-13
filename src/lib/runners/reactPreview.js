// Builds a self-contained iframe document that renders user-written
// React/JSX. JSX is transpiled in the parent with Babel Standalone
// (lazy-loaded — it is ~2 MB), then injected alongside React UMD builds.
// Console + errors stream back to the parent via postMessage.

// Tutorial-style code uses ES module syntax that can't run in a plain
// <script>. We strip imports (React & hooks are provided as globals) and
// rewrite `export default` so we can auto-render the component.
function preprocess(source) {
  let code = source
    .replace(/^\s*import\s+[^;]+?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, '')

  code = code.replace(/export\s+default\s+/, 'const __default__ = ')
  code = code.replace(/^\s*export\s+/gm, '')
  return code
}

export async function buildReactSrcDoc(source) {
  const { transform } = await import('@babel/standalone')
  let compiled
  try {
    compiled = transform(preprocess(source), {
      presets: [['react', { runtime: 'classic' }]],
      filename: 'app.jsx',
    }).code
  } catch (err) {
    return {
      error: err.message,
      srcdoc: null,
    }
  }

  const userRendersManually = /createRoot|ReactDOM\.render/.test(source)

  const srcdoc = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <style>
    body { font-family: Inter, system-ui, sans-serif; margin: 16px; color: #18181b; background: #ffffff; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    function g0Send(level, text) {
      parent.postMessage({ source: 'g0-react-preview', type: 'console', level, text }, '*');
    }
    function g0Format(v) {
      if (v === null) return 'null';
      if (v === undefined) return 'undefined';
      if (typeof v === 'object') { try { return JSON.stringify(v); } catch { return String(v); } }
      return String(v);
    }
    ['log', 'info', 'warn', 'error'].forEach(level => {
      const orig = console[level].bind(console);
      console[level] = (...args) => { orig(...args); g0Send(level, args.map(g0Format).join(' ')); };
    });
    window.onerror = (msg) => { g0Send('error', String(msg)); return false; };
  <\/script>
  <script>
    const { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer, Fragment, createContext } = React;
    try {
${compiled}
      ${userRendersManually
        ? ''
        : `
      const __Component__ =
        (typeof __default__ !== 'undefined' && __default__) ||
        (typeof App !== 'undefined' && App);
      if (__Component__) {
        ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(__Component__));
      } else {
        g0Send('warn', 'No component found. Define an App component or use "export default".');
      }`}
      parent.postMessage({ source: 'g0-react-preview', type: 'rendered' }, '*');
    } catch (err) {
      g0Send('error', err && err.message ? err.message : String(err));
    }
  <\/script>
</body>
</html>`

  return { error: null, srcdoc }
}
