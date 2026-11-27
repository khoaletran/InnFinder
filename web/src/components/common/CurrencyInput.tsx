import React, { useLayoutEffect, useRef, useState } from 'react';
import { formatCurrencyInput } from '@/utils/formatters';

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string | number | null | undefined;
  onValueChange: (digits: string) => void;
}

const ALLOWED_CONTROL_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Enter',
  'Escape',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
]);

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onValueChange,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  inputMode = 'numeric',
  autoComplete = 'off',
  ...rest
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const pendingDigitsBeforeCursorRef = useRef<number | null>(null);
  const [composingDraft, setComposingDraft] = useState<string | null>(null);

  const formattedValue = formatCurrencyInput(value);
  const displayValue = composingDraft ?? formattedValue;

  useLayoutEffect(() => {
    const el = inputRef.current;
    const digitsBefore = pendingDigitsBeforeCursorRef.current;
    if (!el || digitsBefore === null || isComposingRef.current) return;

    pendingDigitsBeforeCursorRef.current = null;
    let seenDigits = 0;
    let nextPos = el.value.length;
    for (let i = 0; i < el.value.length; i += 1) {
      if (/\d/.test(el.value[i])) {
        seenDigits += 1;
      }
      if (seenDigits >= digitsBefore) {
        nextPos = i + 1;
        break;
      }
    }
    if (digitsBefore === 0) nextPos = 0;
    try {
      el.setSelectionRange(nextPos, nextPos);
    } catch {
      // ignore if input doesn't support selectionRange
    }
  }, [displayValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (ALLOWED_CONTROL_KEYS.has(e.key)) return;
    // Cho phép Process key (IME) đi qua để xử lý trong compositionEnd
    if (e.key === 'Process') return;
    if (e.key.length === 1 && !/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const commitDigits = (rawValue: string, selectionEnd: number | null) => {
    if (selectionEnd !== null) {
      const prefix = rawValue.slice(0, selectionEnd);
      pendingDigitsBeforeCursorRef.current = prefix.replace(/\D/g, '').length;
    }
    const digits = rawValue.replace(/\D/g, '');
    onValueChange(digits);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isComposingRef.current) {
      setComposingDraft(e.target.value);
      return;
    }
    commitDigits(e.target.value, e.target.selectionStart);
  };

  const handleCompositionStart = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = true;
    onCompositionStart?.(e);
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
    setComposingDraft(null);
    commitDigits(e.currentTarget.value, e.currentTarget.selectionStart);
    onCompositionEnd?.(e);
  };

  return (
    <input
      {...rest}
      ref={inputRef}
      type="text"
      inputMode={inputMode}
      autoComplete={autoComplete}
      lang="en"
      value={displayValue}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
    />
  );
};
