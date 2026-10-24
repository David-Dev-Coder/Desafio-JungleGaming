## Setup inicial do projeto

O bootstrap usa Vite, React, TypeScript, TanStack Router, TanStack Query, Axios, Tailwind CSS v4 e MSW. Para iniciar a versão mockada:

```bash
npm install
npm run dev:mock
```

Para gerar o build de demonstração com MSW ativado, use `npm run build:mock`. `npm run dev` e `npm run build` mantêm o MSW desligado por padrão. Copie `.env.example` para `.env.local` para configurar `VITE_ENABLE_MSW` e `VITE_API_URL`.

Os handlers estão em `src/mocks/handlers.ts`. Cenários para a listagem podem ser solicitados pela query `scenario`: `empty`, `slow`, `offline` e `server-error`. A demonstração tem 26 itens e os seguintes acessos fictícios: `ana@jungle.test` ou `leo@jungle.test`, senha `Jungle123!`. Use **Resetar demo**, no rodapé, para restaurar o cenário inicial. Os fluxos implementados e as limitações estão em [ARCHITECTURE.md](./ARCHITECTURE.md).
