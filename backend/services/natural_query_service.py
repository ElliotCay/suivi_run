"""
Natural Language Query Service

Permet aux utilisateurs de poser des questions en langage naturel sur leurs données d'entraînement.
Utilise Claude Haiku avec prompt caching pour générer et exécuter des requêtes SQL sécurisées.
"""

import logging
import json
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from services.claude_service import call_claude_with_caching, call_claude_api

logger = logging.getLogger(__name__)


def build_schema_context() -> str:
    """
    Génère la description complète du schema de base de données pour Claude.
    Cette chaîne sera cachée dans le system prompt pour optimiser les coûts.

    Returns:
        Description formatée du schema avec tables, colonnes, relations et exemples
    """
    schema = """
DATABASE SCHEMA - Application de suivi d'entraînement running

TABLES PRINCIPALES:

1. workouts (séances d'entraînement)
   - id: INTEGER PRIMARY KEY
   - user_id: INTEGER (FK vers users)
   - date: DATE (date de la séance)
   - distance: FLOAT (en km)
   - duration: INTEGER (en secondes)
   - avg_pace: FLOAT (allure moyenne en secondes/km)
   - avg_hr: INTEGER (fréquence cardiaque moyenne en bpm)
   - max_hr: INTEGER (FC max en bpm)
   - elevation_gain: FLOAT (dénivelé positif en mètres)
   - workout_type: TEXT (type: easy, recovery, long, threshold, interval)
   - notes: TEXT (notes libres)
   - source: TEXT (Garmin, Strava, manual)
   - is_test: BOOLEAN (séance de test ou réelle)

2. personal_records (records personnels)
   - id: INTEGER PRIMARY KEY
   - user_id: INTEGER
   - distance: TEXT (distance: 500m, 1km, 2km, 5km, 10km, 15km, semi, marathon)
   - time_seconds: INTEGER (temps en secondes)
   - date_achieved: DATE
   - is_current: BOOLEAN (1 si record actuel, 0 si battu)
   - superseded_by: INTEGER (FK vers le nouveau record)

3. training_blocks (blocs d'entraînement de 4 semaines)
   - id: INTEGER PRIMARY KEY
   - user_id: INTEGER
   - name: TEXT
   - description: TEXT
   - phase: TEXT (base, build, peak, taper)
   - start_date: DATE
   - end_date: DATE
   - days_per_week: INTEGER (3-6)
   - status: TEXT (active, completed, archived)

4. planned_workouts (séances planifiées dans un bloc)
   - id: INTEGER PRIMARY KEY
   - block_id: INTEGER (FK vers training_blocks)
   - scheduled_date: DATE
   - workout_type: TEXT (easy, threshold, interval, long, recovery)
   - distance_km: FLOAT
   - pace_target: TEXT (ex: "5:30-5:40/km")
   - description: TEXT
   - status: TEXT (scheduled, completed, skipped)
   - completed_workout_id: INTEGER (FK vers workouts si complétée)

5. workout_analyses (analyses AI post-séance)
   - id: INTEGER PRIMARY KEY
   - workout_id: INTEGER (FK vers workouts)
   - performance_vs_plan: TEXT (sur_objectif, conforme, sous_objectif)
   - pace_variance_pct: FLOAT
   - fatigue_detected: BOOLEAN
   - injury_risk_score: INTEGER (0-10)
   - summary: TEXT
   - analyzed_at: DATETIME

6. race_objectives (objectifs de course)
   - id: INTEGER PRIMARY KEY
   - user_id: INTEGER
   - race_name: TEXT
   - race_date: DATE
   - distance: TEXT (5km, 10km, semi, marathon)
   - target_time: INTEGER (en secondes)
   - status: TEXT (active, completed, abandoned)

7. injury_history (historique des blessures)
   - id: INTEGER PRIMARY KEY
   - user_id: INTEGER
   - name: TEXT
   - body_part: TEXT
   - start_date: DATE
   - end_date: DATE
   - severity: TEXT (minor, moderate, severe)
   - status: TEXT (active, recovered, monitoring)

RELATIONS:
- workouts.user_id → users.id
- personal_records.user_id → users.id
- training_blocks.user_id → users.id
- planned_workouts.block_id → training_blocks.id
- planned_workouts.completed_workout_id → workouts.id
- workout_analyses.workout_id → workouts.id

TYPES DE DONNÉES COURANTES:
- Distances: float en km (ex: 5.0, 10.5, 21.1, 42.195)
- Durées: integer en secondes (ex: 1800 pour 30 minutes)
- Allures: float en secondes/km (ex: 360.0 pour 6:00/km)
- Dates: format 'YYYY-MM-DD' (ex: '2025-12-24')
- Types de workout: 'easy', 'recovery', 'long', 'threshold', 'interval'

EXEMPLES DE REQUÊTES SQL:

1. Personal Records actuels:
SELECT distance, time_seconds, date_achieved
FROM personal_records
WHERE user_id = ? AND is_current = 1
ORDER BY distance;

2. Volume hebdomadaire du mois en cours:
SELECT
    strftime('%W', date) as week,
    SUM(distance) as total_km,
    COUNT(*) as nb_seances
FROM workouts
WHERE user_id = ?
    AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
GROUP BY week
ORDER BY week;

3. Progression d'allure moyenne par mois:
SELECT
    strftime('%Y-%m', date) as mois,
    AVG(avg_pace) as allure_moyenne,
    COUNT(*) as nb_seances
FROM workouts
WHERE user_id = ?
    AND date >= date('now', '-3 months')
GROUP BY mois
ORDER BY mois;

4. Séances d'un type spécifique sur une période:
SELECT date, distance, avg_pace, avg_hr, notes
FROM workouts
WHERE user_id = ?
    AND workout_type = 'threshold'
    AND date BETWEEN '2025-12-01' AND '2025-12-31'
ORDER BY date DESC;

5. Comparaison de volumes entre deux périodes:
SELECT
    SUM(CASE WHEN date >= '2025-12-01' THEN distance ELSE 0 END) as dec_km,
    SUM(CASE WHEN date >= '2025-11-01' AND date < '2025-12-01' THEN distance ELSE 0 END) as nov_km
FROM workouts
WHERE user_id = ?;

NOTES IMPORTANTES:
- SQLite utilise strftime() pour les opérations de date
- Les jointures doivent être explicites (JOIN ... ON ...)
- Utiliser LIMIT pour éviter trop de résultats
- Toujours inclure user_id dans le WHERE pour l'isolation des données
"""
    return schema


def validate_sql_safety(sql: str) -> bool:
    """
    Valide qu'une requête SQL est sécurisée et autorisée.

    Args:
        sql: Requête SQL à valider

    Returns:
        True si la requête est valide

    Raises:
        ValueError: Si la requête contient des opérations dangereuses
    """
    sql_upper = sql.upper().strip()

    # Blacklist: Opérations interdites
    forbidden_keywords = [
        "DELETE", "DROP", "INSERT", "UPDATE", "ALTER",
        "CREATE", "TRUNCATE", "REPLACE", "PRAGMA"
    ]

    for keyword in forbidden_keywords:
        if keyword in sql_upper:
            raise ValueError(f"Opération SQL non autorisée: {keyword}")

    # Whitelist: Doit commencer par SELECT
    if not sql_upper.startswith("SELECT"):
        raise ValueError("Seules les requêtes SELECT sont autorisées")

    # Vérification user_id (la plupart des queries doivent filtrer par user)
    # Note: On vérifie juste la présence, l'injection se fait dans execute_safe_query
    if "USER_ID" not in sql_upper:
        logger.warning("Query without user_id filter - may return all users data")

    return True


def parse_query_intent(
    user_message: str,
    conversation_history: List[Dict[str, str]],
    db_schema: str
) -> Dict[str, Any]:
    """
    Analyse l'intention de l'utilisateur et génère une requête SQL via Claude.
    Utilise le prompt caching pour optimiser les coûts.

    Args:
        user_message: Message de l'utilisateur en langage naturel
        conversation_history: Historique de la conversation
        db_schema: Description du schema (sera cachée)

    Returns:
        Dict avec sql, explanation, result_type, tokens_used, is_cached
    """
    system_prompt = f"""{db_schema}

INSTRUCTIONS:
Tu es un expert SQL pour une base de données d'entraînement running.
L'utilisateur va te poser une question en français sur ses données.
Tu dois:
1. Comprendre l'intention de la question
2. Générer une requête SQL SELECT sécurisée
3. Expliquer en une phrase ce que tu vas chercher
4. Indiquer le type de résultat (table, metrics, ou text)

RÈGLES STRICTES:
- UNIQUEMENT des requêtes SELECT
- TOUJOURS filtrer par user_id (utiliser le placeholder ? ou :user_id)
- Utiliser SQLite syntax (strftime pour dates, etc.)
- Limiter les résultats avec LIMIT si nécessaire
- Gérer les cas null (COALESCE, IS NOT NULL)

TYPES DE RÉSULTATS:
- "table": Pour lister des séances, PRs, etc. (plusieurs lignes avec colonnes)
- "metrics": Pour des statistiques agrégées (volume, moyenne, compte)
- "text": Pour des questions simples yes/no ou confirmations

RÉPONDS EN FORMAT JSON STRICT:
{{
    "sql": "SELECT ... FROM ... WHERE user_id = ? ...",
    "explanation": "Je vais chercher tes records personnels de cette année",
    "result_type": "table"
}}
"""

    # Construire l'historique de messages pour Claude
    messages = []
    for msg in conversation_history:
        messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })

    # Ajouter le message actuel
    messages.append({
        "role": "user",
        "content": user_message
    })

    try:
        # Appel Claude avec prompt caching
        response = call_claude_with_caching(
            system_prompt=system_prompt,
            messages=messages,
            use_cache=True,
            use_sonnet=False,  # Haiku pour économie
            max_tokens=512
        )

        # Parser la réponse JSON
        content = response["content"].strip()

        # Nettoyer les markdown code blocks si présents
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1])

        # Extraire le JSON
        start_idx = content.find("{")
        end_idx = content.rfind("}") + 1
        if start_idx >= 0 and end_idx > start_idx:
            json_str = content[start_idx:end_idx]
            parsed = json.loads(json_str)
        else:
            parsed = json.loads(content)

        # Ajouter les métadonnées de caching
        parsed["tokens_used"] = response["input_tokens"] + response["output_tokens"]
        parsed["is_cached"] = response["is_cached"]

        logger.info(
            f"SQL generated: cached={response['is_cached']}, "
            f"tokens={parsed['tokens_used']}, type={parsed.get('result_type')}"
        )

        return parsed

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude response as JSON: {e}")
        logger.error(f"Content: {content}")
        raise ValueError("Impossible de parser la réponse de Claude")
    except Exception as e:
        logger.error(f"Error calling Claude for query intent: {e}")
        raise


def execute_safe_query(
    sql: str,
    db: Session,
    user_id: int,
    limit: int = 1000
) -> List[Dict[str, Any]]:
    """
    Exécute une requête SQL de manière sécurisée.

    Args:
        sql: Requête SQL (doit contenir ? ou :user_id pour user_id)
        db: Session de base de données
        user_id: ID de l'utilisateur
        limit: Nombre maximum de lignes à retourner

    Returns:
        Liste de dictionnaires avec les résultats
    """
    # Valider la sécurité
    validate_sql_safety(sql)

    # Injecter LIMIT si pas présent
    sql_upper = sql.upper()
    if "LIMIT" not in sql_upper:
        sql = f"{sql} LIMIT {limit}"

    try:
        # Remplacer les placeholders par les paramètres
        # Support de ? et :user_id
        if "?" in sql:
            result = db.execute(text(sql), (user_id,))
        elif ":user_id" in sql.lower():
            result = db.execute(text(sql), {"user_id": user_id})
        else:
            # Pas de placeholder user_id, exécution directe (à éviter)
            logger.warning(f"Executing query without user_id binding: {sql}")
            result = db.execute(text(sql))

        # Convertir en liste de dictionnaires
        rows = []
        for row in result:
            row_dict = dict(row._mapping)
            rows.append(row_dict)

        logger.info(f"Query executed successfully, {len(rows)} rows returned")
        return rows

    except Exception as e:
        logger.error(f"Error executing SQL query: {e}")
        logger.error(f"SQL: {sql}")
        raise


def format_results_for_display(
    rows: List[Dict[str, Any]],
    result_type: str
) -> Dict[str, Any]:
    """
    Formate les résultats SQL pour l'affichage dans le frontend.

    Args:
        rows: Résultats bruts de la requête
        result_type: Type de résultat (table, metrics, text)

    Returns:
        Données formatées selon le type
    """
    if not rows:
        return {"type": result_type, "data": None}

    if result_type == "metrics":
        # Pour les métriques, retourner un dict simple
        # Si une seule ligne, c'est un dict de métriques
        if len(rows) == 1:
            return {
                "type": "metrics",
                "data": rows[0]
            }
        else:
            # Plusieurs lignes de métriques (ex: par mois)
            return {
                "type": "metrics",
                "data": rows
            }

    elif result_type == "table":
        # Pour les tables, retourner la liste complète
        return {
            "type": "table",
            "data": rows,
            "columns": list(rows[0].keys()) if rows else []
        }

    else:  # text
        # Pour text, simplifier au maximum
        return {
            "type": "text",
            "data": rows
        }


def generate_response(
    user_message: str,
    query_results: List[Dict[str, Any]],
    result_type: str
) -> str:
    """
    Génère une réponse en langage naturel basée sur les résultats SQL.

    Args:
        user_message: Question originale de l'utilisateur
        query_results: Résultats de la requête SQL
        result_type: Type de résultat (table, metrics, text)

    Returns:
        Réponse en français, concise et informative
    """
    # Construire le contexte pour Claude
    results_text = json.dumps(query_results, ensure_ascii=False, indent=2)

    prompt = f"""L'utilisateur a posé cette question:
"{user_message}"

Voici les résultats de la requête SQL:
{results_text}

Génère une réponse en français:
- Concise et claire (2-3 phrases max)
- Mentionne les chiffres clés
- Utilise un ton amical et encourageant
- Si comparaison, indique le % de progression
- Si aucun résultat, suggère une alternative

Réponds UNIQUEMENT avec la réponse en français, sans JSON ni formatage supplémentaire.
"""

    try:
        response = call_claude_api(
            prompt=prompt,
            use_sonnet=False  # Haiku suffisant
        )

        return response["content"].strip()

    except Exception as e:
        logger.error(f"Error generating natural language response: {e}")
        # Fallback: réponse basique
        if not query_results:
            return "Je n'ai trouvé aucune donnée correspondant à ta question. Essaie de reformuler ou de changer la période ?"
        else:
            return f"J'ai trouvé {len(query_results)} résultat(s) pour ta question."


def process_natural_query(
    user_message: str,
    conversation_history: List[Dict[str, str]],
    db: Session,
    user_id: int
) -> Dict[str, Any]:
    """
    Point d'entrée principal: traite une question en langage naturel de bout en bout.

    Args:
        user_message: Question de l'utilisateur
        conversation_history: Historique de la conversation
        db: Session de base de données
        user_id: ID de l'utilisateur

    Returns:
        Dict avec response, results, sql_query, tokens_used, is_cached
    """
    # 1. Construire le schema context (sera caché)
    schema = build_schema_context()

    # 2. Parser l'intention et générer SQL
    intent = parse_query_intent(user_message, conversation_history, schema)

    sql_query = intent["sql"]
    explanation = intent["explanation"]
    result_type = intent["result_type"]
    tokens_used = intent["tokens_used"]
    is_cached = intent["is_cached"]

    # 3. Exécuter la requête
    try:
        raw_results = execute_safe_query(sql_query, db, user_id)
    except Exception as e:
        return {
            "response": f"Désolé, une erreur s'est produite lors de l'exécution de la requête: {str(e)}",
            "results": None,
            "sql_query": sql_query,
            "tokens_used": tokens_used,
            "is_cached": is_cached,
            "error": str(e)
        }

    # 4. Formater les résultats
    formatted_results = format_results_for_display(raw_results, result_type)

    # 5. Générer la réponse en langage naturel
    natural_response = generate_response(user_message, raw_results, result_type)

    # 6. Retourner la réponse complète
    return {
        "response": natural_response,
        "results": formatted_results,
        "sql_query": sql_query,
        "tokens_used": tokens_used,
        "is_cached": is_cached
    }
