---
paths:
  - 'src/modules/**'
---

# Módulos

- Cada módulo tiene dos entradas y nada más se importa desde afuera: `index.ts`
  (`@/modules/<x>`, para Server Components: puede traer código de servidor) y, si expone algo al
  navegador, `client.ts` (`@/modules/<x>/client`, para Client Components). Dentro del módulo, rutas
  relativas. Antes de agregar un export, pregúntate quién lo necesita.
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
