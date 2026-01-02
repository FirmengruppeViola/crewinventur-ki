import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { Loading } from '../../components/ui/Loading'
import { useProducts } from '../../features/products/useProducts'
import { useCategories } from '../../features/products/useCategories'

export function ProductsPage() {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [isFabOpen, setIsFabOpen] = useState(false)

  const { data: categories } = useCategories()
  const { data: products, isLoading } = useProducts({
    query: query.trim() || undefined,
    categoryId: categoryId === 'all' ? undefined : categoryId,
  })

  const categoryOptions = useMemo(() => {
    const base = [{ label: 'Alle Kategorien', value: 'all' }]
    const options =
      categories?.map((category) => ({
        label: category.name,
        value: category.id,
      })) ?? []
    return [...base, ...options]
  }, [categories])

  if (isLoading) {
    return <Loading fullScreen />
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Produkte</h1>
        <p className="text-sm text-gray-600">
          Suche, scanne oder lege neue Produkte an.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Suche"
          name="productSearch"
          placeholder="Produktname oder Marke"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Select
          label="Kategorie"
          name="productCategory"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          options={categoryOptions}
        />
      </div>

      {products && products.length > 0 ? (
        <div className="grid gap-3">
          {products.map((product) => (
            <Link key={product.id} to={`/products/${product.id}`}>
              <Card title={product.name}>
                <p className="text-sm text-gray-600">
                  {[product.brand, product.size].filter(Boolean).join(' · ') || 'Ohne Details'}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Noch keine Produkte"
          description="Starte mit einem Scan oder lege ein Produkt manuell an."
          action={
            <div className="flex gap-2">
              <Link to="/products/scan">
                <Button>Scan</Button>
              </Link>
              <Link to="/products/new">
                <Button variant="secondary">Manuell</Button>
              </Link>
            </div>
          }
        />
      )}

      <button
        type="button"
        onClick={() => setIsFabOpen(true)}
        className="fixed bottom-24 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg"
        aria-label="Produkt hinzufuegen"
      >
        <Plus className="h-5 w-5" />
      </button>

      <BottomSheet isOpen={isFabOpen} onClose={() => setIsFabOpen(false)}>
        <div className="space-y-3">
          <Link to="/products/scan" onClick={() => setIsFabOpen(false)}>
            <Button className="w-full">Mit Kamera scannen</Button>
          </Link>
          <Link to="/products/new" onClick={() => setIsFabOpen(false)}>
            <Button variant="secondary" className="w-full">
              Manuell anlegen
            </Button>
          </Link>
        </div>
      </BottomSheet>
    </div>
  )
}
