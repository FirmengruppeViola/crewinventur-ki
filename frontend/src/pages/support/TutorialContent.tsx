import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import ReactCanvasConfetti from 'react-confetti';
import { Sparkles, Trophy, Zap, ArrowRight, Play, CheckCircle, Target, Camera, Zap as ZapIcon, Menu as MenuIcon, Home, Eye } from 'lucide-react';

const TutorialContent = () => {
  const [activeChapter, setActiveChapter] = useState(0);
  const [completedChapters, setCompletedChapters] = useState<number[]>([]);
  const [confetti, setConfetti] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [level, setLevel] = useState(1);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);

  const chapters = [
    {
      id: 0,
      title: 'Los geht\'s! 🚀',
      emoji: '🎯',
      description: 'Erkunde CrewInventur - dein smarter Inventur-Helfer',
      color: 'from-cyan-500 to-blue-500',
      content: [
        {
          type: 'intro',
          text: 'Willkommen bei CrewInventur! Das ist kein gewöhnliches Inventur-Tool - hier arbeitet KI mit dir zusammen, um deine Bestände einfach, schnell und genau zu erfassen.'
        },
        {
          type: 'interactive',
          title: 'Probiere es aus:',
          action: 'Klicke auf die Kamera unten, um deinen ersten Scan zu starten!',
          icon: Camera,
        },
        {
          type: 'fact',
          title: '💡 Wusstest du schon?',
          text: 'Unsere KI erkennt Produkte anhand von Design, Farbe, Barcode und selbst Text auf der Verpackung - völlig automatisch!'
        }
      ]
    },
    {
      id: 1,
      title: 'Produkte scannen 📸',
      emoji: '📱',
      description: 'Kamera raus und KI machen lassen',
      color: 'from-purple-500 to-pink-500',
      content: [
        {
          type: 'step',
          number: 1,
          text: 'Öffne die Kamera-Funktion',
          detail: 'Ganz einfach auf das Kamera-Symbol tippen'
        },
        {
          type: 'step',
          number: 2,
          text: 'Richte die Kamera auf das Produkt',
          detail: 'Achte auf gute Beleuchtung - die KI mag es hell!'
        },
        {
          type: 'step',
          number: 3,
          text: 'Klick auf den Scan-Button',
          detail: 'Die KI analysiert das Bild und erkennt Marke, Name und Größe'
        },
        {
          type: 'step',
          number: 4,
          text: 'Bestätige oder bearbeite',
          detail: 'Wenn alles stimmt: Fertig. Sonst: einfach anpassen und speichern.'
        },
        {
          type: 'pro-tip',
          title: '🌟 Profi-Tipp',
          text: 'Du kannst auch ganze Regale auf einmal scannen - einfach den Modus umschalten!'
        }
      ]
    },
    {
      id: 2,
      title: 'Inventur-Sessions 📊',
      emoji: '📋',
      description: 'Organisiere deine Zählungen wie ein Profi',
      color: 'from-emerald-500 to-teal-500',
      content: [
        {
          type: 'concept',
          title: 'Was ist eine Session?',
          text: 'Eine "Session" ist wie ein Arbeitszettel für deine Inventur. Du startest eine, scanst Produkte darin, und schließt sie ab. Danach siehst du genau, was sich seit der letzten Inventur geändert hat.'
        },
        {
          type: 'feature',
          title: '✨ Cleveres Differenzen-Tracking',
          text: 'CrewInventur vergleicht automatisch deine Sessions mit der letzten Inventur und zeigt dir genau: Was wurde verkauft? Was wurde nachbestellt? Wo fehlt was?'
        },
        {
          type: 'interactive',
          title: 'Versuch es!',
          action: 'Erstelle deine erste Session in der Inventur-Übersicht',
          icon: Play,
        }
      ]
    },
    {
      id: 3,
      title: 'Rechnungen hochladen 📄',
      emoji: '🧾',
      description: 'Die KI macht die Arbeit für dich',
      color: 'from-amber-500 to-orange-500',
      content: [
        {
          type: 'step',
          number: 1,
          text: 'Lade deine Lieferanten-Rechnung hoch',
          detail: 'PDF oder Foto - die KI kann beides!'
        },
        {
          type: 'step',
          number: 2,
          text: 'KI extrahiert automatisch',
          detail: 'Lieferant, Positionen, Preise, MwSt - alles in Sekunden erkannt'
        },
        {
          type: 'feature',
          title: '🔗 Automatisches Produkt-Matching',
          text: 'Das Beste: Die KI versucht automatisch, jede Rechnungsposition mit deinen existierenden Produkten zu verknüpfen. Keine manuelle Arbeit!'
        },
        {
          type: 'success-story',
          title: '🎉 Echt-Erfolg:',
          text: '"Ich habe 20 Rechnungen hochgeladen und innerhalb von 5 Minuten war alles erfasst. Früher hat das einen halben Tag gedauert!"'
        }
      ]
    },
    {
      id: 4,
      title: 'Team & Standorte 🏢',
      emoji: '🏢',
      description: 'Gemeinsam inventarisieren',
      color: 'from-rose-500 to-red-500',
      content: [
        {
          type: 'concept',
          title: 'Multi-Location Support',
          text: 'Mehrere Bars? Restaurants? Läger? Kein Problem - separiere alles sauber per Location.'
        },
        {
          type: 'feature',
          title: '👥 Manager & Mitarbeiter',
          text: 'Erstelle dein Team und weiße Mitarbeiter den richtigen Standorten zu. Du siehst immer, wer was wo macht.'
        },
        {
          type: 'pro-tip',
          title: '🌟 Rollen & Berechtigungen',
          text: 'Besitzer sehen alles. Manager sehen nur ihre zugewiesenen Standorte. Perfekte Kontrolle!'
        }
      ]
    },
    {
      id: 5,
      title: 'Berichte & Export 📈',
      emoji: '📊',
      description: 'Deine Daten überall hin',
      color: 'from-indigo-500 to-purple-500',
      content: [
        {
          type: 'feature',
          title: '📄 PDF-Export',
          text: 'Perfekt für deine Buchhaltung, Steuererklärung oder für den Chef'
        },
        {
          type: 'feature',
          title: '📊 CSV-Export',
          text: 'Für deine Analysen in Excel, Google Sheets oder andere Tools'
        },
        {
          type: 'fact',
          title: '💡 Smart-Data',
          text: 'Alle deine Exporte sind automatisch mit den aktuellsten Preisen aus deinen Rechnungen angereichert!'
        }
      ]
    },
    {
      id: 6,
      title: 'KI-Funktionen verstehen 🧠',
      emoji: '🧠',
      description: 'Wie die KI deinen Alltag erleichtert',
      color: 'from-violet-500 to-fuchsia-500',
      content: [
        {
          type: 'concept',
          title: 'Produkterkennung',
          text: 'Die KI erkennt Marken, Produkttypen, Größen und Kategorien aus Fotos. Sie versteht sogar Abkürzungen wie "Jägerm." = "Jägermeister".'
        },
        {
          type: 'concept',
          title: 'Rechnungsextraktion',
          text: 'PDF-Textanalyse mit semantischem Verständnis. Die KI extrahiert nicht einfach Wörter, sondern versteht Strukturen wie "Lieferant oben, Positionen unten, Summe ganz unten".'
        },
        {
          type: 'concept',
          title: 'Smart Matching',
          text: 'Die KI vergleicht Rechnungspositionen mit deiner Produkt-Datenbank. Sie normalisiert Namen (0.7l = 700ml = 0,7 Liter), erkennt Varianten und fügt alles intelligent zusammen.'
        },
        {
          type: 'fact',
          title: '⚡ Geschwindigkeit',
          text: 'Einzel-Scan: ~1-2 Sekunden. Regal-Scan: ~3-5 Sekunden. Rechnungsextraktion: ~5-10 Sekunden.'
        }
      ]
    }
  ];

  const calculateXp = () => {
    const baseXp = completedChapters.length * 100;
    const bonusXp = completedChapters.filter(id => id === 2).length * 50;
    return baseXp + bonusXp;
  };

  const calculateLevel = (currentXp: number) => {
    return Math.floor(currentXp / 200) + 1;
  };

  const currentXp = calculateXp();
  const currentLevel = calculateLevel(currentXp);
  const progressToNextLevel = ((currentXp % 200) / 200) * 100;

  useEffect(() => {
    setLevel(currentLevel);
  }, [completedChapters]);

  const handleChapterComplete = (chapterId: number) => {
    if (!completedChapters.includes(chapterId)) {
      setCompletedChapters([...completedChapters, chapterId]);
      setConfetti(true);
      setTimeout(() => setConfetti(false), 3000);
    }
  };

  const handleChapterClick = (chapterId: number) => {
    if (chapterId === activeChapter) {
      setShowDetails(!showDetails);
    } else {
      setActiveChapter(chapterId);
      setShowDetails(true);
    }
  };

  const handleNext = () => {
    if (activeChapter < chapters.length - 1) {
      setActiveChapter(activeChapter + 1);
      setShowDetails(true);
      handleChapterComplete(activeChapter);
      if (chapterRefs.current[activeChapter + 1]) {
        chapterRefs.current[activeChapter + 1]?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleBack = () => {
    if (activeChapter > 0) {
      setActiveChapter(activeChapter - 1);
      setShowDetails(true);
    }
  };

  const achievements = [
    { id: 'first-scan', title: 'Erster Scan', icon: Camera, condition: completedChapters.includes(1) },
    { id: 'first-session', title: 'Erste Session', icon: Target, condition: completedChapters.includes(2) },
    { id: 'ai-master', title: 'KI-Meister', icon: Zap, condition: completedChapters.includes(6) },
    { id: 'all-chapters', title: 'Wissenswert', icon: Trophy, condition: completedChapters.length === chapters.length },
  ];

  const renderContent = (item: any, index: number) => {
    const animations = {
      hidden: { opacity: 0, x: -50 },
      visible: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 50 }
    };

    switch (item.type) {
      case 'intro':
      case 'concept':
        return (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={animations}
            transition={{ delay: index * 0.1 }}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/10"
          >
            <p className="text-white/90 text-sm leading-relaxed">{item.text}</p>
            {item.title && (
              <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                {item.title}
              </h4>
            )}
          </motion.div>
        );

      case 'step':
        return (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={animations}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-4 mb-6"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-white font-bold text-lg">{item.number}</span>
            </div>
            <div className="flex-1">
              <h4 className="text-white font-semibold mb-1">{item.text}</h4>
              {item.detail && (
                <p className="text-white/70 text-sm">{item.detail}</p>
              )}
            </div>
          </motion.div>
        );

      case 'interactive':
        const IconComponent = item.icon;
        return (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={animations}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 backdrop-blur-sm rounded-xl p-6 border-2 border-yellow-400/50 cursor-pointer hover:scale-105 transition-transform"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <IconComponent className="w-8 h-8 text-yellow-400" />
              <h4 className="text-lg font-bold text-yellow-400">{item.title}</h4>
            </div>
            <p className="text-white/90 text-base">{item.action}</p>
          </motion.div>
        );

      case 'fact':
        return (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={animations}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-xl p-5 border border-blue-400/30"
          >
            <h4 className="text-blue-300 font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {item.title}
            </h4>
            <p className="text-white/90 text-sm">{item.text}</p>
          </motion.div>
        );

      case 'pro-tip':
        return (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={animations}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-5 border border-purple-400/30"
          >
            <h4 className="text-purple-300 font-semibold mb-2">{item.title}</h4>
            <p className="text-white/90 text-sm">{item.text}</p>
          </motion.div>
        );

      case 'feature':
        return (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={animations}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10"
          >
            <h4 className="text-cyan-300 font-semibold mb-2 flex items-center gap-2">
              <ZapIcon className="w-5 h-5 text-cyan-400" />
              {item.title}
            </h4>
            <p className="text-white/90 text-sm leading-relaxed">{item.text}</p>
          </motion.div>
        );

      case 'success-story':
        return (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={animations}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-r from-emerald-500/30 to-teal-500/30 backdrop-blur-sm rounded-xl p-5 border border-emerald-400/50"
          >
            <h4 className="text-emerald-300 font-semibold mb-2">{item.title}</h4>
            <p className="text-white/90 text-sm italic">"{item.text}"</p>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {confetti && <ReactCanvasConfetti />}

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 flex items-center justify-center gap-3">
            <Sparkles className="w-10 h-10 text-yellow-400" />
            CrewInventur Guide
          </h1>
          <p className="text-white/70 text-lg">Entdecke die Magie der intelligenten Inventur 🪄</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="bg-white/5 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/10"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <span className="text-white font-semibold">Level {level}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-amber-400" />
                <span className="text-white/70">{currentXp} XP</span>
              </div>
            </div>
            <div className="text-white/50 text-sm">
              {completedChapters.length}/{chapters.length} Kapitel abgeschlossen
            </div>
          </div>

          <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-amber-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressToNextLevel}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {achievements.filter(a => a.condition).map(achievement => {
              const Icon = achievement.icon;
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-xl p-4 border border-yellow-400/30 flex flex-col items-center gap-2"
                >
                  <Icon className="w-8 h-8 text-yellow-400" />
                  <span className="text-white text-xs font-medium text-center">{achievement.title}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {chapters.map((chapter, index) => {
            const isCompleted = completedChapters.includes(chapter.id);
            const isActive = activeChapter === chapter.id;
            const colorFrom = chapter.color.split(' ')[0].replace('from-', '');
            const colorTo = chapter.color.split('to-')[1];
            const gradientStyle = `linear-gradient(135deg, rgba(var(--${colorFrom}), 0.8), rgba(var(--${colorTo}), 0.6))`;

            return (
              <motion.div
                key={chapter.id}
                ref={el => chapterRefs.current[index] = el}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleChapterClick(chapter.id)}
                className={`
                  relative overflow-hidden rounded-2xl p-6 cursor-pointer transition-all duration-300
                  ${isActive ? 'ring-4 ring-white/30 scale-105' : 'hover:scale-102 hover:ring-2 hover:ring-white/20'}
                  ${isCompleted ? 'opacity-80' : ''}
                `}
                style={{ background: gradientStyle }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute top-4 right-4 bg-emerald-500 rounded-full p-2 shadow-lg"
                  >
                    <CheckCircle className="w-6 h-6 text-white" />
                  </motion.div>
                )}

                <div className="text-4xl mb-3">{chapter.emoji}</div>
                <h3 className="text-white font-bold text-lg mb-1">{chapter.title}</h3>
                <p className="text-white/80 text-sm">{chapter.description}</p>

                {isActive && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center"
                  >
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/30">
                      <span className="text-white font-semibold flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Jetzt lesen
                      </span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {showDetails && (
            <motion.div
              key={activeChapter}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.3 }}
              className="bg-slate-800/90 backdrop-blur-xl rounded-2xl p-8 border border-white/10"
            >
              <div className="flex items-center gap-3 mb-6">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="text-5xl"
                >
                  {chapters[activeChapter].emoji}
                </motion.div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{chapters[activeChapter].title}</h2>
                  <p className="text-white/60">{chapters[activeChapter].description}</p>
                </div>
              </div>

              <div className="space-y-4">
                {chapters[activeChapter].content.map((item, index) => renderContent(item, index))}
              </div>

              <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/10">
                <motion.button
                  onClick={handleBack}
                  disabled={activeChapter === 0}
                  className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-xl transition-all text-white font-medium disabled:cursor-not-allowed"
                  whileHover={{ scale: activeChapter === 0 ? 1 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowRight className="w-5 h-5 rotate-180" />
                  Zurück
                </motion.button>

                <motion.button
                  onClick={() => handleChapterComplete(activeChapter)}
                  disabled={completedChapters.includes(activeChapter)}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl transition-all font-semibold
                    ${completedChapters.includes(activeChapter)
                      ? 'bg-emerald-500/30 text-emerald-300 cursor-default'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
                    }`}
                  whileHover={{ scale: completedChapters.includes(activeChapter) ? 1 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {completedChapters.includes(activeChapter) ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Abgeschlossen
                    </>
                  ) : (
                    <>
                      <Target className="w-5 h-5" />
                      Als gelesen markieren
                    </>
                  )}
                </motion.button>

                <motion.button
                  onClick={handleNext}
                  disabled={activeChapter === chapters.length - 1}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl transition-all text-white font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                  whileHover={{ scale: activeChapter === chapters.length - 1 ? 1 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {activeChapter === chapters.length - 1 ? 'Fertig' : 'Nächstes Kapitel'}
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <p className="text-white/50 text-sm mb-4">
            Möchtest du zur App zurückkehren?
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white font-medium"
          >
            <Home className="w-5 h-5" />
            Zurück zur App
          </a>
        </motion.div>
      </div>

      <div className="fixed bottom-6 right-6">
        <motion.button
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          onClick={() => setShowDetails(!showDetails)}
          className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <MenuIcon className="w-7 h-7 text-white" />
        </motion.button>
      </div>
    </div>
  );
};

export default TutorialContent;
