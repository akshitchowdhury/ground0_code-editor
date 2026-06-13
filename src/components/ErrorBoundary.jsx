import { Component } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

// Catches render errors in a subtree so one bad component (e.g. the canvas)
// can't blank the whole page. The rest of the studio stays usable, and the
// user can retry without a full reload.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Surface it for debugging without crashing the app.
    console.error('[ErrorBoundary]', this.props.label || '', error, info?.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.fallback) return this.props.fallback(this.state.error, this.reset)
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangle size={26} className="text-amber-400" />
        <p className="text-sm font-medium text-zinc-200">This view hit a rendering error.</p>
        <p className="max-w-md break-words font-mono text-[11px] text-zinc-500">
          {String(this.state.error?.message || this.state.error)}
        </p>
        <button onClick={this.reset} className="btn-outline text-xs">
          <RotateCcw size={13} /> Try again
        </button>
      </div>
    )
  }
}
