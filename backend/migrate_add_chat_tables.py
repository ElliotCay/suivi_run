"""
Migration script to add chat adjustment tables.

Creates:
- chat_conversations: Stores conversation metadata and state
- chat_messages: Stores individual messages in conversations

Run with: python backend/migrate_add_chat_tables.py
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from database import DATABASE_URL
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_migration():
    """Execute the migration to add chat tables."""
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        try:
            # Create chat_conversations table
            logger.info("Creating chat_conversations table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS chat_conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    block_id INTEGER NOT NULL,
                    scope_mode VARCHAR NOT NULL DEFAULT 'block_start',
                    scope_start_date DATETIME NOT NULL,
                    scope_end_date DATETIME NOT NULL,
                    state VARCHAR NOT NULL DEFAULT 'active',
                    proposed_changes TEXT,
                    total_tokens INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (block_id) REFERENCES training_blocks(id) ON DELETE CASCADE
                )
            """))

            # Create chat_messages table
            logger.info("Creating chat_messages table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id INTEGER NOT NULL,
                    role VARCHAR NOT NULL,
                    content TEXT NOT NULL,
                    is_cached BOOLEAN DEFAULT 0,
                    cache_creation_tokens INTEGER DEFAULT 0,
                    cache_read_tokens INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
                )
            """))

            # Create indexes for better query performance
            logger.info("Creating indexes...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_chat_conversations_user
                ON chat_conversations(user_id)
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_chat_conversations_block
                ON chat_conversations(block_id)
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_chat_conversations_state
                ON chat_conversations(state)
            """))

            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
                ON chat_messages(conversation_id)
            """))

            conn.commit()
            logger.info("✅ Migration completed successfully!")
            logger.info("Tables created: chat_conversations, chat_messages")

        except Exception as e:
            conn.rollback()
            logger.error(f"❌ Migration failed: {e}")
            raise


if __name__ == "__main__":
    logger.info("Starting chat tables migration...")
    run_migration()
