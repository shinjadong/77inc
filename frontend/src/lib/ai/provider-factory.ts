// AI 프로바이더 팩토리
// 프로바이더별 모델 생성 로직을 중앙화
// 지원 프로바이더: DeepSeek, OpenAI, Anthropic, OpenRouter

import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { LanguageModel } from 'ai';
import { API_ENDPOINTS, type Provider, getDefaultModel } from './openrouter-config';
import { AI_ERRORS } from './errors';

// DeepSeek 모델 생성 (OpenAI 호환 API)
function createDeepSeekModel(apiKey: string, modelId: string): LanguageModel {
  const deepseek = createOpenAI({
    baseURL: API_ENDPOINTS.deepseek,
    apiKey,
  });
  return deepseek(modelId) as LanguageModel;
}

// OpenAI 모델 생성
function createOpenAIModel(apiKey: string, modelId: string): LanguageModel {
  const openai = createOpenAI({
    baseURL: API_ENDPOINTS.openai,
    apiKey,
  });
  return openai(modelId) as LanguageModel;
}

// OpenRouter 모델 생성
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

// 프로바이더별 환경변수 API 키 가져오기
export function getEnvApiKey(provider: Provider): string {
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

// 프로바이더별 모델 생성 (팩토리 함수)
export function createModelForProvider(
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

// API 키와 모델 ID 자동 결정 (편의 함수)
export interface ProviderSettings {
  provider: Provider;
  apiKey?: string; // 클라이언트 제공 API 키 (선택)
  selectedModel?: string; // 선택된 모델 ID (선택)
}

export function createModel(settings: ProviderSettings): LanguageModel {
  const provider = settings.provider || 'deepseek';

  // API 키: 클라이언트 제공 > 환경변수
  let apiKey = settings.apiKey || getEnvApiKey(provider);

  // Anthropic은 SDK가 자동으로 ANTHROPIC_API_KEY 환경변수 사용
  if (provider === 'anthropic' && !apiKey) {
    apiKey = process.env.ANTHROPIC_API_KEY || '';
  }

  // 모델 ID
  const modelId = settings.selectedModel || getDefaultModel(provider);

  // API 키 검증 (Anthropic 제외 - SDK 자동 처리)
  if (provider !== 'anthropic' && !apiKey) {
    throw AI_ERRORS.MISSING_API_KEY(provider);
  }

  return createModelForProvider(provider, apiKey, modelId);
}
