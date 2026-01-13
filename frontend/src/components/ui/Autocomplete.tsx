'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChevronDown, X } from 'lucide-react';

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
  category?: string;
}

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  disabled?: boolean;
  onEnter?: () => void;
  onEscape?: () => void;
  autoFocus?: boolean;
  className?: string;
}

export function Autocomplete({
  value,
  onChange,
  options,
  placeholder = '검색...',
  disabled = false,
  onEnter,
  onEscape,
  autoFocus = false,
  className = '',
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // 필터링된 옵션
  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(value.toLowerCase()) ||
      option.value.toLowerCase().includes(value.toLowerCase()) ||
      (option.description?.toLowerCase().includes(value.toLowerCase()) ?? false)
  );

  // 카테고리별 그룹화
  const groupedOptions = filteredOptions.reduce<Record<string, AutocompleteOption[]>>(
    (acc, option) => {
      const category = option.category || '기타';
      if (!acc[category]) acc[category] = [];
      acc[category].push(option);
      return acc;
    },
    {}
  );

  // 자동 포커스
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

  // 하이라이트된 항목으로 스크롤
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('li[data-option]');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].value);
          setIsOpen(false);
          setHighlightedIndex(-1);
        }
        onEnter?.();
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        onEscape?.();
        break;
      case 'Tab':
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].value);
        }
        setIsOpen(false);
        break;
    }
  };

  const handleOptionClick = (option: AutocompleteOption) => {
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  let optionIndex = -1;

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full px-3 py-2 pr-16 text-sm
            border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed
          `}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <ul
          ref={listRef}
          className="
            absolute z-50 w-full mt-1 max-h-60 overflow-auto
            bg-white border border-gray-200 rounded-lg shadow-lg
          "
        >
          {Object.entries(groupedOptions).map(([category, categoryOptions]) => (
            <li key={category}>
              {Object.keys(groupedOptions).length > 1 && (
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                  {category}
                </div>
              )}
              <ul>
                {categoryOptions.map((option) => {
                  optionIndex++;
                  const currentIndex = optionIndex;
                  return (
                    <li
                      key={`${option.category}-${option.value}`}
                      data-option
                      onClick={() => handleOptionClick(option)}
                      className={`
                        px-3 py-2 cursor-pointer
                        ${
                          currentIndex === highlightedIndex
                            ? 'bg-blue-50 text-blue-700'
                            : 'hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="text-sm font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-gray-500">{option.description}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {isOpen && filteredOptions.length === 0 && value && (
        <div className="absolute z-50 w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm text-gray-500">결과가 없습니다. 직접 입력해주세요.</p>
        </div>
      )}
    </div>
  );
}
