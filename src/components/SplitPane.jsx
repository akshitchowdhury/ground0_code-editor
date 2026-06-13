import { useCallback, useRef, useState } from 'react'

// Lightweight draggable two-pane splitter (horizontal only).
export default function SplitPane({ left, right, initial = 50, min = 25, max = 75 }) {
  const containerRef = useRef(null)
  const [ratio, setRatio] = useState(initial)
  const [dragging, setDragging] = useState(false)

  const startDrag = useCallback(
    (e) => {
      e.preventDefault()
      setDragging(true)
      const container = containerRef.current
      function onMove(ev) {
        const rect = container.getBoundingClientRect()
        const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX
        const pct = ((clientX - rect.left) / rect.width) * 100
        setRatio(Math.min(max, Math.max(min, pct)))
      }
      function onUp() {
        setDragging(false)
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        window.removeEventListener('touchmove', onMove)
        window.removeEventListener('touchend', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
      window.addEventListener('touchmove', onMove)
      window.addEventListener('touchend', onUp)
    },
    [min, max],
  )

  return (
    <div ref={containerRef} className="flex h-full min-h-0 w-full">
      <div style={{ width: `${ratio}%` }} className="min-w-0">
        {left}
      </div>
      <div
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        className={`group relative z-10 w-1.5 shrink-0 cursor-col-resize ${dragging ? 'bg-indigo-500/60' : 'bg-transparent hover:bg-indigo-500/40'} transition-colors`}
      >
        <div className="absolute top-1/2 left-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-700 group-hover:bg-indigo-400" />
      </div>
      <div style={{ width: `${100 - ratio}%` }} className="min-w-0">
        {right}
      </div>
      {dragging && <div className="fixed inset-0 z-50 cursor-col-resize" />}
    </div>
  )
}
