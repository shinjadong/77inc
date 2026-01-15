// AI 어시스턴트 API 엔드포인트
// POST /api/assistant - AI 채팅 요청 처리
// 지원 프로바이더: DeepSeek, OpenAI, Anthropic, OpenRouter

import { streamText, convertToModelMessages, stepCountIs, LanguageModel } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { tools } from '@/lib/ai/tools';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { API_ENDPOINTS, type Provider } from '@/lib/ai/openrouter-config';

// Edge Runtime 사용 (빠른 응답)
export const runtime = 'edge';

// 최대 실행 시간 30초
export const maxDuration = 30;

// DeepSeek 클라이언트 생성 (OpenAI 호환 API)
function createDeepSeekModel(apiKey: string, modelId: string): LanguageModel {
  const deepseek = createOpenAI({
    baseURL: API_ENDPOINTS.deepseek,
    apiKey,
  });
  return deepseek(modelId) as LanguageModel;
}

// OpenAI 클라이언트 생성
function createOpenAIModel(apiKey: string, modelId: string): LanguageModel {
  const openai = createOpenAI({
    baseURL: API_ENDPOINTS.openai,
    apiKey,
  });
  return openai(modelId) as LanguageModel;
}

// OpenRouter 클라이언트 생성
function createOpenRouterModel(apiKey: string, modelId: string): LanguageModel {
  const openrouter = createOpenAI({
    baseURL: API_ENDPOINTS.openrouter,
    apiKey,
    headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      'X-Title': process.env.NEXT_PUBLIC_SITE_NAME || '칠칠기업 법인카드 관리',
    },
  });
  return openrouter(modelId) as LanguageModel;
}

// 프로바이더별 모델 생성
function createModelForProvider(
  provider: Provider,
  apiKey: string,
  modelId: string
): LanguageModel {
  switch (provider) {
    case 'deepseek':
      return createDeepSeekModel(apiKey, modelId);
    case 'openai':
      return createOpenAIModel(apiKey, modelId);
    case 'anthropic':
      return anthropic(modelId) as LanguageModel;
    case 'openrouter':
      return createOpenRouterModel(apiKey, modelId);
    default:
      // 기본값: DeepSeek (가장 저렴)
      return createDeepSeekModel(apiKey, 'deepseek-chat');
  }
}

// 프로바이더별 환경변수 API 키 가져오기
function getEnvApiKey(provider: Provider): string {
  switch (provider) {
    case 'deepseek':
      return process.env.DEEPSEEK_API_KEY || '';
    case 'openai':
      return process.env.OPENAI_API_KEY || '';
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || '';
    case 'openrouter':
      return process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
    default:
      return '';
  }
}

export async function POST(req: Request) {
  try {
    const { messages, settings } = await req.json();

    // 메시지 검증
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: '잘못된 요청 형식입니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 메시지 변환
    const modelMessages = await convertToModelMessages(messages);

    // 모델 선택
    let model: LanguageModel;
    const provider = (settings?.provider as Provider) || 'deepseek';

    // API 키: 클라이언트 제공 > 환경변수
    let apiKey = settings?.apiKey || getEnvApiKey(provider);

    // Anthropic은 SDK가 자동으로 ANTHROPIC_API_KEY 환경변수 사용
    if (provider === 'anthropic' && !apiKey) {
      apiKey = process.env.ANTHROPIC_API_KEY || '';
    }

    // 모델 ID
    const modelId = settings?.selectedModel || getDefaultModel(provider);

    // API 키 확인 (Anthropic 제외 - SDK 자동 처리)
    if (provider !== 'anthropic' && !apiKey) {
      return new Response(
        JSON.stringify({
          error: `${provider.toUpperCase()} API 키가 설정되지 않았습니다. 환경변수 또는 설정에서 API 키를 입력하세요.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    model = createModelForProvider(provider, apiKey, modelId);

    // AI API 호출 (스트리밍)
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(5), // Tool 호출 최대 횟수
      temperature: 0.7,
    });

    // 스트리밍 응답 반환
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('AI Assistant API Error:', error);

    // API 키 오류
    if (error instanceof Error && error.message.includes('API key')) {
      return new Response(
        JSON.stringify({ error: 'AI 서비스 설정이 필요합니다. 설정에서 API 키를 확인하세요.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 인증 오류
    if (error instanceof Error && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
      return new Response(
        JSON.stringify({ error: 'API 키가 유효하지 않습니다. 올바른 API 키를 입력하세요.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 할당량 초과
    if (error instanceof Error && (error.message.includes('429') || error.message.includes('quota'))) {
      return new Response(
        JSON.stringify({ error: 'API 사용량 한도에 도달했습니다. 잠시 후 다시 시도하세요.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 일반 오류
    return new Response(
      JSON.stringify({ error: 'AI 응답 생성 중 오류가 발생했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 프로바이더별 기본 모델
function getDefaultModel(provider: Provider): string {
  switch (provider) {
    case 'deepseek':
      return 'deepseek-chat';
    case 'openai':
      return 'gpt-4o-mini';
    case 'anthropic':
      return 'claude-3-5-haiku-latest';
    case 'openrouter':
      return 'deepseek/deepseek-v3.2';
    default:
      return 'deepseek-chat';
  }
}
