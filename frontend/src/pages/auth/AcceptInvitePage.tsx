import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Ticket, ArrowRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../features/auth/useAuth'
import { useUiStore } from '../../stores/uiStore'

export function AcceptInvitePage() {
  const { user, acceptInvitation } = useAuth()
  const navigate = useNavigate()
  const addToast = useUiStore((state) => state.addToast)

  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!code.trim()) {
      setError('Bitte gib deinen Einladungscode ein')
      return
    }

    setIsSubmitting(true)
    const { error: acceptError } = await acceptInvitation(code.trim().toUpperCase())
    setIsSubmitting(false)

    if (acceptError) {
      setError(acceptError)
      return
    }

    addToast('Einladung erfolgreich angenommen!', 'success')
    navigate('/dashboard', { replace: true })
  }

  // If user is not logged in, show a message to login first
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md flex flex-col gap-8 relative z-10">
          <header className="text-center">
            <Link
              to="/"
              className="inline-block mb-6 text-2xl font-bold bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent"
            >
              CrewChecker
            </Link>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Ticket className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Einladung annehmen</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Um deinen Einladungscode einzulösen, musst du dich zuerst anmelden oder
              registrieren.
            </p>
          </header>

          <Card className="border-white/5 bg-card/50 backdrop-blur-sm shadow-xl">
            <div className="space-y-4">
              <Link to="/login">
                <Button className="w-full h-11">
                  Anmelden
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" className="w-full h-11">
                  Neues Konto erstellen
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Nach dem Anmelden kannst du deinen Einladungscode eingeben.
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md flex flex-col gap-8 relative z-10">
        <header className="text-center">
          <Link
            to="/"
            className="inline-block mb-6 text-2xl font-bold bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent"
          >
            CrewChecker
          </Link>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Ticket className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Einladungscode eingeben</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gib den 6-stelligen Code ein, den du von deinem Arbeitgeber erhalten hast.
          </p>
        </header>

        <Card className="border-white/5 bg-card/50 backdrop-blur-sm shadow-xl">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="text-center">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="w-full text-center font-mono text-3xl font-bold tracking-[0.3em] bg-background/50 border border-border rounded-xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={isSubmitting}
              disabled={code.length < 6}
              className="w-full h-11 text-base shadow-lg shadow-primary/20"
            >
              Code einlösen
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              to="/dashboard"
              className="font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              Überspringen und zur App
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
