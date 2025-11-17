'use client';

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
  if (isComplete && onComplete && !ChatBubble.completedCallbacks?.has(text)) {
    if (!ChatBubble.completedCallbacks) {
      ChatBubble.completedCallbacks = new Set();
    }
    ChatBubble.completedCallbacks.add(text);
    setTimeout(onComplete, 100);
  }

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
            ? 'bg-white/20 backdrop-blur-md border border-white/30 text-white'
            : 'bg-white/15 backdrop-blur-md border border-white/25 text-white/90'
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

// Static property pour tracker les callbacks complétés
ChatBubble.completedCallbacks = new Set<string>();
