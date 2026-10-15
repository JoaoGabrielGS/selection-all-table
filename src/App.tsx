import { Filter, Search } from 'lucide-react'

import { GenericTable } from '@/components/GenericTable'
import { SelectionType } from '@/enums/selection-type'
import { useTableSelection } from '@/hooks/use-table-selection'
import { useUsers } from '@/hooks/use-users'
import { ALL_USERS, matchesUserFilters, ROLES } from '@/lib/mock-users'
import { buildSelectionPayload } from '@/lib/selection'
import { cn } from '@/lib/utils'
import type { Column } from '@/types/table'
import type { User } from '@/types/user'

const ROLE_STYLES: Record<string, string> = {
  Administrador: 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-300 dark:ring-purple-400/30',
  Coordenador: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/30',
  Professor: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/30',
  Secretaria: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/30',
  Financeiro: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30',
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

const columns: Column<User>[] = [
  {
    header: 'Nome',
    accessorKey: 'name',
    render: (user) => (
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {getInitials(user.name)}
        </span>
        <span className="font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
      </div>
    ),
  },
  {
    header: 'E-mail',
    accessorKey: 'email',
    render: (user) => <span className="text-gray-500 dark:text-gray-400">{user.email}</span>,
  },
  {
    header: 'Perfil',
    accessorKey: 'role',
    render: (user) => (
      <span
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
          ROLE_STYLES[user.role] ?? 'bg-gray-50 text-gray-700 ring-gray-600/20',
        )}
      >
        {user.role}
      </span>
    ),
  },
]

const fieldClass =
  'w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'

const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'

const codeBlockClass =
  'overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-left font-mono text-xs leading-relaxed text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200'

function App() {
  const { users, isLoading, error, page, setPage, role, setRole, search, setSearch, totalElements, totalPages } =
    useUsers(10)
  const { selection, toggleOne, selectAll, clearSelection, isSelected } = useTableSelection()

  const selectionScope =
    selection.selectionType === SelectionType.ALL
      ? ALL_USERS.filter((user) => matchesUserFilters(user, { role, search }))
      : ALL_USERS
  const selectedUsers = selectionScope.filter((user) => isSelected(user.id))

  const selectionPayload = buildSelectionPayload(selection, { role, search })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Usuários</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tabela com seleção "todos" reaproveitando o mesmo modelo de seleção usado no ERP.
          </p>
        </header>

        <div className="mb-4 grid gap-3 sm:grid-cols-[14rem_1fr]">
          <div>
            <label htmlFor="role-filter" className={labelClass}>
              Perfil
            </label>
            <div className="relative">
              <Filter size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                id="role-filter"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className={fieldClass}
              >
                <option value="">Todos os perfis</option>
                {ROLES.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {roleOption}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="search-filter" className={labelClass}>
              Buscar
            </label>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="search-filter"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome ou e-mail..."
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        )}

        <GenericTable
          data={users}
          columns={columns}
          keyField="id"
          isLoading={isLoading}
          selection={selection}
          onToggleOne={toggleOne}
          onSelectAll={selectAll}
          onClear={clearSelection}
          isSelected={isSelected}
          pagination={{ page, totalPages, totalElements, onPageChange: setPage }}
        />

        <section className="mt-10">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Usuários selecionados{' '}
            <span className="ml-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
              {selectedUsers.length}
            </span>
          </h2>
          <p className="mb-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            Resolvido aqui no client só pra essa demo (temos os 100 registros em memória). Numa API real, com
            páginas não carregadas, quem resolve isso é o backend — veja o payload abaixo.
          </p>
          <pre className={cn(codeBlockClass, 'max-h-80')}>{JSON.stringify(selectedUsers, null, 2)}</pre>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Payload enviado ao backend</h2>
          <p className="mb-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            Nunca a lista resolvida: só o modo, as exceções e o filtro ativo. O backend reaplica o filtro pra
            calcular quem de fato é afetado.
          </p>
          <pre className={codeBlockClass}>{JSON.stringify(selectionPayload, null, 2)}</pre>
        </section>
      </div>
    </div>
  )
}

export default App
