import { NextRequest, NextResponse } from 'next/server';
import { query, insert, execute } from '@/lib/db';

// GET /api/medication-reminders - 获取用药提醒
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');
    const active = searchParams.get('active');

    let sql = 'SELECT * FROM medication_reminders WHERE 1=1';
    const params: any[] = [];

    if (petId) {
      sql += ' AND pet_id = ?';
      params.push(petId);
    }

    if (active === 'true') {
      sql += ' AND status = \'active\'';
    }

    sql += ' ORDER BY next_dose_time ASC';

    const reminders: any[] = await query(sql, params);
    
    // 解析JSON字段
    const parsedReminders = reminders.map((reminder: any) => ({
      ...reminder,
      medications: typeof reminder.medications === 'string' ? JSON.parse(reminder.medications) : reminder.medications,
      treatment_plan: reminder.treatment_plan && typeof reminder.treatment_plan === 'string' 
        ? JSON.parse(reminder.treatment_plan) 
        : reminder.treatment_plan,
    }));

    return NextResponse.json(parsedReminders);
  } catch (error) {
    console.error('Error fetching medication reminders:', error);
    return NextResponse.json({ error: '获取用药提醒失败' }, { status: 500 });
  }
}

// POST /api/medication-reminders - 创建用药提醒
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = `reminder_${Date.now()}`;
    const {
      pet_id,
      record_id = null,
      disease_name,
      medications = [],
      treatment_plan = null,
      frequency = 3,
      interval_hours = 8,
      next_dose_time,
      total_doses = 21,
      remaining_doses = 21,
      status = 'active',
    } = body;

    // 将数组转为JSON字符串
    const medicationsJson = JSON.stringify(medications);
    const treatmentPlanJson = treatment_plan ? JSON.stringify(treatment_plan) : null;

    await insert(
      `INSERT INTO medication_reminders (id, pet_id, record_id, disease_name, medications, treatment_plan, frequency, interval_hours, next_dose_time, total_doses, remaining_doses, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, pet_id, record_id, disease_name, medicationsJson, treatmentPlanJson, frequency, interval_hours, next_dose_time, total_doses, remaining_doses, status]
    );

    const newReminder: any[] = await query('SELECT * FROM medication_reminders WHERE id = ?', [id]);
    const reminder = newReminder[0];
    const parsedReminder = {
      ...reminder,
      medications: typeof reminder.medications === 'string' ? JSON.parse(reminder.medications) : reminder.medications,
      treatment_plan: reminder.treatment_plan && typeof reminder.treatment_plan === 'string' 
        ? JSON.parse(reminder.treatment_plan) 
        : reminder.treatment_plan,
    };

    return NextResponse.json(parsedReminder, { status: 201 });
  } catch (error) {
    console.error('Error creating medication reminder:', error);
    return NextResponse.json({ error: '创建用药提醒失败' }, { status: 500 });
  }
}

// PUT /api/medication-reminders - 更新用药提醒（如确认用药）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, action, pet_id } = body;

    // 获取当前提醒
    const reminders: any[] = await query('SELECT * FROM medication_reminders WHERE id = ?', [id]);
    if (reminders.length === 0) {
      return NextResponse.json({ error: '提醒不存在' }, { status: 404 });
    }
    
    const reminder = reminders[0];
    let newRemainingDoses = reminder.remaining_doses;
    let newNextDoseTime = reminder.next_dose_time;
    let newStatus = reminder.status;

    if (action === 'take_dose') {
      // 确认用药
      newRemainingDoses = Math.max(0, reminder.remaining_doses - 1);
      
      // 计算下次用药时间
      const nextTime = new Date();
      nextTime.setTime(nextTime.getTime() + reminder.interval_hours * 60 * 60 * 1000);
      newNextDoseTime = nextTime.toISOString().slice(0, 19).replace('T', ' ');
      
      // 如果疗程完成，更新状态
      if (newRemainingDoses === 0) {
        newStatus = 'completed';
      }
    } else if (action === 'skip') {
      // 跳过本次用药
      const nextTime = new Date();
      nextTime.setTime(nextTime.getTime() + reminder.interval_hours * 60 * 60 * 1000);
      newNextDoseTime = nextTime.toISOString().slice(0, 19).replace('T', ' ');
    }

    await execute(
      `UPDATE medication_reminders 
       SET remaining_doses = ?, next_dose_time = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newRemainingDoses, newNextDoseTime, newStatus, id]
    );

    // 获取更新后的提醒
    const updatedReminders: any[] = await query('SELECT * FROM medication_reminders WHERE id = ?', [id]);
    const updatedReminder = updatedReminders[0];
    const parsedReminder = {
      ...updatedReminder,
      medications: typeof updatedReminder.medications === 'string' ? JSON.parse(updatedReminder.medications) : updatedReminder.medications,
    };

    return NextResponse.json(parsedReminder);
  } catch (error) {
    console.error('Error updating medication reminder:', error);
    return NextResponse.json({ error: '更新用药提醒失败' }, { status: 500 });
  }
}

// DELETE /api/medication-reminders - 删除用药提醒
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少提醒ID' }, { status: 400 });
    }

    await execute('DELETE FROM medication_reminders WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting medication reminder:', error);
    return NextResponse.json({ error: '删除用药提醒失败' }, { status: 500 });
  }
}
