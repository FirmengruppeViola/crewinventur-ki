import { useState } from 'react'
import {
  Sparkles,
  Receipt,
  Calendar,
  ArrowRight,
  Brain,
  Zap,
  CheckCircle2,
  X
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
  onComplete: () => void
  onSkip: () => void
}

export function InvoiceOnboarding({ onComplete, onSkip }: InvoiceOnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')

  const slide = slides[currentSlide]
  const isLast = currentSlide === slides.length - 1

  const nextSlide = () => {
    if (isLast) {
      onComplete()
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl animate-float" />
      </div>

      {/* Close Button */}
      <button
        onClick={onSkip}
        className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
      >
        <X className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Content */}
      <div className="relative w-full max-w-md mx-4">
        {/* Slide Content */}
        <div
          key={currentSlide}
          className={`text-center space-y-8 ${
            direction === 'next' ? 'animate-slide-in-right' : 'animate-slide-in-left'
          }`}
        >
          {/* Icon */}
          <div className="flex justify-center">
            <div className={`relative p-6 rounded-3xl ${slide.iconBg} ${slide.animation}`}>
              <slide.icon className={`h-16 w-16 ${slide.iconColor}`} />
              {/* Sparkle decorations */}
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-ping-slow" />
            </div>
          </div>

          {/* Text */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-foreground">
              {slide.title}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
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
        <div className="flex justify-center gap-2 mt-12">
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
        <div className="flex gap-3 mt-8">
          {currentSlide > 0 && (
            <Button
              variant="outline"
              onClick={prevSlide}
              className="flex-1 h-14 text-base"
            >
              Zurück
            </Button>
          )}
          <Button
            onClick={nextSlide}
            className={`h-14 text-base ${currentSlide === 0 ? 'flex-1' : 'flex-[2]'}`}
          >
            {isLast ? (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Verstanden, los geht's!
              </>
            ) : (
              <>
                Weiter
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>

        {/* Skip Link */}
        <button
          onClick={onSkip}
          className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Überspringen
        </button>
      </div>
    </div>
  )
}
