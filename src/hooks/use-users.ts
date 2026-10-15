import { useEffect, useState } from 'react'

import { simulateFetchUsers } from '@/lib/mock-users'
import type { User } from '@/types/user'

export const useUsers = (pageSize = 10) => {
  const [page, setPage] = useState(1)
  const [role, setRoleState] = useState('')
  const [search, setSearchState] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [totalElements, setTotalElements] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    simulateFetchUsers({ page, pageSize, role: role || undefined, search: search || undefined })
      .then((result) => {
        if (!isMounted) return
        setUsers(result.content)
        setTotalElements(result.totalElements)
      })
      .catch(() => {
        if (isMounted) setError('Não foi possível carregar os usuários.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [page, pageSize, role, search])

  const setRole = (newRole: string) => {
    setRoleState(newRole)
    setPage(1)
  }

  const setSearch = (newSearch: string) => {
    setSearchState(newSearch)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize))

  return {
    users,
    isLoading,
    error,
    page,
    setPage,
    pageSize,
    role,
    setRole,
    search,
    setSearch,
    totalElements,
    totalPages,
  }
}
