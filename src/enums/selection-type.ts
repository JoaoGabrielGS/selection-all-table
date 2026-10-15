export const SelectionType = {
  IN: 'IN',
  ALL: 'ALL',
  NOT_IN: 'NOT_IN',
} as const

export type SelectionType = (typeof SelectionType)[keyof typeof SelectionType]
