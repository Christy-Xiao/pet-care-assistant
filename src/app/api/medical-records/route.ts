import { NextRequest, NextResponse } from 'next/server';
import { query, insert } from '@/lib/db';

// GET /api/medical-records - 获取病例记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');

    let sql = 'SELECT * FROM medical_records WHERE 1=1';
    const params: any[] = [];

    if (petId) {
      sql += ' AND pet_id = ?';
      params.push(petId);
    }

    sql += ' ORDER BY detected_date DESC';

    const records: any[] = await query(sql, params);
    
    // 解析JSON字段
    const parsedRecords = records.map((record: any) => ({
      ...record,
      medications: typeof record.medications === 'string' ? JSON.parse(record.medications) : record.medications,
    }));

    return NextResponse.json(parsedRecords);
  } catch (error) {
    console.error('Error fetching medical records:', error);
    return NextResponse.json({ error: '获取病例记录失败' }, { status: 500 });
  }
}

// POST /api/medical-records - 创建病例记录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = `med_${Date.now()}`;
    const {
      pet_id,
      disease_name,
      disease_type,
      severity = 'mild',
      description = '',
      medications = [],
      treatment_plan = null,
      detected_date,
      status = 'active',
    } = body;

    // 将数组转为JSON字符串
    const medicationsJson = JSON.stringify(medications);
    const treatmentPlanJson = treatment_plan ? JSON.stringify(treatment_plan) : null;

    await insert(
      `INSERT INTO medical_records (id, pet_id, disease_name, disease_type, severity, description, medications, treatment_plan, detected_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, pet_id, disease_name, disease_type, severity, description, medicationsJson, treatmentPlanJson, detected_date, status]
    );

    const newRecord: any[] = await query('SELECT * FROM medical_records WHERE id = ?', [id]);
    const record = newRecord[0]!;
    const parsedRecord = {
      ...record,
      medications: typeof record.medications === 'string' ? JSON.parse(record.medications) : record.medications,
      treatment_plan: record.treatment_plan && typeof record.treatment_plan === 'string' 
        ? JSON.parse(record.treatment_plan) 
        : record.treatment_plan,
    };

    return NextResponse.json(parsedRecord, { status: 201 });
  } catch (error) {
    console.error('Error creating medical record:', error);
    return NextResponse.json({ error: '创建病例记录失败' }, { status: 500 });
  }
}

// PUT /api/medical-records - 更新病例记录（如更新状态）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, remaining_doses } = body;

    let sql = 'UPDATE medical_records SET updated_at = CURRENT_TIMESTAMP';
    const params: any[] = [];

    if (status) {
      sql += ', status = ?';
      params.push(status);
    }

    if (remaining_doses !== undefined) {
      sql += ', remaining_doses = ?';
      params.push(remaining_doses);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    await query(sql, params);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating medical record:', error);
    return NextResponse.json({ error: '更新病例记录失败' }, { status: 500 });
  }
}
