# Arquitetura e limitações

## Execução e transporte

- `npm run dev:mock`: Vite com service worker MSW.
- `npm run build:mock`: build de demonstração com MSW.
- `npm run build`: checagem TypeScript e build regular.
- `npm run preview`: serve o build local.

`VITE_ENABLE_MSW` ativa os mocks e `VITE_API_URL` configura o prefixo REST. O MSW inicia antes do React. Axios é o transporte REST e TanStack Query mantém o cache, com stale time de 30 segundos, uma tentativa adicional nas queries e sem refetch ao focar a janela (ver `src/main.tsx`).

## Estado dos mocks

`src/mocks/fixtures.ts` fornece 26 NFTs de três coleções. O estado persiste no `localStorage` em `jungle-mock-state-v4`; **Resetar demo** chama `/api/reset` para restaurar catálogo, sessão, carrinhos, favoritos, pedidos e carteiras. Os cenários disponíveis na listagem são `empty`, `slow` (1,5 s), `offline` e `server-error`. As contas demonstrativas são `ana@jungle.test` e `leo@jungle.test`, ambas com senha `Jungle123!`.

Valores monetários trafegam como strings decimais. `src/lib/eth.ts` converte para unidades inteiras de 10⁻¹⁸ ETH para cálculos de subtotal, desconto, taxa e total, evitando aritmética binária de ponto flutuante.

## Tempo real e pedidos

O cliente usa `socket.io-client` com WebSocket no caminho `/socket.io/`; o servidor de demonstração é implementado com MSW e `@mswjs/socket.io-binding`. O binding cobre o protocolo usado pelos eventos, mas não implementa todos os recursos de um servidor Socket.IO real, como rooms e namespaces.

O carrinho, o detalhe do NFT e o checkout assinam `nft.updated`. Eventos com versão mais antiga ou repetida não substituem uma versão mais nova. O carrinho atualiza o item em cache e invalida a cotação. Checkout também exige revisão da nova cotação antes de confirmar.

Pedidos são idempotentes por usuário e chave. A API retorna `pending`; após 1,5 s a simulação publica `order.updated` com estado terminal. `confirmed` debita disponibilidade e remove as quantidades compradas; `declined` preserva o carrinho. O pedido contém snapshot dos NFTs e recupera estado pendente via consulta REST ou snapshot ao reconectar. Os estados terminais são `confirmed` e `declined`.

## Conta, ações fora de escopo e limitações

Perfil, carteiras, favoritos e pedidos são associados ao usuário autenticado no mock; o carrinho visitante é mesclado no login. As senhas cadastradas são armazenadas no cenário simulado como hash SHA-256 Web Crypto (isso não representa autenticação de produção).

Por decisão de escopo, **Alterar** avatar é visual e não abre seletor de arquivo; **Remover** continua alterando o perfil. Login social e recuperação de senha por e-mail não são integrações disponíveis: os controles informam a limitação e não indicam sucesso.

## Verificações não realizadas

Para esta entrega, **não foram executados** a suite E2E Playwright, testes de regressão visual/baselines, auditoria Lighthouse, nem a validação manual completa de responsividade e acessibilidade. Os relatórios Lighthouse eventualmente presentes em `.lighthouseci/` são resultados anteriores e **não representam uma auditoria desta versão**; não devem ser usados como evidência de conformidade com as metas propostas.

## Funcionalidades pendentes

- Busca de elementos a partir da pesquisa.
- Suite Playwright, regressão visual, auditoria Lighthouse e revisão manual completa de responsividade/acessibilidade, conforme descrito em **Verificações não realizadas**.

## Decisões visuais

- Uso de lucide-react para alguns icones que não estavam disponiveis.
- Mudança de cores ou disposição de elementos para deixa-los mais harmonicos.
