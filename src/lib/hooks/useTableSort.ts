import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
  key: keyof T | string;
  direction: SortDirection;
}

export function useTableSort<T>(items: T[], initialSortKey: keyof T | string | null = null, initialDirection: SortDirection = 'asc') {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(
    initialSortKey ? { key: initialSortKey, direction: initialDirection } : null
  );

  const sortedItems = useMemo(() => {
    const sortableItems = [...items];
    if (sortConfig !== null) {
      sortableItems.sort((a: any, b: any) => {
        // Access values (handling path access if needed, simple key access for now)
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // Handle special array cases (e.g., length sorting)
        if (Array.isArray(valA) && Array.isArray(valB)) {
           valA = valA.length;
           valB = valB.length;
        }

        // Put nulls at end
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'string' && typeof valB === 'string') {
          const comparison = valA.localeCompare(valB, undefined, { sensitivity: 'base', numeric: true });
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }
        
        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key: keyof T | string) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return { items: sortedItems, requestSort, sortConfig };
}
