# Agent de Revue de Code - Configuration

## Objectif
Analyser le code pour détecter les bugs critiques, problèmes de sécurité, et mauvaises pratiques.

## Niveaux de Criticité

### 🔴 CRITIQUE (Bloquant)
- Bugs qui causent des crashs ou des erreurs
- Failles de sécurité (injections SQL, XSS, CSRF)
- Perte de données potentielle
- Calculs mathématiques incorrects affectant la logique métier
- Fuites mémoire ou ressources non libérées

### 🟠 IMPORTANT (À corriger rapidement)
- Problèmes de performance majeurs
- Mauvaise gestion des erreurs
- Données sensibles exposées
- Anti-patterns connus
- Tests de condition incorrects (if x au lieu de if x is not None)

### 🟡 MINEUR (Amélioration recommandée)
- Code dupliqué
- Complexité cyclomatique élevée
- Manque de documentation
- Noms de variables peu clairs
- Imports inutilisés

## Checklist de Revue

### Backend (Python/FastAPI)

#### Sécurité
- [ ] Validation des entrées utilisateur (Pydantic schemas)
- [ ] Pas de requêtes SQL brutes (utiliser ORM)
- [ ] Authentification/autorisation sur endpoints sensibles
- [ ] Pas de secrets en dur dans le code
- [ ] CORS configuré correctement

#### Performance
- [ ] Pas de N+1 queries (jointures appropriées)
- [ ] Pagination sur listes longues
- [ ] Index sur colonnes fréquemment requêtées
- [ ] Pas de boucles avec appels DB répétés

#### Logique Métier
- [ ] Calculs de dates/durées corrects (timedelta)
- [ ] Gestion des valeurs None/null (is not None vs if x)
- [ ] Agrégations correctes (sum, avg, count)
- [ ] Conversions d'unités cohérentes
- [ ] Arrondis appropriés

#### Gestion d'Erreurs
- [ ] try/except sur opérations risquées
- [ ] HTTPException avec codes appropriés (404, 400, 500)
- [ ] Logs des erreurs critiques
- [ ] Messages d'erreur clairs pour l'utilisateur

### Frontend (React/Next.js)

#### Sécurité
- [ ] Pas de dangerouslySetInnerHTML sans sanitization
- [ ] Tokens/secrets via variables d'environnement
- [ ] Validation côté client ET serveur

#### Performance
- [ ] Mémoïsation appropriée (useMemo, useCallback)
- [ ] Pas de re-renders inutiles
- [ ] Code splitting pour bundles lourds
- [ ] Images optimisées

#### UX/État
- [ ] États de loading visibles
- [ ] Messages d'erreur affichés
- [ ] Gestion des états vides
- [ ] Formulaires validés avant soumission

### Tests à Effectuer

#### Tests Unitaires
- [ ] Fonctions de calcul (dates, statistiques)
- [ ] Validations Pydantic
- [ ] Conversions d'unités

#### Tests d'Intégration
- [ ] Endpoints API avec données valides/invalides
- [ ] Flows complets (création → lecture → mise à jour → suppression)

#### Tests Manuels
- [ ] Import de données réelles
- [ ] Navigation complète de l'app
- [ ] Cas limites (données à 0, très grandes valeurs)

## Format de Rapport

### Structure
```
## 🔍 Revue de Code

### Résumé
- Fichiers analysés : X
- Bugs critiques : X
- Problèmes importants : X
- Améliorations mineures : X

### 🔴 Bugs Critiques

#### 1. [Titre du bug]
**Fichier**: `chemin/vers/fichier.py:ligne`
**Problème**: Description claire du bug
**Impact**: Conséquence du bug (crash, données fausses, etc.)
**Solution**: Code corrigé ou explication de la correction
**Priorité**: CRITIQUE

---

### 🟠 Problèmes Importants
[Même format]

### 🟡 Améliorations Mineures
[Liste simplifiée]

### ✅ Points Positifs
[Ce qui est bien fait dans le code]

### 📋 Recommandations
[Actions à entreprendre par ordre de priorité]
```

## Commandes pour l'Agent

### Lancer une revue complète
```bash
# Analyser tout le backend
find backend -name "*.py" -not -path "*/venv/*" | head -10

# Analyser tout le frontend
find frontend/app -name "*.tsx" -o -name "*.ts" | head -10
```

### Analyser une PR
```bash
gh pr view [PR_NUMBER] --json files -q '.files[].path'
```

### Chercher des patterns dangereux
```bash
# Backend
grep -r "if.*:" backend/routers/*.py | grep -v "is not None"
grep -r "sum.*for.*if" backend/routers/*.py

# Frontend
grep -r "dangerouslySetInnerHTML" frontend/
grep -r "eval(" frontend/
```

## Règles Spécifiques au Projet

### Suivi Run
1. **Dates**: Toujours utiliser `timedelta(weeks=X)` sans multiplier
2. **Distances**: Tester `is not None` pour inclure 0 km
3. **Ratios**: Vérifier `is not None` avant d'afficher
4. **API calls**: Toujours avec gestion d'erreur (try/catch)
5. **Imports**: Vérifier que tous les modules existent dans Git

### Anti-patterns Détectés
- ❌ `timedelta(weeks=X * 7)` → ✅ `timedelta(weeks=X)`
- ❌ `if ratio` → ✅ `if ratio is not None`
- ❌ `if w.distance` → ✅ `if w.distance is not None`
- ❌ `lib/` dans .gitignore global → ✅ `backend/lib/` spécifique

## Utilisation

### Pour une nouvelle PR
1. Checkout de la branche
2. Lancer l'agent avec ce fichier en contexte
3. Demander : "Fais une revue de code complète selon le guide code-review-agent.md"
4. L'agent suivra la checklist et générera un rapport structuré

### Pour du code existant
1. Spécifier les fichiers à analyser
2. Demander : "Analyse ces fichiers selon la checklist de code-review-agent.md"
3. Focus sur les points CRITIQUES et IMPORTANTS

### Pour des bugs spécifiques
1. Pointer vers le pattern à chercher
2. Demander : "Cherche tous les endroits où on utilise `if ratio` au lieu de `if ratio is not None`"
