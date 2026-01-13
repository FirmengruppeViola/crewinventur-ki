import { lazy, Suspense } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import { PublicRoute } from './features/auth/PublicRoute'

// Lazy load wrapper - creates a component that loads on demand
function lazyLoad(
  importFn: () => Promise<{ [key: string]: React.ComponentType }>,
  namedExport: string
) {
  const LazyComponent = lazy(async () => {
    const module = await importFn()
    return { default: module[namedExport] }
  })

  return function LazyWrapper() {
    return (
      <Suspense fallback={null}>
        <LazyComponent />
      </Suspense>
    )
  }
}

// =============================================================================
// PUBLIC ROUTES - Loaded immediately (small bundle)
// =============================================================================
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { AcceptInvitePage } from './pages/auth/AcceptInvitePage'

// Legal pages - tiny, load sync
import { TermsPage } from './pages/legal/TermsPage'
import { PrivacyPage } from './pages/legal/PrivacyPage'
import { ImprintPage } from './pages/legal/ImprintPage'

// Support/Tutorial - lazy load
const SupportPage = lazyLoad(() => import('./pages/support'), 'SupportPage')

// =============================================================================
// PROTECTED ROUTES - Lazy loaded (code splitting)
// =============================================================================

// Dashboard - most visited, preload after login
const DashboardPage = lazyLoad(() => import('./pages/dashboard/DashboardPage'), 'DashboardPage')

// Locations
const LocationsPage = lazyLoad(() => import('./pages/locations/LocationsPage'), 'LocationsPage')
const LocationDetailPage = lazyLoad(() => import('./pages/locations/LocationDetailPage'), 'LocationDetailPage')
const LocationFormPage = lazyLoad(() => import('./pages/locations/LocationFormPage'), 'LocationFormPage')

// Products
const ProductsPage = lazyLoad(() => import('./pages/products/ProductsPage'), 'ProductsPage')
const ProductDetailPage = lazyLoad(() => import('./pages/products/ProductDetailPage'), 'ProductDetailPage')
const ProductFormPage = lazyLoad(() => import('./pages/products/ProductFormPage'), 'ProductFormPage')
const ProductScanPage = lazyLoad(() => import('./pages/products/ProductScanPage'), 'ProductScanPage')

// Inventory
const InventoryPage = lazyLoad(() => import('./pages/inventory/InventoryPage'), 'InventoryPage')
const ActiveSessionPage = lazyLoad(() => import('./pages/inventory/ActiveSessionPage'), 'ActiveSessionPage')
const InventoryScanPage = lazyLoad(() => import('./pages/inventory/InventoryScanPage'), 'InventoryScanPage')
const ShelfScanPage = lazyLoad(() => import('./pages/inventory/ShelfScanPage'), 'ShelfScanPage')
const SessionSummaryPage = lazyLoad(() => import('./pages/inventory/SessionSummaryPage'), 'SessionSummaryPage')
const PriceReviewPage = lazyLoad(() => import('./pages/inventory/PriceReviewPage'), 'PriceReviewPage')
const BundlesPage = lazyLoad(() => import('./pages/inventory/BundlesPage'), 'BundlesPage')
const BundleSummaryPage = lazyLoad(() => import('./pages/inventory/BundleSummaryPage'), 'BundleSummaryPage')

// Invoices
const InvoicesPage = lazyLoad(() => import('./pages/invoices/InvoicesPage'), 'InvoicesPage')
const InvoiceDetailPage = lazyLoad(() => import('./pages/invoices/InvoiceDetailPage'), 'InvoiceDetailPage')
const InvoiceMatchingPage = lazyLoad(() => import('./pages/invoices/InvoiceMatchingPage'), 'InvoiceMatchingPage')

// Settings
const SettingsPage = lazyLoad(() => import('./pages/settings/SettingsPage'), 'SettingsPage')
const ProfilePage = lazyLoad(() => import('./pages/settings/ProfilePage'), 'ProfilePage')
const TeamPage = lazyLoad(() => import('./pages/settings/TeamPage'), 'TeamPage')
const BillingPage = lazyLoad(() => import('./pages/settings/BillingPage'), 'BillingPage')

// =============================================================================
// ROUTE DEFINITIONS
// =============================================================================

export const publicRoutes: RouteObject[] = [
  { path: '/', element: <PublicRoute><LandingPage /></PublicRoute> },
  { path: '/login', element: <PublicRoute><LoginPage /></PublicRoute> },
  { path: '/register', element: <PublicRoute><RegisterPage /></PublicRoute> },
  { path: '/forgot-password', element: <PublicRoute><ForgotPasswordPage /></PublicRoute> },
  { path: '/accept-invite', element: <PublicRoute><AcceptInvitePage /></PublicRoute> },
  { path: '/terms', element: <TermsPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/imprint', element: <ImprintPage /> },
  { path: '/support', element: <SupportPage /> },
]

export const protectedRoutes: RouteObject[] = [
  // Dashboard
  { path: '/dashboard', element: <DashboardPage /> },

  // Locations
  { path: '/locations', element: <LocationsPage /> },
  { path: '/locations/new', element: <LocationFormPage /> },
  { path: '/locations/:id', element: <LocationDetailPage /> },
  { path: '/locations/:id/edit', element: <LocationFormPage /> },

  // Products
  { path: '/products', element: <ProductsPage /> },
  { path: '/products/new', element: <ProductFormPage /> },
  { path: '/products/scan', element: <ProductScanPage /> },
  { path: '/products/:id', element: <ProductDetailPage /> },
  { path: '/products/:id/edit', element: <ProductFormPage /> },

  // Inventory
  { path: '/inventory', element: <InventoryPage /> },
  { path: '/inventory/bundles', element: <BundlesPage /> },
  { path: '/inventory/bundles/:id', element: <BundleSummaryPage /> },
  { path: '/inventory/sessions/:id', element: <ActiveSessionPage /> },
  { path: '/inventory/sessions/:id/scan', element: <InventoryScanPage /> },
  { path: '/inventory/sessions/:id/shelf-scan', element: <ShelfScanPage /> },
  { path: '/inventory/sessions/:id/summary', element: <SessionSummaryPage /> },

  // Settings
  { path: '/settings', element: <SettingsPage /> },
  { path: '/settings/profile', element: <ProfilePage /> },
]

export const ownerOnlyRoutes: RouteObject[] = [
  // Inventory
  { path: '/inventory/sessions/:id/price-review', element: <PriceReviewPage /> },

  // Invoices
  { path: '/invoices', element: <InvoicesPage /> },
  { path: '/invoices/:id', element: <InvoiceDetailPage /> },
  { path: '/invoices/:id/match', element: <InvoiceMatchingPage /> },

  // Settings
  { path: '/settings/team', element: <TeamPage /> },
  { path: '/settings/billing', element: <BillingPage /> },
]

export const fallbackRoute: RouteObject = {
  path: '*',
  element: <Navigate to="/" replace />,
}

// =============================================================================
// PRELOAD FUNCTIONS - Call these to preload route chunks
// =============================================================================

export const preloadRoutes = {
  dashboard: () => import('./pages/dashboard/DashboardPage'),
  locations: () => import('./pages/locations/LocationsPage'),
  products: () => import('./pages/products/ProductsPage'),
  inventory: () => import('./pages/inventory/InventoryPage'),
  settings: () => import('./pages/settings/SettingsPage'),
}

// Preload critical routes after login
export function preloadCriticalRoutes() {
  // Use requestIdleCallback for non-blocking preload
  const preload = () => {
    preloadRoutes.dashboard()
    preloadRoutes.locations()
    preloadRoutes.products()
    preloadRoutes.inventory()
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(preload, { timeout: 2000 })
  } else {
    setTimeout(preload, 100)
  }
}
