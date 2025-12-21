'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { ChatBubble } from '@/components/ChatBubble';
import { TypingIndicator } from '@/components/TypingIndicator';
// import { useChatSounds } from '@/hooks/useChatSounds';

// Conversation messages
interface Message {
  id: number;
  text: string;
  sender: 'allure' | 'user';
  quickReplies?: string[]; // Options de réponse rapide après ce message
}

export default function Home() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [waitingForUserInput, setWaitingForUserInput] = useState(false);
  const [selectedReply, setSelectedReply] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showFinalContent, setShowFinalContent] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isTyping, setIsTyping] = useState(false);
  // Sons désactivés pour l'instant - hook conservé pour usage futur si besoin
  // const { playSendSound, playReceiveSound, playPopSound } = useChatSounds();

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

      // Si le prochain message est d'allure, montrer le typing indicator d'abord
      if (nextMessage.sender === 'allure') {
        setIsTyping(true);
        // Délai pour simuler la frappe
        setTimeout(() => {
          setIsTyping(false);
          setCurrentMessageIndex(prev => prev + 1);
          // Si le message a des quick replies, attendre l'input
          if (nextMessage.quickReplies) {
            setTimeout(() => setWaitingForUserInput(true), 1000);
          }
        }, 1200);
      } else {
        setCurrentMessageIndex(prev => prev + 1);
      }
    } else {
      // On a atteint le dernier message, afficher les sections "En savoir plus" et le CTA
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

  // Parallax effect on mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePosition({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Easter egg: after 15 seconds of inactivity on initial prompt
  useEffect(() => {
    if (conversationStarted || showEasterEgg) return;

    const timer = setTimeout(() => {
      setShowEasterEgg(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, [conversationStarted, showEasterEgg]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine which background to use based on theme
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');
  const backgroundImage = isDark
    ? '/allure-nightlight-new-background.png'
    : '/allure-daylight-new-background.png';

  return (
    <>
      {/* Background Image - Fixed to viewport with parallax effect */}
      <div
        className="fixed top-0 left-0 w-screen h-screen z-[-1] overflow-hidden"
        style={{
          width: '100vw',
          height: '100vh',
        }}
      >
        {mounted && (
          <>
            <div
              className="absolute inset-0 transition-transform duration-300 ease-out"
              style={{
                transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px) scale(1.1)`,
              }}
            >
              <Image
                src={backgroundImage}
                alt="Mountain landscape background"
                fill
                className="object-cover transition-opacity duration-500"
                priority
                quality={95}
                sizes="100vw"
                style={{
                  objectFit: 'cover',
                }}
              />
            </div>
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

                  {/* Typing indicator when Allure is "typing" */}
                  <AnimatePresence>
                    {isTyping && (
                      <TypingIndicator />
                    )}
                  </AnimatePresence>

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
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.25)' }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ delay: 0.6 }}
                        onClick={() => {
                          setConversationStarted(true);
                          setSelectedPath('yes');
                          setShowEasterEgg(false);
                          setCurrentMessageIndex(0);
                        }}
                        className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white/90 transition-all text-sm md:text-base cursor-pointer"
                      >
                        oui, carrément
                      </motion.button>
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.25)' }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ delay: 0.7 }}
                        onClick={() => {
                          setConversationStarted(true);
                          setSelectedPath('no');
                          setShowEasterEgg(false);
                          setCurrentMessageIndex(0);
                        }}
                        className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white/90 transition-all text-sm md:text-base cursor-pointer"
                      >
                        pas vraiment
                      </motion.button>
                    </motion.div>
                  )}

                  {/* Easter egg after 15s of inactivity */}
                  {!conversationStarted && showEasterEgg && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="mt-4"
                    >
                      <div className="flex justify-start">
                        <div className="max-w-[85%] md:max-w-[70%] px-5 py-3 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 text-white/80 text-sm italic">
                          le temps que t'as passé à hésiter, tu aurais pu le gagner sur ta prochaine course.
                        </div>
                      </div>
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
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.98 }}
                          className="group relative px-8 py-4 rounded-full bg-white/95 backdrop-blur-sm text-slate-900 font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex items-center gap-3"
                        >
                          {/* Espace invisible à gauche pour équilibrer la flèche à droite */}
                          <span className="w-4 opacity-0">→</span>
                          <svg className="h-5 w-5 text-[#FC4C02]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                          </svg>
                          <span>connecter strava</span>
                          <span className="w-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            →
                          </span>
                        </motion.button>
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
      </div>
    </>
  );
}
