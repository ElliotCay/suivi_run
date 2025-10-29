# 🚀 PROCHAINES ÉTAPES - Guide Complet

## 📋 RÉSUMÉ DE LA SESSION

### ✨ Ce qui a été accompli aujourd'hui

#### Phase 1 & 2: Setup + Import (100% ✅)
- ✅ Infrastructure complète (Backend FastAPI + Frontend Next.js)
- ✅ Import Apple Health fonctionnel
- ✅ **51 workouts importés dans la BDD**

#### Phase 3-4: Backend APIs (100% ✅)
- ✅ API workouts complète (liste, détail, update, stats)
- ✅ API profile (get, update)
- ✅ Schemas Pydantic complets

### 🔧 Ce qui reste à faire

#### Phase 3-4: Frontend (70% restant)
- ⏳ 4 pages/composants à créer
- Temps estimé: 2-3h

#### Phases 5-6: Claude + Dashboard (100% restant)
- ⏳ Service Claude AI
- ⏳ Suggestions d'entraînement
- ⏳ Dashboard avec graphiques
- Temps estimé: 7-8h

---

## 📝 INSTRUCTIONS DÉTAILLÉES POUR CONTINUER

### ÉTAPE 1: Finir les pages frontend (2-3h)

#### 1.1 Page liste workouts
**Fichier**: `/frontend/app/workouts/page.tsx`

Le fichier a déjà été créé mais peut nécessiter des ajustements. Vérifier:
- Import axios fonctionne
- Affichage liste cards
- Filtres de recherche
- Navigation vers détail

#### 1.2 Page détail workout
**Fichier**: `/frontend/app/workouts/[id]/page.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import axios from 'axios'

// TODO: Implémenter:
// - Chargement workout par ID
// - Affichage toutes métriques
// - Formulaire commentaire + rating (1-5 étoiles)
// - Sélection type (facile/tempo/fractionné/longue)
// - Bouton sauvegarde avec PATCH /api/workouts/:id
```

#### 1.3 Page profil utilisateur
**Fichier**: `/frontend/app/profile/page.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import axios from 'axios'

// TODO: Implémenter:
// - Chargement profil GET /api/profile
// - Sections: Info perso, Blessures, Objectifs, Équipement
// - Formulaires éditables (react-hook-form + zod)
// - Sauvegarde PATCH /api/profile
```

#### 1.4 Composant graphique volume
**Fichier**: `/frontend/components/VolumeChart.tsx`

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// TODO: Implémenter:
// - Récupérer données GET /api/workouts/stats/weekly
// - Afficher graphique recharts
// - Volume hebdo sur 8 semaines
```

---

### ÉTAPE 2: Intégration Claude AI (3-4h)

#### 2.1 Backend - Service Claude
**Fichier**: `/backend/services/claude_service.py`

```python
from anthropic import Anthropic
import os
import logging

logger = logging.getLogger(__name__)

# Initialiser client
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def build_suggestion_prompt(user_profile, recent_workouts, program_week):
    """
    Construire prompt pour suggestion d'entraînement.
    
    Args:
        user_profile: Dict avec profil utilisateur
        recent_workouts: List des 4 dernières semaines
        program_week: Semaine actuelle dans programme 8 semaines
    
    Returns:
        str: Prompt formaté pour Claude
    """
    prompt = f"""Tu es un coach running spécialisé dans la prévention des blessures.

PROFIL UTILISATEUR:
- Niveau: {user_profile.get('current_level')}
- Objectif: Semi-marathon mars-avril 2026
- Blessure: Syndrome essuie-glace (sorti de blessure)
- Volume hebdo cible: {user_profile.get('weekly_volume')} km
- Programme: Semaine {program_week}/8 - Consolidation

HISTORIQUE 4 DERNIÈRES SEMAINES:
{format_workouts_history(recent_workouts)}

QUESTION:
Que me suggères-tu comme prochaine séance ?
Fournis en format JSON:
{{
  "type": "facile|tempo|fractionné|longue",
  "distance_km": 0.0,
  "allure_cible": "X:XX/km",
  "structure": "Description détaillée",
  "raison": "Explication logique"
}}
"""
    return prompt

def call_claude_api(prompt, use_sonnet=True):
    """
    Appeler API Claude et retourner suggestion.
    
    Args:
        prompt: Prompt formaté
        use_sonnet: True pour Sonnet 4.5, False pour Haiku 4.5
    
    Returns:
        dict: Réponse parsée avec tokens utilisés
    """
    model = "claude-sonnet-4-5" if use_sonnet else "claude-haiku-4-5"
    
    try:
        response = client.messages.create(
            model=model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        
        content = response.content[0].text
        tokens = response.usage.input_tokens + response.usage.output_tokens
        
        logger.info(f"Claude API call: {model}, {tokens} tokens")
        
        return {
            "content": content,
            "model": model,
            "tokens": tokens
        }
    except Exception as e:
        logger.error(f"Claude API error: {e}")
        raise

def format_workouts_history(workouts):
    """Formater historique pour prompt"""
    lines = []
    for w in workouts:
        date_str = w.date.strftime("%Y-%m-%d")
        lines.append(f"- {date_str}: {w.distance}km en {w.duration//60}min, FC moy {w.avg_hr} bpm")
    return "\n".join(lines)
```

#### 2.2 Backend - Router suggestions
**Fichier**: `/backend/routers/suggestions.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, Workout, Suggestion
from services.claude_service import build_suggestion_prompt, call_claude_api
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/suggestions/generate")
async def generate_suggestion(db: Session = Depends(get_db), user_id: int = 1):
    """Générer suggestion d'entraînement via Claude"""
    # 1. Récupérer profil utilisateur
    user = db.query(User).filter(User.id == user_id).first()
    
    # 2. Récupérer 4 dernières semaines d'entraînement
    from datetime import datetime, timedelta
    four_weeks_ago = datetime.now() - timedelta(weeks=4)
    recent_workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= four_weeks_ago
    ).order_by(Workout.date.desc()).all()
    
    # 3. Construire prompt
    prompt = build_suggestion_prompt(user.__dict__, recent_workouts, program_week=2)
    
    # 4. Appeler Claude
    response = call_claude_api(prompt, use_sonnet=True)
    
    # 5. Parser et sauvegarder suggestion
    import json
    suggestion_data = json.loads(response["content"])
    
    new_suggestion = Suggestion(
        user_id=user_id,
        workout_type=suggestion_data["type"],
        distance=suggestion_data.get("distance_km"),
        structure=suggestion_data,
        reasoning=suggestion_data.get("raison"),
        model_used=response["model"],
        tokens_used=response["tokens"]
    )
    db.add(new_suggestion)
    db.commit()
    db.refresh(new_suggestion)
    
    return new_suggestion

@router.get("/suggestions")
async def get_suggestions(db: Session = Depends(get_db), user_id: int = 1):
    """Récupérer historique suggestions"""
    suggestions = db.query(Suggestion).filter(
        Suggestion.user_id == user_id
    ).order_by(Suggestion.created_at.desc()).all()
    return suggestions
```

**N'oublie pas d'ajouter le router dans main.py:**
```python
from routers import import_router, workouts, profile, suggestions
app.include_router(suggestions.router, prefix="/api", tags=["suggestions"])
```

#### 2.3 Frontend - Page suggestions
**Fichier**: `/frontend/app/suggestions/page.tsx`

```tsx
'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import axios from 'axios'

// TODO: Implémenter:
// - Bouton "Générer suggestion" 
// - Appel POST /api/suggestions/generate
// - Affichage suggestion (type, distance, allure, structure, raison)
// - Historique GET /api/suggestions
// - Bouton "Marquer comme réalisée"
```

---

### ÉTAPE 3: Dashboard & Analytics (3-4h)

#### 3.1 Backend - Router dashboard
**Fichier**: `/backend/routers/dashboard.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Workout
from datetime import datetime, timedelta
from sqlalchemy import func

router = APIRouter()

@router.get("/dashboard/summary")
async def get_dashboard_summary(db: Session = Depends(get_db), user_id: int = 1):
    """Résumé semaine en cours"""
    today = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())
    
    # Workouts de la semaine
    this_week = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= week_start
    ).all()
    
    total_km = sum(w.distance for w in this_week if w.distance)
    count = len(this_week)
    
    return {
        "week_volume_km": total_km,
        "workout_count": count,
        "week_start": week_start.isoformat()
    }
```

#### 3.2 Frontend - Refonte dashboard
**Fichier**: `/frontend/app/page.tsx`

Remplacer le dashboard actuel par:
- Widget résumé semaine (volume, nb sorties)
- Graphique volume 8 semaines
- Prochaine séance suggérée
- KPIs: Total km, progression, régularité

---

## 🎯 ORDRE D'EXÉCUTION RECOMMANDÉ

1. **Jour 1 (2-3h)**: Finir frontend pages workouts + profil
2. **Jour 2 (3-4h)**: Intégration Claude (backend + frontend)
3. **Jour 3 (3-4h)**: Dashboard + Analytics
4. **Jour 4 (2h)**: Tests, polish, documentation

---

## 🧪 TESTS À FAIRE

### Backend
```bash
cd backend
source venv/bin/activate

# Test suggestions
curl -X POST http://localhost:8000/api/suggestions/generate
curl http://localhost:8000/api/suggestions

# Test dashboard
curl http://localhost:8000/api/dashboard/summary
```

### Frontend
- Vérifier toutes les pages chargent
- Tester navigation complète
- Vérifier formulaires sauvegardent
- Tester graphiques s'affichent

---

## 💰 COÛTS API CLAUDE

**Estimation mensuelle:**
- 1 suggestion/jour × 30 jours = 30 appels Sonnet 4.5
- ~2000 tokens input + 500 tokens output par appel
- Coût: ~$0.40/mois

**Optimisations:**
- Utiliser Haiku pour résumés simples
- Cacher profil utilisateur
- Limiter appels (1 suggestion/jour max)

---

## 📚 RESSOURCES

- **Anthropic API Docs**: https://docs.anthropic.com/
- **Next.js Docs**: https://nextjs.org/docs
- **shadcn/ui**: https://ui.shadcn.com/
- **Recharts**: https://recharts.org/

---

## ✅ CHECKLIST FINALE

Avant de considérer le MVP terminé:

- [ ] Toutes les pages frontend fonctionnent
- [ ] Import Apple Health marche
- [ ] Workouts s'affichent correctement
- [ ] Profil est éditable
- [ ] Suggestions Claude génèrent des recommandations pertinentes
- [ ] Dashboard affiche les bonnes métriques
- [ ] Graphiques recharts s'affichent
- [ ] Tests manuels complets
- [ ] Documentation à jour (README.md)

---

**Bonne continuation! 🏃‍♂️💨**
