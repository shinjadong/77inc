// AI 어시스턴트 API 엔드포인트
// POST /api/assistant - AI 채팅 요청 처리
// 지원 프로바이더: DeepSeek, OpenAI, Anthropic, OpenRouter

import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { tools } from '@/lib/ai/tools';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';
import { type Provider } from '@/lib/ai/openrouter-config';
import { createModel } from '@/lib/ai/provider-factory';
import { AIError, parseAIError } from '@/lib/ai/errors';

// Edge Runtime 사용 (빠른 응답)
export const runtime = 'edge';

// 최대 실행 시간 30초
export const maxDuration = 30;

export async function POST(req: Request) {
  let provider: Provider = 'deepseek'; // 기본 프로바이더 (에러 처리용)

  try {
    const { messages, settings } = await req.json();

    // 프로바이더 추출 (에러 처리에서 사용)
    provider = (settings?.provider as Provider) || 'deepseek';

    // 메시지 검증
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: '잘못된 요청 형식입니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 메시지 변환
    const modelMessages = await convertToModelMessages(messages);

    // 모델 생성 (프로바이더 팩토리 사용)
    const model = createModel({
      provider,
      apiKey: settings?.apiKey,
      selectedModel: settings?.selectedModel,
    });

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

    // 표준화된 에러 처리
    const aiError = error instanceof AIError ? error : parseAIError(error, provider);

    return aiError.toResponse();
  }
}
