import { NextRequest, NextResponse } from 'next/server';
import { query, insert, execute } from '@/lib/db';

// 确保表存在（PostgreSQL 语法）
async function ensureTableExists() {
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS health_records (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT,
        pet_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        description TEXT,
        image_url TEXT,
        result JSONB,
        medications JSONB,
        detected_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.error('Error creating health_records table:', error);
  }
}

// GET /api/health-records - 获取健康记录
export async function GET(request: NextRequest) {
  try {
    await ensureTableExists();
    
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');
    const type = searchParams.get('type');

    let sql = 'SELECT * FROM health_records WHERE 1=1';
    const params: any[] = [];

    if (petId) {
      sql += ' AND pet_id = ?';
      params.push(petId);
    }

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC';

    const records: any[] = await query(sql, params);
    
    const parsedRecords = records.map((record: any) => {
      let parsedResult = record.result;
      if (typeof record.result === 'string') {
        try { parsedResult = JSON.parse(record.result); } catch { /* ignore */ }
      }
      
      let parsedMedications: string[] = [];
      if (record.medications) {
        if (typeof record.medications === 'string') {
          try { parsedMedications = JSON.parse(record.medications); } catch {
            parsedMedications = record.medications.split(',').map((m: string) => m.trim()).filter(Boolean);
          }
        } else if (Array.isArray(record.medications)) {
          parsedMedications = record.medications;
        }
      }
      
      return { ...record, result: parsedResult, medications: parsedMedications };
    });

    return NextResponse.json(parsedRecords);
  } catch (error) {
    console.error('Error fetching health records:', error);
    return NextResponse.json({ error: 'Failed to fetch health records' }, { status: 500 });
  }
}

// POST /api/health-records - 创建健康记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = `record_${Date.now()}`;
    const {
      pet_id,
      type = 'other',
      title,
      description = '',
      image_url = '',
      medications = [],
    } = body;

    const medicationsJson = medications.length > 0 ? JSON.stringify(medications) : null;

    await insert(
      'INSERT INTO health_records (id, pet_id, type, title, description, image_url, medications) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, pet_id, type, title, description, image_url, medicationsJson]
    );

    const newRecord: any[] = await query('SELECT * FROM health_records WHERE id = ?', [id]);
    const record = newRecord[0]!;
    
    let parsedMedications: string[] = [];
    if (record?.medications) {
      if (typeof record.medications === 'string') {
        try { parsedMedications = JSON.parse(record.medications); } catch {
          parsedMedications = record.medications.split(',').map((m: string) => m.trim()).filter(Boolean);
        }
      } else if (Array.isArray(record.medications)) {
        parsedMedications = record.medications;
      }
    }
    
    return NextResponse.json({ ...record, medications: parsedMedications }, { status: 201 });
  } catch (error) {
    console.error('创建病历记录失败:', error);
    return NextResponse.json({ 
      error: 'Failed to create health record',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// DELETE /api/health-records - 删除健康记录
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing record id' }, { status: 400 });
    }

    const result = await execute('DELETE FROM health_records WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting health record:', error);
    return NextResponse.json({ error: 'Failed to delete health record' }, { status: 500 });
  }
}
