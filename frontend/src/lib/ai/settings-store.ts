// AI 설정 저장소 (클라이언트 사이드)
// localStorage를 사용하여 API 키와 모델 설정을 저장
// 환경변수가 설정되어 있으면 환경변수 우선 사용
// 지원 프로바이더: DeepSeek, OpenAI, Anthropic, OpenRouter

import {
  DEFAULT_MODEL,
  DEFAULT_PROVIDER,
  DEFAULT_OPENROUTER_MODEL,
  type Provider,
  type ModelId,
  type DirectModelId,
  getEnvConfig,
  DIRECT_MODELS,
  getDefaultModel,
} from './openrouter-config';

const STORAGE_KEYS = {
  PROVIDER: 'ai_provider',
  API_KEY: 'ai_api_key', // 프로바이더별 API 키
  SELECTED_MODEL: 'ai_selected_model',
  USE_SERVER_CONFIG: 'ai_use_server_config', // 서버 환경변수 사용 여부
  RECENT_MODELS: 'ai_recent_models', // 최근 사용 모델 (프로바이더별)
  // Legacy keys (하위 호환성)
  OPENROUTER_API_KEY: 'openrouter_api_key',
  OPENROUTER_MODEL: 'openrouter_selected_model',
  USE_OPENROUTER: 'use_openrouter',
} as const;

// 최근 사용 모델 설정
const MAX_RECENT_MODELS = 5;

export interface AISettings {
  provider: Provider;
  apiKey: string;
  selectedModel: string; // DirectModelId | ModelId
  isEnvConfigured: boolean; // 환경변수로 설정됨
  useServerConfig: boolean; // 서버 환경변수 사용
}

// 환경변수 캐싱 (모듈 로드 시 한 번만 읽기)
const ENV_CONFIG = (() => {
  if (typeof window === 'undefined') {
    return {
      provider: DEFAULT_PROVIDER,
      openrouterApiKey: '',
      defaultModel: DEFAULT_MODEL,
      defaultOpenRouterModel: DEFAULT_OPENROUTER_MODEL,
    };
  }

  // 클라이언트에서 접근 가능한 환경변수 (한 번만 읽기)
  const provider = (process.env.NEXT_PUBLIC_AI_PROVIDER as Provider) || DEFAULT_PROVIDER;
  const openrouterApiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
  const defaultModel = process.env.NEXT_PUBLIC_AI_MODEL || getDefaultModel(provider);
  const defaultOpenRouterModel = (process.env.NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL as ModelId) || DEFAULT_OPENROUTER_MODEL;

  return { provider, openrouterApiKey, defaultModel, defaultOpenRouterModel };
})();

// 환경변수 확인 (캐시된 값 반환)
function getClientEnvConfig() {
  return ENV_CONFIG;
}

// 프로바이더별 저장된 API 키 가져오기
function getStoredApiKey(provider: Provider): string {
  if (typeof window === 'undefined') return '';

  // Legacy 키 마이그레이션 (OpenRouter)
  if (provider === 'openrouter') {
    return localStorage.getItem(`${STORAGE_KEYS.API_KEY}_${provider}`) ||
           localStorage.getItem(STORAGE_KEYS.OPENROUTER_API_KEY) || '';
  }

  return localStorage.getItem(`${STORAGE_KEYS.API_KEY}_${provider}`) || '';
}

// 설정 가져오기
export function getAISettings(): AISettings {
  if (typeof window === 'undefined') {
    return {
      provider: DEFAULT_PROVIDER,
      apiKey: '',
      selectedModel: DEFAULT_MODEL,
      isEnvConfigured: false,
      useServerConfig: true,
    };
  }

  const envConfig = getClientEnvConfig();

  // 저장된 프로바이더 또는 환경변수 기본값
  const storedProvider = localStorage.getItem(STORAGE_KEYS.PROVIDER) as Provider | null;
  const provider = storedProvider || envConfig.provider;

  // 환경변수 API 키 확인 (OpenRouter만 클라이언트에서 접근 가능)
  const hasEnvApiKey = provider === 'openrouter' && !!envConfig.openrouterApiKey;

  // 서버 설정 사용 여부 (저장값 또는 기본값 true)
  const storedUseServerConfig = localStorage.getItem(STORAGE_KEYS.USE_SERVER_CONFIG);
  const useServerConfig = storedUseServerConfig === null ? true : storedUseServerConfig === 'true';

  // API 키: 서버 설정 사용 시 빈 값, 아니면 환경변수 또는 localStorage
  let apiKey = '';
  if (!useServerConfig) {
    if (provider === 'openrouter' && envConfig.openrouterApiKey) {
      apiKey = envConfig.openrouterApiKey;
    } else {
      apiKey = getStoredApiKey(provider);
    }
  }

  // 모델: localStorage 우선, 없으면 환경변수 기본값
  let selectedModel = localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL);
  if (!selectedModel) {
    selectedModel = provider === 'openrouter'
      ? envConfig.defaultOpenRouterModel
      : envConfig.defaultModel;
  }

  return {
    provider,
    apiKey,
    selectedModel,
    isEnvConfigured: hasEnvApiKey,
    useServerConfig,
  };
}

// 프로바이더 저장
export function setProvider(provider: Provider): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.PROVIDER, provider);
}

// API 키 저장 (프로바이더별)
export function setAPIKey(provider: Provider, apiKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${STORAGE_KEYS.API_KEY}_${provider}`, apiKey);
}

// 모델 선택 저장
export function setSelectedModel(modelId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, modelId);
}

// 서버 설정 사용 여부 저장
export function setUseServerConfig(use: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.USE_SERVER_CONFIG, String(use));
}

// Legacy: OpenRouter 사용 여부 (하위 호환성)
export function setUseOpenRouter(use: boolean): void {
  if (typeof window === 'undefined') return;
  if (use) {
    setProvider('openrouter');
  }
  localStorage.setItem(STORAGE_KEYS.USE_OPENROUTER, String(use));
}

// API 키 유효성 검사
export function isValidAPIKey(provider: Provider, apiKey: string): boolean {
  if (!apiKey || apiKey.length < 10) return false;

  switch (provider) {
    case 'deepseek':
      return apiKey.startsWith('sk-') && apiKey.length > 20;
    case 'openai':
      return apiKey.startsWith('sk-') && apiKey.length > 20;
    case 'anthropic':
      return apiKey.startsWith('sk-ant-') && apiKey.length > 20;
    case 'openrouter':
      return apiKey.startsWith('sk-or-') && apiKey.length > 20;
    default:
      return false;
  }
}

// 설정 초기화
export function clearAISettings(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.PROVIDER);
  localStorage.removeItem(STORAGE_KEYS.SELECTED_MODEL);
  localStorage.removeItem(STORAGE_KEYS.USE_SERVER_CONFIG);
  // 모든 프로바이더 API 키 및 최근 모델 삭제
  ['deepseek', 'openai', 'anthropic', 'openrouter'].forEach(p => {
    localStorage.removeItem(`${STORAGE_KEYS.API_KEY}_${p}`);
    localStorage.removeItem(`${STORAGE_KEYS.RECENT_MODELS}_${p}`);
  });
  // Legacy 키 삭제
  localStorage.removeItem(STORAGE_KEYS.OPENROUTER_API_KEY);
  localStorage.removeItem(STORAGE_KEYS.OPENROUTER_MODEL);
  localStorage.removeItem(STORAGE_KEYS.USE_OPENROUTER);
}

// 환경변수로 설정되어 있는지 확인
export function isEnvConfigured(): boolean {
  if (typeof window === 'undefined') return false;
  return !!process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
}

// 프로바이더별 기본 모델 가져오기 (통합 함수 사용)
export { getDefaultModel as getDefaultModelForProvider };

// 프로바이더별 API 키 플레이스홀더
export function getApiKeyPlaceholder(provider: Provider): string {
  switch (provider) {
    case 'deepseek':
      return 'sk-...';
    case 'openai':
      return 'sk-proj-...';
    case 'anthropic':
      return 'sk-ant-...';
    case 'openrouter':
      return 'sk-or-v1-...';
    default:
      return '';
  }
}

// 프로바이더별 API 키 발급 URL
export function getApiKeyUrl(provider: Provider): string {
  switch (provider) {
    case 'deepseek':
      return 'https://platform.deepseek.com/api_keys';
    case 'openai':
      return 'https://platform.openai.com/api-keys';
    case 'anthropic':
      return 'https://console.anthropic.com/settings/keys';
    case 'openrouter':
      return 'https://openrouter.ai/keys';
    default:
      return '';
  }
}

// 최근 사용 모델 가져오기 (프로바이더별)
export function getRecentModels(provider: Provider): string[] {
  if (typeof window === 'undefined') return [];

  const key = `${STORAGE_KEYS.RECENT_MODELS}_${provider}`;
  const stored = localStorage.getItem(key);

  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 최근 사용 모델 추가 (프로바이더별)
export function addRecentModel(provider: Provider, modelId: string): void {
  if (typeof window === 'undefined') return;

  const recent = getRecentModels(provider);

  // 중복 제거 및 최신 모델을 맨 앞으로
  const updated = [modelId, ...recent.filter(m => m !== modelId)].slice(0, MAX_RECENT_MODELS);

  const key = `${STORAGE_KEYS.RECENT_MODELS}_${provider}`;
  localStorage.setItem(key, JSON.stringify(updated));
}
