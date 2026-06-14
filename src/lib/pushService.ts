import { query, insert, execute } from './db';

export interface PushSchedule {
  id: number;
  user_id: number;
  title: string;
  content: string;
  push_time: string; // HH:MM 格式
  push_days: string; // 逗号分隔：0,1,2,3,4,5,6 (周日到周六)
  enabled: boolean;
  last_pushed_at: Date | null;
  created_at: Date;
}

// 初始化推送计划表
export async function initPushScheduleTable() {
  try {
    await execute(`
      CREATE TABLE IF NOT EXISTS push_schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        push_time VARCHAR(10) NOT NULL DEFAULT '09:00',
        push_days VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5',
        enabled BOOLEAN DEFAULT TRUE,
        last_pushed_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_enabled (enabled),
        INDEX idx_push_time (push_time)
      )
    `);
    console.log('✅ push_schedules 表创建成功');
  } catch (error) {
    console.error('❌ push_schedules 表创建失败:', error);
  }
}

// 创建推送计划
export async function createPushSchedule(
  userId: number,
  title: string,
  content: string,
  pushTime: string = '09:00',
  pushDays: string = '1,2,3,4,5'
): Promise<number> {
  try {
    const result: any = await insert(
      'INSERT INTO push_schedules (user_id, title, content, push_time, push_days) VALUES (?, ?, ?, ?, ?)',
      [userId, title, content, pushTime, pushDays]
    );
    return result.insertId;
  } catch (error) {
    console.error('创建推送计划失败:', error);
    return -1;
  }
}

// 获取用户的所有推送计划
export async function getPushSchedules(userId: number): Promise<PushSchedule[]> {
  try {
    const schedules: any[] = await query(
      'SELECT * FROM push_schedules WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return schedules;
  } catch (error) {
    console.error('获取推送计划失败:', error);
    return [];
  }
}

// 更新推送计划
export async function updatePushSchedule(
  id: number,
  updates: Partial<Omit<PushSchedule, 'id' | 'user_id' | 'created_at'>>
): Promise<boolean> {
  try {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        // 转换驼峰为下划线
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = ?`);
        values.push(value);
      }
    });

    if (fields.length > 0) {
      values.push(id);
      await execute(
        `UPDATE push_schedules SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }
    return true;
  } catch (error) {
    console.error('更新推送计划失败:', error);
    return false;
  }
}

// 删除推送计划
export async function deletePushSchedule(id: number): Promise<boolean> {
  try {
    await execute('DELETE FROM push_schedules WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('删除推送计划失败:', error);
    return false;
  }
}

// 获取待推送的消息（检查哪些计划需要推送）
export async function getPendingPushes(): Promise<PushSchedule[]> {
  try {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = now.getDay().toString();

    const schedules: any[] = await query(
      `SELECT * FROM push_schedules 
       WHERE enabled = TRUE 
       AND push_days LIKE ?
       AND (last_pushed_at IS NULL OR last_pushed_at < CURDATE())
       ORDER BY push_time ASC`,
      [`%${currentDay}%`]
    );

    // 过滤时间匹配的
    return schedules.filter((s: any) => {
      const pushTime = s.push_time.substring(0, 5);
      return pushTime <= currentTime;
    });
  } catch (error) {
    console.error('获取待推送消息失败:', error);
    return [];
  }
}

// 标记已推送
export async function markAsPushed(id: number): Promise<void> {
  try {
    await execute(
      'UPDATE push_schedules SET last_pushed_at = NOW() WHERE id = ?',
      [id]
    );
  } catch (error) {
    console.error('标记推送失败:', error);
  }
}

// 通知表（存储推送历史）
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  content: string;
  type: 'reminder' | 'push' | 'system';
  is_read: boolean;
  created_at: Date;
}

export async function createNotification(
  userId: number,
  title: string,
  content: string,
  type: 'reminder' | 'push' | 'system' = 'system'
): Promise<number> {
  try {
    const result: any = await insert(
      'INSERT INTO notifications (user_id, title, content, type) VALUES (?, ?, ?, ?)',
      [userId, title, content, type]
    );
    return result.insertId;
  } catch (error) {
    console.error('创建通知失败:', error);
    return -1;
  }
}
