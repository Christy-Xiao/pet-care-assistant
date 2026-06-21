import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';

// GET /api/exercise-records - 获取运动记录（从 pet_exercises 表）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');
    const limit = searchParams.get('limit');

    let queryBuilder = supabase
      .from('pet_exercises')
      .select('*')
      .order('exercise_date', { ascending: false });

    if (petId) {
      queryBuilder = queryBuilder.eq('pet_id', petId);
    }

    if (limit) {
      queryBuilder = queryBuilder.limit(parseInt(limit));
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching exercise records:', error.message);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching exercise records:', error?.message);
    return NextResponse.json([], { status: 200 });
  }
}
