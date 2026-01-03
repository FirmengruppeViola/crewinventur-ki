import { useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useViewNavigate } from '../../hooks/useViewNavigate'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { FormPageSkeleton } from '../../components/ui/Skeleton'
import {
  useCreateProduct,
  useProduct,
  useUpdateProduct,
} from '../../features/products/useProducts'
import { useCategories } from '../../features/products/useCategories'
import { useUiStore } from '../../stores/uiStore'

const schema = z.object({
  name: z.string().min(1, 'Name ist erforderlich.'),
  brand: z.string().optional(),
  variant: z.string().optional(),
  size: z.string().optional(),
  unit: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
})

type ProductFormValues = z.infer<typeof schema>

type PrefillState = {
  prefill?: Partial<ProductFormValues>
}

export function ProductFormPage() {
  const { id } = useParams()
  const navigate = useViewNavigate()
  const location = useLocation()
  const addToast = useUiStore((state) => state.addToast)
  const isEdit = Boolean(id)

  const { data, isLoading } = useProduct(id)
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct(id ?? '')
  const { data: categories } = useCategories()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    const state = location.state as PrefillState | null
    if (state?.prefill && !isEdit) {
      reset({
        name: state.prefill.name ?? '',
        brand: state.prefill.brand ?? '',
        variant: state.prefill.variant ?? '',
        size: state.prefill.size ?? '',
        unit: state.prefill.unit ?? '',
        barcode: state.prefill.barcode ?? '',
        categoryId: state.prefill.categoryId ?? '',
      })
    }
  }, [isEdit, location.state, reset])

  useEffect(() => {
    if (data && isEdit) {
      reset({
        name: data.name,
        brand: data.brand ?? '',
        variant: data.variant ?? '',
        size: data.size ?? '',
        unit: data.unit ?? '',
        barcode: data.barcode ?? '',
        categoryId: data.category_id ?? '',
      })
    }
  }, [data, isEdit, reset])

  const onSubmit = async (values: ProductFormValues) => {
    try {
      const payload = {
        name: values.name.trim(),
        brand: values.brand?.trim() || null,
        variant: values.variant?.trim() || null,
        size: values.size?.trim() || null,
        unit: values.unit?.trim() || null,
        barcode: values.barcode?.trim() || null,
        category_id: values.categoryId || null,
      }

      if (isEdit && id) {
        await updateProduct.mutateAsync(payload)
        addToast('Produkt gespeichert.', 'success')
        navigate(`/products/${id}`)
      } else {
        const created = await createProduct.mutateAsync(payload)
        addToast('Produkt erstellt.', 'success')
        navigate(`/products/${created.id}`)
      }
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Speichern fehlgeschlagen.',
        'error',
      )
    }
  }

  if (isEdit && isLoading) {
    return <FormPageSkeleton />
  }

  const categoryOptions = [
    { label: 'Keine Kategorie', value: '' },
    ...(categories?.map((category) => ({
      label: category.name,
      value: category.id,
    })) ?? []),
  ]

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Produkt bearbeiten' : 'Produkt anlegen'}
        </h1>
        <p className="text-sm text-gray-600">Pflege die Produktdetails.</p>
      </header>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Name"
            placeholder="Coca-Cola"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input label="Marke" placeholder="Coca-Cola" {...register('brand')} />
          <Input label="Variante" placeholder="Zero" {...register('variant')} />
          <Input label="Groesse" placeholder="0.33l" {...register('size')} />
          <Input label="Einheit" placeholder="Stueck" {...register('unit')} />
          <Input label="Barcode" placeholder="401111..." {...register('barcode')} />
          <Select
            label="Kategorie"
            options={categoryOptions}
            {...register('categoryId')}
          />

          <Button type="submit" loading={isSubmitting}>
            Speichern
          </Button>
        </form>
      </Card>
    </div>
  )
}
