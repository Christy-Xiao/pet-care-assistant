import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// GET /api/exercise-records - 获取运动记录（从 pet_exercises 表）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');

    // 直接用 Supabase REST 查询
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/pet_exercises`;
    const headers = {
      'apikey': process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''}`,
    };

    let query = '?order=exercise_date.desc&select=*';
    if (petId) query += `&pet_id=eq.${encodeURIComponent(petId)}`;

    console.log('[exercise] fetching', url + query);

    const res = await fetch(url + query, { headers });
    const data = await res.json();

    console.log('[exercise] result count:', Array.isArray(data) ? data.length : 'error');

    if (!Array.isArray(data)) {
      console.error('[exercise] unexpected response:', data);
      return NextResponse.json([]);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[exercise] Error:', error?.message);
    return NextResponse.json([]);
  }
}
