const mysql = require('mysql2/promise');

async function checkPetsTable() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '4123vipabc',
    database: 'pet_care_assistant',
  });

  try {
    console.log('✅ 连接到 MySQL 服务器\n');
    
    // 查看 pets 表结构
    console.log('📋 pets 表结构：');
    const [columns] = await connection.query('DESCRIBE pets');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} (${col.Null})`);
    });
    
    // 检查是否有 user_id 字段
    const hasUserId = columns.some(col => col.Field === 'user_id');
    
    if (!hasUserId) {
      console.log('\n⚠️ pets 表缺少 user_id 字段，正在添加...');
      await connection.query('ALTER TABLE pets ADD COLUMN user_id VARCHAR(50) AFTER id');
      console.log('✅ user_id 字段添加成功！');
    } else {
      console.log('\n✅ pets 表已有 user_id 字段');
    }
    
    // 测试插入数据
    console.log('\n📦 测试插入数据...');
    const testId = 'pet_test_' + Date.now();
    
    try {
      await connection.query(
        'INSERT INTO pets (id, user_id, name, species, breed, gender) VALUES (?, ?, ?, ?, ?, ?)',
        [testId, null, '测试宠物', 'dog', '金毛', 'unknown']
      );
      console.log('✅ 插入测试成功！');
      
      // 查询验证
      const [rows] = await connection.query('SELECT * FROM pets WHERE id = ?', [testId]);
      console.log('📋 插入的数据：', JSON.stringify(rows[0], null, 2));
      
      // 删除测试数据
      await connection.query('DELETE FROM pets WHERE id = ?', [testId]);
      console.log('🗑️ 测试数据已删除');
      
    } catch (insertErr) {
      console.error('❌ 插入失败:', insertErr.message);
      console.error('错误代码:', insertErr.code);
    }
    
  } catch (error) {
    console.error('\n❌ 操作失败:', error.message);
  } finally {
    await connection.end();
    console.log('\n🔌 连接已关闭');
  }
}

checkPetsTable();
