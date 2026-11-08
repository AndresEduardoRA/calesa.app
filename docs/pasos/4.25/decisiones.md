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

## 2026-11-08 — Paso 4.25-1b

- **Lo que contestó la persona:** la compuerta `producto`, con la recomendada en las dos. P7 «rechazar»: crear una final sobre un vehículo con otra final activa
  se rechaza (23505) y no la reemplaza como marcar. D1 «aprobar»: la función nueva `_final_crear_mirar`.
- **Lo que se aprobó en permisos (la base):**
  - `cotizacion_crear` con una final pide ahora, además de `cotizaciones.crear|ver` y `final.gestionar` del origen, las miradas de marcar:
    - el lead en la cartera con `leads.editar` (P2 a), antes del candado y con todo tomado;
    - poder mandar a la papelera todas las demás vivas del vehículo (P3 a);
    - un vehículo sin lead o del mismo lead (P4 a).
  - `_final_crear_mirar` es `security definer`, sólo de `service_role` y no toma candados.
  - Sin tablas, policies ni claves nuevas. La preventa no cambia.
- **Lo no obvio:**
  - **La excepción del 4-17 con P7 a:** crear una final sobre otra final activa da 23505 y no la baja como marcar. «El mismo estado que marcarla» vale para
    todo lo demás: el vínculo, las preventas en un lote de quien crea, el lead a cliente y la actividad (N1). Una final `reportada` o `invalida` no ocupa el
    índice: crear la baja a preventa y la manda al lote, como marcar (N5 ii).
  - **P7 va antes del cálculo:** una final sobre otra activa se rechaza sin esperar la fórmula ni calcular (N5 i: gana el 23505 sobre un 22023 del cálculo). Con
    todo tomado se vuelve a mirar (una final confirmada mientras se esperaba, Q4). Si una final se confirma después de la pasada, el índice sigue dando el
    23505 de siempre.
  - **Ver el vehículo va antes que la ayudante:** si no, quien no ve el vehículo recibiría 23505, 23514 o el 42501 de las preventas, y sabría si tiene una final,
    un vínculo o preventas (N11, M20). La cartera va antes que el vehículo: un lead ajeno da el 42501 del lead, no el 23514 del vínculo (N2 iii, M7).
  - **Sin vuelta `PF425`:** marcar la necesita porque su cotización puede cambiar de vehículo o de lead mientras espera. Crear recibe el lead y el vehículo como
    parámetros: un lead o un vehículo que se fue a la papelera mientras se esperaba da el 42501 de siempre («no encontramos este lead», «no tienes acceso a este
    vehículo»), no el 23514 del lead en la papelera de marcar.
  - **El orden:** lead `for no key update` → vehículo `for key share` → fórmula `for share` → después del cálculo, las vivas del vehículo `for no key update` en
    orden de id → `insert` (el trigger sube el vehículo a `for no key update`) → `_final_aplicar`. Es el de marcar, con lo de crear en el medio. Con quién choca:

| Contra                            | Su orden                                                     | Por qué no cierra ciclo                                                   | Carrera                    |
| --------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- | -------------------------- |
| vincular, mismo lead              | lead FU → vehículo FU                                        | Se ordenan en el lead                                                     | Q1                         |
| vincular a otro lead              | lead' FU → vehículo FU                                       | Se encuentran sólo en el vehículo; crear relee el vínculo con todo tomado | Q2                         |
| papelera de vehículos             | vehículo FU → sus cotizaciones                               | Crear espera en el vehículo antes de su pasada                            | Q3                         |
| otra final, mismo lead            | igual                                                        | Se ordenan en el lead                                                     | Q4, Q9                     |
| otra final, otro lead             | igual                                                        | Se ordenan en la primera viva común (por id) o en el índice               | Q5                         |
| marcar                            | lead NKU → vehículo KS → vivas NKU                           | El mismo orden                                                            | Q6                         |
| encima                            | anterior S → lead KS → vehículo KS → `insert` (vehículo NKU) | La pasada de crear espera la anterior antes de su trigger                 | Q7                         |
| restaurar cotizaciones            | vehículo KS → lead KS → las de la papelera NKU               | Todo compatible; la pasada no toma las de la papelera                     | Q8                         |
| guardar                           | vehículo KS → la cotización NKU → (vehículo NKU)             | Guardar nunca espera algo que crear tome después de esperarlo a él        | «fin2», «g11», «g14» del A |
| crear una preventa                | lead KS → vehículo KS → `insert` (vehículo NKU)              | No toma cotizaciones ajenas                                               | —                          |
| limpieza                          | vehículo FU `skip locked`                                    | Salta el que crear tiene                                                  | —                          |
| papelera de leads                 | sus leads FU por id                                          | No toma cotizaciones ni vehículos                                         | —                          |
| mandar cotizaciones a la papelera | cada una NKU por id                                          | No toma lead ni vehículo; las dos pasadas van por id                      | —                          |
| editar el lead (`_lead_mio`)      | lead FU                                                      | Sólo el lead                                                              | —                          |

- **Lo que cede**, igual que en marcar: una preventa que llega después de la pasada (encima, restaurar, otra alta) queda viva al lado de la final (Q7, Q8).
- **Q10 inserta la preventa en la transacción de A**, no por otra conexión. Si B tomara algo que A necesita, la espera de A por una inserción en otra conexión
  no la ve Postgres (A está en el cliente) y la corrida se cuelga. En la misma transacción sale como 40P01 (M1 lo mostró).
- **M4, la mutación del orden pasada → `insert`, tiene que sacar la fila propia de lo tomado.** Si no, la segunda mirada ve la final recién insertada y toda
  final da 23505: la mutación cae por un motivo ajeno y no prueba la carrera (Q7).
- **El desvío de la fila:** N1 va en `areas/final/crear.sql` (ver la bitácora).

## 2026-11-08 — Paso 4.25-2

- **Lo que contestó la persona:** P1 a, P2 a y P3 a, las tres recomendadas.
- **P1 a: marcar no lleva versión esperada.** Es una excepción razonada a `datos.md:35`. Pasarla «sin default» rompe 7 llamadas de un argumento que no son
  del C: las carreras del A en `cotizaciones.mjs` y `cotizaciones-guardar.mjs`, `humo.sql`, `cotizaciones-visibilidad.sql` y `auditoria-leads.sql`. Haría falta
  un paso de base con rigor máximo.
  - Precedentes: `cotizacion_moderar`, `comprobante_emitir` y el abierto 4-95.
  - **Lo que se acepta:** si el autor guarda otro vehículo u otro cliente un segundo antes, se marca eso. Deshacerlo pide mandar la final a la papelera, y el
    lead no vuelve solo a prospecto.
- **P2 a: se puede marcar una vencida o de otra versión de la fórmula**, como en la base. El aviso de versión de la página basta.
- **P3 a: lo no guardado se pierde**, y el diálogo lo dice. Es lo mismo que decidió el 4.24-3.
- **La URL sin botón no hace nada.** Con una final o sin la clave, `?panel=marcar-final` no tiene quién la lea: no hay un dato que filtrar y la página ya dice
  la clase. Con el botón apagado, la URL avisa el motivo y se limpia.
- **La action mira la clave sin origen.** Sin `cotizaciones.final.gestionar` en ningún origen no llama a la base; el origen lo mira la base.
- **El aviso no dice cuántas preventas fueron a la papelera**, porque la RPC no lo devuelve: «Si el vehículo tenía otras, están en tu papelera.».
- **El diálogo se desmonta al entrar.** Por eso `marcarLaFinal()` cierra la URL y avisa antes de volver, y no toca estado después.
- **Un `<button>` con las clases de `<Button>`**, como «Enviar a la papelera»: el JS en frío de `/cotizaciones/[id]` tiene 8 KB de margen.
- **El registro del `<Confirmar>`** va en `confirmar-con-url-papelera.ts` y no en `areas-c/` (ver la bitácora, pedido 4).
