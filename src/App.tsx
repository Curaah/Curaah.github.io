import { Navigate, Route, Routes } from 'react-router-dom'
import { useSession } from './lib/session'
import { ACCOUNT_KIND, APP_NAME, IS_CARE } from './lib/app'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Layout from './pages/Layout'
import Home from './pages/Home'
import Events from './pages/Events'
import Learn from './pages/Learn'
import Me from './pages/Me'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import AdminConsole from './pages/AdminConsole'
import NewEvent from './pages/NewEvent'
import NewPost from './pages/NewPost'
import NewRequest from './pages/NewRequest'
import Medicines from './pages/Medicines'
import Programs from './pages/Programs'
import NewProgram from './pages/NewProgram'
import ManageProgram from './pages/ManageProgram'
import ProgramDetail from './pages/ProgramDetail'
import SessionRoom from './pages/SessionRoom'
import { Shell, Splash } from './pages/ui'

export default function App() {
  const { ready, session, profile } = useSession()
  if (!ready) return <Splash />
  if (!session) return <Auth />
  if (profile === undefined) return <Splash />
  if (profile === null) return <Onboarding />
  if (profile.account_kind !== ACCOUNT_KIND) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold">This account belongs to the other app</h1>
        <p className="mt-2">It was created for {APP_NAME === 'Curaah' ? 'Curaah Careconnect' : 'Curaah'}. To use {APP_NAME}, sign in with a different email.</p>
        <button className="btn btn-quiet mt-6" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </Shell>
    )
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/me" element={<Me />} />
      </Route>
      <Route path="/settings" element={<Settings />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/console" element={<AdminConsole />} />
      <Route path="/events/new" element={<NewEvent />} />
      <Route path="/posts/new" element={<NewPost />} />
      <Route path="/request-blood" element={<NewRequest />} />
      <Route path="/medicines" element={<Medicines />} />
      <Route path="/programs/new" element={<NewProgram />} />
      <Route path="/programs/:id" element={IS_CARE ? <ManageProgram /> : <ProgramDetail />} />
      <Route path="/session/:id" element={<SessionRoom />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}