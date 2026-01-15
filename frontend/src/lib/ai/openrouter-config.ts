// AI Provider 설정 및 모델 목록
// 지원 프로바이더: DeepSeek, OpenAI, Anthropic, OpenRouter
// 최종 업데이트: 2025년 1월

// API 엔드포인트
export const API_ENDPOINTS = {
  deepseek: 'https://api.deepseek.com/v1',
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
} as const;

// 프로바이더 타입
export type Provider = 'deepseek' | 'openai' | 'anthropic' | 'openrouter';

// 프로바이더 정보
export const PROVIDERS = [
  { id: 'deepseek' as Provider, name: 'DeepSeek', icon: '🔷', description: '가장 저렴한 고성능 모델' },
  { id: 'openai' as Provider, name: 'OpenAI', icon: '🟢', description: 'GPT 시리즈' },
  { id: 'anthropic' as Provider, name: 'Anthropic', icon: '🟣', description: 'Claude 시리즈' },
  { id: 'openrouter' as Provider, name: 'OpenRouter', icon: '🌐', description: '400+ 모델 통합 API' },
] as const;

// 직접 연동 모델 (OpenRouter 제외)
export const DIRECT_MODELS = {
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek V3', description: '최신 채팅 모델 (가장 저렴)', price: '$0.28/$0.42' },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1', description: '추론 특화 모델', price: '$0.55/$2.19' },
  ],
  openai: [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '경량 멀티모달', price: '$0.15/$0.60' },
    { id: 'gpt-4o', name: 'GPT-4o', description: '멀티모달 모델', price: '$2.50/$10.00' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: '고성능 모델', price: '$10.00/$30.00' },
    { id: 'o1-mini', name: 'o1 Mini', description: '추론 특화 (경량)', price: '$1.10/$4.40' },
  ],
  anthropic: [
    { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku', description: '빠른 응답 모델', price: '$1.00/$5.00' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: '균형잡힌 성능', price: '$3.00/$15.00' },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: '최고 성능 모델', price: '$15.00/$75.00' },
  ],
} as const;

// OpenRouter 전용 모델 목록 (provider/model-name 형식)
export const OPENROUTER_MODELS = [
  // ===== Anthropic Claude 모델 =====
  { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', provider: 'Anthropic', category: 'claude', description: '가장 강력한 플래그십 모델' },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', category: 'claude', description: '최고의 코딩/에이전트 모델' },
  { id: 'anthropic/claude-opus-4.1', name: 'Claude Opus 4.1', provider: 'Anthropic', category: 'claude', description: '에이전트 및 추론 강화' },
  { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic', category: 'claude', description: '균형잡힌 성능' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic', category: 'claude', description: '빠르고 저렴한 모델' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', category: 'claude', description: '빠른 응답 모델' },

  // ===== OpenAI GPT 모델 =====
  { id: 'openai/gpt-5.2-pro', name: 'GPT-5.2 Pro', provider: 'OpenAI', category: 'gpt', description: '최신 프로 모델' },
  { id: 'openai/gpt-5.2-chat', name: 'GPT-5.2 Chat', provider: 'OpenAI', category: 'gpt', description: '대화 최적화 모델' },
  { id: 'openai/gpt-5.2-codex', name: 'GPT-5.2 Codex', provider: 'OpenAI', category: 'gpt', description: '코딩 특화 모델' },
  { id: 'openai/gpt-5.1', name: 'GPT-5.1', provider: 'OpenAI', category: 'gpt', description: '범용 모델' },
  { id: 'openai/o3', name: 'o3', provider: 'OpenAI', category: 'gpt', description: '추론 특화 모델' },
  { id: 'openai/o4-mini', name: 'o4 Mini', provider: 'OpenAI', category: 'gpt', description: '빠른 추론 모델' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', category: 'gpt', description: '멀티모달 모델' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', category: 'gpt', description: '경량 멀티모달' },

  // ===== Google Gemini 모델 =====
  { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'Google', category: 'google', description: '최신 프리뷰 모델' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', category: 'google', description: '추론 강화 모델' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', category: 'google', description: '빠른 추론 모델' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google', category: 'google', description: '가장 많이 사용되는 모델' },
  { id: 'google/gemma-3-27b-it', name: 'Gemma 3 27B', provider: 'Google', category: 'google', description: '오픈소스 모델' },

  // ===== DeepSeek 모델 =====
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', category: 'deepseek', description: '추론 특화 모델' },
  { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'DeepSeek', category: 'deepseek', description: '최신 채팅 모델' },
  { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3 0324', provider: 'DeepSeek', category: 'deepseek', description: '인기 채팅 모델' },

  // ===== xAI Grok 모델 =====
  { id: 'x-ai/grok-4', name: 'Grok 4', provider: 'xAI', category: 'xai', description: '최신 Grok 모델' },
  { id: 'x-ai/grok-3', name: 'Grok 3', provider: 'xAI', category: 'xai', description: 'Grok 범용 모델' },

  // ===== Meta Llama 모델 =====
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta', category: 'llama', description: '최신 오픈소스' },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'Meta', category: 'llama', description: '대규모 모델' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta', category: 'llama', description: '중규모 모델' },

  // ===== Mistral 모델 =====
  { id: 'mistralai/mistral-large-2411', name: 'Mistral Large', provider: 'Mistral', category: 'mistral', description: '최신 대규모 모델' },
  { id: 'mistralai/mistral-nemo', name: 'Mistral Nemo', provider: 'Mistral', category: 'mistral', description: '효율적인 모델' },

  // ===== Qwen 모델 =====
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'Qwen', category: 'qwen', description: '대규모 중국어/영어 모델' },
  { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B', provider: 'Qwen', category: 'qwen', description: '코딩 특화 모델' },

  // ===== 자동 라우터 =====
  { id: 'openrouter/auto', name: 'Auto (자동 선택)', provider: 'OpenRouter', category: 'auto', description: '최적 모델 자동 선택' },
] as const;

// 하위 호환성을 위한 별칭
export const AVAILABLE_MODELS = OPENROUTER_MODELS;

export type ModelId = typeof OPENROUTER_MODELS[number]['id'];
export type DirectModelId =
  | typeof DIRECT_MODELS.deepseek[number]['id']
  | typeof DIRECT_MODELS.openai[number]['id']
  | typeof DIRECT_MODELS.anthropic[number]['id'];

// 기본 설정: DeepSeek V3 (가장 저렴)
export const DEFAULT_PROVIDER: Provider = 'deepseek';
export const DEFAULT_MODEL: DirectModelId = 'deepseek-chat';
export const DEFAULT_OPENROUTER_MODEL: ModelId = 'deepseek/deepseek-v3.2';

// 카테고리 목록
export const MODEL_CATEGORIES = [
  { id: 'claude', name: 'Claude', icon: '🟣' },
  { id: 'gpt', name: 'GPT', icon: '🟢' },
  { id: 'google', name: 'Google', icon: '🔵' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🔷' },
  { id: 'xai', name: 'Grok', icon: '⚡' },
  { id: 'llama', name: 'Llama', icon: '🦙' },
  { id: 'mistral', name: 'Mistral', icon: '🌬️' },
  { id: 'qwen', name: 'Qwen', icon: '🐼' },
  { id: 'auto', name: 'Auto', icon: '🤖' },
] as const;

// 모델 그룹별 필터링
export function getModelsByCategory(category: string) {
  return AVAILABLE_MODELS.filter(m => m.category === category);
}

// OpenRouter 모델 정보 조회
export function getModelInfo(modelId: string) {
  return OPENROUTER_MODELS.find(m => m.id === modelId);
}

// 직접 연동 모델 정보 조회
export function getDirectModelInfo(provider: Provider, modelId: string) {
  if (provider === 'openrouter') return null;
  const models = DIRECT_MODELS[provider as keyof typeof DIRECT_MODELS];
  return models?.find(m => m.id === modelId);
}

// 프로바이더별 모델 목록 조회
export function getModelsByProvider(provider: Provider) {
  if (provider === 'openrouter') return OPENROUTER_MODELS;
  return DIRECT_MODELS[provider as keyof typeof DIRECT_MODELS] || [];
}

// 환경변수에서 기본 설정 가져오기
export function getEnvConfig() {
  const provider = (process.env.NEXT_PUBLIC_AI_PROVIDER as Provider) || DEFAULT_PROVIDER;

  return {
    // 프로바이더별 API 키
    provider,
    deepseekApiKey: process.env.DEEPSEEK_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    openrouterApiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '',

    // 기본 모델
    defaultModel: process.env.NEXT_PUBLIC_AI_MODEL || DEFAULT_MODEL,
    defaultOpenRouterModel: (process.env.NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL as ModelId) || DEFAULT_OPENROUTER_MODEL,

    // 사이트 정보
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || '칠칠기업 법인카드 관리',
  };
}
