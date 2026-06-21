const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8').split('\n');
const env = {};
for (const line of envContent) {
  const m = line.match(/^(\w+)=(.+)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const url = env.NEXT_PUBLIC_SUPABASE_URL || 'https://rjmtckzejaqhodgjuyrl.supabase.co';
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

console.log('URL:', url);
console.log('KEY:', key ? '✅' : '❌');

const supabase = createClient(url, key);

async function main() {
  // Read SQL file
  const sql = fs.readFileSync(path.join(__dirname, 'database', 'create-pet-exercises.sql'), 'utf8');
  console.log('\n--- 执行建表 SQL ---\n');

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
    // Try raw query via REST
    console.log('rpc不可用，尝试直接用 Supabase SQL Editor 方式...');
    
    // Use the supabase management API or direct postgres approach won't work from client SDK
    // So we'll use a workaround: insert a test row to verify table doesn't exist, then guide user
    return null;
  });

  if (error && error.message.includes("function exec_sql")) {
    console.log('⚠️  无法通过 SDK 直接执行 DDL（Supabase 限制）\n');
    console.log('📋 请在 Supabase Dashboard → SQL Editor 中执行以下命令：\n');
    console.log('=' .repeat(60));
    console.log(sql);
    console.log('=' .repeat(60));
    console.log('\n或者打开: https://supabase.com/dashboard/project/.../sql');
  } else if (error) {
    console.log('ERROR:', error.message);
  } else {
    console.log('✅ 建表成功!', data);
  }

  // Verify by trying to select
  console.log('\n--- 验证表是否创建 ---');
  const { count } = await supabase.from('pet_exercises').select('*', { count: 'exact', head: true });
  if (count !== null) {
    console.log(`✅ pet_exercises 表已存在，当前 ${count} 条记录`);
  }
}

main();
