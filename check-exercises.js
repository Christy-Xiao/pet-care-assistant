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

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase
    .from('pet_exercises')
    .select('*')
    .order('exercise_date', { ascending: false });

  if (error) {
    console.error('ERROR:', error.message);
    return;
  }

  console.log(`共 ${data.length} 条运动记录:\n`);
  
  for (const r of data) {
    const date = r.exercise_date;
    const dist = r.distance_km;
    const dur = r.duration_min;
    const mood = r.mood || '-';
    console.log(`${date} | ${dist > 0 ? dist + 'km' : '休息'} | ${dur > 0 ? dur + 'min' : '-'} | ${mood}`);
  }
}

main();
