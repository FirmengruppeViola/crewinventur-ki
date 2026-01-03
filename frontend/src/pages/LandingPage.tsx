import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ScanLine } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-6 py-12 selection:bg-primary/20">
      {/* Background Gradients */}
      <div className="absolute -top-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] -right-[10%] h-[500px] w-[500px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-16 pt-10 md:pt-20">
        <header className="flex flex-col items-center gap-6 text-center">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            CrewInventurKI 2.0
          </div>
          
          <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-foreground md:text-7xl">
            Inventur auf <br />
            <span className="bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">Autopilot</span>
          </h1>
          
          <p className="max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed">
            Produkte fotografieren. KI erkennt den Rest. 
            Schnell, mobil und für echte Gastronomie gemacht.
            Vergiss Excel-Listen und Klemmbretter.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link viewTransition to="/register">
              <Button size="lg" className="h-14 px-8 text-lg rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all">
                Jetzt starten <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link viewTransition to="/login">
              <Button size="lg" variant="secondary" className="h-14 px-8 text-lg rounded-2xl bg-card hover:bg-accent border border-white/5">
                Einloggen
              </Button>
            </Link>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <Card className="relative overflow-hidden border-white/5 bg-white/5 backdrop-blur-sm p-6 transition-all hover:-translate-y-1 hover:bg-white/10">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <ScanLine className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-foreground">1. Foto aufnehmen</h3>
            <p className="text-muted-foreground">
              Scanne Flaschen, Kisten oder ganze Regale direkt mit dem Handy. Unsere KI sieht alles.
            </p>
          </Card>
          
          <Card className="relative overflow-hidden border-white/5 bg-white/5 backdrop-blur-sm p-6 transition-all hover:-translate-y-1 hover:bg-white/10">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <span className="text-2xl font-bold">AI</span>
            </div>
            <h3 className="mb-2 text-xl font-bold text-foreground">2. Automatische Erkennung</h3>
            <p className="text-muted-foreground">
              Marke, Name und Füllstand werden automatisch erkannt. Du musst nur noch bestätigen.
            </p>
          </Card>
          
          <Card className="relative overflow-hidden border-white/5 bg-white/5 backdrop-blur-sm p-6 transition-all hover:-translate-y-1 hover:bg-white/10">
             <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-foreground">3. Fertig & Export</h3>
            <p className="text-muted-foreground">
              Sofortiger Export als PDF oder Excel. Perfekt für den Steuerberater oder die Buchhaltung.
            </p>
          </Card>
        </section>
        
        <footer className="mt-10 border-t border-white/5 pt-8 text-center text-sm text-muted-foreground space-y-3">
          <div className="flex justify-center gap-6">
            <Link viewTransition to="/terms" className="hover:text-foreground transition-colors">AGB</Link>
            <Link viewTransition to="/privacy" className="hover:text-foreground transition-colors">Datenschutz</Link>
            <Link viewTransition to="/imprint" className="hover:text-foreground transition-colors">Impressum</Link>
          </div>
          <p>&copy; 2026 CrewInventur. KI-gestützte Inventur für die Gastronomie.</p>
        </footer>
      </div>
    </div>
  )
}

