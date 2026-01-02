import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { Header } from './Header'

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <Header />
      <main className="mx-auto w-full max-w-md pb-32 pt-6 px-4 sm:max-w-2xl md:max-w-4xl">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
