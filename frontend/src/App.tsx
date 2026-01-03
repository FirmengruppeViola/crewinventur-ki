import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { AcceptInvitePage } from './pages/auth/AcceptInvitePage'
import { ProfilePage } from './pages/settings/ProfilePage'
import { TeamPage } from './pages/settings/TeamPage'
import { BillingPage } from './pages/settings/BillingPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { LocationsPage } from './pages/locations/LocationsPage'
import { LocationDetailPage } from './pages/locations/LocationDetailPage'
import { LocationFormPage } from './pages/locations/LocationFormPage'
import { ProductsPage } from './pages/products/ProductsPage'
import { ProductDetailPage } from './pages/products/ProductDetailPage'
import { ProductFormPage } from './pages/products/ProductFormPage'
import { ProductScanPage } from './pages/products/ProductScanPage'
import { InventoryPage } from './pages/inventory/InventoryPage'
import { ActiveSessionPage } from './pages/inventory/ActiveSessionPage'
import { InventoryScanPage } from './pages/inventory/InventoryScanPage'
import { ShelfScanPage } from './pages/inventory/ShelfScanPage'
import { SessionSummaryPage } from './pages/inventory/SessionSummaryPage'
import { PriceReviewPage } from './pages/inventory/PriceReviewPage'
import { BundlesPage } from './pages/inventory/BundlesPage'
import { BundleSummaryPage } from './pages/inventory/BundleSummaryPage'
import { InvoicesPage } from './pages/invoices/InvoicesPage'
import { InvoiceDetailPage } from './pages/invoices/InvoiceDetailPage'
import { InvoiceMatchingPage } from './pages/invoices/InvoiceMatchingPage'
import { TermsPage } from './pages/legal/TermsPage'
import { PrivacyPage } from './pages/legal/PrivacyPage'
import { ImprintPage } from './pages/legal/ImprintPage'
import { AuthProvider } from './features/auth/AuthContext'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { ToastHost } from './components/ui/Toast'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastHost />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/imprint" element={<ImprintPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/locations" element={<LocationsPage />} />
              <Route path="/locations/new" element={<LocationFormPage />} />
              <Route path="/locations/:id" element={<LocationDetailPage />} />
              <Route path="/locations/:id/edit" element={<LocationFormPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/new" element={<ProductFormPage />} />
              <Route path="/products/scan" element={<ProductScanPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/products/:id/edit" element={<ProductFormPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/profile" element={<ProfilePage />} />
              <Route path="/settings/team" element={<TeamPage />} />
              <Route path="/settings/billing" element={<BillingPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/inventory/bundles" element={<BundlesPage />} />
              <Route path="/inventory/bundles/:id" element={<BundleSummaryPage />} />
              <Route path="/inventory/sessions/:id" element={<ActiveSessionPage />} />
              <Route path="/inventory/sessions/:id/scan" element={<InventoryScanPage />} />
              <Route path="/inventory/sessions/:id/shelf-scan" element={<ShelfScanPage />} />
              <Route
                path="/inventory/sessions/:id/summary"
                element={<SessionSummaryPage />}
              />
              <Route
                path="/inventory/sessions/:id/price-review"
                element={<PriceReviewPage />}
              />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="/invoices/:id/match" element={<InvoiceMatchingPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
