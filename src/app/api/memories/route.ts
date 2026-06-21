import { NextRequest, NextResponse } from 'next/server';
import { query, execute } from '@/lib/db';
import { getUserLongTermMemories, getPetMemoriesByType, saveUserLongTermMemory } from '@/lib/chatMemory';

// GET /api/memories - 获取用户的长期记忆
// 支持查询参数：type(按类型筛选), petId(按宠物筛选), userId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const petId = searchParams.get('petId');
    
    // 默认 user_id = 1（单用户系统）
    // 实际项目应该从 session/auth 中获取真实 userId
    const userId = 1;

    if (type) {
      // 按类型查询（用于天气联动恐惧记忆等）
      const memories = await getPetMemoriesByType(userId, type, petId || undefined);
      return NextResponse.json({ success: true, memories, count: memories.length });
    }
    
    // 获取所有长期记忆（用于前端记忆档案展示）
    const allMemories = await getUserLongTermMemories(userId);
    
    // 按类型分组返回，方便前端渲染
    const grouped: Record<string, any[]> = {};
    for (const mem of allMemories) {
      if (!grouped[mem.memory_type]) {
        grouped[mem.memory_type] = [];
      }
      grouped[mem.memory_type].push(mem);
    }

    return NextResponse.json({
      success: true,
      memories: allMemories,
      grouped,
      count: allMemories.length,
      summary: {
        allergy: grouped.allergy?.length || 0,
        fear: grouped.fear?.length || 0,
        behavior: grouped.behavior?.length || 0,
        baseline: grouped.baseline?.length || 0,
        health: grouped.health?.length || 0,
        preference: grouped.preference?.length || 0,
      }
    });
  } catch (error: any) {
    console.error('获取记忆失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/memories - 删除某条记忆
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少 id 参数' }, { status: 400 });
    }

    await execute('DELETE FROM user_long_term_memory WHERE id = ?', [id]);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('删除记忆失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
