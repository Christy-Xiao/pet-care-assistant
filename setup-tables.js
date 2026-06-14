const mysql = require('mysql2/promise');

async function checkAndSetupDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '4123vipabc',
    multipleStatements: true,
  });

  try {
    console.log('✅ 成功连接到 MySQL 服务器\n');
    
    // 检查数据库是否存在
    const [databases] = await connection.query('SHOW DATABASES LIKE "pet_care_assistant"');
    
    if (databases.length === 0) {
      console.log('📦 数据库不存在，正在创建...\n');
      
      // 创建数据库
      await connection.query('CREATE DATABASE IF NOT EXISTS pet_care_assistant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      console.log('✅ 数据库创建成功！\n');
    } else {
      console.log('ℹ️ 数据库 pet_care_assistant 已存在\n');
    }
    
    // 切换到数据库
    await connection.query('USE pet_care_assistant');
    
    // 检查并创建所有必要的表
    const tablesToCheck = [
      { name: 'pets', sql: `CREATE TABLE IF NOT EXISTS pets (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
      
      { name: 'medication_reminders', sql: `CREATE TABLE IF NOT EXISTS medication_reminders (
        id VARCHAR(50) PRIMARY KEY,
        pet_id VARCHAR(50) NOT NULL,
        record_id VARCHAR(50),
        disease_name VARCHAR(200) NOT NULL,
        medications JSON NOT NULL,
        treatment_plan JSON,
        frequency INT DEFAULT 3,
        interval_hours DECIMAL(4,1) DEFAULT 8,
        next_dose_time DATETIME NOT NULL,
        total_doses INT DEFAULT 21,
        remaining_doses INT DEFAULT 21,
        status ENUM('active', 'paused', 'completed') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
        FOREIGN KEY (record_id) REFERENCES medical_records(id) ON DELETE SET NULL,
        INDEX idx_pet_id (pet_id),
        INDEX idx_next_dose_time (next_dose_time),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
      
      { name: 'care_schedules', sql: `CREATE TABLE IF NOT EXISTS care_schedules (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
      
      { name: 'health_records', sql: `CREATE TABLE IF NOT EXISTS health_records (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
      
      { name: 'notifications', sql: `CREATE TABLE IF NOT EXISTS notifications (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
      
      { name: 'medical_records', sql: `CREATE TABLE IF NOT EXISTS medical_records (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
      
      { name: 'park_locations', sql: `CREATE TABLE IF NOT EXISTS park_locations (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        address VARCHAR(500),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        features JSON,
        rating DECIMAL(2, 1),
        distance VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` }
    ];
    
    console.log('📋 检查并创建表结构...\n');
    
    for (const table of tablesToCheck) {
      try {
        await connection.query(table.sql);
        console.log(`  ✅ 表 ${table.name} 就绪`);
      } catch (err) {
        if (err.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`  ℹ️ 表 ${table.name} 已存在`);
        } else {
          // 如果是外键约束失败（因为引用的表不存在），先创建该表
          console.log(`  ⚠️ 表 ${table.name} 创建遇到问题（可能是依赖关系）: ${err.message}`);
        }
      }
    }
    
    console.log('\n📋 当前数据库中的所有表：');
    const [tables] = await connection.query('SHOW TABLES');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });
    
    console.log('\n✅ 数据库设置完成！');
    
  } catch (error) {
    console.error('\n❌ 数据库设置失败:', error.message);
    console.error('\n请确保 MySQL 服务正在运行');
  } finally {
    await connection.end();
    console.log('🔌 数据库连接已关闭');
  }
}

checkAndSetupDatabase();
