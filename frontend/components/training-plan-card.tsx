/**
 * Training Plan Card Component
 *
 * Displays a training plan summary with progress
 */

import React from 'react';
import Link from 'next/link';
import { TrainingPlanListItem } from '@/lib/api/training-plans';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TrainingPlanCardProps {
  plan: TrainingPlanListItem;
  onDelete?: (planId: number) => void;
}

export function TrainingPlanCard({ plan, onDelete }: TrainingPlanCardProps) {
  const progressPercentage = Math.round(plan.progress_percentage);

  const goalTypeLabels: Record<string, string> = {
    '5km': '5km',
    '10km': '10km',
    'semi': 'Semi-marathon',
    'marathon': 'Marathon',
  };

  const statusLabels: Record<string, string> = {
    active: 'Actif',
    completed: 'Terminé',
    paused: 'En pause',
    abandoned: 'Abandonné',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    paused: 'bg-yellow-100 text-yellow-800',
    abandoned: 'bg-red-100 text-red-800',
  };

  const startDate = new Date(plan.start_date);
  const endDate = new Date(plan.end_date);
  const targetDate = plan.target_date ? new Date(plan.target_date) : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Link
            href={`/training-plans/${plan.id}`}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
          >
            {plan.name}
          </Link>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-medium text-gray-700">
              {goalTypeLabels[plan.goal_type] || plan.goal_type}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-600">{plan.weeks_count} semaines</span>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            statusColors[plan.status] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {statusLabels[plan.status] || plan.status}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progression</span>
          <span className="text-sm font-semibold text-gray-900">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">Début</div>
          <div className="text-sm font-medium text-gray-900">
            {startDate.toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </div>

        {targetDate && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Objectif</div>
            <div className="text-sm font-medium text-gray-900">
              {targetDate.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        <Link
          href={`/training-plans/${plan.id}`}
          className="flex-1 text-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Voir le plan
        </Link>

        {onDelete && plan.status !== 'completed' && (
          <button
            onClick={() => onDelete(plan.id)}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
            aria-label="Supprimer le plan"
          >
            Supprimer
          </button>
        )}
      </div>

      {/* Created timestamp */}
      <div className="mt-3 text-xs text-gray-400">
        Créé{' '}
        {formatDistanceToNow(new Date(plan.created_at), {
          addSuffix: true,
          locale: fr,
        })}
      </div>
    </div>
  );
}

/**
 * Training Plan Card Skeleton (loading state)
 */
export function TrainingPlanCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-10"></div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2"></div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
        <div>
          <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        <div className="flex-1 h-10 bg-gray-200 rounded-lg"></div>
        <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  );
}
