import { useMemo, useState } from 'react'
import { Plus, Search, Filter, Package, ScanLine, Edit2, X, Barcode, Sparkles } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { BottomSheet } from '../../components/ui/BottomSheet'
import { ListPageSkeleton } from '../../components/ui/Skeleton'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, type Product } from '../../features/products/useProducts'
import { useCategories } from '../../features/products/useCategories'
import { useUiStore } from '../../stores/uiStore'

export function ProductsPage() {
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const addToast = useUiStore((state) => state.addToast)
  
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
  
  const handleOpenDetail = (product: Product) => {
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
    } catch {
      addToast('Speichern fehlgeschlagen.', 'error')
    }
  }
  
  const handleDelete = async () => {
    if (!selectedProductId) return
    try {
      await deleteProduct.mutateAsync()
      addToast('Produkt gelöscht.', 'success')
      handleClose()
    } catch {
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
      <header className="px-1 flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Produkte</h1>
          <p className="text-sm text-muted-foreground">
            Dein Katalog. Durchsuchbar und griffbereit.
          </p>
        </div>
        <div className="flex gap-2">
           <Button size="icon" variant="secondary" className="rounded-full h-12 w-12 hover:scale-105 transition-transform" onClick={() => addToast('Scanner gestartet... (Mock)', 'info')}>
              <ScanLine className="h-5 w-5" />
           </Button>
           <Button size="icon" className="rounded-full h-12 w-12 shadow-glow hover:scale-105 active:scale-95 transition-all" onClick={handleOpenCreate}>
             <Plus className="h-6 w-6" />
           </Button>
        </div>
      </header>
      
      <div className="grid gap-3 sm:grid-cols-2 sticky top-0 z-20 glass border-b border-border/50 safe-area-top">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="productSearch"
            placeholder="Suchen..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9 bg-secondary/30 focus:bg-background"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
          <Select
            name="productCategory"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            options={categoryOptions}
            className="pl-9 bg-secondary/30 focus:bg-background"
          />
        </div>
      </div>
      
      {products && products.length > 0 ? (
        <div className="grid gap-4 animate-fade-in-up delay-100">
          {products.map((product, index) => (
            <Card 
              key={product.id} 
              variant="glass"
              hoverable
              onClick={() => handleOpenDetail(product)}
              style={{ animationDelay: `${index * 30}ms` }}
            >
               <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                   <Package className="h-6 w-6" />
               </div>
               <div className="flex-1 overflow-hidden">
                  <h3
                    className="truncate font-semibold text-foreground"
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
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up delay-100">
          <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 mb-4 animate-float">
            <Package className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Keine Produkte</h3>
          <p className="text-muted-foreground mt-2">
            {query || categoryId !== 'all' 
              ? 'Keine Ergebnisse gefunden.'
              : 'Leg los und füllle dein Regal.'}
          </p>
        </div>
      )}
      
      <BottomSheet isOpen={isSheetOpen} onClose={handleClose}>
        <div className="space-y-6 pb-6">
          <header className="flex items-center justify-between border-b border-border pb-4">
             <div>
                 <h2 className="text-xl font-bold text-foreground truncate max-w-[280px]">
                   {isCreating ? 'Neues Produkt' : selectedProduct?.name}
                 </h2>
                 {!isCreating && !isEditMode && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                     <Barcode className="h-3 w-3" /> {selectedProduct?.barcode || 'Kein Barcode'}
                    </p>
                 )}
             </div>
             {!isCreating && !isEditMode && (
               <Button size="sm" variant="ghost" onClick={() => setIsEditMode(true)} className="hover:bg-primary/10">
                 <Edit2 className="h-4 w-4" />
               </Button>
             )}
              {isEditMode && !isCreating && (
               <Button size="sm" variant="ghost" onClick={() => setIsEditMode(false)} className="hover:bg-primary/10">
                 <X className="h-4 w-4" />
               </Button>
             )}
          </header>
          
          {isEditMode ? (
            <div className="space-y-5 animate-fade-in-up">
              <Input 
                label="Name" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="z.B. Havana Club"
              />
              <div className="grid grid-cols-2 gap-4">
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
              
              <div className="flex gap-3 pt-2">
                <Button className="flex-1 shadow-glow" onClick={handleSave}>Speichern</Button>
                {!isCreating && (
                   <Button variant="danger" className="flex-1" onClick={handleDelete}>Löschen</Button>
                 )}
               </div>
            </div>
          ) : (
             <div className="space-y-6 animate-fade-in-up">
               <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-secondary/40 p-5 hover:bg-secondary/50 transition-colors">
                     <p className="text-xs text-muted-foreground mb-1">Marke</p>
                     <p className="font-semibold text-foreground">{selectedProduct?.brand || '-'}</p>
                  </div>
                  <div className="rounded-2xl bg-secondary/40 p-5 hover:bg-secondary/50 transition-colors">
                     <p className="text-xs text-muted-foreground mb-1">Größe</p>
                     <p className="font-semibold text-foreground">{selectedProduct?.size || '-'}</p>
                  </div>
               </div>
 
               {selectedProduct?.ai_confidence && (
                 <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      KI Erkennung
                    </span>
                    <span className="text-sm font-bold text-primary">{(selectedProduct.ai_confidence * 100).toFixed(0)}%</span>
                 </div>
               )}
 
               <Button className="w-full h-12 shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-all" onClick={() => setIsEditMode(true)}>
                 <Edit2 className="mr-2 h-5 w-5" />
                 Bearbeiten
               </Button>
             </div>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}
