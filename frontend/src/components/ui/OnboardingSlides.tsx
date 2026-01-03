import { useState } from 'react'
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Square,
  CheckSquare,
} from 'lucide-react'
import { Button } from './Button'

export type OnboardingSlide = {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  subtitle: string
  highlight?: string
  animation?: 'animate-float' | 'animate-pulse-slow' | 'animate-bounce-slow'
}

type OnboardingSlidesProps = {
  slides: OnboardingSlide[]
  onComplete: (dontShowAgain: boolean) => void
  /** Text für den finalen Button (default: "Los geht's!") */
  finalButtonText?: string
  /** Zeigt "Nicht mehr anzeigen" Checkbox (default: true) */
  showDontShowAgain?: boolean
}

export function OnboardingSlides({
  slides,
  onComplete,
  finalButtonText = "Los geht's!",
  showDontShowAgain = true
}: OnboardingSlidesProps) {
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Solid background layer */}
      <div className="absolute inset-0 bg-background" />
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-background to-slate-800/50 backdrop-blur-xl" />

      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl animate-float" />
      </div>

      {/* Content */}
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
            <div className={`relative p-5 rounded-3xl ${slide.iconBg} ${slide.animation || 'animate-float'}`}>
              <slide.icon className={`h-14 w-14 ${slide.iconColor}`} />
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
                {finalButtonText}
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
        {isLast && showDontShowAgain && (
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
              Nicht mehr anzeigen
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
