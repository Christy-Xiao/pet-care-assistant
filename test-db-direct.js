const mysql = require('mysql2/promise');

async function testApi() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '4123vipabc',
    database: 'pet_care_assistant',
    timezone: '+08:00',
    dateStrings: true,
  });

  try {
    console.log('✅ 连接到 MySQL 服务器\n');

    // 模拟 API POST 逻辑
    const id = `pet_${Date.now()}`;
    const userId = null; // body.userId ? parseInt(body.userId) : null;

    console.log('📦 插入数据...');
    console.log('  id:', id);
    console.log('  userId:', userId);
    console.log('  name:', '测试宠物');
    console.log('  species:', 'dog');
    console.log('  breed:', '金毛');

    await connection.query(
      `INSERT INTO pets (id, user_id, name, species, breed, gender, date_of_birth, age, weight, avatar, allergies, medical_history, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        userId,
        '测试宠物',
        'dog',
        '金毛',
        'unknown',
        null,
        null,
        null,
        '',
        '',
        '',
        ''
      ]
    );

    console.log('\n✅ 插入成功！');

    // 查询验证
    const [rows] = await connection.query('SELECT * FROM pets WHERE id = ?', [id]);
    console.log('\n📋 查询结果：');
    console.log(JSON.stringify(rows[0], null, 2));

    // 清理测试数据
    await connection.query('DELETE FROM pets WHERE id = ?', [id]);
    console.log('\n🗑️ 测试数据已清理');

    console.log('\n✅ 数据库操作验证成功！');
    console.log('\n如果 API 仍然返回 500 错误，请重启 Next.js 服务器:');
    console.log('  1. 按 Ctrl+C 停止服务器');
    console.log('  2. 运行 npm run dev');

  } catch (error) {
    console.error('\n❌ 操作失败:', error.message);
    console.error('错误代码:', error.code);
  } finally {
    await connection.end();
  }
}

testApi();
