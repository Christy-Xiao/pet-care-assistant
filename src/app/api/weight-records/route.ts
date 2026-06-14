import { NextRequest, NextResponse } from 'next/server';
import { query, insert, execute } from '@/lib/db';
import { getConnection } from '@/lib/db';

// 确保表存在
async function ensureTableExists() {
  try {
    const connection = await getConnection();
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS weight_records (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT,
        pet_id VARCHAR(255) NOT NULL,
        weight DECIMAL(5, 2) NOT NULL,
        recorded_at DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
      )
    `);
    connection.release();
  } catch (error) {
    console.error('Error creating weight_records table:', error);
  }
}

// GET /api/weight-records - 获取体重记录
export async function GET(request: NextRequest) {
  try {
    await ensureTableExists();
    
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');

    let sql = 'SELECT * FROM weight_records WHERE 1=1';
    const params: any[] = [];

    if (petId) {
      sql += ' AND pet_id = ?';
      params.push(petId);
    }

    sql += ' ORDER BY recorded_at DESC';

    const records: any[] = await query(sql, params);

    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching weight records:', error);
    return NextResponse.json({ error: 'Failed to fetch weight records' }, { status: 500 });
  }
}

// POST /api/weight-records - 创建体重记录
export async function POST(request: NextRequest) {
  try {
    await ensureTableExists();
    
    const body = await request.json();
    const id = `weight_${Date.now()}`;
    const {
      pet_id,
      weight,
      recorded_at,
      notes = '',
    } = body;

    if (!pet_id || !weight || !recorded_at) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await insert(
      'INSERT INTO weight_records (id, pet_id, weight, recorded_at, notes) VALUES (?, ?, ?, ?, ?)',
      [id, pet_id, weight, recorded_at, notes]
    );

    // 同步更新宠物表中的当前体重
    await execute('UPDATE pets SET weight = ? WHERE id = ?', [weight, pet_id]);

    const newRecord: any[] = await query('SELECT * FROM weight_records WHERE id = ?', [id]);
    return NextResponse.json(newRecord[0], { status: 201 });
  } catch (error) {
    console.error('Error creating weight record:', error);
    return NextResponse.json({ error: 'Failed to create weight record' }, { status: 500 });
  }
}

// PUT /api/weight-records - 更新体重记录
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, weight, recorded_at, notes, pet_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing record id' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (weight !== undefined) {
      updates.push('weight = ?');
      params.push(weight);
    }
    if (recorded_at !== undefined) {
      updates.push('recorded_at = ?');
      params.push(recorded_at);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(id);
    await execute(`UPDATE weight_records SET ${updates.join(', ')} WHERE id = ?`, params);

    // 如果更新了体重，同步更新宠物表的当前体重
    if (weight !== undefined && pet_id) {
      await execute('UPDATE pets SET weight = ? WHERE id = ?', [weight, pet_id]);
    }

    const updated: any[] = await query('SELECT * FROM weight_records WHERE id = ?', [id]);
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating weight record:', error);
    return NextResponse.json({ error: 'Failed to update weight record' }, { status: 500 });
  }
}

// DELETE /api/weight-records - 删除体重记录
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing record id' }, { status: 400 });
    }

    const result = await execute('DELETE FROM weight_records WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting weight record:', error);
    return NextResponse.json({ error: 'Failed to delete weight record' }, { status: 500 });
  }
}
