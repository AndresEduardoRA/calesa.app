## 2026-11-07 — Paso 4.25-1

- **Lo que contestó la persona:** la compuerta `atasco` del plan, dos veces: «3.ª ronda acotada a C2» y «4.ª ronda acotada a C3.iv». La 4.ª pasó con observaciones,
  ya aplicadas. La compuerta `producto`, todas con (a): P1 la carrera en `supabase/tests/areas/final/` con su corredor (el A suma dos líneas a
  `scripts/carreras.mjs`); P2 marcar pide el lead en la cartera con `leads.editar`, como vincular; P3 si hay preventas del vehículo que quien marca no ve o no puede
  mandar a la papelera, se rechaza; P4 un vehículo vinculado a otro lead se rechaza; P5 con una final activa el vínculo no cambia; P6 (para el 4.25-1b) una final
  creada con `cotizacion_crear` deja el estado de marcarla. Y la compuerta `datos`: «aprobar».
- **Lo que se aprobó en permisos (la base):** `cotizacion_marcar_final` pide, además de ver la cotización y `cotizaciones.final.gestionar` del origen,
  `puede_actuar_lead(lead, 'leads.editar')` antes del candado y otra vez con el lead tomado (P2 a). Rechaza si alguna otra cotización viva del vehículo no pasa
  lo que pide `_cotizacion_a_papelera` para quien marca (P3 a). Rechaza también un vehículo de otro lead (P4 a). `vehiculo_vincular` rechaza desvincular o
  reemplazar con una final activa con lead (P5 a). `_final_aplicar` es nueva, `security definer`, sólo de `service_role`. Sin tablas, policies ni claves nuevas.
- **Lo no obvio:**
  - **El orden de candados es lead → vehículo → cotizaciones**, el de vincular (lead → vehículo) y el de la papelera de vehículos (vehículo → sus cotizaciones).
    Antes marcar tomaba primero su cotización, después las preventas y al final el vehículo (el `update` del vínculo) y el lead (la FK). R1 contra vincular y R2
    contra la papelera de vehículos daban 40P01 contra HEAD.
  - **El lead va `for no key update`** (no `for update`): marcar sólo cambia `tipo_lead_id`, que no está en ninguna clave. Choca con vincular, `_lead_mio`, la
    papelera de leads y otro marcar (`for update`, `for no key update`) y convive con el `for key share` de crear, encima, guardar y restaurar. Con `for update`,
    restaurar cotizaciones (vehículo → lead `for key share`) cerraba un ciclo (M16 hace caer R6).
  - **El vehículo va `for key share` y se escribe recién al final**, con todas las cotizaciones tomadas. El trigger `trg_vehiculo_cotizado` de crear, encima y
    guardar escribe el vehículo (`cotizado_en`, `for no key update`) después de tomar su cotización. Con el vehículo `for no key update` en el paso 2, encima
    contra marcar era un 40P01 (M14 hace caer R7 y R7b). `for key share` sigue frenando a quien lo toma `for update` (vincular, las papeleras de vehículos, la
    limpieza, que lo salta con `skip locked`).
  - **El vínculo se relee después de la pasada**, con una sentencia nueva: otro marcar sobre el mismo vehículo con otro lead pudo escribirlo mientras se esperaba
    (R5c). Se suma un cinturón en `_final_aplicar` (`where lead_id is null` y, si no tocó la fila y el lead es otro, el 23514), que reusa el 4.25-1b.
  - **Lo que cede:** crear, encima o guardar no esperan a marcar para sumar una preventa al vehículo. Su trigger espera a que marcar confirme si llega después del
    `update` del vínculo; si llega antes, marcar espera a que confirmen. Una preventa que no estaba confirmada al empezar la pasada queda viva al lado de la final,
    igual que si se creara un segundo después (crear lo permite). R6 y R7 lo fijan: la preventa restaurada y la versión encima quedan vivas.
  - **Una sola pasada en orden de id** (la cotización y todas las vivas del vehículo), el mismo orden que la papelera de cotizaciones. La final anterior baja por id
    (sólo si se tomó): una final confirmada después de la pasada da 23505, nunca se baja sin tomarla (F12).
  - **La vuelta:** si algo cambió mientras se esperaba (la fila ya no está viva, otro vehículo u otro lead), se suelta la vuelta con una subtransacción que atrapa
    sólo un SQLSTATE propio (`PF425`) y se vuelve a C1, que responde sin candado. A la tercera, PT409. «fin2» del A lo pide (guardar cambia el vehículo mientras
    marcar espera).
  - **El rechazo de P3 no filtra datos:** mandar a la papelera de quien marca preventas que no ve le mostraba número, título y clase en su papelera y le dejaba
    restaurarlas. Por eso se rechaza, sin candado (C1.8) y otra vez con todo tomado (C3.iii): sólo delata que existen, como el 42501 de antes.
  - **C3 mira que la cotización siga viva aunque (ii) ya lo cubre:** quitar esa mirada (M19) es equivalente en el efecto. Con la cotización en la papelera,
    `puede_cotizacion` da falso y responde 42501 sin aplicar nada. No en el texto: si además se perdió la cartera del lead, (i) responde antes «No encontramos este
    lead…» en vez de «No tienes acceso…» (los dos 42501). Se deja: es la regla única de C3 («lo que ya no está vivo, otra vuelta»).
  - **`medir-jobs.sql` no mide la limpieza a cualquier hora:** corre el job con `now() + 12 h`. Corrido entre las 12:00 y las 15:00 de La Paz cae antes de la hora del job (03:00) y
    devuelve «temprano» en 1 ms sin revisar nada. La cifra de este paso salió de la misma siembra con `now() + 16 h`, sin finales: mide la sonda nueva del ancla en los
    100.000 que no anclan, no el camino que devuelve `cotizacion_final`.
