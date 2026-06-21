-- 宠物运动记录表 (PostgreSQL / Supabase)
-- 用于记录每次遛狗/运动的详细数据

CREATE TABLE IF NOT EXISTS pet_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,

    -- 运动基本信息
    exercise_date DATE NOT NULL,              -- 运动日期
    start_time TIMESTAMPTZ,                   -- 开始时间
    end_time TIMESTAMPTZ,                     -- 结束时间

    -- 核心数据
    duration_min INTEGER NOT NULL DEFAULT 0,  -- 时长(分钟)
    distance_km DECIMAL(6,2) DEFAULT 0,       -- 距离(公里)
    avg_speed DECIMAL(4,1) DEFAULT 0,         -- 平均配速 (min/km)
    calories_burned INTEGER DEFAULT 0,        -- 预估消耗卡路里

    -- GPS 数据 (可选，存轨迹摘要)
    start_lat DECIMAL(10,7),                  -- 起点纬度
    start_lng DECIMAL(11,7),                  -- 起点经度
    end_lat DECIMAL(10,7),                    -- 终点纬度
    end_lng DECIMAL(11,7),                    -- 终点经度
    gps_track_points JSONB,                   -- GPS轨迹点数组 [{lat,lng,time}]

    -- 其他信息
    steps INTEGER,                            -- 步数
    weather TEXT,                             -- 天气状况 (如"晴 26°C")
    mood VARCHAR(20) DEFAULT 'good',          -- 宠物状态: excellent/good/tired/poor
    notes TEXT,                               -- 备注

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- 索引
    CONSTRAINT fk_pet FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pet_exercises_pet_id ON pet_exercises(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_exercises_user_id ON pet_exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_exercises_date ON pet_exercises(exercise_date DESC);

COMMENT ON TABLE pet_exercises IS '宠物运动/遛狗记录';
