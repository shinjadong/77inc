'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Settings,
  Key,
  Bot,
  Check,
  AlertTriangle,
  ExternalLink,
  Shield,
  DollarSign,
  Search,
  Clock,
} from 'lucide-react';
import {
  PROVIDERS,
  DIRECT_MODELS,
  OPENROUTER_MODELS,
  MODEL_CATEGORIES,
  type Provider,
  type ModelId,
  getModelInfo,
  getDirectModelInfo,
  getDefaultModel,
} from '@/lib/ai/openrouter-config';
import {
  getAISettings,
  setAPIKey,
  setSelectedModel,
  setProvider as saveProvider,
  setUseServerConfig as saveUseServerConfig,
  isValidAPIKey,
  getApiKeyPlaceholder,
  getApiKeyUrl,
  addRecentModel,
  getRecentModels,
} from '@/lib/ai/settings-store';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 통합 설정 상태 인터페이스
interface AISettings {
  provider: Provider;
  apiKey: string;
  selectedModelId: string;
  useServerConfig: boolean;
}

export function AISettingsModal({ isOpen, onClose }: AISettingsModalProps) {
  // 통합된 설정 상태 (초기값: 환경변수/localStorage에서 로드)
  const [settings, setSettings] = useState<AISettings>(() => {
    const savedSettings = getAISettings();
    return {
      provider: savedSettings.provider,
      apiKey: savedSettings.apiKey,
      selectedModelId: savedSettings.selectedModel,
      useServerConfig: savedSettings.useServerConfig,
    };
  });

  // UI 관련 상태 (별도 관리)
  const [isEnvConfigured, setIsEnvConfigured] = useState(() => getAISettings().isEnvConfigured);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('claude'); // Claude 기본 카테고리
  const [searchQuery, setSearchQuery] = useState(''); // Phase 3.2: 검색 추가
  const [showAdvanced, setShowAdvanced] = useState(false); // 고급 설정 토글 (기본: Anthropic만)

  // 설정 로드 (모달 열릴 때마다 최신 설정 반영)
  useEffect(() => {
    if (isOpen) {
      const savedSettings = getAISettings();
      setSettings({
        provider: savedSettings.provider,
        apiKey: savedSettings.apiKey,
        selectedModelId: savedSettings.selectedModel,
        useServerConfig: savedSettings.useServerConfig,
      });
      setIsEnvConfigured(savedSettings.isEnvConfigured);
    }
  }, [isOpen]);

  // 설정 부분 업데이트 헬퍼
  const updateSettings = (partial: Partial<AISettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  // 프로바이더 변경 핸들러 (자동 동기화)
  const handleProviderChange = (provider: Provider) => {
    updateSettings({
      provider,
      selectedModelId: getDefaultModel(provider),
      apiKey: '',
      useServerConfig: provider !== 'openrouter',
    });
  };

  // API 키 검증 (메모이제이션)
  const isValidKey = useMemo(
    () => isValidAPIKey(settings.provider, settings.apiKey),
    [settings.provider, settings.apiKey]
  );

  // 저장 핸들러
  const handleSave = () => {
    setIsSaving(true);

    // 설정 저장
    saveProvider(settings.provider);
    saveUseServerConfig(settings.useServerConfig);

    // 서버 설정 미사용 시에만 API 키 저장
    if (!settings.useServerConfig && !isEnvConfigured && settings.apiKey) {
      setAPIKey(settings.provider, settings.apiKey);
    }
    setSelectedModel(settings.selectedModelId);

    // Phase 3.3: 최근 사용 모델에 추가
    addRecentModel(settings.provider, settings.selectedModelId);

    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 500);
  };

  // Phase 3.2: OpenRouter 모델 검색 및 필터링
  const filteredOpenRouterModels = useMemo(() => {
    let models = [...OPENROUTER_MODELS]; // spread로 배열 복사 (readonly tuple → mutable array)

    // 카테고리 필터
    if (activeCategory) {
      models = models.filter(m => m.category === activeCategory);
    }

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      models = models.filter(
        m =>
          m.name.toLowerCase().includes(query) ||
          m.id.toLowerCase().includes(query) ||
          m.provider.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query)
      );
    }

    return models;
  }, [activeCategory, searchQuery]);

  // Phase 3.3: 최근 사용 모델
  const recentModels = useMemo(
    () => getRecentModels(settings.provider),
    [settings.provider]
  );

  // 직접 연동 모델 목록
  const directModels = settings.provider !== 'openrouter'
    ? DIRECT_MODELS[settings.provider as keyof typeof DIRECT_MODELS] || []
    : [];

  // 저장 버튼 활성화 조건
  const canSave = settings.useServerConfig || isValidKey || isEnvConfigured;

  // 선택된 모델 이름 가져오기
  const getSelectedModelName = () => {
    if (settings.provider === 'openrouter') {
      return getModelInfo(settings.selectedModelId)?.name || settings.selectedModelId;
    }
    const modelInfo = getDirectModelInfo(settings.provider, settings.selectedModelId);
    return modelInfo?.name || settings.selectedModelId;
  };

  // 최근 모델 이름 가져오기
  const getModelName = (modelId: string) => {
    if (settings.provider === 'openrouter') {
      return getModelInfo(modelId)?.name || modelId;
    }
    return getDirectModelInfo(settings.provider, modelId)?.name || modelId;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="AI 설정"
      size="lg"
    >
      <div className="space-y-6">
        {/* 환경변수 설정 안내 */}
        {isEnvConfigured && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                환경변수로 API 키가 설정됨
              </span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1 ml-6">
              .env.local 파일의 환경변수 사용 중
            </p>
          </div>
        )}

        {/* 프로바이더 선택 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Bot className="h-4 w-4" />
              AI 프로바이더
            </label>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {showAdvanced ? '기본 설정' : '고급 설정'}
            </button>
          </div>

          {/* 기본: Anthropic만 표시 */}
          {!showAdvanced ? (
            <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">🟣</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    Anthropic Claude (권장)
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    최고 성능의 AI 모델 • Claude Sonnet 4.5
                  </p>
                </div>
                <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                ✅ Function Calling 완벽 지원 • 코딩 최적화 • 안정적인 성능
              </div>
            </div>
          ) : (
            /* 고급: 모든 프로바이더 표시 */
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    settings.provider === p.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {p.name}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {p.description}
                    </p>
                  </div>
                  {settings.provider === p.id && (
                    <Check className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Phase 3.4: 서버 설정 사용 토글 (개선된 안내) */}
        {settings.provider !== 'openrouter' && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.useServerConfig}
                  onChange={(e) => updateSettings({ useServerConfig: e.target.checked })}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${
                  settings.useServerConfig ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.useServerConfig ? 'translate-x-4' : ''
                  }`} />
                </div>
              </div>
              <div className="flex-1">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  API 키 설정 방식
                </span>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {settings.useServerConfig ? (
                    <>
                      ✅ <strong>환경변수 사용 (권장)</strong>: 서버의 .env.local에 저장된 API 키 자동 사용. 더 안전하고 키 입력 불필요.
                    </>
                  ) : (
                    <>
                      🔓 <strong>직접 입력</strong>: 브라우저 로컬스토리지에 API 키 저장. 빠른 테스트용, 보안 주의 필요.
                    </>
                  )}
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Anthropic 환경변수 안내 */}
        {settings.provider === 'anthropic' && !isEnvConfigured && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                환경변수 설정 필요
              </span>
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-2">
              Anthropic Claude는 환경변수만 지원합니다.
            </p>
            <div className="bg-gray-900 dark:bg-gray-800 p-2 rounded text-xs text-green-400 font-mono">
              # .env.local 파일에 추가<br/>
              ANTHROPIC_API_KEY=sk-ant-api03-...
            </div>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
            >
              API 키 발급받기
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* API 키 입력 (서버 설정 미사용 시에만 표시) */}
        {!isEnvConfigured && !settings.useServerConfig && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Key className="h-4 w-4" />
                {PROVIDERS.find(p => p.id === settings.provider)?.name} API 키
              </label>
              <a
                href={getApiKeyUrl(settings.provider)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
              >
                키 발급받기
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={(e) => updateSettings({ apiKey: e.target.value })}
                placeholder={getApiKeyPlaceholder(settings.provider)}
                className="pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  {showApiKey ? '숨기기' : '보기'}
                </button>
                {settings.apiKey && (
                  isValidKey ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )
                )}
              </div>
            </div>
            {settings.apiKey && !isValidKey && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                올바른 API 키 형식이 아닙니다
              </p>
            )}
          </div>
        )}

        {/* Phase 3.3: 최근 사용 모델 (OpenRouter 제외) */}
        {settings.provider !== 'openrouter' && recentModels.length > 0 && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Clock className="h-4 w-4" />
              최근 사용 모델
            </label>
            <div className="flex flex-wrap gap-2">
              {recentModels.map(modelId => (
                <button
                  key={modelId}
                  onClick={() => updateSettings({ selectedModelId: modelId })}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    settings.selectedModelId === modelId
                      ? 'bg-purple-600 text-white'
                      : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  }`}
                >
                  {getModelName(modelId)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 모델 선택 (OpenRouter) */}
        {settings.provider === 'openrouter' && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Bot className="h-4 w-4" />
              AI 모델 선택
            </label>

            {/* Phase 3.2: 검색 입력 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="모델 검색... (예: claude, gpt, gemini)"
                className="pl-10"
              />
            </div>

            {/* Phase 3.3: 최근 사용 모델 (OpenRouter) */}
            {recentModels.length > 0 && !searchQuery && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                  <Clock className="h-3 w-3" />
                  최근 사용
                </label>
                <div className="flex flex-wrap gap-2">
                  {recentModels.map(modelId => (
                    <button
                      key={modelId}
                      onClick={() => updateSettings({ selectedModelId: modelId })}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        settings.selectedModelId === modelId
                          ? 'bg-purple-600 text-white'
                          : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {getModelName(modelId)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 카테고리 탭 (검색 없을 때만 표시) */}
            {!searchQuery && (
              <div className="flex flex-wrap gap-1">
                {MODEL_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1 ${
                      activeCategory === cat.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* 모델 목록 */}
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto">
              {filteredOpenRouterModels.length > 0 ? (
                filteredOpenRouterModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => updateSettings({ selectedModelId: model.id })}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                      settings.selectedModelId === model.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {model.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {model.provider}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {model.description}
                      </p>
                    </div>
                    {settings.selectedModelId === model.id && (
                      <Check className="h-4 w-4 text-purple-600 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))
              ) : (
                <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
                  "{searchQuery}" 검색 결과 없음
                </div>
              )}
            </div>
          </div>
        )}

        {/* 모델 선택 (직접 연동) */}
        {settings.provider !== 'openrouter' && directModels.length > 0 && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Bot className="h-4 w-4" />
              모델 선택
            </label>
            <div className="grid grid-cols-1 gap-2">
              {directModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => updateSettings({ selectedModelId: model.id })}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                    settings.selectedModelId === model.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {model.name}
                      </span>
                      <Badge variant="default" className="text-xs">
                        <DollarSign className="h-3 w-3 mr-0.5" />
                        {model.price}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {model.description}
                    </p>
                  </div>
                  {settings.selectedModelId === model.id && (
                    <Check className="h-4 w-4 text-purple-600 flex-shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 선택된 설정 표시 */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">현재 선택:</span>
            <div className="flex items-center gap-2">
              <Badge variant="default">
                {PROVIDERS.find(p => p.id === settings.provider)?.name}
              </Badge>
              <Badge variant="info">
                {getSelectedModelName()}
              </Badge>
            </div>
          </div>
        </div>

        {/* 가격 안내 (DeepSeek) */}
        {settings.provider === 'deepseek' && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                가장 저렴한 옵션!
              </span>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 ml-6">
              DeepSeek V3: 입력 $0.28 / 출력 $0.42 (1M 토큰당)
            </p>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button
          onClick={handleSave}
          isLoading={isSaving}
          disabled={!canSave}
        >
          <Settings className="h-4 w-4 mr-2" />
          저장
        </Button>
      </ModalFooter>
    </Modal>
  );
}
