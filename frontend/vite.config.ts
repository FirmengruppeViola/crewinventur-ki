import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'path'

const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, './package.json'), 'utf-8'),
) as { version?: string }
const appVersion = packageJson.version ?? '0.0.0'

let gitSha = 'unknown'
try {
  gitSha = execSync('git rev-parse --short HEAD', {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .toString()
    .trim()
} catch {
  gitSha = 'unknown'
}

const buildTime = new Date().toISOString()

// =============================================================================
// 2026 BEST PRACTICES - Vite Configuration for Capacitor Hybrid Apps
// =============================================================================

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __GIT_SHA__: JSON.stringify(gitSha),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [react()],

  // ===========================================================================
  // PATH ALIASES - Clean imports
  // ===========================================================================
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },

  // ===========================================================================
  // BUILD OPTIMIZATION - Code splitting, minification, compression
  // ===========================================================================
  build: {
    // Target modern browsers (Capacitor WebView supports ES2020+)
    target: 'es2020',

    // Generate source maps for debugging (disable in production if needed)
    sourcemap: false,

    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },

    // Code splitting configuration
    rollupOptions: {
      output: {
        // Smart chunk splitting for optimal caching
        manualChunks: (id) => {
          // Vendor chunks - cached separately, updated less frequently
          if (id.includes('node_modules')) {
            // React core - rarely changes
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react'
            }
            // Data fetching - TanStack Query
            if (id.includes('@tanstack')) {
              return 'vendor-query'
            }
            // UI libraries
            if (id.includes('framer-motion')) {
              return 'vendor-motion'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'vendor-supabase'
            }
            // Forms
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
              return 'vendor-forms'
            }
            // Everything else from node_modules
            return 'vendor-misc'
          }

          // Pages are automatically code-split by React.lazy() in routes.tsx
          // No manual chunking needed - Vite handles it correctly
        },

        // Consistent chunk names for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    // Increase chunk size warning limit (we're intentionally splitting)
    chunkSizeWarningLimit: 500,

    // CSS code splitting
    cssCodeSplit: true,
  },

  // ===========================================================================
  // DEV SERVER OPTIMIZATION
  // ===========================================================================
  server: {
    // Pre-bundle dependencies for faster dev startup
    warmup: {
      clientFiles: [
        './src/App.tsx',
        './src/pages/dashboard/DashboardPage.tsx',
        './src/components/layout/AppShell.tsx',
      ],
    },
  },

  // ===========================================================================
  // DEPENDENCY OPTIMIZATION
  // ===========================================================================
  optimizeDeps: {
    // Pre-bundle these for faster dev startup
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'zustand',
      'framer-motion',
      'lucide-react',
      'clsx',
      'tailwind-merge',
    ],
  },
})
