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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
       {/* Background Decoration */}
       <div className="absolute bottom-[-10%] left-[-5%] h-[400px] w-[400px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md flex flex-col gap-8 relative z-10">
        <header className="text-center">
          <Link to="/" className="inline-block mb-6 text-2xl font-bold bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
            CrewChecker
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Account erstellen</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Starte deine kostenlose Testphase.
          </p>
        </header>

        <Card className="border-white/5 bg-card/50 backdrop-blur-sm shadow-xl">
          {success ? (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-4 text-sm text-emerald-500 text-center">
              <p className="font-semibold mb-1">Fast geschafft!</p>
              <p>Bitte bestätige deine Email-Adresse, um dich anzumelden.</p>
            </div>
          ) : (
             <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <Input
                label="Email"
                type="email"
                placeholder="name@firma.de"
                error={errors.email?.message}
                {...register('email')}
                className="bg-background/50"
              />
              <Input
                label="Display Name (optional)"
                type="text"
                placeholder="Restaurant Name"
                error={errors.displayName?.message}
                {...register('displayName')}
                className="bg-background/50"
              />
              <Input
                label="Passwort"
                type="password"
                placeholder="********"
                error={errors.password?.message}
                {...register('password')}
                className="bg-background/50"
              />
              <Input
                label="Passwort bestaetigen"
                type="password"
                placeholder="********"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
                className="bg-background/50"
              />

              <div className="space-y-2 pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-input bg-background text-primary focus:ring-primary focus:ring-offset-background"
                    {...register('acceptTerms')}
                  />
                  <span className="text-sm text-muted-foreground">
                    Ich habe die AGB gelesen und akzeptiere sie vollumfänglich.
                  </span>
                </label>
                {errors.acceptTerms?.message ? (
                  <p className="text-xs text-destructive pl-7">
                    {errors.acceptTerms.message}
                  </p>
                ) : null}
              </div>

              {formError ? (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              ) : null}

              <Button type="submit" loading={isSubmitting} className="w-full h-11 text-base shadow-lg shadow-primary/20">
                Registrieren
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Schon ein Konto?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary/80 hover:underline transition-colors">
              Einloggen
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
