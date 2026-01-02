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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md flex flex-col gap-8">
        <header className="text-center">
          <Link to="/" className="inline-block mb-6 text-2xl font-bold bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
            CrewChecker
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            Passwort zurücksetzen
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Keine Panik. Wir senden dir einen Link.
          </p>
        </header>

        <Card className="border-white/5 bg-card/50 backdrop-blur-sm shadow-xl">
          {success ? (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-4 text-sm text-emerald-500 text-center">
              <p>Email gesendet!</p>
              <p className="mt-1">Checke dein Postfach für den Reset-Link.</p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <Input
                label="Email"
                type="email"
                placeholder="name@firma.de"
                error={errors.email?.message}
                {...register('email')}
                className="bg-background/50"
              />

              {formError ? (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}

              <Button type="submit" loading={isSubmitting} className="w-full h-11 text-base shadow-lg shadow-primary/20">
                Link senden
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:text-primary/80 hover:underline transition-colors">
              Zurück zum Login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
