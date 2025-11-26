/**
 * WeeklyRecapCard component for displaying AI-generated weekly recaps.
 */
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WeeklyRecap } from '@/hooks/useWeeklyRecaps';
import { CalendarDays, TrendingUp, Activity, Heart, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface WeeklyRecapCardProps {
  recap: WeeklyRecap;
  onMarkAsViewed?: (recapId: number) => void;
  showMetrics?: boolean;
}

export default function WeeklyRecapCard({
  recap,
  onMarkAsViewed,
  showMetrics = true
}: WeeklyRecapCardProps) {
  const [isNew, setIsNew] = useState(!recap.is_viewed);

  useEffect(() => {
    // Mark as viewed after 3 seconds if not already viewed
    if (!recap.is_viewed && onMarkAsViewed) {
      const timer = setTimeout(() => {
        onMarkAsViewed(recap.id);
        setIsNew(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [recap.id, recap.is_viewed, onMarkAsViewed]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatPace = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}/km`;
  };

  const weekStart = formatDate(recap.week_start_date);
  const weekEnd = formatDate(recap.week_end_date);

  return (
    <Card className={`relative overflow-hidden transition-all ${
      isNew ? 'ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/20' : ''
    }`}>
      {isNew && (
        <div className="absolute top-3 right-3">
          <span className="flex items-center gap-1 bg-amber-500 text-white text-xs font-medium px-2 py-1 rounded-full">
            <Sparkles className="h-3 w-3" />
            Nouveau
          </span>
        </div>
      )}

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          Récapitulatif de la semaine
        </CardTitle>
        <CardDescription>
          {weekStart} → {weekEnd}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Metrics Grid */}
        {showMetrics && (recap.sessions_completed !== null || recap.total_volume_km !== null) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg">
            {recap.sessions_completed !== null && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Séances</span>
                <span className="text-lg font-semibold flex items-center gap-1">
                  <Activity className="h-4 w-4 text-blue-500" />
                  {recap.sessions_completed}
                </span>
              </div>
            )}

            {recap.total_volume_km !== null && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Volume</span>
                <span className="text-lg font-semibold flex items-center gap-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  {recap.total_volume_km.toFixed(1)}km
                </span>
              </div>
            )}

            {recap.avg_pace_seconds !== null && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Allure moy.</span>
                <span className="text-lg font-semibold">
                  {formatPace(recap.avg_pace_seconds)}
                </span>
              </div>
            )}

            {recap.avg_heart_rate !== null && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">FC moy.</span>
                <span className="text-lg font-semibold flex items-center gap-1">
                  <Heart className="h-4 w-4 text-red-500" />
                  {recap.avg_heart_rate} bpm
                </span>
              </div>
            )}
          </div>
        )}

        {/* AI-Generated Recap Text */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {recap.recap_text}
          </ReactMarkdown>
        </div>

        {/* Generated timestamp */}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Généré le {new Date(recap.generated_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>Propulsé par Claude AI</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
