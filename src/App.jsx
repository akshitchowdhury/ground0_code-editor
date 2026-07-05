import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Code2 } from 'lucide-react'
import Navbar from './components/Navbar.jsx'
import Landing from './pages/Landing.jsx'
import Playground from './pages/Playground.jsx'
import LearnHome from './pages/LearnHome.jsx'
import TutorialPlayer from './pages/TutorialPlayer.jsx'
import CloudHome from './pages/CloudHome.jsx'
import CloudTopicPlayer from './pages/CloudTopicPlayer.jsx'
import CloudDesigner from './pages/CloudDesigner.jsx'
import AgentStudio from './pages/AgentStudio.jsx'
import ExamLab from './pages/ExamLab.jsx'
import Login from './pages/Login.jsx'
import { useAuth } from './context/AuthContext.jsx'

function Splash() {
  return (
    <div className="flex h-full items-center justify-center">
      <span className="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-950/50">
        <Code2 size={22} className="text-white" />
      </span>
    </div>
  )
}

// Guards every app route: unauthenticated visitors are bounced to /login,
// with the page they wanted remembered so we can return them after sign-in.
// Authenticated users (real accounts and guests alike) get the Navbar shell.
function ProtectedLayout() {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  return (
    <div className="flex h-full flex-col">
      <Navbar />
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  const { ready } = useAuth()

  // Brief splash while we restore the saved session — avoids a login flash.
  if (!ready) return <Splash />

  return (
    <Routes>
      {/* Public — the only route reachable while signed out. */}
      <Route path="/login" element={<Login />} />

      {/* Everything below requires a session (guest counts). */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/learn" element={<LearnHome />} />
        <Route path="/learn/:trackId" element={<TutorialPlayer />} />
        <Route path="/cloud" element={<CloudHome />} />
        <Route path="/cloud/exam" element={<ExamLab />} />
        <Route path="/cloud/designer" element={<CloudDesigner />} />
        <Route path="/cloud/agent-studio" element={<AgentStudio />} />
        <Route path="/cloud/:moduleId" element={<CloudTopicPlayer />} />
      </Route>

      {/* Unknown path → home (which itself re-gates to /login if needed). */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
