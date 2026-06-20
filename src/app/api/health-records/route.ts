import { NextRequest, NextResponse } from 'next/server';
import { query, insert, execute } from '@/lib/db';
import { getConnection } from '@/lib/db';

// 确保表存在
async function ensureTableExists() {
  try {
    const connection = await getConnection();
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS health_records (
        id VARCHAR(255) PRIMARY KEY,
        user_id INT,
        pet_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        description TEXT,
        image_url TEXT,
        result JSON,
        medications JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
      )
    `);
    connection.release();
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
    
    // 解析JSON字段
    const parsedRecords = records.map((record: any) => {
      // 解析 result 字段
      let parsedResult = record.result;
      if (typeof record.result === 'string') {
        try {
          parsedResult = JSON.parse(record.result);
        } catch { /* ignore */ }
      }
      
      // 解析 medications 字段，兼容旧数据（逗号分隔）和新数据（JSON格式）
      let parsedMedications: string[] = [];
      if (record.medications) {
        if (typeof record.medications === 'string') {
          try {
            parsedMedications = JSON.parse(record.medications);
          } catch {
            parsedMedications = record.medications.split(',').map((m: string) => m.trim()).filter(Boolean);
          }
        } else if (Array.isArray(record.medications)) {
          parsedMedications = record.medications;
        }
      }
      
      return {
        ...record,
        result: parsedResult,
        medications: parsedMedications,
      };
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
    console.log('=== 创建病历记录 ===');
    console.log('请求体:', body);
    
    const id = `record_${Date.now()}`;
    const {
      pet_id,
      type = 'other',
      title,
      description = '',
      image_url = '',
      medications = [],
    } = body;

    console.log('解析后的数据:', { id, pet_id, type, title, description, image_url, medications });

    // 将medications数组转为JSON字符串
    const medicationsJson = medications.length > 0 ? JSON.stringify(medications) : null;

    const insertSql = `INSERT INTO health_records (id, pet_id, type, title, description, image_url, medications) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    console.log('SQL:', insertSql);
    console.log('参数:', [id, pet_id, type, title, description, image_url, medicationsJson]);

    await insert(insertSql, [id, pet_id, type, title, description, image_url, medicationsJson]);

    const newRecord: any[] = await query('SELECT * FROM health_records WHERE id = ?', [id]);
    const record = newRecord[0]!;
    
    // 解析 medications 字段，兼容旧数据（逗号分隔）和新数据（JSON格式）
    let parsedMedications: string[] = [];
    if (record?.medications) {
      if (typeof record.medications === 'string') {
        // 尝试解析 JSON 格式
        try {
          parsedMedications = JSON.parse(record.medications);
        } catch {
          // 如果解析失败，可能是逗号分隔的旧格式
          parsedMedications = record.medications.split(',').map((m: string) => m.trim()).filter(Boolean);
        }
      } else if (Array.isArray(record.medications)) {
        parsedMedications = record.medications;
      }
    }
    
    const parsedRecord = {
      ...record,
      medications: parsedMedications,
    };

    console.log('创建成功:', parsedRecord);
    return NextResponse.json(parsedRecord, { status: 201 });
  } catch (error) {
    console.error('=== 创建病历记录失败 ===');
    console.error('错误类型:', error?.constructor?.name);
    console.error('错误信息:', error);
    console.error('SQL错误代码:', (error as any)?.code);
    console.error('SQL错误号:', (error as any)?.errno);
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
