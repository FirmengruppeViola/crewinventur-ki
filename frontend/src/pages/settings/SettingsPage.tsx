import { Info } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../features/auth/useAuth'
import { ProfileSection } from '../../components/settings/ProfileSection'
import { TeamSection } from '../../components/settings/TeamSection'
import { BillingSection } from '../../components/settings/BillingSection'

export function SettingsPage() {
  const { isOwner } = useAuth()

  return (
    <div className="space-y-10 pb-20">
      <header className="px-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">
          Verwalte Konto, App-Infos und Sicherheit.
        </p>
      </header>

      <ProfileSection variant="embedded" />

      {isOwner && <TeamSection variant="embedded" />}

      {isOwner && <BillingSection variant="embedded" />}

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Info</h2>
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
    </div>
  )
}
