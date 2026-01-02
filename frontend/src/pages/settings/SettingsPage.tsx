import { Link } from 'react-router-dom'
import { User, Info, LogOut, ChevronRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../features/auth/useAuth'
import { useUiStore } from '../../stores/uiStore'

export function SettingsPage() {
  const { signOut, user } = useAuth()
  const addToast = useUiStore((state) => state.addToast)

  const handleLogout = async () => {
    const { error } = await signOut()
    if (error) {
      addToast(error, 'error')
    }
  }

  return (
    <div className="space-y-6">
      <header className="px-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">
          Verwalte Konto, App-Infos und Sicherheit.
        </p>
      </header>

      <div className="space-y-4">
        <section>
           <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</h2>
           <Link to="/settings/profile">
             <Card className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50 active:scale-[0.99]">
               <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                 <User className="h-6 w-6" />
               </div>
               <div className="flex-1 overflow-hidden">
                 <p className="truncate font-medium text-foreground">
                   {user?.email ?? 'Nicht eingeloggt'}
                 </p>
                 <p className="text-xs text-muted-foreground">Profil und Firma verwalten</p>
               </div>
               <ChevronRight className="h-5 w-5 text-muted-foreground" />
             </Card>
           </Link>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Info</h2>
          <Card className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Info className="h-5 w-5" />
            </div>
             <div>
              <p className="font-medium text-foreground">App Version</p>
              <p className="text-xs text-muted-foreground">0.1.0 (Beta)</p>
            </div>
          </Card>
        </section>

        <section>
           <Button 
             variant="danger" 
             onClick={handleLogout} 
             className="w-full justify-center"
           >
             <LogOut className="mr-2 h-4 w-4" /> Logout
           </Button>
        </section>
      </div>
    </div>
  )
}
