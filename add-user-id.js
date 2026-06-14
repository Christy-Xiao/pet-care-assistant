const mysql = require('mysql2/promise');

async function addUserIdColumn() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '4123vipabc',
    database: 'pet_care_assistant',
  });

  try {
    console.log('✅ 成功连接到 MySQL 服务器');
    
    // 检查 pets 表是否有 user_id 字段
    const [columns] = await connection.query('SHOW COLUMNS FROM pets LIKE "user_id"');
    
    if (columns.length === 0) {
      console.log('📝 pets 表缺少 user_id 字段，正在添加...');
      await connection.query('ALTER TABLE pets ADD COLUMN user_id VARCHAR(50) AFTER id, ADD INDEX idx_user_id (user_id)');
      console.log('✅ user_id 字段添加成功！');
    } else {
      console.log('ℹ️ pets 表已经有 user_id 字段');
    }
    
    // 检查 medication_reminders 表是否有正确的表结构
    const [medColumns] = await connection.query('SHOW COLUMNS FROM medication_reminders');
    console.log('📋 medication_reminders 表结构:', medColumns.map(c => c.Field).join(', '));
    
    console.log('✅ 数据库检查完成！');
    
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    console.error('请确保：');
    console.error('1. MySQL 服务正在运行');
    console.error('2. 数据库 pet_care_assistant 已创建');
    console.error('如果数据库不存在，请先运行: node setup-db.js');
  } finally {
    await connection.end();
    console.log('🔌 数据库连接已关闭');
  }
}

addUserIdColumn();
