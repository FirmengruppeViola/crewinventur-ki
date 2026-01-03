import { useEffect, useState } from 'react'
import { Check, Crown, Sparkles, Zap } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { FormPageSkeleton } from '../../components/ui/Skeleton'
import { useAuth } from '../../features/auth/useAuth'
import { apiRequest } from '../../lib/api'

type Plan = {
  id: string
  name: string
  price: number
  currency: string
  features: string[]
  is_current: boolean
}

type Subscription = {
  plan: string
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
}

export function BillingPage() {
  const { session } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.access_token) return

    const loadData = async () => {
      try {
        const [plansData, subData] = await Promise.all([
          apiRequest<Plan[]>('/api/v1/billing/plans', { method: 'GET' }, session.access_token),
          apiRequest<Subscription>('/api/v1/billing/subscription', { method: 'GET' }, session.access_token),
        ])
        setPlans(plansData)
        setSubscription(subData)
      } catch (error) {
        console.error('Failed to load billing data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [session?.access_token])

  if (loading) {
    return <FormPageSkeleton />
  }

  const currentPlan = plans.find(p => p.is_current) || plans[0]
  const proPlan = plans.find(p => p.id === 'pro')

  return (
    <div className="space-y-6">
      <header className="px-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Abonnement</h1>
        <p className="text-sm text-muted-foreground">Verwalte deinen Plan und Zahlungen.</p>
      </header>

      {/* Current Plan */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${currentPlan?.id === 'pro' ? 'bg-primary/20' : 'bg-muted'}`}>
              {currentPlan?.id === 'pro' ? (
                <Crown className="h-5 w-5 text-primary" />
              ) : (
                <Zap className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">{currentPlan?.name} Plan</p>
              <p className="text-sm text-muted-foreground">
                {currentPlan?.id === 'free'
                  ? 'Kostenlos'
                  : `${currentPlan?.price.toFixed(2)} €/Monat`}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            subscription?.status === 'active'
              ? 'bg-emerald-500/10 text-emerald-500'
              : 'bg-amber-500/10 text-amber-500'
          }`}>
            {subscription?.status === 'active' ? 'Aktiv' : subscription?.status}
          </span>
        </div>

        {subscription?.cancel_at_period_end && (
          <p className="mt-3 text-sm text-amber-500">
            Wird zum {new Date(subscription.current_period_end || '').toLocaleDateString()} gekündigt
          </p>
        )}
      </Card>

      {/* Upgrade Banner - only show if on free plan */}
      {currentPlan?.id === 'free' && proPlan && (
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-indigo-500/5 p-6">
          <div className="absolute top-0 right-0 p-3">
            <Sparkles className="h-6 w-6 text-primary/30" />
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-primary/20">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground">Upgrade auf Pro</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Unbegrenzte Standorte, Produkte und Inventuren für nur {proPlan.price.toFixed(2)} €/Monat
              </p>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {proPlan.features.slice(0, 4).map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button className="mt-5" disabled>
                <Crown className="mr-2 h-4 w-4" />
                Demnächst verfügbar
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Stripe-Integration wird aktuell eingerichtet.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Plan Comparison */}
      <div className="grid gap-4 md:grid-cols-2">
        {plans.filter(p => p.id !== 'enterprise').map((plan) => (
          <Card
            key={plan.id}
            className={`p-5 ${plan.is_current ? 'border-primary/50 bg-primary/5' : ''}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
              {plan.is_current && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                  Aktuell
                </span>
              )}
            </div>

            <div className="mb-4">
              <span className="text-3xl font-bold text-foreground">
                {plan.price === 0 ? 'Kostenlos' : `${plan.price.toFixed(2)} €`}
              </span>
              {plan.price > 0 && (
                <span className="text-muted-foreground">/Monat</span>
              )}
            </div>

            <ul className="space-y-2">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {/* Info */}
      <Card className="p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground text-center">
          Während der Beta-Phase ist die App kostenlos nutzbar.
          Stripe-Billing wird in Kürze aktiviert.
        </p>
      </Card>
    </div>
  )
}
