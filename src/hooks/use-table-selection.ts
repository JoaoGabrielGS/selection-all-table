import { useCallback, useState } from 'react'

import { SelectionType } from '@/enums/selection-type'
import type { SelectionState } from '@/types/table'

const DEFAULT_SELECTION: SelectionState = {
  selectionType: SelectionType.IN,
  ids: [],
}

export const useTableSelection = (initialSelection?: SelectionState) => {
  const [selection, setSelection] = useState<SelectionState>(
    initialSelection ?? DEFAULT_SELECTION,
  )

  const isSelected = useCallback(
    (id: string | number) => {
      const { selectionType, ids } = selection
      const strId = String(id)

      if (selectionType === SelectionType.ALL) {
        return !ids.some((i) => String(i) === strId)
      }

      return ids.some((i) => String(i) === strId)
    },
    [selection],
  )

  const toggleOne = useCallback((id: string | number) => {
    setSelection((prev) => {
      const { selectionType, ids } = prev
      const strId = String(id)
      const exists = ids.some((i) => String(i) === strId)

      if (selectionType === SelectionType.IN) {
        return {
          selectionType: SelectionType.IN,
          ids: exists ? ids.filter((i) => String(i) !== strId) : [...ids, id],
        }
      }

      return {
        selectionType: SelectionType.ALL,
        ids: exists ? ids.filter((i) => String(i) !== strId) : [...ids, id],
      }
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelection({ selectionType: SelectionType.ALL, ids: [] })
  }, [])

  const clearSelection = useCallback(() => {
    setSelection(DEFAULT_SELECTION)
  }, [])

  return { selection, setSelection, toggleOne, selectAll, clearSelection, isSelected }
}
