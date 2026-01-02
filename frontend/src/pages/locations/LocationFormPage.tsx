import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Loading } from '../../components/ui/Loading'
import {
  useCreateLocation,
  useLocation,
  useUpdateLocation,
  useDeleteLocation,
} from '../../features/locations/useLocations'
import { useUiStore } from '../../stores/uiStore'

const schema = z.object({
  name: z.string().min(1, 'Name ist erforderlich.').max(100, 'Maximal 100 Zeichen.'),
  description: z.string().optional(),
})

type LocationFormValues = z.infer<typeof schema>

export function LocationFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addToast = useUiStore((state) => state.addToast)

  const isEdit = Boolean(id)
  const { data, isLoading } = useLocation(id)
  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation(id ?? '')
  const deleteLocation = useDeleteLocation(id ?? '')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  })

  useEffect(() => {
    if (data && isEdit) {
      reset({
        name: data.name,
        description: data.description ?? '',
      })
    }
  }, [data, isEdit, reset])

  const onSubmit = async (values: LocationFormValues) => {
    try {
      if (isEdit && id) {
        await updateLocation.mutateAsync({
          name: values.name.trim(),
          description: values.description?.trim() || null,
        })
        addToast('Location gespeichert.', 'success')
        navigate(`/locations/${id}`)
      } else {
        const created = await createLocation.mutateAsync({
          name: values.name.trim(),
          description: values.description?.trim() || null,
        })
        addToast('Location erstellt.', 'success')
        navigate(`/locations/${created.id}`)
      }
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Speichern fehlgeschlagen.',
        'error',
      )
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteLocation.mutateAsync()
      addToast('Location geloescht.', 'success')
      navigate('/locations')
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Loeschen fehlgeschlagen.',
        'error',
      )
    }
  }

  if (isEdit && isLoading) {
    return <Loading fullScreen />
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Location bearbeiten' : 'Neue Location'}
        </h1>
        <p className="text-sm text-gray-600">
          Name und optionale Beschreibung fuer den Standort.
        </p>
      </header>

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Name"
            placeholder="Bar"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Beschreibung"
            placeholder="Optional"
            error={errors.description?.message}
            {...register('description')}
          />

          <Button type="submit" loading={isSubmitting}>
            Speichern
          </Button>
        </form>
      </Card>

      {isEdit ? (
        <Card>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleteLocation.isPending}
          >
            Location loeschen
          </Button>
        </Card>
      ) : null}
    </div>
  )
}
