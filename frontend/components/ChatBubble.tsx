'use client';
import { useRef, useEffect } from 'react';

import { motion } from 'framer-motion';
import { useTypingEffect } from '@/hooks/useTypingEffect';

interface ChatBubbleProps {
  text: string;
  sender: 'allure' | 'user';
  enabled: boolean;
  delay?: number;
  onComplete?: () => void;
  speed?: number;
}

export function ChatBubble({ text, sender, enabled, delay = 0, onComplete, speed = 35 }: ChatBubbleProps) {
  const { displayedText, isComplete } = useTypingEffect({
    text,
    speed,
    startDelay: delay,
    enabled,
  });

  // Callback quand le typing est terminé
  const hasCalledComplete = useRef(false);

  useEffect(() => {
    if (isComplete && onComplete && !hasCalledComplete.current) {
      hasCalledComplete.current = true;
      // Petit délai pour laisser le temps à l'animation de se finir visuellement
      const timer = setTimeout(onComplete, 100);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onComplete]);

  const isAllure = sender === 'allure';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay / 1000 }}
      className={`flex ${isAllure ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div
        className={`
          max-w-[85%] md:max-w-[70%] px-5 py-3 rounded-2xl
          ${isAllure
            ? 'bg-white/25 backdrop-blur-xl border border-white/40 text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]'
            : 'bg-white/15 backdrop-blur-lg border border-white/20 text-white/90'
          }
          transition-all duration-200 ease-out
        `}
      >
        <p className="text-base md:text-lg leading-relaxed">
          {enabled ? displayedText : text}
          {enabled && !isComplete && (
            <span className="inline-block w-[2px] h-5 bg-white/70 ml-1 animate-pulse" />
          )}
        </p>
      </div>
    </motion.div>
  );
}
