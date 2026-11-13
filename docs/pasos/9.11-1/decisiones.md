# 9.11-1 · Tablero: el margen del mes y la cola web en la base (2026-11-12)

- **D1 · El mes del margen es el del pago confirmado** (`pagos.confirmado_en`), con los días en la zona de la empresa (`_tablero_ventana`): es el único
  hecho sellado; la base no tiene «fecha de venta» (duda 1 del PLAN, la recomendada).
- **D2 · Pago a medias: se suma lo confirmado, tal cual, sin marca «pago parcial».** La base no guarda el precio de venta ni un saldo del vehículo
  (`margen_vehiculo` toma como `venta` la suma de los confirmados), así que no hay cómo saber si está pagado entero (duda 2, la rama «si no»).
- **D3 · Un vehículo cae en el período de su último pago confirmado vivo**, con la venta de todos sus pagos confirmados: su margen es exactamente el de
  `margen_vehiculo` (el número del panel de la unidad) y un vehículo pagado en dos meses no suma dos veces. Se aparta de la letra del PLAN («algún pago
  confirmado en el período»), que lo contaría en cada mes con un pago. **Consecuencia:** un mes pasado cambia después: si se confirma un pago nuevo, el
  vehículo pasa al mes de ese pago; si se anula el último, vuelve. Está en el `comment on function`; la 9.11-2 no presenta un mes pasado como cerrado.
  Reversible con otra migración.
- **D4 · «Sin venta registrada»** = vehículo con un pago vivo sin confirmar de `fecha` en el período y ningún pago confirmado vivo. Con la cohorte de D3
  todos los que suman tienen venta; ésta es la única forma de que un vehículo del período no la tenga. No suma a nada.
- **D5 · Sólo vehículos:** los pagos de un proyecto de repuestos no entran (su margen es de repuestos).
- **D6 · `tablero_margen` pide sólo `logistica.margen.ver`** y mira sólo los orígenes donde la tiene (`origenes_con_alcance(…, 'propios')`): no devuelve
  nada que el panel de la unidad no muestre ya a quien tiene la clave. La página `/tablero` sigue pidiendo `tablero.metricas.ver`.
- **D7 · Cola web:** el período va por `asignada_en` (cada intento es una fila con la suya, que no se reescribe); `asignadas` = no directas con persona,
  en cualquier estado (el espejo de `asignadas_total` del 8.04); la tasa con 4 decimales y nula sin asignadas; la mediana en minutos hasta «Contacté»
  con 1 decimal, sobre las contactadas no directas. `por_persona` junta a todos los que tuvieron asignadas en el período, estén o no hoy en la rueda.
- **D8 · Topes:** 10 orígenes y 20 personas con `*_hay_mas`, como el 9.07; los totales cuentan todo.
- **D9 · `cotizado`** = suma de las finales activas de los vehículos de la cohorte que la tienen; nulo si ninguno. `por_origen` queda en la RPC; la
  9.11-2 dibuja el total.
- **D10 · Partición:** 9.11-1 la base (dos migraciones, sus pruebas SQL y los tipos); 9.11-2 los widgets, su vitest y el caso de `e2e/tablero.spec.ts`.
- **D11 · Límite conocido: un pago confirmado sin `confirmado_en` no entra.** La columna admite nulos y sólo la sella `pago_sellado` (6.10-2); ninguna
  migración rellenó las filas de antes. Un pago así queda fuera del margen y tampoco cuenta en `sin_venta`. No se agrega un `check (not confirmado or
confirmado_en is not null)` sin mirar antes los datos de producción: si hace falta, va en su propia migración con el relleno (auditoría del informe).
