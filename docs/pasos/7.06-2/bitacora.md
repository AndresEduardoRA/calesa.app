## 2026-11-11 — Paso 7.06-2: lecturas de la agenda y visibilidad (parte 2 de 2 del 7.06)

- **Hecho:** 7.06 terminado (7.06-1 y 7.06-2, que absorbió 7.06-3). `parcial: false`.
  - `eventos: leer` en línea sobre columnas, con `_agenda_soy_destinatario(id)` (definer, de authenticated): mismo conjunto de lectores que
    `puede_evento`, sin releer la fila por cada evento.
  - `agenda_rango(p_desde, p_hasta, p_de_todos)`, de invocador: hasta 45 días; eventos, tareas, recordatorios y subastas, sólo lo de un chip, 200
    por clase con `hay_mas` y `tope`. Índice nuevo `tareas_vence_idx` para `agenda.ver_todo`.
  - `agenda_tareas_sin_fecha(p_tamano, p_antes_en, p_antes_id)`, de invocador, por cursor, `_acotar_pagina(p_tamano, 20, 50)`, índice
    `tareas_sin_fecha_idx`.
  - `agenda_quienes_reciben(p_texto, p_conversacion)`, definer: pide `asignar`, busca como Equipo y devuelve `{id, nombre}`, tope 20.
  - `src/modules/agenda/entities/visibilidad.ts` con su test: espejo de la base para habilitar o deshabilitar.
- **Commits:** `82aecb8e` (policy en línea), `6383ad65` (rango), `362ec6a8` (sin fecha), `5bbac4fe` (quién recibe), `c6a4419a` (entities) y el
  `fix` de la auditoría del informe `2b182a69` (E10 y T8 exceptúan el ayudante por firma).
- **Verificación** (`.piloto/salidas/7.06-2/`):
  - `db:probar` completo (job `schema` del hook) en verde en cada commit con SQL: 788, 798, 802 y 806 ✓.
  - `areas/agenda/` con `SOLO=`: E11, R1–R7, S1–S3 y Q1–Q3 en verde.
  - Vitest de `visibilidad`: 21 ✓. `scripts/guardas`: 1.044 ✓. `typecheck` sin errores.
  - Mutaciones de control: sin el destinatario en la policy caen E4 y E11; sin el `limit` de afuera de las subastas cae R5 (239 filas); sin el filtro
    de responsable cae R4.
  - `nivel.mjs`: nivel 2 (`rls`, `estructura`).
- **Trampa:** en `db:probar` completo los `pg_temp` se comparten entre archivos; un ayudante con el mismo nombre y otra firma da «is not unique».
  Cada archivo nuevo lleva su prefijo (`ar_`, `sf_`, `qr_`).
- **Para 7.07:**
  - Registrar `agenda_tareas_sin_fecha` en `scripts/guardas/areas-b/paginas-en-la-base.ts` con su primera llamada (D7).
  - Leer `tope` y `hay_mas` de `agenda_rango` para `<AvisoDeTope>`; el panel lee por id lo que no trae el chip (descripción, vínculos, destinatarios).
  - El selector de reasignar una tarea del chat pasa `p_conversacion` a `agenda_quienes_reciben`.
- e2e completo: no (7.06-2, Nivel 2 por RLS y estructura: lo corre el CI del PR; sin pantalla)
