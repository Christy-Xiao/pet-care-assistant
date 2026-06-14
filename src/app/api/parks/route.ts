import { NextRequest, NextResponse } from 'next/server';

// 广州已知宠物友好绿地数据库
const KNOWN_PET_FRIENDLY_PARKS = [
  {
    id: 'gz-park-1',
    name: '珠江公园',
    address: '广州市天河区花城大道',
    lat: 23.1189,
    lon: 113.3428,
    type: '综合公园',
    rating: 4.5,
    petFriendly: true,
    lawnSize: '5000平米以上',
    features: ['有大草坪', '有遮阳设施', '有休息区', '宠物饮水点', '宠物便袋'],
    crowdLevel: 'medium',
  },
  {
    id: 'gz-park-2',
    name: '华南植物园',
    address: '广州市天河区天源路',
    lat: 23.1872,
    lon: 113.3611,
    type: '森林公园',
    rating: 4.7,
    petFriendly: true,
    lawnSize: '5000平米以上',
    features: ['有大草坪', '有水源', '有遮阳设施', '儿童游乐区', '停车场'],
    crowdLevel: 'low',
  },
  {
    id: 'gz-park-3',
    name: '白云山风景区',
    address: '广州市白云区白云山',
    lat: 23.1825,
    lon: 113.2989,
    type: '森林公园',
    rating: 4.6,
    petFriendly: true,
    lawnSize: '5000平米以上',
    features: ['有大草坪', '有遮阳设施', '有水源', '健身设施'],
    crowdLevel: 'medium',
  },
  {
    id: 'gz-park-4',
    name: '流花湖公园',
    address: '广州市越秀区流花路',
    lat: 23.1472,
    lon: 113.2428,
    type: '综合公园',
    rating: 4.3,
    petFriendly: true,
    lawnSize: '3000平米',
    features: ['有大草坪', '有遮阳设施', '有休息区', '有便利店'],
    crowdLevel: 'high',
  },
  {
    id: 'gz-park-5',
    name: '越秀公园',
    address: '广州市越秀区解放北路',
    lat: 23.1489,
    lon: 113.2578,
    type: '综合公园',
    rating: 4.4,
    petFriendly: true,
    lawnSize: '3000平米',
    features: ['有大草坪', '有遮阳设施', '儿童游乐区', '健身设施'],
    crowdLevel: 'high',
  },
  {
    id: 'gz-park-6',
    name: '荔湾湖公园',
    address: '广州市荔湾区龙津西路',
    lat: 23.1189,
    lon: 113.2289,
    type: '湿地公园',
    rating: 4.2,
    petFriendly: true,
    lawnSize: '2000平米',
    features: ['有水源', '有遮阳设施', '有休息区'],
    crowdLevel: 'medium',
  },
  {
    id: 'gz-park-7',
    name: '海珠湿地公园',
    address: '广州市海珠区新滘中路',
    lat: 23.0789,
    lon: 113.3289,
    type: '湿地公园',
    rating: 4.5,
    petFriendly: true,
    lawnSize: '5000平米以上',
    features: ['有大草坪', '有水源', '有遮阳设施', '停车场', '围栏隔离区'],
    crowdLevel: 'low',
  },
  {
    id: 'gz-park-8',
    name: '大夫山森林公园',
    address: '广州市番禺区大夫山',
    lat: 22.9789,
    lon: 113.3289,
    type: '森林公园',
    rating: 4.4,
    petFriendly: true,
    lawnSize: '5000平米以上',
    features: ['有大草坪', '有遮阳设施', '有水源', '停车场', '健身设施'],
    crowdLevel: 'low',
  },
];

// 默认位置：广州
const DEFAULT_LOCATION = { lat: 23.1291, lon: 113.2644 };

// 计算两点之间的距离（米）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '') || DEFAULT_LOCATION.lat;
    const lon = parseFloat(searchParams.get('lon') || '') || DEFAULT_LOCATION.lon;
    const radius = parseInt(searchParams.get('radius') || '10000');

    // 计算所有绿地距离
    const parksWithDistance = KNOWN_PET_FRIENDLY_PARKS.map(park => {
      const distance = calculateDistance(lat, lon, park.lat, park.lon);
      return {
        ...park,
        distance,
        distanceText: distance >= 1000
          ? `${(distance / 1000).toFixed(1)}公里`
          : `${distance}米`,
        crowdText: park.crowdLevel === 'low' ? '人少' :
          park.crowdLevel === 'medium' ? '适中' : '人多',
      };
    });

    // 过滤在搜索范围内的绿地，按距离排序
    const nearbyParks = parksWithDistance
      .filter(p => p.distance <= radius)
      .sort((a, b) => a.distance - b.distance);

    // 智能推荐：优先选择宠物友好、人少、距离近、评分高的
    const recommended = nearbyParks.length > 0 ? nearbyParks.reduce((best, park) => {
      const score = (park.petFriendly ? 100 : 0) +
        (park.crowdLevel === 'low' ? 50 : park.crowdLevel === 'medium' ? 25 : 0) +
        Math.max(0, 30 - park.distance / 500) +
        park.rating * 10;
      const bestScore = (best.petFriendly ? 100 : 0) +
        (best.crowdLevel === 'low' ? 50 : best.crowdLevel === 'medium' ? 25 : 0) +
        Math.max(0, 30 - best.distance / 500) +
        best.rating * 10;
      return score > bestScore ? park : best;
    }) : null;

    return NextResponse.json({
      parks: nearbyParks,
      recommended,
      location: { lat, lon }
    });
  } catch (error) {
    console.error('Error searching parks:', error);
    return NextResponse.json({ error: 'Failed to search parks' }, { status: 500 });
  }
}
