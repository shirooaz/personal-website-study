-- ============================================
-- 文章表 + 全文搜索索引
-- 部署: wrangler d1 execute articles-db --file=./schema.sql
-- ============================================

CREATE TABLE IF NOT EXISTS articles (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL DEFAULT 'column',
  title      TEXT NOT NULL,
  excerpt    TEXT DEFAULT '',
  content    TEXT NOT NULL,
  date       TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE VIRTUAL TABLE IF NOT EXISTS article_fts USING fts5(title, content);

-- 数据变更时自动同步 FTS
CREATE TRIGGER IF NOT EXISTS articles_ai AFTER INSERT ON articles BEGIN
  INSERT INTO article_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS articles_ad AFTER DELETE ON articles BEGIN
  INSERT INTO article_fts(article_fts, rowid, title, content) VALUES('delete', old.rowid, old.title, old.content);
END;

CREATE TRIGGER IF NOT EXISTS articles_au AFTER UPDATE ON articles BEGIN
  INSERT INTO article_fts(article_fts, rowid, title, content) VALUES('delete', old.rowid, old.title, old.content);
  INSERT INTO article_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
END;
