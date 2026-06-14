import { NextRequest, NextResponse } from 'next/server';
import { query, insert, execute } from '@/lib/db';

// GET /api/pets - 获取所有宠物
export async function GET() {
  try {
    const pets: any[] = await query('SELECT * FROM pets ORDER BY created_at DESC');
    return NextResponse.json(pets);
  } catch (error) {
    console.error('Error fetching pets:', error);
    return NextResponse.json({ error: 'Failed to fetch pets' }, { status: 500 });
  }
}

// POST /api/pets - 创建新宠物
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📦 POST /api/pets - 接收到的数据:', JSON.stringify(body));
    
    const id = `pet_${Date.now()}`;
    
    // dateOfBirth 直接使用字符串格式（YYYY-MM-DD）
    const dateOfBirth = body.dateOfBirth || body.date_of_birth;
    const medicalHistory = body.medicalHistory || body.medical_history;
    // userId 转为数字（数据库是 int 类型），如果无法转换则用 null
    let userId = null;
    if (body.userId) {
      const parsed = parseInt(body.userId);
      userId = isNaN(parsed) ? null : parsed;
    }
    
    // 确保 name 有值
    const name = body.name || '未命名宠物';
    
    console.log('📦 准备插入 - userId:', userId, 'name:', name);
    
    await insert(
      `INSERT INTO pets (id, user_id, name, species, breed, gender, date_of_birth, age, weight, avatar, allergies, medical_history, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        userId,
        name, 
        body.species || 'dog', 
        body.breed || '', 
        body.gender || 'unknown', 
        dateOfBirth || null, 
        body.age || null, 
        body.weight || null, 
        body.avatar || '', 
        Array.isArray(body.allergies) ? body.allergies.filter(Boolean).join(',') : (body.allergies || ''),
        Array.isArray(medicalHistory) ? JSON.stringify(medicalHistory) : (medicalHistory || ''),
        body.notes || ''
      ]
    );
    
    console.log('✅ 插入成功，id:', id);

    const newPet: any[] = await query<any[]>('SELECT * FROM pets WHERE id = ?', [id]);
    return NextResponse.json(newPet[0], { status: 201 });
  } catch (error: any) {
    console.error('❌ Error creating pet:', error.message, error.code);
    return NextResponse.json({ error: `创建宠物失败: ${error.message}` }, { status: 500 });
  }
}

// PUT /api/pets - 更新宠物
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    console.log('PUT /api/pets - received:', { id, updates });

    if (!id) {
      return NextResponse.json({ error: 'Missing pet id' }, { status: 400 });
    }

    // 前端字段名到数据库字段名的映射
    const fieldMapping: Record<string, string> = {
      'dateOfBirth': 'date_of_birth',
      'medicalHistory': 'medical_history',
      'createdAt': 'created_at',
      'updatedAt': 'updated_at',
    };

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'id') {
        const dbField = fieldMapping[key] || key;
        fields.push(`${dbField} = ?`);
        
        // 转换值
        if (Array.isArray(value)) {
          // medicalHistory 需要 JSON 序列化
          if (key === 'medicalHistory') {
            values.push(JSON.stringify(value));
          } else {
            // allergies 等数组 join 成字符串，过滤空值
            values.push(value.filter(Boolean).join(','));
          }
        } else if (key === 'dateOfBirth' && value) {
          // dateOfBirth 直接使用字符串格式，避免时区问题
          // 前端传来的是 YYYY-MM-DD 格式
          values.push(value);
        } else {
          values.push(value);
        }
      }
    });

    console.log('PUT /api/pets - SQL fields:', fields);
    console.log('PUT /api/pets - values:', values);

    if (fields.length === 0) {
      console.log('PUT /api/pets - No fields to update');
      const updatedPet: any[] = await query('SELECT * FROM pets WHERE id = ?', [id]);
      return NextResponse.json(updatedPet[0]);
    }

    values.push(id);
    const result = await execute(
      `UPDATE pets SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    console.log('PUT /api/pets - execute result:', result);

    const updatedPet: any[] = await query('SELECT * FROM pets WHERE id = ?', [id]);
    if (updatedPet.length === 0) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    console.log('PUT /api/pets - returning:', updatedPet[0]);
    return NextResponse.json(updatedPet[0]);
  } catch (error) {
    console.error('Error updating pet:', error);
    return NextResponse.json({ error: `Failed to update pet: ${error}` }, { status: 500 });
  }
}

// DELETE /api/pets - 删除宠物
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing pet id' }, { status: 400 });
    }

    const result = await execute('DELETE FROM pets WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pet:', error);
    return NextResponse.json({ error: 'Failed to delete pet' }, { status: 500 });
  }
}
