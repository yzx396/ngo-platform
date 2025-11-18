-- Create forum_replies table
CREATE TABLE IF NOT EXISTS forum_replies (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_reply_id TEXT,
  is_solution BOOLEAN DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (thread_id) REFERENCES forum_threads(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_reply_id) REFERENCES forum_replies(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread ON forum_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_user ON forum_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_parent ON forum_replies(parent_reply_id);
CREATE INDEX IF NOT EXISTS idx_forum_replies_created_at ON forum_replies(created_at ASC);

-- Migrate existing post_comments to forum_replies
INSERT INTO forum_replies (
  id, thread_id, user_id, content, parent_reply_id,
  created_at, updated_at
)
SELECT
  pc.id,
  pc.post_id as thread_id,
  pc.user_id,
  pc.content,
  pc.parent_comment_id as parent_reply_id,
  pc.created_at,
  pc.updated_at
FROM post_comments pc
WHERE EXISTS (SELECT 1 FROM forum_threads t WHERE t.id = pc.post_id);
