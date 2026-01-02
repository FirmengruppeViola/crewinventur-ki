import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../features/auth/useAuth'
import { useUiStore } from '../../stores/uiStore'

const schema = z.object({
  email: z.string().email('Bitte eine gueltige Email eingeben.'),
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben.'),
})

type LoginFormValues = z.infer<typeof schema>

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const addToast = useUiStore((state) => state.addToast)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null)
    const { error } = await signIn(values)
    if (error) {
      setFormError(error)
      return
    }
    addToast('Erfolgreich eingeloggt.', 'success')
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Willkommen zurueck</h1>
          <p className="mt-2 text-sm text-gray-600">
            Melde dich mit deinen Zugangsdaten an.
          </p>
        </header>

        <Card>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Email"
              type="email"
              placeholder="name@firma.de"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Passwort"
              type="password"
              placeholder="********"
              error={errors.password?.message}
              {...register('password')}
            />

            {formError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {formError}
              </p>
            ) : null}

            <Button type="submit" loading={isSubmitting} className="w-full">
              Einloggen
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <Link to="/forgot-password" className="text-blue-600 hover:underline">
              Passwort vergessen?
            </Link>
            <Link to="/register" className="text-blue-600 hover:underline">
              Noch kein Konto?
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
