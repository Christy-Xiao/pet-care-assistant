const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8').split('\n');
const env = {};
for (const line of envContent) {
  const m = line.match(/^(\w+)=(.+)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const url = env.NEXT_PUBLIC_SUPABASE_URL || 'https://rjmtckzejaqhodgjuyrl.supabase.co';
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

console.log('URL:', url);
console.log('KEY exists:', !!key);

const supabase = createClient(url, key);

async function check() {
  // Try listing known tables
  const tables = [
    'pets', 'care_schedules', 'health_records', 'notifications',
    'medical_records', 'medication_reminders', 'park_locations',
    'chat_conversations', 'chat_messages', 'walk_records',
    'exercise_records', 'pet_activities', 'weight_records',
    'memories', 'push_subscriptions'
  ];

  console.log('\n--- 检查表是否存在 ---');
  for (const t of tables) {
    try {
      const { data, error, count } = await supabase.from(t).select('id', { count: 'exact', head: true });
      if (error) {
        console.log(`❌ ${t}: ${error.code} - ${error.message.slice(0,60)}`);
      } else {
        console.log(`✅ ${t}: ${count} 条记录`);
      }
    } catch (e) {
      console.log(`❌ ${t}: ${e.message.slice(0,60)}`);
    }
  }
}

check();
