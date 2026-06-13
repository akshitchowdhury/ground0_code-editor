// A small bash-flavoured shell interpreter over the virtual filesystem.
// Supports: variables (NAME=value, $NAME), quoting, pipes, > and >>
// redirection, comments, and the everyday commands used in the tutorials.
import {
  createDefaultFs,
  HOME,
  resolvePath,
  getNode,
  getParent,
  makeDir,
  writeFile,
  cloneFs,
} from './virtualFs.js'
import { load, save } from '../../storage.js'

const HELP_TEXT = `Available commands:
  pwd                 print working directory
  ls [-a] [-l] [dir]  list directory contents
  cd [dir]            change directory (~, .., absolute or relative)
  mkdir [-p] <dir>    create directory
  touch <file>        create empty file
  cat <file...>       print file contents
  echo <text>         print text ("> file" writes, ">> file" appends)
  printf <text>       print text without trailing newline
  rm [-r] <path>      remove file (or directory with -r)
  cp <src> <dst>      copy file
  mv <src> <dst>      move / rename
  head [-n N] <file>  first N lines (default 10)
  tail [-n N] <file>  last N lines (default 10)
  grep <pat> <file>   search for a pattern (also works in pipes)
  wc [-l] <file>      count lines / words / characters
  tree [dir]          directory tree view
  whoami / hostname / date / history / env
  clear               clear the terminal
  reset-fs            restore the filesystem to its original state
  help                this message

Extras: VAR=value assignments, $VAR expansion, cmd1 | cmd2 pipes, # comments`

function formatTree(node, prefix = '') {
  const entries = Object.entries(node.children)
  return entries
    .map(([name, child], i) => {
      const isLast = i === entries.length - 1
      const branch = isLast ? '└── ' : '├── '
      const line = prefix + branch + name + (child.type === 'dir' ? '/' : '')
      if (child.type === 'dir') {
        const sub = formatTree(child, prefix + (isLast ? '    ' : '│   '))
        return sub ? line + '\n' + sub : line
      }
      return line
    })
    .join('\n')
}

// Split a command line into tokens, respecting single/double quotes.
function tokenize(line) {
  const tokens = []
  let current = ''
  let quote = null
  let hasToken = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quote) {
      if (ch === quote) quote = null
      else current += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
      hasToken = true
    } else if (ch === ' ' || ch === '\t') {
      if (hasToken || current) tokens.push(current)
      current = ''
      hasToken = false
    } else if (ch === '#' && !current) {
      break // comment
    } else {
      current += ch
    }
  }
  if (hasToken || current) tokens.push(current)
  return tokens
}

function expandVars(text, env) {
  return text.replace(/\$\{(\w+)\}|\$(\w+)/g, (_, braced, plain) => env[braced || plain] ?? '')
}

export class ShellSession {
  constructor({ persistKey = 'shell.fs' } = {}) {
    this.persistKey = persistKey
    this.root = load(persistKey) || createDefaultFs()
    this.cwd = HOME
    this.env = { HOME, USER: 'learner', SHELL: '/bin/bash', HOSTNAME: 'ground0' }
    this.history = []
  }

  persist() {
    save(this.persistKey, cloneFs(this.root))
  }

  prompt() {
    const display = this.cwd === HOME ? '~' : this.cwd.startsWith(HOME + '/') ? '~' + this.cwd.slice(HOME.length) : this.cwd
    return `learner@ground0:${display}$`
  }

  // Execute one line. Returns { stdout, stderr, clear?, exit? }
  exec(line) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return { stdout: '', stderr: '' }
    this.history.push(trimmed)

    // Variable assignment: NAME=value (no command following, MVP behaviour)
    const assign = trimmed.match(/^([A-Za-z_]\w*)=(.*)$/)
    if (assign && !assign[2].includes(' |')) {
      const tokens = tokenize(assign[2])
      this.env[assign[1]] = expandVars(tokens.join(' '), this.env)
      return { stdout: '', stderr: '' }
    }

    // Pipeline: run each stage, feeding stdout into the next stage's stdin.
    const stages = this.splitPipeline(trimmed)
    let stdin = ''
    let stderr = []
    let result = { stdout: '', stderr: '' }
    for (const stage of stages) {
      result = this.execSimple(stage, stdin)
      if (result.clear || result.exit) return result
      stdin = result.stdout
      if (result.stderr) stderr.push(result.stderr)
    }
    return { stdout: result.stdout, stderr: stderr.join('\n') }
  }

  // Split on | but not inside quotes.
  splitPipeline(line) {
    const stages = []
    let current = ''
    let quote = null
    for (const ch of line) {
      if (quote) {
        if (ch === quote) quote = null
        current += ch
      } else if (ch === '"' || ch === "'") {
        quote = ch
        current += ch
      } else if (ch === '|') {
        stages.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    if (current.trim()) stages.push(current.trim())
    return stages
  }

  execSimple(commandLine, stdin) {
    // Extract output redirection before tokenizing the command itself.
    let redirect = null
    const redirMatch = commandLine.match(/(.*?)(>>?)\s*(\S+)\s*$/)
    let cmdPart = commandLine
    if (redirMatch && !commandLine.includes('">') && !commandLine.includes("'>")) {
      cmdPart = redirMatch[1].trim()
      redirect = { append: redirMatch[2] === '>>', target: redirMatch[3] }
    }

    const tokens = tokenize(cmdPart).map((t) => expandVars(t, this.env))
    if (!tokens.length) return { stdout: '', stderr: '' }
    const [cmd, ...args] = tokens

    const out = this.runCommand(cmd, args, stdin)

    if (redirect && !out.stderr) {
      const abs = resolvePath(this.cwd, expandVars(redirect.target, this.env))
      const err = writeFile(this.root, abs, out.stdout ? out.stdout + '\n' : '', redirect.append)
      this.persist()
      return { stdout: '', stderr: err ? `bash: ${err}` : '' }
    }
    return out
  }

  runCommand(cmd, args, stdin) {
    const ok = (stdout = '') => ({ stdout, stderr: '' })
    const fail = (msg) => ({ stdout: '', stderr: `${cmd}: ${msg}` })
    const flags = args.filter((a) => a.startsWith('-'))
    const rest = args.filter((a) => !a.startsWith('-'))
    const has = (f) => flags.some((fl) => fl === f || (fl.length > 1 && !fl.startsWith('--') && fl.includes(f.slice(1))))

    switch (cmd) {
      case 'pwd':
        return ok(this.cwd)

      case 'cd': {
        const target = resolvePath(this.cwd, rest[0] || '~')
        const node = getNode(this.root, target)
        if (!node) return fail(`${rest[0]}: No such file or directory`)
        if (node.type !== 'dir') return fail(`${rest[0]}: Not a directory`)
        this.cwd = target
        return ok()
      }

      case 'ls': {
        const target = resolvePath(this.cwd, rest[0] || '.')
        const node = getNode(this.root, target)
        if (!node) return fail(`cannot access '${rest[0]}': No such file or directory`)
        if (node.type === 'file') return ok(rest[0])
        let names = Object.keys(node.children).sort()
        if (!has('-a')) names = names.filter((n) => !n.startsWith('.'))
        if (has('-l')) {
          const lines = names.map((n) => {
            const child = node.children[n]
            const isDir = child.type === 'dir'
            const size = isDir ? 4096 : child.content.length
            return `${isDir ? 'drwxr-xr-x' : '-rw-r--r--'} learner learner ${String(size).padStart(6)} ${n}${isDir ? '/' : ''}`
          })
          return ok(lines.join('\n'))
        }
        return ok(names.map((n) => (node.children[n].type === 'dir' ? n + '/' : n)).join('  '))
      }

      case 'mkdir': {
        if (!rest.length) return fail('missing operand')
        for (const dir of rest) {
          const err = makeDir(this.root, resolvePath(this.cwd, dir), has('-p'))
          if (err) return fail(err)
        }
        this.persist()
        return ok()
      }

      case 'touch': {
        if (!rest.length) return fail('missing file operand')
        for (const file of rest) {
          const abs = resolvePath(this.cwd, file)
          if (!getNode(this.root, abs)) {
            const err = writeFile(this.root, abs, '')
            if (err) return fail(err)
          }
        }
        this.persist()
        return ok()
      }

      case 'cat': {
        if (!rest.length) return ok(stdin)
        const parts = []
        for (const file of rest) {
          const node = getNode(this.root, resolvePath(this.cwd, file))
          if (!node) return fail(`${file}: No such file or directory`)
          if (node.type === 'dir') return fail(`${file}: Is a directory`)
          parts.push(node.content.replace(/\n$/, ''))
        }
        return ok(parts.join('\n'))
      }

      case 'echo':
        return ok(args.filter((a) => a !== '-e').join(' '))

      case 'printf':
        return ok(args.join(' ').replace(/\\n/g, '\n').replace(/\\t/g, '\t'))

      case 'rm': {
        if (!rest.length) return fail('missing operand')
        for (const path of rest) {
          const abs = resolvePath(this.cwd, path)
          const { parent, name } = getParent(this.root, abs)
          const node = parent?.children?.[name]
          if (!node) return fail(`cannot remove '${path}': No such file or directory`)
          if (node.type === 'dir' && !has('-r')) return fail(`cannot remove '${path}': Is a directory`)
          delete parent.children[name]
        }
        this.persist()
        return ok()
      }

      case 'cp':
      case 'mv': {
        if (rest.length < 2) return fail('missing destination operand')
        const [srcPath, dstPath] = rest
        const srcAbs = resolvePath(this.cwd, srcPath)
        const srcNode = getNode(this.root, srcAbs)
        if (!srcNode) return fail(`cannot stat '${srcPath}': No such file or directory`)
        let dstAbs = resolvePath(this.cwd, dstPath)
        const dstNode = getNode(this.root, dstAbs)
        if (dstNode && dstNode.type === 'dir') {
          dstAbs = dstAbs + '/' + srcAbs.split('/').pop()
        }
        const { parent: dstParent, name: dstName } = getParent(this.root, dstAbs)
        if (!dstParent || dstParent.type !== 'dir') return fail(`cannot create '${dstPath}': No such directory`)
        dstParent.children[dstName] = cloneFs(srcNode)
        if (cmd === 'mv') {
          const { parent: srcParent, name: srcName } = getParent(this.root, srcAbs)
          delete srcParent.children[srcName]
        }
        this.persist()
        return ok()
      }

      case 'head':
      case 'tail': {
        const nIdx = args.indexOf('-n')
        const n = nIdx >= 0 ? parseInt(args[nIdx + 1], 10) || 10 : 10
        const fileArgs = rest.filter((a) => a !== String(n))
        let text = stdin
        if (fileArgs.length) {
          const node = getNode(this.root, resolvePath(this.cwd, fileArgs[0]))
          if (!node) return fail(`cannot open '${fileArgs[0]}' for reading: No such file or directory`)
          if (node.type === 'dir') return fail(`error reading '${fileArgs[0]}': Is a directory`)
          text = node.content
        }
        const lines = text.replace(/\n$/, '').split('\n')
        return ok((cmd === 'head' ? lines.slice(0, n) : lines.slice(-n)).join('\n'))
      }

      case 'grep': {
        if (!rest.length) return fail('usage: grep PATTERN [FILE]')
        const [pattern, ...files] = rest
        let text = stdin
        if (files.length) {
          const node = getNode(this.root, resolvePath(this.cwd, files[0]))
          if (!node) return fail(`${files[0]}: No such file or directory`)
          if (node.type === 'dir') return fail(`${files[0]}: Is a directory`)
          text = node.content
        }
        const insensitive = has('-i')
        const matcher = insensitive ? pattern.toLowerCase() : pattern
        const matches = text
          .replace(/\n$/, '')
          .split('\n')
          .filter((l) => (insensitive ? l.toLowerCase() : l).includes(matcher))
        return ok(matches.join('\n'))
      }

      case 'wc': {
        let text = stdin
        let label = ''
        if (rest.length) {
          const node = getNode(this.root, resolvePath(this.cwd, rest[0]))
          if (!node) return fail(`${rest[0]}: No such file or directory`)
          text = node.content
          label = ' ' + rest[0]
        }
        const lines = (text.match(/\n/g) || []).length
        if (has('-l')) return ok(`${lines}${label}`)
        const words = text.split(/\s+/).filter(Boolean).length
        return ok(`${lines} ${words} ${text.length}${label}`)
      }

      case 'tree': {
        const target = resolvePath(this.cwd, rest[0] || '.')
        const node = getNode(this.root, target)
        if (!node) return fail(`'${rest[0]}': No such file or directory`)
        if (node.type !== 'dir') return ok(rest[0])
        const body = formatTree(node)
        return ok('.' + (body ? '\n' + body : ''))
      }

      case 'whoami':
        return ok(this.env.USER)
      case 'hostname':
        return ok(this.env.HOSTNAME)
      case 'date':
        return ok(new Date().toString())
      case 'env':
        return ok(Object.entries(this.env).map(([k, v]) => `${k}=${v}`).join('\n'))
      case 'history':
        return ok(this.history.map((h, i) => `  ${i + 1}  ${h}`).join('\n'))
      case 'help':
        return ok(HELP_TEXT)
      case 'clear':
        return { stdout: '', stderr: '', clear: true }
      case 'reset-fs':
        this.root = createDefaultFs()
        this.cwd = HOME
        this.persist()
        return ok('Filesystem restored to its original state.')
      case 'sudo':
        return fail('learner is not in the sudoers file. This incident will be reported. 😄')
      case 'man':
        return ok('No manual pages here — try "help" instead.')
      case 'exit':
      case 'logout':
        return { stdout: 'There is no escape from the sandbox. 🏖️', stderr: '' }

      default:
        return { stdout: '', stderr: `bash: ${cmd}: command not found` }
    }
  }

  // Run a multi-line script. Yields each command + its output via callback.
  runScript(script, onLine) {
    const lines = script.split('\n')
    for (const raw of lines) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      onLine({ type: 'cmd', text: `${this.prompt()} ${line}` })
      const result = this.exec(line)
      if (result.clear) {
        onLine({ type: 'clear' })
        continue
      }
      if (result.stdout) onLine({ type: 'out', text: result.stdout })
      if (result.stderr) onLine({ type: 'err', text: result.stderr })
    }
  }
}
