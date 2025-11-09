'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getHealthCheck } from '@/lib/api';
import { HealthCheckResponse } from '@/types';
import Link from 'next/link';
import { UploadIcon, Target, Calendar, TrendingUp } from 'lucide-react';
import axios from 'axios';

interface UserProfile {
  objectives: Array<{
    event: string
    date: string
    target_pace_min: number
    target_pace_max: number
    priority: string
  }>
}

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avgPace, setAvgPace] = useState<number | null>(null);

  useEffect(() => {
    async function checkHealth() {
      setIsLoading(true);
      const { data, error } = await getHealthCheck();

      if (error) {
        setError(error);
      } else {
        setHealthStatus(data);
      }

      setIsLoading(false);
    }

    checkHealth();
    loadProfile();
    loadRecentPace();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/profile');
      setProfile(response.data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadRecentPace = async () => {
    try {
      // Get last 10 workouts to calculate average pace
      const response = await axios.get('http://localhost:8000/api/workouts?limit=10');
      const workouts = response.data;
      if (workouts && workouts.length > 0) {
        const paceSum = workouts.reduce((sum: number, w: any) => {
          return sum + (w.avg_pace || 0);
        }, 0);
        setAvgPace(paceSum / workouts.length);
      }
    } catch (error) {
      console.error('Error loading recent pace:', error);
    }
  };

  const getDaysUntil = (dateStr: string): number => {
    const target = new Date(dateStr);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const formatPace = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const primaryObjective = profile?.objectives?.find((obj) => obj.priority === 'primary');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <main className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Accueil
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Application de suivi d'entraînement de course à pied
          </p>
        </div>

        {/* Goal Countdown and Preparation */}
        {primaryObjective && (
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <Card className="border-blue-500 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Compte à rebours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-5xl font-bold text-blue-600 mb-2">
                    {getDaysUntil(primaryObjective.date)}
                  </div>
                  <div className="text-lg text-muted-foreground mb-4">
                    jours avant {primaryObjective.event}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(primaryObjective.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-500 border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  Préparation objectif
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Allure cible</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatPace(primaryObjective.target_pace_min)} - {formatPace(primaryObjective.target_pace_max)}/km
                    </div>
                  </div>
                  {avgPace && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Allure actuelle (10 dernières séances)</div>
                      <div className="text-2xl font-bold">
                        {formatPace(avgPace)}/km
                      </div>
                      <div className="mt-2">
                        {avgPace <= primaryObjective.target_pace_max ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-sm font-medium">Dans la zone cible !</span>
                          </div>
                        ) : (
                          <div className="text-sm text-orange-600">
                            À travailler : {formatPace(avgPace - primaryObjective.target_pace_max)}/km de marge
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Statut de l'API Backend</CardTitle>
              <CardDescription>
                Connexion au serveur backend
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Vérification...
                  </span>
                </div>
              ) : error ? (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
                  <p className="text-sm font-medium text-destructive">
                    Erreur de connexion
                  </p>
                  <p className="mt-1 text-sm text-destructive/80">
                    {error}
                  </p>
                </div>
              ) : healthStatus ? (
                <div className="rounded-md bg-green-500/10 border border-green-500/20 p-4">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Backend connecté
                  </p>
                  <p className="mt-1 text-sm text-green-600 dark:text-green-500">
                    Status: {healthStatus.status}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
              <CardDescription>
                Commencer à utiliser l'application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/workouts" className="block">
                <Button className="w-full" variant="outline">
                  Voir l'historique
                </Button>
              </Link>
              <Link href="/dashboard" className="block">
                <Button className="w-full" variant="outline">
                  Statistiques
                </Button>
              </Link>
              <Link href="/import" className="block">
                <Button className="w-full" variant="outline">
                  <UploadIcon className="mr-2 h-4 w-4" />
                  Importer des données
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
