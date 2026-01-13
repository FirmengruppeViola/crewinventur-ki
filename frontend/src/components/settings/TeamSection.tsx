import { useState } from 'react'
import {
  ArrowLeft,
  Plus,
  User,
  MapPin,
  MoreVertical,
  Copy,
  RefreshCw,
  UserX,
  UserCheck,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { ListPageSkeleton, SkeletonCardList } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { useUiStore } from '../../stores/uiStore'
import { useLocations } from '../../features/locations/useLocations'
import {
  useTeamMembers,
  useInviteTeamMember,
  useDeactivateTeamMember,
  useReactivateTeamMember,
  useRegenerateCode,
  type TeamMember,
} from '../../features/team/useTeam'
import { useViewNavigate } from '../../hooks/useViewNavigate'

type TeamSectionProps = {
  variant?: 'page' | 'embedded'
}

function TeamMemberCard({
  member,
  locationNames,
  onShowCode,
  onDeactivate,
  onReactivate,
  onRegenerateCode,
}: {
  member: TeamMember
  locationNames: string[]
  onShowCode: () => void
  onDeactivate: () => void
  onReactivate: () => void
  onRegenerateCode: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  const isPending = !member.invitation_accepted_at && member.invitation_code
  const isExpired =
    isPending &&
    member.invitation_expires_at &&
    new Date(member.invitation_expires_at) < new Date()

  return (
    <Card className="relative p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            member.is_active
              ? isPending
                ? 'bg-yellow-500/10 text-yellow-500'
                : 'bg-green-500/10 text-green-500'
              : 'bg-slate-500/10 text-slate-500'
          }`}
        >
          <User className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground truncate">{member.name}</p>
            {!member.is_active && (
              <span className="shrink-0 rounded bg-slate-500/20 px-1.5 py-0.5 text-xs text-slate-400">
                Deaktiviert
              </span>
            )}
            {isPending && !isExpired && (
              <span className="shrink-0 rounded bg-yellow-500/20 px-1.5 py-0.5 text-xs text-yellow-400">
                Einladung offen
              </span>
            )}
            {isExpired && (
              <span className="shrink-0 rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">
                Abgelaufen
              </span>
            )}
            {member.invitation_accepted_at && member.is_active && (
              <span className="shrink-0 rounded bg-green-500/20 px-1.5 py-0.5 text-xs text-green-400">
                Aktiv
              </span>
            )}
          </div>

          {member.email && (
            <p className="text-sm text-muted-foreground truncate">{member.email}</p>
          )}

          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">
              {locationNames.length > 0
                ? locationNames.join(', ')
                : 'Keine Standorte zugewiesen'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowMenu(!showMenu)}
          className="shrink-0 rounded p-1 hover:bg-accent"
        >
          <MoreVertical className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-4 top-12 z-20 w-48 rounded-lg border border-border bg-card shadow-lg">
            {isPending && (
              <>
                <button
                  onClick={() => {
                    onShowCode()
                    setShowMenu(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                >
                  <Copy className="h-4 w-4" />
                  Code anzeigen
                </button>
                <button
                  onClick={() => {
                    onRegenerateCode()
                    setShowMenu(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                >
                  <RefreshCw className="h-4 w-4" />
                  Neuen Code generieren
                </button>
              </>
            )}
            {member.is_active ? (
              <button
                onClick={() => {
                  onDeactivate()
                  setShowMenu(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-accent"
              >
                <UserX className="h-4 w-4" />
                Deaktivieren
              </button>
            ) : (
              <button
                onClick={() => {
                  onReactivate()
                  setShowMenu(false)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-400 hover:bg-accent"
              >
                <UserCheck className="h-4 w-4" />
                Reaktivieren
              </button>
            )}
          </div>
        </>
      )}
    </Card>
  )
}

export function TeamSection({ variant = 'page' }: TeamSectionProps) {
  const navigate = useViewNavigate()
  const addToast = useUiStore((state) => state.addToast)
  const isPage = variant === 'page'

  const { data: members, isLoading: loadingMembers } = useTeamMembers()
  const { data: locations } = useLocations()

  const inviteMutation = useInviteTeamMember()
  const deactivateMutation = useDeactivateTeamMember()
  const reactivateMutation = useReactivateTeamMember()
  const regenerateCodeMutation = useRegenerateCode()

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showCodeModal, setShowCodeModal] = useState<TeamMember | null>(null)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])

  const locationMap = new Map(locations?.map((l) => [l.id, l.name]) || [])

  const handleInvite = async () => {
    if (!inviteName.trim()) {
      addToast('Name ist erforderlich', 'error')
      return
    }
    if (selectedLocations.length === 0) {
      addToast('Mindestens ein Standort muss ausgewählt werden', 'error')
      return
    }

    try {
      const result = await inviteMutation.mutateAsync({
        name: inviteName.trim(),
        email: inviteEmail.trim() || undefined,
        location_ids: selectedLocations,
      })
      setShowInviteModal(false)
      setInviteName('')
      setInviteEmail('')
      setSelectedLocations([])
      setShowCodeModal(result)
      addToast('Einladung erstellt', 'success')
    } catch {
      addToast('Fehler beim Erstellen der Einladung', 'error')
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    addToast('Code kopiert', 'success')
  }

  const handleShareWhatsApp = (code: string, name: string) => {
    const text = encodeURIComponent(
      `Hallo ${name}! Dein Einladungscode fuer CrewInventur ist: ${code}\n\nLade dir die App herunter und gib den Code ein um loszulegen.`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleDeactivate = async (id: string) => {
    try {
      await deactivateMutation.mutateAsync(id)
      addToast('Betriebsleiter deaktiviert', 'success')
    } catch {
      addToast('Fehler beim Deaktivieren', 'error')
    }
  }

  const handleReactivate = async (id: string) => {
    try {
      await reactivateMutation.mutateAsync(id)
      addToast('Betriebsleiter reaktiviert', 'success')
    } catch {
      addToast('Fehler beim Reaktivieren', 'error')
    }
  }

  const handleRegenerateCode = async (id: string) => {
    try {
      const result = await regenerateCodeMutation.mutateAsync(id)
      setShowCodeModal(result)
      addToast('Neuer Code generiert', 'success')
    } catch {
      addToast('Fehler beim Generieren des Codes', 'error')
    }
  }

  if (loadingMembers && isPage) {
    return <ListPageSkeleton />
  }

  return (
    <div className={isPage ? 'space-y-6' : 'space-y-4'}>
      {isPage ? (
        <header className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="rounded-lg p-2 hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Team</h1>
            <p className="text-sm text-muted-foreground">
              Betriebsleiter einladen und verwalten
            </p>
          </div>
          <Button onClick={() => setShowInviteModal(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Einladen
          </Button>
        </header>
      ) : (
        <header className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Team</h2>
            <p className="text-sm text-muted-foreground">
              Betriebsleiter einladen und verwalten
            </p>
          </div>
          <Button size="sm" onClick={() => setShowInviteModal(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Einladen
          </Button>
        </header>
      )}

      {loadingMembers && !isPage ? (
        <SkeletonCardList count={3} />
      ) : !members || members.length === 0 ? (
        <EmptyState
          icon={<User className="h-6 w-6" />}
          title="Noch keine Betriebsleiter"
          description="Lade Betriebsleiter ein, damit sie Inventuren fuer deine Standorte durchfuehren koennen."
          action={
            <Button onClick={() => setShowInviteModal(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Ersten Betriebsleiter einladen
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              locationNames={member.location_ids.map((id) => locationMap.get(id) || id)}
              onShowCode={() => setShowCodeModal(member)}
              onDeactivate={() => handleDeactivate(member.id)}
              onReactivate={() => handleReactivate(member.id)}
              onRegenerateCode={() => handleRegenerateCode(member.id)}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Betriebsleiter einladen"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="Max Mustermann"
          />
          <Input
            label="E-Mail (optional)"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="max@example.com"
          />

          <div>
            <label className="mb-2 block text-sm font-medium">Standorte</label>
            <div className="space-y-2 rounded-lg border border-border p-3">
              {locations?.map((location) => (
                <label
                  key={location.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedLocations.includes(location.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLocations([...selectedLocations, location.id])
                      } else {
                        setSelectedLocations(
                          selectedLocations.filter((id) => id !== location.id)
                        )
                      }
                    }}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span>{location.name}</span>
                </label>
              ))}
              {(!locations || locations.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  Keine Standorte vorhanden. Erstelle zuerst Standorte.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setShowInviteModal(false)}
              className="flex-1"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleInvite}
              loading={inviteMutation.isPending}
              className="flex-1"
            >
              Einladen
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!showCodeModal}
        onClose={() => setShowCodeModal(null)}
        title="Einladungscode"
      >
        {showCodeModal && showCodeModal.invitation_code && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Teile diesen Code mit {showCodeModal.name}:
            </p>

            <div className="rounded-lg bg-accent p-4">
              <p className="font-mono text-3xl font-bold tracking-widest text-foreground">
                {showCodeModal.invitation_code}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Gueltig fuer 48 Stunden
            </p>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => handleCopyCode(showCodeModal.invitation_code!)}
                className="flex-1"
              >
                <Copy className="mr-1 h-4 w-4" />
                Kopieren
              </Button>
              <Button
                onClick={() =>
                  handleShareWhatsApp(
                    showCodeModal.invitation_code!,
                    showCodeModal.name
                  )
                }
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                WhatsApp
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
