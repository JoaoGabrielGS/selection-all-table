import type { User } from '@/types/user'

const FIRST_NAMES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Hugo',
  'Isabela', 'João', 'Karina', 'Lucas', 'Marina', 'Nicolas', 'Olívia',
  'Pedro', 'Queila', 'Rafael', 'Sofia', 'Thiago',
]

const LAST_NAMES = [
  'Almeida', 'Barbosa', 'Cardoso', 'Duarte', 'Esteves', 'Ferreira', 'Gomes',
  'Henrique', 'Ibrahim', 'Junqueira', 'Klein', 'Lima', 'Martins', 'Nogueira',
  'Oliveira', 'Pereira', 'Queiroz', 'Ramos', 'Silva', 'Teixeira',
]

export const ROLES = ['Administrador', 'Coordenador', 'Professor', 'Secretaria', 'Financeiro']

export const ALL_USERS: User[] = Array.from({ length: 100 }, (_, index) => {
  const id = index + 1
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length]
  const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length]

  return {
    id,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@empresa.com`,
    role: ROLES[index % ROLES.length],
  }
})

export interface PagedResult<T> {
  content: T[]
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}

export interface UserFilters {
  role?: string
  search?: string
}

export const matchesUserFilters = (user: User, filters: UserFilters): boolean => {
  if (filters.role && user.role !== filters.role) return false

  const needle = filters.search?.trim().toLowerCase()
  if (needle) {
    const haystack = `${user.name} ${user.email}`.toLowerCase()
    if (!haystack.includes(needle)) return false
  }

  return true
}

interface FetchUsersParams extends UserFilters {
  page: number
  pageSize: number
}

export const simulateFetchUsers = ({ page, pageSize, role, search }: FetchUsersParams): Promise<PagedResult<User>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const filtered = ALL_USERS.filter((user) => matchesUserFilters(user, { role, search }))

      const start = (page - 1) * pageSize
      const content = filtered.slice(start, start + pageSize)

      resolve({
        content,
        page,
        pageSize,
        totalElements: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      })
    }, 400)
  })
}
