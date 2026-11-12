## 2026-11-12 — Paso 6.09-1: aduana de lectura (parte 1 de 2)

- **Hecho:** `/logistica/aduana` y el hueco «Aduana» de la unidad leen y muestran, sin escribir todavía:
  - `entities/aduana/`: tipos y esquemas Zod de la declaración (lista y leída), el canal de aforo desde el tipo generado, `textoDeFaltan` («Pagada», «Faltan los tributos de N», «Sin vehículos»),
    `vencimientoDe` (vencida, hoy, mañana, en N días, vigente; una pagada no se alarma), el pedido de filtros (`canal`, `pagada`, `q`) con su cursor y las claves de URL de 6.09-2.
    Tests: `estado`, `filtros`, `declaracion` y `paneles` (30 ✓).
  - `infra/aduana/`: `declaraciones_listar` y `declaracion_leer` en servidor; el vínculo vivo de la unidad y «Tributos pagados» en el navegador. `declaraciones_listar` entra a la guarda de páginas.
  - `features/aduana/` y `src/app/(app)/logistica/aduana/`: lista (tabla y tarjetas), filtros en la URL, resumen en un `<Drawer>` por `?declaracion=`, los cinco estados, el enlace «Aduana» de la
    sub-navegación y el hueco, con su atajo «Ir a Gastos».
- **Falta (parte 2):** alta y edición en `<Drawer>`, «Vehículos de la declaración» (buscar, agregar y quitar con versión), «Asignar canal» con `<Confirmar>`, `e2e/soporte/aduana.ts` y
  `e2e/logistica-aduana.spec.ts` (el assert del paso). El plan está servido en `.piloto/planes/6.09.md` › «Partición».
- **Defecto de otro paso (6.07-3), sin tocar:** `declaracion_leer` falla con `55000` («record "s" is not assigned yet») cuando el id **no existe** y quien llama no tiene
  `logistica.aduana.gestionar`: `if d.id is null or (not v_gestiona and s.vehiculos = 0)` evalúa `s` sin asignar. Con `P0002` esperado, un enlace viejo a `?declaracion=<id>` muestra
  el error con «Reintentar» y no «Esta declaración ya no existe o ya no la ves.» (sí lo dice la que existe y no se ve). Lo arregla una migración nueva de quien posee ese SQL:
  separar el `raise` de «no existe» antes de `select … into s`.
- **Verificación** (`.piloto/salidas/6.09/`): `vitest` de `entities/aduana`, `scripts/guardas` y `src/modules/logistica` (1414 ✓), `pnpm typecheck` y `eslint` sin avisos; e2e dirigidos
  en `e2e-dirigidos.txt` (logistica-unidad, -cadena, -gastos-y-pagos, -documentos y -mover; 38 ✓, 5 saltadas, escritorio y celular). Un spec de humo, no commiteado, abrió la página vacía y
  el enlace «Aduana» en escritorio (el e2e propio llega en 6.09-2).
- e2e completo: no (6.09-1, Nivel 1: lo prueba el CI del PR; dirigidos: logistica-unidad, logistica-cadena, logistica-gastos-y-pagos, logistica-documentos, logistica-mover)
- **Commits:** ver `git log` de la rama (5 de código y el de docs).
