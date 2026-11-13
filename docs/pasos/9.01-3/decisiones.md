## 2026-11-12 · Paso 9.01-3: la pantalla `/actividad`

- **Cada lado de un monto lleva su moneda** (D29; la auditoría del plan lo bloqueó). `presentarDiff` toma `cambios.moneda.antes` para `antes` y
  `cambios.moneda.despues` para `despues`; si la moneda no cambió, la de cada lado llega por opción (`monedaAntes`, `monedaDespues`). Si no se
  conoce, el monto sale con `monedaConocida: false`: nunca con la moneda base inventada. Una sola moneda para los dos lados dibujaba
  «1500 BOB → 1750,5 USD» como «1500 USD → 1750,5 USD». La 9.01-4 suma a `actividad_diff` `moneda_antes` y `moneda_despues`, tomadas de la
  foto del cambio (`a.antes->>'moneda'`, `a.despues->>'moneda'`). No se toma la moneda vigente de la fila: pudo cambiar o la fila pudo borrarse.
- **Persona y entidad son de una sola opción, con «Todas» por defecto** (D25): la base toma un `p_actor` y una `p_tabla`. Las personas son todo
  el equipo, activas o no, hasta `TOPE_DEL_EQUIPO`.
- **`?registro=` no es un control** (D26). Vale sólo junto a `?entidad=` (sin ella la base da 22023). Con los dos, un aviso «Mostrando la
  actividad de un solo registro de…» con «Ver toda la actividad».
- **`?accion=` no entra en la pantalla** (D27): la base lo admite, pero no hay catálogo de acciones que ofrecer. Agregarlo no cambia la firma.
- **La fila todavía no abre nada** (D28): sin `alAbrir`, no promete un clic. La 9.01-4 la abre en `?cambio=`.
- **Los textos derivados** (D30, D31). La acción sale de su sufijo (Creó, Cambió, Borró; otra, humanizada). La entidad lleva el término del
  glosario y el campo su etiqueta; si no tiene, la clave humanizada. Sin persona, «Sistema»; con persona sin nombre, «Sin nombre».
- **`hastaDeUnDia` se copió** en `entities/filtros.ts` (D32), como ya hicieron `cotizaciones` y `logistica`. Subirla a `shared` es del carril A.
- **`hoy` lo calcula el servidor** (D33) y viaja como `YYYY-MM-DD`: «Hoy» y «Ayer» no cambian al hidratar cerca de la medianoche.
- **`loading.tsx` sólo importa el esqueleto** (D34): importar la pantalla bajaría su chunk dos veces en frío.
- **El vacío dice los días de la empresa** (D35): `ajustes_empresa.actividad_dias`, o 14 si no se pueden leer los ajustes.
- **La `key` del listado es persona|entidad|registro** (`claveDelPedido`). Un filtro nuevo o «Ver toda la actividad» empiezan de cero, sin
  arrastrar lo cargado con otro filtro.
- **`leerDiff` ya está en la `infra`** (D36), sin pantalla que lo llame: así la parte 4 es sólo el drawer y la moneda.
- **Un atributo de tipo `moneda` sale con la moneda sin conocer** (auditoría del informe). Un campo `moneda` del layout no declara su moneda: los
  del catálogo de apibara son USD. Por eso el diff no lo da en moneda base: `moneda: null, monedaConocida: false`. La ficha sigue mostrándolo como
  siempre (`valorMostrado`). Si un día el campo declara su moneda, la recibe el diff.
