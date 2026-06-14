const mysql = require('mysql2/promise');

async function checkDb() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '4123vipabc',
    database: 'pet_care_assistant'
  });
  
  const [pets] = await connection.query("SELECT id, name, date_of_birth, allergies FROM pets");
  console.log('=== 所有宠物数据 ===');
  pets.forEach(p => {
    console.log('ID:', p.id);
    console.log('Name:', p.name);
    console.log('date_of_birth:', p.date_of_birth, '(原始值)');
    console.log('allergies:', p.allergies);
    console.log('---');
  });
  
  await connection.end();
}

checkDb().catch(console.error);
