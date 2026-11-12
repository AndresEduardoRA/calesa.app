## 2026-11-11 — Paso 5.07-1

- **El 5.07 se parte en dos:** 5.07-1 la escritura (validar, crear, guardar, mover, eliminar, sin escritura directa) y 5.07-2 la lectura (impacto y «fuera de
  regla»). Este PR no marca integrado el 5.07. Plan: `.piloto/planes/5.07.md`.
- **D1 · Un requisito nace informativo** (recomendada de la fila): `requisito_crear` pone `bloqueante = false` y el default de la columna pasa a `false`.
- **D2 · `fuera_de_regla()` se borra en el 5.07-2** (recomendada de la fila): da ids a cualquiera, sin permiso ni tope; la reemplaza `flujo_fuera_de_regla`.
- **D3 · El alta en el registro de páginas va en el 5.08**, no aquí: `scripts/guardas/paginas.test.ts` cae si una entrada no tiene quién la llame desde `src/`.
  Se aparta de la fila.
- **D4 · `bloqueante` no va al crear:** si llega, `22023` con `hint = 'bloqueante'` (no se ignora en silencio).
- **D5 · `espera_ambito` no se pide:** sale del ámbito del flujo (vehículos → `hijos`, repuestos → `padre`); si llega, `22023`.
- **D6 · `formatos: []` se rechaza** (`22023`): el requisito no se cumpliría nunca. Nulo = todos los del tipo.
- **D7 · En UPDATE el trigger revalida sólo el grupo cuyo campo cambió** (la espera, el documento o el dato; un cambio de `fase_id` o `tipo`, todo): una espera
  vieja (regla apagada o fase jubilada después) o un tipo cuyos formatos cambiaron no impiden guardar sus notas, volverla bloqueante ni reordenar la fase. De la
  auditoría del plan; lo fijan R6, E2 y E4.
- **D8 · Sin carrera nueva:** todo corre bajo el candado de `_flujo_para_editar` (carreras K1–K3 del 5.01); el orden no es único.
- **D9 · Las unidades en la papelera no cuentan** en el impacto ni en «fuera de regla» (5.07-2).
- **D10 · Sin tope de requisitos por fase ni rechazo de duplicados:** la fila no lo pide; si molesta, lo dice la pantalla del 5.08.
- **El primer requisito de una fase queda en `orden` 10** (`coalesce(max, 0) + 10`, como `fase_crear`), no en 0 como decía el borrador del plan.
