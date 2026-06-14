import { NextRequest, NextResponse } from 'next/server';
import { query, insert, execute } from '@/lib/db';

// GET /api/schedules - 获取所有日程
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const petId = searchParams.get('petId');
    const upcoming = searchParams.get('upcoming');

    let sql = 'SELECT * FROM care_schedules WHERE 1=1';
    const params: any[] = [];

    if (petId) {
      sql += ' AND pet_id = ?';
      params.push(petId);
    }

    if (upcoming === 'true') {
      sql += ' AND status = ? AND due_date >= CURDATE()';
      params.push('pending');
    }

    sql += ' ORDER BY due_date ASC';

    const schedules: any[] = await query(sql, params);
    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

// 前端 event_type 到数据库 ENUM 的映射
const EVENT_TYPE_MAP: Record<string, string> = {
  'vaccination': 'vaccination',
  'parasite_prevention': 'deworming',
  'wellness_exam': 'checkup',
  'dental_care': 'medication',
  'grooming': 'grooming',
  'feeding': 'other',
  'exercise': 'other',
  'other': 'other',
};

// POST /api/schedules - 创建新日程
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = `schedule_${Date.now()}`;
    const {
      pet_id,
      title,
      description = '',
      event_type = 'other',
      due_date,
      priority = 'medium',
      recurrence = null,
      reminder_enabled = true,
    } = body;

    // 映射 event_type 到数据库支持的类型
    const mappedEventType = EVENT_TYPE_MAP[event_type] || 'other';

    await insert(
      `INSERT INTO care_schedules (id, pet_id, title, description, event_type, due_date, priority, recurrence, reminder_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, pet_id, title, description, mappedEventType, due_date, priority, recurrence, reminder_enabled]
    );

    const newSchedule: any[] = await query('SELECT * FROM care_schedules WHERE id = ?', [id]);
    return NextResponse.json(newSchedule[0], { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}

// PUT /api/schedules - 更新日程
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    const fields: string[] = [];
    const values: any[] = [];

    // 映射前端字段到数据库字段
    const fieldMapping: Record<string, string> = {
      petId: 'pet_id',
      eventType: 'event_type',
      dueDate: 'due_date',
      completedDate: 'completed_date',
      reminderEnabled: 'reminder_enabled',
      notificationSent: 'notification_sent',
    };

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbField = fieldMapping[key] || key;
        fields.push(`${dbField} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await execute(
        `UPDATE care_schedules SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );
    }

    const updatedSchedule: any[] = await query('SELECT * FROM care_schedules WHERE id = ?', [id]);
    if (updatedSchedule.length === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json(updatedSchedule[0]);
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}

// DELETE /api/schedules - 删除日程
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing schedule id' }, { status: 400 });
    }

    const result = await execute('DELETE FROM care_schedules WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
