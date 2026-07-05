import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Code2, GraduationCap, FlaskConical, LogOut, BrainCircuit } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

function NavItem({ to, icon: Icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'
        }`
      }
    >
      <Icon size={15} />
      <span className="hidden sm:inline">{children}</span>
    </NavLink>
  )
}

export default function Navbar() {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 backdrop-blur">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-950/50">
            <Code2 size={17} className="text-white" />
          </span>
          <span className="font-display text-[14px] font-bold tracking-wider text-white">
            GROUND&nbsp;ZER<span className="zero-neon">0</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <NavItem to="/playground" icon={FlaskConical}>
            Project Mode
          </NavItem>
          <NavItem to="/learn" icon={GraduationCap}>
            Guided Mode
          </NavItem>
          <NavItem to="/cloud" icon={BrainCircuit}>
          AI + Cloud Design studio 
          </NavItem>
        </nav>
      </div>

      <div className="relative">
        {user ? (
          <>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              {user.photo ? (
                <img src={user.photo} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {(user.name || '?')[0].toUpperCase()}
                </span>
              )}
              <span className="hidden max-w-36 truncate md:inline">{user.name}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-medium text-white">{user.name}</p>
                  <p className="truncate text-xs text-zinc-500">{user.email}</p>
                  {user.guest && <p className="mt-1 text-[11px] text-amber-400">Guest session — data stays on this device</p>}
                </div>
                <button
                  onClick={() => {
                    signOut()
                    setMenuOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </header>
  )
}
