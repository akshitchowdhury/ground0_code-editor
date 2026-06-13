import { Routes, Route } from 'react-router-dom'
import { Code2 } from 'lucide-react'
import Navbar from './components/Navbar.jsx'
import Landing from './pages/Landing.jsx'
import Playground from './pages/Playground.jsx'
import LearnHome from './pages/LearnHome.jsx'
import TutorialPlayer from './pages/TutorialPlayer.jsx'
import CloudHome from './pages/CloudHome.jsx'
import CloudTopicPlayer from './pages/CloudTopicPlayer.jsx'
import CloudDesigner from './pages/CloudDesigner.jsx'
import ExamLab from './pages/ExamLab.jsx'
import Login from './pages/Login.jsx'
import { useAuth } from './context/AuthContext.jsx'

export default function App() {
  const { user, ready } = useAuth()

  // Brief splash while we restore the saved session — avoids a login flash.
  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="flex h-11 w-11 animate-pulse items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-950/50">
          <Code2 size={22} className="text-white" />
        </span>
      </div>
    )
  }

  // Gate the app behind sign-in (guest is one click).
  if (!user) return <Login />

  return (
    <div className="flex h-full flex-col">
      <Navbar />
      <main className="min-h-0 flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/learn" element={<LearnHome />} />
          <Route path="/learn/:trackId" element={<TutorialPlayer />} />
          <Route path="/cloud" element={<CloudHome />} />
          <Route path="/cloud/exam" element={<ExamLab />} />
          <Route path="/cloud/designer" element={<CloudDesigner />} />
          <Route path="/cloud/:moduleId" element={<CloudTopicPlayer />} />
        </Routes>
      </main>
    </div>
  )
}
