import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            CrewInventurKI
          </p>
          <h1 className="text-4xl font-bold text-gray-900 md:text-5xl">
            KI-gestuetzte Inventur fuer moderne Gastronomie
          </h1>
          <p className="max-w-2xl text-base text-gray-600 md:text-lg">
            Produkte fotografieren, KI erkennt Marke und Groesse, du bestaetigst
            die Menge. Schnell, mobil und fuer echte Betriebe gemacht.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/register">
              <Button size="lg">Jetzt starten</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary">
                Einloggen
              </Button>
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card title="1. Foto aufnehmen">
            <p className="text-sm text-gray-600">
              Scanne Flaschen, Kisten oder ganze Regale direkt mit dem Handy.
            </p>
          </Card>
          <Card title="2. KI erkennt Produkte">
            <p className="text-sm text-gray-600">
              Marke, Name und Groesse werden automatisch vorgeschlagen.
            </p>
          </Card>
          <Card title="3. Menge bestaetigen">
            <p className="text-sm text-gray-600">
              Mit wenigen Klicks ist der Inventur-Schritt erledigt.
            </p>
          </Card>
        </section>
      </div>
    </div>
  )
}
