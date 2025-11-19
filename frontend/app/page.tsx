'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { UploadIcon, Target, Activity, TrendingUp, Sparkles, Award, BarChart3, Calendar, Zap, Brain, Trophy, ChevronRight } from 'lucide-react';
import axios from 'axios';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { ChatBubble } from '@/components/ChatBubble';

interface Stats {
  total_distance: number;
  total_workouts: number;
  week_volume?: number;
}

interface ProgressionData {
  current_avg_pace: number;
  best_5k_pace: number;
  improvement_potential_seconds: number;
  progression_percentage: number;
  estimated_new_pr: string;
}

// Conversation messages
interface Message {
  id: number;
  text: string;
  sender: 'allure' | 'user';
  quickReplies?: string[]; // Options de réponse rapide après ce message
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [progression, setProgression] = useState<ProgressionData | null>(null);
  const [hasData, setHasData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [waitingForUserInput, setWaitingForUserInput] = useState(false);
  const [selectedReply, setSelectedReply] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showFinalContent, setShowFinalContent] = useState(false);

  // Conversation flow with two paths
  const conversationYes: Message[] = [
    { id: 1, text: "tu veux progresser en course ?", sender: 'allure' },
    { id: 2, text: "oui, carrément", sender: 'user' },
    {
      id: 3,
      text: "parfait ! allure analyse tes séances strava et te suggère des entraînements adaptés.",
      sender: 'allure',
    },
    {
      id: 4,
      text: "avec une API optimisée pour limiter les coûts. pas d'abonnement à 15€/mois comme les autres apps.",
      sender: 'allure',
    },
  ];

  const conversationNo: Message[] = [
    { id: 1, text: "tu veux progresser en course ?", sender: 'allure' },
    { id: 2, text: "pas vraiment", sender: 'user' },
    {
      id: 3,
      text: "je comprends. mais écoute : tu tournes en rond ? tu sais pas si tu progresses vraiment ?",
      sender: 'allure',
    },
    {
      id: 4,
      text: "allure détecte tes records, analyse ta charge d'entraînement, et te dit exactement quoi faire pour progresser.",
      sender: 'allure',
    },
    {
      id: 5,
      text: "avec une API optimisée pour limiter les coûts. sans te ruiner comme les apps à 15€/mois.",
      sender: 'allure',
    },
  ];

  const [selectedPath, setSelectedPath] = useState<'yes' | 'no' | null>(null);
  const conversation = selectedPath === 'yes' ? conversationYes : selectedPath === 'no' ? conversationNo : [];

  const handleNextMessage = () => {
    if (currentMessageIndex < conversation.length - 1) {
      const nextMessage = conversation[currentMessageIndex + 1];

      // Si le prochain message est d'allure et a des quick replies, on attend l'input utilisateur
      if (nextMessage.sender === 'allure' && nextMessage.quickReplies) {
        setCurrentMessageIndex(prev => prev + 1);
        // Après que le message d'allure s'affiche, on attend l'input
        setTimeout(() => setWaitingForUserInput(true), 1000);
      } else {
        setCurrentMessageIndex(prev => prev + 1);
      }
    } else {
      // On a atteint le dernier message, afficher les sections "En savoir plus" et le CTA
      // Petit délai pour que ça ne soit pas instantané
      setTimeout(() => {
        setShowFinalContent(true);
      }, 1000);
    }
  };

  const handleQuickReply = (reply: string) => {
    setSelectedReply(reply);
    setWaitingForUserInput(false);

    // Attendre un peu avant de passer au message suivant
    setTimeout(() => {
      handleNextMessage();
      setSelectedReply(null);
    }, 500);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    loadStats();
    loadProgression();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/dashboard/summary');
      if (response.data && response.data.total_workouts > 0) {
        setStats({
          total_distance: response.data.total_all_time_km || 0,
          total_workouts: response.data.total_workouts || 0,
        });
        setHasData(true);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setHasData(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProgression = async () => {
    try {
      // Get last 10 workouts avg pace
      const workoutsRes = await axios.get('http://127.0.0.1:8000/api/workouts?limit=10');
      const workouts = workoutsRes.data;

      // Get best 5K from records
      const recordsRes = await axios.get('http://127.0.0.1:8000/api/records');
      const best5k = recordsRes.data.find((r: any) => r.distance_category === '5K');

      if (workouts.length > 0 && best5k) {
        const avgPace = workouts.reduce((sum: number, w: any) => sum + (w.avg_pace || 0), 0) / workouts.length;
        const best5kPace = best5k.avg_pace;
        const improvement = avgPace - best5kPace; // seconds per km you could gain
        const progressionPct = Math.min(100, (improvement / avgPace) * 100);

        // Estimate new PR: if you run 5K at your best pace minus 20% of the gap
        const estimatedPace = best5kPace - (improvement * 0.2);
        const estimatedTime = (estimatedPace * 5) / 60; // minutes
        const mins = Math.floor(estimatedTime);
        const secs = Math.floor((estimatedTime - mins) * 60);

        setProgression({
          current_avg_pace: avgPace,
          best_5k_pace: best5kPace,
          improvement_potential_seconds: improvement,
          progression_percentage: progressionPct,
          estimated_new_pr: `${mins}:${secs.toString().padStart(2, '0')}`
        });
      }
    } catch (error) {
      console.error('Error loading progression:', error);
    }
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
  };

  const formatPace = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine which background to use based on theme
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const backgroundImage = isDark
    ? '/allure-nightlightfourth-background.png'
    : '/allure-daylightfourth-background.png';

  return (
    <>
      {/* Background Image - Fixed to viewport, covers entire screen */}
      <div
        className="fixed top-0 left-0 w-screen h-screen z-[-1]"
        style={{
          width: '100vw',
          height: '100vh',
        }}
      >
        {mounted && (
          <>
            <Image
              src={backgroundImage}
              alt="Mountain landscape background"
              fill
              className="object-cover transition-opacity duration-500"
              priority
              sizes="100vw"
              style={{
                objectFit: 'cover',
              }}
            />
            {/* Lighten overlay for dark mode */}
            {isDark && (
              <div className="absolute inset-0 bg-white/15" />
            )}
            {/* Text contrast gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent" />
          </>
        )}
      </div>

      <div className="fixed inset-0 overflow-hidden"
        style={{
          margin: '0',
          left: '0',
          right: '0',
          top: '0',
          width: '100vw',
          height: '100vh'
        }}>

        {/* Chat Interface Section */}
        <section className="relative px-4 z-10 flex items-center justify-center" style={{ height: '100vh', paddingTop: '0' }}>
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="container mx-auto max-w-3xl relative z-10 flex flex-col justify-center"
            style={{ minHeight: 'calc(100vh - 8rem)' }}
          >
            {/* Logo en haut - plus petit et discret */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8 flex items-center justify-center"
            >
              <div className="relative flex items-center gap-2">
                <Image
                  src="/chatgpt-runner-mono.png"
                  alt="allure"
                  width={50}
                  height={50}
                  className="brightness-0 invert"
                />
                <h1 className="text-3xl md:text-4xl font-[family-name:var(--font-branch)] text-white">
                  allure
                </h1>
              </div>
            </motion.div>

            {/* Skip / Login Button - Removed as per user feedback (redundant with navbar) */}


            {/* Zone de conversation */}
            <div
              className="flex-1 overflow-y-auto max-h-[70vh] px-2 md:px-4"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
              }}
            >
              <AnimatePresence mode="sync">
                <motion.div
                  key="conversation"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-1"
                >
                  {/* Initial message "tu veux progresser en course ?" */}
                  {!conversationStarted && (
                    <motion.div
                      key="initial-prompt"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="flex justify-start mb-4">
                        <div className="max-w-[85%] md:max-w-[70%] px-5 py-3 rounded-2xl bg-white/25 backdrop-blur-xl border border-white/40 text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                          <p className="text-base md:text-lg leading-relaxed">
                            tu veux progresser en course ?
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Always render the active conversation slice */}
                  {conversationStarted && conversation.slice(0, currentMessageIndex + 1).map((message, index) => (
                    <ChatBubble
                      key={message.id}
                      text={message.text}
                      sender={message.sender}
                      enabled={index === currentMessageIndex}
                      delay={index === 0 ? 0 : 300}
                      onComplete={handleNextMessage}
                      speed={index === 0 ? 0 : (message.sender === 'allure' ? 35 : 45)}
                    />
                  ))}

                  {/* Initial Quick Replies (Oui/Non) - Shown when waiting at index 0 */}
                  {!conversationStarted && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="flex flex-wrap gap-2 justify-end mt-4"
                    >
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                        onClick={() => {
                          setConversationStarted(true);
                          setSelectedPath('yes');
                          // Reset to 0 to ensure we start from the beginning of the list
                          setCurrentMessageIndex(0);
                        }}
                        className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white/90 hover:bg-white/25 transition-all text-sm md:text-base"
                      >
                        oui, carrément
                      </motion.button>
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7 }}
                        onClick={() => {
                          setConversationStarted(true);
                          setSelectedPath('no');
                          setCurrentMessageIndex(0);
                        }}
                        className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white/90 hover:bg-white/25 transition-all text-sm md:text-base"
                      >
                        pas vraiment
                      </motion.button>
                    </motion.div>
                  )}

                  {/* Sections dépliables "En savoir plus" */}
                  {showFinalContent && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="mt-6 space-y-2"
                    >
                      {/* Section 1 - Fonctionnalités */}
                      <div className="flex justify-start">
                        <button
                          onClick={() => setExpandedSection(expandedSection === 'features' ? null : 'features')}
                          className="flex items-center gap-2 max-w-[85%] md:max-w-[70%] px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white/90 hover:bg-white/20 transition-all text-base text-left"
                        >
                          <ChevronRight className={cn("w-4 h-4 transition-transform duration-300", expandedSection === 'features' ? "rotate-90" : "")} />
                          que fait allure exactement ?
                        </button>
                      </div>
                      <AnimatePresence>
                        {expandedSection === 'features' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex justify-start"
                          >
                            <div className="max-w-[85%] md:max-w-[70%] px-5 py-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm">
                              <p>• analyse tes séances strava</p>
                              <p>• détecte tes records automatiquement</p>
                              <p>• suggère des entraînements adaptés</p>
                              <p>• calcule ton score de forme</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Section 2 - Tarif */}
                      <div className="flex justify-start">
                        <button
                          onClick={() => setExpandedSection(expandedSection === 'pricing' ? null : 'pricing')}
                          className="flex items-center gap-2 max-w-[85%] md:max-w-[70%] px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white/90 hover:bg-white/20 transition-all text-base text-left"
                        >
                          <ChevronRight className={cn("w-4 h-4 transition-transform duration-300", expandedSection === 'pricing' ? "rotate-90" : "")} />
                          ça coûte combien ?
                        </button>
                      </div>
                      <AnimatePresence>
                        {expandedSection === 'pricing' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex justify-start"
                          >
                            <div className="max-w-[85%] md:max-w-[70%] px-5 py-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm">
                              <p>l'API est optimisée pour limiter les coûts. pas d'abonnement mensuel comme les apps à 15€. tu paies uniquement ce que tu consommes en IA.</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {/* CTA final quand conversation terminée */}
                  {showFinalContent && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="pt-8 flex justify-center"
                    >
                      <Link href="/import">
                        <Button size="lg" className="text-lg px-10 py-6 shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] bg-white text-slate-900 hover:bg-white hover:scale-105 transition-all duration-300 font-bold rounded-full">
                          <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24" fill="#FC4C02">
                            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                          </svg>
                          Connecter Strava
                        </Button>
                      </Link>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Quick Reply Buttons - like iMessage (For later stages) */}
            {conversationStarted && waitingForUserInput && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3 }}
                className="mt-4 px-2 md:px-4"
              >
                <div className="flex flex-wrap gap-2 justify-end">
                  {conversation[currentMessageIndex]?.quickReplies?.map((reply, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleQuickReply(reply)}
                      className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white/90 hover:bg-white/25 transition-all text-sm md:text-base"
                    >
                      {reply}
                    </motion.button>
                  ))}
                </div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-xs text-white/40 text-right mt-2"
                >
                  Cliquez pour répondre
                </motion.p>
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* Progression Margin Section */}
        {hasData && progression && (
          <section className="py-16 px-4">
            <div className="container mx-auto max-w-5xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Card className="border-white/20 bg-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
                  <CardContent className="p-8 md:p-12">
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-4">
                        <Target className="h-4 w-4 text-white" />
                        <span className="text-sm font-medium text-white">Votre potentiel</span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-bold mb-2 text-white">
                        Marge de progression détectée
                      </h2>
                      <p className="text-white/80">
                        Basé sur vos 10 dernières séances vs votre record 5K
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                      {/* Current avg pace */}
                      <div className="text-center">
                        <div className="text-sm text-white/60 mb-2">Allure actuelle</div>
                        <div className="text-3xl font-bold text-white">
                          {formatPace(progression.current_avg_pace)}/km
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-sm text-white/60 mb-2">Gain possible</div>
                        <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#ee95b3] to-[#667abf]">
                          -{formatPace(progression.improvement_potential_seconds)}/km
                        </div>
                      </div>

                      {/* Best 5K pace */}
                      <div className="text-center">
                        <div className="text-sm text-white/60 mb-2">Votre record</div>
                        <div className="text-3xl font-bold text-emerald-300 drop-shadow-sm">
                          {formatPace(progression.best_5k_pace)}/km
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Potentiel inexploité</span>
                        <span className="font-bold text-white">{progression.progression_percentage.toFixed(0)}%</span>
                      </div>
                      <div className="h-4 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${progression.progression_percentage}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-[#ee95b3] to-[#667abf] rounded-full"
                        />
                      </div>
                    </div>

                    {/* Estimated new PR */}
                    <div className="mt-8 pt-8 border-t border-white/20">
                      <div className="text-center">
                        <p className="text-sm text-white/80 mb-2">
                          Avec un entraînement optimisé, vous pourriez atteindre
                        </p>
                        <div className="inline-block px-6 py-3 rounded-xl bg-white/10 border border-white/20">
                          <div className="text-4xl font-black text-emerald-300 drop-shadow-md">
                            {progression.estimated_new_pr}
                          </div>
                          <div className="text-sm text-white/60 mt-1">sur 5K</div>
                        </div>
                      </div>
                    </div>

                    {/* Stats summary */}
                    {stats && (
                      <div className="mt-8 grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-white">{formatNumber(stats.total_distance)} km</div>
                          <div className="text-sm text-white/60">Distance totale</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-white">{formatNumber(stats.total_workouts)}</div>
                          <div className="text-sm text-white/60">Séances</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </section>
        )}


      </div>
    </>
  );
}
