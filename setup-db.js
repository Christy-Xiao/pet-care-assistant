const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  // 连接 MySQL 服务器（不指定数据库）
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '4123vipabc',
    multipleStatements: true,
  });

  try {
    console.log('✅ 成功连接到 MySQL 服务器');

    // 删除旧数据库
    console.log('🗑️ 删除旧数据库（如果有）...');
    await connection.query('DROP DATABASE IF EXISTS pet_care_assistant');
    
    // 读取 schema 文件
    const schemaPath = path.join(__dirname, 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📝 执行数据库脚本...');
    
    // 执行 schema
    await connection.query(schema);
    
    console.log('✅ 数据库和表创建成功！');
    
    // 验证表是否创建
    const [tables] = await connection.query('SHOW TABLES');
    console.log('📋 当前数据库中的表：');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });

  } catch (error) {
    console.error('❌ 数据库设置失败:', error.message);
  } finally {
    await connection.end();
    console.log('🔌 数据库连接已关闭');
  }
}

setupDatabase();
