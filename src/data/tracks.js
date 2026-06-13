// Track metadata shared by the playground and guided mode.
// Lesson content lives in ./tutorials/*.

export const TRACKS = [
  {
    id: 'javascript',
    name: 'JavaScript / Node',
    short: 'JavaScript',
    tagline: 'The language of the web — run Node-style scripts with live console output.',
    accent: 'amber',
    badge: 'JS',
    output: 'console',
  },
  {
    id: 'react',
    name: 'React / JSX',
    short: 'React',
    tagline: 'Build interactive UIs — your components render live in the preview pane.',
    accent: 'cyan',
    badge: '⚛',
    output: 'preview',
  },
  {
    id: 'python',
    name: 'Python',
    short: 'Python',
    tagline: 'Real CPython in your browser via WebAssembly — no install needed.',
    accent: 'emerald',
    badge: 'Py',
    output: 'console',
  },
  {
    id: 'go',
    name: 'Go (Golang)',
    short: 'Go',
    tagline: 'Real Go 1.23 — goroutines, channels and all — compiled in a free cloud sandbox.',
    accent: 'sky',
    badge: 'Go',
    output: 'console',
  },
  {
    id: 'java',
    name: 'Java',
    short: 'Java',
    tagline: 'Core Java & OOP on JDK 22, compiled and run in a free cloud sandbox.',
    accent: 'orange',
    badge: '☕',
    output: 'console',
  },
  {
    id: 'shell',
    name: 'Linux / Shell',
    short: 'Shell',
    tagline: 'Learn the command line in a safe simulated Linux filesystem.',
    accent: 'violet',
    badge: '$_',
    output: 'terminal',
  },
]

export const ACCENTS = {
  amber: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    solid: 'bg-amber-500',
    ring: 'ring-amber-500/40',
  },
  cyan: {
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    solid: 'bg-cyan-500',
    ring: 'ring-cyan-500/40',
  },
  emerald: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    solid: 'bg-emerald-500',
    ring: 'ring-emerald-500/40',
  },
  violet: {
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    solid: 'bg-violet-500',
    ring: 'ring-violet-500/40',
  },
  sky: {
    text: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    solid: 'bg-sky-500',
    ring: 'ring-sky-500/40',
  },
  orange: {
    text: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    solid: 'bg-orange-500',
    ring: 'ring-orange-500/40',
  },
  fuchsia: {
    text: 'text-fuchsia-400',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/30',
    solid: 'bg-fuchsia-500',
    ring: 'ring-fuchsia-500/40',
  },
}

export function getTrack(id) {
  return TRACKS.find((t) => t.id === id)
}
