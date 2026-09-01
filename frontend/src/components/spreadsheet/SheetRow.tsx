import { memo } from 'react';
import { Table, TextInput, NumberInput, Select, Group, ActionIcon } from '@mantine/core';
import { IconTrash, IconFolder } from '@tabler/icons-react';
import type { Card, FieldDefinition } from '../../types';
import { ImageLoader } from '../ImageLoader';

export interface SheetRowProps {
  card: Card;
  fields: FieldDefinition[];
  frontStyleOptions: { value: string; label: string }[];
  backStyleOptions: { value: string; label: string }[];
  compact: boolean;
  showRawValues: boolean;
  /** Callbacks are keyed by card id and must be referentially stable so
   *  `React.memo` can skip rows whose `card` did not change. */
  onChangeId: (cardId: string, nextId: string) => void;
  onChangeMeta: (cardId: string, field: keyof Card, value: unknown) => void;
  onChangeData: (cardId: string, field: string, value: unknown) => void;
  onSelectImage: (cardId: string, field: string) => void;
  onRemove: (cardId: string) => void;
}

function SheetRowImpl({
  card,
  fields,
  frontStyleOptions,
  backStyleOptions,
  compact,
  showRawValues,
  onChangeId,
  onChangeMeta,
  onChangeData,
  onSelectImage,
  onRemove,
}: SheetRowProps) {
  const size = compact ? 'xs' : 'sm';
  const pad = compact ? 4 : undefined;
  const cellInput = { input: { paddingLeft: pad, paddingRight: pad } };

  return (
    <Table.Tr>
      <Table.Td>
        <TextInput
          value={card.id}
          onChange={(e) => onChangeId(card.id, e.currentTarget.value)}
          variant="unstyled"
          size={size}
          styles={cellInput}
        />
      </Table.Td>
      <Table.Td>
        <NumberInput
          value={card.count || 1}
          onChange={(val) => onChangeMeta(card.id, 'count', Number(val))}
          min={1}
          size={size}
          variant="unstyled"
          styles={cellInput}
        />
      </Table.Td>
      <Table.Td>
        {showRawValues ? (
          <TextInput
            value={card.frontStyleId || ''}
            onChange={(e) => onChangeMeta(card.id, 'frontStyleId', e.currentTarget.value)}
            variant="unstyled"
            size={size}
            placeholder="default-front"
            styles={{
              input: {
                paddingLeft: pad,
                paddingRight: pad,
                color: card.frontStyleId ? undefined : 'var(--mantine-color-dimmed)',
              },
            }}
          />
        ) : (
          <Select
            data={frontStyleOptions}
            value={card.frontStyleId || ''}
            onChange={(val) => onChangeMeta(card.id, 'frontStyleId', val)}
            size={size}
            variant="unstyled"
            styles={cellInput}
          />
        )}
      </Table.Td>
      <Table.Td>
        {showRawValues ? (
          <TextInput
            value={card.backStyleId || ''}
            onChange={(e) => onChangeMeta(card.id, 'backStyleId', e.currentTarget.value)}
            variant="unstyled"
            size={size}
            placeholder="default-back"
            styles={{
              input: {
                paddingLeft: pad,
                paddingRight: pad,
                color: card.backStyleId ? undefined : 'var(--mantine-color-dimmed)',
              },
            }}
          />
        ) : (
          <Select
            data={backStyleOptions}
            value={card.backStyleId || ''}
            onChange={(val) => onChangeMeta(card.id, 'backStyleId', val)}
            size={size}
            variant="unstyled"
            styles={cellInput}
          />
        )}
      </Table.Td>
      {fields.map((field) => (
        <Table.Td key={field.name}>
          {field.type === 'text' ? (
            <TextInput
              value={card.data[field.name] || ''}
              onChange={(e) => onChangeData(card.id, field.name, e.currentTarget.value)}
              variant="unstyled"
              size={size}
              styles={cellInput}
            />
          ) : (
            <Group wrap="nowrap" gap="xs">
              {card.data[field.name] && (
                <ImageLoader
                  path={card.data[field.name]}
                  style={{
                    width: compact ? 24 : 30,
                    height: compact ? 24 : 30,
                    borderRadius: 4,
                    objectFit: 'cover',
                  }}
                />
              )}
              <TextInput
                placeholder="Image URL/Path"
                value={card.data[field.name] || ''}
                onChange={(e) => onChangeData(card.id, field.name, e.currentTarget.value)}
                variant="unstyled"
                size={size}
                style={{ flex: 1 }}
                styles={cellInput}
              />
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => onSelectImage(card.id, field.name)}
                size={size}
              >
                <IconFolder size={compact ? 12 : 14} />
              </ActionIcon>
            </Group>
          )}
        </Table.Td>
      ))}
      <Table.Td>
        <ActionIcon color="red" variant="subtle" onClick={() => onRemove(card.id)} size={size}>
          <IconTrash size={compact ? 14 : 16} />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  );
}

/**
 * One spreadsheet row. Memoised: with stable callbacks and option arrays from
 * the parent, a row only re-renders when its own `card` object changes
 * reference (which the id-keyed update helpers guarantee).
 */
export const SheetRow = memo(SheetRowImpl);
