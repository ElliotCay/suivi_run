"use client";

import { Sparkles, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, Activity, Heart, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WorkoutAnalysis {
  id: number;
  workout_id: number;
  performance_vs_plan: "sur_objectif" | "conforme" | "sous_objectif" | "séance_libre";
  pace_variance_pct: number | null;
  hr_zone_variance: string | null;
  fatigue_detected: boolean;
  injury_risk_score: number;
  injury_risk_factors: string[] | null;
  summary: string;
  analyzed_at: string;
}

interface Workout {
  id: number;
  date: string;
  distance: number;
  duration: number;
  avg_pace: number;
  avg_hr: number | null;
  max_hr: number | null;
  workout_type: string | null;
  notes: string | null;
}

interface AdjustmentProposal {
  id: number;
  status: "pending" | "auto_applied" | "validated" | "rejected";
  adjustments: Array<{
    workout_id: number;
    action: string;
    current_value: string;
    proposed_value: string;
    change_pct: number;
    reasoning: string;
    scheduled_date?: string;
  }>;
  applied: boolean;
  created_at: string;
}

interface PostWorkoutAnalysisCardProps {
  analysis: WorkoutAnalysis;
  workout?: Workout | null;
  proposal?: AdjustmentProposal | null;
  onValidate?: (proposalId: number) => void;
  onReject?: (proposalId: number) => void;
}

// Helper functions
function formatPace(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  }
  return `${minutes} min`;
}

function parseHRZoneVariance(variance: string | null): { text: string; alert: boolean } {
  if (!variance) return { text: "Conforme", alert: false };

  // Parse patterns like "zone_3_au_lieu_de_seuil"
  const match = variance.match(/zone_(\d+)_au_lieu_de_(.+)/);
  if (match) {
    const [_, actualZone, expectedZone] = match;
    const zoneMap: Record<string, string> = {
      "seuil": "Seuil",
      "facile": "Facile",
      "endurance": "Endurance",
      "1": "Z1",
      "2": "Z2",
      "3": "Z3",
      "4": "Z4",
      "5": "Z5"
    };
    const actual = zoneMap[actualZone] || `Z${actualZone}`;
    const expected = zoneMap[expectedZone] || expectedZone;

    // Alert if zone is higher than expected
    const alert = parseInt(actualZone) > 3;

    return {
      text: `${actual} (vs ${expected})`,
      alert
    };
  }

  return { text: variance, alert: false };
}

function extractActionFromSummary(summary: string): string | null {
  // Extract key actionable advice from summary
  const actionPatterns = [
    /planifie.*?(séance facile|repos|récupération)/i,
    /recommande.*?(séance facile|repos|récupération)/i,
    /impératif.*?(séance facile|repos|récupération)/i,
  ];

  for (const pattern of actionPatterns) {
    const match = summary.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}

function getInjuryRiskContext(score: number): { level: string; color: string; message: string } {
  if (score < 3) {
    return {
      level: "Faible",
      color: "text-green-500",
      message: "Risque minimal"
    };
  } else if (score < 6) {
    return {
      level: "Modéré",
      color: "text-amber-500",
      message: "Sois vigilant"
    };
  } else {
    return {
      level: "Élevé",
      color: "text-red-500",
      message: "Attention !"
    };
  }
}

export function PostWorkoutAnalysisCard({
  analysis,
  workout,
  proposal,
  onValidate,
  onReject,
}: PostWorkoutAnalysisCardProps) {
  const hrZone = parseHRZoneVariance(analysis.hr_zone_variance);
  const injuryRisk = getInjuryRiskContext(analysis.injury_risk_score);
  const actionAdvice = extractActionFromSummary(analysis.summary);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 group">
      {/* Gradient border on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: "linear-gradient(90deg, #ee95b3, #667abf)",
          padding: "1px",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#ee95b3]" />
            <h3 className="font-serif text-2xl font-bold">Analyse IA</h3>
          </div>
          <Badge className="bg-gradient-to-r from-[#ee95b3] to-[#667abf] text-white border-0">
            Post-séance
          </Badge>
        </div>

        {/* Performance badge */}
        <PerformanceBadge status={analysis.performance_vs_plan} />

        {/* Workout summary (if available) */}
        {workout && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono font-bold">{workout.distance.toFixed(1)}km</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono font-bold">{formatPace(workout.avg_pace)}/km</span>
            </div>
            {workout.avg_hr && (
              <div className="flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono font-bold">{workout.avg_hr} bpm</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className="font-sans">{formatDuration(workout.duration)}</span>
            </div>
          </div>
        )}

        {/* Action recommendation (if exists) */}
        {actionAdvice && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-sans text-sm font-semibold text-amber-600 dark:text-amber-400">
                  Action recommandée
                </p>
                <p className="font-sans text-sm text-muted-foreground capitalize">
                  {actionAdvice}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="space-y-2">
          <p className="font-sans text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Analyse détaillée
          </p>
          <p className="font-sans text-sm text-foreground/90 leading-relaxed">
            {analysis.summary}
          </p>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Allure"
            value={workout ? formatPace(workout.avg_pace) + "/km" : "N/A"}
            subValue={
              analysis.pace_variance_pct !== null
                ? `${analysis.pace_variance_pct > 0 ? "+" : ""}${analysis.pace_variance_pct.toFixed(1)}% vs plan`
                : undefined
            }
            positive={analysis.pace_variance_pct !== null && analysis.pace_variance_pct < 0}
            icon={<Zap className="h-4 w-4" />}
          />
          <MetricCard
            label="Zone FC"
            value={hrZone.text}
            alert={hrZone.alert}
            icon={<Heart className="h-4 w-4" />}
          />
          <MetricCard
            label="Risque blessure"
            value={`${analysis.injury_risk_score.toFixed(1)}/10`}
            subValue={injuryRisk.level}
            alert={analysis.injury_risk_score > 6}
            positive={analysis.injury_risk_score < 3}
            icon={<AlertCircle className="h-4 w-4" />}
          />
        </div>

        {/* Adjustments */}
        {proposal && (
          <AdjustmentProposalSection
            proposal={proposal}
            onValidate={onValidate}
            onReject={onReject}
          />
        )}
      </div>
    </div>
  );
}

function PerformanceBadge({
  status,
}: {
  status: "sur_objectif" | "conforme" | "sous_objectif" | "séance_libre";
}) {
  const configs = {
    sur_objectif: {
      label: "Au-dessus de l'objectif",
      color: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
      icon: <TrendingUp className="h-4 w-4" />,
    },
    conforme: {
      label: "Conforme au plan",
      color: "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
      icon: <CheckCircle className="h-4 w-4" />,
    },
    sous_objectif: {
      label: "En-dessous de l'objectif",
      color: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
      icon: <TrendingDown className="h-4 w-4" />,
    },
    séance_libre: {
      label: "Séance libre",
      color: "bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400",
      icon: <Minus className="h-4 w-4" />,
    },
  };

  const config = configs[status] || configs.séance_libre;

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-lg border px-3 py-2", config.color)}>
      {config.icon}
      <span className="font-sans text-sm font-medium">{config.label}</span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subValue,
  positive,
  alert,
  icon,
}: {
  label: string;
  value: string;
  subValue?: string;
  positive?: boolean;
  alert?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 space-y-1.5 bg-background/50",
        alert ? "border-red-500/20 bg-red-500/5" : positive ? "border-green-500/20 bg-green-500/5" : "border-white/10"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-sans text-xs text-muted-foreground">{label}</p>
        {icon && (
          <span
            className={cn(
              alert
                ? "text-red-500"
                : positive
                ? "text-green-500"
                : "text-muted-foreground"
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        <p
          className={cn(
            "font-mono text-base font-bold tabular-nums leading-none",
            alert ? "text-red-500" : positive ? "text-green-500" : ""
          )}
        >
          {value}
        </p>
        {subValue && (
          <p className="font-sans text-xs text-muted-foreground">
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}

function AdjustmentProposalSection({
  proposal,
  onValidate,
  onReject,
}: {
  proposal: AdjustmentProposal;
  onValidate?: (proposalId: number) => void;
  onReject?: (proposalId: number) => void;
}) {
  if (proposal.status === "auto_applied") {
    return (
      <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="font-sans text-sm font-semibold text-green-600 dark:text-green-400">
            Ajustements appliqués automatiquement
          </p>
        </div>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {proposal.adjustments.map((adj, index) => (
            <li key={index}>
              • {adj.action.replace("_", " ")} : {adj.current_value} → {adj.proposed_value}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (proposal.status === "validated") {
    return (
      <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="font-sans text-sm font-semibold text-green-600 dark:text-green-400">
            Ajustements validés et appliqués
          </p>
        </div>
      </div>
    );
  }

  if (proposal.status === "rejected") {
    return (
      <div className="rounded-xl bg-gray-500/10 border border-gray-500/20 p-4">
        <div className="flex items-center gap-2">
          <Minus className="h-5 w-5 text-gray-500" />
          <p className="font-sans text-sm font-semibold text-gray-600 dark:text-gray-400">
            Proposition ignorée
          </p>
        </div>
      </div>
    );
  }

  // Pending status - show validation UI
  return (
    <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-amber-500" />
        <p className="font-sans text-sm font-semibold text-amber-600 dark:text-amber-400">
          Ajustements proposés (changements &gt;10%)
        </p>
      </div>

      {proposal.adjustments.map((adj, index) => (
        <div key={index} className="bg-background/50 rounded-lg p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm font-bold">
              {adj.scheduled_date
                ? new Date(adj.scheduled_date).toLocaleDateString("fr-FR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })
                : "À venir"}
            </span>
            <Badge variant="outline" className="bg-amber-500/10">
              {adj.change_pct}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {adj.current_value} → {adj.proposed_value}
          </p>
          <p className="text-xs italic text-muted-foreground">{adj.reasoning}</p>
        </div>
      ))}

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => onValidate?.(proposal.id)}
          className="flex-1 bg-gradient-to-r from-[#ee95b3] to-[#667abf] text-white font-sans text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          Valider les ajustements
        </button>
        <button
          onClick={() => onReject?.(proposal.id)}
          className="flex-1 border border-white/10 font-sans text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          Ignorer
        </button>
      </div>
    </div>
  );
}
