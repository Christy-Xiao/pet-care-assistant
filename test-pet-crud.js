const mysql = require('mysql2/promise');

async function testPetCrud() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '4123vipabc',
    database: 'pet_care_assistant',
  });

  try {
    console.log('✅ 连接到 pet_care_assistant 数据库');

    // 测试插入一只宠物
    console.log('\n📝 测试添加宠物...');
    await connection.execute(
      `INSERT INTO pets (id, name, species, breed, gender, date_of_birth, age, weight, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['pet_test_1', '球球', 'dog', '金毛', 'male', '2023-01-15', '2岁', 30.5, '性格温顺']
    );
    console.log('✅ 宠物添加成功');

    // 测试读取宠物
    console.log('\n📝 测试读取宠物...');
    const [pets] = await connection.execute('SELECT * FROM pets');
    console.log('当前宠物列表:', pets);

    // 测试更新宠物
    console.log('\n📝 测试更新宠物...');
    await connection.execute(
      'UPDATE pets SET weight = ? WHERE id = ?',
      [32.0, 'pet_test_1']
    );
    const [updatedPet] = await connection.execute('SELECT * FROM pets WHERE id = ?', ['pet_test_1']);
    console.log('更新后的宠物:', updatedPet);

    // 测试删除宠物
    console.log('\n📝 测试删除宠物...');
    await connection.execute('DELETE FROM pets WHERE id = ?', ['pet_test_1']);
    const [deletedPet] = await connection.execute('SELECT * FROM pets WHERE id = ?', ['pet_test_1']);
    console.log('删除后查询结果:', deletedPet);

    console.log('\n✅ 所有 CRUD 测试通过！数据库功能正常。');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await connection.end();
  }
}

testPetCrud();
