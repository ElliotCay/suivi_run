'use client'

import { useEffect } from 'react'
import Confetti from 'react-confetti'
import { useWindowSize } from 'react-use'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trophy } from 'lucide-react'

interface RecordCelebrationProps {
  open: boolean
  onClose: () => void
  record: {
    distance: string
    newTime: string
    oldTime?: string
    improvement?: string
  }
}

export default function RecordCelebration({ open, onClose, record }: RecordCelebrationProps) {
  const { width, height } = useWindowSize()

  if (!record) return null

  useEffect(() => {
    if (open) {
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        onClose()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [open, onClose])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {open && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={300}
          recycle={false}
          tweenDuration={5000}
        />
      )}
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center text-center p-6">
          <Trophy className="h-16 w-16 text-yellow-500 mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold mb-2">
            🎉 Nouveau Record !
          </h2>
          <p className="text-lg mb-2 font-bold">
            {record.distance} en {record.newTime}
          </p>
          {record.oldTime && record.improvement && (
            <p className="text-sm text-muted-foreground mb-4">
              Ancien record : {record.oldTime}
              <span className="text-green-600 font-semibold ml-2">
                (−{record.improvement})
              </span>
            </p>
          )}
          <Button onClick={onClose} size="lg" className="mt-4">
            Génial ! 🔥
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
