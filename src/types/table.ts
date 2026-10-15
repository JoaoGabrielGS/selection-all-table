import type { ReactNode } from 'react'

import type { SelectionType } from '@/enums/selection-type'

export interface SelectionState {
  selectionType: SelectionType
  ids: (string | number)[]
}

export interface Column<T> {
  header: string
  accessorKey: keyof T
  width?: string
  className?: string
  render?: (item: T) => ReactNode
}
