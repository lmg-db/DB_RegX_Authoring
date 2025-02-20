import sqlite3
from contextlib import contextmanager
import os
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "prompts.db"
print(f"数据库路径: {DB_PATH}")  # 添加调试输出
os.makedirs(DB_PATH.parent, exist_ok=True)

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    try:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS prompts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                model_type TEXT NOT NULL,
                scope TEXT NOT NULL,
                task TEXT,
                templates TEXT,
                created_at TIMESTAMP
            )
        ''')
        yield conn
    finally:
        conn.close()

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS prompts (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                model_type TEXT NOT NULL,
                scope TEXT NOT NULL,
                task TEXT,
                templates TEXT,
                created_at TIMESTAMP
            )
        ''')
        conn.commit() 