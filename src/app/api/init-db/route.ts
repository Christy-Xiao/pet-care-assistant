import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const client = await pool.connect();
    
    try {
      // 创建 users 表
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ users 表创建/已存在');

      // 创建 pets 表
      await client.query(`
        CREATE TABLE IF NOT EXISTS pets (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          name VARCHAR(100) NOT NULL,
          species VARCHAR(20) DEFAULT 'dog' CHECK (species IN ('dog', 'cat', 'other')),
          breed VARCHAR(100),
          gender VARCHAR(10) DEFAULT 'unknown' CHECK (gender IN ('male', 'female', 'unknown')),
          date_of_birth DATE,
          age VARCHAR(50),
          weight DECIMAL(5, 2),
          avatar VARCHAR(500),
          allergies VARCHAR(500),
          medical_history TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ pets 表创建/已存在');

      // 创建 care_schedules 表
      await client.query(`
        CREATE TABLE IF NOT EXISTS care_schedules (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          pet_id VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          event_type VARCHAR(30) DEFAULT 'other' CHECK (event_type IN ('vaccination','parasite_prevention','wellness_exam','dental_care','grooming','other','deworming','checkup','medication')),
          due_date TIMESTAMP NOT NULL,
          completed_date TIMESTAMP,
          status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending','completed','skipped','cancelled')),
          priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
          recurrence JSONB,
          source VARCHAR(255),
          notification_sent BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ care_schedules 表创建/已存在');

      // 创建 health_records 表
      await client.query(`
        CREATE TABLE IF NOT EXISTS health_records (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          pet_id VARCHAR(255) NOT NULL,
          image_url VARCHAR(500),
          analysis_type VARCHAR(20) DEFAULT 'other' CHECK (analysis_type IN ('feces','skin','eye','ear','other')),
          type VARCHAR(20) DEFAULT 'other' CHECK (type IN ('vaccination','checkup','surgery','medication','other','analysis','medical')),
          title VARCHAR(255),
          description TEXT,
          medications JSONB,
          result JSONB,
          detected_date DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ health_records 表创建/已存在');

      // 添加 user_id 字段（如果不存在）
      try {
        await client.query('ALTER TABLE pets ADD COLUMN IF NOT EXISTS user_id INT');
        console.log('✅ pets 表确认 user_id 列');
      } catch (e: any) { /* 列已存在 */ }

      try {
        await client.query('ALTER TABLE care_schedules ADD COLUMN IF NOT EXISTS user_id INT');
        console.log('✅ care_schedules 表确认 user_id 列');
      } catch (e: any) { /* 列已存在 */ }

      try {
        await client.query('ALTER TABLE health_records ADD COLUMN IF NOT EXISTS user_id INT');
        console.log('✅ health_records 表确认 user_id 列');
      } catch (e: any) { /* 列已存在 */ }

      try {
        await client.query('ALTER TABLE health_records ADD COLUMN IF NOT EXISTS title VARCHAR(255)');
        console.log('✅ health_records 表确认 title 列');
      } catch (e: any) { /* 列已存在 */ }

      try {
        await client.query('ALTER TABLE health_records ADD COLUMN IF NOT EXISTS description TEXT');
        console.log('✅ health_records 表确认 description 列');
      } catch (e: any) { /* 列已存在 */ }

      try {
        await client.query('ALTER TABLE health_records ADD COLUMN IF NOT EXISTS medications JSONB');
        console.log('✅ health_records 表确认 medications 列');
      } catch (e: any) { /* 列已存在 */ }

      // 用户长期记忆表
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_long_term_memory (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL,
          pet_id VARCHAR(100),
          pet_name VARCHAR(100),
          memory_type VARCHAR(20) NOT NULL CHECK (memory_type IN ('allergy','preference','health','behavior','other')),
          memory_content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ user_long_term_memory 表创建/已存在');

      // 聊天记忆表
      await client.query(`
        CREATE TABLE IF NOT EXISTS chat_memory (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL,
          session_id VARCHAR(100) NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant')),
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ chat_memory 表创建/已存在');

      // 用药提醒表
      await client.query(`
        CREATE TABLE IF NOT EXISTS medication_reminders (
          id VARCHAR(255) PRIMARY KEY,
          pet_id VARCHAR(255) NOT NULL,
          record_id VARCHAR(255),
          disease_name VARCHAR(255) NOT NULL,
          medications JSONB,
          treatment_plan JSONB,
          frequency INT DEFAULT 3,
          interval_hours INT DEFAULT 8,
          next_dose_time TIMESTAMP NOT NULL,
          total_doses INT DEFAULT 21,
          remaining_doses INT DEFAULT 21,
          status VARCHAR(10) DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ medication_reminders 表创建/已存在');

      // 体重记录表
      await client.query(`
        CREATE TABLE IF NOT EXISTS weight_records (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          pet_id VARCHAR(255) NOT NULL,
          weight DECIMAL(5, 2) NOT NULL,
          recorded_at DATE NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ weight_records 表创建/已存在');

      // 排泄记录表
      await client.query(`
        CREATE TABLE IF NOT EXISTS bathroom_records (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          pet_id VARCHAR(255) NOT NULL,
          record_date DATE NOT NULL,
          type VARCHAR(10) NOT NULL CHECK (type IN ('solid','liquid','both')),
          size VARCHAR(10) DEFAULT 'medium' CHECK (size IN ('small','medium','large')),
          color VARCHAR(50),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ bathroom_records 表创建/已存在');

      // 饮食记录表
      await client.query(`
        CREATE TABLE IF NOT EXISTS diet_records (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          pet_id VARCHAR(255) NOT NULL,
          meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
          food_name VARCHAR(200),
          amount DECIMAL(6,2),
          unit VARCHAR(20),
          recorded_at DATE NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ diet_records 表创建/已存在');

      // 病例记录表
      await client.query(`
        CREATE TABLE IF NOT EXISTS medical_records (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          pet_id VARCHAR(255) NOT NULL,
          disease_name VARCHAR(200) NOT NULL,
          disease_type VARCHAR(50),
          severity VARCHAR(10) DEFAULT 'mild' CHECK (severity IN ('normal','mild','moderate','severe')),
          description TEXT,
          medications JSONB,
          treatment_plan JSONB,
          detected_date DATE NOT NULL,
          status VARCHAR(10) DEFAULT 'active' CHECK (status IN ('active','recovered','chronic')),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ medical_records 表创建/已存在');

      // Sessions 表（登录用）
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          token VARCHAR(255) UNIQUE NOT NULL,
          user_id INT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ sessions 表创建/已存在');

      return NextResponse.json({ message: '数据库初始化成功' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    return NextResponse.json({ error: '数据库初始化失败', details: String(error) }, { status: 500 });
  }
}
