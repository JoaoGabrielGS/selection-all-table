import type { SelectionState } from '@/types/table'

export interface SelectionPayload<F extends Record<string, unknown>> {
  selectionType: SelectionState['selectionType']
  ids: SelectionState['ids']
  filter?: F
}

export const buildSelectionPayload = <F extends Record<string, unknown>>(
  selection: SelectionState,
  filter: F,
): SelectionPayload<F> => {
  const activeFilter = Object.fromEntries(
    Object.entries(filter).filter(([, value]) => value !== undefined && value !== ''),
  ) as F

  return {
    selectionType: selection.selectionType,
    ids: selection.ids,
    ...(Object.keys(activeFilter).length > 0 ? { filter: activeFilter } : {}),
  }
}
