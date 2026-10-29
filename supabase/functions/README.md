# Edge functions

Trabajo que no debe vivir en una Server Action que el usuario espera. Cada una se construye en la
fase que la necesita (`docs/PLAN.md`); hasta entonces sólo existe su contrato. Deno, `supabase
functions new <nombre>`, secretos con `supabase secrets set`, nunca en el código.

| Función               | Fase         | La dispara                                                               | Hace                                                                                                                                                                                                                   | Secretos                                              |
| --------------------- | ------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `apibara`             | 2 (parte 5)  | El navegador de quien da de alta o refresca un vehículo, con su sesión   | Consulta la API de Copart e IAAI: la ficha por enlace, VIN o lote, una foto y el uso de la cuenta. Ver «`apibara`» más abajo.                                                                                          | la clave de apibara, de Vault (`integracion_secreto`) |
| `push`                | 7            | Database Webhook en `notificaciones` (INSERT) con header `x-push-secret` | Lee `suscripciones_push` del destinatario con el cliente admin y envía con `web-push`; borra suscripciones 404/410.                                                                                                    | `VAPID_PRIVATE_KEY`, `PUSH_WEBHOOK_SECRET`            |
| `storage-gc`          | 2 (parte 4)  | `pg_cron` cada hora → `storage_gc_disparar(url)` → `pg_net`              | Canjea el pase que trae el pedido; si vale, reclama, borra por la API de Storage y confirma. Nunca recuenta ni decide por su cuenta. Ver «`storage-gc`» más abajo.                                                     | ninguno propio: la service key que inyecta el runtime |
| `avatares-miniaturas` | 3 (cierre 1) | `pg_cron` cada hora → `avatares_miniaturas_disparar(url)` → `pg_net`     | Canjea el pase (los de `storage-gc`); hace la miniatura de 96 px de hasta 20 avatares que no la tienen y la guarda si el avatar no cambió; una imagen que no lee queda marcada. Ver «`avatares-miniaturas`» más abajo. | ninguno propio: la service key que inyecta el runtime |
| `importar-csv`        | 9            | Server Action de `datos` tras subir el archivo al bucket `importaciones` | Parsea, valida por fila contra la plantilla, llama `crear_lead` (misma regla de limbo/duplicados) o inserta vehículos; escribe el informe en `importaciones`.                                                          | ninguno                                               |

## `apibara`

Existe para que la clave no salga de la base. No lee la clave la app de Next (el cliente admin está
prohibido ahí: `.claude/rules/datos.md`) ni el navegador: la lee esta función con la service key que
el runtime le inyecta. La llama el **navegador** con su sesión (`infra/apibara.client.ts` de
`vehiculos`), no una Server Action: el alta de varias líneas son consultas cortas con resultado por
línea, y guardar sigue siendo una Server Action con su RPC.

**La API** (verificada contra la documentación y con llamadas reales, 2026-10-14):

| Qué                  | Pedido                                                     | Notas                                                                               |
| -------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Base                 | `https://apibara.tech/api/v1/vehicle-auction`              | Clave en la cabecera `X-API-Key`. Sólo desde el servidor.                           |
| Ficha por enlace     | `GET /vehicles/urltodetails?url=<enlace de Copart o IAAI>` | Devuelve `{ ok, url, data }`.                                                       |
| Ficha por VIN o lote | `GET /vehicles/{slugVin}`                                  | VIN de 17, lote, `slug_vin` o stock de IAAI `1110…`. Devuelve `{ data }`.           |
| Subastas próximas    | `GET /vehicles?upcoming=only`                              | Más de 30 min en el futuro y sin marca de venta. La app no la usa (ver DECISIONES). |
| Foto                 | `GET /image-proxy?url=<una URL de la respuesta>`           | Sólo por acá; la respuesta trae `media.items[].full` (Copart) o `.large` (IAAI).    |
| Uso                  | `GET /usage`                                               | `data.quota {used, limit, left}`, `data.period.quota_to`, `data.plan.name`.         |
| Errores              | 400 · 401 · 403 · 404 · 422 · 429 · 5xx                    | 429 = cuota del período agotada; reintentar sólo la gasta.                          |

**Lo que recibe** (`POST`, JSON, `verify_jwt = true`):

- `{ accion: 'ficha', origen, entrada }` → `{ ok: true, data: { consulta, data, url } }`. `data` es la
  respuesta en bruto (el navegador llena el formulario y lista las fotos con ella), `url` la dirección
  consultada (la API devuelve `url: true`, no la repite) y `consulta` el id con el que la función la
  guardó en `apibara_consultas` **a nombre de quien consultó** (`apibara_consulta_guardar`, service
  key). El alta (`vehiculo_crear`) y el refresco (`vehiculo_subasta_refrescar`) reciben ese id y la base
  copia el bruto de ahí: así sólo esta función origina lo que la base deriva (fecha y estado de la
  subasta), y la limpieza automática puede decidir por ellos. Si no se puede guardar, la ficha no
  vuelve (`proveedor`): no serviría para guardar el vehículo.
- `{ accion: 'foto', origen, url }` → los bytes (`application/octet-stream`), sólo de `cs.copart.com` y
  `vis.iaai.com`: con la lista libre, esta función sería un proxy abierto con nuestra clave.
- `{ accion: 'uso' }` → `{ plan, usadas, limite, restantes, hasta }` (nada más de la cuenta). Exige
  `empresa.ajustes.gestionar`.

**Qué hace, en orden.** (1) Le pregunta a la base **como quien llama** `apibara_contexto(origen)`:
si apibara aplica y está activa con clave, a qué dirección, qué plataformas, qué puede esa persona
(crear o editar vehículos en ese origen) y quién es (`usuario`). (2) Recién ahí lee la clave. La dirección sólo puede ser de
`apibara.tech` (si no, no manda nada). (3) Consulta con tope de 15 s y un solo reintento ante un 5xx
o un corte; nunca ante un 429.

**Errores como valores** (siempre HTTP 200, `{ ok: false, error: { codigo } }`; el texto lo pone la
app: `mensajeDeApibara()`): `apagada` · `sin_permiso` · `entrada` · `plataforma` · `no_soportado`
(400/422 o un enlace de otro sitio) · `no_encontrado` (404) · `clave_invalida` (401/403) · `cuota`
(429) · `tiempo` · `proveedor` (5xx o una respuesta que no se entiende). Sin datos personales en los logs.

Una consulta vale 24 h, la usa un solo vehículo y la propia persona es la única que la puede usar
(`_apibara_consulta_tomar`); el job `apibara-consultas-purgar` (04:40 UTC) borra las de más de 48 h.
`apibara_consultas` es sólo de `service_role`: el navegador no la lee ni la escribe.

**Pruebas.** Corre en Deno y no entra a lint ni typecheck. `src/modules/vehiculos/infra/funcion-apibara*.test.ts`
la carga en Node con un `Deno` mínimo y un `fetch` simulado que responde con lo grabado
(`e2e/fixtures/apibara/`): ningún pedido sale a la red. Los e2e nunca llaman a la API real; el de la
función real local sólo cubre los caminos que no llegan a apibara (sin sesión, sin permiso, apagada,
host de foto no permitido).

**En local:** `pnpm funciones` (o `supabase start` con el edge runtime arriba). Se la
alcanza en `http://127.0.0.1:54621/functions/v1/apibara`. No hay nada que desplegar aparte del
`supabase functions deploy apibara`: la clave ya está en Vault.

## `storage-gc`

El protocolo vive en SQL y está probado en humo (`supabase/migrations/20261013000400_storage_gc.sql`,
`…000900_papelera_purga.sql`, `…001000_storage_gc_funcion.sql`); la función sólo borra y confirma.

- **Reclamar** (`storage_gc_reclamar`): encola los huérfanos del bucket `vehiculos` (objetos sin
  fila, con más de 24 h) —de a una ventana de 10.000 objetos por nombre, siguiendo el cursor de `cola_gc_barrido`: cada
  pasada sigue donde quedó la anterior y al llegar al final empieza otra vuelta, así un bucket de cientos de miles no se
  recorre entero cada vez; un objeto de menos de 24 h que la ventana pasa lo encuentra la vuelta siguiente (cierre 1)— y, de lo que ya cumplió su espera en la cola, recuenta con
  `storage_refcount` teniendo tomado el candado del objeto. Con referencias, lo saca de la cola;
  sin ellas, lo marca `reclamado_en` y lo devuelve. Un reclamo sin confirmar se vuelve a ofrecer
  pasada una hora.
- **Confirmar** (`storage_gc_confirmar`): saca de la cola lo reclamado que ya se borró.
- **Rescatar** (`storage_gc_rescatar`): lo llama el trigger de toda fila que nace referenciando
  un objeto. Toma el mismo candado: si el objeto está reclamado, la fila no nace.
- **La espera:** 24 h para una foto eliminada (cubre el «Deshacer» y las subidas en curso); ninguna
  para lo de un vehículo purgado.

**Cómo se autentica.** Quien llama es la base, que no tiene dónde guardar un secreto de
infraestructura. `storage_gc_disparar(url)` crea un **pase** de un solo uso (`cola_gc_pases`, vale
10 minutos) y lo manda en el cuerpo; la función lo canjea con `storage_gc_abrir(pase)` usando la
service key que el runtime le inyecta (`SUPABASE_SERVICE_ROLE_KEY`), y sin un pase válido responde
401 sin tocar nada. Por eso lleva `verify_jwt = false` en `config.toml`. No hay secreto que cargar
ni que rotar, ni en Vault ni en `cron.job`.

**Si falla a medias.** Se cae entre reclamar y borrar: el reclamo vence a la hora y se vuelve a
ofrecer. Se cae entre borrar y confirmar: lo mismo, y borrar algo que ya no está no es un error.
Storage rechaza un bucket: no se confirma nada de ese bucket. Nunca se confirma algo que no se
reclamó, y nada se borra dos veces. `storage_gc_pendiente()` le dice a quien puede vaciar la
papelera cuánto lleva esperando lo que ya debía haberse borrado.

**Por despliegue (una vez):** `supabase functions deploy storage-gc` y, en el editor de SQL,
`select public.storage_gc_programar('https://<ref>.supabase.co/functions/v1/storage-gc');`. La
dirección no se puede saber desde una migración; el job (`17 * * * *`) queda con ella. La purga
automática de la papelera (`papelera-purgar`, `30 3 * * *`) la programa la migración. **Ojo con la
hora:** `pg_cron` corre en UTC (`cron.timezone = GMT`) y ningún job mira `ajustes_empresa.zona_horaria`:
`03:30` es la madrugada de Greenwich, no la de la empresa (en La Paz son las 23:30 del día anterior).

**En local:** `supabase start` sirve la función (si el contenedor `edge_runtime` quedó caído o se
cambió `config.toml`, `npx supabase stop && npx supabase start`). Desde la base se la alcanza en
`http://api.supabase.internal:8000/functions/v1/storage-gc`. Deno no entra en lint ni en
typecheck (`tsconfig` y ESLint excluyen `supabase/functions`): la cubre `e2e/vehiculos-papelera.spec.ts`,
que purga, la llama con un pase y comprueba que los objetos salieron de Storage.

Reglas: una función = un `index.ts` + `deno.json`; CORS sólo si la llama el navegador (`apibara` sí
lo usa: la llama el navegador; `storage-gc` y `push` no); errores como valores `{ ok, error }` en JSON; logs sin datos personales.

## `avatares-miniaturas`

Rellena la miniatura de 96 px (`perfiles.avatar_miniatura_ruta`) de los avatares que ya existían: lo nuevo nace con la suya
(la saca el navegador al subir). Cada hora `pg_cron` llama `avatares_miniaturas_disparar(url)`, que emite un pase de un uso
en `cola_gc_pases` (el mismo mecanismo de `storage-gc`) y lo manda por `pg_net`; la función lo canjea con
`storage_gc_abrir` y, si vale:

- pide a la base hasta 20 pendientes (`avatares_miniaturas_pendientes`: con avatar, sin miniatura y sin un fallo anotado);
- baja cada avatar con la service key, lo decodifica por sus primeros bytes (WebP, JPEG o PNG, con `@jsquash` en wasm: las
  versiones fijadas en `deno.json`), lo achica con el lado mayor en 96 sin agrandar y lo codifica en WebP;
- lo sube a `avatares/<persona>/<sha-256>.webp` y lo guarda con `avatar_miniatura_guardar`, que no escribe nada si la
  persona cambió el avatar mientras tanto;
- si no puede (un objeto que no está, uno que no es una imagen, uno corrupto), `avatar_miniatura_fallo` lo marca y no se
  reintenta cada hora: cambiar el avatar borra la marca.

Una miniatura que se reemplaza o se quita la encola un trigger de `perfiles` y la borra `storage-gc` recontando. `verify_jwt =
false` (la llama la base). En la nube: `supabase functions deploy avatares-miniaturas` y `select
public.avatares_miniaturas_programar('https://<ref>.supabase.co/functions/v1/avatares-miniaturas');`. La cubre
`e2e/perfil-avatar.spec.ts` (con `pnpm funciones`).
