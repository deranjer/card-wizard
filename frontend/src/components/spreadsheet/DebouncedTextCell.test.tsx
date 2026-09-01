import { render, screen, fireEvent, act } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DebouncedTextCell } from './DebouncedTextCell';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(onCommit = vi.fn(), value = 'start') {
  render(
    <MantineProvider>
      <DebouncedTextCell value={value} onCommit={onCommit} delay={200} aria-label="cell" />
    </MantineProvider>
  );
  return { onCommit, input: screen.getByLabelText('cell') as HTMLInputElement };
}

describe('DebouncedTextCell', () => {
  it('commits once after the debounce, not per keystroke', () => {
    const { onCommit, input } = setup();

    fireEvent.change(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'ab' } });
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe('abc'); // local echo is immediate

    act(() => vi.advanceTimersByTime(200));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith('abc');
  });

  it('flushes immediately on blur', () => {
    const { onCommit, input } = setup();
    fireEvent.change(input, { target: { value: 'xyz' } });
    fireEvent.blur(input);
    expect(onCommit).toHaveBeenCalledExactlyOnceWith('xyz');
  });

  it('does not re-commit an unchanged value', () => {
    const { onCommit, input } = setup(vi.fn(), 'same');
    fireEvent.change(input, { target: { value: 'same' } });
    fireEvent.blur(input);
    expect(onCommit).not.toHaveBeenCalled();
  });
});
