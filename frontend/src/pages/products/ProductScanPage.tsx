import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Loading } from '../../components/ui/Loading'
import { useAuth } from '../../features/auth/useAuth'
import { useCamera } from '../../features/camera/useCamera'
import { useBarcodeScanner } from '../../features/scanner/useBarcodeScanner'
import { useCreateProduct } from '../../features/products/useProducts'
import { apiRequest } from '../../lib/api'
import { useUiStore } from '../../stores/uiStore'

type RecognitionResult = {
  product: {
    brand: string
    product_name: string
    variant?: string | null
    size_display: string
    category: string
    confidence: number
    barcode?: string | null
  }
  existing_match?: { id: string } | null
  is_new: boolean
}

export function ProductScanPage() {
  const { session } = useAuth()
  const { takePhoto, pickFromGallery } = useCamera()
  const { scanBarcode, isSupported } = useBarcodeScanner()
  const createProduct = useCreateProduct()
  const addToast = useUiStore((state) => state.addToast)
  const navigate = useNavigate()

  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecognitionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runRecognition = async (base64: string) => {
    if (!session?.access_token) return
    setLoading(true)
    setError(null)
    try {
      const response = await apiRequest<RecognitionResult>(
        '/api/v1/ai/recognize-product',
        {
          method: 'POST',
          body: JSON.stringify({ image: base64 }),
        },
        session.access_token,
      )
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erkennung fehlgeschlagen.')
    } finally {
      setLoading(false)
    }
  }

  const handleTakePhoto = async () => {
    const base64 = await takePhoto()
    if (!base64) return
    setImageBase64(base64)
    runRecognition(base64)
  }

  const handlePick = async () => {
    const base64 = await pickFromGallery()
    if (!base64) return
    setImageBase64(base64)
    runRecognition(base64)
  }

  const handleBarcode = async () => {
    try {
      const code = await scanBarcode()
      if (!code) return
      const product = await apiRequest<{ id: string }>(
        `/api/v1/products/barcode/${code}`,
        { method: 'GET' },
        session?.access_token ?? undefined,
      )
      navigate(`/products/${product.id}`)
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Barcode nicht gefunden.',
        'error',
      )
    }
  }

  const handleAccept = async () => {
    if (!result) return
    const payload = {
      name: result.product.product_name,
      brand: result.product.brand,
      variant: result.product.variant ?? null,
      size: result.product.size_display,
      unit: 'Stueck',
      barcode: result.product.barcode ?? null,
    }
    try {
      const created = await createProduct.mutateAsync(payload)
      addToast('Produkt gespeichert.', 'success')
      navigate(`/products/${created.id}`)
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Speichern fehlgeschlagen.',
        'error',
      )
    }
  }

  const handleCorrect = () => {
    if (!result) return
    navigate('/products/new', {
      state: {
        prefill: {
          name: result.product.product_name,
          brand: result.product.brand,
          variant: result.product.variant ?? '',
          size: result.product.size_display,
          unit: 'Stueck',
          barcode: result.product.barcode ?? '',
        },
      },
    })
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Produkt scannen</h1>
        <p className="text-sm text-gray-600">
          Foto aufnehmen oder Barcode nutzen.
        </p>
      </header>

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={handleTakePhoto}>Foto machen</Button>
          <Button variant="secondary" onClick={handlePick}>
            Galerie oeffnen
          </Button>
          <Button variant="secondary" onClick={handleBarcode} disabled={!isSupported}>
            Barcode scannen
          </Button>
        </div>
      </Card>

      {loading ? <Loading /> : null}
      {error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : null}

      {imageBase64 ? (
        <Card title="Vorschau">
          <img
            src={`data:image/jpeg;base64,${imageBase64}`}
            alt="Produkt"
            className="h-48 w-full rounded-lg object-cover"
          />
        </Card>
      ) : null}

      {result ? (
        <Card title="Ergebnis">
          <div className="space-y-2 text-sm text-gray-700">
            <p>Produkt: {result.product.product_name}</p>
            <p>Marke: {result.product.brand}</p>
            <p>Groesse: {result.product.size_display}</p>
            <p>Kategorie: {result.product.category}</p>
            <p>Confidence: {Math.round(result.product.confidence * 100)}%</p>
          </div>
          {!result.is_new && result.existing_match ? (
            <p className="mt-2 text-xs text-blue-600">
              Produkt existiert bereits. Du kannst direkt zum Eintrag wechseln.
            </p>
          ) : null}
          {result.product.confidence < 0.6 ? (
            <p className="mt-3 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
              Niedrige Sicherheit. Bitte pruefen.
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleAccept} loading={createProduct.isPending}>
              Uebernehmen
            </Button>
            {result.existing_match ? (
              <Button
                variant="secondary"
                onClick={() => navigate(`/products/${result.existing_match?.id}`)}
              >
                Zum Produkt
              </Button>
            ) : null}
            <Button variant="secondary" onClick={handleCorrect}>
              Korrigieren
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
