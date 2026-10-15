# Tabela com seleção "todos": paginação, filtro e integração com o backend

Documentação de estudo sobre como implementar uma tabela que suporta "selecionar
todos" de forma correta mesmo quando os dados são paginados e filtrados — ou seja,
quando nem todas as linhas que deveriam ser afetadas estão carregadas no navegador.

Todo o código faz parte deste projeto (`erp-table-demo`) e reproduz o mesmo padrão
usado no `GenericTable` do erp-web.

## Índice

1. [O problema](#1-o-problema)
2. [O modelo de dados: IN / ALL / NOT_IN](#2-o-modelo-de-dados-in--all--not_in)
3. [O hook de seleção](#3-o-hook-de-seleção)
4. [Renderizando: checkbox por linha e barra "selecionar todos"](#4-renderizando-checkbox-por-linha-e-barra-selecionar-todos)
5. [Paginação não quebra a seleção](#5-paginação-não-quebra-a-seleção)
6. [O problema do filtro: "todos" de qual universo?](#6-o-problema-do-filtro-todos-de-qual-universo)
7. [Contrato com o backend](#7-contrato-com-o-backend)
8. [Trade-off: o que acontece se o filtro mudar depois do "selecionar todos"?](#8-trade-off-o-que-acontece-se-o-filtro-mudar-depois-do-selecionar-todos)
9. [Bug real que apareceu no caminho](#9-bug-real-que-apareceu-no-caminho)
10. [Passo a passo resumido](#10-passo-a-passo-resumido)
11. [Mapa de arquivos](#11-mapa-de-arquivos)

---

## 1. O problema

A forma ingênua de implementar "selecionar todos" é guardar os ids marcados num
array (`number[]`) e, ao clicar no checkbox do cabeçalho, colocar ali os ids de
**todas as linhas carregadas**. Isso quebra em dois cenários comuns:

- **Paginação**: se a tabela tem 100 registros em 10 páginas de 10, "selecionar
  todos" deveria significar "os 100", não "os 10 que estão na tela agora".
  Carregar as 10 páginas só para montar essa lista de ids é caro e, em APIs
  reais, pode nem ser viável (buscas com milhares de resultados).
- **Filtro**: se o usuário filtra por "Professor" e clica em "selecionar
  todos", o resultado tem que ser "todos os professores", mesmo que a maioria
  deles esteja em páginas que o navegador nunca buscou.

A saída é não representar a seleção como uma lista de ids "positivos", e sim
como uma **regra**: modo (tudo, ou só estes) + uma lista pequena de exceções.

## 2. O modelo de dados: IN / ALL / NOT_IN

**Arquivo:** [`src/enums/selection-type.ts`](../src/enums/selection-type.ts)

```ts
export const SelectionType = {
  IN: 'IN',
  ALL: 'ALL',
  NOT_IN: 'NOT_IN',
} as const

export type SelectionType = (typeof SelectionType)[keyof typeof SelectionType]
```

**Arquivo:** [`src/types/table.ts`](../src/types/table.ts)

```ts
export interface SelectionState {
  selectionType: SelectionType
  ids: (string | number)[]
}
```

- `IN`: só estes ids estão selecionados.
- `ALL`: todos estão selecionados, exceto os ids da lista.
- `NOT_IN`: reservado, equivalente semântico de `ALL` para o backend.

Com isso, a seleção nunca precisa guardar mais que "uma dúzia de exceções",
independente de a tabela ter 100 ou 1 milhão de linhas:

| Cenário                                    | `selectionType` | `ids`      |
|---------------------------------------------|:---------------:|------------|
| Nada selecionado                            | `IN`             | `[]`       |
| Só os ids 3 e 7 selecionados                | `IN`             | `[3, 7]`   |
| Tudo selecionado                            | `ALL`            | `[]`       |
| Tudo selecionado, exceto o id 5             | `ALL`            | `[5]`      |

## 3. O hook de seleção

**Arquivo:** [`src/hooks/use-table-selection.ts`](../src/hooks/use-table-selection.ts)

O hook expõe 4 operações e mantém só o `SelectionState` acima:

```ts
export const useTableSelection = (initialSelection?: SelectionState) => {
  const [selection, setSelection] = useState<SelectionState>(
    initialSelection ?? { selectionType: SelectionType.IN, ids: [] },
  )

  const isSelected = useCallback((id: string | number) => {
    const { selectionType, ids } = selection
    const strId = String(id)

    if (selectionType === SelectionType.ALL) {
      return !ids.some((i) => String(i) === strId)
    }
    return ids.some((i) => String(i) === strId)
  }, [selection])

  const toggleOne = useCallback((id: string | number) => {
    setSelection((prev) => {
      const { selectionType, ids } = prev
      const exists = ids.some((i) => String(i) === String(id))

      return {
        selectionType,
        ids: exists ? ids.filter((i) => String(i) !== String(id)) : [...ids, id],
      }
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelection({ selectionType: SelectionType.ALL, ids: [] })
  }, [])

  const clearSelection = useCallback(() => {
    setSelection({ selectionType: SelectionType.IN, ids: [] })
  }, [])

  return { selection, setSelection, toggleOne, selectAll, clearSelection, isSelected }
}
```

Em `isSelected`, o modo `ALL` marca o id a menos que ele esteja na lista de
exclusão; o modo `IN` marca só se ele está na lista. Em `toggleOne`, alternar
significa adicionar/remover da lista de escolhidos (`IN`) ou da lista de
**excluídos** (`ALL`) — a lógica de "adicionar/remover de um array" é a mesma
nos dois casos, só muda o que a lista representa.

Ponto chave: **o hook não sabe quantas linhas existem, nem em qual página está,
nem qual filtro está ativo.** Ele só sabe manipular a regra. Isso é o que
permite reutilizá-lo sem reescrever nada quando entra paginação ou filtro.

## 4. Renderizando: checkbox por linha e barra "selecionar todos"

**Arquivo:** [`src/components/GenericTable.tsx`](../src/components/GenericTable.tsx)

Cada linha usa `isSelected(id)` — não precisa saber se está em modo `IN` ou
`ALL`, só pergunta "este id está marcado?":

```tsx
data.map((row) => {
  const rawId = row[keyField] as unknown as string | number
  const rowChecked = isSelected ? isSelected(rawId) : false

  return (
    <tr onClick={() => onToggleOne?.(rawId)}>
      <td><TableCheckbox checked={rowChecked} onClick={() => onToggleOne?.(rawId)} /></td>
    </tr>
  )
})
```

O checkbox da barra de seleção (`SelectionBar`, dentro do mesmo card da tabela,
logo acima do cabeçalho) precisa de um terceiro estado — **indeterminado**
(`-`, nem tudo nem nada) — sempre que a seleção é parcial:

```tsx
const isAllSelected = selection.selectionType === SelectionType.ALL && selection.ids.length === 0
const hasSpecificSelection = selection.selectionType === SelectionType.IN && selection.ids.length >= 1
const isAllExcept =
  (selection.selectionType === SelectionType.ALL && selection.ids.length > 0) ||
  selection.selectionType === SelectionType.NOT_IN

const isPartial = hasSpecificSelection || isAllExcept

<TableCheckbox
  checked={isAllSelected}
  partial={isPartial}
  onClick={isAllSelected ? onClear : onSelectAll}
/>
```

> **Atenção com esse `onClick`.** A primeira versão daqui era
> `isAllSelected || isPartial ? onClear : onSelectAll`, e isso é um bug: clicar
> no checkbox do cabeçalho com uma seleção **parcial** (ex.: 2 de 10 marcados)
> executava `onClear` em vez de `onSelectAll` — ou seja, o clique limpava a
> seleção ao invés de completá-la. Detalhes em [§9](#9-bug-real-que-apareceu-no-caminho).

Quando há seleção, a barra muda de cor (roxo) e ganha o botão "Limpar seleção".
O texto "Selecionar todos (N)" usa `pagination.totalElements`, ou seja, o total
da consulta atual e não só as linhas da página.

O `role="checkbox"` com `aria-checked="mixed"` é o que faz leitores de tela e
testes automatizados (Playwright, Testing Library) reconhecerem o estado
indeterminado.

## 5. Paginação não quebra a seleção

**Arquivo:** [`src/hooks/use-users.ts`](../src/hooks/use-users.ts)

Como a seleção é guardada por **id**, e não por posição/página, trocar de
página não exige nenhum código especial de sincronização — o `SelectionState`
simplesmente não muda quando `page` muda:

```ts
const { users, isLoading, page, setPage, totalElements, totalPages } = useUsers(10)
const { selection, toggleOne, selectAll, clearSelection, isSelected } = useTableSelection()

<GenericTable
  data={users}
  selection={selection}
  onToggleOne={toggleOne}
  onSelectAll={selectAll}
  onClear={clearSelection}
  isSelected={isSelected}
  pagination={{ page, totalPages, totalElements, onPageChange: setPage }}
/>
```

Aqui `data` recebe só a página atual, enquanto `selection` é global.

Marcar 2 itens na página 1, ir para a página 2 e voltar preserva a marcação —
sem precisar guardar nada extra por página.

## 6. O problema do filtro: "todos" de qual universo?

Esse é o ponto central da task. O modo `ALL` do `SelectionState` **não carrega
um "escopo"** — ele só diz "tudo, exceto estes ids". A pergunta é: tudo o quê?

Se resolvermos isso contra a base inteira (sem levar o filtro em conta),
acontece o bug: filtrar por "Professor" e clicar em "selecionar todos" marca
os **100** usuários (a base inteira), não os 20 professores — porque nada na
regra `{ selectionType: 'ALL', ids: [] }` menciona o filtro.

**A correção:** sempre que for *resolver* a seleção (montar a lista real de
selecionados, ou montar o payload pro backend), o modo `ALL` precisa ser
combinado com **todos os filtros ativos no momento da resolução** — não só um.

### Vários filtros ao mesmo tempo (perfil + busca por texto)

Quando entra um segundo filtro (busca por nome/e-mail), o risco é duplicar a
lógica de "o que bate com o filtro" em dois lugares — uma vez na simulação da
requisição (pra montar a página) e outra na resolução da seleção (pra saber
quem é "todos"). Se esses dois lugares divergirem, "selecionar todos" marca
gente que não está nem sendo exibida. A solução é ter **uma função só**,
usada nos dois pontos:

```ts
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
```

Usada para montar a página (requisição simulada):

```ts
const filtered = ALL_USERS.filter((user) => matchesUserFilters(user, { role, search }))
```

E usada, com os **mesmos filtros**, para resolver o que "todos" significa:

```tsx
const selectionScope =
  selection.selectionType === SelectionType.ALL
    ? ALL_USERS.filter((user) => matchesUserFilters(user, { role, search }))
    : ALL_USERS

const selectedUsers = selectionScope.filter((user) => isSelected(user.id))
```

No modo `ALL`, o universo é só o dos filtros atuais; no modo `IN`, os ids são
explícitos e o filtro não importa.

Isso generaliza: se amanhã entrar um terceiro filtro (intervalo de datas,
status, etc.), ele entra dentro de `matchesUserFilters` e automaticamente os
dois pontos de uso continuam de acordo — não tem um segundo lugar pra lembrar
de atualizar.

Por que o `IN` não filtra o universo? Porque nesse modo os ids são **escolhas
explícitas** — se o usuário marcou a "Ana" (Administradora) com os filtros
desligados e depois filtra por "Professor", a Ana continua escolhida (só não
aparece na tela porque o filtro escondeu a linha). Isso é o comportamento
esperado: escolha manual sobrevive à troca de filtro; "selecionar todos" é
relativo ao que está sendo mostrado.

> Nesta demo, `ALL_USERS` é a base mockada inteira, então dá pra "resolver" a
> seleção no próprio navegador. Numa API real isso normalmente **não é
> possível** (a base pode ter páginas nunca carregadas) — por isso o passo
> importante não é essa resolução local, e sim o payload da próxima seção, que
> é o que de fato viabiliza isso sem depender de ter tudo em memória.

## 7. Contrato com o backend

**Arquivo:** [`src/lib/selection.ts`](../src/lib/selection.ts)

O front nunca deveria enviar "a lista resolvida de ids selecionados" quando o
modo é `ALL` — o objetivo inteiro do modelo é evitar isso. O que se envia é a
**regra** mais o **filtro** que estava ativo:

```ts
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
```

Exemplo real, capturado com o filtro "Professor" **e** a busca "Almeida"
ativos ao mesmo tempo, "selecionar todos":

```json
{
  "selectionType": "ALL",
  "ids": [],
  "filter": { "role": "Professor", "search": "Almeida" }
}
```

O backend reaplica o mesmo filtro da consulta original para calcular quem é
afetado — a mesma cláusula `WHERE` que gerou a página de resultados (com
**todos** os filtros combinados em `AND`), só que sem paginar e com o
`NOT IN` das exceções:

```sql
-- selectionType = ALL
SELECT id FROM users
WHERE role = :role                              -- filtro de perfil
  AND (name ILIKE '%' || :search || '%'
       OR email ILIKE '%' || :search || '%')    -- filtro de busca, mesmo campo usado na listagem
  AND id NOT IN (:ids)                          -- exceções desmarcadas manualmente

-- selectionType = IN
SELECT id FROM users
WHERE id IN (:ids)            -- filtro nem entra aqui: ids já são explícitos
```

O ponto chave é que o `filter` do payload é um espelho exato dos parâmetros
de busca que o front já manda pra **listar** a página — não é um conceito
novo, é o mesmo filtro, só reaproveitado na hora de resolver o "todos".

Isso é o que permite uma ação em massa ("ativar todos", "exportar todos",
"excluir todos") funcionar corretamente em cima de 1 milhão de linhas sem o
front jamais precisar carregar ou enviar 1 milhão de ids.

## 8. Trade-off: o que acontece se o filtro mudar depois do "selecionar todos"?

Como o `SelectionState` não guarda uma cópia do filtro (só existe o filtro
*atual*, vivo, em outro pedaço do estado), o modo `ALL` é **reinterpretado
dinamicamente** toda vez que algo muda. Isso tem uma consequência que vale
documentar:

1. Filtra por "Professor", clica em "selecionar todos" → `{ ALL, ids: [] }`,
   20 selecionados.
2. Desmarca 1 → `{ ALL, ids: [3] }`, 19 selecionados.
3. Limpa o filtro (volta pra "Todos os perfis") → **sem mudar o
   `SelectionState`**, a mesma regra passa a valer para os 100 usuários,
   exceto o id 3 → 99 selecionados.

O passo 3 pode surpreender: "selecionar todos os professores" silenciosamente
virou "selecionar todos os usuários". Duas abordagens possíveis:

- **Reinterpretação dinâmica (a que está implementada aqui):** simples, sem
  estado extra, e é o que bate com o `SelectionState` real do erp-web (que não
  tem campo de filtro). A contagem na tela sempre reflete a verdade
  imediatamente — não é "errado", só é reativo ao filtro atual.
- **Escopo congelado:** guardar o filtro dentro da própria seleção no momento
  do clique (`{ selectionType, ids, filter }` já na origem) e, ao detectar que
  o filtro ativo mudou, limpar a seleção automaticamente — evita a
  reinterpretação silenciosa, ao custo de precisar sincronizar esse reset em
  todo lugar que muda um filtro.

Este projeto ficou com a primeira opção por ser mais simples e não exigir
estado adicional; é uma escolha consciente, não um descuido.

## 9. Bug real que apareceu no caminho

Vale registrar como exemplo de por que testar interação (não só compilar) importa.

**Sintoma:** com 2 linhas marcadas manualmente (modo `IN`), clicar no checkbox
do cabeçalho para "completar a seleção" **limpava** as 2 marcações em vez de
selecionar todo mundo.

**Causa:** a condição do `onClick` do checkbox do cabeçalho considerava
qualquer seleção parcial (`isPartial`) como "já selecionado, então limpa":

Errado:

```tsx
onClick={isAllSelected || isPartial ? onClear : onSelectAll}
```

Correto:

```tsx
onClick={isAllSelected ? onClear : onSelectAll}
```

Só o estado "tudo selecionado" (`isAllSelected`) deveria disparar `onClear`.
Qualquer outro estado — vazio ou parcial — deveria disparar `onSelectAll`,
porque semanticamente "não está tudo selecionado ainda" é exatamente quando
faz sentido clicar para completar.

Esse tipo de bug não aparece no `tsc --noEmit` nem no build — só aparece
clicando de fato na interface (ou com um teste de interação automatizado).

## 10. Passo a passo resumido

Para reproduzir esse resultado do zero, na ordem em que os problemas aparecem
naturalmente:

1. **Modele a seleção como regra, não como lista positiva.** Defina
   `SelectionType` (`IN` / `ALL`) e `SelectionState { selectionType, ids }`.
2. **Escreva `isSelected(id)` primeiro.** Toda a UI depende só dessa função —
   ela é o único lugar que sabe interpretar `IN` vs `ALL`.
3. **Implemente `toggleOne`, `selectAll`, `clearSelection`** em cima do mesmo
   `SelectionState`, sem depender de quantas linhas existem.
4. **Renderize o checkbox de cada linha com `isSelected(row.id)`**, e o
   checkbox do cabeçalho com um terceiro estado (indeterminado) quando a
   seleção for parcial (`aria-checked="mixed"`).
5. **Pagine sem tocar na seleção.** A seleção vive fora da página atual; só a
   lista de linhas renderizadas (`data`) muda ao trocar de página.
6. **Ao adicionar filtro, resolva `ALL` contra o universo filtrado**, não
   contra a base inteira — esse é o bug mais fácil de introduzir sem perceber.
7. **Centralize "o que bate com os filtros" numa função só** (ex.:
   `matchesUserFilters(user, { role, search })`), usada tanto para montar a
   página quanto para resolver o `ALL`. Cada filtro novo (busca por texto,
   intervalo de datas, status...) entra só ali — nunca duplique essa condição
   em dois lugares, ou eles divergem silenciosamente.
8. **Nunca resolva `ALL` no cliente contra "tudo" em produção.** Envie ao
   backend `{ selectionType, ids, filter }` — com **todos** os filtros ativos
   dentro de `filter` — e deixe o servidor recalcular com a mesma cláusula
   usada para listar.
9. **Decida e documente o comportamento ao trocar de filtro** com uma seleção
   `ALL` ativa (reinterpretar dinamicamente vs. congelar/resetar) — não deixe
   isso implícito.
10. **Teste clicando, não só compilando.** Estados de seleção (parcial,
    completo, alternando, com múltiplos filtros combinados) são exatamente o
    tipo de bug que passa batido em `tsc`/build e só aparece na interação real.

## 11. Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| [`src/enums/selection-type.ts`](../src/enums/selection-type.ts) | Os 3 modos de seleção (`IN`/`ALL`/`NOT_IN`) |
| [`src/types/table.ts`](../src/types/table.ts) | Tipos `SelectionState` e `Column<T>` |
| [`src/hooks/use-table-selection.ts`](../src/hooks/use-table-selection.ts) | Estado e operações de seleção (`toggleOne`, `selectAll`, `clearSelection`, `isSelected`) |
| [`src/components/GenericTable.tsx`](../src/components/GenericTable.tsx) | Card único com barra "selecionar todos" (estado indeterminado e "Limpar seleção"), tabela com skeleton de carregamento e estado vazio, paginação |
| [`src/hooks/use-users.ts`](../src/hooks/use-users.ts) | Busca paginada e filtrada por perfil + texto (simulada), reseta a página ao trocar qualquer filtro |
| [`src/lib/mock-users.ts`](../src/lib/mock-users.ts) | Base mockada (100 registros), `matchesUserFilters` (fonte única de verdade dos filtros) e a simulação de requisição paginada/filtrada |
| [`src/lib/selection.ts`](../src/lib/selection.ts) | `buildSelectionPayload`: monta o contrato enviado ao backend |
| [`src/App.tsx`](../src/App.tsx) | Junta tudo: filtros com ícones, tabela com avatar e badge de perfil, resolução local (só para demo) e preview do payload |
