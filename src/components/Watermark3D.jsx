import { useEffect, useRef } from 'react'

// "GROUND ZER0" — 3D floating watermark for the landing page.
// Three depth layers under a perspective camera give the extruded look;
// a slow keyframe float plus mouse parallax keep it moving. The zero is
// the centrepiece: neon gradient, glow, flicker and RGB glitch slices
// (all styling lives under "Ground Zer0 watermark" in index.css).
function WordMark({ ghost }) {
  return (
    <div className="wm-text text-center leading-none">
      <div className="wm-line1 wm-outline">GROUND</div>
      <div className="wm-line2">
        <span className="wm-outline">ZER</span>
        <span className={ghost ? 'wm-outline' : 'wm-zero'}>0</span>
      </div>
    </div>
  )
}

export default function Watermark3D() {
  const tiltRef = useRef(null)

  useEffect(() => {
    let raf = 0
    function onMove(e) {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2
        const y = (e.clientY / window.innerHeight - 0.5) * 2
        if (tiltRef.current) {
          tiltRef.current.style.transform = `rotateY(${(x * 7).toFixed(2)}deg) rotateX(${(y * -7).toFixed(2)}deg)`
        }
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className="wm-stage pointer-events-none absolute inset-x-0 top-0 flex h-[80vh] items-center justify-center overflow-hidden select-none"
    >
      <div ref={tiltRef} className="wm-tilt">
        <div className="wm-float relative">
          <div className="wm-layer" style={{ transform: 'translateZ(-90px)', opacity: 0.05, filter: 'blur(2px)' }}>
            <WordMark ghost />
          </div>
          <div className="wm-layer" style={{ transform: 'translateZ(-45px)', opacity: 0.09, filter: 'blur(1px)' }}>
            <WordMark ghost />
          </div>
          <div className="relative">
            <WordMark />
          </div>
          <div className="wm-sweep" />
        </div>
      </div>
    </div>
  )
}
