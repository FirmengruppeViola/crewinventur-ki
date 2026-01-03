import { type FormEvent, useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ChevronRight, Send } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DetailPageSkeleton } from '../../components/ui/Skeleton'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { useLocation as useLocationData } from '../../features/locations/useLocations'
import { useProducts } from '../../features/products/useProducts'
import {
  useInventorySession,
  useSessionItems,
  useExportValidation,
} from '../../features/inventory/useInventory'
import { useAuth } from '../../features/auth/useAuth'
import { apiDownload, apiRequest } from '../../lib/api'
import { useUiStore } from '../../stores/uiStore'

export function SessionSummaryPage() {
  const { id } = useParams()
  const sessionId = id ?? ''
  const navigate = useNavigate()
  const { session: authSession } = useAuth()
  const addToast = useUiStore((state) => state.addToast)
  const { data: session, isLoading } = useInventorySession(sessionId)
  const { data: items } = useSessionItems(sessionId)
  const { data: products } = useProducts()
  const { data: validation } = useExportValidation(sessionId)

  const location = useLocationData(session?.location_id)
  const productMap = new Map(products?.map((product) => [product.id, product]) ?? [])
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [accountantEmail, setAccountantEmail] = useState<string | null>(null)

  // Load accountant email from profile
  useEffect(() => {
    if (!authSession?.access_token) return
    apiRequest<{ accountant_email: string | null }>(
      '/api/v1/profile',
      { method: 'GET' },
      authSession.access_token,
    ).then((profile) => {
      if (profile.accountant_email) {
        setAccountantEmail(profile.accountant_email)
      }
    }).catch(() => {
      // Ignore errors - accountant email is optional
    })
  }, [authSession?.access_token])

  // Pre-fill email when opening modal
  const openEmailModal = () => {
    if (accountantEmail && !email) {
      setEmail(accountantEmail)
    }
    setShowEmailModal(true)
  }

  if (isLoading || !session) {
    return <DetailPageSkeleton />
  }

  const hasMissingPrices = validation && !validation.valid

  const downloadFile = async (format: 'pdf' | 'csv' | 'csv-summary') => {
    // Warn about missing prices but allow download
    if (hasMissingPrices) {
      addToast(`Warnung: ${validation.missing_count} Produkte ohne Preis`, 'info')
    }

    const filename =
      format === 'csv-summary'
        ? `inventory-${sessionId}-summary.csv`
        : `inventory-${sessionId}.${format}`

    try {
      await apiDownload(
        `/api/v1/export/session/${sessionId}/${format}`,
        filename,
        authSession?.access_token,
      )
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Download fehlgeschlagen.',
        'error',
      )
    }
  }

  const handleSendEmail = async (event: FormEvent) => {
    event.preventDefault()
    if (!authSession?.access_token) {
      addToast('Bitte zuerst einloggen.', 'error')
      return
    }

    setIsSending(true)
    try {
      await apiRequest(
        `/api/v1/export/session/${sessionId}/send`,
        {
          method: 'POST',
          body: JSON.stringify({
            email,
            subject: subject.trim() || null,
            message: message.trim() || null,
          }),
        },
        authSession.access_token,
      )
      addToast('Email gesendet.', 'success')
      setShowEmailModal(false)
      setEmail('')
      setSubject('')
      setMessage('')
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Email senden fehlgeschlagen.',
        'error',
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Summary: {location.data?.name || 'Inventur'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Abgeschlossen am {session.completed_at || '-'}
          </p>
        </div>
        <Link to="/inventory">
          <Button variant="secondary">Zurück</Button>
        </Link>
      </header>

      {/* Missing Prices Warning */}
      {hasMissingPrices && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-4 p-4">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">
                {validation.missing_count} Produkte ohne Preis
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Vor dem Export sollten alle Preise eingetragen werden.
              </p>
              <button
                onClick={() => navigate(`/inventory/sessions/${sessionId}/price-review`)}
                className="mt-3 flex items-center gap-2 text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors"
              >
                Preise jetzt nachtragen
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
      )}

      <Card title="Gesamt">
        <p className="text-sm text-muted-foreground">
          Items: <span className="text-foreground font-medium">{session.total_items}</span> ·
          Wert: <span className="text-emerald-500 font-medium">{Number(session.total_value).toFixed(2)} EUR</span>
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => downloadFile('pdf')}>
            PDF exportieren
          </Button>
          <Button variant="secondary" size="sm" onClick={() => downloadFile('csv')}>
            CSV exportieren
          </Button>
          <Button variant="secondary" size="sm" onClick={() => downloadFile('csv-summary')}>
            CSV Zusammenfassung
          </Button>
          <Button variant="secondary" size="sm" onClick={openEmailModal}>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {accountantEmail ? 'An Steuerberater senden' : 'Per Email senden'}
          </Button>
        </div>
      </Card>

      <Card title="Positionen">
        {items && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => {
              const product = productMap.get(item.product_id)
              return (
                <div key={item.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <p className="font-medium text-foreground">{product?.name || 'Unbekannt'}</p>
                  <p className="text-sm text-muted-foreground">
                    Menge: {item.quantity} · Differenz:{' '}
                    <span className={item.quantity_difference && item.quantity_difference !== 0 ? 'text-amber-500' : 'text-muted-foreground'}>
                      {item.quantity_difference ?? '-'}
                    </span>
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Keine Items gefunden.</p>
        )}
      </Card>

      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title={accountantEmail ? 'An Steuerberater senden' : 'Inventur per Email'}
      >
        <form className="space-y-4" onSubmit={handleSendEmail}>
          <Input
            label="Email-Adresse"
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="bg-background"
          />
          <Input
            label="Betreff (optional)"
            name="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="bg-background"
          />
          <Textarea
            label="Nachricht (optional)"
            name="message"
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="bg-background"
          />
          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" loading={isSending}>
              Senden
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowEmailModal(false)}
            >
              Abbrechen
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
