import { useState } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../../features/auth/useAuth'

const schema = z.object({
  email: z.string().email('Bitte eine gueltige Email eingeben.'),
})

type ForgotFormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: ForgotFormValues) => {
    setFormError(null)
    const { error } = await resetPassword(values.email)
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
          <h1 className="text-2xl font-bold text-gray-900">
            Passwort zuruecksetzen
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Wir senden dir einen Link zum Zuruecksetzen.
          </p>
        </header>

        <Card>
          {success ? (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              Checke dein Postfach fuer den Reset-Link.
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

            {formError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {formError}
              </p>
            ) : null}

            <Button type="submit" loading={isSubmitting} className="w-full">
              Link senden
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            <Link to="/login" className="text-blue-600 hover:underline">
              Zurueck zum Login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
