# erp-table-demo

Projeto React (Vite + TypeScript + Tailwind) com uma tabela genérica que reaproveita o mesmo
modelo de seleção "selecionar todos" usado no erp-web (`GenericTable`), com paginação, filtro
por perfil e seleção que funciona corretamente mesmo com dados paginados/filtrados.

📄 **Documentação completa (com exemplos):** [`docs/tabela-selecao-todos.md`](docs/tabela-selecao-todos.md)

## Como rodar

```bash
npm install
npm run dev
```

Não depende de API real: os dados são simulados (100 usuários mockados, com delay de rede
simulado). Veja `.env.example` caso queira plugar uma API real depois.

## Estrutura

- `src/components/GenericTable.tsx` — tabela genérica com checkbox de seleção por linha,
  barra de "selecionar todos" (com estado indeterminado) e paginação.
- `src/hooks/use-table-selection.ts` — hook de estado da seleção, com o mesmo modelo de 3
  estados do erp-web (`IN` ids específicos / `ALL` exceto ids / `NOT_IN`), o que permite
  "selecionar todos" sem precisar guardar todos os ids em memória.
- `src/enums/selection-type.ts` e `src/types/table.ts` — tipos compartilhados da seleção.
- `src/lib/mock-users.ts` — base mockada (100 usuários) e simulação de requisição paginada
  e filtrada por perfil (`simulateFetchUsers`).
- `src/lib/selection.ts` — `buildSelectionPayload`, monta o contrato enviado ao backend
  (`{ selectionType, ids, filter }`) sem nunca resolver a lista completa no client.
- `src/hooks/use-users.ts` — busca paginada/filtrada (simulada) alimentando a tabela.
- `src/lib/api.ts` — instância do axios (não usada no momento; fica pronta para quando a
  simulação for trocada por uma API real).
- `src/App.tsx` — junta tudo: filtro por perfil, tabela, `<pre>` com os selecionados e
  `<pre>` com o payload que seria enviado ao backend.

## Variáveis de ambiente

Veja `.env.example`. O `.env` está no `.gitignore`. Só é necessário se/quando trocar a
simulação (`mock-users.ts`) por uma chamada real via `src/lib/api.ts`.
