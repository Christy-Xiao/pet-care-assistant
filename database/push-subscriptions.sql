-- PWA 推送通知订阅表
-- 在 Supabase SQL Editor 中执行此脚本来创建表

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id VARCHAR(50) PRIMARY KEY,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh_key VARCHAR(255) NOT NULL,
    auth_secret VARCHAR(255) NOT NULL,
    user_id VARCHAR(50),           -- 关联用户 ID（可为空，表示匿名订阅）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_push_sub_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_sub_created ON push_subscriptions(created_at);

COMMENT ON TABLE push_subscriptions IS 'PWA Web Push 推送通知订阅信息';
COMMENT ON COLUMN push_subscriptions.endpoint IS '推送端点 URL';
COMMENT ON COLUMN push_subscriptions.p256dh_key IS 'VAPID ECDH 公钥';
COMMENT ON COLUMN push_subscriptions.auth_secret IS '认证密钥';
