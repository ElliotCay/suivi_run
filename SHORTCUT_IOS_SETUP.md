# Configuration du Shortcut iOS pour Import Automatique

Ce guide explique comment créer un raccourci iOS qui exporte automatiquement vos données Apple Health vers iCloud Drive.

## 📱 Prérequis

- iPhone avec iOS 14 ou supérieur
- iCloud Drive activé sur votre iPhone
- Application "Raccourcis" (installée par défaut sur iOS)

## 🎯 Objectif

Créer un raccourci qui :
1. Exporte automatiquement vos données Apple Health
2. Les sauvegarde dans iCloud Drive sous le nom `export.zip`
3. **Écrase** le fichier existant à chaque export (pas de duplicatas)
4. Peut être exécuté automatiquement tous les jours

## 📝 Étapes de Configuration

### Étape 1 : Créer le dossier iCloud Drive

1. Ouvrez l'app **Fichiers** sur votre iPhone
2. Allez dans **iCloud Drive**
3. Créez un nouveau dossier nommé **`AppleHealthExport`**

### Étape 2 : Créer le Raccourci

1. Ouvrez l'app **Raccourcis**
2. Appuyez sur **+** (en haut à droite) pour créer un nouveau raccourci
3. Ajoutez les actions suivantes dans l'ordre :

#### Action 1 : Exporter les données Health
- Recherchez et ajoutez l'action **"Exporter les données de santé"**
- Cette action n'a pas de paramètres à configurer

#### Action 2 : Définir le nom du fichier
- Recherchez et ajoutez l'action **"Définir le nom"**
- Paramètres :
  - Entrée : Le résultat de l'action précédente
  - Nom : `export` (sans extension)
  - Cochez **"Remplacer les fichiers existants"** ✅ **IMPORTANT**

#### Action 3 : Enregistrer dans iCloud Drive
- Recherchez et ajoutez l'action **"Enregistrer le fichier"**
- Paramètres :
  - Fichier : Le résultat de l'action précédente
  - Emplacement : `iCloud Drive/AppleHealthExport/`
  - Assurez-vous que **"Remplacer si fichier existant"** est activé ✅

3. Nommez votre raccourci : **"Sync Apple Health"**

### Étape 3 : Tester le Raccourci

1. Appuyez sur le bouton ▶️ pour exécuter le raccourci
2. **Autorisez** l'accès aux données de santé (première fois uniquement)
3. Attendez quelques secondes (l'export peut prendre 10-30 secondes selon la quantité de données)
4. Vérifiez dans **Fichiers > iCloud Drive > AppleHealthExport** que le fichier `export.zip` est présent

### Étape 4 : Automatiser le Raccourci

Pour que le raccourci s'exécute automatiquement tous les jours :

1. Dans l'app **Raccourcis**, allez dans l'onglet **Automatisation**
2. Appuyez sur **+** (en haut à droite)
3. Choisissez **"Créer une automatisation personnelle"**
4. Sélectionnez **"Heure du jour"**
5. Configurez l'heure souhaitée (recommandé : **20h00** ou après votre dernière course de la journée)
6. Fréquence : **Quotidien**
7. Appuyez sur **Suivant**
8. Recherchez et ajoutez l'action **"Exécuter le raccourci"**
9. Sélectionnez votre raccourci **"Sync Apple Health"**
10. Désactivez **"Me demander avant d'exécuter"** pour que ce soit vraiment automatique
11. Appuyez sur **OK** puis **Terminer**

## ✅ Vérification

Une fois configuré :

1. Sur votre Mac, ouvrez l'application de suivi de course
2. Allez dans la page **Import**
3. Cliquez sur **"Démarrer l'import automatique"**
4. Le système surveille maintenant le dossier `~/Library/Mobile Documents/com~apple~CloudDocs/AppleHealthExport/`

Chaque jour à l'heure configurée :
- Votre iPhone exporte automatiquement les données
- Le fichier est mis à jour dans iCloud Drive
- Votre Mac détecte le changement
- Les nouvelles données sont importées automatiquement

## 🔍 Dépannage

### Le fichier n'apparaît pas sur Mac
- Vérifiez que iCloud Drive est activé sur les deux appareils
- Attendez quelques minutes pour la synchronisation iCloud
- Vérifiez dans **Préférences Système > Apple ID > iCloud** que "iCloud Drive" est coché

### L'import automatique ne se déclenche pas
- Vérifiez que le service est démarré dans l'application web
- Vérifiez que le fichier `export.zip` est bien présent dans le dossier
- Rechargez le statut dans l'application web avec le bouton 🔄

### L'automatisation ne s'exécute pas
- iOS peut limiter les automatisations en arrière-plan
- Essayez de garder l'app Raccourcis ouverte brièvement vers l'heure programmée
- Vérifiez les autorisations de l'app Raccourcis dans Réglages

### Performances
- L'export peut prendre 10-60 secondes selon la quantité de données
- L'import sur Mac prend quelques secondes
- Le délai de détection est configuré à 60 secondes (peut être modifié dans les paramètres)

## 📊 Résumé du Flux

```
iPhone (20h00) → Export Apple Health → iCloud Drive
                                          ↓
                                  (Sync automatique)
                                          ↓
Mac (détection) ← Surveillance active ← iCloud Drive local
      ↓
  Import auto → Base de données → Application web mise à jour
```

## 💡 Conseils

- **Timing** : Configurez l'automatisation après votre dernière séance habituelle de la journée
- **Backup** : iCloud garde l'historique des versions du fichier pendant 30 jours
- **Données mobiles** : L'export iOS utilise très peu de données (quelques KB à Mo)
- **Batterie** : Impact minimal sur la batterie (< 1%)
