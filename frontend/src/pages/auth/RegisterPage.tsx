import { useState } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../features/auth/useAuth'

const schema = z
  .object({
    email: z.string().email('Bitte eine gueltige Email eingeben.'),
    password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben.'),
    confirmPassword: z
      .string()
      .min(6, 'Passwort muss mindestens 6 Zeichen haben.'),
    displayName: z.string().optional(),
    acceptTerms: z.boolean(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwoerter stimmen nicht ueberein.',
  })
  .refine((values) => values.acceptTerms, {
    path: ['acceptTerms'],
    message: 'Bitte die AGB akzeptieren.',
  })

type RegisterFormValues = z.infer<typeof schema>

export function RegisterPage() {
  const { signUp } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { acceptTerms: false },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(null)
    const { error } = await signUp({
      email: values.email,
      password: values.password,
      displayName: values.displayName?.trim() || null,
    })
    if (error) {
      setFormError(error)
      return
    }
    setSuccess(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <header className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Account erstellen</h1>
          <p className="mt-2 text-sm text-gray-600">
            Erstelle dein Konto in wenigen Sekunden.
          </p>
        </header>

        <Card>
          {success ? (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              Danke! Bitte bestaetige deine Email, um dich anzumelden.
            </div>
          ) : null}

          <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Email"
              type="email"
              placeholder="name@firma.de"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Display Name (optional)"
              type="text"
              placeholder="Viola"
              error={errors.displayName?.message}
              {...register('displayName')}
            />
            <Input
              label="Passwort"
              type="password"
              placeholder="********"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Passwort bestaetigen"
              type="password"
              placeholder="********"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  {...register('acceptTerms')}
                />
                Ich akzeptiere die AGB.
              </label>
              {errors.acceptTerms?.message ? (
                <p className="text-xs text-red-600">
                  {errors.acceptTerms.message}
                </p>
              ) : null}
            </div>

            {formError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {formError}
              </p>
            ) : null}

            <Button type="submit" loading={isSubmitting} className="w-full">
              Registrieren
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            Schon ein Konto?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              Einloggen
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
