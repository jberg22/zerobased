// #REMOVED (07112026): Stage 1 Home placeholder page (the getCountFromServer
// connection-check card). It served as the Stage 1 gate and is superseded by
// the real Accounts/Transactions UI below. The file src/pages/Home.tsx can be
// deleted from the repo.
// #EDIT (07112026): Stage 2 — real authed routes inside the app shell.
import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './lib/auth'
import AppShell from './components/AppShell'
import Login from './pages/Login'
import Accounts from './pages/Accounts'
import Transactions from './pages/Transactions'
import TransactionDetail from './pages/TransactionDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppShell>
              <Routes>
                <Route path="/" element={<Accounts />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/transactions/:id" element={<TransactionDetail />} />
                <Route path="*" element={<Accounts />} />
              </Routes>
            </AppShell>
          </RequireAuth>
        }
      />
    </Routes>
  )
}
// #END
