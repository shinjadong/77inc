// AI 어시스턴트 API 엔드포인트
// POST /api/assistant - AI 채팅 요청 처리

import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { tools } from '@/lib/ai/tools';
import { SYSTEM_PROMPT } from '@/lib/ai/system-prompt';

// Edge Runtime 사용 (빠른 응답)
export const runtime = 'edge';

// 최대 실행 시간 30초
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // 메시지 검증
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: '잘못된 요청 형식입니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 메시지 변환
    const modelMessages = await convertToModelMessages(messages);

    // Claude API 호출 (스트리밍)
    const result = streamText({
      model: anthropic('claude-sonnet-4-20250514'),
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
        JSON.stringify({ error: 'AI 서비스 설정이 필요합니다. 관리자에게 문의하세요.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 일반 오류
    return new Response(
      JSON.stringify({ error: 'AI 응답 생성 중 오류가 발생했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
