## 2026-11-11 — Paso 7.12-1: el buscador, la base (parte 1 de 2 del 7.12)

- **Hecho:** las tres búsquedas por sección en la base, con el mínimo en el servidor (`_buscador_interpretar()`, espejo de `interpretarBusqueda()`)
  y `_acotar_pagina(p_tamano, 5, 20)` + 1: `buscador_leads()` (invocadora: `#n` por `leads_ids_del_numero` y nombre por `leads_candidatos` con sólo el
  texto, pasados por un único `leads_vista_por_ids`; nunca teléfono ni campos), `buscador_vehiculos()` (invocadora: título, VIN o lote, una ruta por
  origen) y `buscador_cotizaciones()` (`security definer`: número exacto o título por trigramas de los orígenes que se ven más las propias, y la policy
  «cotizaciones: leer» repetida fila por fila; sin montos ni papelera). Los últimos abiertos: `visita_registrar()` (upsert propio, tope 50) y el índice
  `visitados_usuario_visto_idx`. Inventarios: `auditoria-leads.sql` (clase L) y `numero-global.sql`.
- **Commits:** `f51a7f90` (las tres secciones), `3433ec3d` (las visitas), `bca35dda` (fix de la auditoría: las candidatas por título, de los orígenes
  que se ven).
- **Verificación** (`.piloto/salidas/7.12-1/`): `db:probar` entero en verde sobre el árbol final (`probar-entero-final.txt`, 777 ✓, 0 ✗); las del área,
  `supabase/tests/areas/buscador/` (`buscador.sql`, `forma.sql`, `visitados.sql`), 14 pruebas en verde; cuatro mutaciones del definer, todas atrapadas;
  `scripts/guardas` 33 archivos y 1.044 pruebas; `db:lint` sin avisos en lo nuevo.
- **Para el carril A:** en `docs/PLAN.md`, fila 7.12: «**7.12-1 hecho** (la base: `buscador_leads`, `buscador_vehiculos`, `buscador_cotizaciones`,
  `visita_registrar` y el índice de `visitados`; `docs/pasos/7.12-1/`). Falta el **7.12-2**: `ranking.ts` con su test, las lecturas del navegador, el
  registro de la guarda y `medir-buscador.sql`». El arrastrado «el buscador de leads, sin los privados» (`docs/PLAN.md:1512`) queda hecho en la base y
  se cierra con el 7.12-2. Pendiente nombrado: el `EXPLAIN` de `buscador_cotizaciones` en `db:medir:volumen` (límite sin assert en RENDIMIENTO).
- **7.12 sigue:** este PR no marca integrado el paso (`parcial: true`).
- e2e completo: no (7.12-1, Nivel 2 por el índice de visitados: lo corre el CI del PR; sin pantalla)
