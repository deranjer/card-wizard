import { useEffect, useRef, useState } from 'react';
import { TextInput, type TextInputProps } from '@mantine/core';

interface DebouncedTextCellProps extends Omit<TextInputProps, 'value' | 'onChange'> {
  value: string;
  onCommit: (value: string) => void;
  /** ms to wait after the last keystroke before committing (blur commits now). */
  delay?: number;
}

/**
 * A spreadsheet text cell that stays responsive under fast typing: keystrokes
 * update local state immediately but only push to the store after a short
 * pause (or on blur). Without this, every keystroke rebuilt the whole game
 * object and walked the store subscribers.
 */
export function DebouncedTextCell({
  value,
  onCommit,
  delay = 250,
  ...rest
}: DebouncedTextCellProps) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const committed = useRef(value);

  // Resync when the prop changes for a reason other than our own commit
  // (undo/redo, an import) — but not while the user is mid-edit.
  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      setLocal(value);
    }
  }, [value]);

  const flush = (next: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (next !== committed.current) {
      committed.current = next;
      onCommit(next);
    }
  };

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return (
    <TextInput
      {...rest}
      value={local}
      onChange={(e) => {
        const next = e.currentTarget.value;
        setLocal(next);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => flush(next), delay);
      }}
      onBlur={(e) => {
        flush(e.currentTarget.value);
        rest.onBlur?.(e);
      }}
    />
  );
}
