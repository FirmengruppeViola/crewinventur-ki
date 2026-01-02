import { useState } from 'react'
import {
  Sparkles,
  Receipt,
  Calendar,
  ArrowRight,
  ArrowLeft,
  Brain,
  Zap,
  CheckCircle2,
  Square,
  CheckSquare,
} from 'lucide-react'
import { Button } from './Button'

type Slide = {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  subtitle: string
  highlight?: string
  animation: string
}

const slides: Slide[] = [
  {
    icon: Brain,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/20',
    title: 'KI-Power',
    subtitle: 'Unsere KI liest deine Rechnungen und extrahiert automatisch alle Preise.',
    highlight: 'Nie wieder manuell Preise eingeben!',
    animation: 'animate-float',
  },
  {
    icon: Receipt,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20',
    title: 'Welche Rechnungen?',
    subtitle: 'Alle Lieferantenrechnungen von Produkten, die du inventarisieren willst.',
    highlight: 'Getränke, Lebensmittel, Verbrauchsmaterial...',
    animation: 'animate-pulse-slow',
  },
  {
    icon: Calendar,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20',
    title: 'Wie viele?',
    subtitle: 'Mindestens das letzte Quartal hochladen.',
    highlight: '3 Monate = die meisten Produkte erfasst',
    animation: 'animate-bounce-slow',
  },
  {
    icon: Zap,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/20',
    title: 'Das Ergebnis',
    subtitle: 'Beim Scannen kennt die App sofort den aktuellen Einkaufspreis.',
    highlight: 'Inventurwert auf Knopfdruck!',
    animation: 'animate-float',
  },
]

type InvoiceOnboardingProps = {
  onComplete: (dontShowAgain: boolean) => void
}

export function InvoiceOnboarding({ onComplete }: InvoiceOnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const slide = slides[currentSlide]
  const isLast = currentSlide === slides.length - 1

  const nextSlide = () => {
    if (isLast) {
      onComplete(dontShowAgain)
    } else {
      setDirection('next')
      setCurrentSlide((prev) => prev + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection('prev')
      setCurrentSlide((prev) => prev - 1)
    }
  }

  // No portal needed - fixed positioning with high z-index is sufficient
  // Portal was causing React DOM errors with TanStack Query updates
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Solid background layer - prevents content bleeding through */}
      <div className="absolute inset-0 bg-background" />
      {/* Blur overlay on top */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-background to-slate-800/50 backdrop-blur-xl" />

      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl animate-float" />
      </div>

      {/* Content - positioned higher with safe bottom margin */}
      <div className="relative w-full max-w-md mx-4 mb-32">
        {/* Slide Content */}
        <div
          key={currentSlide}
          className={`text-center space-y-6 ${
            direction === 'next' ? 'animate-slide-in-right' : 'animate-slide-in-left'
          }`}
        >
          {/* Icon */}
          <div className="flex justify-center">
            <div className={`relative p-5 rounded-3xl ${slide.iconBg} ${slide.animation}`}>
              <slide.icon className={`h-14 w-14 ${slide.iconColor}`} />
              {/* Sparkle decorations */}
              <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-yellow-400 animate-ping-slow" />
            </div>
          </div>

          {/* Text */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-foreground">
              {slide.title}
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed px-2">
              {slide.subtitle}
            </p>
            {slide.highlight && (
              <p className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm">
                {slide.highlight}
              </p>
            )}
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentSlide ? 'next' : 'prev')
                setCurrentSlide(index)
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {currentSlide > 0 && (
            <Button
              variant="outline"
              onClick={prevSlide}
              className="h-12 px-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Button
            onClick={nextSlide}
            className="flex-1 h-12 text-base"
          >
            {isLast ? (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Alles klar!
              </>
            ) : (
              <>
                Weiter
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>

        {/* Don't show again checkbox - only on last slide */}
        {isLast && (
          <button
            onClick={() => setDontShowAgain(!dontShowAgain)}
            className="flex items-center justify-center gap-3 w-full mt-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          >
            {dontShowAgain ? (
              <CheckSquare className="h-5 w-5 text-primary" />
            ) : (
              <Square className="h-5 w-5 text-muted-foreground" />
            )}
            <span className={`text-sm ${dontShowAgain ? 'text-foreground' : 'text-muted-foreground'}`}>
              Nicht mehr anzeigen, ich weiß Bescheid
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
