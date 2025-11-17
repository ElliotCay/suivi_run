'use client';

import { Badge } from '@/hooks/useBadges';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BadgeCardProps {
  badge: Badge;
  showDate?: boolean;
}

export function BadgeCard({ badge, showDate = true }: BadgeCardProps) {
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'volume':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400';
      case 'record':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400';
      case 'regularity':
        return 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400';
      case 'progression':
        return 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400';
      default:
        return 'bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400';
    }
  };

  const formatMetricValue = (value: number | null, type: string, key: string) => {
    if (!value) return null;

    // For distance badges
    if (key.includes('km')) {
      return `${value.toFixed(1)} km`;
    }

    // For percentage badges
    if (key.includes('pct') || key.includes('increase')) {
      return `+${value.toFixed(0)}%`;
    }

    // For session count badges
    if (key.includes('session')) {
      return `${value} séances`;
    }

    // For week count badges
    if (key.includes('week')) {
      return `${value} semaines`;
    }

    // Default
    return value.toFixed(1);
  };

  return (
    <Card className={`${getBadgeColor(badge.badge_type)} border transition-all hover:scale-105`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Badge Icon */}
          <div className="text-3xl flex-shrink-0">
            {badge.badge_icon || '🏆'}
          </div>

          {/* Badge Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1">
              {badge.badge_name}
            </h3>

            {badge.badge_description && (
              <p className="text-sm opacity-80 mb-2">
                {badge.badge_description}
              </p>
            )}

            {badge.metric_value && (
              <p className="text-xs font-mono opacity-70">
                {formatMetricValue(badge.metric_value, badge.badge_type, badge.badge_key)}
              </p>
            )}

            {showDate && (
              <p className="text-xs opacity-60 mt-2">
                Débloqué {formatDistanceToNow(new Date(badge.unlocked_at), {
                  addSuffix: true,
                  locale: fr
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
