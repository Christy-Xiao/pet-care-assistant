import { query, insert, execute } from './db';
import { ZhipuAI } from 'zhipuai';

const aiClient = new ZhipuAI({ apiKey: process.env.ZHIPUAI_API_KEY || '' });

export interface ChatMemory {
  id: number;
  user_id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

// 用户长期记忆表 - 存储用户的关键信息（宠物过敏、偏好、恐惧、行为基线等）
export interface UserLongTermMemory {
  id: number;
  user_id: number;
  pet_id: string | null;
  pet_name: string | null;
  memory_type: 'allergy' | 'preference' | 'health' | 'behavior' | 'fear' | 'baseline' | 'other';
  memory_content: string;
  created_at: Date;
  updated_at: Date;
}

// AI 提取出的记忆结构
export interface ExtractedMemory {
  type: 'allergy' | 'preference' | 'health' | 'behavior' | 'fear' | 'baseline' | 'other';
  content: string;
  petName?: string;
  confidence: number; // 0-1 置信度
}

// 初始化聊天记忆表
export async function initChatMemoryTable() {
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS chat_memory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        session_id VARCHAR(100) NOT NULL,
        role ENUM('user', 'assistant') NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_session_id (session_id),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ chat_memory 表创建成功');
  } catch (error) {
    console.error('❌ chat_memory 表创建失败:', error);
  }
}

// 初始化用户长期记忆表
export async function initUserLongTermMemoryTable() {
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS user_long_term_memory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        pet_id VARCHAR(100),
        pet_name VARCHAR(100),
        memory_type ENUM('allergy', 'preference', 'health', 'behavior', 'fear', 'baseline', 'other') NOT NULL,
        memory_content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_pet_id (pet_id),
        INDEX idx_memory_type (memory_type)
      )
    `);
    console.log('✅ user_long_term_memory 表创建成功');
  } catch (error) {
    console.error('❌ user_long_term_memory 表创建失败:', error);
  }
}

// 存储消息到记忆
export async function saveChatMemory(userId: number, sessionId: string, role: 'user' | 'assistant', content: string) {
  try {
    await insert(
      'INSERT INTO chat_memory (user_id, session_id, role, content) VALUES (?, ?, ?, ?)',
      [userId, sessionId, role, content]
    );
  } catch (error) {
    console.error('保存聊天记忆失败:', error);
  }
}

// 获取用户的聊天记忆（最近的N条）
export async function getChatMemory(userId: number, limit: number = 20): Promise<ChatMemory[]> {
  try {
    const memories: any[] = await query(
      'SELECT * FROM chat_memory WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    return memories.reverse(); // 按时间正序返回
  } catch (error) {
    console.error('获取聊天记忆失败:', error);
    return [];
  }
}

// 保存用户长期记忆（关键信息）
export async function saveUserLongTermMemory(
  userId: number,
  memoryType: 'allergy' | 'preference' | 'health' | 'behavior' | 'fear' | 'baseline' | 'other',
  memoryContent: string,
  petId?: string,
  petName?: string
): Promise<boolean> {
  try {
    // 检查是否已存在相同的记忆
    const existing: any[] = await query(
      `SELECT id, memory_content FROM user_long_term_memory 
       WHERE user_id = ? AND memory_type = ? AND memory_content = ?`,
      [userId, memoryType, memoryContent]
    );
    
    if (existing.length > 0) {
      // 已存在，更新时间和关联宠物
      await execute(
        `UPDATE user_long_term_memory SET pet_id = ?, pet_name = ?, updated_at = NOW() WHERE id = ?`,
        [petId || null, petName || null, existing[0]!.id]
      );
    } else {
      // 新增记忆
      await insert(
        `INSERT INTO user_long_term_memory (user_id, pet_id, pet_name, memory_type, memory_content) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, petId || null, petName || null, memoryType, memoryContent]
      );
    }
    return true;
  } catch (error) {
    console.error('保存用户长期记忆失败:', error);
    return false;
  }
}

// 获取用户的所有长期记忆
export async function getUserLongTermMemories(userId: number): Promise<UserLongTermMemory[]> {
  try {
    const memories: any[] = await query(
      `SELECT * FROM user_long_term_memory WHERE user_id = ? ORDER BY updated_at DESC`,
      [userId]
    );
    return memories;
  } catch (error) {
    console.error('获取用户长期记忆失败:', error);
    return [];
  }
}

// 提取并保存关键记忆（用于长期记忆）- 增强版
export async function extractKeyMemories(userId: number, pets: any[] = []): Promise<string[]> {
  try {
    // 获取最近30天的用户消息
    const memories: any[] = await query(
      `SELECT content FROM chat_memory 
       WHERE user_id = ? AND role = 'user' AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY created_at ASC`,
      [userId]
    );
    
    if (memories.length === 0) return [];
    
    // 关键信息模式 - 增强过敏信息提取
    const patterns = [
      // 过敏信息 - 多种表达方式
      { pattern: /对(.+?)过敏/i, label: 'allergy', petRelated: true },
      { pattern: /过敏[是源对](.+?)[，,。]/i, label: 'allergy', petRelated: true },
      { pattern: /(.+?)过敏[了源]/i, label: 'allergy', petRelated: true },
      { pattern: /医生说.*对(.+?)过敏/i, label: 'allergy', petRelated: true },
      { pattern: /医生说.*是(.+?)过敏/i, label: 'allergy', petRelated: true },
      { pattern: /检查出(.+?)过敏/i, label: 'allergy', petRelated: true },
      { pattern: /发现(.+?)过敏/i, label: 'allergy', petRelated: true },
      { pattern: /确诊(.+?)过敏/i, label: 'allergy', petRelated: true },
      // 食物过敏相关
      { pattern: /(虾仁|鸡肉|牛肉|鱼|羊肉|玉米|小麦|大豆|海鲜)过敏/i, label: 'allergy', petRelated: true },
      // 活动相关
      { pattern: /今天带(.+?)[去做了]/i, label: 'behavior', petRelated: true },
      { pattern: /(.+?)今天.*?(遛|玩|散步|运动)/i, label: 'behavior', petRelated: true },
      { pattern: /(遛|带|玩).*?了(.+?)[小时分钟]/i, label: 'behavior', petRelated: true },
      // 偏好
      { pattern: /喜欢(.+?)[，,。\n]/i, label: 'preference', petRelated: false },
      { pattern: /不喜欢(.+?)[，,。\n]/i, label: 'preference', petRelated: false },
      // 健康状态
      { pattern: /(.+?)[精神萎靡|精神不好|不精神]/i, label: 'health', petRelated: true },
      { pattern: /(.+?)[拉稀|拉肚子|呕吐]/i, label: 'health', petRelated: true },
      { pattern: /(.+?)吃了.*?[吐拉]/i, label: 'health', petRelated: true },
    ];
    
    const memoriesList: string[] = [];
    
    memories.forEach(m => {
      patterns.forEach(({ pattern, label, petRelated }) => {
        const match = m.content.match(pattern);
        if (match) {
          let memory = `[${label}] ${match[0]}`;
          
          // 尝试匹配宠物名
          let matchedPetName: string | null = null;
          if (petRelated) {
            for (const pet of pets) {
              if (m.content.includes(pet.name) || match[0].includes(pet.name)) {
                matchedPetName = pet.name;
                break;
              }
            }
          }
          
          if (!memoriesList.includes(memory)) {
            memoriesList.push(memory);
            
            // 同时保存到长期记忆表
            if (['allergy', 'preference', 'health', 'behavior'].includes(label)) {
              const petId = matchedPetName ? pets.find(p => p.name === matchedPetName)?.id : null;
              saveUserLongTermMemory(userId, label as any, match[0], petId || undefined, matchedPetName || undefined);
            }
          }
        }
      });
    });
    
    return memoriesList.slice(0, 20);
  } catch (error) {
    console.error('提取关键记忆失败:', error);
    return [];
  }
}

// 获取用户的重要信息摘要（用于跨会话记忆）- 增强版
export async function getUserMemorySummary(userId: number): Promise<string | null> {
  try {
    // 先获取用户长期记忆表中的关键信息
    const longTermMemories: any[] = await query(
      `SELECT pet_name, memory_type, memory_content, updated_at FROM user_long_term_memory 
       WHERE user_id = ? ORDER BY updated_at DESC LIMIT 10`,
      [userId]
    );
    
    let summary = '';
    
    // 优先使用长期记忆
    if (longTermMemories.length > 0) {
      summary += '【用户关键信息记录】\n';
      
      // 按类型分组
      const allergyMemories = longTermMemories.filter(m => m.memory_type === 'allergy');
      const fearMemories = longTermMemories.filter(m => m.memory_type === 'fear');
      const preferenceMemories = longTermMemories.filter(m => m.memory_type === 'preference');
      const healthMemories = longTermMemories.filter(m => m.memory_type === 'health');
      const behaviorMemories = longTermMemories.filter(m => m.memory_type === 'behavior');
      const baselineMemories = longTermMemories.filter(m => m.memory_type === 'baseline');
      
      if (allergyMemories.length > 0) {
        summary += '🔴 过敏/不耐受信息：\n';
        allergyMemories.forEach(m => {
          const petPrefix = m.pet_name ? `${m.pet_name}` : '';
          summary += `  - ${petPrefix}${m.memory_content}\n`;
        });
      }
      
      if (fearMemories.length > 0) {
        summary += '⚡ 恐惧/害怕：\n';
        fearMemories.forEach(m => {
          const petPrefix = m.pet_name ? `${m.pet_name}` : '';
          summary += `  - ${petPrefix}${m.memory_content}\n`;
        });
      }
      
      if (baselineMemories.length > 0) {
        summary += '📊 行为基准线：\n';
        baselineMemories.slice(0, 2).forEach(m => {
          summary += `  - ${m.memory_content}\n`;
        });
      }
      
      if (preferenceMemories.length > 0) {
        summary += '💡 偏好信息：\n';
        preferenceMemories.slice(0, 3).forEach(m => {
          summary += `  - ${m.memory_content}\n`;
        });
      }
      
      if (healthMemories.length > 0) {
        summary += '🏥 健康状况：\n';
        healthMemories.slice(0, 2).forEach(m => {
          summary += `  - ${m.memory_content}\n`;
        });
      }
      
      if (behaviorMemories.length > 0) {
        summary += '🎾 行为习惯：\n';
        behaviorMemories.slice(0, 2).forEach(m => {
          summary += `  - ${m.memory_content}\n`;
        });
      }
    }
    
    // 如果长期记忆不够，补充最近的对话
    if (longTermMemories.length < 3) {
      const recentMessages: any[] = await query(
        `SELECT content FROM chat_memory 
         WHERE user_id = ? AND role = 'user' AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
         ORDER BY created_at DESC LIMIT 5`,
        [userId]
      );
      
      if (recentMessages.length > 0) {
        summary += '\n【最近对话提到的信息】\n';
        recentMessages.forEach(m => {
          if (m.content.length > 10 && m.content.length < 200) {
            summary += `  - ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}\n`;
          }
        });
      }
    }
    
    return summary.length > 0 ? summary : null;
  } catch (error) {
    console.error('获取用户记忆摘要失败:', error);
    return null;
  }
}

// 清除用户聊天记忆
export async function clearChatMemory(userId: number) {
  try {
    await execute('DELETE FROM chat_memory WHERE user_id = ?', [userId]);
  } catch (error) {
    console.error('清除聊天记忆失败:', error);
  }
}

// 清除用户长期记忆
export async function clearUserLongTermMemory(userId: number) {
  try {
    await execute('DELETE FROM user_long_term_memory WHERE user_id = ?', [userId]);
  } catch (error) {
    console.error('清除用户长期记忆失败:', error);
  }
}

// 检测并自动更新宠物过敏信息（从对话中提取）
export async function detectAndUpdatePetAllergy(
  userId: number,
  userMessage: string,
  pets: any[]
): Promise<{ petId: string | null; allergyInfo: string | null } | null> {
  try {
    // 过敏信息模式 - 增强版，覆盖更多表达方式
    const allergyPatterns = [
      /对(.+?)过敏/i,                      // 对XX过敏
      /过敏[是源对](.+?)[，,。]/i,         // 过敏是XX，或过敏对XX
      /(.+?)过敏[了源]/i,                  // XX过敏了
      /医生说.*对(.+?)过敏/i,              // 医生说对XX过敏
      /医生说.*是(.+?)过敏/i,              // 医生说是XX过敏
      /检查出(.+?)过敏/i,                  // 检查出XX过敏
      /发现(.+?)过敏/i,                    // 发现XX过敏
      /确诊(.+?)过敏/i,                    // 确诊XX过敏
      /对(.+?)过敏源/i,                    // 对XX过敏源
      /(?:不能吃|不可以吃|不能吃|不可以吃)[的]?(.+?)[，,。]?/i, // 不能吃XX
      /(?:虾|虾仁|鸡肉|牛肉|鱼|牛肉|羊肉|玉米|小麦|大豆)[会]?过敏/i, // XX过敏（直接提到）
    ];
    
    let allergyInfo: string | null = null;
    let matchedPet: any = null;
    
    for (const pattern of allergyPatterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        allergyInfo = match[1].trim();
        
        // 清理过敏信息（去除常见前缀）
        allergyInfo = allergyInfo
          .replace(/^(虾|虾仁|鸡肉|牛肉|鱼|羊肉|玉米|小麦|大豆)等?/i, '$1')
          .trim();
        
        // 如果提取的内容太长或太短，可能不准确
        if (allergyInfo.length > 20 || allergyInfo.length < 1) {
          continue;
        }
        
        // 尝试匹配宠物名
        for (const pet of pets) {
          if (userMessage.includes(pet.name) || match[0].includes(pet.name)) {
            matchedPet = pet;
            break;
          }
        }
        
        // 如果没找到宠物名，使用第一只宠物
        if (!matchedPet && pets.length > 0) {
          matchedPet = pets[0];
        }
        
        break;
      }
    }
    
    // 额外检查：如果直接提到"XX过敏"（如"虾仁过敏"）
    if (!allergyInfo) {
      const directMatch = userMessage.match(/(虾仁|鸡肉|牛肉|鱼|羊肉|玉米|小麦|大豆|海鲜|蛋白|乳制品)过敏/i);
      if (directMatch) {
        allergyInfo = directMatch[1];
        if (pets.length > 0) {
          matchedPet = pets[0];
        }
      }
    }
    
    if (allergyInfo && matchedPet) {
      // 获取当前过敏信息
      const currentAllergies = matchedPet.allergies || '';
      const allergiesList = currentAllergies ? 
        (Array.isArray(currentAllergies) ? currentAllergies : currentAllergies.split(',').map((a: string) => a.trim()).filter(Boolean)) 
        : [];
      
      // 检查是否已存在（不区分大小写）
      if (!allergiesList.some((a: string) => a.toLowerCase().includes(allergyInfo.toLowerCase()) || allergyInfo.toLowerCase().includes(a.toLowerCase()))) {
        allergiesList.push(allergyInfo);
        
        // 更新宠物档案
        await execute(
          `UPDATE pets SET allergies = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [allergiesList.join(','), matchedPet.id]
        );
        
        // 同时保存到长期记忆
        await saveUserLongTermMemory(userId, 'allergy', `对${allergyInfo}过敏`, matchedPet.id, matchedPet.name);
        
        return { petId: matchedPet.id, allergyInfo };
      }
    }
    
    return null;
  } catch (error) {
    console.error('检测宠物过敏信息失败:', error);
    return null;
  }
}

// ==================== AI 驱动的长期记忆提取（场景一核心） ====================

/**
 * 用智谱 AI 从用户消息中提取结构化长期记忆
 * 替代原来的纯正则匹配，能理解自然语言的各种表达方式
 * 
 * 支持提取的记忆类型：
 * - allergy: 过敏信息（"九万吃芒果起红疹了" → 对芒果过敏）
 * - fear: 恐惧/害怕（"九万打雷时吓得发抖" → 害怕打雷声）
 * - behavior: 行为习惯（"每天晚上8点遛狗45分钟" → 遛狗规律）
 * - health: 健康状况（"最近精神不太好" → 精神萎靡）
 * - preference: 偏好（"特别喜欢吃鸡肉干" → 食物偏好）
 * - baseline: 行为基准线（由系统自动计算，如平均运动量）
 */
export async function extractMemoriesWithAI(
  userId: number,
  userMessage: string,
  pets: any[] = []
): Promise<ExtractedMemory[]> {
  try {
    const petNames = pets.map(p => p.name).join('、') || '未知宠物';
    
    const systemPrompt = `你是一个宠物长期记忆提取助手。分析用户关于宠物的话，提取值得长期记住的关键信息。

【记忆类型定义】
- allergy: 过敏/不耐受（食物、药物、环境等引起的过敏反应）
- fear: 恐惧/害怕（对声音、物体、场景的恐惧，如怕打雷、怕鞭炮、怕陌生人、怕洗澡）
- behavior: 行为习惯（固定的行为模式，如遛狗时间/时长、睡觉位置、进食习惯）
- health: 健康状况（生病症状、精神状态、身体异常）
- preference: 喜好/偏好（喜欢或讨厌的东西）
- other: 其他值得记录的重要信息

【用户的宠物】：${petNames}

【规则】
1. 只提取明确陈述的事实，不要猜测
2. 每条记忆要简洁具体
3. 同类记忆合并，不要重复
4. 如果没有值得长期记住的信息，返回空数组
5. 置信度 0.8 以上才返回（确保准确性）

请以严格 JSON 格式返回，不要包含其他文字：
{"memories":[{"type":"类型","content":"具体内容","petName":"宠物名(如有)","confidence":0.9}]}`;

    const response = await aiClient.chat.completions.create({
      model: 'glm-4-flash', // 轻量模型，快速便宜
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1, // 低温度保证稳定输出
      max_tokens: 500,
    });

    const text = response.choices[0]?.message?.content || '';
    
    // 从回复中解析 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];
    
    const parsed = JSON.parse(jsonMatch[0]);
    const memories: ExtractedMemory[] = (parsed.memories || [])
      .filter((m: any) => m.type && m.content && (m.confidence || 0) >= 0.7)
      .map((m: any) => ({
        type: m.type as ExtractedMemory['type'],
        content: m.content,
        petName: m.petName || undefined,
        confidence: m.confidence || 0.8,
      }));

    // 将提取到的记忆保存到数据库
    for (const mem of memories) {
      const matchedPet = mem.petName 
        ? pets.find(p => p.name === mem.petName) 
        : pets.length === 1 ? pets[0] : null;
      
      await saveUserLongTermMemory(
        userId, 
        mem.type, 
        mem.content,
        matchedPet?.id,
        matchedPet?.name || mem.petName
      );
    }

    console.log(`[AI记忆提取] 从消息中提取到 ${memories.length} 条长期记忆`);
    return memories;
  } catch (error) {
    console.error('[AI记忆提取] 失败，降级到正则:', error);
    // 降级：如果 AI 失败，回退到正则匹配
    await extractKeyMemories(userId, pets);
    return [];
  }
}

/**
 * 获取指定类型的宠物记忆（用于天气联动等场景）
 */
export async function getPetMemoriesByType(
  userId: number,
  memoryType: string,
  petId?: string
): Promise<UserLongTermMemory[]> {
  try {
    let sql: string;
    let params: any[];
    
    if (petId) {
      sql = `SELECT * FROM user_long_term_memory WHERE user_id = ? AND memory_type = ? AND pet_id = ? ORDER BY updated_at DESC`;
      params = [userId, memoryType, petId];
    } else {
      sql = `SELECT * FROM user_long_term_memory WHERE user_id = ? AND memory_type = ? ORDER BY updated_at DESC`;
      params = [userId, memoryType];
    }
    
    const memories: any[] = await query(sql, params);
    return memories;
  } catch (error) {
    console.error(`获取${memoryType}类型记忆失败:`, error);
    return [];
  }
}

/**
 * 更新/创建行为基线记录（场景三核心）
 * 根据最近 N 天的数据计算平均值，写入 baseline 类型记忆
 */
export async function updateBaselineMemory(
  userId: number,
  petId: string,
  petName: string,
  metricType: 'walk_duration' | 'meal_count' | 'weight',
  currentValue: number,
  days: number = 14
): Promise<{ isAnomaly: boolean; baseline: number; percentChange: number }> {
  try {
    // 查询已有的基线数据
    const existingBaselines: any[] = await query(
      `SELECT * FROM user_long_term_memory 
       WHERE user_id = ? AND pet_id = ? AND memory_type = 'baseline' AND memory_content LIKE ?
       ORDER BY updated_at DESC LIMIT 1`,
      [userId, petId, `%${metricType}%`]
    );
    
    let baselineValue: number;
    let anomalyThreshold = 0.4; // 偏离40%算异常
    
    if (existingBaselines.length > 0) {
      // 已有基线：从已有记录解析出历史值
      const content = existingBaselines[0].memory_content;
      const match = content.match(/平均([\d.]+)(分钟|次|kg)/);
      baselineValue = match ? parseFloat(match[1]) : currentValue;
      
      // 计算偏离度
      const percentChange = Math.abs(currentValue - baselineValue) / baselineValue;
      
      if (percentChange > anomalyThreshold) {
        // 异常！更新并标记
        const direction = currentValue < baselineValue ? '低于' : '高于';
        const unitMap: Record<string, string> = { walk_duration: '分钟', meal_count: '次', weight: 'kg' };
        
        await saveUserLongTermMemory(
          userId, 'baseline',
          `${petName}${metricType === 'walk_duration' ? '每日运动' : metricType === 'meal_count' ? '每日进食' : '体重'}基线：平均${baselineValue}${unitMap[metricType]}，当前${currentValue}${unitMap[metricType]}(${direction}正常值${(percentChange * 100).toFixed(0)}%)`,
          petId, petName
        );
        
        // 更新原有基线记录时间
        await execute(
          `UPDATE user_long_term_memory SET updated_at = NOW() WHERE id = ?`,
          [existingBaselines[0].id]
        );
        
        return { isAnomaly: true, baseline: baselineValue, percentChange };
      }
      
      return { isAnomaly: false, baseline: baselineValue, percentChange };
    } else {
      // 首次建立基线：直接用当前值作为初始基线
      const unitMap: Record<string, string> = { walk_duration: '分钟', meal_count: '次', weight: 'kg' };
      const labelMap: Record<string, string> = { walk_duration: '每日运动量', meal_count: '每日进食次数', weight: '体重' };
      
      await saveUserLongTermMemory(
        userId, 'baseline',
        `${petName}${labelMap[metricType]}基线：约${currentValue.toFixed(0)}${unitMap[metricType]}（基于近期数据统计）`,
        petId, petName
      );
      
      return { isAnomaly: false, baseline: currentValue, percentChange: 0 };
    }
  } catch (error) {
    console.error('[更新行为基线] 错误:', error);
    return { isAnomaly: false, baseline: currentValue, percentChange: 0 };
  }
}

// 生成会话ID
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
