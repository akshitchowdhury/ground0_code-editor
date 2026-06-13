// In-memory Unix-like filesystem backing the simulated terminal.
// Nodes: { type: 'dir', children: {name: node} } | { type: 'file', content: string }

export function createDefaultFs() {
  return {
    type: 'dir',
    children: {
      home: {
        type: 'dir',
        children: {
          learner: {
            type: 'dir',
            children: {
              'readme.txt': {
                type: 'file',
                content:
                  'Welcome to the Ground0 shell!\nThis is a simulated Linux environment.\nType "help" to see available commands.\n',
              },
              projects: { type: 'dir', children: {} },
              notes: {
                type: 'dir',
                children: {
                  'shopping.txt': { type: 'file', content: 'milk\nbread\ncoffee beans\napples\n' },
                },
              },
            },
          },
        },
      },
      etc: {
        type: 'dir',
        children: {
          hostname: { type: 'file', content: 'ground0\n' },
        },
      },
      tmp: { type: 'dir', children: {} },
    },
  }
}

export const HOME = '/home/learner'

export function normalize(path) {
  const isAbs = path.startsWith('/')
  const parts = path.split('/').filter((p) => p !== '' && p !== '.')
  const out = []
  for (const part of parts) {
    if (part === '..') {
      if (out.length) out.pop()
    } else {
      out.push(part)
    }
  }
  return (isAbs ? '/' : '') + out.join('/') || '/'
}

export function resolvePath(cwd, path) {
  if (!path) return cwd
  let p = path
  if (p === '~') p = HOME
  else if (p.startsWith('~/')) p = HOME + p.slice(1)
  return normalize(p.startsWith('/') ? p : cwd + '/' + p)
}

export function getNode(root, absPath) {
  if (absPath === '/') return root
  const parts = absPath.split('/').filter(Boolean)
  let node = root
  for (const part of parts) {
    if (!node || node.type !== 'dir' || !node.children[part]) return null
    node = node.children[part]
  }
  return node
}

export function getParent(root, absPath) {
  const parts = absPath.split('/').filter(Boolean)
  const name = parts.pop()
  const parent = getNode(root, '/' + parts.join('/'))
  return { parent, name }
}

export function makeDir(root, absPath, recursive = false) {
  const parts = absPath.split('/').filter(Boolean)
  let node = root
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    const isLast = i === parts.length - 1
    const existing = node.children[part]
    if (existing) {
      if (existing.type !== 'dir') return `cannot create directory: '${part}' is a file`
      if (isLast && !recursive) return `cannot create directory '${absPath}': File exists`
      node = existing
    } else if (isLast || recursive) {
      node.children[part] = { type: 'dir', children: {} }
      node = node.children[part]
    } else {
      return `cannot create directory '${absPath}': No such file or directory`
    }
  }
  return null
}

export function writeFile(root, absPath, content, append = false) {
  const { parent, name } = getParent(root, absPath)
  if (!parent || parent.type !== 'dir') return `cannot write '${absPath}': No such directory`
  const existing = parent.children[name]
  if (existing && existing.type === 'dir') return `'${absPath}' is a directory`
  if (existing && append) existing.content += content
  else parent.children[name] = { type: 'file', content }
  return null
}

// Deep-clone for persistence snapshots
export function cloneFs(node) {
  return JSON.parse(JSON.stringify(node))
}
