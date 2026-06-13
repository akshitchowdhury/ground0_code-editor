import { useCallback, useRef, useState } from 'react'
import { Play, FileCode2, Loader2 } from 'lucide-react'
import CodeEditor from './CodeEditor.jsx'
import ConsolePanel from './ConsolePanel.jsx'
import ReactPreviewFrame from './ReactPreviewFrame.jsx'
import Terminal from './Terminal.jsx'
import SplitPane from './SplitPane.jsx'
import { runJavaScript } from '../lib/runners/jsRunner.js'
import { buildReactSrcDoc } from '../lib/runners/reactPreview.js'
import { runPython } from '../lib/runners/pythonRunner.js'
import { runRemote } from '../lib/runners/remoteRunner.js'
import { ShellSession } from '../lib/runners/shell/interpreter.js'

const FILE_NAMES = {
  javascript: 'main.js',
  react: 'App.jsx',
  python: 'main.py',
  go: 'main.go',
  java: 'Main.java',
  shell: 'script.sh',
}

const RUN_LABELS = {
  javascript: 'Run',
  react: 'Run',
  python: 'Run',
  go: 'Run',
  java: 'Run',
  shell: 'Run Script',
}

// The heart of both modes: editor + the right execution engine + output.
// Layouts: js/python → editor | console; react → editor | preview+console;
// shell → terminal (left) | script editor (right), per the workspace spec.
export default function CodeWorkspace({ language, code, onCodeChange }) {
  const [consoleEntries, setConsoleEntries] = useState([])
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState(null)
  const [reactBuild, setReactBuild] = useState(null)
  const terminalRef = useRef(null)
  const sessionRef = useRef(null)

  if (language === 'shell' && !sessionRef.current) {
    sessionRef.current = new ShellSession()
  }

  const pushEntry = useCallback((entry) => {
    setConsoleEntries((prev) => [...prev, entry])
  }, [])

  const run = useCallback(() => {
    if (language === 'javascript') {
      setConsoleEntries([])
      setRunning(true)
      runJavaScript(code, {
        onOutput: pushEntry,
        onDone: () => setRunning(false),
      })
    } else if (language === 'python') {
      setConsoleEntries([])
      setRunning(true)
      runPython(code, { onOutput: pushEntry, onStatus: setStatus }).finally(() => {
        setRunning(false)
        setStatus(null)
      })
    } else if (language === 'go' || language === 'java') {
      setConsoleEntries([])
      setRunning(true)
      runRemote(language, code, { onOutput: pushEntry, onStatus: setStatus }).finally(() => {
        setRunning(false)
        setStatus(null)
      })
    } else if (language === 'react') {
      setConsoleEntries([])
      setRunning(true)
      buildReactSrcDoc(code)
        .then(setReactBuild)
        .finally(() => setRunning(false))
    } else if (language === 'shell') {
      terminalRef.current?.runScript(code)
    }
  }, [language, code, pushEntry])

  const clearConsole = useCallback(() => setConsoleEntries([]), [])

  const editorPanel = (
    <div className="panel flex h-full flex-col">
      <div className="panel-header justify-between">
        <span className="flex items-center gap-2 normal-case">
          <FileCode2 size={13} />
          <span className="font-mono text-zinc-300">{FILE_NAMES[language]}</span>
        </span>
        <button onClick={run} disabled={running} className="btn-primary !px-4 !py-1 text-xs">
          {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          {RUN_LABELS[language]}
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <CodeEditor language={language} value={code} onChange={onCodeChange} onRun={run} />
      </div>
    </div>
  )

  if (language === 'shell') {
    return (
      <SplitPane
        initial={48}
        left={
          <div className="panel h-full">
            <Terminal
              ref={terminalRef}
              session={sessionRef.current}
              welcome={'Ground Zer0 Linux (simulated) — type "help" for available commands.'}
            />
          </div>
        }
        right={editorPanel}
      />
    )
  }

  if (language === 'react') {
    return (
      <SplitPane
        initial={45}
        left={editorPanel}
        right={
          <div className="flex h-full flex-col gap-2">
            <div className="panel min-h-0 flex-[2]">
              <ReactPreviewFrame
                srcdoc={reactBuild?.srcdoc}
                buildError={reactBuild?.error}
                onConsole={pushEntry}
              />
            </div>
            <div className="panel min-h-0 flex-1">
              <ConsolePanel entries={consoleEntries} onClear={clearConsole} running={false} />
            </div>
          </div>
        }
      />
    )
  }

  return (
    <SplitPane
      initial={50}
      left={editorPanel}
      right={
        <div className="panel h-full">
          <ConsolePanel entries={consoleEntries} onClear={clearConsole} running={running} status={status} />
        </div>
      }
    />
  )
}
