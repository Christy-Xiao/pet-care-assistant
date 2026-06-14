import { NextRequest, NextResponse } from 'next/server';
import { query, insert, execute } from '@/lib/db';
import { getConnection } from '@/lib/db';

// 确保表存在
async function ensureTableExists() {
  try {
    const connection = await getConnection();
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS exercise_records (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT,
        pet_id VARCHAR(255) NOT NULL,
        activity_type VARCHAR(50) NOT NULL,
        duration DECIMAL(5, 1) NOT NULL,
        distance DECIMAL(7, 2),
        location VARCHAR(255),
        notes TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
      )
    `);
    connection.release();
  } catch (error) {
    console.error('Error creating exercise_records table:', error);
  }
}

// GET /api/exercise-records - 获取运动记录
export async function GET(request: NextRequest) {
  try {
    await ensureTableExists();
    
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');
    const limit = searchParams.get('limit');

    let sql = 'SELECT * FROM exercise_records WHERE 1=1';
    const params: any[] = [];

    if (petId) {
      sql += ' AND pet_id = ?';
      params.push(petId);
    }

    sql += ' ORDER BY date DESC, created_at DESC';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const records: any[] = await query(sql, params);
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching exercise records:', error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/exercise-records - 创建运动记录
export async function POST(request: NextRequest) {
  try {
    await ensureTableExists();
    
    const body = await request.json();
    const id = `exercise_${Date.now()}`;
    const {
      user_id,
      pet_id,
      activity_type,
      duration,
      distance,
      location,
      notes,
      date,
    } = body;

    if (!pet_id || !activity_type || !duration || !date) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    await insert(
      `INSERT INTO exercise_records (id, user_id, pet_id, activity_type, duration, distance, location, notes, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user_id || null, pet_id, activity_type, duration, distance || null, location || null, notes || null, date]
    );

    const newRecords: any[] = await query('SELECT * FROM exercise_records WHERE id = ?', [id]);
    return NextResponse.json(newRecords[0], { status: 201 });
  } catch (error) {
    console.error('Error creating exercise record:', error);
    return NextResponse.json({ error: '创建运动记录失败' }, { status: 500 });
  }
}

// DELETE /api/exercise-records - 删除运动记录
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少记录ID' }, { status: 400 });
    }

    await execute('DELETE FROM exercise_records WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting exercise record:', error);
    return NextResponse.json({ error: '删除运动记录失败' }, { status: 500 });
  }
}
