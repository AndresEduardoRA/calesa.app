## 2026-11-11 — Paso 5.04-1: las fases, lo puro y las actions (parte 1 de 3 del 5.04)

- **Hecho:** sin interfaz. `entities/fases/` (reglas puras espejo de `_fase_validar()` con `validarFase` y `motivoDelInterruptor`, el formulario con
  `cambiosParaGuardar` y `datosParaCrear`, la paleta de colores, `despuesDeAlMover` para subir y bajar, los textos del impacto al jubilar o eliminar,
  la lectura Zod de las respuestas y las interfaces del repositorio); `infra/fases/` (las cinco RPC de escritura y `fase_impacto`, con el campo del
  `hint` junto al error); `features/fases/{schemas,actions}` (crear, guardar, mover, eliminar, reactivar y leer el impacto; cada una exige el permiso
  del flujo antes de escribir y revalida configuración y vehículos); `areas/fases/composicion.ts`.
- **Commits:** `407af12e` (reglas puras), `c6bd1ed9` (leer y escribir).
- **Verificación** (`.piloto/salidas/5.04-1/`): `vitest run src/modules/flujos scripts/guardas`: 55 archivos, 1.247 pruebas en verde
  (`vitest.txt`); `validarFase` coincide con `_fase_validar()` de la base real en PGlite, 26 casos; `lint` y `typecheck` en verde (los corre el hook de cada
  commit). Sin SQL, sin migración: la base no cambió.
- **Para el carril A:** en `docs/PLAN.md`, fila 5.04: «**5.04-1 hecho** (lo puro y las actions; `docs/pasos/5.04-1/`). Faltan el **5.04-2** (la
  lista: «Nueva fase», ordenar, «⋯», confirmación) y el **5.04-3** (el inspector y el recorrido e2e)».
- **5.04 sigue:** este PR no marca integrado el paso (`parcial: true`).
- e2e completo: no (5.04-1, Nivel 1, sin pantalla: lo corre el CI del PR)
