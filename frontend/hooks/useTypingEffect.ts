import { useState, useEffect } from 'react';

interface UseTypingEffectOptions {
  text: string;
  speed?: number; // milliseconds per character
  startDelay?: number; // delay before starting
  enabled?: boolean; // control when to start
}

export function useTypingEffect({
  text,
  speed = 50,
  startDelay = 0,
  enabled = true,
}: UseTypingEffectOptions) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText('');
      setIsComplete(false);
      return;
    }

    let currentIndex = 0;
    setDisplayedText('');
    setIsComplete(false);

    const startTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          setIsComplete(true);
          clearInterval(interval);
        }
      }, speed);

      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(startTimeout);
  }, [text, speed, startDelay, enabled]);

  return { displayedText, isComplete };
}
