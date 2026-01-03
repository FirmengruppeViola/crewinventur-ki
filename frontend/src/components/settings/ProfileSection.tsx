import { useEffect, useState } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Save, LogOut, Briefcase } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { FormPageSkeleton, SkeletonForm } from '../ui/Skeleton'
import { useAuth } from '../../features/auth/useAuth'
import { apiRequest } from '../../lib/api'
import { useUiStore } from '../../stores/uiStore'

type Profile = {
  id: string
  email: string
  display_name: string | null
  company_name: string | null
  accountant_name: string | null
  accountant_email: string | null
}

const schema = z.object({
  displayName: z.string().optional(),
  companyName: z.string().optional(),
  accountantName: z.string().optional(),
  accountantEmail: z.string().email('Ungueltige Email-Adresse').optional().or(z.literal('')),
})

type ProfileFormValues = z.infer<typeof schema>

type ProfileSectionProps = {
  variant?: 'page' | 'embedded'
}

export function ProfileSection({ variant = 'page' }: ProfileSectionProps) {
  const { session, signOut } = useAuth()
  const addToast = useUiStore((state) => state.addToast)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const isPage = variant === 'page'

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
          accountantName: data.accountant_name ?? '',
          accountantEmail: data.accountant_email ?? '',
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
        accountant_name: values.accountantName?.trim() || null,
        accountant_email: values.accountantEmail?.trim() || null,
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
    if (isPage) {
      return <FormPageSkeleton />
    }

    return (
      <div className="space-y-4">
        <header className="px-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Profil</h2>
          <p className="text-sm text-muted-foreground">Verwalte deine Account-Daten.</p>
        </header>
        <Card className="p-5">
          <SkeletonForm fields={4} />
        </Card>
      </div>
    )
  }

  return (
    <div className={isPage ? 'space-y-6' : 'space-y-5'}>
      <header className="px-1">
        {isPage ? (
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Profil</h1>
        ) : (
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Profil</h2>
        )}
        <p className="text-sm text-muted-foreground">Verwalte deine Account-Daten.</p>
      </header>

      {loadError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}

      <Card className="p-5">
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email"
            value={profile?.email ?? ''}
            readOnly
            disabled
            className="opacity-70"
          />
          <Input
            label="Display Name"
            placeholder="Dein Name"
            error={errors.displayName?.message}
            {...register('displayName')}
          />
          <Input
            label="Firma"
            placeholder="Firma oder Standort"
            error={errors.companyName?.message}
            {...register('companyName')}
          />

          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Steuerberater</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Hinterlege die Daten deines Steuerberaters, um Inventur-Exporte direkt per Email zu versenden.
            </p>
            <div className="space-y-4">
              <Input
                label="Name"
                placeholder="z.B. Steuerberatung Mueller"
                error={errors.accountantName?.message}
                {...register('accountantName')}
              />
              <Input
                label="Email"
                type="email"
                placeholder="steuerberater@beispiel.de"
                error={errors.accountantEmail?.message}
                {...register('accountantEmail')}
              />
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" /> Speichern
            </Button>
          </div>
        </form>
      </Card>

      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-medium text-foreground">Aktuelle Session</p>
          <p className="text-xs text-muted-foreground">
            Eingeloggt als {session?.user?.email ?? 'Gast'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-3.5 w-3.5" /> Logout
        </Button>
      </Card>
    </div>
  )
}
