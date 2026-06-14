import { NextResponse } from 'next/server';
import { getPublicIP, getLocationByIP, getCurrentWeather, getWeatherAlerts, getWalkSuggestion } from '@/services/weather';

export async function GET() {
  try {
    // 1. 获取公网IP
    const ip = await getPublicIP();
    
    // 2. 通过IP获取位置
    const location = await getLocationByIP(ip);
    
    if (!location) {
      return NextResponse.json({
        error: '无法获取位置信息',
        fallback: {
          suitable: true,
          level: 'unknown',
          message: '请开启位置权限获取本地天气',
          tips: ['手动输入位置', '允许浏览器获取位置'],
          duration: '未知'
        }
      }, { status: 200 });
    }

    // 3. 获取当前天气
    const weather = await getCurrentWeather(location.lat, location.lon);
    
    // 4. 获取预警信息
    const alerts = await getWeatherAlerts(location.lat, location.lon);

    // 5. 生成遛狗建议
    const suggestion = getWalkSuggestion(weather, alerts);

    // 6. 返回完整数据
    return NextResponse.json({
      location: {
        name: location.name,
        lat: location.lat,
        lon: location.lon,
      },
      current: weather ? {
        temp: weather.temp,
        feelsLike: weather.feelsLike,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        windScale: weather.windScale,
        text: weather.text,
        icon: weather.icon,
        precip: weather.precip,
        pressure: weather.pressure,
        vis: weather.vis,
        cloud: weather.cloud,
      } : null,
      suggestion,
      alerts,
      updateTime: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Weather API error:', error);
    return NextResponse.json({
      error: '获取天气失败',
      fallback: {
        suitable: true,
        level: 'unknown',
        message: '天气服务暂时不可用',
        tips: ['请稍后再试'],
        duration: '未知'
      }
    }, { status: 500 });
  }
}
