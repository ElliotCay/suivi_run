'use client';

import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className = '' }: TypingIndicatorProps) {
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -4 },
  };

  const containerVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.2 }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      transition: { duration: 0.15 }
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`flex justify-start mb-4 ${className}`}
    >
      <div className="px-5 py-4 rounded-2xl bg-white/25 backdrop-blur-xl border border-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              variants={dotVariants}
              initial="initial"
              animate="animate"
              transition={{
                duration: 0.4,
                repeat: Infinity,
                repeatType: 'reverse',
                delay: index * 0.15,
                ease: 'easeInOut',
              }}
              className="w-2 h-2 rounded-full bg-white/70"
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
