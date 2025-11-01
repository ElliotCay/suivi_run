# Configuration iCloud Calendar (CalDAV)

Ce guide explique comment générer un **mot de passe d'application** iCloud pour synchroniser automatiquement tes séances avec Apple Calendar.

## Pourquoi un mot de passe d'application ?

Si tu as activé l'authentification à deux facteurs (2FA) sur ton compte iCloud (ce qui est recommandé), tu ne peux pas utiliser ton mot de passe habituel pour les apps tierces. Tu dois générer un **mot de passe d'application spécifique**.

## Étapes de configuration

### 1. Génère un mot de passe d'application

1. Va sur **https://appleid.apple.com**
2. Connecte-toi avec ton identifiant Apple
3. Dans la section **Connexion et sécurité**, clique sur **Mots de passe d'app**
4. Clique sur le bouton **+** ou **Générer un mot de passe**
5. Entre un nom comme "Suivi Course Calendar" ou "Running Tracker"
6. Apple va générer un mot de passe au format : `xxxx-xxxx-xxxx-xxxx`
7. **COPIE CE MOT DE PASSE** (tu ne pourras plus le voir après)

### 2. Configure le fichier .env

Édite le fichier `/backend/.env` et remplace les placeholders :

```env
# iCloud Calendar (CalDAV)
ICLOUD_USERNAME=ton-email@icloud.com
ICLOUD_PASSWORD=xxxx-xxxx-xxxx-xxxx  # Le mot de passe d'application généré
```

**Important** :
- Utilise ton email iCloud complet (celui avec @icloud.com, @me.com, ou @mac.com)
- Utilise le mot de passe d'application (PAS ton mot de passe iCloud habituel)
- Garde les tirets `-` dans le mot de passe

### 3. Redémarre le backend

```bash
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Teste la synchronisation

1. Va sur la page **Suggestions** : http://localhost:3000/suggestions
2. Planifie une séance (clique sur "Planifier" sur une suggestion)
3. Clique sur **"Synchroniser calendrier"**
4. Si tout est configuré correctement, tu verras :
   - "Synchronisation réussie ! X séance(s) ajoutée(s) au calendrier."
5. Ouvre **Apple Calendar** sur ton Mac
6. Tu devrais voir un nouveau calendrier : **"Entraînements Course"**
7. Tes séances planifiées y apparaissent automatiquement ! 🎉

## Ce qui est synchronisé

Chaque événement calendrier contient :
- 🏃 **Titre** : Type de séance + distance (ex: "🏃 Facile - 6.0km")
- 📅 **Date/Heure** : La date planifiée
- ⏱️ **Durée** : Estimée à ~6.5 min/km
- 🎯 **Allure cible** : Si spécifiée
- 📋 **Structure** : Échauffement, corps de séance, retour au calme
- 🔔 **Rappel** : 30 minutes avant la séance
- 📍 **Lieu** : "À définir"

## Dépannage

### Erreur "Impossible de se connecter à iCloud Calendar"

- ✅ Vérifie que ton email est correct (format complet avec @icloud.com)
- ✅ Vérifie que tu utilises un mot de passe d'APPLICATION (pas ton mot de passe iCloud)
- ✅ Vérifie que tu as bien copié le mot de passe avec les tirets
- ✅ Si tu as changé le mot de passe, génère-en un nouveau sur appleid.apple.com

### Le calendrier n'apparaît pas dans Apple Calendar

- Attends quelques secondes après la synchronisation
- Rafraîchis Apple Calendar (Cmd+R)
- Vérifie que le calendrier "Entraînements Course" est coché dans la barre latérale

### Les événements ne se mettent pas à jour

- La synchronisation crée uniquement les nouveaux événements
- Si tu modifies une séance déjà synchronisée, re-clique sur "Synchroniser calendrier"
- Les événements déjà créés ne sont pas mis à jour automatiquement (pour éviter les conflits)

## Sécurité

- ✅ Le mot de passe d'application est stocké localement dans `.env` (jamais committé sur Git)
- ✅ Il est chiffré lors de la transmission à iCloud via HTTPS
- ✅ Tu peux révoquer ce mot de passe à tout moment sur appleid.apple.com
- ✅ Il ne donne accès qu'au calendrier, pas à tes autres données iCloud

---

**Astuce** : Une fois configuré, tu n'as plus qu'à cliquer sur "Synchroniser calendrier" après avoir planifié des séances, et elles apparaissent automatiquement dans Apple Calendar ! 🚀
