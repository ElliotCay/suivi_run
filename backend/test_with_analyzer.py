"""
Test the feedback analyzer with the negative feedback we created.
"""

from database import SessionLocal
from models import TrainingBlock
from services.feedback_analyzer import get_block_summary, calculate_acwr


def test_analyzer():
    """Test the feedback analyzer on block with negative feedback."""
    db = SessionLocal()

    try:
        print("\n" + "=" * 70)
        print("ANALYSE DU BLOC AVEC FEEDBACKS NÉGATIFS")
        print("=" * 70)

        # Get active block
        block = db.query(TrainingBlock).filter(
            TrainingBlock.user_id == 1,
            TrainingBlock.status == "active"
        ).first()

        if not block:
            print("❌ Aucun bloc actif trouvé")
            return

        # Get block summary with analysis
        summary = get_block_summary(db, block.id)

        print(f"\n📊 RÉSUMÉ DU BLOC")
        print(f"   Nom: {summary['block_name']}")
        print(f"   Phase: {summary['phase'].upper()}")
        print(f"   Période: {summary['start_date'].strftime('%d/%m')} - {summary['end_date'].strftime('%d/%m')}")
        print(f"   Séances: {summary['completed_workouts']}/{summary['total_workouts']} complétées ({summary['completion_rate']:.0f}%)")

        analysis = summary['analysis']
        print(f"\n📈 MÉTRIQUES")
        print(f"   RPE moyen: {analysis['avg_rpe']:.1f}/10")
        print(f"   Séances trop difficiles: {analysis['too_hard_percentage']:.0f}%")
        print(f"   Séances avec douleur: {analysis['pain_percentage']:.0f}%")
        print(f"   Écart d'allure moyen: {analysis['avg_pace_variance']:+.1f}%")

        if analysis['pain_locations']:
            print(f"   Douleurs détectées:")
            for location, count in analysis['pain_locations'].items():
                print(f"      - {location}: {count} séance(s)")

        # Calculate ACWR
        acwr = calculate_acwr(db, 1)
        print(f"\n⚖️  ACWR (Charge Aiguë/Chronique): {acwr:.2f}")
        if acwr > 1.5:
            print(f"      🚨 DANGER: ACWR > 1.5 (risque de blessure élevé)")
        elif acwr > 1.3:
            print(f"      ⚠️  ATTENTION: ACWR > 1.3 (surveiller)")
        elif acwr >= 0.8:
            print(f"      ✅ SAFE: ACWR dans la zone de sécurité (0.8-1.3)")
        else:
            print(f"      ⚠️  ATTENTION: ACWR < 0.8 (déconditionnement possible)")

        # Warnings
        if summary['warnings']:
            print(f"\n🚨 ALERTES ({len(summary['warnings'])})")
            for warning in summary['warnings']:
                severity_icon = "🔴" if warning['severity'] == "critical" else "🟠" if warning['severity'] == "high" else "🟡"
                print(f"   {severity_icon} {warning['icon']} {warning['message']}")

        # Recommendations
        if summary['recommendations']:
            print(f"\n💡 RECOMMANDATIONS POUR LE PROCHAIN BLOC ({len(summary['recommendations'])})")
            for rec in summary['recommendations']:
                priority_icon = "🔴" if rec['priority'] == "critical" else "🟠" if rec['priority'] == "high" else "🟢"
                print(f"   {priority_icon} {rec['icon']} {rec['message']}")

        # Next block suggestions
        print(f"\n🎯 AJUSTEMENTS POUR LE PROCHAIN BLOC")
        if summary['suggested_volume_adjustment'] != 0:
            sign = "+" if summary['suggested_volume_adjustment'] > 0 else ""
            print(f"   Volume: {sign}{summary['suggested_volume_adjustment']:.0f}%")
        print(f"   Phase suggérée: {summary['suggested_phase'].upper()}")

        if summary['analysis']['has_critical_issues']:
            print(f"\n🛑 ISSUES CRITIQUES DÉTECTÉES")
            print(f"   Le système recommande:")
            print(f"   1. Mettre le bloc actuel en pause")
            print(f"   2. Prioriser le repos et le renforcement")
            print(f"   3. Consulter un professionnel si douleurs persistantes")
            print(f"   4. Reprendre avec un bloc de récupération (volume réduit)")

        print(f"\n✅ Analyse terminée!")

    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()


if __name__ == "__main__":
    test_analyzer()
