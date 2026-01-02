import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter, Package, ScanLine } from 'lucide-react'
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
    <div className="space-y-6 pb-20">
      <header className="px-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Produkte</h1>
        <p className="text-sm text-muted-foreground">
          Katalog verwalten und durchsuchen.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            name="productSearch"
            placeholder="Produkt suchen..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9 bg-card/50"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
          <Select
            name="productCategory"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            options={categoryOptions}
            className="pl-9 bg-card/50"
          />
        </div>
      </div>

      {products && products.length > 0 ? (
        <div className="grid gap-3">
          {products.map((product) => (
            <Link key={product.id} to={`/products/${product.id}`}>
              <Card className="group flex items-center gap-4 p-4 transition-all hover:bg-accent/50 active:scale-[0.99]">
                 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Package className="h-5 w-5" />
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <h3 className="truncate font-medium text-foreground">{product.name}</h3>
                    <p className="truncate text-xs text-muted-foreground">
                      {[product.brand, product.size].filter(Boolean).join(' · ') || 'Keine Details'}
                    </p>
                 </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Keine Produkte"
          description="Starte mit einem Scan oder lege ein Produkt manuell an."
          action={
            <div className="flex gap-2">
              <Link to="/products/scan">
                <Button>
                   <ScanLine className="mr-2 h-4 w-4" /> Scan
                </Button>
              </Link>
              <Link to="/products/new">
                <Button variant="outline">Manuell</Button>
              </Link>
            </div>
          }
        />
      )}

      <button
        type="button"
        onClick={() => setIsFabOpen(true)}
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary/90 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label="Produkt hinzufuegen"
      >
        <Plus className="h-6 w-6" />
      </button>

      <BottomSheet isOpen={isFabOpen} onClose={() => setIsFabOpen(false)}>
        <div className="space-y-3 pb-6">
          <Link to="/products/scan" onClick={() => setIsFabOpen(false)}>
            <Button className="w-full h-12 text-lg">
              <ScanLine className="mr-2 h-5 w-5" /> Mit Kamera scannen
            </Button>
          </Link>
          <Link to="/products/new" onClick={() => setIsFabOpen(false)}>
            <Button variant="secondary" className="w-full h-12 text-lg">
              <Plus className="mr-2 h-5 w-5" /> Manuell anlegen
            </Button>
          </Link>
        </div>
      </BottomSheet>
    </div>
  )
}
