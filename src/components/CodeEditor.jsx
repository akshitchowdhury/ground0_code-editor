import Editor from '@monaco-editor/react'
import { Loader2 } from 'lucide-react'

const LANGUAGE_MAP = {
  javascript: 'javascript',
  react: 'javascript',
  python: 'python',
  go: 'go',
  java: 'java',
  shell: 'shell',
}

export default function CodeEditor({ language, value, onChange, onRun }) {
  return (
    <Editor
      height="100%"
      language={LANGUAGE_MAP[language] || 'plaintext'}
      theme="vs-dark"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      loading={
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 size={16} className="animate-spin" /> Loading editor…
        </div>
      }
      onMount={(editor, monaco) => {
        // Ctrl/Cmd+Enter runs the code from inside the editor
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
          onRun?.()
        })
      }}
      options={{
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 14 },
        tabSize: 2,
        wordWrap: 'on',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        renderLineHighlight: 'gutter',
        automaticLayout: true,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      }}
    />
  )
}
