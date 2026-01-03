import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'

export function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link viewTransition to="/">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">Allgemeine Geschäftsbedingungen</h1>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">§ 1 Geltungsbereich</h2>
            <p className="text-muted-foreground">
              Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der CrewInventur-App
              der Firmengruppe Viola (nachfolgend "Anbieter"). Mit der Registrierung akzeptieren
              Sie diese Bedingungen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">§ 2 Leistungsbeschreibung</h2>
            <p className="text-muted-foreground">
              CrewInventur ist eine KI-gestützte Inventur-App für die Gastronomie. Die App ermöglicht:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>Erfassung von Inventurbeständen mittels Kamera und KI-Erkennung</li>
              <li>Verwaltung von Produkten und Standorten</li>
              <li>Export von Inventurberichten (PDF, CSV)</li>
              <li>Versand von Berichten per E-Mail</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">§ 3 Registrierung und Account</h2>
            <p className="text-muted-foreground">
              Zur Nutzung ist eine Registrierung mit gültiger E-Mail-Adresse erforderlich.
              Sie sind für die Geheimhaltung Ihrer Zugangsdaten verantwortlich.
              Die Weitergabe des Accounts an Dritte ist nicht gestattet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">§ 4 Nutzungsrechte</h2>
            <p className="text-muted-foreground">
              Der Anbieter räumt Ihnen ein einfaches, nicht übertragbares Recht zur Nutzung der App
              im Rahmen dieser AGB ein. Die App darf nur für eigene betriebliche Zwecke genutzt werden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">§ 5 Pflichten des Nutzers</h2>
            <p className="text-muted-foreground">Der Nutzer verpflichtet sich:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-2">
              <li>Keine rechtswidrigen Inhalte hochzuladen</li>
              <li>Die App nicht zu manipulieren oder zu missbrauchen</li>
              <li>Keine automatisierten Zugriffe durchzuführen</li>
              <li>Die Rechte Dritter zu respektieren</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">§ 6 Haftung</h2>
            <p className="text-muted-foreground">
              Der Anbieter haftet nur für Schäden aus der Verletzung des Lebens, des Körpers oder
              der Gesundheit sowie für sonstige Schäden, die auf einer vorsätzlichen oder grob
              fahrlässigen Pflichtverletzung beruhen.
            </p>
            <p className="text-muted-foreground mt-2">
              Für die Richtigkeit der KI-Erkennung wird keine Gewähr übernommen. Die Inventurergebnisse
              sind vom Nutzer zu überprüfen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">§ 7 Verfügbarkeit</h2>
            <p className="text-muted-foreground">
              Der Anbieter bemüht sich um eine hohe Verfügbarkeit der App, garantiert jedoch keine
              ununterbrochene Erreichbarkeit. Wartungsarbeiten werden nach Möglichkeit angekündigt.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">§ 8 Kündigung</h2>
            <p className="text-muted-foreground">
              Der Account kann jederzeit ohne Angabe von Gründen gelöscht werden.
              Bei Verstößen gegen diese AGB kann der Anbieter den Zugang sperren oder kündigen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">§ 9 Änderungen der AGB</h2>
            <p className="text-muted-foreground">
              Der Anbieter behält sich vor, diese AGB zu ändern. Änderungen werden per E-Mail
              mitgeteilt. Bei Widerspruch innerhalb von 4 Wochen kann der Account gekündigt werden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">§ 10 Schlussbestimmungen</h2>
            <p className="text-muted-foreground">
              Es gilt deutsches Recht. Gerichtsstand ist der Sitz des Anbieters.
              Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen
              Bestimmungen unberührt.
            </p>
          </section>

          <p className="text-sm text-muted-foreground mt-8">
            Stand: Januar 2026
          </p>
        </div>
      </div>
    </div>
  )
}

