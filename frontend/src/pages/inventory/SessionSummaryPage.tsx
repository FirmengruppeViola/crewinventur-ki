import { type FormEvent, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Loading } from '../../components/ui/Loading'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Textarea } from '../../components/ui/Textarea'
import { useLocation as useLocationData } from '../../features/locations/useLocations'
import { useProducts } from '../../features/products/useProducts'
import { useInventorySession, useSessionItems } from '../../features/inventory/useInventory'
import { useAuth } from '../../features/auth/useAuth'
import { apiRequest, API_BASE_URL } from '../../lib/api'
import { useUiStore } from '../../stores/uiStore'

export function SessionSummaryPage() {
  const { id } = useParams()
  const sessionId = id ?? ''
  const { session: authSession } = useAuth()
  const addToast = useUiStore((state) => state.addToast)
  const { data: session, isLoading } = useInventorySession(sessionId)
  const { data: items } = useSessionItems(sessionId)
  const { data: products } = useProducts()

  const location = useLocationData(session?.location_id)
  const productMap = new Map(products?.map((product) => [product.id, product]) ?? [])
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  if (isLoading || !session) {
    return <Loading fullScreen />
  }

  const downloadFile = async (format: 'pdf' | 'csv' | 'csv-summary') => {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/export/session/${sessionId}/${format}`,
      {
        headers: authSession?.access_token
          ? { Authorization: `Bearer ${authSession.access_token}` }
          : {},
      },
    )
    if (!response.ok) {
      addToast('Download fehlgeschlagen.', 'error')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    if (format === 'csv-summary') {
      link.download = `inventory-${sessionId}-summary.csv`
    } else {
      link.download = `inventory-${sessionId}.${format}`
    }
    link.click()
    URL.revokeObjectURL(url)
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
          <Button variant="secondary" size="sm" onClick={() => setShowEmailModal(true)}>
            An Steuerberater senden
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
        title="Inventur per Email"
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
