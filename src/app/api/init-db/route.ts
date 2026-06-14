import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const connection = await pool.getConnection();
    
    try {
      // 创建 users 表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ users 表创建/已存在');

      // 创建 pets 表（添加 user_id）
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS pets (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          name VARCHAR(100) NOT NULL,
          species ENUM('dog', 'cat') DEFAULT 'dog',
          breed VARCHAR(100),
          gender ENUM('male', 'female', 'unknown') DEFAULT 'unknown',
          date_of_birth DATE,
          age VARCHAR(50),
          weight DECIMAL(5, 2),
          avatar VARCHAR(500),
          allergies VARCHAR(500),
          medical_history TEXT,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ pets 表创建/已存在');

      // 创建 care_schedules 表（添加 user_id）
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS care_schedules (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          pet_id VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          event_type ENUM('vaccination', 'parasite_prevention', 'wellness_exam', 'dental_care', 'grooming', 'other') DEFAULT 'other',
          due_date DATETIME NOT NULL,
          completed_date DATETIME,
          status ENUM('pending', 'completed', 'skipped') DEFAULT 'pending',
          priority ENUM('high', 'medium', 'low') DEFAULT 'medium',
          recurrence JSON,
          source VARCHAR(255),
          notification_sent BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ care_schedules 表创建/已存在');

      // 创建 health_records 表（添加 user_id）
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS health_records (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          pet_id VARCHAR(255) NOT NULL,
          image_url VARCHAR(500),
          analysis_type ENUM('feces', 'skin', 'eye', 'ear', 'other') DEFAULT 'other',
          type ENUM('vaccination', 'checkup', 'surgery', 'medication', 'other') DEFAULT 'other',
          title VARCHAR(255),
          description TEXT,
          medications JSON,
          result JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ health_records 表创建/已存在');

      // 修改 health_records 表的 type 字段为新的 ENUM 值
      try {
        await connection.execute(`ALTER TABLE health_records MODIFY COLUMN type ENUM('vaccination', 'checkup', 'surgery', 'medication', 'other') DEFAULT 'other'`);
        console.log('✅ health_records 表更新 type 列 ENUM 值');
      } catch (e: any) {
        console.log('health_records type 列 ENUM 更新:', e.message);
      }

      try {
        await connection.execute('ALTER TABLE health_records ADD COLUMN title VARCHAR(255)');
        console.log('✅ health_records 表添加 title 列');
      } catch (e: any) {
        if (e.code !== 'ER_DUP_FIELDNAME') console.log('health_records title 列已存在');
      }

      try {
        await connection.execute('ALTER TABLE health_records ADD COLUMN description TEXT');
        console.log('✅ health_records 表添加 description 列');
      } catch (e: any) {
        if (e.code !== 'ER_DUP_FIELDNAME') console.log('health_records description 列已存在');
      }

      try {
        await connection.execute('ALTER TABLE health_records ADD COLUMN medications JSON');
        console.log('✅ health_records 表添加 medications 列');
      } catch (e: any) {
        if (e.code !== 'ER_DUP_FIELDNAME') console.log('health_records medications 列已存在');
      }

      // 添加 user_id 字段到现有表（如果不存在）
      try {
        await connection.execute('ALTER TABLE pets ADD COLUMN user_id INT AFTER id');
        console.log('✅ pets 表添加 user_id 列');
      } catch (e: any) {
        if (e.code !== 'ER_DUP_FIELDNAME') console.log('pets user_id 列已存在');
      }

      try {
        await connection.execute('ALTER TABLE care_schedules ADD COLUMN user_id INT AFTER id');
        console.log('✅ care_schedules 表添加 user_id 列');
      } catch (e: any) {
        if (e.code !== 'ER_DUP_FIELDNAME') console.log('care_schedules user_id 列已存在');
      }

      try {
        await connection.execute('ALTER TABLE health_records ADD COLUMN user_id INT AFTER id');
        console.log('✅ health_records 表添加 user_id 列');
      } catch (e: any) {
        if (e.code !== 'ER_DUP_FIELDNAME') console.log('health_records user_id 列已存在');
      }

      // 创建用户长期记忆表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS user_long_term_memory (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          pet_id VARCHAR(100),
          pet_name VARCHAR(100),
          memory_type ENUM('allergy', 'preference', 'health', 'behavior', 'other') NOT NULL,
          memory_content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_pet_id (pet_id),
          INDEX idx_memory_type (memory_type)
        )
      `);
      console.log('✅ user_long_term_memory 表创建/已存在');

      // 创建聊天记忆表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS chat_memory (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          session_id VARCHAR(100) NOT NULL,
          role ENUM('user', 'assistant') NOT NULL,
          content TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user_id (user_id),
          INDEX idx_session_id (session_id),
          INDEX idx_created_at (created_at)
        )
      `);
      console.log('✅ chat_memory 表创建/已存在');

      // 创建用药提醒表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS medication_reminders (
          id VARCHAR(255) PRIMARY KEY,
          pet_id VARCHAR(255) NOT NULL,
          record_id VARCHAR(255),
          disease_name VARCHAR(255) NOT NULL,
          medications JSON,
          treatment_plan JSON,
          frequency INT DEFAULT 3,
          interval_hours INT DEFAULT 8,
          next_dose_time DATETIME NOT NULL,
          total_doses INT DEFAULT 21,
          remaining_doses INT DEFAULT 21,
          status ENUM('active', 'paused', 'completed') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_pet_id (pet_id),
          INDEX idx_status (status),
          INDEX idx_next_dose_time (next_dose_time)
        )
      `);
      console.log('✅ medication_reminders 表创建/已存在');

      // 创建体重记录表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS weight_records (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          pet_id VARCHAR(255) NOT NULL,
          weight DECIMAL(5, 2) NOT NULL,
          recorded_at DATE NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ weight_records 表创建/已存在');

      // 创建排泄记录表
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS bathroom_records (
          id VARCHAR(255) PRIMARY KEY,
          user_id INT,
          pet_id VARCHAR(255) NOT NULL,
          record_date DATE NOT NULL,
          type ENUM('solid', 'liquid', 'both') NOT NULL,
          size ENUM('small', 'medium', 'large') DEFAULT 'medium',
          color VARCHAR(50),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
        )
      `);
      console.log('✅ bathroom_records 表创建/已存在');

      return NextResponse.json({ message: '数据库初始化成功' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    return NextResponse.json({ error: '数据库初始化失败', details: String(error) }, { status: 500 });
  }
}
