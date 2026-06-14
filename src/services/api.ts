// API 服务层 - 封装所有后端 API 调用
const API_BASE = '/api';

export const ApiService = {
  // ==================== 宠物档案 ====================
  pets: {
    getAll: async () => {
      const res = await fetch(`${API_BASE}/pets`);
      return res.json();
    },
    
    create: async (pet: any) => {
      const res = await fetch(`${API_BASE}/pets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pet),
      });
      return res.json();
    },
    
    update: async (id: string, updates: any) => {
      const res = await fetch(`${API_BASE}/pets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      return res.json();
    },
    
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE}/pets?id=${id}`, { method: 'DELETE' });
      return res.json();
    },
  },

  // ==================== 护理日程 ====================
  schedules: {
    getAll: async (petId?: string) => {
      const url = petId 
        ? `${API_BASE}/schedules?petId=${petId}` 
        : `${API_BASE}/schedules`;
      const res = await fetch(url);
      return res.json();
    },
    
    getUpcoming: async () => {
      const res = await fetch(`${API_BASE}/schedules?upcoming=true`);
      return res.json();
    },
    
    create: async (schedule: any) => {
      const res = await fetch(`${API_BASE}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      });
      return res.json();
    },
    
    update: async (id: string, updates: any) => {
      const res = await fetch(`${API_BASE}/schedules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });
      return res.json();
    },
    
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE}/schedules?id=${id}`, { method: 'DELETE' });
      return res.json();
    },
  },

  // ==================== 健康记录 ====================
  healthRecords: {
    getAll: async (petId?: string, type?: string) => {
      let url = API_BASE + '/health-records';
      const params = new URLSearchParams();
      if (petId) params.append('petId', petId);
      if (type) params.append('type', type);
      if (params.toString()) url += '?' + params.toString();
      
      const res = await fetch(url);
      return res.json();
    },
    
    create: async (record: any) => {
      const res = await fetch(`${API_BASE}/health-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      return res.json();
    },
    
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE}/health-records?id=${id}`, { method: 'DELETE' });
      return res.json();
    },
  },

  // ==================== AI 分析 ====================
  ai: {
    analyzeImage: async (imageUrl: string, analysisType: string) => {
      // 模拟 AI 分析
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      const analyses = {
        skin: {
          summary: '皮肤状态良好，轻微干燥',
          issues: ['轻微皮肤干燥'],
          severity: 'mild',
          suggestions: ['保持皮肤湿润', '使用宠物专用润肤露', '多补充维生素'],
        },
        eye: {
          summary: '眼睛清澈，无明显异常',
          issues: [],
          severity: 'normal',
          suggestions: ['继续保持眼部清洁', '定期检查泪痕'],
        },
        feces: {
          summary: '粪便形态正常，颜色健康',
          issues: [],
          severity: 'normal',
          suggestions: ['继续保持当前饮食', '保证充足饮水'],
        },
        coat: {
          summary: '毛发有光泽，皮肤无寄生虫迹象',
          issues: [],
          severity: 'normal',
          suggestions: ['定期梳毛', '保持驱虫'],
        },
      };
      
      return analyses[analysisType as keyof typeof analyses] || analyses.skin;
    },
    
    getAdvice: async (question: string) => {
      // 模拟 AI 问答
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      return {
        answer: `关于"${question}"的建议：建议咨询专业兽医获取准确诊断。`,
        suggestions: ['尽快联系兽医', '观察症状变化', '记录相关症状'],
      };
    },
  },

  // ==================== 天气 ====================
  weather: {
    getCurrent: async (location: string) => {
      // 模拟天气数据
      return {
        location,
        temperature: 22,
        condition: 'sunny',
        humidity: 65,
        aqi: 45,
        suggestion: '天气适宜，适合带宠物外出活动',
      };
    },
  },

  // ==================== 绿地搜索 ====================
  map: {
    searchParks: async (keyword: string, location?: { lat: number; lng: number }) => {
      // 模拟绿地数据
      const parks = [
        {
          id: '1',
          name: '世纪公园',
          address: '浦东新区芳甸路',
          distance: '2.5km',
          features: ['大型草坪', '宠物饮水点', '拾便袋'],
          rating: 4.5,
          latitude: 31.2154,
          longitude: 121.5673,
        },
        {
          id: '2',
          name: '滨江绿地',
          address: '黄浦区外滩',
          distance: '3.8km',
          features: ['江边步道', '宠物分区'],
          rating: 4.2,
          latitude: 31.2401,
          longitude: 121.4901,
        },
      ];
      
      return keyword 
        ? parks.filter((p) => p.name.includes(keyword))
        : parks;
    },
  },
};
