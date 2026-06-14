-- 养宠助手数据库表结构
-- 运行此脚本创建数据库和表

CREATE DATABASE IF NOT EXISTS pet_care_assistant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE pet_care_assistant;

-- 宠物档案表
CREATE TABLE IF NOT EXISTS pets (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50),
    name VARCHAR(100) NOT NULL,
    species ENUM('dog', 'cat', 'other') NOT NULL DEFAULT 'dog',
    breed VARCHAR(100),
    gender ENUM('male', 'female', 'unknown') DEFAULT 'unknown',
    date_of_birth DATE,
    age INT,
    weight DECIMAL(5, 2),
    avatar TEXT,
    allergies TEXT,
    medical_history TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_species (species),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 护理日程表
CREATE TABLE IF NOT EXISTS care_schedules (
    id VARCHAR(50) PRIMARY KEY,
    pet_id VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type ENUM('vaccination', 'deworming', 'grooming', 'checkup', 'medication', 'other') NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
    recurrence VARCHAR(50),
    reminder_enabled BOOLEAN DEFAULT TRUE,
    completed_date TIMESTAMP NULL,
    notification_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    INDEX idx_pet_id (pet_id),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 健康记录表
CREATE TABLE IF NOT EXISTS health_records (
    id VARCHAR(50) PRIMARY KEY,
    pet_id VARCHAR(50) NOT NULL,
    type ENUM('analysis', 'medical', 'vaccination', 'other') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    image_url TEXT,
    result JSON,
    medications JSON,
    detected_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    INDEX idx_pet_id (pet_id),
    INDEX idx_type (type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 通知记录表
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    pet_id VARCHAR(50),
    pet_name VARCHAR(100),
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type ENUM('reminder', 'alert', 'info') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL,
    INDEX idx_pet_id (pet_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 病例记录表
CREATE TABLE IF NOT EXISTS medical_records (
    id VARCHAR(50) PRIMARY KEY,
    pet_id VARCHAR(50) NOT NULL,
    disease_name VARCHAR(200) NOT NULL,
    disease_type VARCHAR(50),
    severity ENUM('normal', 'mild', 'moderate', 'severe') DEFAULT 'mild',
    description TEXT,
    medications JSON,
    treatment_plan JSON,
    detected_date DATE NOT NULL,
    status ENUM('active', 'recovered', 'chronic') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    INDEX idx_pet_id (pet_id),
    INDEX idx_status (status),
    INDEX idx_detected_date (detected_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用药提醒表
CREATE TABLE IF NOT EXISTS medication_reminders (
    id VARCHAR(50) PRIMARY KEY,
    pet_id VARCHAR(50) NOT NULL,
    record_id VARCHAR(50),
    disease_name VARCHAR(200) NOT NULL,
    medications JSON NOT NULL,
    treatment_plan JSON,
    frequency INT DEFAULT 3 COMMENT '每天用药次数',
    interval_hours DECIMAL(4,1) DEFAULT 8 COMMENT '用药间隔（小时）',
    next_dose_time DATETIME NOT NULL COMMENT '下次用药时间',
    total_doses INT DEFAULT 21 COMMENT '总剂量（默认7天疗程）',
    remaining_doses INT DEFAULT 21 COMMENT '剩余剂量',
    status ENUM('active', 'paused', 'completed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
    FOREIGN KEY (record_id) REFERENCES medical_records(id) ON DELETE SET NULL,
    INDEX idx_pet_id (pet_id),
    INDEX idx_next_dose_time (next_dose_time),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 绿地位置表
CREATE TABLE IF NOT EXISTS park_locations (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    address VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    features JSON,
    rating DECIMAL(2, 1),
    distance VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入示例数据
INSERT INTO pets (id, name, species, breed, gender, date_of_birth, age, weight, notes) VALUES
('pet_1', '球球', 'dog', '金毛', 'male', '2023-01-15', 3, 30.5, '性格温顺，喜欢玩球');

INSERT INTO care_schedules (id, pet_id, title, description, event_type, due_date, priority) VALUES
('schedule_1', 'pet_1', '狂犬疫苗加强针', '年度狂犬疫苗加强针接种', 'vaccination', '2025-06-15', 'high'),
('schedule_2', 'pet_1', '体内驱虫', '季度体内驱虫', 'deworming', '2025-04-20', 'medium'),
('schedule_3', 'pet_1', '年度体检', '全面身体检查', 'checkup', '2025-12-01', 'medium');

INSERT INTO health_records (id, pet_id, type, title, description, result) VALUES
('record_1', 'pet_1', 'analysis', '皮肤问题分析', '肚皮发红，疑似湿疹', '{"summary": "皮肤轻微炎症，建议保持干燥清洁", "issues": ["轻度皮肤炎"], "severity": "mild", "suggestions": ["保持皮肤干燥", "使用温和洗护用品"]}');

INSERT INTO park_locations (id, name, address, latitude, longitude, features, rating, distance) VALUES
('park_1', '世纪公园', '浦东新区芳甸路', 31.2154, 121.5673, '["大型草坪", "宠物饮水点", "拾便袋"]', 4.5, '2.5km'),
('park_2', '滨江绿地', '黄浦区外滩', 31.2401, 121.4901, '["江边步道", "宠物分区"]', 4.2, '3.8km');
