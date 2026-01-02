import { useEffect, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Loading } from '../../components/ui/Loading'
import { useAuth } from '../../features/auth/useAuth'
import { apiRequest } from '../../lib/api'
import { useUiStore } from '../../stores/uiStore'

type Profile = {
  id: string
  email: string
  display_name: string | null
  company_name: string | null
}

const schema = z.object({
  displayName: z.string().optional(),
  companyName: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof schema>

export function ProfilePage() {
  const { session, signOut } = useAuth()
  const addToast = useUiStore((state) => state.addToast)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!session?.access_token) return

    const loadProfile = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const data = await apiRequest<Profile>(
          '/api/v1/profile',
          { method: 'GET' },
          session.access_token,
        )
        setProfile(data)
        reset({
          displayName: data.display_name ?? '',
          companyName: data.company_name ?? '',
        })
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : 'Profil laden fehlgeschlagen.',
        )
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [reset, session?.access_token])

  const onSubmit = async (values: ProfileFormValues) => {
    if (!session?.access_token) return
    try {
      const payload = {
        display_name: values.displayName?.trim() || null,
        company_name: values.companyName?.trim() || null,
      }
      const data = await apiRequest<Profile>(
        '/api/v1/profile',
        { method: 'PUT', body: JSON.stringify(payload) },
        session.access_token,
      )
      setProfile(data)
      addToast('Profil gespeichert.', 'success')
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Profil speichern fehlgeschlagen.',
        'error',
      )
    }
  }

  const handleLogout = async () => {
    const { error } = await signOut()
    if (error) {
      addToast(error, 'error')
    }
  }

  if (loading) {
    return <Loading fullScreen />
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
        <p className="text-sm text-gray-600">Verwalte deine Account-Daten.</p>
      </header>

      {loadError ? (
        <Card>
          <p className="text-sm text-red-600">{loadError}</p>
        </Card>
      ) : null}

      <Card>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email"
            value={profile?.email ?? ''}
            readOnly
            disabled
          />
          <Input
            label="Display Name"
            placeholder="Name"
            error={errors.displayName?.message}
            {...register('displayName')}
          />
          <Input
            label="Firma"
            placeholder="Firma oder Standort"
            error={errors.companyName?.message}
            {...register('companyName')}
          />
          <Button type="submit" loading={isSubmitting}>
            Speichern
          </Button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Session</p>
            <p className="text-xs text-gray-500">
              {session?.user?.email ?? 'Nicht eingeloggt'}
            </p>
          </div>
          <Button variant="secondary" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </Card>
    </div>
  )
}
