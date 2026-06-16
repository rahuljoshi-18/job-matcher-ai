'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TagInput({
  value = [],
  onChange,
  placeholder = 'Type and press Enter...',
  disabled = false,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addTag = React.useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue('');
    }
  }, [inputValue, value, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Auto-split on commas or semicolons
    if (val.includes(',') || val.includes(';')) {
      const parts = val
        .split(/[,;]/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0 && !value.includes(p));
      if (parts.length > 0) {
        onChange([...value, ...parts]);
      }
      setInputValue('');
    } else {
      setInputValue(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      // Remove the last tag on backspace when input is empty
      const newValue = [...value];
      newValue.pop();
      onChange(newValue);
    }
  };

  const handleBlur = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
  };

  const handleRemove = (tagToRemove: string) => {
    if (disabled) return;
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const focusInput = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  return (
    <div
      onClick={focusInput}
      className={cn(
        'flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-text transition-colors',
        'focus-within:border-primary focus-within:ring-1 focus-within:ring-primary focus-within:ring-offset-0',
        disabled && 'cursor-not-allowed opacity-50 bg-muted',
        className
      )}
    >
      {value.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-md text-sm font-medium transition-all duration-200 border bg-secondary/60 hover:bg-secondary border-secondary shrink-0 select-none animate-in fade-in zoom-in-95 duration-100"
        >
          <span>{tag}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              handleRemove(tag);
            }}
            className="flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground outline-none transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </Badge>
      ))}
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        placeholder={value.length === 0 ? placeholder : ''}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="flex-1 bg-transparent min-w-[140px] text-sm outline-none border-none p-0 focus:ring-0 placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
    </div>
  );
}
