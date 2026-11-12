## 2026-11-12 · Paso 8.12-1: la fórmula y la base del cotizador de repuestos (parte 1 de 4)

### Hecho

- `entities/cotizador/` (`decimal.ts`, `snapshot.ts`, `formula.ts`): la fórmula importado/local por unidad, el unitario al múltiplo de `redondeo` (mitad hacia
  arriba) y × cantidad, la logística sugerida por tramo (sin tramo, sin sugerencia), con enteros a escala fija. `casos-del-cotizador.json` (K1–K16) lo corren los
  dos lados: `formula.test.ts` y `supabase/tests/areas/repuestos/cotizador.sql` (copia literal; `casos.test.ts` vigila que sean iguales).
- Migración `repuestos_cotizador_formula`: `_repuesto_cotizacion_linea` (la misma fórmula), `trg_tramo_sin_solape` (23P01) y `redondeo > 0` (`not valid`).
- Migración `repuestos_cotizador_cotizaciones`: `repuestos_cotizacion_crear` (congela la config de id más alto, tramos y cajas activos de la moneda; idempotente)
  y `repuestos_cotizacion_guardar` (reemplaza las líneas, lista cerrada, recalcula con el snapshot; «Línea N» con `hint` y `detail`).
- Migración `repuestos_cotizador_aceptar`: `repuestos_cotizacion_aceptar` (copia el unitario y la moneda al ítem; una sola aceptada por proyecto, índice parcial),
  `repuestos_cotizacion_anular`, sin policies ni privilegios de escritura en cotizaciones y líneas; `aplicado_en` de `repuestos.cotizar`.
- Ficha del módulo y GLOSARIO (tramo de logística, logística sugerida, caja, snapshot de configuración).

### Verificación

- Nivel 2: RLS (se borran 5 policies de escritura) y estructura (índice único parcial, trigger, check).
- `pnpm db:probar` completo: 1379 en verde, 0 caídas (`.piloto/salidas/8.12-1/probar-completo-3.log`); `db:reset` ×2, `db:types` y `db:lint` sin avisos nuevos.
- Mutaciones (11): M1–M6 y M8–M12 hacen caer su prueba (`.piloto/salidas/8.12-1/mutaciones.log`).
- vitest de `scripts/guardas` y `entities/cotizador`: 1153 en verde; `pnpm typecheck` limpio.

### Para copiar a `docs/PLAN.md` (la sesión de un carril no edita el PLAN)

- 8.12-1 hecha: la fórmula exacta en TS y en la base con casos compartidos, las cuatro RPC del cotizador y sin escritura directa en cotizaciones y líneas.
  **8.12 sigue:** 8.12-2 (Configuración › Repuestos › «Cotizador»: publicar, historial, tramos y cajas), 8.12-3 (pestaña «Cotizaciones» y la cotización en
  sólo lectura) y 8.12-4 (la hoja editable, aceptar, anular y `e2e/repuestos-cotizar.spec.ts`).
- Pendiente de 8.12-2: `check (costo_min >= 0 and monto >= 0) not valid` en `repuestos_tramos_logistica` (un tramo negativo entraría al snapshot y `leerSnapshot`
  lo rechazaría) y validar del todo `repuestos_cotizador_config_redondeo_check`.
- Pendiente de 8.12-4: una carrera en `scripts/carreras/` (dos `aceptar` a la vez: una aceptada y un PT409; dos tramos cruzados a la vez: uno solo).
- «Quitar escrituras directas» (Riesgos de la Fase 8): cerrado para cotizaciones y líneas de repuestos.

e2e completo: no (8.12-1, Nivel 2: lo corre el CI del PR; dirigido repuestos-proyecto en escritorio)
