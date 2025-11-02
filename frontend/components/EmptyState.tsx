'use client'

import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="mt-6">
      <CardContent className="py-16 text-center">
        <Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-base font-bold mb-2">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
          {description}
        </p>
        {action && (
          action.href ? (
            <a href={action.href}>
              <Button variant="outline">
                {action.label}
              </Button>
            </a>
          ) : (
            <Button variant="outline" onClick={action.onClick}>
              {action.label}
            </Button>
          )
        )}
      </CardContent>
    </Card>
  )
}
