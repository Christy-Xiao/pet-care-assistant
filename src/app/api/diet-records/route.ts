import { NextRequest, NextResponse } from 'next/server';
import { query, insert, execute } from '@/lib/db';

// 确保表存在（PostgreSQL 语法）
async function ensureTableExists() {
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS diet_records (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT,
        pet_id VARCHAR(255) NOT NULL,
        record_date DATE NOT NULL,
        meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
        food_name VARCHAR(255) NOT NULL,
        food_type VARCHAR(20) DEFAULT 'dry' CHECK (food_type IN ('dry', 'wet', 'treat', 'homemade', 'other')),
        amount VARCHAR(50),
        calories INT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.error('Error creating diet_records table:', error);
  }
}

// GET /api/diet-records
export async function GET(request: NextRequest) {
  try {
    await ensureTableExists();
    
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');

    let sql = 'SELECT * FROM diet_records WHERE 1=1';
    const params: any[] = [];

    if (petId) {
      sql += ' AND pet_id = ?';
      params.push(petId);
    }

    if (startDate) {
      sql += ' AND record_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND record_date <= ?';
      params.push(endDate);
    }

    // PostgreSQL 不支持 FIELD()，用 CASE WHEN 替代
    sql += ' ORDER BY record_date DESC, CASE meal_type WHEN \'breakfast\' THEN 1 WHEN \'lunch\' THEN 2 WHEN \'dinner\' THEN 3 WHEN \'snack\' THEN 4 ELSE 5 END';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(limit));
    }

    const records: any[] = await query(sql, params);
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching diet records:', error);
    return NextResponse.json({ error: 'Failed to fetch diet records' }, { status: 500 });
  }
}

// POST /api/diet-records
export async function POST(request: NextRequest) {
  try {
    await ensureTableExists();
    
    const body = await request.json();
    const id = `diet_${Date.now()}`;
    const {
      pet_id,
      record_date,
      meal_type,
      food_name,
      food_type = 'dry',
      amount = '',
      calories,
      notes = '',
    } = body;

    if (!pet_id || !record_date || !meal_type || !food_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(meal_type)) {
      return NextResponse.json({ error: 'Invalid meal type' }, { status: 400 });
    }

    await insert(
      'INSERT INTO diet_records (id, pet_id, record_date, meal_type, food_name, food_type, amount, calories, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, pet_id, record_date, meal_type, food_name, food_type, amount, calories || null, notes]
    );

    const newRecord: any[] = await query('SELECT * FROM diet_records WHERE id = ?', [id]);
    return NextResponse.json(newRecord[0]!, { status: 201 });
  } catch (error) {
    console.error('Error creating diet record:', error);
    return NextResponse.json({ error: 'Failed to create diet record' }, { status: 500 });
  }
}

// PUT /api/diet-records
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, meal_type, food_name, food_type, amount, calories, notes, record_date } = body;

    if (!id) return NextResponse.json({ error: 'Missing record id' }, { status: 400 });

    const updates: string[] = [];
    const params: any[] = [];

    if (meal_type !== undefined) {
      if (!['breakfast', 'lunch', 'dinner', 'snack'].includes(meal_type))
        return NextResponse.json({ error: 'Invalid meal type' }, { status: 400 });
      updates.push('meal_type = ?'); params.push(meal_type);
    }
    if (food_name !== undefined) { updates.push('food_name = ?'); params.push(food_name); }
    if (food_type !== undefined) { updates.push('food_type = ?'); params.push(food_type); }
    if (amount !== undefined) { updates.push('amount = ?'); params.push(amount); }
    if (calories !== undefined) { updates.push('calories = ?'); params.push(calories); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (record_date !== undefined) { updates.push('record_date = ?'); params.push(record_date); }

    if (updates.length === 0) return NextResponse.json({ error: 'No fields to update' }, { status: 400 });

    params.push(id);
    await execute(`UPDATE diet_records SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated: any[] = await query('SELECT * FROM diet_records WHERE id = ?', [id]);
    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating diet record:', error);
    return NextResponse.json({ error: 'Failed to update diet record' }, { status: 500 });
  }
}

// DELETE /api/diet-records
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing record id' }, { status: 400 });

    const result = await execute('DELETE FROM diet_records WHERE id = ?', [id]);
    if (result.affectedRows === 0) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting diet record:', error);
    return NextResponse.json({ error: 'Failed to delete diet record' }, { status: 500 });
  }
}
