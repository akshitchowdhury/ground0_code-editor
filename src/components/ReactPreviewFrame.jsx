import { useEffect, useState } from 'react'
import { MonitorPlay, RefreshCw } from 'lucide-react'

// Renders the srcdoc produced by buildReactSrcDoc and reports console
// messages from inside the frame up to the parent page.
export default function ReactPreviewFrame({ srcdoc, buildError, onConsole, onRefresh }) {
  const [frameKey, setFrameKey] = useState(0)

  useEffect(() => {
    function handleMessage(event) {
      const data = event.data
      if (!data || data.source !== 'g0-react-preview') return
      if (data.type === 'console') onConsole?.(data)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onConsole])

  // Remount the iframe whenever new code arrives so state resets cleanly.
  useEffect(() => {
    setFrameKey((k) => k + 1)
  }, [srcdoc])

  return (
    <div className="flex h-full flex-col">
      <div className="panel-header justify-between">
        <span className="flex items-center gap-2">
          <MonitorPlay size={13} /> Preview
        </span>
        <button
          onClick={() => {
            setFrameKey((k) => k + 1)
            onRefresh?.()
          }}
          className="btn-ghost !p-1"
          title="Re-render preview"
        >
          <RefreshCw size={13} />
        </button>
      </div>
      <div className="min-h-0 flex-1 bg-white">
        {buildError ? (
          <div className="h-full overflow-auto bg-zinc-950 p-4 font-mono text-[13px] whitespace-pre-wrap text-red-400">
            <p className="mb-2 font-sans text-xs font-semibold tracking-wider text-red-500 uppercase">Syntax error</p>
            {buildError}
          </div>
        ) : srcdoc ? (
          <iframe
            key={frameKey}
            title="react-preview"
            sandbox="allow-scripts"
            srcDoc={srcdoc}
            className="h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-zinc-950 text-sm text-zinc-600 italic">
            Press Run to render your component
          </div>
        )}
      </div>
    </div>
  )
}
