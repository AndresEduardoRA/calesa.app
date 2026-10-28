# Archivo

Las versiones completas de los docs, **tal cual** estaban el 2026-10-28, cuando los docs vivos se adelgazaron (preparación para Orca,
`docs/PREPARACION.md`, etapa 3). Nada de lo que salió de un doc vivo se perdió: está acá, y en git.

- `BITACORA.md`, `DECISIONES.md`, `PLAN.md`, `RENDIMIENTO.md`, `GLOSARIO.md`, `COTIZADOR.md`, `UX.md`, `ESTADO.md` y `CLAUDE.md` (el de la raíz).
- `modulos/<módulo>.md`: la ficha `CLAUDE.md` completa de cada módulo (`shared.md` es la de `src/shared`).
- `reglas/<regla>.md`: cada `.claude/rules/*.md` completa.

**Cómo se usa:** sólo con `grep` (la lectura entera está negada en `.claude/settings.json`). Una cita como `docs/COTIZADOR.md › «El motor»`
que ya no está en el doc vivo se encuentra acá con el mismo título. No se edita ni se reformatea (está en `.prettierignore`).
