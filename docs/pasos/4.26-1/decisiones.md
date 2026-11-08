## 2026-11-08 — Paso 4.26-1

- **Lo que contestó la persona:** la compuerta `datos` del plan, «aprobar», con las recomendadas de P1 a P7:
  - P1 la serie la cambia y la pestaña de Empresa la ve `empresa.ajustes.gestionar` (cierra 4-89 en la regla; la pestaña llega en el 4.26-3).
  - P2 un comprobante vigente por cotización: para emitir otro se anula el vigente.
  - P3 una cotización con comprobante, anulado o no, no va a la papelera (resuelve el P4 del 4.24).
  - P4 `datos` congela el recorte del nivel «todos» con sus etiquetas, la cotización, el origen, la razón social y el NIT; del cliente y del vehículo, sólo los
    ids (la auditoría del plan bloqueó congelar el nombre del cliente: lo leería quien ve la cotización y no el lead).
  - P5 anula la misma clave que emite, con motivo.
  - P6 una serie es de 1 a 12 caracteres A–Z, 0–9 y guion, en mayúsculas.
  - P7 con un comprobante vigente en la final actual no se marca otra final del vehículo; con sólo anulados, la vieja baja a preventa y queda viva.
- **Lo que se aprobó en permisos (la base):**
  - Tabla `comprobantes_ajustes` con RLS, sólo `select` para `authenticated` y la policy «leer» = emitir **o** `empresa.ajustes.gestionar`; la de
    `comprobantes_contadores` pasa a la misma regla.
  - `comprobante_emitir(uuid, timestamptz)` y `comprobante_anular(uuid, text) returns jsonb` reemplazan a las de la base (`drop` + `create`); nueva
    `comprobantes_serie_cambiar(text, timestamptz)`. Las tres `security definer`, `search_path = ''`, sólo de `authenticated` y `service_role`.
  - `_cotizacion_a_papelera` y `_final_aplicar` (de nadie) suman el chequeo del comprobante. Sin permisos nuevos; `aplicado_en` al día en la migración y en el seed.
- **Lo no obvio:**
  - **Una fila de ajustes y no una marca `vigente` en el contador:** con `for update` sobre «el contador vigente», una emisión que espera mientras se cambia la
    serie relee una fila que ya no es la vigente y no encuentra ninguna. La fila única se relee igual, con su serie nueva (K4).
  - **Orden de candados:** cotización `for no key update` → `comprobantes_ajustes` `for update` → contador. Cambiar la serie toma ajustes → contador; la papelera
    y marcar, sólo cotizaciones. Nadie toma esos candados al revés. `datos` se arma antes de tomar la serie, para que el candado del contador, que serializa todas
    las emisiones, dure sólo el `update` y el `insert`.
  - **El `update` del contador y el `insert` en un solo bloque `begin … exception`:** el `unique_violation` del índice de un vigente (sólo llega si alguien
    escribe un comprobante sin tomar la cotización) se traduce al PT409 de un vigente y la subtransacción devuelve el número (E7). Es defensivo: en Postgres,
    quien atrapa el error vuelve a su propio savepoint, que ya incluye todo lo que hizo emitir; el bloque cuida que un cambio futuro del manejador no deje el
    número consumido.
  - **`comprobantes_serie_cambiar` compara la versión a mano** y no con `_exigir_version()`: la esperada nula tiene que dar 22023 (la de la regla da P0001), y
    la distinta, un PT409 con texto propio de la serie («La serie cambió mientras la editabas…»). Los códigos son los de la regla.
  - **Emitir pide la versión de la cotización:** lo que se congela es lo que quien emite tenía en pantalla.
  - **Anular no devuelve el número:** la serie sigue y el anulado se queda con el suyo.
  - **Desvío del plan:** el 23514 de P7 no dice cuál comprobante («La final actual tiene un comprobante vigente: anúlalo antes de marcar otra final.»). Leer su
    serie y número en `_final_aplicar` la volvía fuente del inventario de `supabase/tests/numero-global.sql` (el detector busca la palabra y «lead» en el cuerpo),
    y con ella a `cotizacion_crear`, `cotizacion_hoja` y `cotizacion_evaluar`, que no devuelven el número de ningún lead. La sección «Comprobantes» del 4.26-2
    muestra cuál es.
  - **El comprobante heredado en las pruebas de la papelera:** PU2, PU5, PA1 y el P4 del spec de purgar mandan la final a la papelera y después insertan el
    comprobante como postgres: hoy emitir pide una final viva y la papelera rechaza una cotización con comprobante, y el caso que la purga sigue cubriendo es el
    que ya estaba en la base.
