import { Check, ChevronLeft, ChevronRight, Inbox, Minus, X } from 'lucide-react'

import { SelectionType } from '@/enums/selection-type'
import { cn } from '@/lib/utils'
import type { Column, SelectionState } from '@/types/table'

interface TableCheckboxProps {
  checked: boolean
  partial?: boolean
  disabled?: boolean
  onClick?: () => void
}

const TableCheckbox = ({ checked, partial = false, disabled, onClick }: TableCheckboxProps) => {
  const isActive = checked || partial

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={partial ? 'mixed' : checked}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900',
        isActive
          ? 'border-purple-600 bg-purple-600 text-white'
          : 'border-gray-300 bg-white hover:border-purple-400 dark:border-gray-600 dark:bg-transparent',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {partial ? <Minus size={14} /> : checked ? <Check size={14} /> : null}
    </button>
  )
}

interface SelectionBarProps {
  selection: SelectionState
  totalCount: number
  onSelectAll: () => void
  onClear: () => void
}

const SelectionBar = ({ selection, totalCount, onSelectAll, onClear }: SelectionBarProps) => {
  const isAllSelected = selection.selectionType === SelectionType.ALL && selection.ids.length === 0
  const hasSpecificSelection = selection.selectionType === SelectionType.IN && selection.ids.length >= 1
  const isAllExcept =
    (selection.selectionType === SelectionType.ALL && selection.ids.length > 0) ||
    selection.selectionType === SelectionType.NOT_IN

  const isPartial = hasSpecificSelection || isAllExcept

  const label = isAllSelected
    ? 'Todos selecionados'
    : isAllExcept
      ? `Todos selecionados, exceto ${selection.ids.length}`
      : hasSpecificSelection
        ? `${selection.ids.length} selecionado${selection.ids.length > 1 ? 's' : ''}`
        : `Selecionar todos (${totalCount})`

  const hasAny = isAllSelected || isPartial

  return (
    <div
      className={cn(
        'flex items-center gap-3 border-b px-4 py-3 text-sm transition-colors',
        hasAny
          ? 'border-purple-100 bg-purple-50 text-purple-900 dark:border-purple-900/50 dark:bg-purple-950/30 dark:text-purple-100'
          : 'border-gray-100 bg-white text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300',
      )}
    >
      <TableCheckbox
        checked={isAllSelected}
        partial={isPartial}
        onClick={isAllSelected ? onClear : onSelectAll}
      />
      <span className={cn(hasAny && 'font-medium')}>{label}</span>
      {hasAny && (
        <button
          type="button"
          onClick={onClear}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100 dark:text-purple-300 dark:hover:bg-purple-900/40"
        >
          <X size={14} />
          Limpar seleção
        </button>
      )}
    </div>
  )
}

export interface PaginationProps {
  page: number
  totalPages: number
  totalElements: number
  onPageChange: (page: number) => void
}

const pageButton =
  'flex size-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'

const TablePagination = ({ page, totalPages, totalElements, onPageChange }: PaginationProps) => {
  return (
    <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
      <span>
        <strong className="font-semibold text-gray-900 dark:text-gray-100">{totalElements}</strong>{' '}
        {totalElements === 1 ? 'registro' : 'registros'}
      </span>
      <div className="flex items-center gap-3">
        <span className="tabular-nums">
          Página {page} de {totalPages}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={pageButton}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Próxima página"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={pageButton}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

interface GenericTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyField: keyof T
  selection?: SelectionState
  onToggleOne?: (id: string | number) => void
  onSelectAll?: () => void
  onClear?: () => void
  isSelected?: (id: string | number) => boolean
  isLoading?: boolean
  emptyMessage?: string
  pagination?: PaginationProps
}

export const GenericTable = <T,>({
  data,
  columns,
  keyField,
  selection,
  onToggleOne,
  onSelectAll,
  onClear,
  isSelected,
  isLoading,
  emptyMessage = 'Nenhum registro encontrado.',
  pagination,
}: GenericTableProps<T>) => {
  const hasSelection = Boolean(selection && onToggleOne && onSelectAll && onClear && isSelected)
  const colSpan = columns.length + (hasSelection ? 1 : 0)

  const skeletonRows = Array.from({ length: 10 }, (_, index) => index)

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {hasSelection && selection && (
        <SelectionBar
          selection={selection}
          totalCount={pagination?.totalElements ?? data.length}
          onSelectAll={onSelectAll!}
          onClear={onClear!}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-800/40">
              {hasSelection && <th className="w-12 px-4 py-3" />}
              {columns.map((column) => (
                <th
                  key={String(column.accessorKey)}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400',
                    column.className,
                  )}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading &&
              skeletonRows.map((index) => (
                <tr key={index}>
                  {Array.from({ length: colSpan }, (_, cell) => (
                    <td key={cell} className="px-4 py-3.5">
                      <div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">
                  <Inbox size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  {emptyMessage}
                </td>
              </tr>
            )}

            {!isLoading &&
              data.map((row) => {
                const rawId = row[keyField] as unknown as string | number
                const rowChecked = hasSelection && isSelected ? isSelected(rawId) : false

                return (
                  <tr
                    key={String(rawId)}
                    onClick={() => hasSelection && onToggleOne?.(rawId)}
                    className={cn(
                      'transition-colors',
                      hasSelection && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      rowChecked && 'bg-purple-50/70 hover:bg-purple-50 dark:bg-purple-950/20 dark:hover:bg-purple-950/30',
                    )}
                  >
                    {hasSelection && (
                      <td className="px-4 py-3">
                        <TableCheckbox checked={rowChecked} onClick={() => onToggleOne?.(rawId)} />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={String(column.accessorKey)} className="px-4 py-3 text-gray-700 dark:text-gray-200">
                        {column.render ? column.render(row) : String(row[column.accessorKey] ?? '')}
                      </td>
                    ))}
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {pagination && <TablePagination {...pagination} />}
    </div>
  )
}
