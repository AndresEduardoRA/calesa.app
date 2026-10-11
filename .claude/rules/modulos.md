---
paths:
  - 'src/modules/**'
---

# Módulos

- Cada módulo expone su API en `index.ts`: lo único que `app/` u otro módulo puede importar.
  Dentro del módulo, rutas relativas. Antes de agregar un export, preguntate quién lo necesita.
- Dependencias entre módulos en un solo sentido y declaradas en la ficha (`## Entra y sale`).
  Si dos módulos se necesitan mutuamente, el de abajo expone una función y el de arriba la llama;
  nunca imports cruzados. El mapa muestra «Depende de»: un ciclo nuevo se ve en la revisión.
- `entities/` tiene cero I/O: tipos, schemas Zod del dominio, `puede()` y transiciones puras,
  cálculo de la fórmula, interfaces de repositorio. Todo lo exportado lleva test al lado.
- `features/<caso>/` = `components/`, `hooks/`, `actions/`, `schemas/`. Un componente por archivo;
  los grupos van en subcarpeta con `index.ts`. Se parte por responsabilidad, no por líneas.
- Las fichas `CLAUDE.md` de cada módulo son contrato: si cambiás lo que entra, sale o las tablas,
  actualizá la ficha en el mismo commit. Sin ficha, `scripts/mapa.sh --check` falla.
