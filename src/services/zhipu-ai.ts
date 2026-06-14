import { ZhipuAI } from 'zhipuai';

const client = new ZhipuAI({
  apiKey: process.env.ZHIPU_API_KEY || '3df7baf620364829b26d372aa722f3f0.eSc4MsW0DgLtbB8W',
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

// 图片消息内容
export interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string; // base64 或 URL
  };
}

export async function chatWithAI(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  try {
    const allMessages: any[] = [];
    
    // 添加系统提示词
    if (systemPrompt) {
      allMessages.push({
        role: 'system',
        content: systemPrompt,
      });
    }
    
    // 添加对话历史
    messages.forEach((msg) => {
      allMessages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    const response = await client.chat.completions.create({
      model: 'glm-4',
      messages: allMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0]?.message?.content || '抱歉，暂时无法回答这个问题。';
  } catch (error: any) {
    console.error('智谱AI调用失败:', error);
    
    // 处理不同类型的错误
    if (error.status === 401) {
      return 'AI服务认证失败，请检查API Key是否正确。';
    } else if (error.status === 429) {
      return 'AI服务请求过于频繁，请稍后再试。';
    } else if (error.error?.code === '1301') {
      return '您的账户余额已用尽，请充值后再试。';
    }
    
    return `AI服务暂时不可用: ${error.message || '未知错误'}`;
  }
}

// 支持图片的对话分析（使用GLM-4V模型）
export async function chatWithImage(
  prompt: string,
  imageBase64: string, // base64格式的图片
  systemPrompt?: string
): Promise<string> {
  try {
    const messages: any[] = [];
    
    // 添加系统提示词
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }
    
    // 添加图片消息
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: imageBase64, // 已经是base64格式
          },
        },
        {
          type: 'text',
          text: prompt,
        },
      ],
    });

    const response = await client.chat.completions.create({
      model: 'glm-4v', // 使用视觉模型
      messages: messages,
      temperature: 0.7,
      max_tokens: 1500,
    });

    return response.choices[0]?.message?.content || '抱歉，暂时无法分析这张图片。';
  } catch (error: any) {
    console.error('智谱AI图片分析失败:', error);
    
    // 处理不同类型的错误
    if (error.status === 401) {
      return 'AI服务认证失败，请检查API Key是否正确。';
    } else if (error.status === 429) {
      return 'AI服务请求过于频繁，请稍后再试。';
    } else if (error.error?.code === '1301') {
      return '您的账户余额已用尽，请充值后再试。';
    }
    
    return `图片分析暂时不可用: ${error.message || '未知错误'}`;
  }
}

// 宠物健康助手系统提示词
export const PET_HEALTH_SYSTEM_PROMPT = `你是专业的宠物健康助手，名字叫"宠宠"。你的职责是：
1. 回答用户关于宠物健康、饮食、行为等方面的问题
2. 提供科学的养宠建议和护理知识
3. 当用户描述的症状可能严重时，提醒他们及时就医
4. 回答要专业、温暖、有耐心

请用友好、专业的语气回答。如果不确定，建议用户咨询专业兽医。`;

// 图像分析系统提示词
export const IMAGE_ANALYSIS_SYSTEM_PROMPT = `你是一个专业的宠物健康视觉分析助手。你需要：
1. 分析用户上传的宠物图片（皮肤、眼睛、粪便、毛发等）
2. 识别可能存在的健康问题
3. 给出初步建议，但必须强调最终诊断需要兽医确认
4. 如果图片质量不佳或无法分析，请礼貌地告知用户

请保持专业但温暖的语气。`;

export default client;
