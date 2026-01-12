import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ScanLine, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-6 py-12 selection:bg-primary/20">
      {/* Animated Background Gradients */}
      <div className="absolute -top-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-gradient-to-br from-primary/20 to-emerald-500/10 blur-[120px] animate-float pointer-events-none" />
      <div className="absolute top-[40%] -right-[10%] h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-accent/20 to-orange-500/10 blur-[100px] animate-float-delayed pointer-events-none" />
      <div className="absolute bottom-[10%] left-[20%] h-[300px] w-[300px] rounded-full bg-primary/10 blur-[80px] animate-float pointer-events-none" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-16 pt-10 md:pt-20">
        {/* Header Badge */}
        <header className="flex flex-col items-center gap-6 text-center animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary backdrop-blur-sm">
            <Sparkles className="h-4 w-4 animate-pulse-slow" />
            <span>CrewInventurKI 2.0</span>
          </div>
          
          <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-foreground md:text-7xl animate-fade-in-up delay-100">
            Inventur auf{' '}
            <span className="gradient-text">Autopilot</span>
          </h1>
          
          <p className="max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed animate-fade-in-up delay-200">
            Produkte fotografieren. KI erkennt den Rest.
            Schnell, mobil und für echte Gastronomie gemacht.
            Vergiss Excel-Listen und Klemmbretter.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center animate-fade-in-up delay-300">
            <Link to="/register">
              <Button size="xl" className="h-14 px-8 text-base rounded-2xl shadow-glow-lg hover:shadow-glow-lg hover:-translate-y-0.5 transition-all">
                Jetzt starten <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="xl" variant="secondary" className="h-14 px-8 text-base rounded-2xl glass-card hover:bg-white transition-all">
                Einloggen
              </Button>
            </Link>
          </div>
        </header>

        {/* Features Grid */}
        <section className="grid gap-6 md:grid-cols-3 animate-fade-in-up delay-400">
          <Card className="relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg group">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20 text-primary group-hover:scale-110 transition-transform">
              <ScanLine className="h-7 w-7" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-foreground">1. Foto aufnehmen</h3>
            <p className="text-muted-foreground leading-relaxed">
              Scanne Flaschen, Kisten oder ganze Regale direkt mit dem Handy. Unsere KI sieht alles.
            </p>
            <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors" />
          </Card>
          
          <Card className="relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg group delay-100">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-emerald-500/20 text-primary group-hover:scale-110 transition-transform">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-foreground">2. Automatische Erkennung</h3>
            <p className="text-muted-foreground leading-relaxed">
              Marke, Name und Füllstand werden automatisch erkannt. Du musst nur noch bestätigen.
            </p>
            <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors" />
          </Card>
          
          <Card className="relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg group delay-200">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-success/20 text-success group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-foreground">3. Fertig & Export</h3>
            <p className="text-muted-foreground leading-relaxed">
              Sofortiger Export als PDF oder Excel. Perfekt für den Steuerberater oder die Buchhaltung.
            </p>
            <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors" />
          </Card>
        </section>
        
        {/* Footer */}
        <footer className="mt-10 border-t border-border/50 pt-8 text-center text-sm text-muted-foreground space-y-4 animate-fade-in-up delay-500">
          <div className="flex justify-center gap-6">
            <Link to="/terms" className="hover:text-foreground hover:underline transition-colors">AGB</Link>
            <Link to="/privacy" className="hover:text-foreground hover:underline transition-colors">Datenschutz</Link>
            <Link to="/imprint" className="hover:text-foreground hover:underline transition-colors">Impressum</Link>
          </div>
          <p>&copy; 2026 CrewInventur. KI-gestützte Inventur für die Gastronomie.</p>
        </footer>
      </div>
    </div>
  )
}
