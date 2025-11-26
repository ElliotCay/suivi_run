/**
 * Page de test pour le chat AI
 * Utilise des données fictives pour ne pas impacter les vraies données
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import TrainingBlockChatModal from '@/components/TrainingBlockChatModal';
import { Loader2, MessageSquare, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface TestBlock {
  block_id: number;
  workouts_count: number;
  message: string;
  block_name?: string;
  start_date?: string;
  end_date?: string;
}

export default function ChatTestPage() {
  const [testBlock, setTestBlock] = useState<TestBlock | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Créer ou charger le bloc de test au chargement de la page
  useEffect(() => {
    setupTestBlock();
  }, []);

  const setupTestBlock = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/test/setup-training-block`);
      setTestBlock(response.data);
      setSuccess(response.data.message);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Échec de la création du bloc de test');
      console.error('Setup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupTestData = async () => {
    if (!confirm('Voulez-vous vraiment supprimer toutes les données de test ?')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.delete(`${API_BASE_URL}/api/test/cleanup-test-data`);
      setSuccess(
        `✅ ${response.data.blocks_deleted} blocs, ${response.data.workouts_deleted} séances et ${response.data.conversations_deleted} conversations supprimés`
      );
      setTestBlock(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Échec du nettoyage');
      console.error('Cleanup error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatClose = () => {
    setIsChatOpen(false);
  };

  const handleChangesApplied = () => {
    setSuccess('✅ Les ajustements ont été appliqués avec succès !');
    // Recharger le bloc pour voir les modifications
    setupTestBlock();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="font-serif text-4xl font-bold bg-gradient-to-r from-[#ee95b3] to-[#667abf] bg-clip-text text-transparent">
            🧪 Test Chat AI
          </h1>
          <p className="text-white/60">
            Environnement de test isolé - Aucune donnée réelle n'est impactée
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* Test Block Info */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="font-serif">Bloc d'entraînement de test</CardTitle>
            <CardDescription>
              Ce bloc contient des séances fictives pour tester le chat AI
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && !testBlock ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-white/40" />
              </div>
            ) : testBlock ? (
              <>
                <div className="grid grid-cols-2 gap-4 font-mono text-sm">
                  <div>
                    <span className="text-white/40">ID du bloc:</span>
                    <span className="ml-2 text-white/80">{testBlock.block_id}</span>
                  </div>
                  <div>
                    <span className="text-white/40">Séances:</span>
                    <span className="ml-2 text-white/80">{testBlock.workouts_count}</span>
                  </div>
                  {testBlock.start_date && (
                    <div>
                      <span className="text-white/40">Début:</span>
                      <span className="ml-2 text-white/80">
                        {new Date(testBlock.start_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  {testBlock.end_date && (
                    <div>
                      <span className="text-white/40">Fin:</span>
                      <span className="ml-2 text-white/80">
                        {new Date(testBlock.end_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setIsChatOpen(true)}
                    className="flex-1 bg-gradient-to-r from-[#ee95b3] to-[#667abf] hover:opacity-90 transition-opacity h-12"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Ouvrir le chat AI
                  </Button>
                  <Button
                    onClick={cleanupTestData}
                    disabled={isLoading}
                    variant="outline"
                    className="bg-white/5 border-white/10 hover:bg-red-500/10 hover:border-red-500/20 h-12"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-white/40 mb-4">Aucun bloc de test disponible</p>
                <Button
                  onClick={setupTestBlock}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-[#ee95b3] to-[#667abf] hover:opacity-90 transition-opacity"
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Création...</>
                  ) : (
                    'Créer un bloc de test'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/70">
            <div className="flex items-start gap-2">
              <span className="text-white/40">1.</span>
              <p>Un bloc d'entraînement fictif de 4 semaines est créé automatiquement</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/40">2.</span>
              <p>Le bloc contient des séances passées (complétées) et futures (planifiées)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/40">3.</span>
              <p>Ouvrez le chat AI pour tester les ajustements conversationnels</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/40">4.</span>
              <p>L'IA ne peut modifier que les séances futures (sécurité garantie)</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/40">5.</span>
              <p>Testez les deux modes de scope : "depuis début du bloc" et "4 dernières semaines"</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-white/40">6.</span>
              <p className="text-[#ee95b3]">
                Une fois terminé, cliquez sur la corbeille pour supprimer toutes les données de test
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features to Test */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Fonctionnalités à tester</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#ee95b3]" />
                Conversation multi-tours avec l'IA
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#ee95b3]" />
                Questions initiales automatiques de l'IA
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#ee95b3]" />
                Switch entre les deux modes de scope
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#ee95b3]" />
                Compteur de tokens et de messages
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#ee95b3]" />
                Génération de propositions d'ajustements
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#ee95b3]" />
                Vue diff avant/après pour chaque ajustement
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#ee95b3]" />
                Validation et application des changements
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#ee95b3]" />
                Synchronisation iCloud Calendar
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#ee95b3]" />
                Gestion du prompt caching (vérifiez les badges "cached")
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Chat Modal */}
      {testBlock && (
        <TrainingBlockChatModal
          blockId={testBlock.block_id}
          isOpen={isChatOpen}
          onClose={handleChatClose}
          onChangesApplied={handleChangesApplied}
        />
      )}
    </div>
  );
}
