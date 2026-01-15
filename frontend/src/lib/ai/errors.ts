// AI 모듈 표준 에러 정의
// 에러 코드, 상태 코드, 사용자 메시지를 포함한 구조화된 에러 처리

import { type Provider } from './openrouter-config';

/**
 * AI 모듈 표준 에러 클래스
 * @param message - 개발자용 에러 메시지 (로그용)
 * @param code - 에러 코드 (예: MISSING_API_KEY)
 * @param statusCode - HTTP 상태 코드
 * @param userMessage - 사용자에게 표시할 친절한 메시지
 */
export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public userMessage: string
  ) {
    super(message);
    this.name = 'AIError';
  }

  /**
   * JSON 응답 형식으로 변환
   */
  toJSON() {
    return {
      error: this.userMessage,
      code: this.code,
      statusCode: this.statusCode,
    };
  }

  /**
   * Response 객체 생성
   */
  toResponse(): Response {
    return new Response(JSON.stringify(this.toJSON()), {
      status: this.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * 프로바이더 표시 이름 가져오기
 */
function getProviderDisplayName(provider: Provider): string {
  switch (provider) {
    case 'deepseek':
      return 'DeepSeek';
    case 'openai':
      return 'OpenAI';
    case 'anthropic':
      return 'Anthropic';
    case 'openrouter':
      return 'OpenRouter';
    default:
      // TypeScript exhaustiveness check - 이 코드는 실행되지 않음
      return String(provider).toUpperCase();
  }
}

/**
 * 프로바이더별 설정 URL 가져오기
 */
function getProviderSettingsUrl(provider: Provider): string {
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

/**
 * 표준 AI 에러 팩토리
 */
export const AI_ERRORS = {
  /**
   * API 키 누락 에러
   */
  MISSING_API_KEY: (provider: Provider) => {
    const displayName = getProviderDisplayName(provider);
    const settingsUrl = getProviderSettingsUrl(provider);

    return new AIError(
      `API key not found for ${provider}`,
      'MISSING_API_KEY',
      400,
      `${displayName} API 키가 설정되지 않았습니다.\n\n` +
        `해결 방법:\n` +
        `1. 환경변수 설정: .env.local에 ${provider.toUpperCase()}_API_KEY 추가\n` +
        `2. 설정 메뉴에서 직접 입력\n\n` +
        `API 키 발급: ${settingsUrl}`
    );
  },

  /**
   * 유효하지 않은 API 키 에러
   */
  INVALID_API_KEY: (provider: Provider) => {
    const displayName = getProviderDisplayName(provider);
    const settingsUrl = getProviderSettingsUrl(provider);

    return new AIError(
      `Invalid API key for ${provider}`,
      'INVALID_API_KEY',
      401,
      `${displayName} API 키가 유효하지 않습니다.\n\n` +
        `해결 방법:\n` +
        `1. API 키를 확인하고 다시 입력하세요\n` +
        `2. 키가 만료되었다면 새로 발급하세요\n\n` +
        `API 키 관리: ${settingsUrl}`
    );
  },

  /**
   * API 할당량 초과 에러
   */
  QUOTA_EXCEEDED: (provider: Provider) => {
    const displayName = getProviderDisplayName(provider);

    return new AIError(
      `Quota exceeded for ${provider}`,
      'QUOTA_EXCEEDED',
      429,
      `${displayName} API 할당량을 초과했습니다.\n\n` +
        `해결 방법:\n` +
        `1. 잠시 후 다시 시도하세요\n` +
        `2. 다른 프로바이더를 사용하세요\n` +
        `3. API 플랜을 업그레이드하세요`
    );
  },

  /**
   * 레이트 리밋 초과 에러
   */
  RATE_LIMITED: (provider: Provider) => {
    const displayName = getProviderDisplayName(provider);

    return new AIError(
      `Rate limit exceeded for ${provider}`,
      'RATE_LIMITED',
      429,
      `${displayName} API 요청 한도를 초과했습니다.\n\n` +
        `해결 방법:\n` +
        `1. 잠시 후 다시 시도하세요 (30초~1분)\n` +
        `2. 요청 빈도를 줄여주세요`
    );
  },

  /**
   * 네트워크 에러
   */
  NETWORK_ERROR: (provider: Provider) => {
    const displayName = getProviderDisplayName(provider);

    return new AIError(
      `Network error connecting to ${provider}`,
      'NETWORK_ERROR',
      503,
      `${displayName} API 서버에 연결할 수 없습니다.\n\n` +
        `해결 방법:\n` +
        `1. 인터넷 연결을 확인하세요\n` +
        `2. 잠시 후 다시 시도하세요\n` +
        `3. ${displayName} 서버 상태를 확인하세요`
    );
  },

  /**
   * 모델 사용 불가 에러
   */
  MODEL_UNAVAILABLE: (provider: Provider, modelId: string) => {
    const displayName = getProviderDisplayName(provider);

    return new AIError(
      `Model ${modelId} is not available on ${provider}`,
      'MODEL_UNAVAILABLE',
      400,
      `${displayName}에서 "${modelId}" 모델을 사용할 수 없습니다.\n\n` +
        `해결 방법:\n` +
        `1. 다른 모델을 선택하세요\n` +
        `2. API 키의 권한을 확인하세요`
    );
  },

  /**
   * 잘못된 요청 형식 에러
   */
  INVALID_REQUEST: (reason: string) => {
    return new AIError(
      `Invalid request: ${reason}`,
      'INVALID_REQUEST',
      400,
      `잘못된 요청 형식입니다.\n\n이유: ${reason}\n\n다시 시도하거나 관리자에게 문의하세요.`
    );
  },

  /**
   * 타임아웃 에러
   */
  TIMEOUT: (provider: Provider) => {
    const displayName = getProviderDisplayName(provider);

    return new AIError(
      `Request timeout for ${provider}`,
      'TIMEOUT',
      504,
      `${displayName} API 요청 시간이 초과되었습니다.\n\n` +
        `해결 방법:\n` +
        `1. 다시 시도하세요\n` +
        `2. 더 짧은 메시지를 보내보세요\n` +
        `3. 다른 모델을 선택하세요`
    );
  },

  /**
   * 알 수 없는 에러
   */
  UNKNOWN: (message: string = '알 수 없는 오류가 발생했습니다.') => {
    return new AIError(
      `Unknown error: ${message}`,
      'UNKNOWN',
      500,
      `오류가 발생했습니다.\n\n${message}\n\n문제가 계속되면 관리자에게 문의하세요.`
    );
  },
};

/**
 * 일반 Error를 AIError로 변환
 * API 응답 에러를 분석하여 적절한 AIError 반환
 */
export function parseAIError(error: unknown, provider: Provider): AIError {
  // 이미 AIError인 경우
  if (error instanceof AIError) {
    return error;
  }

  // Error 객체인 경우
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // API 키 관련 에러
    if (message.includes('api key') || message.includes('unauthorized') || message.includes('401')) {
      return AI_ERRORS.INVALID_API_KEY(provider);
    }

    // 할당량 초과
    if (message.includes('quota') || message.includes('insufficient_quota')) {
      return AI_ERRORS.QUOTA_EXCEEDED(provider);
    }

    // 레이트 리밋
    if (message.includes('rate limit') || message.includes('429')) {
      return AI_ERRORS.RATE_LIMITED(provider);
    }

    // 네트워크 에러
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout')
    ) {
      return AI_ERRORS.NETWORK_ERROR(provider);
    }

    // 모델 사용 불가
    if (message.includes('model') && (message.includes('not found') || message.includes('unavailable'))) {
      return AI_ERRORS.MODEL_UNAVAILABLE(provider, 'unknown');
    }

    // 기타 에러
    return AI_ERRORS.UNKNOWN(error.message);
  }

  // 문자열 에러
  if (typeof error === 'string') {
    return AI_ERRORS.UNKNOWN(error);
  }

  // 완전히 알 수 없는 에러
  return AI_ERRORS.UNKNOWN();
}
