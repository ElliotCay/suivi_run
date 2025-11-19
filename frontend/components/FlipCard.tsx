'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface FlipCardProps {
  front: React.ReactNode
  back: React.ReactNode
  isFlipped?: boolean
  onFlip?: (flipped: boolean) => void
  className?: string
  transitionDuration?: number
}

export function FlipCard({
  front,
  back,
  isFlipped: controlledIsFlipped,
  onFlip,
  className,
  transitionDuration = 0.35
}: FlipCardProps) {
  const [internalIsFlipped, setInternalIsFlipped] = useState(false)
  const isFlipped = controlledIsFlipped ?? internalIsFlipped

  const handleClick = () => {
    if (controlledIsFlipped === undefined) {
      setInternalIsFlipped(!internalIsFlipped)
    }
    onFlip?.(!isFlipped)
  }

  return (
    <div
      className={cn('relative h-full w-full perspective-1000 cursor-pointer', className)}
      onClick={handleClick}
    >
      <motion.div
        className="relative h-full w-full preserve-3d"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: transitionDuration, ease: 'easeInOut' }}
      >
        <div className="absolute inset-0 h-full w-full backface-hidden">
          {front}
        </div>
        <div className="absolute inset-0 h-full w-full backface-hidden rotate-y-180">
          {back}
        </div>
      </motion.div>
    </div>
  )
}
