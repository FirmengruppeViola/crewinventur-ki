import { Link, useParams } from 'react-router-dom'
import { useViewNavigate } from '../../hooks/useViewNavigate'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { DetailPageSkeleton } from '../../components/ui/Skeleton'
import { useDeleteProduct, useProduct } from '../../features/products/useProducts'
import { useUiStore } from '../../stores/uiStore'

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useViewNavigate()
  const addToast = useUiStore((state) => state.addToast)
  const { data, isLoading, error } = useProduct(id)
  const deleteProduct = useDeleteProduct(id ?? '')

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteProduct.mutateAsync()
      addToast('Produkt geloescht.', 'success')
      navigate('/products')
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Loeschen fehlgeschlagen.',
        'error',
      )
    }
  }

  if (isLoading) {
    return <DetailPageSkeleton />
  }

  if (error) {
    return (
      <Card>
        <p className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Produkt laden fehlgeschlagen.'}
        </p>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <p className="text-sm text-gray-600">Produkt nicht gefunden.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="text-sm text-gray-600">
            {[data.brand, data.size].filter(Boolean).join(' · ') || 'Ohne Details'}
          </p>
        </div>
        <Link viewTransition to="/products">
          <Button variant="secondary">Zurueck</Button>
        </Link>
      </header>

      <Card title="Details">
        <div className="space-y-2 text-sm text-gray-700">
          <p>Marke: {data.brand || '-'}</p>
          <p>Variante: {data.variant || '-'}</p>
          <p>Groesse: {data.size || '-'}</p>
          <p>Einheit: {data.unit || '-'}</p>
          <p>Barcode: {data.barcode || '-'}</p>
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link viewTransition to={`/products/${data.id}/edit`}>
          <Button>Bearbeiten</Button>
        </Link>
        <Button
          variant="danger"
          onClick={handleDelete}
          loading={deleteProduct.isPending}
        >
          Loeschen
        </Button>
      </div>
    </div>
  )
}

