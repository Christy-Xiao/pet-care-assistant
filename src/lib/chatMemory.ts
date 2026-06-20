import { query, insert, execute } from './db';

export interface ChatMemory {
  id: number;
  user_id: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

// 用户长期记忆表 - 存储用户的关键信息（宠物过敏、偏好等）
export interface UserLongTermMemory {
  id: number;
  user_id: number;
  pet_id: string | null;
  pet_name: string | null;
  memory_type: 'allergy' | 'preference' | 'health' | 'behavior' | 'other';
  memory_content: string;
  created_at: Date;
  updated_at: Date;
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
        memory_type ENUM('allergy', 'preference', 'health', 'behavior', 'other') NOT NULL,
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
  memoryType: 'allergy' | 'preference' | 'health' | 'behavior' | 'other',
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
      const preferenceMemories = longTermMemories.filter(m => m.memory_type === 'preference');
      const healthMemories = longTermMemories.filter(m => m.memory_type === 'health');
      const behaviorMemories = longTermMemories.filter(m => m.memory_type === 'behavior');
      
      if (allergyMemories.length > 0) {
        summary += '🔴 过敏信息：\n';
        allergyMemories.forEach(m => {
          const petPrefix = m.pet_name ? `${m.pet_name}对` : '';
          summary += `  - ${petPrefix}${m.memory_content}\n`;
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
        summary += '🎾 行为活动：\n';
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

// 生成会话ID
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
