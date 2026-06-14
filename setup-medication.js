const mysql = require('mysql2/promise');

async function createMedicationRemindersTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '4123vipabc',
    database: 'pet_care_assistant',
  });

  try {
    console.log('✅ 成功连接到 MySQL 服务器\n');
    
    // 检查表是否存在
    const [tables] = await connection.query("SHOW TABLES LIKE 'medication_reminders'");
    
    if (tables.length > 0) {
      console.log('ℹ️ medication_reminders 表已存在');
    } else {
      console.log('📦 创建 medication_reminders 表...');
      
      // 不使用外键约束，直接创建
      await connection.query(`
        CREATE TABLE medication_reminders (
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
          INDEX idx_pet_id (pet_id),
          INDEX idx_next_dose_time (next_dose_time),
          INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('✅ medication_reminders 表创建成功！');
    }
    
    // 验证表结构
    console.log('\n📋 medication_reminders 表结构：');
    const [columns] = await connection.query('DESCRIBE medication_reminders');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    console.log('\n✅ 完成！');
    
  } catch (error) {
    console.error('\n❌ 操作失败:', error.message);
  } finally {
    await connection.end();
    console.log('🔌 数据库连接已关闭');
  }
}

createMedicationRemindersTable();
