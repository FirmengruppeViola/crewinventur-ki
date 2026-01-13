import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { ToastHost } from './components/ui/Toast'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { publicRoutes, protectedRoutes, ownerOnlyRoutes, fallbackRoute } from './routes'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastHost />
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

              {/* Owner-only routes */}
              <Route element={<ProtectedRoute ownerOnly />}>
                {ownerOnlyRoutes.map((route) => (
                  <Route key={route.path} path={route.path} element={route.element} />
                ))}
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path={fallbackRoute.path} element={fallbackRoute.element} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
