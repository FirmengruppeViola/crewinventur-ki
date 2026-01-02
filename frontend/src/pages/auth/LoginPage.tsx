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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
       {/* Background Decoration */}
       <div className="absolute top-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
       
      <div className="w-full max-w-md flex flex-col gap-8 relative z-10">
        <header className="text-center">
          <Link to="/" className="inline-block mb-6 text-2xl font-bold bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
            CrewChecker
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Willkommen zurück</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Melde dich mit deinen Zugangsdaten an.
          </p>
        </header>

        <Card className="border-white/5 bg-card/50 backdrop-blur-sm shadow-xl">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Email"
              type="email"
              placeholder="name@firma.de"
              error={errors.email?.message}
              {...register('email')}
              className="bg-background/50"
            />
            <div className="space-y-1.5">
               <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Passwort</label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                    Vergessen?
                  </Link>
               </div>
               <Input
                type="password"
                placeholder="********"
                error={errors.password?.message}
                {...register('password')}
                className="bg-background/50"
              />
            </div>

            {formError ? (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            ) : null}

            <Button type="submit" loading={isSubmitting} className="w-full h-11 text-base shadow-lg shadow-primary/20">
              Einloggen
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Noch kein Konto?{' '}
            <Link to="/register" className="font-medium text-primary hover:text-primary/80 hover:underline transition-colors">
              Jetzt registrieren
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
