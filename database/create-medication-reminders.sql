-- ============================================================
-- 用药提醒表 - PostgreSQL 版本 (Supabase)
-- 在 Supabase SQL Editor 中执行此脚本
-- ============================================================

CREATE TABLE IF NOT EXISTS public.medication_reminders (
    id VARCHAR(50) PRIMARY KEY,
    pet_id VARCHAR(50) NOT NULL,
    record_id VARCHAR(50),
    disease_name VARCHAR(200) NOT NULL DEFAULT '用药治疗',
    medications JSONB NOT NULL DEFAULT '[]'::jsonb,
    treatment_plan JSONB,
    frequency INT DEFAULT 3,
    interval_hours DECIMAL(4,1) DEFAULT 8,
    next_dose_time TIMESTAMPTZ NOT NULL,
    total_doses INT DEFAULT 21,
    remaining_doses INT DEFAULT 21,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_med_pet_id ON public.medication_reminders(pet_id);
CREATE INDEX IF NOT EXISTS idx_med_next_dose ON public.medication_reminders(next_dose_time);
CREATE INDEX IF NOT EXISTS idx_med_status ON public.medication_reminders(status);

-- RLS
ALTER TABLE public.medication_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "med_allow_all" ON public.medication_reminders FOR ALL USING (true);

-- 验证
SELECT 'medication_reminders ✅' AS result, COUNT(*) AS row_count FROM public.medication_reminders;
