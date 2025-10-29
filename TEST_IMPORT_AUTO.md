# 🧪 Test Import Automatique - À Faire Demain

## ✅ Checklist de Test

### 1️⃣ Setup Initial (Une seule fois)

**Créer le dossier iCloud Drive sur Mac :**

Option A - Via Terminal :
```bash
mkdir -p ~/Library/Mobile\ Documents/com~apple~CloudDocs/AppleHealthExport
```

Option B - Via Finder :
- Ouvrir Finder
- Menu : **Go > Aller au dossier...** (⌘⇧G)
- Coller : `~/Library/Mobile Documents/com~apple~CloudDocs/`
- Créer un dossier nommé : **`AppleHealthExport`**

---

### 2️⃣ Export depuis iPhone

1. Ouvrir l'app **Santé** 🏥
2. Appuyer sur la **photo de profil** (en haut à droite)
3. Scroller tout en bas
4. Appuyer sur **"Exporter toutes les données de santé"**
5. Attendre 10-30 secondes (barre de progression)
6. Quand c'est prêt, choisir **AirDrop**
7. Sélectionner le **Mac**

---

### 3️⃣ Réception sur Mac

1. Le fichier `export.zip` arrive dans **Téléchargements**
2. **Déplacer** le fichier dans :
   ```
   ~/Library/Mobile Documents/com~apple~CloudDocs/AppleHealthExport/export.zip
   ```
3. Écraser l'ancien fichier si présent

---

### 4️⃣ Démarrer l'Auto-Import

1. Ouvrir : **http://localhost:3000/import**
2. Dans la carte **"Import Automatique via iCloud Drive"**
3. Cliquer sur **"Démarrer l'import automatique"**
4. Vérifier que le statut passe à **"✓ Actif"**

---

### 5️⃣ Vérification

**Statut du fichier (devrait apparaître en 1-2 minutes) :**
- [ ] Le système détecte : **"✓ Fichier export.zip détecté"**
- [ ] Date de modification affichée
- [ ] Attendre max 60 secondes pour l'import

**Après l'import :**
- [ ] Aller sur **http://localhost:3000/workouts**
- [ ] Vérifier que les séances sont importées
- [ ] Vérifier les dates, distances, allures
- [ ] Vérifier qu'il n'y a pas de doublons

---

## 🎁 Bonus : Créer un Alias sur le Bureau

Pour simplifier le process à l'avenir :

1. Ouvrir Finder
2. Naviguer vers : `~/Library/Mobile Documents/com~apple~CloudDocs/AppleHealthExport`
3. Faire **Cmd+L** (créer un alias)
4. Glisser l'alias sur le **Bureau**
5. Renommer : **"📲 Déposer Export Apple Health"**

**Résultat** : La prochaine fois, glisser-déposer direct sur l'icône du Bureau !

---

## 🔍 Dépannage

### Le fichier n'est pas détecté
- Vérifier que le nom est exactement `export.zip`
- Vérifier qu'il est bien dans le dossier `AppleHealthExport`
- Cliquer sur le bouton 🔄 pour rafraîchir le statut
- Vérifier les logs du serveur backend

### L'import ne se déclenche pas
- Vérifier que l'auto-import est démarré (statut "✓ Actif")
- Attendre jusqu'à 60 secondes (intervalle de vérification)
- Vérifier dans les logs backend : terminal avec le serveur Python

### Logs Backend
Le serveur affiche les logs dans le terminal où tu as lancé `uvicorn`.
Cherche des messages comme :
```
INFO:services.auto_import_service:Detected new or modified export file
INFO:services.auto_import_service:Auto-import complete: X imported, Y duplicates
```

---

## 📊 Résultats Attendus

**Après le test réussi :**
- ✅ Fichier détecté automatiquement
- ✅ Import déclenché sans intervention manuelle
- ✅ Nouvelles séances visibles dans l'app
- ✅ Pas de doublons (duplicatas ignorés)
- ✅ Données GPX importées (splits, allure, etc.)

**Temps total du process :**
- Export iPhone : ~30 secondes
- AirDrop + Déplacement : ~30 secondes
- Détection + Import auto : ~60 secondes max
- **Total : ~2 minutes** 🚀

---

## 🎯 Prochaines Étapes si le Test Réussit

1. **Créer l'alias sur le Bureau** (optionnel mais pratique)
2. **Documenter ton propre workflow** (notes perso)
3. **Planifier** : Export hebdomadaire (ex: chaque dimanche soir)
4. **Laisser l'auto-import actif** : le serveur surveille en continu

---

## ❓ Questions / Problèmes

Si quelque chose ne fonctionne pas :
1. Noter l'étape exacte où ça bloque
2. Copier les messages d'erreur (logs backend)
3. Vérifier les chemins de fichiers
4. Me faire signe pour debug ! 🔧
