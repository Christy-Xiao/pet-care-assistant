-- ============================================================
-- 健康监控模块 - 缺失表建表脚本 (Supabase / PostgreSQL)
-- 在 Supabase SQL Editor 中执行此脚本
-- ============================================================

-- 1. 体重记录表
CREATE TABLE IF NOT EXISTS public.weight_records (
    id VARCHAR(255) PRIMARY KEY,
    user_id INT,
    pet_id VARCHAR(255) NOT NULL,
    weight DECIMAL(5, 2) NOT NULL,
    recorded_at DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weight_pet ON public.weight_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_weight_date ON public.weight_records(recorded_at);

-- 2. 排泄记录表
CREATE TABLE IF NOT EXISTS public.bathroom_records (
    id VARCHAR(255) PRIMARY KEY,
    user_id INT,
    pet_id VARCHAR(255) NOT NULL,
    record_date DATE NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('solid', 'liquid', 'both')),
    size VARCHAR(10) DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),
    color VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bathroom_pet ON public.bathroom_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_bathroom_date ON public.bathroom_records(record_date);

-- 3. 饮食记录表
CREATE TABLE IF NOT EXISTS public.diet_records (
    id VARCHAR(255) PRIMARY KEY,
    user_id INT,
    pet_id VARCHAR(255) NOT NULL,
    record_date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    food_name VARCHAR(255) NOT NULL,
    food_type VARCHAR(20) DEFAULT 'dry' CHECK (food_type IN ('dry', 'wet', 'treat', 'homemade', 'other')),
    amount VARCHAR(50),
    calories INT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diet_pet ON public.diet_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_diet_date ON public.diet_records(record_date);

-- 4. AI 长期记忆表（记忆档案功能也需要）
CREATE TABLE IF NOT EXISTS public.user_long_term_memory (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL DEFAULT '1',
    pet_id VARCHAR(50),
    pet_name VARCHAR(100) NOT NULL DEFAULT '',
    memory_type VARCHAR(20) NOT NULL CHECK (
        memory_type IN ('allergy', 'preference', 'health', 'behavior', 'fear', 'baseline', 'other')
    ),
    memory_content TEXT NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.85,
    source VARCHAR(50) DEFAULT 'chat',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memory_user ON public.user_long_term_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_type ON public.user_long_term_memory(memory_type);

-- 启用 RLS
ALTER TABLE public.weight_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bathroom_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_long_term_memory ENABLE ROW LEVEL SECURITY;

-- 允许所有人访问（演示用）
CREATE POLICY "weight_allow_all" ON public.weight_records FOR ALL USING (true);
CREATE POLICY "bathroom_allow_all" ON public.bathroom_records FOR ALL USING (true);
CREATE POLICY "diet_allow_all" ON public.diet_records FOR ALL USING (true);
CREATE POLICY "memory_allow_all" ON public.user_long_term_memory FOR ALL USING (true);

-- 验证所有表已创建
SELECT 
    'weight_records' AS table_name, COUNT(*) AS row_count FROM public.weight_records
UNION ALL SELECT 'bathroom_records', COUNT(*) FROM public.bathroom_records
UNION ALL SELECT 'diet_records', COUNT(*) FROM public.diet_records
UNION ALL SELECT 'user_long_term_memory', COUNT(*) FROM public.user_long_term_memory;
