import { memo } from 'react';
import { Table } from '@mantine/core';

interface ResizableHeaderCellProps {
  /** Stable key identifying this column in the width map. */
  columnKey: string;
  width: number;
  active: boolean;
  onResizeStart: (columnKey: string, e: React.MouseEvent) => void;
  children: React.ReactNode;
}

/**
 * A `<Table.Th>` with a drag handle on its right edge. Replaces the five
 * copy-pasted resize `<div>` blocks the spreadsheet header used to carry.
 */
export const ResizableHeaderCell = memo(function ResizableHeaderCell({
  columnKey,
  width,
  active,
  onResizeStart,
  children,
}: ResizableHeaderCellProps) {
  return (
    <Table.Th style={{ width, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {children}
        <div
          onMouseDown={(e) => onResizeStart(columnKey, e)}
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 5,
            cursor: 'col-resize',
            userSelect: 'none',
            backgroundColor: active ? 'var(--mantine-color-blue-6)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--mantine-color-blue-6)';
          }}
          onMouseLeave={(e) => {
            if (!active) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        />
      </div>
    </Table.Th>
  );
});
