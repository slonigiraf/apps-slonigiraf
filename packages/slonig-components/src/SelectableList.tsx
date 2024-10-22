import React, { useState, useCallback, useEffect } from 'react';
import { Button, Table } from '@polkadot/react-components';
import { useTranslation } from './translate.js';

interface SelectableListProps<T> {
  items: T[];
  renderItem: (
    item: T,
    isSelected: boolean,
    isSelectionAllowed: boolean,
    onToggleSelection: (item: T) => void,
    handleItemUpdate?: (item: T) => void,
  ) => React.ReactNode;
  onSelectionChange: (selectedItems: T[]) => void;
  onItemsUpdate?: (selectedItems: T[]) => void;
  maxSelectableItems?: number;
  isSelectionAllowed?: boolean;
  className?: string;
  additionalControls?: React.ReactNode;
  keyExtractor: (item: T) => string;
  key: string | number;
  header?: ([React.ReactNode?, string?, number?, (() => void)?] | false | null | undefined)[];
}

function SelectableList<T>({
  items,
  renderItem,
  onSelectionChange,
  onItemsUpdate,
  maxSelectableItems = Infinity,
  isSelectionAllowed = true,
  className = '',
  additionalControls,
  keyExtractor,
  key,
  header,
}: SelectableListProps<T>): React.ReactElement {
  const { t } = useTranslation();
  const [updatedItems, setUpdatedItems] = useState(items);
  const [selectedItems, setSelectedItems] = useState<T[]>([]);

  useEffect(() => {
    const shouldUpdateItems = 
      items.length !== updatedItems.length || 
      items.some((item, index) => {
        // Ensure both item and updatedItems[index] are defined
        if (!item || !updatedItems[index]) return true;
        return keyExtractor(item) !== keyExtractor(updatedItems[index]);
      });
  
    if (shouldUpdateItems) {
      // Update only the items that differ by their keys
      const newUpdatedItems = items.map((item, index) => {
        // Ensure item and updatedItems[index] are defined before accessing their keys
        if (!item || !updatedItems[index]) return item; 
        return keyExtractor(item) === keyExtractor(updatedItems[index])
          ? updatedItems[index]
          : item;
      });
  
      setUpdatedItems(newUpdatedItems);
    }
  }, [items, updatedItems]);

  useEffect(() => {
    onItemsUpdate && onItemsUpdate(updatedItems);
  }, [updatedItems, onItemsUpdate]);

  const handleItemUpdate = useCallback((updatedItem: T) => {
    setUpdatedItems((prevItems) =>
      prevItems.map((item) =>
        keyExtractor(item) === keyExtractor(updatedItem) ? updatedItem : item
      )
    );
  }, [keyExtractor]);

  useEffect(() => {
    onSelectionChange(selectedItems);
  }, [selectedItems, onSelectionChange]);

  const toggleItemSelection = (item: T) => {
    setSelectedItems((prevSelected) => {
      const isSelected = prevSelected.some((i) => keyExtractor(i) === keyExtractor(item));
      let newSelected;

      if (isSelected) {
        newSelected = prevSelected.filter((i) => keyExtractor(i) !== keyExtractor(item));
      } else if (prevSelected.length < maxSelectableItems) {
        newSelected = [...prevSelected, item];
      } else {
        return prevSelected;
      }

      return newSelected;
    });
  };

  const selectAll = useCallback(() => {
    const allSelectable = updatedItems.slice(0, maxSelectableItems);
    setSelectedItems(allSelectable);
  }, [updatedItems, maxSelectableItems]);

  const deselectAll = useCallback(() => {
    setSelectedItems([]);
  }, []);

  return (
    <div className={className} key={key}>
      {isSelectionAllowed && (
        <div className="ui--row">
          {selectedItems.length === 0 ? (
            <Button icon="square" label={t('Select all')} onClick={selectAll} />
          ) : (
            <Button icon="check" label={t('Deselect all')} onClick={deselectAll} />
          )}
          {additionalControls}
        </div>
      )}
      <Table
        empty={t('No items available')}
        header={header}
      >
        {updatedItems.map((item) => (
          <tr key={keyExtractor(item)}>
            <td>
              {renderItem(
                item,
                selectedItems.some((selectedItem) => keyExtractor(selectedItem) === keyExtractor(item)),
                isSelectionAllowed,
                toggleItemSelection,
                handleItemUpdate
              )}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

// Wrap with React.memo and preserve the generic type parameter
const MemoizedSelectableList = React.memo(
  SelectableList
) as <T>(props: SelectableListProps<T>) => React.ReactElement;

export default MemoizedSelectableList;