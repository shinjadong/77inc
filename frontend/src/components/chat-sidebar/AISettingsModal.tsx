'use client';

import { useState, useEffect } from 'react';
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
  getDefaultModelForProvider,
} from '@/lib/ai/settings-store';
import { resetChatInstance } from './ChatSidebar';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AISettingsModal({ isOpen, onClose }: AISettingsModalProps) {
  const [provider, setProviderState] = useState<Provider>('deepseek');
  const [apiKey, setApiKeyState] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string>('deepseek-chat');
  const [isEnvConfigured, setIsEnvConfigured] = useState(false);
  const [isValidKey, setIsValidKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('claude');
  const [useServerConfig, setUseServerConfigState] = useState(true);

  // 설정 로드
  useEffect(() => {
    if (isOpen) {
      const settings = getAISettings();
      setProviderState(settings.provider);
      setApiKeyState(settings.apiKey);
      setSelectedModelId(settings.selectedModel);
      setIsEnvConfigured(settings.isEnvConfigured);
      setIsValidKey(isValidAPIKey(settings.provider, settings.apiKey));
      setUseServerConfigState(settings.useServerConfig);
    }
  }, [isOpen]);

  // 프로바이더 변경 핸들러
  const handleProviderChange = (newProvider: Provider) => {
    setProviderState(newProvider);
    setApiKeyState(''); // API 키 초기화
    setIsValidKey(false);
    // 기본 모델로 변경
    setSelectedModelId(getDefaultModelForProvider(newProvider));
    // OpenRouter 제외 시 서버 설정 기본 사용
    if (newProvider !== 'openrouter') {
      setUseServerConfigState(true);
    }
  };

  // API 키 변경 핸들러
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setApiKeyState(value);
    setIsValidKey(isValidAPIKey(provider, value));
  };

  // 저장 핸들러
  const handleSave = () => {
    setIsSaving(true);

    // 프로바이더 저장
    saveProvider(provider);

    // 서버 설정 사용 여부 저장
    saveUseServerConfig(useServerConfig);

    // 서버 설정 사용하지 않는 경우에만 API 키 저장
    if (!useServerConfig && !isEnvConfigured && apiKey) {
      setAPIKey(provider, apiKey);
    }
    setSelectedModel(selectedModelId);

    // 채팅 인스턴스 리셋 (새 설정 적용)
    resetChatInstance();

    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 500);
  };

  // OpenRouter 모델 필터링
  const filteredOpenRouterModels = OPENROUTER_MODELS.filter(m => m.category === activeCategory);

  // 직접 연동 모델 목록
  const directModels = provider !== 'openrouter'
    ? DIRECT_MODELS[provider as keyof typeof DIRECT_MODELS] || []
    : [];

  // 저장 버튼 활성화 조건: 서버 설정 사용 시 항상 저장 가능
  const canSave = useServerConfig || isValidKey || isEnvConfigured;

  // 현재 선택된 모델 이름 가져오기
  const getSelectedModelName = () => {
    if (provider === 'openrouter') {
      return getModelInfo(selectedModelId)?.name || selectedModelId;
    }
    const modelInfo = getDirectModelInfo(provider, selectedModelId);
    return modelInfo?.name || selectedModelId;
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
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Bot className="h-4 w-4" />
            AI 프로바이더 선택
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                  provider === p.id
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
                {provider === p.id && (
                  <Check className="h-4 w-4 text-purple-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 서버 설정 사용 토글 (OpenRouter 제외) */}
        {provider !== 'openrouter' && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={useServerConfig}
                  onChange={(e) => setUseServerConfigState(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${
                  useServerConfig ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    useServerConfig ? 'translate-x-4' : ''
                  }`} />
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  서버 설정 사용
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  .env.local의 API 키 자동 적용 (권장)
                </p>
              </div>
            </label>
          </div>
        )}

        {/* API 키 입력 (서버 설정 미사용 시에만 표시) */}
        {!isEnvConfigured && !useServerConfig && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <Key className="h-4 w-4" />
                {PROVIDERS.find(p => p.id === provider)?.name} API 키
              </label>
              <a
                href={getApiKeyUrl(provider)}
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
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder={getApiKeyPlaceholder(provider)}
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
                {apiKey && (
                  isValidKey ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )
                )}
              </div>
            </div>
            {apiKey && !isValidKey && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                올바른 API 키 형식이 아닙니다
              </p>
            )}
          </div>
        )}

        {/* 모델 선택 (OpenRouter) */}
        {provider === 'openrouter' && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Bot className="h-4 w-4" />
              AI 모델 선택
            </label>

            {/* 카테고리 탭 */}
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

            {/* 모델 목록 */}
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto">
              {filteredOpenRouterModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                    selectedModelId === model.id
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
                  {selectedModelId === model.id && (
                    <Check className="h-4 w-4 text-purple-600 flex-shrink-0 ml-2" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 모델 선택 (직접 연동) */}
        {provider !== 'openrouter' && directModels.length > 0 && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Bot className="h-4 w-4" />
              모델 선택
            </label>
            <div className="grid grid-cols-1 gap-2">
              {directModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                    selectedModelId === model.id
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
                  {selectedModelId === model.id && (
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
                {PROVIDERS.find(p => p.id === provider)?.name}
              </Badge>
              <Badge variant="info">
                {getSelectedModelName()}
              </Badge>
            </div>
          </div>
        </div>

        {/* 가격 안내 (DeepSeek) */}
        {provider === 'deepseek' && (
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
