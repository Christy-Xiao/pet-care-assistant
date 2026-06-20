import { NextRequest, NextResponse } from 'next/server';
import { query, insert, execute } from '@/lib/db';
import { getConnection } from '@/lib/db';

// 确保表存在
async function ensureTableExists() {
  try {
    const connection = await getConnection();
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bathroom_records (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT,
        pet_id VARCHAR(255) NOT NULL,
        record_date DATE NOT NULL,
        type ENUM('solid', 'liquid', 'both') NOT NULL,
        size ENUM('small', 'medium', 'large') DEFAULT 'medium',
        color VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
      )
    `);
    connection.release();
  } catch (error) {
    console.error('Error creating bathroom_records table:', error);
  }
}

// GET /api/bathroom-records - 获取排泄记录
export async function GET(request: NextRequest) {
  try {
    await ensureTableExists();
    
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');
    const limit = searchParams.get('limit');

    let sql = 'SELECT * FROM bathroom_records WHERE 1=1';
    const params: any[] = [];

    if (petId) {
      sql += ' AND pet_id = ?';
      params.push(petId);
    }

    sql += ' ORDER BY record_date DESC';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const records: any[] = await query(sql, params);

    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching bathroom records:', error);
    return NextResponse.json({ error: 'Failed to fetch bathroom records' }, { status: 500 });
  }
}

// POST /api/bathroom-records - 创建排泄记录
export async function POST(request: NextRequest) {
  try {
    await ensureTableExists();
    
    const body = await request.json();
    const id = `bath_${Date.now()}`;
    const {
      pet_id,
      record_date,
      type,
      size = 'medium',
      color = '',
      notes = '',
    } = body;

    if (!pet_id || !record_date || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['solid', 'liquid', 'both'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    if (!['small', 'medium', 'large'].includes(size)) {
      return NextResponse.json({ error: 'Invalid size' }, { status: 400 });
    }

    await insert(
      'INSERT INTO bathroom_records (id, pet_id, record_date, type, size, color, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, pet_id, record_date, type, size, color, notes]
    );

    const newRecord: any[] = await query('SELECT * FROM bathroom_records WHERE id = ?', [id]);
    return NextResponse.json(newRecord[0]!, { status: 201 });
  } catch (error) {
    console.error('Error creating bathroom record:', error);
    return NextResponse.json({ error: 'Failed to create bathroom record' }, { status: 500 });
  }
}

// PUT /api/bathroom-records - 更新排泄记录
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, type, size, color, notes, record_date } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing record id' }, { status: 400 });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (type !== undefined) {
      if (!['solid', 'liquid', 'both'].includes(type)) {
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
      }
      updates.push('type = ?');
      params.push(type);
    }
    if (size !== undefined) {
      if (!['small', 'medium', 'large'].includes(size)) {
        return NextResponse.json({ error: 'Invalid size' }, { status: 400 });
      }
      updates.push('size = ?');
      params.push(size);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    if (record_date !== undefined) {
      updates.push('record_date = ?');
      params.push(record_date);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(id);
    await execute(`UPDATE bathroom_records SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated: any[] = await query('SELECT * FROM bathroom_records WHERE id = ?', [id]);
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating bathroom record:', error);
    return NextResponse.json({ error: 'Failed to update bathroom record' }, { status: 500 });
  }
}

// DELETE /api/bathroom-records - 删除排泄记录
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing record id' }, { status: 400 });
    }

    const result = await execute('DELETE FROM bathroom_records WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bathroom record:', error);
    return NextResponse.json({ error: 'Failed to delete bathroom record' }, { status: 500 });
  }
}
