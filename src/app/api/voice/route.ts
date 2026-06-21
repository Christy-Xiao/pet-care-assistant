/**
 * 语音转文字 API (v3 - 精简版)
 * 
 * 流程: 前端录制WAV(浏览器端AudioContext) → 直接发后端 → 智谱GLM-ASR转写
 * 
 * 不需要ffmpeg! 前端直接输出WAV格式，智谱原生支持。
 * 
 * v3 修复:
 * - model: glm-asr-2512 (智谱ASR模型)
 * - 接收前端直接录制的WAV文件
 * - 无需任何转码依赖
 */
import { NextRequest, NextResponse } from 'next/server';

const ZHIPU_API_KEY = process.env.ZHIPUAI_API_KEY || '8c8ffc159d0b4c378f36e45ab35ffe6a.rx5oSymII4rCqS38';
const ZHIPU_AUDIO_URL = 'https://open.bigmodel.cn/api/paas/v4/audio/transcriptions';

export async function POST(request: NextRequest) {
  try {
    // 1. 解析上传的音频文件 (已经是 WAV 格式)
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: '请提供有效的音频文件' }, { status: 400 });
    }

    // 文件大小限制：10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (audioFile.size > MAX_SIZE) {
      return NextResponse.json({ error: '音频文件过大' }, { status: 400 });
    }

    console.log(`[Voice] 收到音频: ${audioFile.name}, ${(audioFile.size / 1024).toFixed(1)}KB, type: ${audioFile.type}`);

    // 2. 直接调用智谱 GLM-ASR API
    const arrayBuffer = await audioFile.arrayBuffer();
    const apiFormData = new FormData();
    apiFormData.append('file', new Blob([arrayBuffer], { type: audioFile.type || 'audio/wav' }), audioFile.name || 'audio.wav');
    apiFormData.append('model', 'glm-asr-2512');

    console.log('[Voice] 调用智谱 GLM-ASR...');

    const response = await fetch(ZHIPU_AUDIO_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
      },
      body: apiFormData,
    });

    // 3. 处理响应
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[Voice] 智谱API错误(${response.status}):`, errorText);
      console.error(`[Voice] 发送格式: ${audioFile.type}, 大小: ${audioFile.size}B`);

      if (response.status === 401) return NextResponse.json({ error: 'AI服务认证失败' }, { status: 500 });
      if (response.status === 429) return NextResponse.json({ error: '请求过于频繁' }, { status: 429 });
      return NextResponse.json({ error: `语音识别错误(${response.status}): ${errorText.slice(0, 200)}` }, { status: 500 });
    }

    // 4. 返回识别结果
    const data = await response.json() as any;
    const text = data.text?.trim() || '';

    console.log(`[Voice] ✅ 识别成功: "${text}" (${text.length}字)`);

    return NextResponse.json({ 
      text: text || undefined,
      error: !text ? '未能识别出语音内容' : undefined,
    });

  } catch (error: any) {
    console.error('[Voice] 失败:', error);
    return NextResponse.json({ error: `语音识别失败: ${error.message}` }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: '语音转写接口 v3 (无需ffmpeg)',
    model: 'glm-asr-2512',
    format: 'wav (浏览器端录制PCM)',
    maxFileSize: '10MB',
    maxDuration: '30秒',
  });
}
