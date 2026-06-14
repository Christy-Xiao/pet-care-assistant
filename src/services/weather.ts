// 和风天气 API 服务

const QWEATHER_API_KEY = process.env.QWEATHER_API_KEY || '0b464ea04ea6462e93c358ef3890e7c3';
const QWEATHER_BASE_URL = 'https://devapi.qweather.com/v7';

// 获取公网IP地址
export async function getPublicIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      next: { revalidate: 1800 } // 缓存30分钟
    });
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Failed to get IP:', error);
    return '127.0.0.1';
  }
}

// 通过IP获取地理位置
export async function getLocationByIP(ip: string): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    // 使用 ip-api.com 获取IP位置
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=lat,lon,city`, {
      next: { revalidate: 86400 } // 缓存24小时
    });
    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        lat: data.lat,
        lon: data.lon,
        name: data.city || '未知城市'
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to get location:', error);
    return null;
  }
}

// 获取当前天气
export async function getCurrentWeather(lat: number, lon: number) {
  try {
    const url = `${QWEATHER_BASE_URL}/weather/now?key=${QWEATHER_API_KEY}&location=${lon},${lat}`;
    const response = await fetch(url, {
      next: { revalidate: 1800 } // 缓存30分钟
    });
    const data = await response.json();
    
    if (data.code === '200') {
      return data.now;
    }
    console.error('Weather API error:', data);
    return null;
  } catch (error) {
    console.error('Failed to get weather:', error);
    return null;
  }
}

// 获取24小时预报
export async function getHourlyForecast(lat: number, lon: number) {
  try {
    const url = `${QWEATHER_BASE_URL}/weather/24h?key=${QWEATHER_API_KEY}&location=${lon},${lat}`;
    const response = await fetch(url, {
      next: { revalidate: 1800 }
    });
    const data = await response.json();
    
    if (data.code === '200') {
      return data.hourly;
    }
    return null;
  } catch (error) {
    console.error('Failed to get forecast:', error);
    return null;
  }
}

// 获取预警信息
export async function getWeatherAlerts(lat: number, lon: number) {
  try {
    const url = `${QWEATHER_BASE_URL}/warning/now?key=${QWEATHER_API_KEY}&location=${lon},${lat}`;
    const response = await fetch(url, {
      next: { revalidate: 1800 }
    });
    const data = await response.json();
    
    if (data.code === '200') {
      return data.warning || [];
    }
    return [];
  } catch (error) {
    console.error('Failed to get alerts:', error);
    return [];
  }
}

// 判断遛狗建议
export interface WalkSuggestion {
  suitable: boolean;
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'bad' | 'unknown';
  message: string;
  tips: string[];
  duration: string; // 建议时长
}

export function getWalkSuggestion(weather: any, alerts: any[]): WalkSuggestion {
  if (!weather) {
    return {
      suitable: false,
      level: 'unknown',
      message: '无法获取天气信息',
      tips: ['请检查网络连接'],
      duration: '未知'
    };
  }

  const temp = parseFloat(weather.temp);        // 温度(℃)
  const feelsLike = parseFloat(weather.feelsLike); // 体感温度
  const windSpeed = parseFloat(weather.windSpeed); // 风速(km/h)
  const humidity = parseInt(weather.humidity);   // 湿度(%)
  const text = weather.text || '';               // 天气文字
  const windScale = weather.windScale || '0';   // 风力等级
  const precip = parseFloat(weather.precip || '0'); // 降水量(mm)
  
  // 检查是否有恶劣天气预警
  const hasStormAlert = alerts.some((a: any) => 
    a.type === 'TB' || a.type === 'TS' || a.type === 'TY' || 
    a.type === 'HC' || a.type === 'HD' || a.type === 'SS'
  );
  const hasRainAlert = alerts.some((a: any) => 
    a.type === 'RA' || a.type === 'RS' || a.type === 'FPA'
  );

  const tips: string[] = [];
  let level: WalkSuggestion['level'];
  let suitable = true;
  let message = '';
  let duration = '';

  // 温度判断
  if (temp < 0) {
    suitable = false;
    level = 'bad';
    message = '❄️ 气温过低，不建议外出遛狗';
    duration = '0分钟';
    tips.push('气温低于0°C，狗狗容易冻伤');
    tips.push('如必须外出，请给狗狗穿上保暖衣物');
    tips.push('时间控制在5分钟以内');
  } else if (temp < 5) {
    level = 'poor';
    message = '🥶 气温较低，遛狗时间不宜过长';
    duration = '10-15分钟';
    tips.push('建议给怕冷的狗狗穿衣服');
    tips.push('选择中午气温较高时段外出');
  } else if (temp < 10) {
    level = 'fair';
    message = '🌤️ 气温适宜，适量运动';
    duration = '20-30分钟';
    tips.push('早晚温差大，注意保暖');
  } else if (temp < 25) {
    level = 'excellent';
    message = '🌸 天气宜人，非常适合遛狗！';
    duration = '30-60分钟';
    tips.push('是遛狗的绝佳时机');
    tips.push('可以带狗狗多运动一下');
  } else if (temp < 30) {
    level = 'good';
    message = '☀️ 气温稍高，注意防暑';
    duration = '20-30分钟';
    tips.push('选择早晚气温较低时段');
    tips.push('随身携带饮用水');
    tips.push('避免阳光直射时间过长');
  } else if (temp < 35) {
    level = 'poor';
    message = '🔥 气温炎热，遛狗需谨慎';
    duration = '10-15分钟';
    tips.push('地表温度可能烫伤狗狗爪子');
    tips.push('避开中午12点-下午3点');
    tips.push('选择清晨或傍晚外出');
    tips.push('记得带水给狗狗补水');
  } else {
    level = 'bad';
    message = '⚠️ 高温预警，极易中暑！';
    duration = '5-10分钟或不出门';
    tips.push('高温天气容易导致狗狗中暑');
    tips.push('柏油路面温度可达60°C以上');
    tips.push('强烈建议室内活动');
    tips.push('如必须外出请抱起狗狗');
  }

  // 天气状况判断
  if (text.includes('雨') || text.includes('雪') || text.includes('冰')) {
    if (text.includes('暴雨') || text.includes('大雪')) {
      suitable = false;
      tips.push('恶劣天气，请勿外出');
    } else {
      tips.push('记得给狗狗穿雨衣或使用宠物伞');
    }
  }

  if (text.includes('雷') || text.includes('闪电')) {
    suitable = false;
    level = 'bad';
    message = '⛈️ 雷暴天气，禁止外出！';
    tips.push('雷声会引起狗狗恐惧');
    tips.push('可能发生触电危险');
    duration = '0分钟';
  }

  // 风速判断
  if (windSpeed > 40) {
    suitable = false;
    tips.push('风力过大，不宜外出');
  } else if (windSpeed > 20) {
    tips.push('风较大，小型犬注意安全');
  }

  // 降水量判断
  if (precip > 10) {
    suitable = false;
    tips.push('降水量较大，不建议外出');
  } else if (precip > 0) {
    tips.push('可能有降水，记得带伞');
  }

  // 预警判断
  if (hasStormAlert) {
    suitable = false;
    tips.push('⚠️ 有恶劣天气预警，请待在室内');
  }
  if (hasRainAlert) {
    tips.push('⚠️ 有降水预警，外出请注意');
  }

  return {
    suitable: suitable && level !== 'bad',
    level,
    message,
    tips,
    duration
  };
}

// 完整天气数据结构
export interface WeatherData {
  location: {
    name: string;
    lat: number;
    lon: number;
  };
  current: {
    temp: string;
    feelsLike: string;
    humidity: string;
    windSpeed: string;
    windScale: string;
    text: string;
    icon: string;
    precip: string;
    pressure: string;
    vis: string;
    cloud: string;
  };
  suggestion: WalkSuggestion;
  alerts: any[];
  updateTime: string;
}
