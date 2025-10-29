'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircleIcon, CalendarIcon, ActivityIcon } from 'lucide-react';
import { ImportResult } from '@/types';
import Link from 'next/link';

interface ImportResultsProps {
  result: ImportResult;
}

export function ImportResults({ result }: ImportResultsProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="border-green-200 dark:border-green-900">
      <CardHeader>
        <div className="flex items-start gap-3">
          <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div>
            <CardTitle className="text-green-900 dark:text-green-100">
              Import réussi !
            </CardTitle>
            <CardDescription className="text-green-700 dark:text-green-300">
              Vos données ont été importées avec succès
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4">
            <div className="flex items-center gap-2 mb-1">
              <ActivityIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-xs font-medium text-green-700 dark:text-green-300">
                Entraînements importés
              </p>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {result.workouts_imported}
            </p>
          </div>

          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2 mb-1">
              <ActivityIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Doublons ignorés
              </p>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {result.duplicates_skipped}
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Période couverte
              </p>
            </div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {formatDate(result.date_range.start)}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              au {formatDate(result.date_range.end)}
            </p>
          </div>
        </div>

        {/* Summary Message */}
        <div className="rounded-md bg-green-50 dark:bg-green-950 p-4">
          <p className="text-sm text-green-800 dark:text-green-200">
            {result.workouts_imported === 0 ? (
              <>
                Aucun nouvel entraînement n'a été importé. Tous les entraînements de cette période
                sont déjà présents dans votre historique.
              </>
            ) : result.workouts_imported === 1 ? (
              <>
                <strong>1 entraînement</strong> a été importé avec succès.
                {result.duplicates_skipped > 0 && (
                  <>
                    {' '}
                    <strong>{result.duplicates_skipped} doublon
                    {result.duplicates_skipped > 1 ? 's ont' : ' a'}</strong> été ignoré
                    {result.duplicates_skipped > 1 ? 's' : ''}.
                  </>
                )}
              </>
            ) : (
              <>
                <strong>{result.workouts_imported} entraînements</strong> ont été importés avec succès.
                {result.duplicates_skipped > 0 && (
                  <>
                    {' '}
                    <strong>{result.duplicates_skipped} doublon
                    {result.duplicates_skipped > 1 ? 's ont' : ' a'}</strong> été ignoré
                    {result.duplicates_skipped > 1 ? 's' : ''}.
                  </>
                )}
              </>
            )}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-2">
          <Link href="/workouts">
            <Button size="lg" className="w-full md:w-auto">
              Voir mes entraînements
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
