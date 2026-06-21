-- 修复用药提醒表缺失列：total_doses, remaining_doses
-- 在 Supabase SQL Editor 或项目数据库中执行

ALTER TABLE medication_reminders 
  ADD COLUMN IF NOT EXISTS total_doses INT DEFAULT 21 COMMENT '总剂量（默认7天疗程）',
  ADD COLUMN IF NOT EXISTS remaining_doses INT DEFAULT 21 COMMENT '剩余剂量';
