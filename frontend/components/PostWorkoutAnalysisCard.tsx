"use client";

import { Sparkles, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle } from "lucide-react";
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
  proposal?: AdjustmentProposal | null;
  onValidate?: (proposalId: number) => void;
  onReject?: (proposalId: number) => void;
}

export function PostWorkoutAnalysisCard({
  analysis,
  proposal,
  onValidate,
  onReject,
}: PostWorkoutAnalysisCardProps) {
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

      <div className="relative z-10 space-y-4">
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

        {/* Summary */}
        <p className="font-sans text-sm text-muted-foreground leading-relaxed">
          {analysis.summary}
        </p>

        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Allure vs plan"
            value={
              analysis.pace_variance_pct !== null
                ? `${analysis.pace_variance_pct > 0 ? "+" : ""}${analysis.pace_variance_pct.toFixed(1)}%`
                : "N/A"
            }
            positive={analysis.pace_variance_pct !== null && analysis.pace_variance_pct < 0}
            icon={
              analysis.pace_variance_pct === null ? (
                <Minus className="h-4 w-4" />
              ) : analysis.pace_variance_pct < 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )
            }
          />
          <MetricCard
            label="Zone FC"
            value={analysis.hr_zone_variance || "Conforme"}
            icon={<Minus className="h-4 w-4" />}
          />
          <MetricCard
            label="Risque blessure"
            value={`${analysis.injury_risk_score.toFixed(1)}/10`}
            alert={analysis.injury_risk_score > 6}
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
  positive,
  alert,
  icon,
}: {
  label: string;
  value: string;
  positive?: boolean;
  alert?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 space-y-1 bg-background/50",
        alert ? "border-red-500/20 bg-red-500/5" : "border-white/10"
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
      <p
        className={cn(
          "font-mono text-lg font-bold tabular-nums",
          alert ? "text-red-500" : positive ? "text-green-500" : ""
        )}
      >
        {value}
      </p>
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
