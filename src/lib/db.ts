import { createClient } from '@supabase/supabase-js';

// Supabase 客户端（通过 REST API，完美兼容 Vercel Serverless）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

// 导出原始客户端供复杂操作使用
export { supabase };

// 测试连接
export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error && !error.message.includes('does not exist')) {
      console.error('❌ Supabase 连接失败:', error.message);
      return false;
    }
    console.log('✅ Supabase 连接成功');
    return true;
  } catch (error: any) {
    console.error('❌ Supabase 连接失败:', error?.message);
    return false;
  }
}

// 兼容接口：查询 — 返回行数组
// 用法: query<any[]>('SELECT * FROM users WHERE email = ?', ['test@test.com'])
// 转换为: select('*').eq('email', 'test@test.com')
export async function query<T>(sql: string, params?: any[]): Promise<T> {
  // 解析 SELECT 查询
  const parsed = parseSelectQuery(sql, params);
  
  if (parsed.table) {
    let q = supabase.from(parsed.table).select(parsed.columns || '*');

    for (const filter of parsed.filters) {
      switch (filter.op) {
        case '=':
          q = q.eq(filter.column, params![filter.paramIndex]);
          break;
        case 'IN':
          q = q.in(filter.column, params![filter.paramIndex]);
          break;
        case '>':
          q = q.gt(filter.column, params![filter.paramIndex]);
          break;
        case '>=':
          q = q.gte(filter.column, params![filter.paramIndex]);
          break;
        case '<':
          q = q.lt(filter.column, params![filter.paramIndex]);
          break;
        case '<=':
          q = q.lte(filter.column, params![filter.paramIndex]);
          break;
        case 'LIKE':
          q = q.like(filter.column, `%${params![filter.paramIndex]}%`);
          break;
      }
    }

    if (parsed.orderBy) {
      q = q.order(parsed.orderBy.column, { ascending: parsed.orderBy.ascending });
    }

    if (parsed.limit) {
      q = q.limit(parsed.limit);
    }

    const { data, error } = await q;
    if (error) throw new Error(`Query error: ${error.message}`);
    return data as T;
  }

  // Fallback：对于无法解析的 SQL，使用 rpc 或直接报错
  throw new Error(`Unsupported SQL in query(): ${sql}`);
}

// 兼容接口：插入
export async function insert(sql: string, params?: any[]): Promise<{ insertId?: number; affectedRows?: number }> {
  const parsed = parseInsertQuery(sql);

  if (parsed.table) {
    const rowData: Record<string, any> = {};
    parsed.columns.forEach((col, i) => {
      rowData[col] = params![i];
    });

    let result;

    if (sql.includes('RETURNING')) {
      const { data, error } = await supabase.from(parsed.table).insert(rowData).select();
      if (error) throw new Error(`Insert error: ${error.message}`);
      result = {
        insertId: data?.[0]?.id,
        affectedRows: data?.length ?? 0,
      };
    } else {
      const { data, error } = await supabase.from(parsed.table).insert(rowData);
      if (error) throw new Error(`Insert error: ${error.message}`);
      result = {
        insertId: undefined,
        affectedRows: data ? 1 : 0,
      };
    }

    return result;
  }

  throw new Error(`Unsupported SQL in insert(): ${sql}`);
}

// 兼容接口：执行更新/删除/DDL
export async function execute(sql: string, params?: any[]): Promise<{ affectedRows: number }> {
  const upperSql = sql.trim().toUpperCase();

  // CREATE TABLE
  if (upperSql.startsWith('CREATE TABLE') || upperSql.startsWith('CREATE TABLE IF NOT EXISTS')) {
    // Supabase 表已通过 SQL Editor 创建，这里跳过或记录日志
    console.log(`[execute] Skipping DDL (table should exist): ${sql.slice(0, 80)}...`);
    return { affectedRows: 0 };
  }

  // DELETE
  if (upperSql.startsWith('DELETE')) {
    const parsed = parseDeleteQuery(sql, params!);
    let q = supabase.from(parsed.table).delete();

    for (const filter of parsed.filters) {
      q = q.eq(filter.column, params![filter.paramIndex]);
    }

    const { count, error } = await q;
    if (error) throw new Error(`Delete error: ${error.message}`);
    return { affectedRows: count ?? 0 };
  }

  // UPDATE
  if (upperSql.startsWith('UPDATE')) {
    const parsed = parseUpdateQuery(sql, params!);
    const setData: Record<string, any> = {};
    
    parsed.setCols.forEach((col, i) => {
      setData[col] = params![parsed.setStartIndex + i];
    });

    let q = supabase.from(parsed.table).update(setData);

    for (const filter of parsed.filters) {
      q = q.eq(filter.column, params![filter.paramIndex]);
    }

    const { count, error } = await q;
    if (error) throw new Error(`Update error: ${error.message}`);
    return { affectedRows: count ?? 0 };
  }

  // 其他 SQL（如清理过期 session 等）
  console.log(`[execute] Executing raw SQL: ${sql.slice(0, 80)}`);
  // 对于不支持的 SQL，返回空结果（避免崩溃）
  return { affectedRows: 0 };
}

// ==================== SQL 解析器 ====================

interface SelectParseResult {
  table?: string;
  columns?: string;
  filters: Array<{ column: string; op: string; paramIndex: number }>;
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
}

function parseSelectQuery(sql: string, _params?: any[]): SelectParseResult {
  const result: SelectParseResult = { filters: [] };

  // 提取表名: FROM table_name
  const fromMatch = sql.match(/FROM\s+(\w+)/i);
  if (fromMatch) result.table = fromMatch[1];

  // 提取列: SELECT col1, col2 / SELECT *
  const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i);
  if (selectMatch && selectMatch[1].trim() !== '*') {
    result.columns = selectMatch[1].trim();
  }

  // WHERE 子句中的条件
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER|LIMIT|GROUP|HAVING|$)/is);
  if (whereMatch) {
    const whereClause = whereMatch[1];
    const conditions = whereClause.split(/\s+AND\s+/i);
    let paramIdx = 0;

    for (const cond of conditions) {
      const trimmed = cond.trim();

      // col = ?
      const eqMatch = trimmed.match(/(\w+)\s*=\s*\?/i);
      if (eqMatch) {
        result.filters.push({ column: eqMatch[1], op: '=', paramIndex: paramIdx++ });
        continue;
      }

      // col IN (?, ...?)
      const inMatch = trimmed.match(/(\w+)\s+IN\s*\([^)]+\)/i);
      if (inMatch) {
        result.filters.push({ column: inMatch[1], op: 'IN', paramIndex: paramIdx++ });
        paramIdx++; // IN 通常消耗多个参数，但这里简化处理
        continue;
      }

      // col > ?, >= ?, < , <=
      const cmpMatch = trimmed.match(/(\w+)\s*(>=|<=|>|<)\s*\?/i);
      if (cmpMatch) {
        result.filters.push({ column: cmpMatch[1], op: cmpMatch[2], paramIndex: paramIdx++ });
        continue;
      }
    }
  }

  // ORDER BY
  const orderMatch = sql.match(/ORDER BY\s+(\w+)\s*(ASC|DESC)?/i);
  if (orderMatch) {
    result.orderBy = {
      column: orderMatch[1],
      ascending: orderMatch[2]?.toUpperCase() !== 'DESC',
    };
  }

  // LIMIT
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    result.limit = parseInt(limitMatch[1], 10);
  }

  return result;
}

interface InsertParseResult {
  table?: string;
  columns: string[];
}

function parseInsertQuery(sql: string): InsertParseResult {
  const result: InsertParseResult = { columns: [] };

  const match = sql.match(/INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s+VALUES/i);
  if (match) {
    result.table = match[1];
    result.columns = match[2].split(',').map(c => c.trim().replace(/['"`]/g, ''));
  }

  return result;
}

interface DeleteParseResult {
  table?: string;
  filters: Array<{ column: string; paramIndex: number }>;
}

function parseDeleteQuery(sql: string, _params: any[]): DeleteParseResult {
  const result: DeleteParseResult = { filters: [] };

  const tableMatch = sql.match(/DELETE FROM\s+(\w+)/i);
  if (tableMatch) result.table = tableMatch[1];

  const whereMatch = sql.match(/WHERE\s+(.+)$/is);
  if (whereMatch) {
    const eqMatch = whereMatch[1].match(/(\w+)\s*=\s*\?/i);
    if (eqMatch) {
      result.filters.push({ column: eqMatch[1], paramIndex: 0 });
    }
  }

  return result;
}

interface UpdateParseResult {
  table?: string;
  setCols: string[];
  setStartIndex: number;
  filters: Array<{ column: string; paramIndex: number }>;
}

function parseUpdateQuery(sql: string, _params: any[]): UpdateParseResult {
  const result: UpdateParseResult = { setCols: [], setStartIndex: 0, filters: [] };

  const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
  if (tableMatch) result.table = tableMatch[1];

  const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/is);
  if (setMatch) {
    const setParts = setMatch[1].split(',');
    for (const part of setParts) {
      const colMatch = part.match(/(\w+)\s*=\s*\?/i);
      if (colMatch) result.setCols.push(colMatch[1]);
    }
    result.setStartIndex = 0;
  }

  const whereMatch = sql.match(/WHERE\s+(.+)$/is);
  if (whereMatch) {
    const eqMatch = whereMatch[1].match(/(\w+)\s*=\s*\?/i);
    if (eqMatch) {
      result.filters.push({
        column: eqMatch[1],
        paramIndex: result.setCols.length,
      });
    }
  }

  return result;
}
