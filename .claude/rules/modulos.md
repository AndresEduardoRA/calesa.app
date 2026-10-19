---
paths:
  - 'src/modules/**'
---

# Módulos

- Cada módulo tiene dos entradas y nada más se importa desde afuera, salvo las dos de `src/app` (abajo): `index.ts`
  (`@/modules/<x>`, para Server Components: puede traer código de servidor, y no exporta componentes) y, si expone algo al
  navegador, `client.ts` (`@/modules/<x>/client`, para Client Components). Dentro del módulo, rutas
  relativas. Antes de agregar un export, pregúntate quién lo necesita.
- **La tercera, la del shell** (`shell.ts`, y `shell.client.ts` para un Client Component de `_shell/`):
  sólo la importan `src/app/(app)/layout.tsx` y `src/app/(app)/_shell/` (lo cuida el lint). Lleva lo que
  dibuja el marco de toda pantalla y nada más: lo que importa el layout viaja en el JS de **todas** las
  pantallas (`docs/DECISIONES.md`, 2026-10-16).
- **La cuarta, la de pantallas** (`pantallas/<pantalla>.ts`, `@/modules/<x>/pantallas/<pantalla>`): sólo `src/app` (lo cuida el lint). **El
  `index.ts` no exporta componentes**: lleva sesión, lecturas, actions, reglas y tipos, y no alcanza ningún módulo
  `'use client'` (lo recorre `scripts/guardas/barriles.test.ts`, en `pnpm test`). Los componentes de una pantalla salen por su archivo de `pantallas/`, que reexporta sólo lo que esa
  pantalla dibuja: una pantalla paga en JS todo lo que reexporta lo que importa, y un barril de todas hacía que `/perfil` pagara 30 KB de
  la lista del equipo, la matriz de roles y los formularios de Empresa (`docs/DECISIONES.md`, 2026-10-18). Una pantalla nueva = su archivo.
- `client.ts` sólo reexporta hooks, componentes de cliente (o puros) y tipos de `entities/`. Nunca
  `./index`, `./composicion`, `infra/` de servidor ni nada con `server-only`: lo frena el lint y,
  lo transitivo, el build. Un componente puro puede salir por las dos entradas.
- Dependencias entre módulos en un solo sentido y declaradas en la ficha (`## Entra y sale`).
  Si dos módulos se necesitan mutuamente, el de abajo expone una función y el de arriba la llama;
  nunca imports cruzados. El mapa muestra «Depende de»: un ciclo nuevo se ve en la revisión.
- `entities/` tiene cero I/O: tipos, schemas Zod del dominio, `puede()` y transiciones puras,
  cálculo de la fórmula, interfaces de repositorio. Todo lo exportado lleva test al lado.
- `features/<caso>/` = `components/`, `hooks/`, `actions/`, `schemas/`. Un componente por archivo;
  los grupos van en subcarpeta con `index.ts`. Se parte por responsabilidad, no por líneas.
- Las fichas `CLAUDE.md` de cada módulo son contrato: si cambias lo que entra, sale o las tablas,
  actualiza la ficha en el mismo commit. Sin ficha, `scripts/mapa.sh --check` falla.
