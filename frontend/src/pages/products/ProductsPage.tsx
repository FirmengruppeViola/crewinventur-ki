import { useMemo, useState } from 'react'
import { Plus, Search, Filter, Package, ScanLine, Edit2, X, Barcode } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '../../features/products/useProducts'
import { useCategories } from '../../features/products/useCategories'
import { useUiStore } from '../../stores/uiStore'

export function ProductsPage() {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const addToast = useUiStore((state) => state.addToast)

  // Sheet State
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const { data: categories } = useCategories()
  const { data: products, isLoading } = useProducts({
    query: query.trim() || undefined,
    categoryId: categoryId === 'all' ? undefined : categoryId,
  })

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct(selectedProductId ?? '')
  const deleteProduct = useDeleteProduct(selectedProductId ?? '')

  // Form Data
  const [formData, setFormData] = useState({ name: '', brand: '', size: '', barcode: '' })

  const categoryOptions = useMemo(() => {
    const base = [{ label: 'Alle Kategorien', value: 'all' }]
    const options =
      categories?.map((category) => ({
        label: category.name,
        value: category.id,
      })) ?? []
    return [...base, ...options]
  }, [categories])

  const selectedProduct = products?.find(p => p.id === selectedProductId)
  const isSheetOpen = !!selectedProductId || isCreating

  const handleOpenCreate = () => {
    setFormData({ name: '', brand: '', size: '', barcode: '' })
    setIsCreating(true)
    setIsEditMode(true)
    setSelectedProductId(null)
  }

  const handleOpenDetail = (product: any) => {
    setFormData({ 
      name: product.name, 
      brand: product.brand || '', 
      size: product.size || '',
      barcode: product.barcode || ''
    })
    setSelectedProductId(product.id)
    setIsCreating(false)
    setIsEditMode(false)
  }

  const handleSave = async () => {
    try {
      const payload = {
        name: formData.name,
        brand: formData.brand || null,
        size: formData.size || null,
        barcode: formData.barcode || null
      }
      
      if (isCreating) {
        await createProduct.mutateAsync(payload)
        addToast('Produkt erstellt.', 'success')
      } else if (selectedProductId) {
        await updateProduct.mutateAsync(payload)
        addToast('Produkt aktualisiert.', 'success')
      }
      handleClose()
    } catch (err) {
      addToast('Speichern fehlgeschlagen.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!selectedProductId) return
    try {
      await deleteProduct.mutateAsync()
      addToast('Produkt gelöscht.', 'success')
      handleClose()
    } catch (err) {
      addToast('Löschen fehlgeschlagen.', 'error')
    }
  }

  const handleClose = () => {
    setSelectedProductId(null)
    setIsCreating(false)
    setIsEditMode(false)
  }

  if (isLoading) return <ListPageSkeleton />

  return (
    <div className="space-y-6 pb-40">
      <header className="px-1 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Produkte</h1>
          <p className="text-sm text-muted-foreground">
            Dein Katalog. Durchsuchbar und griffbereit.
          </p>
        </div>
        <div className="flex gap-2">
           <Button size="icon" variant="secondary" className="rounded-full h-12 w-12" onClick={() => addToast('Scanner startet... (Mock)', 'info')}>
             <ScanLine className="h-5 w-5" />
           </Button>
           <Button size="icon" className="rounded-full h-12 w-12 shadow-lg shadow-primary/20" onClick={handleOpenCreate}>
             <Plus className="h-6 w-6" />
           </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 sticky top-0 z-20 bg-background/80 backdrop-blur-md py-2 -mx-4 px-4 border-b border-border/50">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            name="productSearch"
            placeholder="Suchen..."
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
        <div className="grid gap-4">
          {products.map((product) => (
            <Card 
              key={product.id} 
              onClick={() => handleOpenDetail(product)}
              className="group flex cursor-pointer items-center gap-4 p-4 transition-all hover:bg-accent/50 active:scale-[0.99]"
            >
               <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/5 text-indigo-400 transition-transform group-hover:scale-110">
                  <Package className="h-6 w-6" />
               </div>
               <div className="flex-1 overflow-hidden">
                  <h3
                    className="truncate font-medium text-foreground"
                    style={{ viewTransitionName: `product-name-${product.id}` }}
                  >
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    {product.brand && (
                      <span className="rounded-md bg-secondary px-1.5 py-0.5 text-secondary-foreground">{product.brand}</span>
                    )}
                    {product.size && (
                      <span>{product.size}</span>
                    )}
                  </div>
               </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Keine Produkte"
          description="Leg los und fülle dein Regal."
          action={
            <Button onClick={handleOpenCreate}>
               <Plus className="mr-2 h-4 w-4" /> Erstes Produkt
            </Button>
          }
        />
      )}

      {/* Detail/Edit Sheet */}
      <BottomSheet isOpen={isSheetOpen} onClose={handleClose}>
        <div className="space-y-6 pb-6">
          <header className="flex items-center justify-between border-b border-border pb-4">
             <div>
                <h2 className="text-xl font-bold text-foreground truncate max-w-[250px]">
                  {isCreating ? 'Neues Produkt' : selectedProduct?.name}
                </h2>
                {!isCreating && !isEditMode && (
                   <p className="text-xs text-muted-foreground flex items-center gap-1">
                     <Barcode className="h-3 w-3" /> {selectedProduct?.barcode || 'Kein Barcode'}
                   </p>
                )}
             </div>
             {!isCreating && !isEditMode && (
               <Button size="sm" variant="ghost" onClick={() => setIsEditMode(true)}>
                 <Edit2 className="h-4 w-4" />
               </Button>
             )}
              {isEditMode && !isCreating && (
               <Button size="sm" variant="ghost" onClick={() => setIsEditMode(false)}>
                 <X className="h-4 w-4" />
               </Button>
             )}
          </header>

          {isEditMode ? (
            <div className="space-y-4 animate-fade-in">
              <Input 
                label="Name" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="z.B. Havana Club"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input 
                  label="Marke" 
                  value={formData.brand} 
                  onChange={e => setFormData({...formData, brand: e.target.value})}
                  placeholder="Havana"
                />
                <Input 
                  label="Größe" 
                  value={formData.size} 
                  onChange={e => setFormData({...formData, size: e.target.value})}
                  placeholder="0.7 l"
                />
              </div>
              <Input 
                  label="Barcode" 
                  value={formData.barcode} 
                  onChange={e => setFormData({...formData, barcode: e.target.value})}
                  placeholder="Scannen oder tippen..."
                />
              
              <div className="flex gap-3 pt-4">
                <Button className="flex-1" onClick={handleSave}>Speichern</Button>
                {!isCreating && (
                   <Button variant="danger" className="flex-1" onClick={handleDelete}>Löschen</Button>
                )}
              </div>
            </div>
          ) : (
             <div className="space-y-6 animate-fade-in">
                {/* Product Stats / Info Cards */}
                <div className="grid grid-cols-2 gap-3">
                   <div className="rounded-xl bg-accent/50 p-4">
                      <p className="text-xs text-muted-foreground mb-1">Marke</p>
                      <p className="font-semibold text-foreground">{selectedProduct?.brand || '-'}</p>
                   </div>
                   <div className="rounded-xl bg-accent/50 p-4">
                      <p className="text-xs text-muted-foreground mb-1">Größe</p>
                      <p className="font-semibold text-foreground">{selectedProduct?.size || '-'}</p>
                   </div>
                </div>

                {/* AI / Confidence Placeholder */}
                {selectedProduct?.ai_confidence && (
                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4 flex items-center justify-between">
                     <span className="text-sm text-indigo-300">KI Erkennung</span>
                     <span className="text-sm font-bold text-indigo-400">{(selectedProduct.ai_confidence * 100).toFixed(0)}%</span>
                  </div>
                )}

                <Button className="w-full h-12" onClick={() => setIsEditMode(true)}>
                  Bearbeiten
                </Button>
             </div>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}
