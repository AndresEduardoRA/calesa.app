## 2026-11-08 — Paso 4.22-1: lo puro del editor del diseño (primera parte del 4.22)

- **Hecho:** nivel 1, sin interfaz ni base (sólo `entities/diseno/`, tres commits de código). El 4.22 se parte en seis (`decisiones.md`); éste es el primero.
  - `visibilidadDelDiseno()`: espejo de `_compilar_visibilidad()` (`base.sql:988`): nodo → `{ ver, editar }`. Ítems `celda`, `subtotal`, `variante` e `interruptor`;
    el pct de una celda con `secundario` hereda el par; un `total` o `aparte` lo ve todo el mundo y, sin dibujar, entra `{todos, null}`; los `atajos` no entran.
  - `deduccionesDelDiseno()`: el aviso «se deduce restando»: por suma y nivel, el único sumando directo oculto de una suma visible. No bloquea.
  - `ponerNiveles()`: pone ver y editar de una sección o de una celda juntos, así el editor no da `editar_sin_ver`.
- **Verificación:** `vitest run src/modules/cotizaciones/entities/diseno` en verde (T1–T6, la última contra el diseño `capturas` del juego compartido con la base, que
  sigue válido con una sección y una celda a «costos»); `eslint` y `tsc --noEmit` limpios. Sin mutaciones, sin e2e (no hay `.tsx` ni texto de interfaz).
  e2e completo: no (4.22-1, lo puro, Nivel 1: sin interfaz)
- **Commits:** `feat(cotizaciones)` ×3 (visibilidad, deducción, niveles).
