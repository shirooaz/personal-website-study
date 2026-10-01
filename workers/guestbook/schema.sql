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

-- 分词器改用 trigram：默认的 unicode61 会把一整串连续汉字当成一个 token，
-- 搜"留言"匹配不到"留言板上线"，中文基本用不了。trigram 支持任意子串命中
-- （需要 SQLite >= 3.34，D1 已满足）。
-- 若库中已有旧索引，需要先 DROP TABLE article_fts 再重新执行本文件以重建。
CREATE VIRTUAL TABLE IF NOT EXISTS article_fts USING fts5(title, content, tokenize = 'trigram');

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
