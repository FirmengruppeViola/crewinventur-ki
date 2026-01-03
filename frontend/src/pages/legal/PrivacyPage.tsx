import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Zurück
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">Datenschutzerklärung</h1>

        <div className="prose prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Datenschutz auf einen Blick</h2>
            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Allgemeine Hinweise</h3>
            <p className="text-muted-foreground">
              Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen
              Daten passiert, wenn Sie diese Website nutzen. Personenbezogene Daten sind alle Daten, mit denen
              Sie persönlich identifiziert werden können.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Verantwortliche Stelle</h2>
            <p className="text-muted-foreground">
              Verantwortlich für die Datenverarbeitung auf dieser Website ist:<br /><br />
              Firmengruppe Viola<br />
              Marcel Viola<br />
              E-Mail: info@firmengruppe-viola.de
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. Datenerfassung in dieser App</h2>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Welche Daten werden erfasst?</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Account-Daten (E-Mail-Adresse, Name)</li>
              <li>Inventurdaten (Produkte, Mengen, Preise)</li>
              <li>Hochgeladene Bilder (Rechnungen, Produktfotos)</li>
              <li>Standortdaten Ihrer Betriebe</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Wie werden die Daten erfasst?</h3>
            <p className="text-muted-foreground">
              Die Daten werden von Ihnen aktiv eingegeben oder durch die Nutzung der App-Funktionen erhoben
              (z.B. Kamera für Produkterkennung).
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Wofür werden die Daten genutzt?</h3>
            <p className="text-muted-foreground">
              Die Daten werden ausschließlich zur Bereitstellung der Inventur-Funktionen verwendet.
              Eine Weitergabe an Dritte erfolgt nicht, außer an die unten genannten Dienstleister.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Hosting und Dienstleister</h2>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Supabase</h3>
            <p className="text-muted-foreground">
              Unsere Datenbank und Authentifizierung wird von Supabase (Supabase Inc.) gehostet.
              Die Server befinden sich in Frankfurt (EU). Datenschutzrichtlinie:{' '}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://supabase.com/privacy
              </a>
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Cloudflare</h3>
            <p className="text-muted-foreground">
              Die Web-App wird über Cloudflare Pages bereitgestellt. Cloudflare speichert temporär
              technische Daten zur Auslieferung der Website. Datenschutzrichtlinie:{' '}
              <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://www.cloudflare.com/privacypolicy/
              </a>
            </p>

            <h3 className="text-lg font-medium text-foreground mt-4 mb-2">Google Gemini AI</h3>
            <p className="text-muted-foreground">
              Für die automatische Produkterkennung nutzen wir Google Gemini. Hochgeladene Bilder werden
              zur Analyse an Google gesendet, jedoch nicht dauerhaft gespeichert. Datenschutzrichtlinie:{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://policies.google.com/privacy
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Ihre Rechte</h2>
            <p className="text-muted-foreground">
              Sie haben jederzeit das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der
              Verarbeitung Ihrer personenbezogenen Daten. Kontaktieren Sie uns unter info@firmengruppe-viola.de.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Datenlöschung</h2>
            <p className="text-muted-foreground">
              Bei Löschung Ihres Accounts werden alle zugehörigen Daten innerhalb von 30 Tagen vollständig
              aus unseren Systemen entfernt.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
