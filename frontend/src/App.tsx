import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { ToastHost } from './components/ui/Toast'
import { BuildStamp } from './components/ui/BuildStamp'
import { publicRoutes, protectedRoutes, fallbackRoute } from './routes'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastHost />
        <BuildStamp />
        <Routes>
          {/* Public routes - no auth required */}
          {publicRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}

          {/* Protected routes - auth required */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              {protectedRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Route>
          </Route>

          {/* Fallback */}
          <Route path={fallbackRoute.path} element={fallbackRoute.element} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
