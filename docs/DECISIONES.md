# Decisiones

Sólo las **vigentes**, en orden de fecha: una regla por entrada. La entrada completa (contexto, alternativas, consecuencias) está en
`docs/archivo/DECISIONES.md` con **el mismo título**: búscala con grep. Las reemplazadas o que ya no aplican están sólo allá.

**Una decisión nueva** va al final: `## AAAA-MM-DD — <decisión en una línea>` (la fecha, de `TZ=America/La_Paz date +%F`) y un párrafo
corto: qué se eligió, por qué y qué se descartó. Si reemplaza a otra, la vieja se quita de aquí (sigue en el archivo) y la nueva lo dice.

## 2026-10-11 — Stack y andamiaje inicial

Next 16 App Router, React 19, TS 6, Tailwind 4, shadcn, TanStack Query, Zod 4, next-safe-action, nuqs y Supabase sobre Vercel Pro; ESLint con boundaries, lefthook+commitlint, Vitest+Playwright y hooks de Claude Code que bloquean. Descartados: TS 7, Biome, husky, Serwist.

## 2026-10-11 — Nivel 2, monolito modular con 17 módulos

`src/modules/<dominio>/` con capas `features`, `entities`, `infra` y API pública en `index.ts`; dependencias en un solo sentido (`docs/ARQUITECTURA.md`) verificadas por `scripts/mapa.sh --check`. La web pública es otro repo sobre el mismo Supabase.

## 2026-10-11 — Un motor de flujos para vehículos y repuestos, no tres copias

Un solo motor: `flujos` (uno por origen + uno de repuestos) con `fases`, `fases_transiciones`, `fases_requisitos`; tablas hijas con dos FK nullable (`vehiculo_id` | `repuesto_id`) + CHECK y una única RPC `cambiar_fase`. Un origen nuevo es una fila y su flujo nace por trigger.

## 2026-10-11 — Orígenes configurables: campos comunes como columnas, el resto en `atributos`

`origenes_campos` describe el layout; `vehiculos` tiene columnas para lo común (marca, modelo, año, VIN, lote, precio…) y `atributos jsonb` validado por trigger para lo específico. Un campo que necesite índice o unicidad se promueve a columna por migración.

## 2026-10-11 — La fórmula de cotización es un grafo versionado validado en SQL

`formulas.definicion` es una lista ordenada de nodos con operaciones cerradas; `validar_formula()` es el candado (sin ciclos, un único total); versionado append-only (un borrador y una publicada por origen); snapshot por cotización; el motor TS en `entities/` evalúa. Detalle en `docs/COTIZADOR.md`.

## 2026-10-11 — Permisos: catálogo fijo por código, roles libres, origen y alcance como parámetros

`permisos` se siembra por migración (una clave existe sólo si hay enforcement); `roles_permisos(rol, clave, origen_id NULL=todos, alcance propios|todos)`; unión sin herencia; dominancia (nadie otorga lo que no tiene); guardián diferido; `dueno` nunca pierde `equipo.*`.

## 2026-10-11 — Teléfono único global y enmascarado salvo cartera; leads en limbo

Índice único parcial del teléfono entre leads vivos; `telefono_principal` sin `select` y `leads_vista` lo enmascara con `telefono_lead()` (definer) incluso al dueño; limbo = sin filas vigentes en `leads_asesores`; `crear_lead` adopta y audita.

## 2026-10-11 — Policies de la fila propia inline, no por función

Las policies de `vehiculos`, `leads` y `cotizaciones` se escriben inline sobre las columnas de la fila (una función STABLE no ve la fila insertada en un `INSERT … RETURNING`); `puede_*(id)` queda para las tablas hijas. Regla en `.claude/rules/migraciones.md`.

## 2026-10-11 — Embarques y contenedores son grupos; la DUI es entidad

`transportes` 1:1 por unidad; embarque = grupo por `booking`, contenedor = grupo por `contenedor` (vistas); `declaraciones_aduana` N:M con `removido_en`. Editar un embarque es «aplicar a todos los del grupo», todo o nada con `PT409`.

## 2026-10-11 — Monedas: base + N tipos de cambio nombrados, congelados por cotización

`monedas` y `tipos_cambio(clave, moneda_de, moneda_a, valor)` con historial; la fórmula declara `buckets` → clave de tipo de cambio y la cotización guarda los `tipos_cambio` usados. El Modo Live oculta símbolos y cifras en toda la app.

## 2026-10-11 — Cola web: habilitado nace en false; prioridad ponderada

Ruleta con puntero, pegajoso, cupo y reasignación fuera de la cadena; `prioridad` divide la carga abierta por prioridad+1 y hay `max_intentos`. `habilitado` arranca apagado: un asesor entra a la rueda cuando alguien lo decide.

## 2026-10-11 — PDF de cotizaciones en servidor con `@react-pdf/renderer`

La plantilla versionada (`plantillas_tarjeta.definicion`) se renderiza a PDF en un route handler con `@react-pdf/renderer` (fuentes TTF); la tarjeta en pantalla usa el mismo modelo de vista. No hay imágenes de cotización en el cliente.

## 2026-10-11 — Íconos PWA neutros hasta que la empresa cargue su logo

`public/` lleva un ícono neutro generado (`design/ICONOS.md`); «Regenerar íconos» los produce desde `ajustes_empresa.logo_ruta` y `manifest.ts` prefiere los de la empresa cuando existen. Nada de marca ajena ni placeholders.

## 2026-10-11 — Lo que se dejó fuera a propósito

Fuera de alcance: editor de artes (Konva) y directorio de contactos (`navieras` es un catálogo plano; proveedores son texto en gastos). Se conservan el Modo Live (que además oculta símbolos de moneda) y los comprobantes de venta internos.

## 2026-10-11 — Boundaries con la sintaxis v7, no la legacy

`eslint-plugin-boundaries` 7: elementos como carpetas (`src/modules/*/features`, sin `**/*`), reglas en `policies` y `captured: { modulo: "{{ from.element.captured.modulo }}" }` para «mismo módulo». La sintaxis vieja muere en la v8.

## 2026-10-11 — shadcn dentro de `src/shared/ui`, con sus variables puenteadas a los tokens

Los componentes shadcn viven en `src/shared/ui`; `globals.css` importa `design/tokens.css` y define las variables semánticas de shadcn (`--primary`, `--border`…) como referencias a tokens, sin registrarlos en `@theme`. Un token nuevo que shadcn use necesita su línea en el puente.

## 2026-10-11 — `puede()` y el catálogo de claves viven en `src/shared/lib/permisos.ts`

`ClavePermiso`, `puede()`, `alcanceDe()` y `origenesCon()` están en `shared` con la misma semántica que `tiene_permiso()`, `alcance_de()` y `origenes_con_permiso()`; un test compara el catálogo con `supabase/seed.sql`. Permiso nuevo = seed/migración y `permisos.ts` en el mismo commit.

## 2026-10-11 — Lo que se ve sin sesión sale de `web.ajustes_acceso()`, con `primer_registro`

Las pantallas de acceso leen nombre, logo, locale, moneda base, registro abierto y `primer_registro` de la función DEFINER `web.ajustes_acceso()`; `registroDisponible()` repite en TS la condición del trigger `auth_registro_permitido()`. Lo que haga falta antes de ingresar se suma ahí.

## 2026-10-11 — `/auth/callback` canjea `code` (Google) y `token_hash` (correos)

Las plantillas de correo (`supabase/templates/`) arman `{{ .SiteURL }}/auth/callback?token_hash=…&type=…`; el handler acepta `code` y `token_hash`. `recovery` e `invite` siguen a `/auth/nueva-contrasena`. En la nube las plantillas se cargan a mano y `Site URL` debe ser la real.

## 2026-10-11 — `mi_sesion()`: la sesión entera en una ida a la base

RPC DEFINER `mi_sesion()` devuelve estado de cuenta, perfil, roles, concesiones y preferencias; `getSesion()` la envuelve en `cache()` de React: un JWT y una RPC por request. Un dato nuevo del shell sobre la persona se suma a esa función.

## 2026-10-11 — Google sin variable de entorno; el botón depende de lo que diga Auth

`/ingreso` consulta `/auth/v1/settings` y dibuja el botón de Google sólo si el proveedor está encendido; los fallos vuelven por `/auth/callback` como aviso. Nada que configurar del lado de la app; donde no hay credenciales, se apaga el proveedor.

## 2026-10-11 — El `index.ts` de un módulo se importa sólo desde Server Components

Un Client Component no importa `@/modules/<x>`; recibe actions o datos por props desde un Server Component. Dentro del módulo, `features/` toma implementaciones de `composicion.ts` (servidor) o `composicion.client.ts` (navegador), nunca de `infra/`.

## 2026-10-11 — La navegación se declara entera y un test la compara con las rutas que existen

`src/app/(app)/_shell/navegacion.ts` lista todas las pantallas de `docs/UX.md` con permiso y `disponible`; `navegacion.test.ts` falla si `disponible` no coincide con la existencia de `page.tsx`. Ningún enlace del menú lleva a 404.

## 2026-10-11 — Un módulo tiene dos entradas: `index.ts` (servidor) y `client.ts` (cliente)

`src/modules/<x>/client.ts` es la segunda entrada pública (sólo hooks, componentes de cliente o puros y tipos de `entities/`); el lint veta todo `@/modules/*/*` salvo `/client` y prohíbe a `client.ts` importar `./composicion`, `./infra`, `server-only` y `next/headers`.

## 2026-10-11 — El cliente admin tiene una sola excepción: `conAdminDeAuth()`

Sólo `equipo/infra/invitaciones.ts` crea el cliente admin, tras comprobar `equipo.usuarios.gestionar` con el cliente de quien invita, y entrega únicamente `auth.admin` envuelto en `CuentasInvitadas` (sin `.from()` ni `.rpc()`). El rol lo asigna `rbac_asignar_rol` con la sesión de quien invita.

## 2026-10-11 — El registro cerrado se comprueba al cerrar la transacción, no al insertar

`auth_registro_permitido()` es un constraint trigger diferido que lee la fila como quedó (Auth inserta la cuenta y luego le pone `app_metadata`); la app comprueba `registroDisponible()` antes del alta y al volver de Google. El e2e de invitación es la alarma si Auth cambia.

## 2026-10-11 — Un solo enlace de invitación vigente por persona

Se intenta el correo de Auth; si falla, se genera y muestra el enlace. «Copiar enlace» genera uno nuevo y avisa que el del correo deja de servir; generarlo exige dominar los roles de esa persona. La invitación vence con `otp_expiry`.

## 2026-10-11 — La perspectiva «ver como» viaja en una cookie y se calcula en SQL

Cookie `perspectiva` (httpOnly, de sesión, sin firma) con el id del rol; `mi_sesion(p_perspectiva)` devuelve `permisos_efectivos()` (mis permisos ∩ los del rol) sólo a quien tiene `equipo.roles.gestionar` real. RLS, RPC y `actionClient` siguen con permisos reales: la perspectiva sólo dibuja.

## 2026-10-11 — La vista previa de una baja es una RPC que sólo cuenta

`equipo_vista_previa_baja()` (STABLE, DEFINER, `assert_permiso`) devuelve sólo conteos y comparte `_leads_al_limbo_de()` con `equipo_dar_de_baja`; el diálogo tiene URL (`?baja=`) y el Server Component pasa el conteo por props. Nadie confirma sin ver el número.

## 2026-10-11 — La versión de un rol cubre sus concesiones; bloquear usa el estado

La versión de un rol es `roles.actualizado_en`: otorgar, revocar y eliminar la reciben, bloquean la fila, levantan `PT409` y devuelven la nueva; en la matriz van de a una por rol. Bloquear y dar de baja usan el estado de la cuenta como precondición; asignar/quitar un rol es idempotente.

## 2026-10-11 — El guardián cuenta la unión de roles y cuida todo `equipo.*` del dueño

Debe quedar al menos una persona operativa (activa, sin bloqueo, invitación aceptada) cuyos roles sumados den los dos permisos de administración, y el rol dueño conserva todos los permisos de `equipo`. Un permiso nuevo de `equipo` se otorga al dueño en la misma migración.

## 2026-10-11 — Voz: español neutro con tuteo, también en la base

Tuteo en todo lo que llega a la pantalla, incluidos los `raise exception` de las RPC (su mensaje se muestra tal cual); `errores.ts`, `safe-action.ts` y las funciones SQL se escriben en español neutro de tú.

## 2026-10-12 — Secretos: Vault por RPC para lo que se edita en la interfaz

Lo que el dueño carga desde la interfaz vive en Vault: `integracion_guardar_secreto()` (con `empresa.ajustes.gestionar`) y `integracion_secreto()` sólo para `service_role`; la app lee solo `integraciones.secreto_guardado_en`. La dirección de apibara sólo puede ser de `apibara.tech`. Entorno: `SUPABASE_SECRET_KEY`, `VAPID_PRIVATE_KEY`, Google.

## 2026-10-12 — La empresa se escribe sólo por RPC; sus tablas son de sólo lectura

`ajustes_empresa`, `monedas`, `tipos_cambio` e `integraciones` no tienen policies de escritura; cada edición es una RPC DEFINER que comprueba permiso, compara `actualizado_en` (`PT409`), sella quién cambió y aplica las guardas. Una columna editable nueva se suma a la RPC, no a un grant; monedas y tipos se desactivan.

## 2026-10-12 — El color de la marca se acepta si el texto de un botón se lee sobre él

Se rechaza el color sobre el que el texto de un botón no llega a 4,5:1 ni en blanco ni en tinta oscura; el mejor pasa a `--color-sobre-primario` y el texto de marca (`-ink`) se deriva por tema hasta AA. Entra por un `<style>`, no por `<html style>`.

## 2026-10-12 — Íconos: dibujados en el navegador, guardados en Storage, servidos por el manifest

Los íconos se dibujan con Canvas y, al confirmar, se suben a `marca/iconos/<hash>.png` con las rutas en `ajustes_empresa.iconos`; `manifest.ts` las declara y los `<link>` apuntan a `/iconos/vigente/<tamaño>`. Sin `sharp` ni `generateMetadata()` en el layout raíz.

## 2026-10-12 — Empresa es una pantalla con pestañas; cada formulario lleva de `key` lo que edita

`/configuracion/empresa` con la pestaña en `?seccion=`; entra quien tenga cualquiera de los dos permisos de empresa y ve deshabilitado, con motivo, lo que no puede editar. Cada formulario lleva de `key` `huellaDelFormulario()` de lo que muestra; el borrador guarda sólo lo cambiado.

## 2026-10-12 — Un logo no pasa por la compresión de fotos

SVG tal cual (≤ 200 KB, rechazado si trae código o no dice su tamaño); un raster va tal cual si su lado mayor ≤ 1024 px, si no se reduce a PNG sin pérdida. Tope 1 MB. Las «retenciones» son `papelera_dias` y `actividad_dias`.

## 2026-10-12 — Toda RPC de edición exige la versión: un nulo se rechaza

`p_actualizado_en_esperado` es obligatorio (sin default) en toda RPC de edición y un nulo se rechaza con mensaje legible; crear una fila no lleva versión. La regla está en `.claude/rules/migraciones.md` y `datos.md`.

## 2026-10-12 — Orígenes, campos y categorías se escriben sólo por RPC, con versión por fila

`origenes`, `origenes_campos` y `categorias` son de sólo lectura; cada operación es una RPC con permiso y versión por fila (editar un campo sólo choca con otra edición de ese campo). Ordenar bloquea el origen `FOR UPDATE` y renumera 10, 20, 30…; nombres únicos sin importar mayúsculas.

## 2026-10-12 — Un origen con uso se desactiva; sólo uno sin uso se elimina

Desactivar (`activo = false`) siempre se puede y es reversible («Deshacer»); un trigger impide recibir vehículos/cotizaciones nuevos. Eliminar sólo sin vehículos (papelera incluida), cotizaciones ni fórmula publicada, es irreversible y pide tipear el nombre.

## 2026-10-12 — Un campo con datos no cambia de tipo ni se elimina: se desactiva

Quitar un campo es desactivarlo (el dato queda); eliminar sólo uno propio sin ningún valor; cambiar el tipo sólo con 0 vehículos con valor y nunca en uno de sistema. Volver requerido y sacar una opción en uso se permiten con aviso y conteo (`origen_campo_impacto`, papelera incluida).

## 2026-10-12 — El tipo de un origen (subasta o manual) no cambia

El tipo no se edita (la RPC no lo recibe y el trigger `before update of tipo` lo impide); decide campos preconfigurados, regla `aduana` y mapeo `clave_apibara`. Un origen equivocado y sin uso se elimina y se recrea; `clave_apibara` y `apibara_plataformas` sólo existen en subasta.

## 2026-10-12 — Nombre, sustantivo y género: tres datos de la fila y reglas puras

Un origen tiene `nombre`, `sustantivo` y `genero`; la concordancia sale de reglas puras en `client.ts` (`claveDeNombre`, `generoSugerido`, `pluralDe`, `contados`, `frasePorVacio`). No hay columna de plural; la clave sale del nombre en el servidor, una vez.

## 2026-10-12 — El orden se cambia con botones y por movimiento relativo, no arrastrando

«Subir»/«Bajar» por fila con `aria-label`; la RPC recibe «después de X» (nulo = primero), no una posición. `destinoDeMovimiento()` mueve dentro del grupo; cambiar de grupo es editar `grupo`. Sin dnd-kit por ahora.

## 2026-10-12 — Quién abre Configuración › Orígenes: sin `origenes.ver`

Entra quien tiene `origenes.gestionar`; de sólo lectura (deshabilitado con motivo) quien tiene `flujos.configurar` o `cotizaciones.configurar`. No se crea `origenes.ver` (sin enforcement no hay permiso); `origenes_resumen()` pide uno de los tres.

## 2026-10-13 — FilterShell vive en `shared`; las vistas guardadas las posee `equipo`

`shared/lib/filtros` (esquema declarativo, lectura tolerante de la URL con `leerFiltros()`, chips) y `shared/ui/filtros` (`<FilterShell>`) no importan módulos; cada listado arma su esquema en `entities/`. Las vistas guardadas son de `equipo` (`leerVistas`, `<MenuDeVistas>`) y guardan parámetros de URL.

## 2026-10-13 — Un solo esquema Zod, armado desde el layout, valida en el navegador y en el servidor

`esquemaDeVehiculo(fuentes)` arma el `z.object` desde el layout; el formulario y la Server Action (que relee el layout) usan la misma función, con errores por campo (`porCampo`). Un tipo de campo nuevo se suma en `ESQUEMA_POR_TIPO`, `CONTROL_DE_TIPO`, `LECTOR_POR_TIPO` y `FILTRO_POR_TIPO`.

## 2026-10-13 — Filtros sobre `atributos` por PostgREST, keyset y policy de InitPlan; el GIN no cuenta

Una consulta por página y por origen; keyset `(creado_en, id)` con `vehiculos_origen_listado_idx`; la clave del filtro sale del layout y todo texto pasa por `citar()`/`patronContiene()`. Bajo RLS ni el GIN ni los trigram se usan; la policy usa InitPlan; nunca un `null` en `atributos`.

## 2026-10-13 — Vehículos se escriben sólo por RPC; el alta entra a la única fase inicial

`vehiculos` es de sólo lectura; se escribe por `vehiculo_crear(p_id, p_origen, p_datos)` (id del navegador, idempotente) y `vehiculo_guardar(…, p_actualizado_en_esperado, …)`. El alta entra a la fase inicial sólo si no hay nada que decidir; si no, nace «Sin fase».

## 2026-10-13 — Campos sensibles: el esquema no los resuelve, y el inventario no muestra costos

No hay marca «sensible» en `origenes_campos`: RLS no esconde claves de un jsonb. Los costos (gastos, pagos, margen) llegan con logística bajo `logistica.gastos.ver`, `.pagos.ver`, `.margen.ver`; todo monto pasa por `<Monto>`. Ocultar un campo exige columna más vista/RPC que recorte.

## 2026-10-13 — Un VIN repetido bloquea, y se dice junto al campo

`vehiculos_vin_unico` es UNIQUE entre vehículos vivos y global (no por origen); la RPC lo detecta antes y responde con el VIN y `hint = 'vin'`. El mensaje dice que existe, no de cuál vehículo.

## 2026-10-13 — Los e2e del inventario no piden el equipo vacío

`e2e/soporte/inventario.ts` crea sus personas como invitadas con un rol de prueba con los permisos de vehículos y limpia sólo lo suyo (orígenes `e2e_…`, cuentas `@e2e…`, roles «E2E …»), de modo que corren con otras cuentas presentes.

## 2026-10-13 — Las fotos van a un bucket público, cada una en la carpeta de su vehículo

Bucket `vehiculos` público, ruta `<vehiculo_id>/<sha-256>.<webp|jpg>`; subir exige `vehiculos.editar` del vehículo de la carpeta, listar `vehiculos.ver`, borrar/pisar nadie desde la app. La misma foto en dos vehículos son dos objetos; lo confidencial va a `documentos` (privado).

## 2026-10-13 — Dos tamaños por foto, hechos en el navegador; sin optimizador

El navegador genera la completa (≤ 1600 px) y la miniatura (≤ 480 px), nombradas por hash y con caché de un año; listado, cabecera y grilla cargan sólo miniaturas con `<Image unoptimized loading="lazy">`. Safari devuelve PNG de un canvas: se mira el tipo del blob y se usa JPEG.

## 2026-10-13 — Las fotos tienen su propia versión, aparte de la de la ficha

`vehiculos_imagenes_version (vehiculo_id, actualizado_en)`: las tres RPC de edición de fotos (reordenar, portada, eliminar) la mandan; agregar no lleva versión (idempotente por hash). Su fila es además el candado que cuenta el tope de 24 fotos.

## 2026-10-13 — La limpieza de Storage reclama antes de borrar; la función queda para la parte 4

Nadie borra objetos de `vehiculos` desde la app: eliminar una foto encola sus rutas; la limpieza reclama con candado consultivo y recuento, y sólo borra lo reclamado con ≥ 24 h en la cola. Un trigger impide que nazca una fila sobre un objeto reclamado.

## 2026-10-13 — Una foto se valida decodificándola, y se reconoce por el hash del archivo original

El selector ofrece `image/*`; lo que no declara ser imagen se rechaza y lo demás se intenta decodificar (mensaje propio para HEIC). Tope de entrada 25 MB; el duplicado se detecta por el SHA-256 del archivo elegido (`vehiculos_imagenes.hash`, único por vehículo). Textos en `entities/seleccion-de-fotos.ts`.

## 2026-10-13 — Vínculo e interesados: RPC y lectura ahora, interfaz con leads

`vehiculo_vincular` (con versión del vehículo), `vehiculo_interesado_marcar` y `_quitar` (idempotentes, sin versión); la interfaz que escribe vive en `vehiculos`, compuesta por `app/`. «Editar» pregunta a la base con `vehiculos_editables(ids)` por lo vinculado a la cartera.

## 2026-10-13 — En plpgsql un permiso se pregunta con `puede_*()`, no con un `if` sobre `in (…)`

Las RPC comprueban permisos con `puede_vehiculo(id, clave)` (la regla de las policies, que vive en un `where` donde un nulo es «no»), nunca con `if … in (select …)`, que con nulos no levanta. Vale también para las RPC de leads y cotizaciones.

## 2026-10-13 — La vitrina muestra identidad, precio público, campos públicos y la portada; nada más

`web.vehiculos` expone sólo `id, numero, origen, origen_nombre, titulo, marca, modelo, anio, categoria, precio, precio_hasta, precio_nota, destacado, atributos, imagen, miniatura, actualizado_en`; `atributos` trae sólo campos `publico_web` activos. Ampliar es deliberado, columna por columna.

## 2026-10-13 — Una sola definición de lo público: el esquema `interno`

`interno.vitrina_vehiculos` proyecta todo vehículo vivo y calcula las cinco condiciones y `visible`; `web.vehiculos` es esa vista `where visible`, y `vehiculo_vitrina_previa()` y `vitrina_del_origen()` salen de ella. `interno` no se expone en PostgREST. Existe «publicado, no visible».

## 2026-10-13 — Publicar lleva la versión del vehículo y manda el estado entero

`vehiculo_vitrina()` tiene siete parámetros sin default con `p_actualizado_en_esperado` obligatorio; exige `vehiculos.vitrina` del origen y ver el vehículo; precio nulo = «Consultar»; despublicar apaga el destacado.

## 2026-10-13 — Qué no va a la papelera, y que todo lo que entra se pueda purgar

Una sola lista (`_vehiculo_motivo_de_bloqueo`) para enviar y purgar. Bloquea: vínculo activo, estar fuera de la fase inicial, comprobantes, pagos, gastos, declaración aduanera vigente o proyecto de repuestos vivo. Despublica y sigue lo publicado; los interesados se conservan.

## 2026-10-13 — Los vehículos tienen su papelera; el envío es por lote, con versión por vehículo

`vehiculos_papelera_enviar(p_vehiculos jsonb)` recibe `[{id, actualizado_en}]`, procesa cada uno en subtransacción y devuelve `enviados` y `rechazados`. `lotes_papelera.actualizado_en` es la versión del lote; restaurar vuelve sin publicar y deja pendiente lo que choca con VIN o lote.

## 2026-10-13 — La purga manual y la automática son la misma función

`vehiculos_papelera_purgar` y el job `papelera_purgar_vencidos()` llaman a `_papelera_purgar_vehiculos()`, que vuelve a preguntar qué no se purga; lo bloqueado se queda y el lote sigue abierto. Se encolan sin espera las dos rutas de cada foto; documentos y adjuntos conservan las 24 h.

## 2026-10-13 — `storage-gc` se dispara desde la base y se autentica con un pase de un solo uso

La base no guarda secretos: `storage_gc_disparar(url)` crea un pase (uuid, un uso, 10 minutos) que la edge function `storage-gc` canjea con `storage_gc_abrir()`; sin pase válido no hace nada (`verify_jwt = false`). `storage_gc_programar(url)` agenda la limpieza cada hora; `cola_gc_pases` es la bitácora.

## 2026-10-13 — Vitrina y papelera no suman permisos: los cuatro que había, todos con enforcement

Publicar: `vehiculos.vitrina` por origen; enviar: `vehiculos.eliminar` por origen y alcance; restaurar: quien envió el lote o quien purga, sin permiso propio; purgar y ver toda la papelera: `vehiculos.papelera.purgar`, global.

## 2026-10-14 — apibara: se guarda todo lo que devuelve, y cada dato normalizado es un campo

La respuesta entera va a `vehiculos.apibara_raw` (tope 512 KB) con `apibara_sync_en`; cada hoja normalizada (106 campos, catálogo en `_apibara_catalogo()` espejado en `catalogo-apibara.ts`) es un campo del origen con ruta con puntos en `clave_apibara`, no público. Un dato nuevo de la API no crea un campo solo.

## 2026-10-14 — Refrescar no pisa lo que la persona editó: tres vías con el bruto anterior

El refresco siempre actualiza `apibara_raw`, `apibara_sync_en`, `subasta_en`, `subasta_fin_en` y `estado_subasta`; del resto `fusionarRefresco(previo, nuevo, actual)` toma el valor nuevo sólo si lo guardado es lo que la API dijo antes. Lleva la versión del vehículo (`PT409`).

## 2026-10-14 — Las fotos de una subasta pasan por la tubería del navegador, en primer plano

La edge function descarga (sólo de `cs.copart.com` y `vis.iaai.com`) y devuelve bytes; el navegador los pasa por `prepararFoto()`/`subirFoto()` y registra con una llamada a `vehiculo_fotos_agregar` (guarda `origen_url`). Primeras 24 imágenes; no hay proceso en segundo plano: «Traer las que faltan».

## 2026-10-14 — La llamada a apibara vive en la edge function y la hace el navegador

Sólo la edge function `apibara` lee la clave (con la service key del runtime); la llama el navegador con su sesión tras `apibara_contexto(origen)` hecho como quien llama. Errores como valores (`{ ok: false, error: { codigo } }`, HTTP 200); guardar sigue siendo Server Action con RPC. Ningún test llama a la API real.

## 2026-10-14 — «Subastas próximas en la ficha» es la subasta de ese vehículo

El bloque «Subasta» de la ficha muestra la fecha de ese vehículo (zona de la empresa, cuenta regresiva), estado, puja y última consulta, con «Refrescar»; no usa `/related` ni `upcoming`. `subasta_en`, `estado_subasta` y `apibara_sync_en` tienen índices parciales.

## 2026-10-14 — El bruto de apibara lo origina la función; el navegador manda una referencia

La edge function guarda cada ficha en `apibara_consultas` (sólo `service_role`) a nombre de quien consultó; el alta y el refresco reciben su id y la base copia el bruto si es de quien llama, del mismo origen, < 24 h y de un solo vehículo. `vehiculos.importado_apibara` no cambia nunca; un job borra consultas > 48 h.

## 2026-10-14 — La regla de limpieza vive en un solo lugar de la base

Sólo funciones SQL (`_limpieza_aplica`, `_limpieza_termino`, `_limpieza_vence`, `_limpieza_ancla`, `_limpieza_fecha`); `limpieza_el(vehiculos)` es la columna calculada que leen filtro, insignia y banner. La fecha es un día local (después de las 03:00 va al siguiente); el interruptor apagado la vuelve nula.

## 2026-10-14 — Qué ancla y qué no; la cotización final queda para la Fase 4

Anclan: marca «Conservar», vínculo activo, fase posterior a la inicial, documentos, gastos, pagos, publicado en vitrina y lo que la papelera manual rechaza. Los interesados y «Sin fase» no anclan. Códigos en orden: `conservar`, `vinculo`, `fase`, `documentos`, `gastos`, `pagos`, `vitrina`, `bloqueo`.

## 2026-10-14 — «Conservar» es una marca aparte, sin versión, y restaurar la deja puesta

`vehiculos_conservados (vehiculo_id, conservado_por, conservado_en)` se escribe por `vehiculo_conservar(p_vehiculo, p_conservar)`: manda el estado deseado, sin versión, para quien puede editar el vehículo y sólo en importados de apibara, con fila en `actividad`. Restaurar un lote de limpieza deja el vehículo conservado.

## 2026-10-14 — El job: una vez por día local, desde las 03:00, lote acotado y con registro

`limpieza_automatica_correr(p_ahora, p_origenes)` (sólo `service_role`) corre cada hora (`7 * * * *`) y actúa a lo sumo una vez por día local desde las 03:00; la reserva es una fila de `limpieza_corridas` con índice único por fecha. Por vehículo usa `for update skip locked` y lotes `es_limpieza` de ≤ 200.

## 2026-10-14 — El lote de la limpieza lo ven y restauran quienes pueden vaciar la papelera

Un lote armado por el sistema (sin autor) sólo lo ven y restauran quienes pueden vaciar la papelera; se rotula «Limpieza automática del dd/mm». Quien creó el vehículo tuvo aviso y «Conservar»; si se le fue, se lo pide a quien administra.

## 2026-10-14 — El aviso: los próximos 3 días, y el interruptor apagado lo borra todo

«Se limpiará pronto» son los vehículos con fecha de limpieza en los próximos 3 días, hoy incluido (`VENTANA_DE_AVISO_DIAS`, igual en filtro, insignia y banner). El interruptor general nace encendido; apagado, no hay filtro, insignia, banner ni corrida.

## 2026-10-14 — Los textos de uso diario dicen «subasta»; el proveedor se nombra donde se configura

Alta, ficha, fotos y mensajes de error dicen «la subasta»/«el servicio de subastas» (`mensajeDeApibara()`); el nombre de la plataforma sale del dato (`raw.platform`). «apibara» sólo aparece donde se configura: Configuración › Integraciones, el campo del layout, «Plataformas» y los siguientes pasos de un origen.

## 2026-10-14 — El motor de campos es de `shared`, y los leads lo usan

Lo independiente de qué se configura vive en `shared/lib/campos` (puro) y `shared/ui/campos` (editor con operaciones del módulo por props); en SQL son funciones `_campo_*`, `_campos_*`, `_atributos_*` sin leer tablas. Cada módulo conserva su política (campos, claves reservadas, permiso). `shared` no sabe qué es un lead.

## 2026-10-14 — Los leads suman `correo` y `documento`, y nacen «solo la cartera»

Los tipos de campo de un lead son los de un vehículo sin VIN ni lote, más `correo` y `documento`; nacen «solo la cartera». Cada layout limita sus tipos con un `check` (`leads_campos` sin vin y lote; `origenes_campos` sin correo y documento). Los teléfonos extra siguen en `leads_telefonos`.

## 2026-10-14 — Configuración › Leads reusa `leads.configurar`

Un solo permiso, `leads.configurar`, gobierna toda la configuración de leads (campos, orígenes de lead, tipos de seguimiento), como `origenes.gestionar` cubre campos y categorías. Separar sería un permiso nuevo con su enforcement.

## 2026-10-14 — Las seis columnas de un lead pasan a atributos, sobre la base viva

Edad, ciudad, país, dirección, género y notas son campos de fábrica en `leads.atributos`; la definición de `leads_vista` está en `_leads_vista_crear()`. `crear_lead` conserva su firma: los datos propios van en `atributos` y una clave suelta se rechaza diciendo dónde va. El país lo precarga el formulario.

## 2026-10-14 — Los privados se recortan al leer, con la cartera de ese momento; filtrar es leer

`leads.atributos` no tiene grant: se lee por `leads_vista.atributos` (`atributos_lead()`, definer). La cartera recibe todo; quien sólo ve el lead recibe las claves no privadas (activas o no); quien no lo ve, nada. `actividad` no entrega `antes`/`despues`; un `select *` de `leads` falla a propósito.

## 2026-10-14 — «La de la empresa» es una columna, no una referencia dentro del valor

`leads_campos.valor_defecto_empresa` (`ciudad` o `pais`), excluyente con un valor fijo y sólo en campos de texto; se resuelve al leer el layout con los ajustes de la empresa. Sin dato de la empresa, el alta sale vacía y el editor lo dice.

## 2026-10-14 — «De fábrica» reemplaza a «de sistema» para los campos

Un campo que nació con la preconfiguración se llama «de fábrica» (insignia, panel y mensajes; la columna sigue siendo `es_sistema`): se edita, apaga y renombra, pero no se elimina ni cambia de tipo o clave. «Sistema» nombra el rol dueño.

## 2026-10-14 — El alta rápida pide los requeridos propios, y el panel lo dice

El drawer «Nuevo lead» lleva los cuatro fijos y los campos activos requeridos; el resto va plegado en «Más datos». Volver requerido un campo avisa dentro del panel cuántos datos pedirá el alta y, desde el cuarto, que la meta de 25 s cuesta; la base rechaza un requerido faltante con el campo en el `hint`.

## 2026-10-14 — El alta rápida es una sola RPC: el lead, su seguimiento y el recordatorio entran juntos

`crear_lead(p_id, p_lead, p_seguimiento, p_recordatorio)` escribe lead (o lo adopta), seguimiento, recordatorio y último origen en una transacción; `p_id` del navegador hace idempotente el reintento (`repetido`). Teléfono existente/de otro/limbo son valores (`existe`, `de_otro`, `limbo`), no excepciones.

## 2026-10-14 — El teléfono lo normaliza la base y el código de país es de la empresa

`normalizar_telefono(cc, tel)` acepta espacios y separadores, «+»/«00» = internacional, sin ellos nacional (código de empresa y 0 troncal fuera), 8–15 dígitos; `leads/entities/telefono.ts` es su espejo y un test lo ejecuta en PGlite. El código es `ajustes_empresa.telefono_cc`; no se adivina un «+» omitido.

## 2026-10-14 — Tomar un lead sin dueño exige aceptarlo, deja de dueño y no pisa

Un lead sin dueño se adopta sólo con `adoptar = true` («Tomar lead»); sin eso el servidor dice `limbo` y nada cambia. Quien lo toma entra como dueño; el nombre se conserva, el origen sólo se completa si estaba vacío y entran las claves de atributos que faltan. El valor `adoptado` del enum queda sin uso.

## 2026-10-14 — Ctrl/Cmd+Enter avanza al seguimiento y se guarda al final

En «Nuevo lead», `Ctrl/Cmd+Enter` valida y abre «Primer seguimiento» sin escribir; el segundo guarda todo. Los dos pasos son un solo formulario en el mismo drawer (el oculto no se desmonta); `Esc` del segundo vuelve al primero; atajos de fecha antes del campo de fecha.

## 2026-10-14 — `N` es de la pantalla; «Nuevo lead» siempre tiene botón

`N` abre lo propio de la pantalla (en vehículos, un vehículo, sin caer a lead si no se puede); donde no hay «nuevo» propio cae a «Nuevo lead». El botón «Nuevo lead» está siempre en la barra superior de quien tiene `leads.crear`; sin ese permiso no se monta botón, atajo ni URL.

## 2026-10-14 — El formulario por bloques y los controles por tipo son de `shared`

`shared/lib/campos` suma `valor.ts`, `controles.ts` (un `Control` por cada uno de los 14 tipos) y `esquema-de-valor.ts` (correo y documento espejan `_lead_atributos_formato()`); `shared/ui/campos` suma `<CampoDeFormulario>` y `<BloqueDeCampos>`. Vehículos conserva sus datos comunes, apibara, lector y filtro.

## 2026-10-14 — Cómo se mide la tarea de oro 1

El e2e hace el recorrido de «Nuevo lead» sólo con teclado y comprueba ≤ 8 teclas de control, el reloj del robot bajo un tope generoso y la estimación KLM (0,28 s por tecla, 1,35 s por decisión) ≤ 25 s. El reloj del robot no es la hora de una persona.

## 2026-10-14 — El listado de leads: orden, «míos», búsqueda, privados y drawer

Orden `creado_en desc, id desc` (`leads_listado_idx`); «míos» es `leads_vista.en_cartera`; la búsqueda es por nombre y `#número`, nunca por teléfono; filtrar por privado con «todos» sólo encuentra lo propio y se dice; el drawer lee desde el navegador; de `atributos` sólo las claves `en_tabla`.

## 2026-10-14 — `alcance_de()` y `atributos_lead()` más baratas: lo que midió el listado

`alcance_de()` lee `usuarios_roles ⨝ roles_permisos ⨝ perfiles` con la clave en el WHERE y `atributos_lead()` resuelve todo en una llamada; misma semántica, y un caso de `humo.sql` compara `alcance_de()` con `mis_permisos()`. Con la base viva, las migraciones van con `supabase migration up`, no `db:reset`.

## 2026-10-14 — La versión de un lead la mueve lo que la ficha edita, y nada más

`lead_version()` (BEFORE UPDATE) mueve la versión sólo si cambia nombre, tipo, origen, atributos, teléfono o papelera; no la mueven `ultimo_seguimiento_en`, la cartera ni `creado_por`. `lead_auditar()` nunca guarda `telefono_principal`; una columna derivada nueva queda fuera de la lista.

## 2026-10-14 — `lead_guardar` es la única puerta, y los atributos viajan como parche

`lead_guardar(p_lead, p_actualizado_en_esperado, p_cambios)`; `leads` queda sin UPDATE para la app. `p_cambios` lleva `nombre`, `tipo`, `origen_lead_id` y `atributos` como parche (`{clave: valor}` pone, `{clave: null}` quita). Inexistente, limbo, papelera y sin acceso dan el mismo `42501`.

## 2026-10-14 — Los teléfonos de un lead se leen por función, y `telefono_lead()` da nulo a quien no ve

`leads_telefonos` no tiene grant ni policy para la app; se lee por `lead_telefonos(p_lead)` (definer: completo a la cartera, enmascarado al resto, nada a quien no ve). `telefono_lead()` devuelve nulo si no se ve el lead; quien no es de la cartera sólo ve al dueño en `leads_asesores`.

## 2026-10-14 — Teléfonos extra y cambio del principal: las reglas (para la parte 4b)

Los extras no se verifican contra otros leads, hasta 10 por lead, duplicado propio o igual al principal se rechaza, etiqueta opcional, agregar idempotente por id, quitar con «Deshacer», normalizados con el código de país del alta.

## 2026-10-14 — La ficha: tres lecturas, el código de país del lead y el tope de KB

Abrir la ficha son tres lecturas en paralelo y sin caché: `lead_ficha()`, el layout y los orígenes (también apagados); no lee `ajustes_empresa` y parte el número con `leads.telefono_cc`. Quien edita sin la cartera no recibe privados ni puede cambiarlos. El payload al navegar desde el listado tiene tope de 40 KB.

## 2026-10-14 — Tachados y claves de campo en la URL: no hay choque y no se reserva la clave

Los campos van en la URL con prefijo `a.` (`PREFIJO_DE_FILTRO`) y el filtro de tachados es `?tachados=`; no se reserva `tachado` en `CLAVES_RESERVADAS_DE_LEAD`. El estado por persona usa el nombre del glosario; si se pisa en pantalla, se renombra la etiqueta del campo.

## 2026-10-14 — Teléfonos de la ficha: cómo se aterrizó la 4b

`cambiar_telefono_lead(p_lead, p_actualizado_en_esperado, p_cc, p_tel)`: acceso, normalizar, igual al principal (`sin_cambios`, antes de la versión), número existente como valor, versión (`PT409`), escribir. El tope de 10 extras lo aplica «agregar»; extras sin versión; el anterior queda como «Anterior»; si `telefono_cc` es nulo se pide el «+».

## 2026-10-15 — El e2e completo parte de un reset, la guardia sólo comprueba las funciones, y el atajo de la pantalla gana

`pnpm test:e2e:completo` comprueba las funciones edge, hace `db:reset` y corre todo con `E2E_COMPLETO=1`; es lo que vale como «el e2e pasa». La guardia sólo falla si faltan las funciones; apibara se prueba con `e2e/fixtures/apibara/`. Migración nueva sin commitear: se corrige y se resetea.

## 2026-10-15 — Seguimientos y recordatorios se escriben sólo por RPC, y actuar exige la cartera

Las dos tablas son de sólo lectura; las escriben `seguimiento_crear|guardar|eliminar|restaurar` y `recordatorio_crear|guardar|completar|eliminar|restaurar`, idempotentes por `p_id` y con versión sellada por la RPC. Actuar pasa por `_lead_mio()` (`leads.ver`, `leads.editar` y cartera); editar un seguimiento: sólo su autor.

## 2026-10-15 — Privado es sólo de su autor; ni el co-asesor ni «todos» leen lo privado ajeno

Un seguimiento nace privado y sólo lo ve su autor; público («Visible para el cliente») lo ven quienes ven el lead y el portal. Quien ve «todos» sin cartera lee lo mismo que un co-asesor; la pantalla no insinúa lo que no ve (sin conteo ni «último seguimiento»).

## 2026-10-15 — El detalle viaja como documento del editor, nunca como HTML

El editor (Tiptap) manda su documento JSON de ProseMirror y la base lo valida contra lista blanca en `_seguimiento_detalle()` (nodos, marcas `bold`/`italic`/`link`, profundidad ≤ 6, ≤ 20 KB, ≤ 5000 caracteres); lo que no está se rechaza (`22023`). La pantalla dibuja con `DocumentoDeSeguimiento`, sin `innerHTML`. Columna `seguimientos.detalle_doc`.

## 2026-10-15 — El editor: carga diferida, atajos del marco y borrador en la pestaña

Tiptap (`StarterKit` recortado y `Link`) se pide al abrir el redactor, con tope 130 KB con gzip; `Ctrl/Cmd+Enter` guarda (el salto es `Shift+Enter`), `N` no se dispara dentro, y el borrador va en `sessionStorage` (`useBorradorDeEstado`).

## 2026-10-15 — Recordatorios: crear exige la cartera; si se pierde el lead, sigue sin él

Crear un recordatorio sobre un lead exige tenerlo en la cartera (`recordatorio_crear` acepta también uno personal sin lead); si se pierde el acceso sigue siendo de su dueño con el lead nulo en `recordatorios_vista`. Completar es «poner» (`p_completado`); cambiar la hora exige futura y reinicia `notificado_en`; eliminar es lógico.

## 2026-10-15 — Un seguimiento no mueve la versión del lead; la actividad deja constancia sin contenido

`ultimo_seguimiento_en` queda fuera de `lead_version()` y su trigger corre sólo si cambian `ocurrido_en`, `eliminado_en` o `lead_id`. `actividad` registra `lead.seguimiento_creado|editado|eliminado|restaurado` con `{seguimiento, tipo, visibilidad}` sin título ni detalle. `ocurrido_en` puede ser pasado, no futuro.

## 2026-10-15 — Un corte del runtime local de funciones se vuelve a pedir, con una sola regla

`e2e/soporte/funciones.ts` (`pedirAFuncion`) define «sin respuesta» (pedido no llegó o 502/503/504 sin cuerpo) y reintenta hasta 3 veces (la guardia 4), nunca ante una respuesta de la función; la guardia falla al primer 404. El spec usa `fetch` con el token de sesión.

## 2026-10-15 — Las marcas se escriben sólo por RPC, y marcar exige ver el lead (no la cartera)

Las cuatro tablas de marcas son de sólo lectura; `lead_favorito_poner`, `lead_tachado_poner` y `lead_etiquetas_poner` son «poner(valor)» (repetir da `sin_cambios`) y exigen ver el lead, sin versión ni tocar `leads`; las etiquetas llevan versión al renombrar/recolorear/eliminar. Topes 50 por persona y 20 por lead con candado por persona.

## 2026-10-15 — El listado lee las marcas como columnas de `leads_vista`; lo que midió

`leads_vista` expone `es_favorito`, `esta_tachado` y `etiquetas uuid[]` (las de quien mira); los filtros son condiciones sobre ellas (`eq`, `overlaps`) y el plan las resuelve como hashed SubPlan. Nombres y colores de etiquetas no viajan por fila: la página los lee una vez (≤ 50). Medición en `supabase/tests/medir-listado.sql`.

## 2026-10-15 — Los tachados se ocultan, salvo mientras se busca; el aviso cuenta con los mismos filtros

`?tachados=` es una elección con `ocultar` por defecto (no va en la URL), `incluir` y `solo`; con texto de búsqueda `ocultar` no se aplica. Un aviso cuenta los tachados que cumplen los filtros activos; si la página queda vacía sólo por ellos, el vacío lo dice. Un id de `?etiqueta=` inválido se quita con aviso.

## 2026-10-15 — Paleta de ocho claves en tokens; selector con cmdk; confirmar en la fila; sin atajo

Paleta de ocho claves (`gris`, `rojo`, `naranja`, `ambar`, `verde`, `turquesa`, `azul`, `violeta`) guardadas como clave, con `--etiqueta-<clave>`, `-soft`, `-ink` en `design/tokens.css` (≥ 4,5:1 en ambos temas). Selector Popover+cmdk; eliminar una etiqueta con leads confirma en la misma fila; sin atajo para favorito.

## 2026-10-15 — Parte 6a: toda RPC que recibe un lead cae en una de tres clases

Clase 1 (contenido y datos privados): cartera y permiso, con cualquier alcance (`puede_actuar_lead`, `_lead_mio`); clase 2 (quién lo tiene): el dueño o «todos», nadie se concede acceso a sí mismo; clase 3 (papelera): permiso con alcance. `supabase/tests/auditoria-leads.sql` y `matriz-leads.sql` fallan si una RPC de leads no está clasificada.

## 2026-10-15 — La papelera de leads: todo o nada, el lote lo genera el cliente, y lo vinculado no entra

`leads_papelera_enviar(p_lote, p_leads)` envía 1–200 leads todo o nada, idempotente por `p_lote` (lo genera el cliente), y revoca el portal. Un lead con vehículo vinculado, pagos o portal vigente no se envía ni se purga; restaurar deja adentro lo que choca con un teléfono vivo.

## 2026-10-15 — Lo que dejó la revisión de la 6a: carreras, `lead_id` en otras tablas y un cinturón más ancho

Toda RPC de clase 1 vuelve a preguntar el permiso/dueño con el lead bloqueado (autorizar, bloquear, volver a autorizar). `lead_id` en pagos, tareas, eventos, mensajes, repuestos_proyectos y web_testimonios se valida con el trigger `lead_visible_al_escribir`.

## 2026-10-15 — Parte 6b: vincular desde el lead, sin oráculo y con el lead bloqueado

`vehiculo_vincular` mira sin bloquear, luego bloquea el lead y después el vehículo (orden lead → vehículo), y no distingue vehículo oculto de inexistente. Reemplazar el lead de un vehículo exige tener ambos en la cartera. Marcar interés es «poner» (misma nota = `sin_cambios`).

## 2026-10-15 — La sección «Vehículos» vive en `vehiculos`, y lo que no se ve no se cuenta

La sección «Vehículos» de la ficha del lead vive en `vehiculos` y la compone `app/` (`leads` no importa `vehiculos`); se lee con `lead_vehiculos()` y `vehiculos_para_lead()` de invocador. La ficha del lead no cuenta los vehículos que no se ven; la del vehículo sí dice que hay un vínculo.

## 2026-10-15 — `vehiculo_id` en seguimientos y recordatorios: uno que se ve, y si deja de verse sigue

Las RPC de seguimientos y recordatorios sólo validan `vehiculo_id` cuando cambia (la base exige que se vea); si deja de verse se conserva y sólo su autor ve «un vehículo que ya no ves». `recordatorios.vehiculo_id` es `on delete set null`.

## 2026-10-15 — Las carreras se prueban con dos conexiones reales (`pnpm db:carreras`)

Las carreras de locks se prueban con `scripts/carreras.mjs` (`pnpm db:carreras`): dos conexiones `pg`, B debe figurar esperando un lock en `pg_stat_activity` antes de que A confirme; si no espera, falla sin reintentar. No entra en `db:probar`.

## 2026-10-15 — El tope del documento de la ficha vuelve a 44 KB; diferir los paneles no ahorra documento

Tope de 44 KB para el documento de «Datos» y «Vehículos» de la ficha. Si se pasa, recortar props: mandar a `FichaDeLead` sólo campos activos/con dato y los orígenes activos más el del lead.

## 2026-10-15 — Parte 7 partida en 7a y 7b; las quince preguntas se resolvieron con la recomendación

Oportunidades: `leads.editar` para crear, editar, mover y cerrar; `leads.ver` para ver; motivo de pérdida texto libre ≤ 200; moneda de la empresa guardada en cada oportunidad, sin conversión; eliminar es lógico con «Deshacer»; no se crean desde el kanban.

## 2026-10-15 — Los embudos son personales y se escriben sólo por RPC; las etapas se guardan como conjunto

`embudos` y `embudos_etapas` se escriben sólo por RPC `embudo_*` (clase M); las etapas se guardan como conjunto: 3–12, una inicial, ≥1 ganada y ≥1 perdida, nombres únicos sin importar mayúsculas. Hasta 10 embudos; el por defecto lo crea `embudo_por_defecto()`; FK compuestas.

## 2026-10-15 — Una oportunidad es de su dueña, con la cartera del lead; nadie más la ve

Las operaciones de oportunidad son clase 1 (dueña + cartera del lead + `leads.editar`, locks lead → embudo → oportunidad); sólo la dueña, con el lead vivo en su cartera, la lee. Mover recibe la etapa esperada (`PT409` si difiere); `cancelada` sólo la pone la baja.

## 2026-10-15 — Transferir lleva las abiertas al embudo del destino; la baja sigue cancelando

`lead_transferir` pasa las oportunidades abiertas al embudo por defecto del destino (a la etapa abierta del mismo nombre o a la inicial); las cerradas se quedan. La baja de una persona pone sus abiertas en `cancelada`.

## 2026-10-15 — El kanban: 50 por columna, «Ver más», pestañas en el celular, y la sección de la ficha

Kanban `/leads?vista=embudo&embudo=<id>`: 50 tarjetas por columna con «Ver más (N)» por keyset; en el celular las etapas son pestañas (`?etapa=`) decididas por CSS; «Mover a…» es un menú y a una perdida pide el motivo.

## 2026-10-15 — La auditoría ampliada de la 7a, y lo que encontraron las pruebas

Toda función «definer» llamable `oportunidad_*` o `embudo_*` debe pasar por su bloque de la matriz de permisos; `embudo_por_defecto()` y similares se prueban con `pg_temp.bien()` (STABLE lee la foto de la sentencia que la llama).

## 2026-10-15 — Parte 7b: las dieciséis preguntas se resolvieron con la recomendación

Portal: «Generar» la clave lo hace Postgres; `ajustes_web.direccion_publica` sin pantalla; la sección «Portal» sólo con cartera y permiso; revocar se confirma sin «Deshacer»; bcrypt costo 10, clave de 8–64 caracteres (≤ 72 bytes); novedades hasta 30.

## 2026-10-15 — El acceso del cliente: clase 1, sólo por RPC, con la versión del acceso

Acceso del cliente sólo por RPC clase 1 (`portal_estado`, `otorgar_portal`, `revocar_portal`, `portal_desbloquear`), con `otorgado_en` como versión (`PT409` si choca) y código nuevo al volver a otorgar. Sin grant a `authenticated` ni `trg_auditar`; transferir y la baja no tocan el acceso.

## 2026-10-15 — La clave del cliente nunca queda en claro

La clave temporal del portal la genera la base (`codigo_dictable(10)`, con `gen_random_bytes`) y nunca viaja como argumento ni queda en URL, console ni almacenamiento. `logging.serverFunctions: false` en `next.config.ts`. Hash bcrypt costo 10.

## 2026-10-15 — El texto para WhatsApp: la plantilla en el código, la dirección en `ajustes_web`

La plantilla del texto de WhatsApp vive en `entities/portal-mensaje.ts`; la dirección pública es `ajustes_web.direccion_publica` (nula, `check ^https://`) y la página compone `getAjustes()` y `leerDireccionPublica()` (`leads` no importa `empresa` ni `web`).

## 2026-10-15 — Contrato del portal para la Fase 8

`web.portal_login`, `portal_snapshot`, `portal_documento_ruta` y `portal_cambiar_clave` son sólo de `service_role`; el login responde igual a cualquier fallo (5 fallos = 15 min de bloqueo); la cookie va firmada con `lead_id` y `otorgado_en`; el cliente nunca ve costos, VIN completo ni privados.

## 2026-10-15 — La auditoría ampliada de la 7b, y lo que encontraron las pruebas

El cinturón falla si una función de `web` que recibe un lead la pueden llamar `anon`/`authenticated`. Tras un conflicto, el formulario espera la versión nueva (`useConflictoHastaLaVersionNueva`); un cambio a la vez usa `useCambioUnaVez`.

## 2026-10-15 — CSV de leads (Fase 3, parte 8a): exportar la cartera e importar con las reglas del alta

`leads.exportar` fuerza `en_cartera = true`, tope 5.000 filas, 5 por hora contadas en `actividad`, un POST con `Origin`. Importar se parsea en el navegador, cada fila pasa por `validarAlta()`, lotes de 50 (~600 KB) vía `leads_importar_lote`/`_lead_crear`; en masa no se nombra a nadie ni se adopta del limbo.

## 2026-10-15 — El reintento al volver la conexión sólo sale al volver: la causa del fallo de `leads-alta-casos`

`useReintentoAlVolver` reenvía sólo en la transición sin conexión → con conexión; si el envío falló con la red presente, la pantalla ofrece «Reintentar» (un servidor caído no se martilla).

## 2026-10-15 — Deshacer una importación (Fase 3, parte 8b): clase X, sólo lo intacto, 24 horas

`leads_importacion_deshacer(p_importacion)` es clase X: la autoriza haber hecho la importación, y sólo envía a la papelera (un lote) lo intacto, dentro de 24 h desde `terminada_en`. Los vínculos `importaciones_leads` se purgan a los 7 días (cron `importaciones-vinculos-purgar`); `authenticated` no escribe `importaciones`.

## 2026-10-15 — El país del teléfono: una tabla estática en el cliente, y «País» sigue al número

El país del teléfono sale de una tabla estática propia (`leads/entities/paises/`, 242 países, cargada con `import()`), sin SQL; «País» (`atributos.pais`, clave `pais`) sigue al número mientras esté vacío o puesto por el sistema. +1 y +590 no se adivinan. El CSV también completa «País».

## 2026-10-16 — El primer seguimiento del alta, opcional y enriquecido (Fase 3, parte 9b)

El paso 2 del alta (primer seguimiento) es opcional: se guarda lo escrito y lo vacío no; con detalle o próximo contacto se exige el resumen. `Ctrl/Cmd+S` guarda y deja el drawer listo para el siguiente. «Visible para el cliente» y `vehiculo_id` no entran al alta; `ocurrido_en` pasado sí, futuro no.

## 2026-10-16 — Guardar en Empresa: el formulario espera a lo guardado, y el borrador mide contra lo que mandó el servidor

El `<fieldset>` de un formulario que se remonta con la respuesta se deshabilita con `enCurso` (`isPending` de la transición). `useBorrador` mide contra `valoresGuardadosDe()` (lo que mandó el servidor); los formularios con `<select>` controlado pasan `controlado: true`.

## 2026-10-16 — Los avisos no reciben el puntero; el freno de CPU se borra; lo del borrador no se reproduce

Los avisos (sonner) dejan pasar el puntero: `toast: 'cn-toast pointer-events-none [&_button]:pointer-events-auto'` en `src/shared/ui/sonner.tsx`; un aviso con otro control debe ganarse su `pointer-events-auto`. Una prueba que pasa con y sin el arreglo no se conserva.

## 2026-10-16 — Los e2e reusan la sesión de cada cuenta dentro del proceso, y sólo eso

`entrar` de los e2e usa `entrarConSesion` (`e2e/soporte/pasos.ts`): primer ingreso por interfaz, luego cookies inyectadas (caché de 30 min); si `/` manda al ingreso, se descarta y se entra por interfaz. Un test que cambia a la persona o su acceso pide `{ fresco: true }`.

## 2026-10-16 — Parte 9c: los formularios que aparecen al pulsar algo van en un modal con su URL

Todo formulario que aparece al pulsar algo es un `<Modal>` con `?panel=` (ids en otra clave); un id inexistente se revisa una sola vez al abrir. Cerrar con cambios pregunta en el mismo pie (`useCierreConCambios`), mientras guarda el modal no se cierra, y un modal nunca abre otro.

## 2026-10-16 — Parte 9d: un solo modal de seguimiento, la pestaña del drawer y las acciones de la fila

Los modales de formulario usan `ModalDeFormulario` (`shared/ui`, con `useUnEnvioALaVez`, `useConflictoHastaLaVersion`, `useRevisionAlAbrir`). El borrador no abre el modal solo; «Recargar» relee lo cargado. Anotar/agendar desde el «⋯» de la fila usa `?para=<id>`; el drawer del lead tiene pestañas propias (`?pestana=`).

## 2026-10-16 — Parte 9d-2: el drawer con tres pestañas y las listas de un lead a escala

Listas hijas de un lead: tope de 500 cargados (`TOPE_DE_LO_CARGADO`, página `TAMANO_DE_PAGINA`=20 en `shared/lib/paginacion.ts`), «Ir a una fecha» para lo antiguo, «Recargar» de costo fijo (primera página + `lead_seguimiento(p_lead, p_id)`), recordatorios por RPC `lead_recordatorios()`; aviso de vencidos cuenta hasta 21.

## 2026-10-16 — Parte 9d-3: el recorrido de la IA con dos cuentas

Un recorrido de la IA usa la asesora de `seed.sql` y afirma sólo lo determinista (clic, cajas, 44 px, foco, URL). Todo formulario abierto con algo escrito se registra en `salida-con-cambios.ts` y las acciones con `sale: true` pasan por `salirSinPerder()`. `errorDePostgrest()` dice «No hay conexión…» ante fallos de transporte.

## 2026-10-16 — Parte 9e: la escala de toda la app, medida y con guardas

Un número que se muestra nunca es un total exacto: la consulta pide `tope + 1` y `conteoAcotado()` da `{ n, hayMas }` («más de N»). Código que se pide al usarse pasa por `diferido()` (el lint prohíbe `next/dynamic`). Cada módulo suma `shell.ts` para el layout `(app)`. Los jobs llevan tope por lote y por corrida.

## 2026-10-16 — Parte 9f-1: el origen del lead es configurable, y se escribe sólo por RPC

`origenes_lead` se escribe sólo por RPC `origen_lead_crear|guardar|mover|eliminar` con `leads.configurar`, versión y `PT409`; tope 100; orden por botones bajo `lock table … share row exclusive`; el trigger `lead_origen_vigente` impide guardar un origen apagado. Borrar sólo sin leads; el CSV nunca crea orígenes.

## 2026-10-17 — Parte 9f-2: los dos números de un lead, y el global sólo con un permiso

Cada lead tiene número propio (consecutivo del creador, por trigger y `leads_contadores`, nunca reutilizado) y número global, que sólo ve quien tiene `leads.numero_global.ver`. Se leen de `leads_numeros_globales` y `leads_numeros_propios`; `authenticated` no lee `leads.numero`; Realtime no los publica.

## 2026-10-17 — Parte 9g: ítems por página configurables, y la base acota toda página

Preferencia «Ítems por página» (10, 25, 50, 100) en `preferencias_usuario` clave `listas.por_pagina`, `?por=` acotado al máximo de la lista. La base acota toda página con `_acotar_pagina(pedido, por_defecto, máximo)`; guarda `scripts/guardas/paginas.test.ts` y `escala.sql`. Tamaños en `shared/lib/paginacion.ts`.

## 2026-10-17 — Parte 9h: la cartera de «todos» a escala, con la regla escrita una vez y estimable

`leads.cartera` y `leads.atributos_publicos` son copias derivadas por triggers; la visibilidad se escribe una vez en `_lead_visible_para(eliminado_en, cartera, alcance, yo)` (policy, `puede_lead()` y `atributos_lead()`). Cambiar un campo a privado va por lotes (`leads-campos-privacidad`). Máximo de leads por página: 100.

## 2026-10-17 — Cierre 1 (A): la baja de una persona va en dos tiempos, y la regla ya sabe que hay una baja en curso

`equipo_dar_de_baja` hace lo instantáneo, anota en `equipo_bajas` y corre el primer lote de 5.000 leads; el resto lo sigue el job `equipo-bajas` (cada minuto, `skip locked`). Mientras dura, `_bajas_en_curso()` hace que la regla de visibilidad vea el estado final (el lead es limbo para los demás).

## 2026-10-17 — Cierre 1 (B): una sola vista por lista, elegida en el servidor con el ancho de la petición

Las listas dibujan una sola vista, elegida en el servidor por la cookie `ancho` (si no hay, por `user-agent`: celular 400, resto 1280). `anchoDeEstaPeticion()` en el layout `(app)`, `<ProveedorDeAncho>` y `useAlMenos(corte)` (cortes 640, 768, 1024).

## 2026-10-17 — Cierre 1 (G): «página N» se descarta; arriba se dice lo que sí es verdad

Con paginación por cursor no se muestra «página N»: arriba de la lista va «Los más recientes» o «Creados hasta el …» más «Volver al principio» (`ubicacionDeLaPagina()` y `<UbicacionDeLaPagina>`).

## 2026-10-17 — Cierre 1 (C): un lote de la papelera muestra sus primeros 20, y la papelera no entra al selector

`leads_papelera_listar` y `vehiculos_papelera_listar` reciben `p_primeros` (por defecto 20, máx. 200) y «Mostrar los N» pide el lote entero (`leads_papelera_lote`, `vehiculos_papelera_lote`). Las papeleras no tienen selector de ítems por página.

## 2026-10-17 — Cierre 1 (D): los topes se dicen, con un solo aviso y sin inventar un camino que no existe

Toda lectura acotada pide `limit tope + 1`, corta con `cortarAlTope()` (`shared/lib/conteo`) y avisa con `<AvisoDeTope>`; sólo nombra un camino a lo no visible cuando existe.

## 2026-10-17 — Cierre 1 (E): para llegar a lo antiguo de una columna del kanban, buscar

Una columna del kanban dibuja hasta 500 tarjetas; para lo antiguo hay «Buscar en el embudo» (`?q=`, desde 2 caracteres, todas las columnas) vía `p_buscar` en `embudo_tablero` y `embudo_etapa_pagina` (de invocador). La búsqueda es de esa vista y no viaja a la lista.

## 2026-10-17 — Cierre 1 (F, d): el barrido de huérfanos de storage-gc sigue un cursor por bucket

`storage_gc_encolar_huerfanos` examina ventanas de 10.000 objetos por pasada en orden de nombre, con cursor por bucket en `cola_gc_barrido` (fila tomada `for update`); el tope es lo examinado, no lo encolado.

## 2026-10-17 — Cierre 1 (F, c): el avatar chico, con el relleno en una edge function

Cada perfil guarda `avatar_miniatura_ruta` (96 px WebP) además del avatar; un trigger la anula si cambia el avatar sin una nueva y la vieja va a `cola_gc_storage`. La edge function `avatares-miniaturas` rellena lo existente (cron horario, de a 20) sin mover la versión del perfil (`perfil_avatar_coherente()`).

## 2026-10-17 — Cierre 2 (0a): quien está en una baja en curso no figura como dueño para los demás

`leads_vista.dueno_id`, `lead_ficha()` y `web.portal_snapshot()` filtran con `usuario_id <> all (_bajas_en_curso())`. Un inventario en `humo.sql` falla si una función, vista o policy lee `leads_asesores … revocado_en is null` sin `_bajas_en_curso()` y fuera de su lista cerrada.

## 2026-10-17 — Cierre 2 (0a): `_bajas_en_curso()` no le dice nada a una cuenta que no está activa

`_bajas_en_curso()` devuelve `{}` a una cuenta apagada o bloqueada (aunque su JWT siga vigente); los jobs y `service_role` (sin `auth.uid()`) ven todo.

## 2026-10-17 — Cierre 2 (0b): la carrera real de `…002400` es de dos corridas de la misma baja, no la del commit

La carrera que cubre `_baja_lote_desde` es la de dos lotes de la misma baja a la vez (corrida manual de `equipo_bajas_continuar()` más el cron); `scripts/carreras/cartera.mjs` la provoca sin `sleep` con `lock table public.leads in exclusive mode`.

## 2026-10-17 — Cierre 2 (1): todo `<Confirmar>` tiene su URL, y una guarda lo exige

Todo `<Confirmar>` es un `Modal` con su URL (`usePanelPorUrl()`, `?panel=`; otra clave dentro de un panel), un solo vuelo y aviso sin conexión propio. La guarda `scripts/guardas/confirmar-con-url.test.ts` registra cada uno y falla si hay uno sin registrar; «Mover a…» con motivo es un `ModalDeFormulario` (`destino`, no `etapa`).

## 2026-10-17 — Cierre 2 (2, 4): «Mover a…» no se parte, y la tabla del listado se desplaza dentro de su tarjeta

La tabla del listado es `w-max min-w-full` y se desplaza dentro de su tarjeta; las columnas del nombre (mín. 16 rem) y de marcas/«⋯» quedan pegadas (`sticky`); la página no tiene scroll horizontal (`min-w-0` en hijos de grilla). El botón «Mover a…» lleva `shrink-0 whitespace-nowrap`.

## 2026-10-17 — Cierre 2 (3): un formulario que se reemplaza al llegar lo guardado apaga sus campos hasta entonces

Los campos de un panel que se remonta con lo guardado (`panel-tipo-cambio.tsx`, `panel-moneda.tsx`) se apagan uno a uno mientras `enCurso`, porque el `<fieldset>` no basta con los campos de Base UI. La regla está en `.claude/rules/ui.md`.

## 2026-10-17 — Cierre 2 (5): los avisos con un modal abierto sí se anuncian; lo que faltaba era preguntar al salir

Los avisos con modal abierto se anuncian (Base UI deja fuera de `aria-hidden` lo con `[aria-live]`); el clic en un aviso que sale de la pantalla (`sale: true`) con algo escrito pregunta en el pie del panel (`useCierreConCambios()`); «Deshacer» actúa en el lugar.

## 2026-10-17 — Cierre 2 (6, 7, 8): la barra que se desplaza lo dice, la barra superior cabe al 200 %, y los avisos y la insignia heredan la app

Las barras que se desplazan muestran degradado (`useDesborde()`, `<PistaDeDesborde>`); la barra superior del celular usa 44 px en `px`; el `<Toaster>` fija `fontFamily: 'var(--font-sans)'` en línea; `<Badge>` anima sólo el anillo de foco (`transition-shadow`).

## 2026-10-17 — Cierre 3 (0a): la policy de `leads_asesores` no entrega la fila de quien está en una baja en curso

La policy de `leads_asesores` suma `usuario_id <> all (_bajas_en_curso())`. Lo vigilan el inventario de policies de `humo.sql` y `supabase/tests/cartera-policy.sql` (huella md5 de lo que la policy entrega contra la regla escrita aparte).

## 2026-10-17 — Cierre 3 (1): las tarjetas del listado no ensanchan la página con el texto al 200 %

Las listas de tarjetas usan `grid-cols-[minmax(0,1fr)]` y `min-w-0`; el «⋯» mide 44 px sin achicarse, Anterior/Siguiente hacen `flex-wrap`, y con la tarjeta bajo 16 rem el tipo pasa debajo del nombre. `sinScrollHorizontal()` en los e2e nombra al elemento que se sale.

## 2026-10-17 — Cierre 3 (2): todo `<Drawer>` pregunta al salir desde un aviso; el `<Drawer>` lo hace, el formulario sólo dice que tiene algo escrito

El `<Drawer>` pregunta al salir con cambios; cada formulario sólo llama `useCambiosSinGuardar(hayCambios, alDescartar?)` (o `<CambiosSinGuardar>`). La guarda `scripts/guardas/drawers-con-salida.ts` registra todo `<Drawer>` con su formulario o su motivo.

## 2026-10-17 — Cierre 3 (3): el aviso sube sobre el pie de un panel, y crece con el texto

El `<Toaster>` usa `offset`/`mobileOffset` `var(--avisos-abajo, …)`; `useAvisosSobreElPie()` mide los pies abiertos (`sheet-footer`, `dialog-footer`, `data-pie-de-panel`) y sube los avisos. Texto y botones del aviso siguen la raíz en línea; iconos de 16 px.

## 2026-10-17 — Cierre 3 (4): las etiquetas de los botones sí crecían; lo que las hacía parecer quietas era `transition-all`

Botón y pestañas usan `transition` y nunca `transition-all` (anima `font-size`); la guarda `scripts/guardas/sin-transition-all.test.ts` lo impide. «Nuevo lead» de la barra superior en el celular es sólo un icono por diseño.

## 2026-10-17 — Cierre 4 (1): todo modal con algo escrito pregunta al descartar; un hook compartido y una guarda

Todo modal con formulario es `ModalDeFormulario`, con la lógica común en `useEnvioDeModal()` (`shared/ui`); «Invitar» abre otro modal «Invitación creada». La guarda `scripts/guardas/modales-con-salida.ts` registra todo `<Modal>` que no lo es (`propio` o `sinFormulario`) y prohíbe `<form>` en ellos.

## 2026-10-17 — Cierre 4 (2): la nota de un interés sin mandar cuenta como «hay cambios» y no se pierde al cambiar de vehículo

Las notas de «Agregar vehículo» viven en el panel (`{ id → nota }`); «hay cambios» es que alguna tenga texto y se declara con `useCambiosSinGuardar(hay, descartar, { preguntaAlCerrar: true })`, que hace pasar Esc, la ✕ y el clic afuera por `intentarCerrar`.

## 2026-10-17 — Cierre 4 (3): el aviso con descripción crece con el texto; la letra ya crecía, el ancho no

`--width` del `<Toaster>` es `min(22.25rem, 100vw − 2rem)` para todos los avisos, y `avisosAbajo()` toma el ancho de la columna con el `rem` de la raíz.

## 2026-10-17 — Cierre 4 (4): una captura se toma con la pantalla quieta

Toda captura e2e pasa por `capturarEn()` (`e2e/soporte/capturas.ts`): espera dos cuadros y el fin de las animaciones con fin (tope 2 s) y usa `animations: 'disabled'` + `caret: 'hide'` de respaldo.

## 2026-10-17 — Cierre 4 (5): hojas de contacto, y mirar es abrir todas

`scripts/hoja-de-contacto.mjs <carpeta>` monta las capturas en hojas rotuladas (escritorio 2×2, celular 3×1) más `hojas/indice.txt`; «mirar las capturas» es abrir todas las hojas (`.claude/rules/e2e.md`).

## 2026-10-17 — Cierre 4 (6): `importaciones-vinculos-purgar` no es lento; la importación recién creada sí, por falta de estadísticas

Los presupuestos de los jobs no se calibran con `CHECKPOINT`; el runner `scripts/medir-listado.mjs` informa al final qué pasaba (carga, WAL, checkpoints, autovacuums) y cada medición dice si es mediana de 5 corridas o una sola.

## 2026-10-17 — Cierre 4 (7): una base recién creada tarda 20 s en su primera importación; la semilla analiza

`seed.sql` termina con un `analyze` de las tablas de `public` y `web`; `medir-importacion.sql` tiene presupuesto «tal como queda tras el reset» (lote más lento ≤ 2 s, 500 filas ≤ 8 s).

## 2026-10-17 — Cierre 4 (8): el lote de la importación se queda en 50, y tiene su guarda

El lote de importación se queda en 50 filas (`FILAS_POR_LOTE`); `scripts/guardas/lote-de-importacion.test.ts` compara con él el tope de la RPC, su mensaje, la matriz, `escala.sql` y la medición.

## 2026-10-17 — Cierre 4 (9): los `beforeAll`/`afterAll` son 1,15 s por spec y proyecto; las cuentas se crean y se borran a la vez

En los e2e, `borrarPersonasDePrueba()` borra a todas a la vez salvo la más vieja (la dueña) y a ella después; `prepararAlta()` crea a la dueña primero y a las demás a la vez.

## 2026-10-17 — Cierre 4 (10): al 200 % los campos de un modal caben en él

El `<fieldset>` de `ModalDeFormulario` es una columna `minmax(0, 1fr)`, los `<select>` van `w-full min-w-0` y los campos de una fila se parten con `flex-wrap`; el e2e mide sin desplazar el cuerpo.

## 2026-10-18 — Parte 9i: un patrón de lista para toda tabla, el resumen de vehículos y el «⋯» del lead desde una sola lista

Toda tabla usa el patrón `@/shared/ui/lista` (la guarda `scripts/guardas/listas-con-patron.ts` lo exige): Tab en el botón del nombre (`<AbrirResumen>`), edición como hijo del drawer del resumen, y menús «⋯» desde `entities/acciones-de-lead.ts` y `acciones-de-vehiculo.ts`. Niveles 1/2/3 de verificación en `.claude/rules/e2e.md`.

## 2026-10-18 — Parte 9j (0a): `listas-por-pagina` en la página 3 no se reprodujo; qué se probó y qué quedó instrumentado

Un fallo no reproducido no se esconde alargando un `expect`: el reporter `e2e/soporte/reporter-de-fallos.ts` copia `test-results/` y el reporte a `e2e-fallos/<fecha>/` en toda corrida que falla (quedan los cinco últimos), y `listas-por-pagina` adjunta la línea de tiempo de red.

## 2026-10-18 — Parte 9j (0b): el «⋯» cuesta 3 nodos con un símbolo SVG compartido

El «⋯» es `<svg><use href="#…"/></svg>` dentro del botón, con el sprite `<SimbolosDeLista>` montado una vez en el layout `(app)`: 3 nodos por «⋯». Presupuesto de nodos del kanban: 10.250.

## 2026-10-18 — Parte 9j: los tipos de lead son una tabla con una clase fija, y el sistema razona por la clase

`tipos_lead` (clase «prospecto» o «cliente», inmutable) reemplaza al enum; el sistema razona por la clase, nunca por nombre o clave. Siempre queda un tipo activo de cada clase (`tipo_lead_clase_vigente()`); se escribe sólo por RPC `tipo_lead_*` con `leads.configurar`; tope 100 en `_tipos_lead_tope()`; `leads_catalogos()` da `{ origenes, tipos }`.

## 2026-10-18 — Cierre 5a: medir antes de arreglar (la búsqueda, la persona con pocos leads, la importación y la suite)

Quien agregue una consulta que recorre la cartera de quien mira dice cómo crece con N y la mide con 212.000 leads, no con 62.000. Las guardas con fórmula por N fueron un techo provisional; los arreglos 5a-fix-1a/1b las reemplazaron.

## 2026-10-18 — Cierre 5a-fix-2: importar en volumen no depende de `actividad` (la adopción del intento sólo se busca con `adoptar`)

`_lead_crear` sólo consulta «¿este intento ya entró por una adopción?» cuando el alta trae `adoptar`; importar 500 filas ≤ 2 s con ~124.000 filas de `actividad`. Quien consulte `actividad` por otra cosa que `actor_id`+`accion`+`creado_en` o `id` mide con 124.000 filas.

## 2026-10-18 — Cierre 5a-fix-1a: «míos» de quien tiene «propios» se lee por su cartera (la persona con pocos leads no recorre el índice entero)

Quien tiene `leads.ver` «propios» lee «míos» por `leads_cartera_vista` (unida a `leads_vista` por `id`, nunca por `creado_en`) con `leads_asesores.lead_creado_en` y `leads_asesores_listado_idx`; quien ve «todos» sigue en `leads_vista`. Lo decide `fuenteDelListado()`.

## 2026-10-18 — Cierre 5a-fix-1b: la búsqueda por nombre no depende de cuántos leads hay (candidatos por ventana, en dos pasos)

La búsqueda por nombre va en dos pasos: `leads_candidatos(p_filtros)` (security definer, K=300, ventana S=4000, luego el índice `leads_busqueda_idx`) y `leads_vista_por_ids`. Un filtro nuevo de leads con `ilike` o `@>` se lleva a los candidatos o se documenta cómo crece con N.

## 2026-10-18 — Cierre 5b: el `index.ts` de un módulo no exporta componentes, la ficha manda lo que dibuja y los cuatro defectos de interfaz

El `index.ts` de un módulo no exporta componentes: salen por `@/modules/<x>/pantallas/<pantalla>` (sólo `src/app`), vigilado por `scripts/guardas/barriles.ts`. Presupuestos de JS = medido + 5 %. Nivel 2 sólo por seis disparadores (`src/shared`, proxy, auth, RLS, layout, base).

## 2026-10-19 — Cierre 5a-fix-3: la suite de e2e baja de 42,0 a 31,7 min; el celular sale por demostración, no por el título

Un spec corre en escritorio y celular por defecto; sale del celular sólo con `// @sin-celular(-archivo): <motivo>` más la demostración del comparador de huellas (`E2E_HUELLA`, `scripts/comparar-anchos.mjs`), vigilada por `scripts/guardas/sin-celular.test.ts`.

## 2026-10-19 — Cierre 5b-fix: el buscador cabe por el ancho de la barra, el kanban no ensancha la página y «Nuevo lead» lee lo que necesita al abrirse

Bajo 24 rem de barra el buscador es un icono 44×44 (`aria-label` «Buscar»); el kanban cabe con `minmax(0,1fr)` y `min-w-0`, nunca con `overflow-hidden`; «Nuevo lead» lee `lead_alta_contexto` y `leads_campos` al abrirse, con memoria de 60 s (`olvidarDatosDelAlta()`).

## 2026-10-19 — Cierre 5b-fix-2: «Nuevo lead» es un solo drawer, montado cerrado, que cambia de cuerpo

«Nuevo lead» es un único `<Drawer>` montado siempre y cerrado (`marco-del-alta.tsx`); esqueleto, error y formulario son su cuerpo vía `<EnElMarco>`/`createPortal`. Un drawer que debe deslizarse la primera vez se monta cerrado; `useAbiertoAlgunaVez` es sólo para código diferido.

## 2026-10-19 — 5a-8: el buscador pide 3 caracteres para buscar por nombre; no se pagan n-gramas

La búsqueda por nombre exige 3 caracteres (un `#n` de un dígito sigue valiendo) y no se paga un índice de n-gramas de 1–2 caracteres: duplicaría el costo de altas e importación (500 altas de 1,1–1,7 s a 2,8–3,7 s).

## 2026-10-19 — 5a-4b: no se monta la segunda pila local de Supabase

No se monta una segunda pila local de Supabase para correr los dos proyectos de e2e a la vez; el Nivel 3 queda en ≈ 32 min y la salida futura son los shards de CI, cada uno con su pila Supabase y su base.

## 2026-10-19 — Cierre 5a-fix-4: el nombre se busca con 3 letras seguidas, «míos» por la cartera si es corta, la etiqueta por los candidatos y la policy de oportunidades por fila; 5a-9 queda abierto

Nombre: `[[:alnum:]]{3}` (`cumpleElMinimo()`); quien ve «todos» lee «míos» por la cartera si `leads_cartera_corta()` (≤ 5.000); la etiqueta entra a `leads_candidatos()`; la policy de `oportunidades` usa `_lead_vivo_en_mi_cartera(lead_id)` por fila.

## 2026-10-19 — Buscar un número entre los propios ajenos (5a-14), y 5a-9 a la Fase 4 sin cambios

`#n` se resuelve sólo con `leads_ids_del_numero(p_numero, p_todos)` (máx. 100 ids): con `leads.numero_global.ver`, el global y los propios de cualquier creador visible; sin él, el propio. La fila dice «Coincide: N.º 30 · Berta». El buscador de la Fase 7 usa esa función.

## 2026-10-21 — La rueda de turnos de la web, por rol (`web.cola.participar`)

Entra a la rueda quien está `habilitado` y tiene `web.cola.participar` por algún rol, con cuenta activa; la regla es `public.puede_estar_en_la_rueda(uuid)`, usada por rueda, pegajoso, turno abierto, reasignación y `estado_cola_web`. Quitar el permiso no toca `habilitado`.

## 2026-10-21 — 5a-15 no se reproduce: el hook se queda y el selector ignora un tamaño que no ofrece

`usePorPaginaDelListado()` no se toca: guarda y después navega; el selector ignora en `onChange` un tamaño que no ofrece. Un estrés opcional (`E2E_ESTRES=1`) vigila la carrera al tocar `shared/ui/filtros` o la preferencia; un fallo futuro es un defecto nuevo con número.

## 2026-10-21 — La matriz de Roles en el celular es una lista de un rol, y el panel de filtros va al costado sólo si cabe

Bajo 768 px la matriz de Roles es la lista de un rol (`lista-del-rol.tsx`); desde 768 px, la tabla. El panel de filtros va al costado sólo si el contenedor del listado mide ≥ 40 rem (`@min-[40rem]:` y `usePanelAlCostado()`); si no, es una hoja.

## 2026-10-21 — 8-2: `web.solicitar_asesor` responde el vencimiento que escribió

`web.solicitar_asesor` responde `expira_en` igual al `vence_en` que dejó en la tabla (`update … returning * into s`), también al reiterar con un turno abierto.

## 2026-10-21 — Dominancia sobre la persona: la regla (la implementación, a 9-1)

Nadie bloquea, da de baja ni cambia los roles de quien tiene permisos que él no cubre (según `rol_dominado()`); el dueño sí, sobre todos. Se implementa en 9-1 sobre `equipo_bloquear`, `equipo_dar_de_baja`, `rbac_asignar_rol` y `rbac_quitar_rol`.

## 2026-10-21 — Vencimiento de la invitación (`otp_expiry`): 24 horas en la nube

La invitación vence a las 24 h (`otp_expiry` 86400 s) en el proyecto de la nube; `config.toml` local queda en 1 h para los e2e. Hay un solo enlace vigente por persona.

## 2026-10-21 — Fotos de una subasta en segundo plano: no se hace

Las fotos de una subasta se bajan, comprimen y suben desde el navegador en primer plano; no hay job en el servidor. Se reabre sólo si hay reportes de fotos perdidas que «Traer las que faltan» no completa.

## 2026-10-21 — Rango de un campo numérico, `leads.campos.gestionar` y el campo «principal»: no antes de cotizaciones

Quedan para después: 9-2 (rango `min`/`max` de un campo numérico), 9-3 (separar `leads.campos.gestionar` de `leads.configurar`) y 6-1 (bandera «principal» de los campos de un origen). Hasta entonces un campo numérico acepta cualquier valor.

## 2026-10-21 — Configuración de leads: tipos de seguimiento, iconos del catálogo y origen por defecto

Tipos de seguimiento con RPC `tipo_seguimiento_crear|guardar|mover|eliminar`, tope 100 por catálogo y permiso `leads.configurar`; iconos = catálogo cerrado de 24 claves (`src/shared/lib/iconos.ts`); origen por defecto con índice único parcial, no se apaga ni elimina.

## 2026-10-21 — Cierre de defectos al 200 %: la lista del equipo, la matriz de Roles, el interruptor, Empresa y la barra de pestañas

Las pantallas de Configuración usan la barra `<PestanasConDesborde>`, no `<Tabs>`; el `<Switch>` mide en rem; un menú «⋯» no pasa del ancho de pantalla; nombres de tipo de cambio y moneda se parten, no se cortan. `listas-con-patron` sólo exime `matriz-de-roles.tsx`.

## 2026-10-21 — Cierre de pendientes del 200 %: el origen inactivo, el chip, el modal y la columna «Persona»

La raíz de `<FilterShell>` es grilla `minmax(0,1fr)` y todo texto escrito por la persona cede con «…» antes de ensanchar la página; «(inactivo)» del origen va en `<OrigenDelLead activo>`; la pista vertical del modal sólo se dibuja si hay algo escondido (`useDesbordeVertical()`).

## 2026-10-22 — La lista del equipo tiene tope de 100 y busca con tildes en el servidor; el interruptor era un problema de la tarjeta

La lista del equipo lee 101 y muestra 100 (`TOPE_DEL_EQUIPO`) con `<AvisoDeTope>`; `?q=` y `?estado=` se resuelven en `equipo_lista(texto, estado, límite)` con `_sin_tildes()` (unaccent) y GIN, en dos etapas (ventana S=2.000, luego trigram). `?persona=`/`?baja=` leen por id.

## 2026-10-22 — Apertura de la Fase 4 — Cotizaciones

D1 «vencida» = `creado_en`+`vigencia_dias`, sin estado nuevo; D2 «desactualizada» al guardar nueva; D3 lead obligatorio, vehículo por ajuste; D4 fórmula como texto compilada al grafo; D5 editar tabla publica N+1; D6 número global, serie por empresa. El `.xlsx` no se commitea.

## 2026-10-22 — 5a-4b: la cifra pasa a 40,1

Cifras vivas de la suite e2e: Nivel 3 ≈ 40,1 min (1.065 pruebas) y Nivel 2 ≈ 24 min (entradas posteriores citan ≈ 27 min en escritorio). La decisión de no montar segunda pila local y su assert (≤ 25 min) no cambian.

## 2026-10-22 — D7 · La hoja configurable: diseño, niveles de acceso y tipos de cambio

Tipos de cambio = lista de la empresa (`empresa.tipos_cambio.gestionar`); la fórmula viaja sólo con `cotizaciones.configurar` y la hoja calcula en la base; `cotizaciones_niveles` genera permisos `cotizaciones.nivel.<clave>.ver|editar`; una fórmula por origen con nodo `opcion`.

## 2026-10-22 — Paso 4.02: el equipo busca desde 3 letras con su propio mínimo, y Roles cuenta por una RPC con el id como literal

El equipo declara `MINIMO_DE_BUSQUEDA_DEL_EQUIPO` (3 letras, «Escribe al menos 3 letras»); `equipo_lista()` ignora texto sin tramo de 3; `roles_personas()` cuenta por rol con el id literal y `limit 1001`, con índice `usuarios_roles_rol_idx`.

## 2026-10-22 — Paso 4.03 (5a-10): un campo privado se filtra por los candidatos de la cartera, sin índice

Un campo privado se filtra con la clave `privados` de `leads_candidatos()`, sólo sobre la cartera de quien llama (fuerza «míos»), con ventana W antes del índice; presupuesto fijo ≤ 100 ms y 40.000 buffers con 62.000 y 212.000. No se indexa `atributos`.

## 2026-10-22 — Paso 4.03, prompt 2 (5a-35): el lead del número entra a los candidatos aunque el pedido no traiga etiquetas

Una variable derivada de `jsonb_typeof(…)` o de una clave que puede faltar se escribe con `coalesce(…, false)`; el lead del número (`extra`) entra a `leads_candidatos()` sin etiquetas si pasa `_lead_visible_para()`. Un filtro nuevo en candidatos prueba el número con y sin él.

## 2026-10-22 — Paso 4.03, prompt 3 (5a-9 y 5a-34): el texto y el rango de un campo, y los ocultos y la exportación, por los candidatos

El texto y el rango de un campo van a `comparaciones`/`comparaciones_privadas` de `leads_candidatos()`; el texto de un campo pide 3 letras; para «todos» sobre un campo público hay tope que se dice (10.000 leads, «Seguir buscando»); ocultos y conteo de exportación por ventanas.

## 2026-10-23 — Paso 4.04: dos e2e que no dependen del azar, la medición de la baja sin el cron, y 5a-11 sin arreglo

Un e2e que simula un estado que un job cierra lo deja en un estado que el job no puede cerrar (un lock retenido con `retener()`), no pausa `cron.job`; `medir-bajas.sql` sí pausa el cron mientras mide. Globales fijos de 7 dígitos en los e2e de HTML.

## 2026-10-23 — Cierre del 4.04: 5a-11 se acepta con la causa corregida, y la guarda baja sus topes

La baja de 200.000 se acepta en 9 corridas y 15,2 s (causa: `cartera` indexada, ningún update es HOT); `medir-bajas.sql` exige ≤ 12 corridas, ≤ 20.000 ms el job y ≤ 3.000 ms la corrida más larga. La opción de fondo es 5a-40, sin fase.

## 2026-10-23 — Paso 4.05 (1 de 4): la forma ampliada del grafo del cotizador

El grafo lleva `grupos: [{id, etiqueta, plazo?, tono, bucket}]` (el nodo dice `grupo: id`), `buckets` = N tipos de cambio con `total_en`, `sobrescribible: true`, `fuentes` default|sugerido|override|input, par porcentaje-monto (manda el monto con override) y a lo sumo un `opcion`.

## 2026-10-23 — Paso 4.05 (2 de 4): el motor del cotizador y sus faltantes

Un miembro de grupo debe dar monto por su tipo (`daMonto()`); lo que falta es valor (input vacío = 0, el resto null con código en `faltantes`); errores de llamada lanzan `ErrorDelMotor`; aritmética float8 en orden de lista; `redondear` = `round(numeric)`; `casos-del-motor.json`.

## 2026-10-23 — Paso 4.05 (3 de 4): la variante, lo sobrescribible y las fuentes del motor

La entrada suma `variante?` y `overrides` (por id); override > sugerido y quien tiene override no calcula sugerido; con override del monto el pct queda «pisado»; `sugerido_de` tipeado lleva `override`; `requerido_si` sin valor da null; grupo con miembro null da USD null.

## 2026-10-23 — Paso 4.05 (4 de 4): `validar_formula()` en la base, espejo exacto de `validar.ts`

`validar_formula()` es espejo exacto de `validar.ts`: rechaza con `22023`, regla en DETAIL y `donde` en HINT (`_formula_rechazar`); es STABLE; el corpus `supabase/tests/corpus-de-formula.json` da la misma regla en TS y SQL. «Sugerido: X» junto al modificado no se hace (4-1).

## 2026-10-23 — Paso 4.06 (1 de 2): `evaluar_formula()` en la base, espejo exacto de `evaluar()`

`evaluar_formula(p_def, p_params, p_entrada, p_modo default null)` es espejo bit a bit de `evaluar()` (no revalida; `match` y tramo comparan como float8; `set extra_float_digits = 3`; `__proto__` en un record se rechaza, 4-2), con corpus de paridad y mutaciones.

## 2026-10-23 — Paso 4.06 (2 de 2): `cotizacion_evaluar()` sobre `evaluar_formula()` y su assert de tiempo

`cotizacion_evaluar(p_entradas, p_cotizacion, p_origen, p_vehiculo, p_modo)` arma con `_cotizacion_armar()`; usa los tipos de cambio congelados de la cotización; un campo del vehículo es columna o clave de campo del origen (sin puntos); el vehículo sólo si `puede_vehiculo`.

## 2026-10-23 — Paso 4.07 (1 de 2): el compilador de fórmulas como texto y el cierre de 4-2

Gramática del compilador: números con punto, `%` sufijo, `+ - * /`, paréntesis, nombres = id de nodo (con mayúsculas) y `SUMA`, `SI`, `REDONDEAR`, `PORCENTAJE_DE`, `DEPRECIAR` con `;`; `HOY()` no soportado hasta 4-4; aplanado como el motor; 64 paréntesis y 100.000 términos máx.

## 2026-10-24 — Paso 4.07 (2 de 2): 4-3, el texto de la fila, el literal que no cabe y la salida por index

Un `campo` con punto se rechaza con la regla `campo_con_punto` (30.ª). `constante` y `calculo` llevan `texto?` de 1 a 2.000 caracteres (`MAXIMO_DE_TEXTO`; `compilarExpresion()` no lo toca). Un literal que se redondea a 0 es `numero_fuera_de_rango`.

## 2026-10-24 — Paso 4.07 (remiendo, prompt 3): el mínimo del `texto` y su mensaje

Los largos 1, 2 y 3 del `texto` se cubren con un mutador cada uno (`texto_de_1`, `_2`, `_3`), sin depender de la semilla. El mensaje de `forma` con su ruta es contrato para el `texto` (lo exige `validar-formula.sql`).

## 2026-10-24 — Paso 4.08 (1 de 3): el modelo del diseño de la hoja y su validación

`validarDiseno(def, diseno, { niveles, retirados, tonos })` y `validar_diseno()` rechazan lo mismo con el mismo código y `donde` (27 reglas cruzadas). Colecciones como arreglos, sin `z.record`; sin `solo_en`; «todos» nunca se retira; un modo de cambio exige `total_en`; el par va en una sola celda.

## 2026-10-24 — Paso 4.08 (2 de 3): el diseño en la fórmula, su visibilidad y el catálogo de tonos

Publicar exige `formulas.diseno`: valida con `validar_formula()` y `validar_diseno()` y compila `formulas.visibilidad` (claves de nivel). Tonos: catálogo de la empresa (tope 24, `cotizaciones.configurar`, AA en SQL), no se eliminan si una versión los nombra. `formulas` sólo la lee quien configura. Enmienda D7 «2026-10-22 — D7 · La hoja configurable: diseño, niveles de acceso y tipos de cambio».

## 2026-10-24 — Paso 4.08 (3 de 3): la semilla del cotizador, el check de «publicada tiene diseño» y un origen para el Excel

El seed trae `subasta_usa`, `planilla_usa` (tipo subasta, último en el orden) y `oficina`, con las fórmulas del juego, y nace por `_preparar_publicacion()`. Check `formulas_publicada_con_diseno` en `schemas/`. TC sembrados: oficial 11,68, paralelo 12,20, unificado 12,20, aduana 11,68.

## 2026-10-24 — Paso 4.09 (1 de 2): los niveles de acceso en la base

`cotizaciones_niveles` (tope 10, clave inmutable y única); cada nivel genera `cotizaciones.nivel.<clave>.ver|editar` y sólo estrecha (`_nodos_visibles()`). Ver restringido + editar abierto se rechaza (`editar_sin_ver`). Enmienda ci de «2026-10-24 — Paso 4.08 (1 de 3): el modelo del diseño de la hoja y su validación».

## 2026-10-24 — Paso 4.09 (2 de 2): la pantalla de niveles, la matriz de Roles y deshacer un retiro

Pantalla `/configuracion/cotizacion?seccion=niveles`: `equipo.roles.gestionar` actúa, `equipo.roles.ver` sólo lista (`niveles_con_uso()`). Retirar se hace al tocar con «Deshacer» (`nivel_restaurar`). TS reconoce niveles por patrón (`esClaveDeNivel()`), no por lista.

## 2026-10-25 — Paso 4.10 (1 de 3): lo que no se ve no viaja (la lectura)

`cotizaciones` se lee con grant por columna (incl. `tipos_cambio`); `cotizacion_leer`, `cotizacion_revisiones`, `cotizacion_tabla` y `cotizacion_evaluar` recortan por nivel sin ser oráculo. Un detector sobre `pg_proc` exige registrar toda función que devuelva contenido; la auditoría no copia el snapshot.

## 2026-10-25 — Paso 4.10 (2 de 3): escribir por RPC, cerrar la escritura directa y `cotizacion_crear`

Nadie escribe `cotizaciones` ni sus revisiones directo; `cotizacion_crear` es la única puerta de alta (`cotizaciones.crear` del origen, lead y vehículo visibles, candados `for share`/`for key share`). `total_base` va en la moneda base. Los avisos con barra lateral salen abajo a la izquierda. Reemplaza en el ancho del aviso de escritorio a «2026-10-17 — Cierre 4 (3): el aviso con descripción crece con el texto; la letra ya crecía, el ancho no».

## 2026-10-25 — Paso 4.10 (3 de 3): `cotizacion_guardar`, D2 en el alta, el detector y los candados

`cotizacion_guardar` es la única edición: calcula con SU versión y conserva lo oculto; vehículo `for key share` y cotización `for no key update`. D2 vive en `cotizacion_crear`. Intento + `huella` en la revisión (`intento_reusado`); una final pide `cotizaciones.final.gestionar`.

## 2026-10-25 — CI-1: GitHub Actions por niveles, el e2e en cuatro bloques y lo que queda fuera de CI

`ci.yml` con jobs `nivel-1`, `cambios`, `base`, `e2e-build` y `e2e` en 4 bloques `--shard`, `retries: 0`, sin acciones de terceros (por SHA, sólo `actions/`). `workflow_dispatch` tiene grupo propio; `db:medir*` fuera de CI y `db:carreras` sólo en el job `carreras`. Lo vigila `scripts/guardas/workflows.test.ts`.

## 2026-10-25 — CI-2: un spec prepara su estado, las esperas son de un estado, y los minutos medidos

Un spec prepara todo el estado que usa y no depende de lo que dejó otro (se prueba solo tras `pnpm db:reset`). Una medición espera un estado, nunca un tiempo: ni `waitForTimeout` ni reintentos. Medido: push con código 22 min, e2e a mano de escritorio 90.

## 2026-10-25 — CI-3: lo que acomoda la hidratación se mide con una espera propia, no cambiando `aLaVistaSinDesplazar`

Tras un `goto`, lo que una barra con desborde acomoda al hidratar se mide con `aLaVistaAlAcomodarse(lugar, que)` (`e2e/soporte/recorrido.ts`, `toPass` de 10 s); `aLaVistaSinDesplazar` no cambia y lo demás se mide una vez.

## 2026-10-26 — Niveles de e2e en la Fase 4: los pasos de pura pantalla van con Nivel 1 y el completo cada 3

Pasos de pantalla 4.12–4.14 y 4.16–4.23: Nivel 1 con e2e dirigidos; el completo de escritorio corre en el tercer paso de pantalla seguido sin completo y en el hito 4-A. Pasos de datos y seguridad (4.11, 4.15, 4.24–4.27): Nivel 1 y 2. La cuenta sale de `e2e completo: no (4.xx, pantalla, n de 3)` en BITACORA.

## 2026-10-26 — Paso 4.11: `puede_vehiculo()` y `vehiculos: leer` por fila, con la misma visibilidad

La policy `vehiculos: leer` y `puede_vehiculo()` calculan una vez por sentencia los orígenes «todos»/«propios» y lo propio por fila con `lead_id is not null and en_cartera(lead_id)`; misma visibilidad que antes (lo prueba `vehiculos-visibilidad.sql`).

## 2026-10-26 — Paso 4.12 (1 de 2): el núcleo de la `XCell`

`XCell` en `src/shared/ui/xcell/`: recibe `overridden`; el par son dos paradas de `Tab`; no emite sin cambio real (15 cifras); una parada de `Tab` por valor y las acciones con flechas; tonos por `data-tono`; en Modo Live la entrada es `type="password"`. Rango y obligatorio los valida la base.

## 2026-10-26 — Paso 4.12 (2 de 2): la ayuda y el ⚙ de la `XCell`, y el cierre de la fila

Ayuda y ⚙ se dibujan con bandera Y callback (`hasHelp`/`onHelp`, `hasSettings`/`onSettings`; `accionesDe()` en `estado.ts`) y emiten el id de la celda; la hoja decide permisos. Deshabilitada conserva ayuda y ⚙ (↺ se va); Modo Live conserva las tres. El atajo se anuncia con `aria-describedby`.

## 2026-10-26 — CI-4: una prueba que lee un texto que depende de un POST lento espera el POST, con un tope propio

Una prueba cuyo texto depende de un pedido lento espera el pedido: `page.waitForResponse` armado antes del clic, con tope propio de 30 s. No se tocan `expect.timeout` (5 s) ni `retries: 0`.

## 2026-10-26 — Paso 4.13 (1 de 4): la lectura que abre la hoja y el modo por clave

`cotizacion_hoja(origen)` (con `_cotizacion_hoja`) es la única lectura que abre la hoja: diseño recortado al nivel de quien mira, con `editable` y su motivo (`se_calcula`, `del_vehiculo`, `nivel`, `no_se_edita`). `cotizacion_evaluar(…, p_modo_tc)` elige el modo por clave.

## 2026-10-26 — Paso 4.13 (2 de 4): la hoja dibujada y el recálculo, sin guardar

En `/cotizaciones/nuevo` el recálculo va desde el navegador (`infra/recalculo.client.ts`, cola `useRecalculo()` de 150 ms); una celda cuya bandera no se ve se dibuja deshabilitada con «Está apagada en esta hoja.»; los textos de error son propios, nunca el de la base. Tope de 460 nodos DOM.

## 2026-10-26 — Paso 4.13 (3a de 5): la hoja abierta que firma la base, y cotizar pide ver

`cotizacion_hoja()` devuelve `abierta = <fórmula>.<µs>.<HMAC>` (clave en Vault `cotizacion:abierta`); `cotizacion_crear` y `cotizacion_evaluar` reciben `p_abierta`, no una hora del cliente. Cotizar pide `crear` Y `ver` del origen, en las RPC. Reemplaza la hora libre `p_abierta_en` (4-27).

## 2026-10-26 — Paso A0: el piloto avanza PLAN un paso por sesión, con un bucle que no es un modelo

Bucle bash (`scripts/piloto/bucle.sh`) con una sesión de `claude -p` por paso. El modelo nunca publica (el bucle verifica y corre `publicar.sh`); lo que autoriza vive en `<común>/piloto/` y sólo lo escribe bash; las compuertas llegan al celular; `scripts/candado.sh` serializa la base entre worktrees.

## 2026-10-26 — E1: el piloto se queda en la PC; la nube queda como verificador futuro

El piloto corre en la PC. La nube sería un verificador futuro con un setup que arranque `dockerd`, ponga Node 24, haga `pnpm install` y `supabase start` y escriba el `.env.local` desde `supabase status`; lo escribe el setup, no el modelo.

## 2026-10-26 — DEP-1: Next 16.4.3 y Node 24 (cierra 4-35 y 4-37)

`next` y `eslint-config-next` exactas en 16.4.3; `engines.node` `>=24`, `.nvmrc` `24` y el mismo valor en `scripts/configurar-package.mjs`. `experimental.agentUpgrade: false` sigue descartado; `next upgrade` lo decide una persona.

## 2026-10-27 — Paso 4.13 (3b de 6): guardar la hoja

Guardar es la Server Action `crear-cotizacion.ts` (responde `ok(ResultadoDeCrear)`; `{ ok: false }` sólo de `enviarAccion()`). El pedido pendiente va en `sessionStorage` con su intento, reusado sólo para reintentar (4-21); todo error con SQLSTATE lo suelta. Guardar espera al total al día; D2 en línea.

## 2026-10-27 — FIX-PILOTO-1: los e2e dirigidos del bucle no exigen las funciones edge

`verificar.sh` corre siempre los e2e dirigidos con `E2E_SIN_FUNCIONES=1` (salta la guardia de funciones edge); un spec que necesita una función falla solo. El Nivel 2 (`pnpm test:e2e:completo`) sí exige `npx supabase functions serve`.

## 2026-10-27 — CAL-1: la calibración del piloto con el 4.13-3b

`PILOTO_TOPE_USD_PASO` = 60 USD por paso entero (ruteo 0,5; no lanza con menos de 5; un tope agotado no se reintenta). Decidir y control sin MCP ni Chrome; compuerta de producto con una pregunta por decisión; plan ≤ 60 KB; hasta 3 commits de código por paso.

## 2026-10-27 — Paso 4.13 (3c de 6): el candado por lado del par y un solo lector de números (cierra 4-25)

La `XCell` tiene un candado por lado (`disabledReason` y `secondaryDisabledReason`). Un solo lector `leerNumeroTipeado(texto, locale)` en `src/shared/lib/numero-tipeado.ts`; los escritores abren con `formatearParaEditar(n, { locale })`, `locale` obligatorio; el CSV es la excepción. Reemplaza ih de «2026-10-26 — Paso 4.13 (2 de 4): la hoja dibujada y el recálculo, sin guardar» y el parser heredado de «2026-10-26 — Paso 4.12 (1 de 2): el núcleo de la `XCell`».

## 2026-10-28 — Las 146 migraciones se aplastan en una base que no se edita, y las migraciones son la única fuente

`supabase/migrations/20261028180656_base.sql` es el volcado de la base con las 146 de antes, más lo que el volcado no lleva (triggers de
`auth.users`, policies de `storage.objects`) y los datos que ponían (buckets, catálogo, la clave de la hoja abierta, los jobs). Diff cero
contra la base vieja, medido con y sin seed: esquema entero, ACL por rol, datos, cron, Vault, policies y extensiones. Se retiran
`supabase/schemas/` y `db:base`; todo cambio es una migración nueva con fecha y hora reales (`supabase migration new`), y una guarda fija
el sha256 de la base. Reemplaza a «2026-10-11 — Migración base generada desde `supabase/schemas`». Descartado: conservar `schemas/` como
estado declarativo (dos fuentes, y el diff declarativo no lleva policies ni grants).

## 2026-10-28 — La base apaga los privilegios por defecto de Supabase mientras crea los objetos

El volcado escribe los grants contra los privilegios por omisión de Postgres, no contra los de Supabase: sin apagarlos, una base nueva le
daba a `anon` y `authenticated` todo sobre cada tabla y función (medido: `anon` leía `leads` y `authenticated` leía `telefono_principal` y
`cotizaciones.valores`). La base los apaga al empezar y el volcado los repone al final. Toda migración nueva quita lo que no corresponde
(`.claude/rules/migraciones.md`).

## 2026-10-28 — Las vistas de la app sólo se leen y anon no toca `public`

`20261028181638_vistas_de_la_app_solo_se_leen.sql` quita a `anon` todo sobre `leads_vista`, `leads_cartera_vista`, `etiquetas_vista`,
`recordatorios_vista` y `estado_cola_web`, y a `authenticated` todo menos leer; `_leads_vista_crear()` lo repite al recrearlas. Lo destapó
`db:probar` al aplastar: PGlite no tenía los privilegios por defecto y la prueba de `leads_cartera_vista` pasaba sin que la base real
cumpliera. Queda abierto (4-40, lo decide la persona): `anon` conserva por esos mismos privilegios uso de 15 secuencias y `EXECUTE` en 32
funciones de `public`, sin camino por PostgREST.

## 2026-10-28 — Un stack de Supabase por carril, por variables de entorno y no por `config.toml`

Cada carril de Orca tiene su stack (`importadora-a` y `-b`, puertos +100 y +200) sin tocar `supabase/config.toml`: la CLI lee
`SUPABASE_PROJECT_ID`, `SUPABASE_*_PORT` y `SUPABASE_AUTH_SITE_URL` del entorno (verificado), y `scripts/worktree/preparar.sh` los deja en
`.env.carril`, que cargan el candado, `pnpm dev` y `pnpm funciones`. El candado pasa a ser uno por puerto de la base. Medido: dos carriles
con `db:reset` y e2e a la vez, sin cruces, con un pico de 19,6 GB de 30 (`docs/PREPARACION.md`, etapa 5). Generar un `config.toml` por
worktree habría exigido esconderlo de git y una guarda para no commitearlo.

## 2026-10-28 — Dos carriles por rama y PR: sólo la persona integra en `main`

El piloto es el carril A y publica su rama `a/…` con su PR; el carril B son sesiones de Orca en `b/…`. Ninguna sesión empuja `main` ni
integra un PR (el hook lo bloquea); sólo A edita ESTADO, PLAN, DECISIONES y BITACORA y crea migraciones de dominios compartidos, y lo hace
cumplir una guarda de CI sobre el diff del PR (`scripts/guardas/carriles.mjs`), no `cierre.sh`, que es del piloto. `MAPA.md` deja de
versionarse: lo cambiaba cada PR. Un PR corre el Nivel 1 y los e2e dirigidos a lo tocado (el completo si toca un disparador del Nivel 2);
el completo corre cada noche: con dos carriles, el completo por PR costaba cuatro runners en cada push. Guía: `docs/ORCA.md`.

## 2026-10-28 — `anon` no toca `public`, tampoco por los privilegios por defecto (cierra 4-40)

Medido antes del cambio: `anon` ejecutaba 32 funciones de `public` (25 de trigger y 7 puras) y usaba 15 secuencias; de las 7, seis se
podían llamar por `/rest/v1/rpc` con la clave publicable y devolvían resultado (`_lead_visible_para` daba `true`; `flujo_regla_activa`
caía en la tabla). Ninguna leía datos ni es `security definer`. `20261028224755_anon_fuera_de_public.sql` quita a `anon` y a PUBLIC todo
en `public`, a `authenticated` el EXECUTE de las funciones de trigger y `select`/`update` de las secuencias, y los privilegios por defecto
de `anon` (y truncate, references, trigger y maintain de `authenticated`) para lo que se cree después. El EXECUTE de PUBLIC en una función
nueva es un default global de Postgres: quitarlo para todo lo que crea `postgres` rompía 61 pruebas de `db:probar` (sus funciones de
`pg_temp`) y alcanzaba a `web`, así que lo sigue quitando cada migración y `supabase/tests/privilegios-de-anon.sql` (db:probar y job
`base` de CI, con `aclexplode`) cae si una lo olvida: probado con cuatro mutaciones.

## 2026-10-28 — En un e2e sin red se reconecta tras el aviso del envío fallido (cierra 4-42)

«No hay conexión» sale de `useEnLinea()` y ya está visible antes del clic: reconectar tras leerlo deja el fallo del guardado para después y
`useReintentoAlVolver` (2026-10-15, «El reintento al volver la conexión sólo sale al volver») no reenvía si la red volvió antes de que
`pendiente` esté puesto. La CI-4 manda esperar el POST; sin red no hay respuesta, y lo que hay que esperar es «…se va a guardar solo cuando
vuelva», que sólo sale con `pendiente` puesto, justo la condición del reenvío. Esperar el `requestfailed` dejaría la misma carrera con una
ventana menor (M2 no la hizo caer en 20 corridas, por eso es argumento y no prueba). Probado con un `page.route` que demora el fallo 1 s:
HEAD cae, el arreglo pasa. Otros specs de la misma forma: sólo `e2e/origenes.spec.ts:326`, donde la carrera no rompe nada.

## 2026-10-28 — Paso 4.13 (4a de 9): «Avanzado» va en un modal con su URL y la ayuda es un panel

El prompt 4 del 4.13 junta cuatro cosas con verificación distinta (el modal y la ayuda, el modo que se guarda, la ayuda de una tabla con su lectura
nueva, y la medición de cierre) y no cabe en un paso: se parte en 4a a 4d. En el 4a, las secciones `avanzado` van juntas detrás de **un** botón
«Avanzado» que ocupa el lugar de la primera (`ordenDeLaHoja()`), con un modal en `?panel=avanzado`; la ayuda de texto es un `<Drawer>` (un modal no
abre otro) en `?ayuda=texto&nodo=<id>`, que deja `?ayuda=tabla` libre para el 4c. Las celdas del modal son las de la hoja (mismas acciones, recálculo y borrador),
y `Ctrl/Cmd+S` confirma también la celda abierta del modal (`confirmarCeldaAbierta()` busca en la hoja y en `[data-avanzado-cuerpo]`, porque el modal va en un
portal). El modal se registra `sinFormulario` en `scripts/guardas/modales-con-salida.ts` con este motivo: dibuja celdas tipeables de la hoja, que confirman
en la hoja y su borrador; cerrar o «atrás» las desmonta sin confirmar: un número abierto se confirma al perder el foco, lo demás se descarta, y Esc con una
celda abierta cancela sólo la celda. Guardada la hoja, `?panel=avanzado` y `?ayuda`/`?nodo` se borran de la URL (si no, «Cotizar otra» reabre el modal).
La URL no abre lo que la hoja no dibuja (`celdaConAyudaDeTexto()`): una celda de «Avanzado» con el modal cerrado, una de tabla o un id inventado no abren nada.
Medido: la ayuda de una celda de «Avanzado» sí se abre dentro del modal, Esc cierra sólo la ayuda y el foco vuelve a su botón (no hizo falta la parada del plan).
Medido: «atrás» desde una página que se recargó con el panel abierto vuelve a montar la hoja (la marca puesta en el botón se pierde; no se averiguó por qué) y el foco
no vuelve al botón; sin recargar, «atrás» cierra el modal y el foco vuelve. El e2e prueba lo segundo. Descartado: un popover o la ayuda en línea; un «Guardar» en el pie del modal (el del
resumen queda detrás del modal; en el celular se cierra y se guarda desde el resumen).

## 2026-10-29 — Paso 4.13 (4b1 de 10): «Ver total Bs» es una columna de la cotización

El 4b juntaba la base (una columna y dos RPC `security definer`) con la pantalla (modos, interruptor y resumen fijo): verificaciones distintas y cuatro intenciones, que no
caben en tres commits; se parte en **4b1** (la base) y **4b2** (la pantalla), y el total de prompts pasa de 70 a 71. La persona contestó P1 (la hoja abre con el primero de
los modos, marcado) y P2: «Ver total Bs» **se guarda con la cotización**. Se llama `ver_total_bs`, como la clave del diseño (un término, un nombre), `boolean not null
default false`, con `grant select` a `authenticated` como `modo_tc`: viaja por `_cotizacion_respuesta()`, por `cotizacion_leer()` y por el diff de las revisiones. Lo valida
`_cotizacion_ver_total_bs(formula, valor)`, de nadie, `void` y no `security definer` (lo llaman dos que ya lo son): nulo es `ver_total_bs_falta` y verdadero sin que el
diseño de **esa** versión lo ofrezca es `ver_total_bs_no_ofrecido` (22023, como `modo_invalido`; en `crear` con «Guardar con la N» vale la versión abierta, y en `guardar` SU
versión, no la publicada). `crear` lo recibe como último parámetro con default falso; `guardar`, sin default, porque recibe el estado entero de lo que se edita, y entra en
la huella del intento, en «nada cambió» y en el `update` (una final también lo cambia). Efecto de la huella nueva: un reintento con el mismo intento que empezó antes del
despliegue y llega después da `intento_reusado`; el riesgo es casi nulo porque ninguna pantalla llama todavía a `cotizacion_guardar` (4.15). Nivel 2 por el `alter table`
(`nivel.mjs`), con el completo de escritorio. No se tocó `cotizaciones.moneda_mostrar` (nadie la escribe): abierto 4-45, para el 4.18. Descartado: guardarlo por persona o
dejarlo sólo en la pantalla (P2), y un `check` en la columna contra el diseño (la versión puede cambiar de diseño; se valida al escribir).

## 2026-10-29 — Paso 4.13 (4b2 de 11): la moneda del total en Bs sale de la lectura de la hoja

La persona contestó P4 (el total en Bs se escribe con la moneda `a` del tipo de cambio de `total_en` de la versión, que `cotizacion_hoja()` suma a `cabecera`) y P5 («Ver total Bs»
nace apagado). **La partición:** la fila 4.13 de PLAN nunca nombró un 4b3; P4 pedía su capa de base «en un sub-paso propio antes del 4b2»: ese sub-paso es este 4b2, y la pantalla
que la fila llamaba 4b2 pasa a llamarse 4b3, con el mismo alcance (no es un cambio de alcance); los prompts pasan de 10 a 11 y la fase, de 71 a 72. **La clave:** `cabecera.moneda_bs`
(el nombre sigue al de `totales.bs` y `ver_total_bs`), el `moneda_a` de la fila **activa** de `tipos_cambio` cuya clave es la del nodo `total_en` de esa versión (una fila, por
`tipos_cambio_clave_key`); sólo los activos, como lee el motor. Sin `total_en` o sin ese tipo de cambio es JSON `null` **con la clave presente** (la pantalla la exige: sin la
clave, `hojaDesde()` devuelve nulo). **Nula no quiere decir sin Bs:** el motor calcula el Bs con el tipo de cambio de cada bucket y usa `total_en` sólo para sacar los dólares;
`oficina` no tiene `total_en` y su `totales.bs` sí tiene valor. Ese hueco (un Bs con valor y sin moneda) lo decide P6, nueva, en el 4b3. **Quién la recibe:** todos, sin recorte por
nivel: el total en Bs ya viaja siempre y `authenticated` ya lee `tipos_cambio`; nunca viaja el id ni la clave del nodo o del tipo de cambio (la prueba lo exige con una asesora sin
el nivel «costos»). **La de la versión y no la del modo:** los modos siguen con sólo `clave` y `nombre`; un modo cuyo `total_en` tenga otra `moneda_a` escribiría el total con la de
la versión (límite aceptado: hoy todos son USD → BOB). Nivel 1: `create or replace function` no sube a Nivel 2. Abierto 4-46: `cotizacion-hoja.sql` pasó de 300 líneas (705). Descartado:
una moneda por modo (abría los modos) y leerla de `monedas` sin pasar por el tipo de cambio.

## 2026-10-29 — Paso 4.13 (4b3 de 11): los modos, «Ver total Bs» y el resumen fijo

**P6 (la persona):** si el diseño ofrece «Ver total Bs» y `cabecera.moneda_bs` es nula, la hoja **no dibuja el interruptor** y guarda `ver_total_bs` en falso (`ofreceVerTotalBs()`).
**El modo es parte de `Entradas`** (`modoTc`): cambia el cálculo, así que viaja con lo que calculó cada recálculo (P8, lo guardado es lo calculado), en el primer cálculo del servidor
(`modoInicial()` sale por `index.ts` y la página se lo pasa a `recalcularAlAbrir`), en el borrador (vuelve si la hoja de ahora lo declara; si no, el inicial) y en el pendiente de la
pestaña (`default(null)`). Descartado: el modo como estado aparte (el guardado podía mandar un modo que el total a la vista no calculó). **«Ver total Bs» queda fuera de `Entradas`**
(no cambia el cálculo ni pide un recálculo) **pero dentro del borrador**: es un dato que se guarda y, si se repone lo tipeado, se repone esa elección; sólo si la hoja todavía lo ofrece.
**Los modos se dibujan sólo con dos o más** (microdecisión: con uno no hay qué elegir; el resumen dice cuál es). **Textos:** «Ver total en moneda local» (ningún texto fijo nombra una
moneda: el código sale de la base). **Live:** un botón propio del módulo en el resumen (`LiveDelResumen`); mover `ConmutadorLive` a `src/shared/ui` dispara el Nivel 2 dos veces (`shared`
y `layout`), así que se duplica (lo puede proponer el 4d). **El resumen:** un solo `<aside>` (varios e2e cuentan con un solo `getByLabel('Resumen')` y `[data-total]`, descartado el
resumen doble), `sticky`: al costado desde `@4xl` del contenedor **nombrado** `hoja` (56 rem; el 200 % colapsa solo) y al pie debajo, con alto máximo de 40 dvh, `data-pie-de-panel` para
que un aviso no lo tape y `scroll-margin-bottom` de 40 dvh en lo enfocable mientras va al pie. **La cabecera va dentro del contenedor del resumen**: con ella fuera, un `sticky bottom-0` no
aparecía hasta que la hoja entraba en la ventana. **Trampa:** una consulta de contenedor dentro de un descendiente la resuelve el contenedor más cercano a ese descendiente (la sección),
no el del elemento que lleva la clase: por eso la hoja es `@container/hoja` y el corte, `@4xl/hoja`. **P7 y P8 (la persona):** el tope de nodos es lo medido con el peor caso más un 5 %
con techo 500; medido 481 usada (506), el tope quedó en 500 (4,0 % de margen). Sin cambios de base. Abierto: ninguno nuevo; el 4d mide con «Avanzado» abierto y se para si pasa de 500.

## 2026-10-29 — Paso 4.13 (4c1 de 12): la tabla de una ayuda se lee con la versión de la hoja abierta

**El hallazgo:** la lectura que P3 daba por faltante ya existía: `cotizacion_tabla()` (4.10-1) da a quien ve la celda sólo las columnas que leen los nodos que ve, está en el inventario
de lo oculto, y `cotizacion_hoja()` ya manda `ayuda: {tabla}` con la misma regla. Lo que faltaba era la versión: leía la publicada, y la hoja calcula con la de la hoja abierta (4-28);
editar una tabla publica la N+1 (D5). **P3 (la persona):** la ayuda lee **la versión de la hoja abierta**: `cotizacion_tabla` recibe `p_abierta` como `cotizacion_evaluar`, con sus errores
(`abierta_invalida`, `abierta_vencida`, `abierta_no_disponible`, `llamada_invalida` si llega con una cotización, y ésta gana a «las dos o ninguna»). Descartados: la publicada (precios que
la hoja no usa hasta recargar), sólo quien configura, y las filas dentro de `cotizacion_hoja()` (bytes al abrir por una ayuda que casi nunca se abre). **P10 (era la P4 del plan):** por
origen pide también `cotizaciones.ver`, la puerta de la hoja; es coherencia, no un cierre de fuga (sin `ver`, `_nodos_visibles` ya no daba nodos; sólo cambia para quien configura sin
`ver`, que igual lee `tablas_referencia` por la policy). **La firma se recrea por `drop` + `create`** (una sola, sin sobrecarga ambigua) y la versión y la puerta van a un ayudante de
nadie, `_cotizacion_tabla_version()` (devuelve un `uuid`: fuera del inventario), para que la función quede ≤ 80 líneas. **P9 (la persona):** el tope de bytes con 1.000 filas para una
asesora con «costos» es lo medido más un 5 %, 52.752; el provisional de 48 KB no cabía por el factor de relleno de la medición (escala 20). Quien configura sigue recibiendo las filas
sin recortar a `columnas` (fuera de alcance; lo puede proponer el 4c2).

## 2026-10-29 — Paso 4.13 (4c2 de 12): la ayuda de una tabla en la hoja

**P13 (la persona): el Modo Live tapa la ayuda de una tabla como tapa la celda que la abre.** Una tabla de referencia no dice qué columna es plata (`numero`, `anio`, `texto`); la celda sí
(`formato`: `usd`/`moneda` es dinero, `raw` no). Si la celda es de dinero, cada cifra `numero` pasa por `<Monto>` con la moneda de la celda y Live la tapa con su símbolo; si no, va con
`formatearNumero`, a la vista (un factor). Descartados: tapar toda cifra con `useLive()` (tapa un factor que la celda de al lado muestra), mostrarlas igual, y no dibujar la tabla con Live.
Supone que toda columna `numero` está en la moneda de la celda (en la semilla, sí). La ficha de la `XCell` (`xcell/CLAUDE.md:38`, «lo que abran pasa sus cifras por `<Monto>`») queda
vieja con cualquier respuesta y no se toca aquí (daría Nivel 2): abierto **4-48**.

- **Columnas y ancho.** Se dibujan sólo las columnas declaradas (una clave de más en las filas de quien configura no se ve); sin declaradas (una congelada que ya no tiene tabla viva) las
  claves de la primera fila, con la clave de encabezado y **como texto** (sin tipo no se sabe si un número es dinero o un año: va con `formatearNumero`, a la vista, «2.018»; lo corrige 4-47). El texto se parte en cualquier punto (`wrap-anywhere`: `break-words` no encoge una palabra larga en una tabla) y una cifra no; lo que
  no entra se desplaza dentro del panel (`useDesborde` y `<PistaDeDesborde>`), nunca la página. Encabezado fijo arriba en el contenedor que desplaza.
- **Año sin separador de miles** (`formatearParaEditar`: «2018», no «2.018»); un `numero`, hasta 6 decimales y sin ceros de relleno (la precisión de la tabla).
- **El fallo sigue al del recálculo, no a `<EstadoError>`** (que sólo sabe decir «Reintentar»): «Recargar» si `pideRecargar(error)`, si no «Reintentar». Su límite: el 42501 de una tabla
  sin copia congelada ni viva también lleva a «Recargar», que puede repetir el fallo; no se suma otro estado.
- **El tope sin camino** (1.000 filas, «Mostrando las 1.000 primeras filas.») se aparta de `escala.md` («siempre hay un camino a lo antiguo») hasta que el editor de tablas (4.23) lo dé: 4-47.
- **El lector va en el chunk inicial de la hoja** (`composicion.client.ts` es un barril que ya importa el recálculo); sólo el panel es diferido. El JS en frío de `/cotizaciones/nuevo`
  midió 428,6 KB antes del paso con el lector ya exportado por el barril (`2b829e0c`) y 429,5 después (+0,9); contra los 428,1 de `ed0fe2ef` son +1,4 KB: se dice, y el presupuesto formal es del 4d.
- **Nodos.** La hoja mide 468 al abrir y 490 usada con el botón en 3 celdas (P11: sigue por ≤ 500; margen 2,0 %). El panel suma 7 nodos por fila de 3 columnas con una de dinero; con
  1.000 filas, 7.023, tope 7.374 (lo medido más un 5 %).
- La URL sólo abre una celda que se dibuja en esas secciones **y** cuya ayuda es del tipo nombrado (`celdaConAyuda`); la de «Avanzado» se abre dentro del modal y con el modal cerrado no
  abre nada. Cada apertura vuelve a leer (el panel se monta de nuevo por `key`).

## 2026-10-29 — Paso 4.13 (4d de 12): el cierre de la hoja

**P0 (la persona): 4-44 (a) no se arregla en el 4d; pasa a 4-49, de todos los paneles por URL.** Medido, no supuesto. Se abre «Avanzado» con su botón, se recarga y se pulsa «atrás».
El documento no se recarga (una marca en `window` sigue), la hoja se monta de nuevo (la marca de su elemento se pierde), sale un pedido RSC de la entrada de antes y el foco
queda en `body`. Lo mismo con `?panel=nuevo-nivel` de `/configuracion/cotizacion?seccion=niveles`: el router de Next no tiene en caché la entrada de antes, la vuelve a pedir y la
dibuja, el modal no se cierra montado y `focoAlCerrar` no corre. Por la regla del plan (C9-2), un defecto de todos los paneles no se arregla en la hoja. Descartados: el arreglo sólo en
«Avanzado» (la marca en la entrada de antes y un pendiente en `sessionStorage`), porque deja dos maneras de resolver lo mismo, y hacerlo en `src/shared` dentro del 4d, porque sube a
Nivel 2 y pide su propio plan.

- **4-44 (b), la causa.** Bajo `@lg` de la sección todo ítem ocupa las 12 pistas, y con `gap-3` las pistas colapsan a 0 px y los 11 huecos (24 px cada uno al 200 %) fijan el ancho
  mínimo de la rejilla. Son 264 px contra 218 px de contenido en la sección del modal a 412 px, y sobresalían 46 px. Sin modal la sección es más ancha y cabía. Arreglo:
  `gap-x-0 gap-y-3 @lg:gap-x-3`. No cambia nada a la vista ni suma nodos (468 y 490).
- **Medir cajas dentro de un modal, quieto.** El modal entra con una escala (0,96 a mitad): las cajas que da `getBoundingClientRect` están escaladas y el padding que da
  `getComputedStyle`, no. `celdasFueraDeSuSeccion()` espera `quieto()` antes de medir. Sin eso daba 1 px falso en cada celda.
- **Cómo se mide la tarea de oro 2**, como la 1 y la 4: lo que no cambia entre máquinas es lo pulsado (tope de teclas de control, medido 23); el reloj del robot es un tope
  generoso (< 30 s); la hora de una persona, KLM (≤ 90 s, con 3 decisiones: el remate, la grúa y guardar). Es sólo el tramo de la hoja: la asesora de la semilla (rol `asesor` tal
  cual), con un lead suyo y un vehículo del inventario en la URL. El panel del vehículo (4.14) y el PDF (4.18) suman su tramo y el 4.28 mide la tarea entera. Que el total de la base
  sea el de la tarjeta prueba que lo guardado es lo que se ve. «Un total que no cuadre con las líneas» es del PDF y la tarjeta (4.18). La dueña se crea antes que la asesora: con la
  empresa vacía, la primera cuenta tiene que poder gestionar el equipo y la base rechaza a una asesora sola.
- **Cada celda con teclado:** se cuentan los lados que se pueden tipear (`[data-parada="0|1"]` sin `disabled` ni `aria-disabled`), sacados del DOM, como subsecuencia del foco
  real. Tab también pasa por la ayuda, ↺, los chips y los lados bloqueados, y ésos no se cuentan.
- **El presupuesto de JS** de `/cotizaciones/nuevo` es 460 KB: lo medido (429,5) más un 5 %, hacia arriba a la decena. Es una entrada más de `PRESUPUESTO_DE_JS_EN_KB`, y el
  bucle de `presupuesto-js.spec.ts` la mide con su `test.skip` de siempre: un `.skip(` nuevo contaría como saltada y `@sin-celular` no puede preguntar por el proyecto. Lleva
  `?origen=` de la subasta, porque sin él abre el primer origen, que puede pesar menos.

## 2026-10-29 — Paso 4.14 (1 de 3): la base del panel del vehículo

**El 4.14 se parte en tres:** el 4.14-1 (la base del panel del vehículo), el 4.14-2 (el panel del vehículo en la pantalla, la entrada desde el resumen del vehículo y 4-10) y
el 4.14-3 (el panel del cliente y la entrada desde la ficha del lead). El plan pasó tres auditorías (dos bloqueos y, tras la compuerta, observaciones). Las respuestas de la
persona (P1 a P7) fueron todas las recomendadas.

- **P1: cotizar no edita el vehículo.** `vehiculos.cotizado_en` la escribe sólo el trigger `trg_vehiculo_cotizado` de `cotizaciones`. `trg_actualizado_en` y
  `trg_auditar_cambio` (el `trg_auditar` de antes, partido: un `when` que nombra `old` no puede ir en un trigger de `insert`) llevan
  `when (old.cotizado_en is not distinct from new.cotizado_en)`. Así, quien tiene la ficha abierta no recibe un PT409 por una cotización, la vitrina web (`actualizado_en` ordena
  `web.vehiculos`) no se mueve y `actividad` no duplica lo que ya registra `cotizaciones.insert`. Descartados: los triggers de siempre (PT409 a quien edita, la web se mueve y la
  carrera de crear contra la papelera daría PT409) y una tabla aparte como `vehiculos_imagenes_version` (más lenta: la visibilidad se preguntaría por fila).
- **P2 y P3.** La ve quien ve el vehículo, como `estado_subasta` (sólo cuándo, no quién ni cuánto). La mueven crear con el vehículo (también «a mano») y guardar una
  cotización que pasa a él, «sólo si es mayor»: nunca retrocede, la papelera no la toca y no reescribe la fila si no cambia. El costo es que cotizar toma la fila del vehículo
  `for no key update` hasta confirmar y la reescribe sin HOT: ≈ 0,2 ms y 50 a 140 buffers, medido con la reescritura en cada corrida (C9).
- **El relleno queda como función** (`_vehiculos_cotizado_rellenar()`, sin `execute` para nadie de la app), para que la prueba corra la misma sentencia que corrió la migración.
  Toma la cotización más nueva de cada vehículo, también las de la papelera (con P3, la papelera no hace retroceder la columna). No ve lo ya purgado ni cuándo una cotización
  pasó a otro vehículo.
- **P5 y P7: «Cierre subasta» va sobre una columna generada**, `cierre_subasta_en` (`case` abierta o en vivo, `coalesce(subasta_fin_en, subasta_en)`), la primera de la base.
  El panel lee por PostgREST, que no ordena ni filtra por una expresión y manda el estado como parámetro, así que un índice parcial con `estado_subasta in (…)` no se probaría.
  Descartados: una RPC `security invoker` (grants y registro de páginas nuevos, y el 4.14-2 leería distinto del inventario) y un índice de expresión. La columna entra en
  `antes` y `despues` de `actividad` (`auditar()` guarda la fila entera), y nadie lo lee. El margen de 24 h es una constante del 4.14-2.
- **Los índices difieren de la fila del PLAN:** `vehiculos_cotizado_idx` lleva `id desc` (un `(desc, asc)` no sirve el orden de la página, cae en `Sort`); «Cierre subasta» va sobre
  la columna generada y no sobre `(origen_id, estado_subasta, subasta_en)` (con dos estados, la página ordena); `cotizaciones_vehiculo_creado_idx` reemplaza a
  `cotizaciones_vehiculo_idx`, con el mismo prefijo y predicado. Cada medición lleva escrita su guarda con el índice de la fila.
- **El historial se siembra con 100 vehículos, no 1.000.** El plan genérico estima las filas de un vehículo por el promedio: con 1.000 vehículos y 50.000 cotizaciones estima 50,
  menos de una página con el cursor, y según la muestra de ANALYZE ordenaba la profunda del vehículo caliente (5.000 cotizaciones): 334 buffers, ~1 ms, una corrida sí y la
  siguiente no. Con 100 dio el mismo plan en 3 de 3 corridas. **Queda un límite sin assert:** con un promedio bajo de cotizaciones por vehículo (lo realista), la página profunda
  de un vehículo muy cotizado puede ordenar las suyas. Crece con las cotizaciones de ese vehículo, no con N (la familia de lo de Ana, 4-14), y se anota en RENDIMIENTO y en 4-14.
- **El tiempo en las pruebas de base:** dentro de un bloque `now()` no cambia, así que lo que tiene que moverse se deja antes en el pasado como postgres con
  `session_replication_role = replica`. Sin eso, dos mutaciones no caían (la 1.ª auditoría).

## 2026-10-29 — Paso 4.14 (2a): el panel del vehículo

**El 4.14-2 se parte en tres:** el 4.14-2a (el cursor por columna en `src/shared`, la barra y el panel con «Últ. cotización» y «Cierre subasta»), el 4.14-2b (el historial
del elegido, «Cotizado (n)» y «Cotizar» desde el resumen del vehículo) y el 4.14-2c (crear el vehículo desde el panel y 4-10). Entero eran 7 u 8 commits de código. El plan
pasó dos auditorías (un bloqueo y, después, observaciones) y la persona eligió las respuestas recomendadas (P1 a P4 y, tras la auditoría del informe, P5). Por P4 se suma el 4.14-2a2 (4-49).

- **El cursor, en `src/shared` y no en `vehiculos/infra`:** lo usarán el historial del 2b (por `creado_en`) y el panel del cliente del 4.14-3. `Cursor.creadoEn` pasa a
  llamarse `instante` (el valor de la columna que ordena) **sin cambiar la codificación**: un cursor de una URL vieja se sigue leyendo. `aplicarCursor()` recibe un
  `OrdenDeCursor` (`POR_ALTA` por omisión: el filtro de siempre, carácter por carácter) y `ordenarPorCursor()` pone el orden que lo acompaña; los que ordenaban a mano no se tocan.
- **El panel lee desde el navegador y escribe su URL sin ir al servidor** (`?lista=`, `?cursor=`, con `replace`): pedirle la página al servidor volvería a montar la hoja
  abierta detrás. `<Paginacion alIr>` cambia de página con botones en vez de enlaces. El borde de «Cierre subasta» (P5 del 4.14-1: ahora menos 24 h) se toma con el reloj del navegador al
  abrir el panel y queda fijo mientras está abierto, para que ir y volver de página use el mismo.
- **La barra va fuera de `[data-hoja]` y del componente con `key`:** no suma nodos a la hoja (468 y 490 contra 500) y elegir otro vehículo no la desmonta, así que el foco
  vuelve a ella. Suma una parada de Tab: la tarea de oro 2 pasa de 23 a 24 teclas de control y de 24 a 25 Tab hasta la hoja.
- **Elegir y quitar escriben la URL por `nuqs`** (el vehículo en la clave de la hoja, sin `panel`, `lista` ni `cursor`; `shallow: false` y `replace`), no con
  `router.replace`: el panel lee su URL de `nuqs`, y con el router la URL cambiaba pero el panel seguía abierto (medido en el e2e). `replace` reemplaza la entrada de abrir el
  panel: «atrás» vuelve a la hoja del vehículo de antes con el panel cerrado. El módulo `vehiculos` no conoce la clave de la hoja: se la pasa `src/app`.
- **P1:** al elegir otro vehículo, lo tipeado queda en el borrador del de antes (la hoja y su borrador llevan el vehículo en la clave) y vuelve si se lo elige otra vez. **P2:**
  elegir cierra el panel. **P3** (para el 2c): el tipo de vehículo se guarda en el vehículo. **P4:** 4-49 va a un paso propio.
- **Ctrl+S con el panel abierto no guarda:** el panel registra «guardar» sin hacer nada y el último registro responde. Queda un límite, **4-54**: elegir otro vehículo mientras
  se guarda guarda con el de antes y la hoja pasa al nuevo sin la tarjeta de éxito.
- **Presupuestos antes de medir:** 370 nodos y 12.000 bytes para el panel con 20 tarjetas; medido 284 y 4.660, y los topes quedan en lo medido más un 5 % (299 y 4.900).
- **El resumen fijo al 200 %:** no sube más allá del borde de arriba de la hoja y mide hasta el 40 % del alto. Con la página arriba de todo cabía por 1 px; con la barra encima
  queda debajo del borde de la ventana: 107 px en escritorio y 37,6 en el celular, sólo al 200 % (el completo lo atrapó). `cotizar-hoja-resumen.spec.ts` mide ahora con la hoja
  arriba de la ventana, que es lo que prueba que el resumen queda fijo. La auditoría del informe lo bloqueó por ser una regresión visible aceptada sin la persona, y se le
  preguntó (P5): **la aceptó por ahora y endureció 4-50**, que exigirá que el resumen quepa entero con la página arriba de todo al 200 %.
- **Al 200 % en el celular** la columna del panel crecía con lo más ancho de adentro y una tarjeta llegaba a 594 px en una pantalla de 412: el contenido va en una sola columna
  `minmax(0, 1fr)` y las pestañas se desplazan por dentro.

## 2026-10-29 — Paso 4.14 (2a2): la vuelta del foco tras recargar y «atrás»

**La causa, medida antes del código** (una sonda contra los hooks de HEAD, en los dos proyectos; `.piloto/salidas/4.14-2a2/medicion-0.json`, de `medicion-0b-*.json`): tras recargar con el panel abierto, «atrás»
no recarga el documento y **no vuelve a montar ni el botón ni la página** (una marca en el elemento sigue), aunque sale un pedido RSC de la entrada de antes. Lo que el 4d escribió
(«la hoja se monta de nuevo», «el modal no se cierra montado») no se repitió: el modal se cierra montado, con su animación, y Base UI **no llama a `focus()`** sobre el botón;
sin recargar, sí. En el drawer del vehículo, que le pasa a `focoAlCerrar` una ref al botón, el foco vuelve (su e2e queda como no regresión). Una clave propia en
`history.state` sobrevive a la escritura de `nuqs`, a recargar y a ir y volver, en las dos entradas. No se dio S1 ni S2. S3 («el defecto no se reproduce») se dio sólo
en el drawer del vehículo; se siguió porque los dos modales medidos en 4-49 lo reproducen, y E3 queda como prueba de no regresión.

- **La marca va en el historial y la memoria es del documento** (`src/shared/ui/vuelta-del-foco.ts`), no en `sessionStorage`: quien abre deja en la entrada de antes una ficha
  y las señas de quien tenía el foco, y la entrada del panel guarda la misma ficha, que el hook recuerda al montarse abierto tras recargar. Sólo un `popstate` a la entrada
  marcada con la ficha recordada devuelve el foco, así que recargar nunca lo mueve y Esc lo olvida. La vuelta mira un cuadro a la vez, hasta 3 s: enfoca a quien abrió si
  el foco está en `body`, espera si está en otro lado (sin recargar, lo devuelve Base UI) y se corta con una tecla o el puntero.
- **Señas y no una referencia de quien llama:** 16 archivos llaman a `usePanelPorUrl()` y 20 hooks escriben su `?panel=` a mano; las señas (el camino en el DOM, la etiqueta y
  un hash FNV-1a del nombre) encuentran al botón sin que nadie lo pase. El nombre va como hash porque `history.state` queda en la sesión del navegador y el texto de un
  botón puede nombrar un lead o un vehículo.
- **Se olvida al verse cerrado, no con un «olvidar» en cada `cerrar()`:** hay cierres que no pasan por `cerrar()` (`ir()` del panel del vehículo, guardar la hoja). El hook
  olvida su ficha cuando ve el panel cerrado, salvo que la entrada actual sea la marcada (un «atrás», del que se ocupa el `popstate`).
- **Límites:** renombrar un nivel se abre desde el «⋯» de una fila, que ya no está al volver: el foco queda donde lo deje Base UI. En Safari un clic no enfoca el botón y no
  se marca nada. Una marca que reemplaza el estado en vez de sumarse no pierde `__NA` en el navegador (el `replaceState` parchado de Next lo vuelve a copiar), pero sí las
  claves propias vecinas (la `vueltaDesde` de un panel con un `eliminar` adentro): lo prueba Vitest. Si la escritura de la URL falla, la clave deja de estar «escribiendo».
- **P1 (la persona): los 19 hooks propios van al 4.14-2a3**, el paso siguiente, con el guardián `scripts/guardas/paneles-con-vuelta.test.ts`, cuya lista de pendientes sólo
  se achica. 4-49 queda abierto hasta entonces.

## 2026-10-30 — Paso 4.14 (2a3): la vuelta desde un menú, tras una navegación del servidor y la partición en 2a3 y 2a4

**Medido antes del código** (una sonda contra HEAD, en los dos proyectos; `.piloto/salidas/4.14-2a3/medicion-0.json`): los siete casos (renombrar un nivel, la hoja de
filtros, nuevo vehículo, editar, el resumen, agregar vehículo y la vitrina) dejan el foco en `body` tras recargar y «atrás»; ninguno recarga el documento y en todos
«atrás» cierra el panel. Sin recargar, desde un «⋯», Base UI devuelve el foco al «⋯» (tras «atrás» y tras Esc). En el instante en que corre una acción `despuesDeCerrar`
(el `replaceState` de la marca), el foco sigue en el ítem, el menú sigue en el DOM con su `aria-labelledby` (el `id` del «⋯») y el «⋯» ya no lleva `aria-controls`; después
salen el foco y el menú, el foco entra al «⋯» y recién ahí escribe `nuqs`. El mismo orden en la vitrina. No se dio S1, S4, S5 ni S6: es la rama R1 del plan.

- **Desde un menú, la marca es la del botón del menú** (`disparadorDelMenu()` en `vuelta-del-foco.ts`): el ítem ya no existe al volver, y el «⋯» es a donde Base UI devuelve
  el foco sin recargar. Se busca primero por el `aria-labelledby` del menú, que es lo que está en ese instante; si no, por el `aria-controls` (un menú que corre su acción
  abierto); si no, las señas del foco, como antes. Arregla el límite del 2a2 (renombrar un nivel) y todo panel o `<Confirmar>` que se abre desde un «⋯».
- **La ficha de la entrada del panel queda también en `sessionStorage`** (la última por clave, con un hash de la URL): con `shallow: false`, la respuesta del servidor llega
  después de que `nuqs` resuelve, y Next pone su estado en la entrada del panel sin conservar el resto (`preserveCustomHistoryState: false`): `vueltaDesde` se pierde a los
  ~60 ms y tras recargar el panel no sabe su ficha (medido con un registro de cada escritura del historial). Volver a escribirla en `pagehide` no sirve: Chromium no conserva
  un `replaceState` hecho al salir. La marca sigue en el historial (la entrada de antes no la toca Next) y lo que decide la vuelta sigue siendo un `popstate` a esa entrada
  con la misma ficha: una ficha guardada de otra apertura no coincide y no mueve nada. Sin `sessionStorage`, queda la del historial. Lo que dijo el 2a2 («no en
  `sessionStorage`») vale para la marca y la memoria; esto es sólo un respaldo de la ficha.
- **Se parte en 2a3 y 2a4:** son cuatro intenciones con su scope (`shared` desde un menú, `shared` los filtros, `vehiculos` y `leads`) y la verificación no es la misma (los
  hooks de `leads` no son interfaz). El 4.14-2a4 hace los 14 de `leads`, deja `PENDIENTES` vacío, borra el registro, exige también `useVueltaDelFoco` en el guardián y corrige
  la ficha de `shared`: por esa ficha es Nivel 2.
- **Las pruebas de un hook salen de un ayudante** (`probarLaVuelta()`, `ui/vuelta-del-foco.soporte.tsx`): cuatro por función que abre (marca, vuelve tras recargar, cerrar
  olvida y abrir lo abierto no marca otra vez). Con `hasMemory` en `NuqsTestingAdapter`, y el cierre se espera hasta que quede: `useFiltros` escribe en una transición y el
  adaptador pasa un instante por el valor de antes.

## 2026-10-30 — Paso 4.14 (2a4): la vuelta en el listado de leads y la partición en 2a4, 2a5 y 2a6

**Medido antes del código** (una sonda contra HEAD, en los dos proyectos; `.piloto/salidas/4.14-2a4/medicion-0.json`): de doce casos del listado, siete dejan el foco en
`body` tras recargar y «atrás» («Nuevo lead», «Gestionar etiquetas» desde los filtros y desde el selector del «⋯», exportar desde «CSV», el lead rápido desde el nombre,
«Etapas» y «Nuevo embudo»). Anotar y agendar desde el «⋯» de una fila y «Editar» del lead rápido ya volvían: su modal busca a quien lo abrió. Anotar y agendar desde el
«⋯» del resumen del rápido dejan el foco en «Editar» (4-58). Ningún «atrás» recarga el documento y en todos cierra el panel.

- **Se parte en tres:** los 14 hooks tienen 29 funciones que abren, en tres superficies (el listado, la ficha y la configuración). El 2a4 hace las 10 del listado (6 hooks),
  el 2a5 las 14 de la ficha (5 hooks; también donde abren en las pestañas del rápido) y el 2a6 las 6 de configuración y el cierre del guardián, que toca la ficha de `shared`
  (Nivel 2). Sin `src/shared`, el 2a4 y el 2a5 son Nivel 1.
- **«Gestionar etiquetas» desde el selector del «⋯» enfoca el «⋯» antes de abrir el panel:** el selector se ancla al «⋯» sin disparador propio y el foco estaba en su
  campo de búsqueda, que desaparece; la vuelta no tenía a quién volver. Sin recargar, Base UI ya devuelve el foco al «⋯» (tras «atrás» y tras Esc): es el mismo destino. Sin
  ancla, el selector no mueve el foco.
- **El hook de «Nuevo lead» corre en el shell:** la vuelta del foco viaja en toda pantalla de `(app)`. `presupuesto-js` antes y después: `/perfil` 416,8 → 418,1 KB (de 440; el
  plan estimaba ≈ 1,5), `/leads` 508,9 → 509 (de 530), `/vehiculos` 475,7 → 473,5 (de 500) y `/cotizaciones/nuevo` 433,2 → 433,3 (de 460).
- **En la acción de una fila, «ya abierto» mira también el lead (`para`):** abrir anotar en otra fila con el modal de una abierto es otra apertura y marca otra vez.
- **4-58 no se arregla aquí:** tras recargar, el foco queda en «Editar» (medido) y la vuelta del foco sólo actúa con el foco en `body` (espera a que Base UI lo devuelva).
  La hipótesis, sin medir: el modal de la pestaña se monta tras recargar con el foco en «Editar» y lo devuelve ahí. El arreglo está en el modal de la pestaña (`use-modal-de-seguimiento`, `use-modal-de-recordatorio`), que es del 2a5.

## 2026-10-30 — Paso 4.14 (2a5): la vuelta en la ficha del lead, el modal de la pestaña y el segundo «atrás»

**Medido antes del código** (una sonda contra HEAD, en los dos proyectos; `.piloto/salidas/4.14-2a5/medicion-0.json`): ningún «atrás» recarga el documento y en todos cierra el panel.

- Dejan el foco en `body` tras recargar y «atrás» ocho casos de la ficha: «Editar», «Cambiar» el teléfono, «Compartir», «Transferir», «Nueva oportunidad», «Editar» una
  oportunidad (desde su «⋯»), «Dar acceso» y «Revocar». Llevan e2e. F6 («Salir de este lead») no se midió: su apertura lleva la vuelta como las otras cinco de `usePanelDeLead`, con
  su prueba de Vitest.
- Ya volvían, sin e2e nuevo (sólo Vitest): «Agregar teléfono», anotar, agendar y sus «Editar», y «Gestionar etiquetas» desde el «⋯» de la ficha. En el rápido, los botones de
  las pestañas ya volvían a su botón.
- Anotar y agendar desde el «⋯» de la cabecera de la ficha dejan el foco en `body` tras recargar (F16 en los dos proyectos; F17 sólo medido en móvil): van por `router.push`, el
  guardián no los ve (4-61). Sin recargar vuelven al «⋯»: guardia en el e2e.
- 4-58 (R3 y R4): tras recargar y «atrás», el foco queda en «Editar» y el botón de la pestaña ya no está en el DOM. 4-59 (R5 y las pestañas): el segundo «atrás» deja el foco en
  `body`.

- **4-58, `enPestana`:** el modal de la pestaña devuelve el foco, cuando no hay «Editar» de un ítem ni botón, a lo que lo tenía al abrirse (`true`, de Base UI): tras
  recargar es «Editar». Con `false` no mueve el foco, que cae en `body` al desmontarse, y la vuelta (la marca de `abrirModal`) lo lleva al «⋯» del resumen. Sólo en el rápido
  (`enPestana`, por defecto `false`, que ponen sus dos pestañas): la ficha monta los mismos modales y anotar desde su «⋯» llega sin marca. Esc, la ✕ y guardar siguen yendo al botón de
  la pestaña. Sin recargar el destino ya era el «⋯» del resumen (R3s y R4s, medido) y su e2e lo fija. **M13** (la ficha también pone `enPestana`) **sobrevive**: en la ficha, con `true` o
  `false`, el foco queda en el «⋯» de la cabecera (la causa no se midió), así que el guardia fija el destino y no el mecanismo; el cambio no habría sido una regresión. Límite: con el
  modal abierto y el foco en `body`, el foco queda en `body`.
- **4-59, `esperaSinPanel`:** el hook del rápido se ve «cerrado» para `lead` mientras siga montado con el panel que encontró al cargar, y toma la ficha de la entrada
  `?lead=<id>` al quedar sin panel (la del historial o la de `sessionStorage`, de esa URL). Sin recargar nada cambia: `abierto` es `id !== null`. No se usa la compuerta pura
  `panel === null`: olvidaría la ficha al abrir el panel (la cubre su prueba de Vitest, M12); en el e2e M12 **sobrevive** (Esc y dos «atrás» vuelven al nombre también con la compuerta
  pura; la causa no se midió), así que R7 y R8 son guardias del destino. **Límite** (4-62): tras recargar, el segundo «atrás» sólo devuelve el foco al
  nombre si el panel se abrió desde la URL `?lead=<id>` (el «⋯» del resumen, «Editar»); desde el botón de una pestaña, la entrada anterior ya es `&pestana=` y deja el foco en `body`;
  igual si el panel se cierra con Esc, la ✕ o guardar en una URL distinta de la de apertura.
- **`yaAbierto` mira el id en las ediciones** (oportunidad, recordatorio, seguimiento): abrir la edición de otro ítem con la de uno abierta marca otra vez, como la acción de una fila del 2a4.
- **Los 5 hooks de la ficha salen de `PENDIENTES`:** `usePanelDeLead` marca con `recordarQuienAbre()` y `abrirConVuelta()`; quedan los 3 de configuración del 2a6. Sin `src/shared`: Nivel 1.

## 2026-10-30 — Paso 4.14 (2a6): la vuelta en configuración y el guardián sin lista

**Medido antes del código** (una sonda contra HEAD, en los dos proyectos; `.piloto/salidas/4.14-2a6/medicion-0.jsonl`): ningún «atrás» recarga el documento y en todos cierra
el modal y quita `panel` y el id de la URL. En Configuración › Leads los 9 casos («Nuevo», «Editar» desde el «⋯» y el nombre de la fila, en orígenes, tipos y tipos de
seguimiento) dejan el foco en `body` tras recargar y «atrás»: llevan e2e. Sin recargar, «Editar» desde el «⋯» ya vuelve al «⋯» (O2s). «Salir de este lead» (F6) ya volvía
desde el 2a5; con su apertura sin marcar (M7, el estado de antes del 2a5) el foco queda en `body` (F6m).

- **El criterio para llevar e2e** es el mismo en los dos lados: lo lleva un caso que, sin la vuelta del hook, deja el foco en `body`. En configuración se ve en HEAD; en F6,
  con M7. Por eso F6 entra al spec de la ficha como regresión, en verde en HEAD, y M7 lo tumba. Si M7 no lo hubiera tumbado, no habría llevado e2e.
- **O2s es una guardia sin caída demostrable.** Sin recargar, Base UI devuelve el foco al «⋯» y `volverA()` sólo enfoca con el foco en `body`, así que ninguna mutación de
  los hooks la tumba (M2 tampoco, medido). Se queda porque fija que la vuelta no estropea el camino de siempre.
- **El guardián exige también `useVueltaDelFoco`:** sin él, `abrirConVuelta` deja la marca, pero tras recargar nadie recuerda la ficha y «atrás» deja el foco en `body`.
  La guarda acepta uno o varios `import`; con `noUnusedLocals`, importarlo obliga a llamarlo. M5 (sin `useVueltaDelFoco`) y M8 (sin `abrirConVuelta`) la tumban.
- **Se borra el registro en lugar de dejarlo vacío:** una lista vacía invita a volver a llenarla. Un `history: 'push'` nuevo sin las dos funciones hace caer `pnpm test`, y
  el único exento es `usePanelPorUrl()`, que las usa por dentro. La guarda lee el texto: un comentario que nombre el literal `history: 'push'` cuenta como panel.
- **En la edición, «ya abierto» mira el id** (`editando === id`), como en la ficha: abrir la edición de otro ítem con la de uno abierta marca otra vez.
- **Límite:** un clic en la fila fuera del nombre abre la edición con el foco en `body` y no marca, igual que en el listado de leads del 2a4. Con teclado se abre por el
  nombre (`<AbrirResumen>`), que sí marca.
- 4-49 se cierra con este paso, y 4-44 (a) con él. 4-61, 4-62 y 4-63 siguen sin fase.

## 2026-10-30 — Paso 4.14 (2b): el historial del elegido y «Cotizar» desde el resumen

- **La composición es una ranura desde `src/app`.** `vehiculos` no importa `cotizaciones` ni lee su tabla: la página de cotizar arma `<HistorialDelVehiculo>` (la cáscara de `diferido()` de
  `cotizaciones`, con `aviso: 'aqui'`) y se lo pasa a la barra como `historial: ReactNode`; el panel lo dibuja dentro de la región «Elegido». El conteo se lee en el servidor, en el mismo
  `Promise.all` que la hoja y el elegido; el historial se lee en el navegador al desplegarlo.
- **«Cotizado (n)» es sólo una etiqueta y puede estar vieja.** Guardar no vuelve a pedir la página (`crear-cotizacion.ts` no revalida): la insignia y el «(n)» del botón cambian al elegir,
  quitar o recargar. El historial no depende de ella: su botón está siempre y lo que muestra lo dice la lectura al desplegarlo (H5: guardar la primera cotización de un vehículo y abrir el
  panel sin recargar la muestra).
- **P1 (sin lead).** «Cotizar» del resumen abre la hoja con el origen y el vehículo; guardar espera al cliente (4.14-3). **P2 (sólo lo que ve).** El número y la lista salen de la misma
  lectura con la RLS de quien mira; con «propios» (H3) se ve una sola cotización; sin ninguna, «Sin cotizaciones que puedas ver.» (no afirma que no las haya). Sin función de base.
- **«Ver más» y no «Anterior/Siguiente»:** el panel ya tiene una `<Paginacion>` con esos nombres, y una segunda los repetiría. Es el mecanismo 2 de `paginacion.ts` (una lista dentro de un drawer).
- **Medido: el JS en frío de la hoja.** La primera versión sumó 20,4 KB (453,6 de 460) aunque el historial va por `diferido()`: (1) `composicion.client.ts` reexportaba la lectura del historial y la hoja
  lo importa (+11,4 KB), así que la lectura vive en `composicion-historial.client.ts`; (2) la barra importaba `<Badge>` (+8,5 KB: arrastra Base UI a la carga en frío) y `conteoCorto` (+0,3 KB): ahora recibe el
  «n» ya escrito y dibuja una etiqueta propia. Queda en 433,5 de 460 (antes 433,2). **Regla:** un archivo de la carga en frío de la hoja no importa `<Badge>` (ni `conteoCorto`: lo escribe la página); se mide con `presupuesto-js`.
- **P3 (el tope de bytes).** La estimación del plan (150 B por fila, 4.000 B) se quedó corta: 4.972 B (escritorio) y 4.867 (móvil) con 21 filas. La persona fijó el tope en lo medido más un 5 %,
  5.250 B; los nodos, 61 medidos, con tope 65.
- **Sin camino a lo antiguo todavía:** el tope de 500 muestra «Mostrando las 500 más recientes.» sin cómo seguir; lo traen el 4.16 (listado con filtro) y el 4.17 (la sección del vehículo).
- **El autor sale embebido de `perfiles`** y `autorVisible()` repite la regla de `nombreVisible()` de `equipo` (que no llega al navegador); su comentario nombra el original.
- **Cierra sin abiertos nuevos.** «Cotizar» en la ficha `/vehiculos/[id]` y en el «⋯» del inventario no entró (la fila nombra sólo el resumen).

## 2026-10-30 — Paso 4.14 (2c): crear desde el panel y la partición en 2c1, 2c2 y 2c3

- **Por qué se parte.** 4-10 con P6 («elegir el tipo entre las filas de la tabla de transporte, con el sugerido marcado») no cabe en pantalla pura: la hoja no sabe qué dato del vehículo casa con qué
  columna de qué tabla (el `match` vive en `formulas.definicion`, que no viaja a quien cotiza, D7). Guardar el tipo (P3 del 2a) no pide base (`vehiculo_guardar` ya funde `atributos`); saber qué
  ofrecer, sí. 2c1 (este) = buscar, traer, «+», crear y elegir, tarea de oro con un vehículo buscado por nombre; 2c2 = la base (rigor máximo, compuerta `datos`); 2c3 = el tipo en el panel y la tarea de oro
  con un enlace de Copart (con `AUTOMOBILE` el transporte de `subasta_usa` queda sin valor y la hoja no guarda sin total).
- **P1 (se crea al confirmar en el panel).** «Crear y elegir» llama a `vehiculo_crear` (la action de siempre) y la hoja calcula enseguida con el año y el tipo, porque `cotizacion_evaluar` sólo recibe un
  vehículo que ya existe. Si la cotización no se guarda, el vehículo queda en el inventario (el de subasta lo recoge la limpieza; el de a mano, no). `p_vehiculo_nuevo` queda en la base sin uso desde la pantalla.
- **P2 (el layout se lee al abrir el alta).** La primera versión pasaba el layout activo del origen desde la página: con 106 campos eran +69.098 B sin comprimir en el documento de cada apertura de la hoja
  (presupuesto 40.000), se abra o no el panel. El alta lo lee ahora desde el navegador (`useLayoutActivo()` en `origenes`, con la sesión de quien mira) y la página sólo pasa `alta` = origen y si apibara
  está encendida; el documento de la dueña pesa 17.373 B más que el de un rol sin `vehiculos.crear` (el resto es del shell). Costo: una espera corta (esqueleto) al abrir «+» o «Traer».
- **Un campo, tres cosas.** El campo de arriba del panel busca (título, VIN, lote; desde 3 letras o números, `leerTextoDelPanel()`), y si el texto es un enlace de Copart o IAAI, un VIN o un lote lo ofrece
  traer. Un enlace no se busca (no está en un título). Un enlace que no se puede traer (origen manual, apibara apagada, sin `vehiculos.crear`) dice por qué debajo del campo; un VIN o un lote sólo se buscan.
- **Enter y la cuota de apibara.** Enter trae un enlace; un VIN o un lote sólo si su búsqueda ya volvió vacía (las repetidas se marcan _después_ de consultar y cada consulta gasta cuota). El botón «Traer» queda
  para quien lo quiera igual. Recargar con `?alta=subasta` muestra lo pegado y **no** vuelve a consultar: la consulta se pide con una marca en memoria que se pone sólo al decidir traer.
- **El alta es la del inventario.** Mismo formulario, mismas reglas y mismo borrador (`vehiculo-nuevo-<origen>`: lo escrito en un lado aparece en el otro); sin «Abrir ficha» (saldría de la hoja) ni «Guardar y cargar
  otro». Ctrl+S y el atajo de «guardar y seguir» crean y eligen, y no guardan la cotización de detrás (el último registro responde). Varias líneas guardadas con «Guardar las listas» se crean sin elegir ninguna.
- **El texto vive en la URL.** `?buscar=` y `?alta=mano|subasta` se escriben con `replace`, sin ir al servidor; el campo lleva `useTextoDeUrl()` (si no, la vuelta de la URL le quita el foco). La pausa de tecleo
  (300 ms) es una constante local: la de los listados es privada de `src/shared` y exportarla lo subía a Nivel 2 por un número.
- **Medido.** `creado_en` lo pide sólo la búsqueda: pedirlo en las pestañas subió la primera respuesta del panel a 5.627 B (tope 4.900); con el buscador, el panel mide 295 nodos y 4.681 B (topes 299 y 4.900).
  JS en frío de la hoja 443,9 KB de 460 (+10,4 KB del buscador y su alta) y de `/vehiculos` 476,3 de 500. La tarea de oro con el panel: 28 teclas de control, KLM 20,8 s (escritorio) y 19,4 s (móvil).
- **Una consulta de un lote que ya está en el inventario no llena la ficha** (queda marcada «ya está»): el e2e A2 corre antes de T1, que crea el lote 58540656 en el origen.

## 2026-10-30 — Paso 4.14 (2c2): el dato del vehículo de una celda de tabla

- **P1 (la celda, sin RPC nueva).** La celda de un nodo `tabla` que quien mira ve, en `cotizacion_hoja()`, lleva `dato_del_vehiculo: {tabla, columnas: [{columna, campo}]}`; las filas para elegir las
  da `cotizacion_tabla()`, que ya entrega esa columna a quien ve el nodo. Una RPC aparte sumaba un `security definer` más al inventario y a la matriz por nivel y una lectura por apertura del panel;
  mandar los valores en la hoja los pagaba cada apertura, se abra o no el panel. Cuesta +236 B por hoja sembrada (dos celdas de transporte), contra el tope de 16 KB.
- **P2 (qué cuenta).** Un valor del `match` que **no es el id de ningún nodo** —aunque coincida con la clave de un campo activo: el motor lee el nodo— y que el motor lee para ese origen (`anio`, `marca`,
  `modelo`, `kilometraje`, `precio` o un campo activo del origen de la hoja). Un `campo_vehiculo` (`factor_dp` sobre `anio`) no cuenta: ese dato se tipea en el vehículo, no se elige de una tabla.
- **Qué cambia en D7.** Hasta hoy el `match` no viajaba a nadie fuera de `cotizaciones.configurar`. Ahora viajan, de una celda que ya se ve, el vínculo «columna ← campo» y, en una celda **sin**
  ayuda de tabla, la clave de su tabla (antes sólo salía en `ayuda`). Las entradas que nombran un nodo nunca: el centinela de la prueba es un nodo oculto del nivel cuyo id es también un campo activo.
- **El contrato son las filas, no `columnas`.** `cotizacion_tabla()` saca `columnas` sólo de la tabla viva: con una congelada sin viva activa llega `[]`. No se exige la viva porque, desactivada, la
  versión publicada sigue calculando con la congelada y el motor sigue pidiendo el dato: el panel se quedaría sin opciones justo entonces, y la regla se separaría de la de la ayuda. `filas` también
  puede venir vacío (congelada `[]` o viva sin filas activas): el dato viaja sin opciones, el motor da `tabla_sin_filas` y el 2c3 tiene que decirlo en pantalla.
- **Un ayudante de nadie.** `_hoja_datos_del_vehiculo()` (invoker, `search_path ''`, sin `execute` para nadie fuera de `service_role`) arma el objeto nodo → dato una vez por lectura y no entra al
  inventario de lo oculto: no lee `formulas` ni `tablas_referencia` (recibe la definición desarmada), como `evaluar_formula`. Así `_cotizacion_hoja()` crece 3 líneas; que pase de 80 viene de antes.
- **`collate "C"` y PGlite.** `db:probar` corre en PGlite, con colación C: quitar el `collate "C"` no cambia ningún orden allí (M16). En la base local (ICU, `en_US.UTF-8`) sí (`a_` antes que `a1`;
  la premisa del plan, que ICU ignora `_` y pone `anio` antes que `a_z`, era falsa), así que T5 mira que la definición ordene con `collate "C"`.

## 2026-10-30 — Paso 4.14 (2c3): el tipo de vehículo en el panel

- **P1–P4 (compuerta de producto, todas la recomendada).** Cada fila se nombra **tal cual sale de la tabla**, como la ayuda de una tabla: quien configura la tabla decide cómo se lee, y lo que se ve
  es lo que se guarda. Se eligen **sólo campos de texto del layout** (`texto`, `texto_largo`); una columna fija (año, marca…) se cambia en la ficha con su validación. Tras «Crear y elegir» el panel
  **se cierra como siempre** y la celda sin valor dice «Elige el dato del vehículo en «Vehículo», arriba de la hoja, o escribe el valor.»: un camino, el mismo para un vehículo del inventario.
  **Un toque guarda** el tipo en el vehículo, cierra el panel y la hoja recalcula; equivocarse se corrige eligiendo otra, y el panel nunca queda con algo sin guardar.
- **El lector cruza por `src/app`.** `vehiculos` no conoce `cotizaciones` y una función no viaja del servidor al navegador: la página arma en el servidor `paraElegir` (los datos de la hoja, su valor, la
  versión y si quien mira lo edita, por `editablesDe`) y un componente de cliente de la página (`barra-de-la-hoja.tsx`) le suma el lector con `useLectorDeOpciones` de `cotizaciones/client`. Las formas de
  `vehiculos/entities/dato-para-elegir.ts` son estructurales. Qué se elige lo decide **un solo lugar** (`datosParaElegirDe`, C3) y la celda lo recibe como `seEligen`: no puede mandar a elegir algo que
  el panel no ofrece (una celda que sólo casa `anio` dice lo de siempre).
- **Límites.** Sólo campos `texto`/`texto_largo` y sólo valores de texto de la tabla: un número se leería con el locale al guardar («1.5» como 15) y el motor compara con igualdad estricta; un `opcion`
  exigiría que la clave de la fila sea una de sus opciones. Las opciones son la **unión** de las tablas del dato (dos en `subasta_usa`, una por variante): una clave que esté sólo en la tabla de la
  otra variante quedaría marcada y la celda visible seguiría sin valor (no pasa con la semilla, que tiene las mismas 8 claves). Se dibujan a lo sumo 50, con «Buscar en las opciones» como camino.
- **Guardar recarga la hoja.** Elegir hace lo mismo que elegir el vehículo (la URL con el mismo id, al servidor): la página lee el vehículo y la hoja de nuevo (otra hoja abierta) y la hoja se vuelve a
  montar con el borrador. Con algo tipeado, el aviso «Recuperamos lo que habías escrito…» sale a lo sumo una vez (E5); sin nada tipeado, ninguno.
- **Por qué es pantalla pura aunque escriba.** La action nueva (`guardarDatoDelVehiculo`) no crea un permiso ni una RPC: escribe sólo ese atributo por `vehiculo_guardar`, que ya exige `vehiculos.editar`
  por fila y la versión, y repite el permiso por origen y la validación del campo con el layout de hoy, como `guardarVehiculo`. La base no cambia.
- **La tarea de oro 2 con un enlace** (`e2e/cotizar-tarea-de-oro-enlace.spec.ts`, aparte porque el de la tarea de oro ya medía 272 líneas): 32 teclas de control, KLM 39,5 s con 6 decisiones, robot
  2,5 s (escritorio) y 3,0 s (móvil). apibara se intercepta con otro VIN y otro lote: el VIN es único entre los vivos y `cotizar-panel-crear-vehiculo` usa los de la ficha grabada.
- **Medido.** El grupo con dos tablas de 1.000 claves: 56 nodos (presupuesto previo 260; tope 59) y ≈ 55.100 B por lectura. JS en frío de la hoja 444,7 KB de 460 (+0,8).

## 2026-10-31 — Paso 4.14 (3a): «míos» por lo más reciente y la partición en 3a, 3b y 3c

- **El 4.14-3 se parte en tres.** La base (rigor máximo, compuerta `datos`) y la pantalla se verifican distinto, y la pantalla sola son dos superficies: el **3a** (esta base: Nivel 2 + cadena db +
  `db:carreras` + `db:medir:volumen`), el **3b** (el panel del cliente sobre la hoja; Nivel 1) y el **3c** («Nuevo lead» desde el panel, «Cotizar» en la ficha del lead y el tramo del cliente de la tarea
  de oro 2; Nivel 1). Lo que el 3b y el 3c tendrán que preguntar: si lo tipeado en la hoja se conserva al elegir el cliente, si las pestañas son «Todos» más una por clase, si tras «Nuevo lead» la hoja
  elige el creado y dónde va «Cotizar» en la ficha.
- **P1 (producto): «por actividad» es lo reciente del lead.** El último seguimiento vivo y, sin ninguno, el alta: `coalesce(leads.ultimo_seguimiento_en, leads.creado_en)`. Nunca es nulo, y por eso el
  cursor de `src/shared` (que no admite nulos en la columna de orden) lo usa tal cual. «Actividad» se queda para la auditoría (glosario: **Reciente**).
- **P2 (datos): una copia en la cartera.** `leads_asesores.lead_reciente_en`, con `leads_asesores_reciente_idx (usuario_id, lead_reciente_en desc, lead_id desc) where revocado_en is null`. Sin la copia,
  «míos» por lo reciente ordena la cartera entera en cada página o camina el único índice por seguimiento, que es global y no tiene persona. La copia está en **todas** las filas del lead, también las
  revocadas: compartir y «Tomar lead» del limbo reviven una fila por `on conflict do update`, y ahí lo que calcula el `before insert` se descarta; lo que la deja bien es el trigger del lead.
- **Una función de trigger aparte.** `leads_reciente_seguir()` no es `leads_creado_en_seguir()` ampliada: una sola responsabilidad. Si cambia `creado_en` de un lead sin seguimientos corren los dos (raro,
  aceptado). El relleno es una función invocadora, sin `security definer` y sin `execute` para la app; la migración la llama una vez, con `trg_leads_asesores_cartera_cambio` apagado (el relleno no cambia
  quién tiene qué lead). Medido, apagarlo no ahorra nada visible (10,6 y 10,7 s con 201.600 filas), pero tampoco cuesta.
- **P3 (datos): `trg_leads_asesores_cartera_cambio` no se toca.** El recálculo no reescribe el lead (`is distinct from`). Se midió el costo de escribir: 0,1 ms y 144/147 buffers más por seguimiento.
- **T1–T3 (los topes provisionales del plan, que el plan mandaba no subir sin la persona):** la pestaña por clase de la dueña (~15 % cliente) cuesta 1.535–1.551 buffers contra 1.500 → tope 2.500 (camina ~7
  leads por cada uno que muestra; no crece con N); escribir un seguimiento, 144/147 buffers contra 60 → tope 250 (0,1 ms contra 0,5); la clase ausente (la dueña sin ningún lead de una clase), 66 ms con
  62.000 y 289 ms con 212.000 contra 100 → se declara el límite (400 ms con 80.000 leads en su cartera) en `docs/RENDIMIENTO.md`: crece con la cartera de quien mira y no con los demás; la salida, si hace
  falta, es copiar también la clase en la cartera (índice por clase), que decide la persona en el 3b.
- **Lo que las pruebas tuvieron que cuidar.** Dentro de un bloque `now()` no cambia: todo lead del terreno parte con `creado_en` en el pasado y todo seguimiento lleva un `ocurrido_en` explícito, en el
  pasado y distinto de los demás; sin eso M1, M3, M4 y M8 no podían caer. La guarda de la copia corta a profundidad 0 (`pg_trigger_depth() < 2`), así que T1 y el relleno con volumen corren con
  `session_replication_role = replica` o con la guarda apagada. M9 (el `max()` de los seguimientos en vez de leer `new`) **no** es equivalente: cae con el recorrido al azar de `derivados-leads.sql`.
  M11 («la migración no apaga el trigger durante el relleno») sobrevive: ninguna prueba mira el resultado, que es el mismo; lo mira la medición y el trigger encendido después (T10).
- **Medido** (`docs/RENDIMIENTO.md`): página 1 y profunda de «míos» 1,6–2,2 ms y 485–733 buffers con 62.000 y con 212.000, sin `Sort`; sin el índice, 71 y 296 ms. La siembra de volumen y cuatro `medir-*.sql`
  que insertaban cartera con los triggers apagados nombran ahora `lead_reciente_en` (la columna es `not null` sin default).

## 2026-10-31 — Paso 4.14 (3b): el panel del cliente sobre la hoja

- **P1 (producto): elegir el cliente conserva lo tipeado.** El borrador de la hoja (`sessionStorage`) deja de ir por lead: queda por persona, origen y vehículo; el pendiente del guardado sigue yendo por lead
  (es de una cotización con su cliente). Elegir o cambiar el cliente vuelve a montar la hoja (el lead va en su `key`) y el borrador repone lo tipeado con el aviso de siempre. Efecto aceptado: en la misma pestaña,
  abrir otra hoja del mismo origen y vehículo con otro lead también lo recupera, con el mismo aviso y «Descartar». Se hizo en su propio commit, antes del panel.
- **P2 (producto): «Todos», «Prospecto» y «Cliente», abre en «Todos»** (la lectura medida más barata). **P3 (producto): el campo busca entre los leads que quien cotiza ve**, como el listado
  (`leads_candidatos` sin `mios`): `cotizacion_crear` ya acepta cualquier lead que se ve. **P4 (producto): «Quitar» sí**, frente a `docs/UX.md` («el lead es obligatorio siempre»): lo obligatorio es para guardar,
  no para tipear; quitar corrige un cliente elegido por error y «Guardar» vuelve a pedir el cliente.
- **El panel vive en `leads`** (lee leads y es su vocabulario: el tipo, los números), no en `cotizaciones`; `src/app` lo compone con `pantallas/cotizar.ts`, como el del vehículo. Las lecturas van por el navegador
  (cambiar de pestaña o de página no puede ir al servidor) con la sesión de quien mira; ninguna policy, grant ni RPC nuevos.
- **Un `?lead=` que quien mira no ve se suelta**, como el vehículo: la barra queda sin cliente, y la hoja y las pestañas de origen no lo llevan (antes lo llevaban sin leerlo y guardar fallaba en la base). Sólo
  `ok(null)` —la lectura respondió sin fila— suelta el lead; un error de la lectura sube al `error.tsx` con «Reintentar». Sin `leads.ver` ni se lee. `e2e/cotizar-hoja.spec.ts` probaba que cambiar de origen
  conserva el lead con un id inventado y con una persona sin `leads.ver`; esa prueba pasó a `cotizar-panel-del-cliente.spec.ts`, con un lead sembrado.
- **Una ventana de candidatos basta para la búsqueda**: sin condiciones de página (sin marcas ni filtros), los candidatos son la página y la ventana trae hasta 300 (≥ 21). Sólo número (`#n` o corto): son los
  ids del número, de `leads_ids_del_numero` (con `leads.numero_global.ver`, el global y el propio de cualquier creador; sin él, el propio).
- **El catálogo al abrir**: `leads_catalogos()` entero (tipos y hasta 100 orígenes que el panel no usa; es la lectura que ya existe) se lee una vez al abrir el panel, con memoria de 60 s. En «Todos» y en la búsqueda
  va a la vez que la primera página; la pestaña de una clase lo espera (necesita los ids de sus tipos, también los apagados). Sin el catálogo no se pueden nombrar los tipos: la lista entera es el error.
- **Una parada de Tab más en las tareas de oro**: la barra del cliente va entre la del vehículo y la hoja, y los topes suben en 1, como en el 4.14-2a (`docs/DECISIONES.md`, «Paso 4.14 (2a)»): 25 (la hoja), 29
  (con el panel del vehículo), 26 (los Tab hasta el primer lado editable) y 33 (con el enlace). Medido: 25, 29 y 33 en los dos proyectos.
- **Los localizadores `Guardar` de los e2e de guardado pasan a `exact`**: el nombre accesible de la barra («Cliente: …») contiene el nombre del lead, y el del lead de prueba contiene «guardar».
- **4-65 se acepta como límite** (T3): la pestaña de una clase que quien mira no tiene recorre su cartera (72 ms con 20.000 leads en su cartera, 285 ms con 80.000; tope 400) y el panel muestra el esqueleto
  mientras tanto. La salida —copiar la clase del lead en la cartera, con índice y triggers— no se hace. **4-50** empeora con la barra nueva: 227 px bajo el borde en escritorio y 157,6 en el celular, al 200 % y con la
  página arriba (107 y 37,6 con una sola barra); no se arregla aquí. **4-54**: elegir un cliente mientras se guarda es el mismo caso.
- **Topes del panel**: lo medido más un 5 %, 159 nodos y 5.282 bytes (151 y 4.988–5.030 con 20 filas; el presupuesto previo era 320 y 6.000). JS en frío de `/cotizaciones/nuevo`: 452,9 KB contra 460.
- **Los textos de los estados son microdecisiones**: «No se pudieron cargar los leads.», «Todavía no tienes leads en tu cartera.», «No tienes leads de esta clase en tu cartera.», «Ningún lead que puedas ver
  tiene «x» en el nombre o ese número.», «No puedes ver los leads.», «Selecciona un cliente» y «Escribe al menos 3 letras» (el mínimo del listado).

## 2026-10-31 — Paso 4.14 (3c): «Nuevo lead» desde el panel del cliente y «Cotizar» en la ficha

- **P1 (producto): guardar «Nuevo lead» abierto con «+» elige al creado.** El alta se cierra, la hoja elige al lead creado (la barra lo muestra, lo tipeado se conserva por el 3b y el foco vuelve a la barra) y el aviso
  «Lead creado · …» va sin «Abrir ficha»: salir dejaría la cotización a medias, como «Crear y elegir» del vehículo. La tecla `N` sobre la hoja abre «Nuevo lead» como en cualquier pantalla y no elige al creado: sólo el «+»
  lleva `?elegir=`.
- **P2 (producto): «Cotizar» es un botón de la cabecera de la ficha**, entre «Editar» y el «⋯», como en el resumen del vehículo; suma una parada de Tab a quien cotiza (la tarea de oro 4 no cambia: su asesora no cotiza). Abre la
  hoja en el primer origen donde quien mira cotiza (las pestañas cambian de origen y conservan el lead). Se ofrece también a quien no puede editar el lead: cotizar pide ver el lead.
- **P3 (producto): sin «Elegir» cuando el teléfono ya es de un lead que quien cotiza ve.** Se busca en el panel del cliente; queda como 4-66.
- **Se reusa el «Nuevo lead» del shell**, no un alta dentro del panel: un solo drawer con su borrador, su verificación del teléfono y la tarea de oro 1, y el código del alta no viaja con la hoja (JS de `/cotizaciones/nuevo`
  453,1 KB de 460). El panel sólo lo abre con una escritura de la URL (`replace`: «atrás» vuelve a la hoja sin panel).
- **`?elegir=<clave>` nombra una clave de la URL de la misma página**, validada por `claveParaElegir()` (1 a 20 letras minúsculas, ni `panel` ni `elegir`) antes de usarla en la escritura y en el selector del foco; nunca llega a
  una consulta. Un enlace armado a mano con `elegir` en otra pantalla sólo escribe `?<clave>=<id del creado>` ahí (en `/leads`, abre el rápido del creado): inofensivo.
- **El foco**: al pasar del panel del cliente al alta, el panel no devuelve el suyo (`focoAlCerrar` devuelve `false` si el que sigue es «Nuevo lead»): Base UI lo habría devuelto a la barra un instante después, quitándoselo al
  teléfono (medido: varias corridas perdían letras). Al cerrar el alta abierta con `?elegir=`, el foco va a la barra «Cliente» (`data-elige`), no a quien abrió (el «+», que ya no existe); `MarcoDelAlta` guarda el último
  `elegir` visto con el alta abierta porque, al cerrar, la URL ya no lo trae.
- **El texto de «Guardar» sin cliente** es «Para guardar, elige el cliente en «Cliente».» (microdecisión, como «Elige el dato del vehículo en «Vehículo»…»). Sin `leads.ver` (la barra dice «No puedes ver los leads.») el texto es el mismo:
  distinguirlo pediría pasar el permiso a la hoja para un rol que no puede guardar de todos modos (`cotizacion_crear` exige ver el lead).
- **La ficha lee los orígenes sólo para quien tiene `cotizaciones.crear`**, a la vez que la ficha (`paraCotizarDe()`): si la lectura falla, el botón no está y la ficha sigue. La base vuelve a exigir los permisos al guardar. Las
  cuatro secciones diferidas de la página pasaron a `seccionesDe()` para no pasar de las 80 líneas de `PaginaLead`.
- **Topes de la tarea de oro del cliente**: lo medido, igual en los dos proyectos: 29 teclas de control con un cliente que existe y 30 con uno nuevo (el Tab hasta el «+» y su Enter, un Tab del teléfono al nombre y el Ctrl+S
  del alta); robot < 30 s y KLM ≤ 90 s (17,2 y 28,3 s). Panel del cliente con el «+»: 156 nodos (tope 159).
- **Los e2e esperan estados finales, no teclas**: el spec del alta espera `toHaveValue(nombre)` antes del Ctrl+S (el robot tipea más rápido de lo que la página confirma) y que los resultados de la búsqueda lleguen antes de
  tabular a la fila (la lista «míos» se reemplaza al llegar). La pausa de nuqs al escribir la URL se espera con `expect.poll`.

## 2026-11-04 — Paso 4.15 (1 de 3): guardar pide ver y editar; la revisión guarda los totales por clave; 4-26

- **El 4.15 en tres pasos y no en dos**:
  - La base de editar y la de cotizar encima ya son dos RPC `security definer` con su inventario, su matriz y sus carreras.
  - La pantalla suma otros tres commits.
  - El 1 cierra los abiertos de la base. El 2 hace la base de editar y cotizar encima, con P1–P7. El 3 hace la pantalla, con P7 y P8.
- **Un solo ayudante decide quién guarda** (`_cotizacion_puede_guardar()`, invocador y de nadie), y no dos `case` repetidos en `cotizacion_guardar`:
  - La misma regla se pregunta antes del candado (con la fila sin tomar) y después (la clase o el alcance pudieron cambiar mientras esperaba). El 4.15-2 la usará para decidir qué se edita en la hoja de una guardada.
  - Pedir ver primero hace que quien no ve reciba el 42501 de lo inexistente antes de tomar el candado y antes del PT409, el 22023 o el `intento_reusado`, que delataban que existía.
- **`totales` por clave, con los grupos enteros**: un grupo es la unidad que el recorte deja ver o no (`usd`, `bs`, `se_dibuja`), y partirlo por clave no ahorra nada.
  - Al leer, `_cotizacion_diff_recortado()` compara después de recortar y saca el grupo igual y el `grupos: {}`. Si no, un grupo visible cuyo único cambio es su Bs, para quien no ve ese tipo de cambio, diría que el Bs de ESE grupo cambió. Las revisiones viejas (enteras) se leen igual.
- **4-26 se cierra «no reproducida»** con las 10 + 2 corridas, y el hallazgo del conteo tras `analyze` queda aparte (4-67, lo decide la persona): no hay causa demostrada de la caída de CI, y arreglar el conteo de leads no es de este paso.
- **El `update public.permisos` de la migración** (`aplicado_en` y la descripción de `editar`) es para la nube: en local la tabla está vacía al correr las migraciones y lo pone el seed, que es lo que prueba `cotizacion-guardar.sql`.

## 2026-11-04 — Paso 4.15 (2 de 3): la hoja de una guardada, revisiones con autor y cotizar encima

- **Las preguntas del 4.15, contestadas por la persona el 2026-11-04, todas con la recomendada:** P1–P8 (la N+1 es otra cotización con `cotizacion_padre_id` y `version` + 1;
  se lleva lo tipeado, también lo oculto; de la última de su cadena, una a la vez; su número; quien cotiza y ve la anterior y su lead; la anterior queda igual; dónde se
  ofrece y dónde se edita, del 4.15-3) y las nuevas del plan:
  - **P9** la N+1 nace al tocar «Cotizar encima» (`cotizacion_encima`), no al guardar: una sola RPC, sin hoja abierta ni recálculo nuevos; si se abandona, queda una cotización más.
  - **P10** siempre preventa, también encima de una final.
  - **P11** quien ve la anterior y no la N+1 sabe que existe (`encima: {"oculta": true}`; el PT409 sin el id), sin su número ni su id.
  - **P12** la vigencia (D1) nace ahora: `ajustes_empresa.vigencia_dias`, sin pantalla hasta el 4.20.
  - **P13** quien sólo ve una cotización abre su hoja en sólo lectura, con secciones, etiquetas, ayudas y atajos de su nivel (aprobada con el plan en la compuerta `datos`).
- **Lo editable de la hoja de una guardada lo decide el ayudante de guardar** (`_cotizacion_puede_guardar()`), y dentro de eso, el nivel de `_nodos_visibles()`, como en
  `cotizacion_guardar`. `_nodos_visibles()` solo daba «editar» a quien tiene `crear` sin `editar` o `editar` con otro alcance: la hoja habría ofrecido celdas que guardar rechaza.
  Sin poder guardar, el motivo de una celda es `no_se_edita` y no un nivel (el motivo es la cotización, no el nivel).
- **«Vencida», por día en la zona de la empresa**, como el glosario: vale hasta el día de `creado_en` + `vigencia_dias`, entero. Por hora, una del lunes a las 18:00 vencería
  el lunes siguiente a las 18:00 y la misma tarde diría dos cosas.
- **`descartados` cuenta sólo lo que quien cotiza ve** (estrecha P2, «la hoja dice cuántos»): contar lo oculto que se pierde delataría cuántos nodos ocultos había.
- **`cotizacion_encima` va sin `p_abierta`**, excepción a «un alta nueva recibe `p_abierta`» (4-27): la N+1 no sale de una hoja que la persona vio ni lleva una hora del cliente;
  usa la publicada y las tarifas del momento, como pide P1.
- **El índice de una N+1 viva es parcial** (`where eliminado_en is null`): mandar la nueva a la papelera deja cotizar otra. Restaurar la primera cuando ya hay otra da el 23505
  del índice sin texto humano: 4-70, para el 4.24 (la papelera propia reescribe restaurar).
- **Cotizar encima de una anterior sin modo deja la nueva sin modo**, aunque el diseño de hoy tenga modos (el plan decía «el primero del diseño»): sin modo, el motor usa
  los buckets de la fórmula, que es lo que la anterior calculaba; ponerle el primero cambiaría el total en silencio. Un modo que ya no existe pasa al primero de hoy (E2).
- **Las etiquetas de las revisiones salen de la página ya recortada**, no de la definición entera: lo que no viaja no tiene etiqueta (ni un nodo oculto ni uno que no cambió).
- **El paso es de Nivel 2** (estructura: la columna y el índice), no el 1 de la fila: corrió el completo de escritorio y la cuenta de pantallas sin completo vuelve a 0.

## 2026-11-04 — El piloto sin esperar al CI: verificación local mínima, `ci-fix` y puerta de fase por CI

- **El piloto no se detiene por un CI rojo ni lo espera**: lo anota (`.piloto/ci-rojos.md`) y sigue con el paso siguiente.
  - El 4.15 y el 4.14-3c ya habían parado dos veces por «el último CI está en rojo», y cada parada esperaba a la persona.
  - Frenan sólo un job `Base ·` en rojo (RLS, grants, advisors contaminan lo que se construye encima) y 5 corridas rojas juntas.
- **El CI es la autoridad de la suite, el lint y los e2e**; local queda lo barato: `verificar.sh` hacía ≈ 11 min por paso (4.14-3c) que el CI repetía.
  - El hook Stop de un paso del piloto sólo tipa y revisa el mapa con el árbol limpio; el pre-commit no repite el typecheck con `PILOTO=1`.
  - Una sesión de la persona sigue verificando todo.
- **Un rojo se arregla con un paso `ci-fix`** sin ruteo, desde 3 rojos juntos o en la puerta de fase, hasta 2 intentos.
- **La puerta de fase ya no es una pregunta a la persona**: es el CI de la rama en verde y sin rojos anotados. Cambia la regla de `CLAUDE.md` y `docs/PLAN.md` «nunca más de una fase sin parar»; la persona lo pidió así (2026-11-04) para que la app siga andando al 100 % sin que el piloto se detenga.
- **El 4.15 estuvo parado ≈ 4 días por un texto**: el detector del límite de uso buscaba «session limit» y el mensaje decía «5-hour limit». Ahora reconoce el texto y la señal estructurada (`usage_limit_reached`).
- **Producto se contesta solo con la recomendada** y queda en `.piloto/decisiones-automaticas.md`; `datos`, `guardas`, `dependencia`, `afuera` y `atasco` siguen siendo de la persona.
- **El tope por paso sube de 60 a 200 USD**: en la Fase 4 un paso costó entre 9 y 36 USD (423,52 USD en 57 llamadas); el tope sirve de freno a un paso atascado, no a un paso normal.
- **Pendiente, medido y no hecho**: el contexto de ≈ 320.000 tokens por turno es lo que más cuesta (la lectura de caché pasa de 1.000 M de tokens en la Fase 4). La salida es ejecutar cada commit con un subagente de contexto nuevo; se prueba en un paso real y se mide antes de dejarlo por omisión.

## 2026-11-04 — Paso 4.15 (3a de 4): abrir y guardar en `/cotizaciones/[id]`

- **Partición:** el 3 de la fila (pantalla, revisiones y «Cotizar encima») no cabía en 3 commits; el 3a es abrir y guardar, el 3b las revisiones y encima. P1: la página no cambia el vehículo
  de una preventa (se anota 4-71); P2: al abrir se recalcula y, si no da lo guardado, se avisa y «Total guardado» muestra el de antes; descartadas: abrir con el snapshot sin recalcular
  (otra forma de respuesta de la hoja) y recalcular sin aviso (se vería otro total que el cotizado).
- **`actualizadoEn` viaja como el texto de la base**, nunca por `Date` ni `fechas.ts` (pierden los microsegundos y daría siempre PT409). La versión esperada se manda tal cual la leyó la página; el intento es uno nuevo por guardado.
- **El borrador y el pendiente de una guardada** van por persona y cotización, y el borrador lleva la versión: tras un conflicto lo tipeado no vuelve sobre lo que guardó la otra persona; el aviso lo dice.
- **«Guardar» está apagado sin cambios**, salvo con un pendiente (se reenvía, 4-21) o con lo de hoy distinto de lo guardado. El único texto de la base que se muestra es el del PT409 (nombra a una persona y una hora); un 22023 del vehículo sin `details` dice que la cotización cambió.
- **Quién guarda lo dice `puede_guardar` de la base**, no `puede()`: no conoce el alcance por cotización. `difiereAlAbrir` compara los `valores` y `totales.usd`, no sólo el total (una celda puede cambiar sin mover el total).
- **«Recargar» vuelve a montar la hoja con la lectura que pidió** (la `key` suma una lectura pedida); una lectura que nadie pidió no la remonta y lo tipeado se queda. **La lectura del cliente y del vehículo va en serie tras la hoja** (sus ids salen de ella), no en paralelo.
- **Rigor:** pruebas que fallan primero, 5 mutaciones e informe auditado; sin carreras ni volumen (ningún SQL cambia).

## 2026-11-04 — Paso 4.15 (3b de 4): las revisiones, la cadena y «Cotizar encima»

- **P1: con cambios sin guardar «Cotizar encima» espera.** La versión nueva lleva lo **guardado** de la anterior (`cotizacion_encima`), así que lo tipeado no llegaría; el botón se apaga y dice «Guarda o descarta tus cambios antes de cotizar encima: la versión nueva lleva lo guardado.». `hayCambios` lo calcula un solo lugar (`useGuardarLaGuardada`: lo tipeado, «Ver total Bs» o un guardado pendiente). Descartadas: dejarlo tocar (quien tipeó creería que la nueva lleva su cambio) y guardar primero (dos escrituras con el conflicto en medio).
- **P2: ningún camino a las revisiones de más de 500, por ahora (4-75).** Excepción nombrada a «siempre hay un camino a lo antiguo» (`.claude/rules/escala.md`), como el historial del vehículo: 500 ediciones de una cotización no es un caso real y la base lee de a 20 por índice. El camino («Ir a una fecha») va al 4.17.
- **El aviso de versión lo ve todo el que abre la página y el botón sólo quien puede** (`puede_cotizar_encima` de la base): dice algo de la cotización, no de quien mira. **La action no llama a `puede()`**: la base lo pide todo (`cotizacion_encima`) y la pantalla no conoce el alcance por cotización.
- **El intento de cotizar encima se conserva sólo tras una pérdida:** reintentar devuelve la misma versión nueva (`repetido`) y no crea otra; cualquier otra respuesta lo olvida. Dos toques seguidos crean una sola (el ref de «ocupado» y el índice único `cotizaciones_encima_unica`).
- **Lo descartado se dice en un aviso efímero** («Versión 2 creada (n.º M). 1 dato que tipeaste no sigue en la versión de hoy.»): la página cambia y no queda dónde. `descartados` es la cuenta de la base sobre lo que quien cotiza ve.
- **Ningún texto de la base se muestra** (`resultadoDeEncima` y `textoDeEncima`); los once casos de `cotizacion_encima` tienen el suyo. Un `fuera_de_rango` del total cae en «sin total».
- **La hoja compartida sólo suma un hueco** (`encima`, que recibe `hayCambios`); la hoja nueva no lo llena y su JS no cambió. El panel de revisiones y la cadena viajan en `features/revisiones` con `diferido()`; las revisiones se leen por `composicion-revisiones.client.ts`, aparte de la composición que importa la hoja.
- **Los topes del panel se fijaron midiendo, por encima del previo del plan:** 200 nodos no alcanzaba (≈ 12 por fila con dos `<Monto>`); 241 medidos, tope 254 (+ 5 %), y 11.907 B, tope 12.503. Lo decidió la sesión y se dice en el informe y RENDIMIENTO.
- **Rigor:** pruebas que fallan primero, 6 mutaciones con Vitest (y 2 más del `fix` de la auditoría) e informe auditado en dos rondas; sin carreras ni volumen SQL (ningún SQL cambia; la RPC de revisiones ya estaba medida con 500).

## 2026-11-04 — Paso 4.16 (1 de 4): el listado de cotizaciones por cursor y por alcance (4-14)

- **Partición en cuatro:** el 4.16-1 es la lectura (4-14), el 4.16-2 el gemelo del inventario (4-23), el 4.16-3 la siembra de cotizaciones y `medir-escala.sql`, el 4.16-4 la pantalla.
  Se verifican distinto (base con volumen, base de vehículos por PostgREST, siembra, pantalla con el shell) y la base sola ya llenaba una sesión.
- **P1: «Mías» son las que creó quien mira** (`creado_por`), para cualquiera. No es «Míos» de leads (`en_cartera`): con la cartera, a un asesor el filtro no le cambiaría nada.
  **P2: todas las versiones de una cadena salen**, cada una en su fila; la cadena se ve al abrirla.
- **`cotizaciones_listado()` es invocadora:** la RLS de «cotizaciones: leer» sigue decidiendo y las rutas sólo eligen el índice. Lo que devuelve se compara, persona por persona y con cada
  filtro, con la regla escrita a mano (`cotizaciones-visibilidad.sql`, L2). La cartera sale de `mis_leads()` (una llamada; el conjunto de `en_cartera()`): leer `leads_asesores` como quien
  mira pasaría por la RLS de `leads` y perdería el lead en la papelera y a quien no tiene `leads.ver` (Q en L2). No es el arreglo que prohíbe `escala.md`: no es una policy.
- **La clase nunca es columna de un índice:** `enum_eq` no es _leakproof_ y bajo la RLS `c.clase = …` no puede ser condición de índice. Medido: con `(clase, …)` y `(origen_id, clase, …)` la
  dueña y Teo leían `cotizaciones_listado_idx` filtrado (1.056–4.764 bloques). La final va por parciales `… where clase = 'final'` con `'final'` literal en su rama (la prueba del predicado no
  pasa por la RLS); la preventa, por el índice del orden con la clase como filtro (las finales son la minoría).
- **`lead_id` y `origen_id` con un solo índice entero al frente** (`cotizaciones_lead_creado_idx`, `cotizaciones_origen_creado_idx`; se van `cotizaciones_lead_idx`, `cotizaciones_lead_id_idx` y
  `cotizaciones_origen_id_idx`): entero, porque cubre la FK de verdad (también la papelera; el lint de splinter no lo distingue y no falla, la guarda es L8); uno solo, porque dos que sirven
  a la misma consulta compiten en el plan genérico: con 50.000 la cartera sondeaba por la FK y ordenaba, y con 250.000 por el del orden. `creado_por` sigue con dos (la ruta 2 leyó siempre
  `cotizaciones_creador_idx`) y `vehiculo_id` sólo con parciales (4-51).
- **El tope de la dueña es de bloques de `cotizaciones` (≤ 116), no de buffers totales:** cada llamada carga ≈ 160–240 buffers fijos de `origenes_con_alcance()` → `mis_permisos()` y de las
  InitPlan de la policy (4-77), que no son de este listado y no crecen con N. Bajarlos toca una `security definer` de todas las policies: es otro paso, con compuerta `datos`.
- **El máximo es 100** (`MAXIMO_DE_PAGINA_DE_COTIZACIONES`): con 101 filas, 1,1–2,1 ms la dueña, 1,6 ms la «chica», 10–23 ms Ana, ≤ 2,3 ms Teo, con 50.000 y 250.000.
- **El paso se detuvo una vez en su parada (4)** (los índices por clase no servían) y la persona eligió replanificar: el plan se corrigió con lo medido, se auditó dos veces más y una sonda en
  la transacción confirmó, antes de tocar la función, que los parciales se usan con el literal y que el plan de Ana es el mismo con los dos volúmenes (`d = 0`).
- **Rigor:** pruebas que fallan primero (también la medición, con «lo de hoy»: 1,8 s Ana y 2,3 s la «chica» con 250.000), 19 mutaciones que caen e informe auditado; sin carreras (no hay escritura nueva).

## 2026-11-05 — Paso 4.16-2a: el inventario por rutas, con los filtros del layout en SQL

- **Cómo se llegó.** 4-23 pedía que quien ve «propios» no recorra el origen. Tres sondas con volumen, antes de escribir nada (`.piloto/informes/4.16-2.md`), descartaron dos
  diseños:
  - **S0:** una función `setof` con ramas `union all`, leída por PostgREST con su `order by … limit`, ordena todo. En Postgres 17 una hoja con `where` no se aplana en el
    appendrel (`is_safe_append_member`).
  - **S0':** con el `order by` en cada hoja hay `Merge Append` **sólo con `enable_sort = off`**. Con el plan normal y un `order by` o un join afuera, cada hoja se planea para
    leerse entera (`tuple_fraction = 0`): Beto quedó en 72–75 ms. **Una forma probada con `enable_sort = off` no prueba el plan real.**
  - La persona eligió (P-parada) dos lecturas por sentido y, si no cabían, los filtros en SQL. S0' no cupo y se pasó a lo segundo, como el 4.16-1.
- **`vehiculos_inventario()`, plpgsql invocadora:** cada ruta lleva su `order by … limit` y Postgres sabe que lee una página.
  - R1, el origen (`vehiculos_origen_listado_idx`): para quien ve «todos» y para una cartera de más de 5.000 (`leads_cartera_corta()`), como hoy.
  - R2, lo creado (`vehiculos_creador_idx`, nuevo).
  - R3, la cartera corta: un lateral por lead de `mis_leads()` sobre `vehiculos_lead_id_idx`.
  - Se quitan `vehiculos_creado_por_idx` y `vehiculos_lead_idx`: un solo índice entero por columna que se sondea (la regla del 4.16-1).
- **SQL dinámico.**
  - Por qué: un número variable de condiciones de atributos (un `and` de `or`) pedía, en SQL estático, una subconsulta por fila.
  - El texto lo arman `_vehiculos_inventario_sql()` y sus ayudantes, y depende sólo de la forma del pedido. **Ningún valor entra al texto:** todos llegan como `$1 -> i` por
    `execute … using`. El precedente `_leads_candidatos_sql` los mete con `%L`.
  - Los ayudantes son invocadores con EXECUTE para `authenticated` (como `_diseno_*`), porque los llama una invocadora. Exponen el texto, no datos. El patrón «contiene» copia
    la expresión de `_lead_busqueda_patron()` en el texto (L1 prueba que es la misma) y `_lead_busqueda_patron` sigue siendo de `service_role`.
- **Los topes de la validación** (la URL ya no los pone): 100 condiciones; 500 por arreglo (en 16 KB de URL caben ≤ 442 uuids); 1.000 sumando el pedido; 1.000 caracteres por
  texto y por alternativa. El año, un entero de `smallint` (±32.767). Un `2010.0` caía al leer con `22P02`.
- **P-limpieza: no releer la fila.** S0'' paró en Beto (10,3–10,8 ms contra 10; hoy 6,7) porque la lateral de `limpieza_el` relee cada fila y paga otra pasada de la RLS:
  InitPlans, `mis_permisos` y un `en_cartera` por fila. La persona eligió calcularla sobre la fila que la ruta ya leyó.
  - R1 y R2 cortan en su `limit` antes de proyectar.
  - R3 relee sólo las filas de la página, por un `case` con una subconsulta escalar. Una lateral con `where f.releer` relee igual.
  - Calcularla en R3 para toda la cartera dejaba a Vera en 63 ms.
  - Con la regla de hoy toda fila de R3 tiene lead y queda anclada (`vinculo`), así que su relectura da nulo. Se paga por robustez.
- **Contra hoy** (página 1, 250.000, por PostgREST / nuevo): la chica 32,3 / 2,5 ms; Vera 78,5 / 28,1. **Beto paga 1,8 ms más que hoy (6,3 → 8,1) y Pía 1,0 (5,0 → 6,0),
  dentro de los 10 ms.** El 4.16-2b decide con ese dato: Beto pasa por la función.
- **La equivalencia con PostgREST** la ata un e2e sin pantalla (`e2e/vehiculos-inventario-postgrest.spec.ts`: 47 casos, la dueña y una persona «propios», de a 3 y de vuelta).
  L5 la repite en PGlite contra una referencia escrita a mano. S1 capturó 69 textos de PostgREST: cambia la notación, nunca el significado.
- **Partido en 2:** el 2a es la base; el 2b, la app, que cierra 4-23. El registro en `paginas-en-la-base.ts` va en el 2b, porque su guarda hace caer una entrada que nadie llama
  desde `src/`.
- **4-77:** `origenes_con_alcance()` con 1, 74 (la dueña) y 122 concesiones da 7 buffers y ≈ 0,3 ms en los tres. No crece con las concesiones. Los 148 bloques de `perfiles`
  del 4.16-1 no se reproducen y su causa sigue sin medir.
- **Atribuciones corregidas del plan:** M1 la ve L2 (no L4); M27 la ve L1c (no L1b (b)). M14 no tenía caso en el e2e y el `fix` lo sumó (`lote(`).

## 2026-11-05 — Paso 4.16-2b: la pantalla lee el inventario de «propios» por `vehiculos_inventario()` (cierra 4-23)

- **La fuente va en el pedido.** `fuenteDelInventario(permisos, origenId)` (`entities/fuente-del-inventario.ts`) da `'vehiculos_inventario'` si el alcance de `vehiculos.ver` en ese
  origen es «propios» y `'vehiculos'` si es «todos» o nulo. La calcula la página y viaja en `BuscadorDeVehiculos` (`fuente`, obligatoria); `buscarVehiculos()` despacha.
  - **No se pregunta el tamaño de la cartera:** costaría otra ida a la base. Todo «propios» va por la función y es la base la que elige entre R1 y R2 + R3 (el 4.16-2a: Beto 6,3 → 8,1 ms).
  - Es un camino, no un permiso: la función responde igual a cualquiera y la RLS decide lo que se ve. Bajo «Ver como» la fuente sale de los permisos simulados; la base elige la ruta con los reales.
- **Si la base rechaza los filtros (`22023`, hint `filtros`), esa página se lee por la tabla, una sola vez.** El 2a dejó al 2b qué hacer con los topes de la validación.
  - Copiarlos en TS sería una tercera copia de la regla, y no mide igual (`a::text` de Postgres pone espacios que `JSON.stringify` no pone). La URL no llega a ellos (texto ≤ 100; 442 uuids contra 500).
  - Ningún otro error vuelve a leer (`origen`, `cursor`, `42501`, transporte).
  - **La vuelta esconde una desviación**, así que hay dos redes. El e2e de equivalencia (`vehiculos-inventario-postgrest.spec.ts`), con los casos que ya tiene, y un **contrato de tipos** en `inventario.test.ts`:
    `Record<Condicion['tipo'], true>` y los `when '<tipo>' then` de `_vehiculos_inventario_validar` y `_vehiculos_inventario_condicion`, leídos con `definicionSql()`. Un tipo de `Condicion` nuevo sin su caso en la
    base rompe `pnpm test`, no la producción. Se descartó un registro en el servidor: avisaría después, en un log que nadie mira.
- **Excepción a «Zod en todo límite (… RPC)»** (`CLAUDE.md` › «Reglas»): `p_filtros` no pasa por Zod en TS. Se descarta el `esquemaDeCondiciones` del esbozo del 2a (`.piloto/planes/4.16-2.md:46-47`): las condiciones las arma
  `condicionesDe()` desde un esquema ya validado, la base las valida enteras y, si las rechaza, se lee lo de hoy. El pedido (`origenId`, `tamano`, cursor) y las filas sí pasan por Zod (`inventario.ts`).
- **E4 prueba que la pantalla usa la función.** `e2e/vehiculos-propios.spec.ts` mide con `pg_stat_statements` (sirve porque `workers: 1`): con Pía crecen las llamadas a `vehiculos_inventario` y **no** las lecturas de la
  tabla (`select "public"."vehiculos"."id"`) en la página sin filtros, en la búsqueda y en la limpieza (sí y no). Con la dueña pasa lo contrario, y eso prueba que el patrón de la tabla ve su lectura. Sólo con que crezca la
  función no bastaría: la vuelta de arriba también la llama antes de leer la tabla.
- **Quién lee por PostgREST:** la dueña y quien ve «todos». El título de `scripts/guardas/paginas.test.ts:195` («el listado y el inventario se leen por PostgREST») no se toca: su aserción (`max_rows` ≥ 101) sigue valiendo para ellos.
- **«Sin assert, 4-23» de `medir-vehiculos-lectura.sql:298-302` queda.** Mide a la chica por la tabla, que la pantalla ya no usa para ella; su assert por la función está en `medir-vehiculos-inventario.sql`. Cambiar el texto obligaba a
  `db:medir:volumen` en un paso sin base.
- **Una guarda tocada:** la entrada de `vehiculos_inventario` en `scripts/guardas/paginas-en-la-base.ts` (`pideElCodigo` = `MAXIMO_DE_PAGINA_DE_VEHICULOS`, el defecto de la base, 100). Sin ella cae `paginas.test.ts`.

## 2026-11-05 — Paso 4.16-3: la siembra de cotizaciones y las mediciones que vacían la tabla en su transacción

- **La siembra va en un archivo aparte**, `supabase/tests/volumen/sembrar-cotizaciones.sql`, y no dentro de `sembrar.sql` como decía la fila: `sembrar.sql` medía 258 líneas y
  con ≈ 180 más pasaba de 300. La corre el mismo `pnpm db:sembrar-volumen`, en la misma corrida de `psql`, y `cotizaciones` entra al `vacuum (analyze)` de después. No usa las
  temporales de `sembrar.sql` (`volumen_etiquetas` y `volumen_origenes` siguen vivas en la sesión): las suyas llevan el prefijo `volumen_cot_` y son `on commit drop`.
- **50.000 fijas**, sea cual sea `--leads`, como los vehículos: el reparto por persona de los leads (la dueña 2/5, Ana 1/25), 90 % con un lead de quien la creó, 70 % con un
  vehículo de su origen, 2 % finales (una por vehículo) y 2 % en la papelera. Sin `random()`: se revuelve con `(g * 7919) % 50000`, una biyección.
  - **La papelera con lote** (`tipo` cotizaciones, ≤ 200 del mismo creador), como lo deja `papelera_enviar()`: el 4.17 no se encuentra con un estado que la app no produce. Las
    mediciones propias del listado sí siembran papelera sin lote (`medir-cotizaciones-listado.sql`): ahí sólo importa `eliminado_en`.
  - **Sin cadenas, revisiones, comentarios ni adjuntos**: versión 1 sin padre. Si el 4.16-4 o el 4.17 los necesitan, los suman ellos.
  - Las fechas son relativas a `now()` y no miran la del vehículo: una cotización puede ser más vieja que su vehículo. Ninguna medición lo lee; ninguna fecha queda en el futuro
    (`medir-panel-ultima-cotizacion.sql` cotiza sus bloques en `now() + 1 h`).
- **Las cuatro mediciones que sembraban sus propias cotizaciones** (lectura, listado, historial del vehículo y evaluar) se negaban con «la base ya trae cotizaciones». Ahora,
  dentro de su `begin`, hacen `truncate public.cotizaciones cascade` y el `rollback` del final devuelve la siembra entera (comprobado: 50.000 tras `db:medir:volumen`).
  - **Por qué `truncate` y no `delete`:** un `delete` revertido deja las entradas en los índices y cambia los bloques que se miden. Con el truncate, lo insertado va a una relación
    nueva que el `rollback` descarta: tampoco quedan las filas muertas de la propia medición (los 398 MB del 4.16-1).
  - **Por qué no asertar «sembradas + propias»:** obligaba a volver a medir los topes y los conteos exactos de las cuatro.
  - **Por qué `cascade`:** arrastra las diez tablas que apuntan a `cotizaciones` (comprobantes, adjuntos, comentarios, favoritos, reportes, revisiones, mensajes, tareas y
    menciones). Ninguna de las cuatro lee lo que había en ellas; `medir-cotizaciones-lectura.sql` inserta y lee sus propias revisiones, después del truncate. El truncate toma
    ACCESS EXCLUSIVE sobre las diez mientras dura la medición: es una sola sesión y ningún cron las toca.
  - **La guarda:** si el bloque no corre dentro de una transacción (`transaction_timestamp() = statement_timestamp()`), cae sin vaciar nada. En autocommit, el truncate borraría
    la siembra.
- **La fila de `medir-escala.sql`** mide `cotizaciones_listado()` con el máximo, con los topes del 4.16-1 (la dueña 10 ms, Ana 50). La forma la sigue asertando
  `medir-cotizaciones-listado.sql`; acá se mide el tiempo con datos repartidos como en uso. La página 1, la profunda y «mías» tienen que volver llenas, porque una vacía pasaría
  cualquier tope. Los finales y el origen de Ana no, porque la siembra no se los garantiza.
- **`origenes_resumen()` cuenta exacto** las cotizaciones por origen, y Configuración › Orígenes dibuja ese total. Con la siembra, 7,5 ms (tope 100). No se arregla acá: **4-79**.

## 2026-11-05 — Paso 4.16-4a: la pantalla `/cotizaciones`, «Nueva cotización» y el camino desde el historial del vehículo

- **El 4.16-4 se parte en dos.** El 4.16-4a es el listado (servidor, tres módulos, Nivel 2 por la navegación y volumen); el 4.16-4b, el resumen `?cotizacion=` (un panel
  diferido con su propia lectura desde el navegador, la vuelta del foco y su URL; Nivel 1, interfaz, sin base). Juntos no caben en tres commits de código. **Mientras llega el
  4.16-4b la fila no abre nada**: no tiene `alAbrir` (el patrón de lista lo admite) y el enlace «N.º n» es la parada de Tab y lleva a `/cotizaciones/[id]`.
- **Los nombres se leen sobre la página, no en la lectura.** `cotizaciones_listado()` no cambia (no hay migración). `page.tsx` compone tres lecturas por clave primaria, una vez por
  página y en paralelo: `leerNombresDeLeads` (`leads_vista_por_ids`, sólo con `leads.ver`), `leerTitulosDeVehiculos` (sin los de la papelera, como `leerVehiculo`) y
  `leerAutoresDeCotizaciones` (`perfiles`). Cada módulo lee lo suyo y `cotizaciones` no importa `leads` ni `vehiculos`. Sin medición SQL nueva: a lo sumo 100 ids por clave
  primaria, como el autor embebido del historial («límite sin assert», `docs/RENDIMIENTO.md`).
- **«—» sin distinguir.** Una cotización sin lead, o con uno que quien mira no ve, dibuja lo mismo (como `/cotizaciones/[id]`): distinguirlos delataría que el lead existe.
- **«Cuáles» es una elección** («Todas» y «Mías») y no un booleano: la base no tiene «las que no creé yo». «Origen» sólo aparece con dos o más orígenes donde elegir.
- **`?vehiculo=` no es del esquema de filtros**: ni chip ni lo borra «Limpiar»; un valor que no es guid se ignora. Es el camino a lo antiguo del tope de 500 del historial del
  vehículo («Ver todas en Cotizaciones», en la misma pestaña: lo tipeado vuelve con el borrador). Un cursor sin filas con el origen puesto dice «Nada coincide con los
  filtros» (como `/vehiculos`: un filtro activo manda sobre «No hay más en esta página»).
- **«Nueva cotización» y la tecla `N`:** el origen del filtro si ahí se cotiza (`origenParaNueva()`); si no, el primero donde sí; sin ninguno, el botón no está. `N` hace lo mismo
  mientras el botón esté; sin él, cae al «Nuevo lead» del shell.
- **Presupuestos medidos** (más un 5 %, hacia arriba a la decena en el JS): JS en frío de `/cotizaciones` 358,4 KB → **380**; con 100 filas y las 50.000 de la siembra, 37,5 KB
  comprimidos → **39.500 B** y 2.024 nodos → **2.130** (previos 40.000 y 3.000). `/cotizaciones/nuevo` 456,7 de 460 y `/cotizaciones/[id]` 442,8 de 448: el enlace del tope no los
  movió casi nada (0,1 KB).
- **El completo corrió con la cuenta en 1 de 3.** Por la cuenta no tocaba, pero `src/app/(app)/_shell/navegacion.ts` es el disparador «layout» del Nivel 2 y `navegacion.test.ts`
  ata `disponible: true` al `page.tsx` nuevo: no se puede separar. La cuenta vuelve a 0 de 3.

## 2026-11-05 — Paso 4.16-4b: el resumen `?cotizacion=` del listado de cotizaciones

- **La que no está en la página la lee el servidor, no el navegador** (corrige lo que anticipó «Paso 4.16-4a»). «Vencida» sólo la calcula la base, dentro de `cotizaciones_listado()`,
  y los nombres del cliente, el vehículo y el autor son de tres módulos que `cotizaciones` no importa: una lectura suelta desde el navegador no los traería. `page.tsx` la lee con
  `leerUnaDelListado(id)`: su fila por clave primaria (con la RLS de quien mira; sin fila, «no disponible» y nada más) y `cotizaciones_listado()` de tamaño `UNA` con el cursor
  `(creado_en, id + 1)`: entre `id` e `id + 1` no cabe ningún uuid, así que la primera fila estrictamente anterior es ella o nada. Se descartó una RPC nueva (una migración y otro paso
  por una fila). Sus nombres se leen aparte (sólo ella): una página de 100 con 100 clientes distintos ya llena el tope de ids de cada lectura de nombres.
- **Sólo el origen va en esa búsqueda**, no `?clase=` ni `?cuales=mias`: una cotización que el filtro deja afuera se abre igual (es la del enlace; el filtro acota la lista, no lo
  que se ve). Sus dos pedidos van en serie tras la página: la espera se paga sólo cuando no está en ella.
- **El id se lee en un solo lugar**: `idDelResumen(texto)` (minúsculas o `null`); la página, el hook y las comparaciones lo usan. Un enlace con mayúsculas abre la misma cotización.
- **Si la lectura falla, el listado no cae**: llega `estado: 'error'` y el resumen ofrece «Reintentar»; la lectura de la página sigue subiendo al `error.tsx`.
- **El pedido único por id** (`usePedidoAlServidor`): si la URL trae una que ni la página ni el servidor trajeron, el resumen pide la página una vez (`router.refresh()`) y, si vuelve
  sin ella, dice «error» con «Reintentar», nunca un esqueleto para siempre. Cuesta lo que una carga del listado: una vez por id y una por cada clic en «Reintentar».
- **El número abre el resumen y la página va por «Abrir cotización»** (patrón de lista, `docs/UX.md`). Se pierde el Ctrl/Cmd+clic del número para abrirla en otra pestaña; el del
  botón «Abrir cotización» sigue. Microdecisión de qué muestra el resumen: lo que ya trae la fila, de sólo lectura, sin «⋯» (las acciones son de los pasos 4.2x).
- **Sin releer al volver a la pestaña** (el resumen de vehículos sí lo hace): es de sólo lectura y «Abrir cotización» lee de nuevo y dice si ya no está.
- **Carpetas**: el resumen vive en `features/listado/{hooks,components}/` (como da `docs/plan.yaml`); `entities/` e `infra/` dejan los archivos sueltos, como los del 4.16-1 a 4a, hasta
  que el 4.15-4 cree `entities/listado/` e `infra/listado/` y los mueva.
- **El 4.15-4 sigue pendiente y el 4.16 se hizo sin él**, en el orden de `docs/PLAN.md` (`docs/plan.yaml` lo pone de dependencia del 4.16): ningún registro dice por qué. Lo ordena la persona.

## 2026-11-05 — Paso 4.17 (1 de 5): las oportunidades de un lead por cursor, en la base

- **El 4.17 se parte en 5**, porque la fila junta una base, tres pantallas en dos módulos y un panel con su propio camino: **4.17-1** la lectura de 5a-12 en la base (este; Nivel 2, porque crea
  índices); **4.17-2** el «Ver más» de «Oportunidades», que cierra 5a-12; **4.17-3** la pestaña «Cotizaciones» de `/vehiculos/[id]`; **4.17-4** la sección «Cotizaciones» de `/leads/[id]`
  (se parte en 4a y 4b si el camino tras 500 pide un filtro `?lead=` en `cotizaciones_listado()`); **4.17-5** «Ir a una fecha» de «Revisiones» (**4-75**). Los prompts de la fila pasan de 2 a 6.
- **La lectura va por tres rutas y dos índices parciales**, no por un `order by` sobre las dos clases juntas: el orden es «las abiertas primero» y, en cada grupo, `ultima_actividad_en desc, id desc`,
  y `enum_eq` no es leakproof, así que bajo la RLS una comparación de enum no es condición de índice (medido en el 4.16-1). Cada ruta lleva `estado = 'abierta'` o `estado <> 'abierta'` con el literal,
  y su parcial `(lead_id, usuario_id, ultima_actividad_en desc, id desc)`. Completar la página con las cerradas es leerlas desde la primera con `limit v_n + 1 - k`; con el cursor en una cerrada, sólo
  la ruta de las cerradas. `oportunidades_lead_id_idx` se queda (la FK). Sin `usuario_id` en el índice la ruta descarta las filas de otras personas (mutación M8: 21 descartadas por ruta en el Assert 1).
- **El cursor es una tripleta** (`p_antes_abierta`, `p_antes_en`, `p_antes_id`), la última fila de la página anterior. Sin `p_antes_en` se lee la primera página aunque lleguen los otros dos; con él y
  sin uno de los otros, `22023` con `hint = 'cursor'`. `ultima_actividad_en` viaja con sus microsegundos, así que el ida y vuelta es exacto.
- **Valor por defecto 20, máximo 100** (`_acotar_pagina(p_tamano, 20, 100)`): el 20 es `TAMANO_DE_VER_MAS`, el 100 es el tope de hoy. La sección pide `TOPE_DE_OPORTUNIDADES_DEL_LEAD` (100) sin cursor hasta el
  4.17-2, así que la pantalla no cambia. El registro de páginas sólo compara contra 20; el 100 lo protege T4 de `lead-oportunidades-pagina.sql` (`p_tamano` 1000 da 100).
- **El JSON se arma sobre las filas que la ruta ya leyó** (`public.oportunidades[]`, como `lead_seguimientos()`), cruzando sólo `embudos` y `embudos_etapas`: releer `oportunidades` por id pagaría otra pasada
  de la policy. La función ocupa 53 líneas.
- **Sigue de invocadora** y con los mismos privilegios (authenticated y service_role; nada para anon ni PUBLIC). No hubo compuerta `datos`: no cambia policy, RLS, permiso ni `security definer`; la
  mutación M7 (la función como `security definer`) la tiran T5 y T7. Si ninguna forma de invocadora hubiera cumplido los Asserts, el paso se detenía sin pasar a `security definer`.
- **Medición** (`medir-lead-oportunidades.sql`): un lead con 1.000 de Ana (500 y 500) y 1.000 de la dueña, más 20.000 de fondo entre 200 leads (≈ 100 por lead: con miles de leads de una o dos el plan
  genérico estimaría menos de una página y elegiría la FK). Las páginas salen de 500 y de `:ver_mas`. Medido: ≈ 3 ms por página y 4 a 8 bloques de `oportunidades` en todas, la última (50) igual que la
  primera. Tiene un assert propio de que cada ruta devuelve sus `n + 1` filas: una primera versión medía los planes sin la sesión de Ana (la policy vaciaba las rutas) y el Assert 1 pasaba sin medir nada. El Assert 2 mira todos los índices de `oportunidades` menos los dos parciales, la clave primaria incluida: releer las filas por id para armar el JSON (M14) lee 40 bloques de ella en cada página y cae.
- **`db:medir:volumen` completo cayó dos veces en mediciones ajenas** (el crecimiento con N de la «chica» en `medir-vehiculos-inventario.sql` y la razón 0,78 de `medir-importacion-volumen.sql`, con la máquina
  ocupada por otras sesiones) y pasó entero a la tercera y a la cuarta. Ninguna toca oportunidades.

## 2026-11-05 — Paso 4.15-4

Partir `cotizaciones` por área para que los carriles B y C corran en paralelo (`docs/plan.yaml`). Plan auditado dos veces (bloqueó y después dio observaciones, atendidas: `.piloto/planes/4.15-4.respuestas.md`).
Lo pidió la persona después de que el A hiciera el 4.16 y el 4.17-1: se partió el módulo como estaba, con el listado ya hecho.

- **Diez áreas y un núcleo.** Las áreas son las de la fila. Lo demás (la hoja, guardar, encima, revisiones, historial, niveles, el motor, el compilador, los validadores, el diseño, la apertura, la ruta) es
  el **núcleo**: lo que comparten las áreas. No es un área más porque las áreas lo usan (la hoja importa `diseno.ts` y `nodos.ts`; `filtros-del-listado` importa la ruta de la hoja): si lo fuera, la
  primera área que lo usara ya importaría otra. Un área importa lo suyo y el núcleo; el núcleo no importa ningún área; adentro nadie importa las tres entradas de la raíz. El núcleo es del A.
- **Las entradas de cada área van en `areas/<área>/{index,client,composicion}.ts`**, no dentro de las carpetas de las capas: la composición de un área tiene que poder importar `infra/`, y eso sólo lo deja
  boundaries a un `modulo-api` (una carpeta del módulo que no es `features|entities|infra`); en `infra/<área>/` las features no podrían importarla. Las tres de la raíz quedan con un `export *` por el
  núcleo y cada área: un paso nuevo agrega en `areas/<su área>/` y no las toca, y un nombre repetido entre dos áreas es un error de `tsc` (TS2308). `mapa.sh` sigue los `export *` para que el MAPA liste
  la misma API.
- **La guarda va en Vitest** (`scripts/guardas/areas-de-cotizaciones.test.ts`), no en boundaries: sus elementos son carpetas de un tipo, y duplicar las tres capas por área doblaba las políticas; además
  boundaries no mira los tests, la forma de las entradas ni `plan.yaml`. La guarda resuelve cada import contra los archivos que existen, como TypeScript: `./diseno` es `entities/diseno.ts`, del núcleo,
  aunque exista la carpeta del área `entities/diseno/` (la primera versión, sin resolver, los confundía). El lint de `client.ts` vale también para `areas/*/client.ts`; lo de `infra/` que no es `*.client`
  se prohíbe con un `regex` (D4 lo muestra: cae `../../infra/listado/listado` y pasa un `*.client`).
- **La composición del navegador queda en la raíz** (`composicion.client.ts` y sus dos hermanas): es del núcleo y la nombran 18 `vi.mock`. La de un área irá en `areas/<área>/composicion.client.ts`,
  sin que ningún barril la reexporte.
- **Sembrar el coordinador queda fuera**: su estado vive fuera del repo y `integrado 4.15-4` sólo es verdad después de integrar en `main`. Aunque `auto-carriles.sh` abra B y C al integrar este paso,
  no reciben trabajo: el 4.20 y el 4.24 dependen del 4.15-5 y del 4.15-6 (`coordinador siguiente b|c` responde «esperar»).
- **Del plan** (contestadas el 2026-11-05, las tres con la recomendada): **P1** la guarda de carriles (`carriles.mjs`, la Fase 7) y `docs/ORCA.md` se ponen al día en un paso propio, el **4.15-5**
  (4-84). **P2** el compilador y los validadores (37 archivos de `entities/`) siguen en el núcleo y los posee el B uno por uno en su `dueno_de` y en los `modulos` del 4.20 al 4.22: no se mueven porque
  los importan otros archivos del núcleo y `validar-diseno*` importa `validarFormula`. La guarda hace caer un archivo nuevo de esas familias que el B no posea. **P3** los huecos del núcleo que B y C
  necesitan (el ⚙ de la hoja, la cabecera de una guardada, el enlace a la papelera, Empresa, la sección Cotización) los abre el A en el **4.15-6**, sin cambio visible, antes del 4.17-2.

## 2026-11-05 — Paso 4.15-5

- **Las reglas salen del plan de la base, no del PR** (`git show <base>:docs/plan.yaml`): un PR no se da permisos a sí mismo. Sin ese archivo en la base, todo PR cae (falla cerrada). Un cambio a `plan.yaml` rige desde el PR siguiente.
- **El job corre la guarda de la base** (`git worktree add --detach .guarda-base "$BASE_PR"`), con `preparar` para tener `yaml`: un PR que edite `carriles.mjs` se juzga con la guarda que ya estaba. Lo que queda (un PR que edita el job, porque GitHub toma el `ci.yml` del PR) va a 4-88, de la persona.
- **El dominio de migración de un área es su nombre y el prefijo de sus tablas** (`formula_…`, `papelera_…`), sin `cotizaciones_`: `cotizacion_…` y `cotizaciones_…` son del núcleo y las crea el A. Está en `.claude/rules/migraciones.md`.
- **P1 = sumar sólo archivos del compilador** (contestada el 2026-11-05, la recomendada): en `plan.yaml` un carril que no es base suma a su `dueno_de` lo que crea de las familias del compilador, y nada más, tampoco los `pasos`: su `riesgo` decide si el coordinador integra solo.
- **P2 = la guarda bloquea** (la recomendada): un carril que no es base sólo toca lo suyo, `docs/` y `compartido`; ahí agrega y edita pero no borra (el B edita los tests de su compilador). La consecuencia, 4-87: el A da `cotizaciones.papelera.purgar` antes del 4.24.
- **Las familias del compilador pasaron a un `.mjs`** (`familias-del-compilador.mjs`) porque la guarda corre con `node` y no importa `.ts`; `areas-de-cotizaciones-plan.ts` las reexporta: una sola fuente.

## 2026-11-05 — Paso 4.15-6a

- **El 4.15-6 se parte en tres** (6a la hoja, 6b la guardada y el listado, 6c Configuración y Empresa): con un commit por intención eran 8 y no caben en 3 de código. Cada uno se cierra solo, en cadena, y el 4.17, el 4.20 y el 4.24 dependen del 6c. La conducta C1–C20 del plan (`.piloto/planes/4.15-6.md`) es el contrato de los tres.
- **P1 = 4-87 es el 4.15-7** (la recomendada): la clave `cotizaciones.papelera.purgar` es un permiso nuevo y va en un paso propio del A, con la compuerta `datos` y rigor máximo, antes del 4.24; meterla en el 4.15-6 lo volvería de otra capa (la base), y dársela al C abriría `permisos.ts` y `seed.sql` a un carril que no es base.
- **Un hueco vacío es un objeto sin componentes** (`HuecosDeLaHoja = { Proveedor?, EnlaceSinPublicar? }`), no un componente que da `null`: la página no crea ningún elemento para él y el DOM de hoy no cambia; unas pruebas comparan el `innerHTML` con y sin hueco.
- **Las segundas pantallas van en `pantallas/<área>-<pantalla>.ts`**, no en `pantallas/<área>.ts`: una pantalla paga lo que reexporta su archivo, y `/cotizaciones/nuevo` no debe cargar la papelera del 4.24. El B posee `pantallas/formula-hoja.ts` en `plan.yaml`.
- **El ⚙ lo enciende un proveedor y lo decide la base** (`ajustes` por celda): la hoja no decide permisos. Sin proveedor no se llama `usePanelPorUrl('celda', …)`: `<LugaresDeLaHoja>` monta `<LugaresConAjuste>` sólo si `ContextoDelAjuste` no es nulo, para que no se registre la vuelta del foco de `ajuste`.
- **El lugar del ajuste va en dos sitios, como la ayuda:** con las secciones principales en la hoja y, para las avanzadas, dentro del `<Modal>` «Avanzado», donde el panel queda encima del modal y dentro de su foco atrapado. `?ajuste=celda&nodo=<avanzada>` sin `?panel=avanzado` no abre nada.
- **La URL `?ajuste=celda&nodo=` comparte `nodo` con la ayuda:** las dos son paneles, y con uno abierto no se alcanza el ⚙ ni la ayuda de otra celda.
- **`ConProveedorDeLaHoja`** (`src/app/(app)/cotizaciones/`) une el `Proveedor` del área con las dos páginas de la hoja, para no repetir el condicional y no subir la complejidad de `HojaDelOrigen`.
- **`eslint.config.mjs` entra al `dueno_de` del carril A** (base): el 4.15-6c amplía el aviso de `client.ts` y el coordinador pedía un dueño.
- **El JS no pasó de 1 KB:** `/cotizaciones/nuevo` 456,8 (456,7 antes), así que no se anota el chunk; `/cotizaciones/[id]` midió 435,6, siete KB menos que la última cifra (442,8), sin causa atribuida.

## 2026-11-06 — Paso 4.15-6b

- **El orden de las acciones de una guardada es final, comprobantes, comentarios y papelera:** la destructiva, «Enviar a la papelera» con «Deshacer» (4.24), va al final de la fila, como el enlace a la papelera en el inventario; lo fija `HUECOS_DE_LA_GUARDADA` y lo prueba su test por identidad.
- **«Junto a Nueva» va antes de «Nueva cotización»**, como el enlace a la papelera de vehículos antes de «Nuevo»; el vacío de primera vez sigue ofreciendo sólo «Nueva», porque `junto` es de la barra.
- **Los huecos de la guardada se componen en `src/app`** (`[id]/huecos-de-la-guardada.tsx`), en un archivo aparte de la página del listado: `/cotizaciones` sólo importa `papelera-listado.ts` y no paga lo de la guardada. Los tipos salen de las constantes (`typeof`, `ComponentProps`): `src/app` no importa `features/`.
- **Una segunda pantalla de un área del B o del C la registra el carril A en `plan.yaml`:** un carril que no es base sólo suma ahí archivos del compilador (P1 del 4.15-5), así que el mensaje de la guarda dice «la suma el carril base» y no le pide al C que edite el plan. La guarda mira el árbol (`rutasDelModulo`) y reconoce la pantalla con `claseDe()`, no por prefijo de texto.
- **El test de la guarda se parte por lo que lee:** `areas-de-cotizaciones.test.ts` (la dirección, las entradas, T11) queda en 230 líneas; el plan (T10, T12, T14) va a `areas-de-cotizaciones-plan.test.ts`, y el recorrido del árbol real a `areas-de-cotizaciones-arbol.ts`, que importan los dos. Ningún caso cambió de aserción.
- **`comprobantes-empresa.ts` se adelanta en `plan.yaml`,** como `formula-hoja.ts` del B: es la pantalla que el 4.26 crea para su sección de Empresa y el C no puede sumársela. Va aquí y no en el 4.15-6c porque es una segunda pantalla del módulo.
- **El listado se probó montado en jsdom** (`next/navigation` y `./diferidos` simulados, `matchMedia` falso), sin la función pura de respaldo: la barra de acciones y el vacío se comparan con y sin `junto`.
- **4-90, sin arreglar en este paso:** un spec del 4.15-3 pide seis dígitos de microsegundos y falla cuando Postgres escribe un cero final; no es de este paso ni de su archivo, y un cuarto commit de código no cabe.

## 2026-11-06 — Paso 4.15-6c

- **Los permisos de hoy de Cotización se fijan en la prueba de la carpeta del B** (`cotizacion/seccion.test.ts`), no en `secciones.test.ts`, que es del A: el 4.20 suma `cotizaciones.configurar` y corrige su prueba sin salir de su carpeta; el hub sólo fija la identidad y el orden de las seis claves.
- **Las pestañas de Empresa llevan sus permisos y la de un área va después de las tres de hoy.** `PERMISOS_DE_EMPRESA` es la unión de los de todas sus pestañas y es lo que abre Empresa en el hub: así `secciones.test.ts` hace caer una pestaña de área que pida una clave que no está en `NAVEGACION` (4-89). Las pruebas del A (`pestanas.test.ts`, `secciones.test.ts`) nunca se arman sobre la lista real de pestañas de un área: usan `PESTANAS_DE_LA_EMPRESA` más una pestaña de prueba, y de la lista real sólo lo que no cambia con lo que sume el C. Si no, el PR del C caería sin poder arreglarlo.
- **La barra arma sus parsers con las claves que recibe** (`parseAsStringLiteral(claves).withDefault(pestanas[0].clave)`) y no con `pestanaDe` y `parseAsString`, como proponía el plan madre: eso escribiría `?seccion=empresa` al elegir la primera pestaña y la URL cambiaría. Con nuqs 2, elegir la primera la quita.
- **`AlMenosUna<T>` y `alMenosUna()`:** una tupla `readonly [T, ...T[]]` para que `pestanas[0]` sea un `T` bajo `noUncheckedIndexedAccess`, sin `!` ni clave por defecto; `pestanaDe()` y la barra la piden. `ReadonlyArray.map` pierde la tupla, así que la página la reconstruye con la primera y el resto.
- **Una pestaña de un área guarda su estado de URL sólo en `?panel=`** y su sección recibe `parametros`; un parámetro nuevo que la barra deba limpiar se le pide al A (4-89).
- **`client.ts` puede reexportar una Server Action `'use server'` y el tipo de entrada de su esquema, sólo en la raíz de un módulo** (el de un área no cambia). El bundler la cambia por una referencia y `composicion` no viaja al navegador (ya lo hacía `use-tipos-cambio.ts`); la condición es que la action exija su permiso en el servidor, porque salir por `client.ts` no es un permiso. `empresa/client.ts` la usa para el ⚙ de un tipo de cambio (4.20); nadie lo usa todavía.
- **`EntradaDeGuardarTipoCambio` se creó** (`z.input<typeof esquemaGuardarTipoCambio>`): el plan madre lo daba por exportado y no lo estaba.

## 2026-11-06 — Paso 4.15-7

- **P1–P4 con la recomendada:** la clave `cotizaciones.papelera.purgar` gobierna ya la papelera de cotizaciones (`papelera_listar`, `papelera_restaurar`, `papelera_purgar` y la rama de cotizaciones de la policy `lotes_papelera: leer`), la reciben el dueño y todo rol que tenía `vehiculos.papelera.purgar`, se llama «Vaciar la papelera de cotizaciones» (orden 245, tras «Editar cotizaciones») con la de vehículos renombrada a «Vaciar la papelera de vehículos», y es global, como las otras dos de purgar.
- **La concesión va a todo rol con alguna concesión de la de vehículos** (en cualquier origen o alcance), con «todos» y sin origen: `tiene_permiso(clave)` sin origen ya daba verdadero con cualquiera de ellas, así que es la única forma de que nadie gane ni pierda nada al aplicar la migración. Un `notice` dice qué roles la recibieron (en la nube, al aplicarla). Desde acá se separan: quitarle una a un rol no le quita la otra. Esto completa «Vitrina y papelera no suman permisos» (2026-10-13): la de cotizaciones ya no sale de `vehiculos.papelera.purgar`.
- **La policy conserva su forma** (un `tiene_permiso` envuelto con `case` sobre `tipo`) y pasa a tres ramas explícitas sin `else`: un tipo nuevo de lote no hereda la clave de nadie.
- **Las tres funciones se recrean desde la base con la clave cambiada**, y el `revoke`/`grant` se repite explícito aunque `create or replace` conserve los privilegios (redundante a propósito). La mutación que lo vigila concede `execute` a `anon` o a PUBLIC: quitar el `revoke` no probaría nada.
- **Dos huecos para que el 4.24 no toque archivos del A** (el `terminado` del 4.15-7): `db:probar` corre, después de su lista fija, todo `.sql` de `supabase/tests/areas/**` en orden alfabético de la ruta (`pruebasEnOrden()`, `scripts/lib/pruebas-de-la-base.mjs`; `SOLO=areas/<área>/x.sql`), y `RPC_PAGINADAS` es `RPC_PAGINADAS_DEL_NUCLEO` más `RPC_PAGINADAS_DE_LA_PAPELERA` (`paginas-en-la-base-papelera.ts`, del C). Sirven también al B; los de otras áreas, cuando los pidan (4-91).
- **La prueba de la concesión vuelve a ejecutar la migración** sobre la base sembrada más roles propios, como la nube: `DATOS_DE_PRUEBA` acepta `{ ruta, texto: true }` y le pasa el archivo como texto. Esa entrada queda atada al nombre de la migración (con su hora UTC): si se recrea al integrar (`migraciones.md`), `db:probar` cae al leerla y se corrige la ruta.

## 2026-11-06 — Paso 4.17 (2 de 5): «Ver más» de las oportunidades de la ficha

- **P1–P3, contestadas con la recomendada.** P1: el camino a lo antiguo tras 500 es «Buscarlas en tu embudo» (el kanban del embudo de la última cargada, `?q=` el nombre del lead), sin lectura nueva; sus límites quedan dichos: la búsqueda
  es por parte del nombre y puede traer leads con un nombre parecido, lleva sólo al embudo de la última cargada y cada columna del kanban corta en 500 (`TOPE_DE_COLUMNA`). P2: «Ver todas» (`?todas=1`) desaparece; lo cargado es una
  posición y no va a la URL, como en la línea de tiempo, así que recargar y «atrás» vuelven a 10. P3: recargar con `?panel=…&oportunidad=` de una llegada por «Ver más» abre sólo si está entre las 10 cargadas (la regla de hoy).
- **El servidor lee 10 y el navegador 20.** El 10 es `TAMANOS_DE_PAGINA[0]` (no un literal: `escala.md` pide que el tamaño salga de `paginacion.ts`) y una prueba fija que vale 10. Lo que no se ve no viaja con el documento: la
  sección aporta lo mismo con 10 y con 1.000 (62,7 y 61,7 KB).
- **Lo que vuelve de una action se pone en la ventana, sin `router.refresh()`.** Ese refresco relee la primera página y devolvería lo cargado a 10. El orden de la ventana es el de la base y compara el instante con sus
  microsegundos (los milisegundos de `Date.parse` y los dígitos 4.º a 6.º de la fracción), porque la base recorta los ceros finales (4-90) y `Date.parse` solo empataría dos sellos del mismo milisegundo.
- **Una eliminada no vuelve con una página en camino**: el hook recuerda las quitadas que no se restauraron (`quitadas`) y `sumarPaginaDeOportunidades()` las descarta. Se resta sólo lo quitado, no todo lo que estaba al
  pedir (como hace `sumarLoNuevo` de seguimientos): una oportunidad que se movió más atrás mientras la página venía puede estar en esa página y no tiene que perderse. Una página pedida antes de que el servidor cambiara lo
  cargado se descarta por la firma.
- **El paso vale como pantalla aunque toque `entities/` e `infra/*.client.ts`.** No hay datos nuevos (la RPC, sus grants y su RLS son los del 4.17-1), ni permisos, ni `src/shared/lib`, ni migración; lo de `entities/` es el
  orden y la ventana de una lista que ya existía y lo de `infra/` lee la misma RPC desde el navegador. Por eso, sin mutaciones ni informe auditado.
- **`@sin-celular-archivo` se quitó y E4 no lleva `@sin-celular`.** El motivo del archivo («su JS del celular lo ejecuta otra prueba que se queda») dejó de ser cierto: el JS de «Ver más» lo ejecutan sólo estas pruebas. El
  spec dejó de ser `serial` (cada prueba crea su lead). `comparar-anchos.mjs` da 4 IGUAL, pero E4 tiene JS de celular que nadie más ejecuta (`huella.txt`): corre también en el celular (≈ 25 s).

## 2026-11-06 — Paso 4.17 (3 de 5): la pestaña «Cotizaciones» de la ficha del vehículo

- **P1, contestada con la recomendada: quién la ve.** Quien tiene `cotizaciones.ver` (con cualquier alcance) en el origen del vehículo, con `puede(permisos, 'cotizaciones.ver', origen.id)`; sin la clave la pestaña no aparece y `?seccion=cotizaciones`
  abre «Ficha». Coincide con la RLS: la policy «cotizaciones: leer» va por el origen de la cotización y una cotización con vehículo es siempre del origen de ese vehículo (`vehiculo_de_otro_origen`). Las otras dos (todo el que ve el vehículo;
  sólo alcance «todos») se descartaron: la primera dibuja una pestaña vacía para siempre, contra UX.md («ninguna pestaña se dibuja vacía»); la segunda esconde las propias a quien ve «propios».
- **Las pestañas visibles dependen del permiso.** `pestanasVisibles({ cotizaciones })` reemplaza la constante `DISPONIBLES` de la barra: la página las calcula en el servidor y se las pasa como `{ clave, titulo }[]`, que es serializable;
  `pestanaDeVehiculo(valor, visibles)` y `hayBarraDePestanas(visibles)` las reciben.
- **Se lee desde el navegador al montarse, sin lectura del servidor.** Es la lectura del historial del 4.14-2b (`leerHistorialDelVehiculo()`, de a 21 por cursor): la ficha no paga nada hasta abrir la pestaña. `<CotizacionesDelVehiculo>` la pide
  una vez por montaje y el único guardián de lo viejo es el `ultimo` de `usePaginasDelHistorial`: con el doble montaje de `StrictMode` el segundo pedido deja viejo al primero (llega una página, no dos; un `useRef` de «ya leí» dejaría la pestaña en
  «Cargando…»). La lectura al montar usa `useEffectEvent` y no desactiva ninguna regla de lint.
- **El reparto del historial.** La paginación (primera página, «Ver más», «Reintentar» y el tope) salió de `useHistorialDelVehiculo` a `usePaginasDelHistorial`, y la lista con su pie y su esqueleto a `<ListaDelHistorial etiqueta>`, que el panel de la hoja
  y la pestaña comparten; el panel queda igual (`historial-del-vehiculo.test.tsx` pasa sin editarlo). El nombre de la lista es una prop: «Historial de cotizaciones» en el panel y «Cotizaciones del vehículo» en la pestaña.
- **La cáscara diferida de la pestaña va en su propio `diferidos.tsx`** (`features/historial/components/pestana/`), no en el del historial: `pantallas/cotizar.ts` reexporta ése y `/cotizaciones/nuevo` va en 456,9 de 460 KB (4-73). Un `diferido()` de nivel
  superior es un efecto de módulo y no se descarta con seguridad aunque la pantalla no lo reexporte. `/cotizaciones/nuevo` pasó de 456,8 a 456,9 KB por el reparto del historial (commit 1), no por la pestaña.
- **La fila es la del historial** (número, fecha relativa, autor y clase) y lo demás vive en `/cotizaciones?vehiculo=`, adonde lleva el tope («Ver todas en Cotizaciones»): el camino a lo antiguo. La lista es una `<ul>` compacta de enlaces y no
  `@/shared/ui/lista`: `.claude/rules/ui.md` › «Listas» pide el patrón para registros con resumen por clic en la fila y «⋯»; aquí cada fila es un enlace a su página, sin resumen ni «⋯», y la guarda `listas-con-patron` sólo vigila tablas.
- **Los topes de nodos.** Con 20 filas, 61 nodos (tope 65, el del panel); con 500, 1.501 (3 por fila + 1) y el tope queda en lo medido más un 5 %: 1.576 (el previo de 1.600 alcanzó). La respuesta de la 25.ª página pesa lo mismo que la 1.ª.
- **Sin «Cotizar» en la ficha.** No está en la fila del paso y suma un camino a un flujo: se anota como 4-94 y lo decide la persona.
- **El paso vale como pantalla.** Sin datos nuevos, permisos nuevos ni migración (la lectura, su índice y su RLS son los del 4.14-2b): sin mutaciones ni informe auditado.

## 2026-11-06 — Paso 4.17-4a: el listado de cotizaciones por lead, en la base

- **El 4.17-4 se partió en 4a (base) y 4b (pantalla).** P1, contestada con la recomendada: el camino tras 500 de la sección «Cotizaciones» de `/leads/[id]` es «Ver todas en Cotizaciones» a
  `/cotizaciones?lead=<id>`, como el del vehículo con `?vehiculo=`. `cotizaciones_listado()` no tenía filtro por lead, y la fila manda partir cuando lo pide: la base y la pantalla se verifican distinto
  (`db:probar`, mutaciones y mediciones, contra lint, e2e y móvil). Las otras dos opciones («Ir a una fecha» dentro de la sección, sin base; o sin camino, sólo el aviso y un abierto) se descartaron: la primera
  llega distinto que el vehículo y el componente de fecha todavía no existe (lo hace el 4.17-5 para «Revisiones»); la segunda va contra `escala.md`.
- **P2, contestada con la recomendada (la usa el 4b):** la sección la ve quien tiene `cotizaciones.ver` con cualquier alcance en **algún** origen, con la forma de «Vehículos» de la ficha, que pide `vehiculos.ver` en algún
  origen. Un lead no tiene un solo origen de cotizaciones: la RLS va por el origen de cada una y recorta las filas; si no llega ninguna, el estado vacío. Se descartaron pedir además que el lead esté en la cartera (quien ve
  «todos» no vería ahí lo que sí ve en `/cotizaciones`) y mostrarla a todo el que ve el lead (sin la clave, una sección vacía para siempre, contra UX.md).
- **`p_lead` va al final de la firma, con `drop` de la de 8 y `create` de la de 9**, como el 4.17-1 con `lead_oportunidades()`: un `create or replace` con otro argumento deja dos sobrecargas (L1 y el cinturón de
  `auditoria-leads.sql` lo hacen caer, M8). Al final, para que las llamadas posicionales de 8 sigan valiendo (`infra/listado/listado.ts` no cambia: el argumento es opcional).
- **Con el lead, una sola ruta, y el vehículo es un filtro sobre ella.** `cotizaciones_lead_creado_idx` con la RLS, en los tres bloques; todas las demás banderas se apagan, también la de la cartera (`mis_leads()` no se llama)
  y la del vehículo. Si llegan lead y vehículo, la respuesta es la intersección y el costo queda acotado por las cotizaciones del lead, no por N (`(p_vehiculo is null or c.vehiculo_id = p_vehiculo)` nunca es condición de índice).
  El 4b puede no ofrecer la combinación, pero la URL la admite. M6 (el vehículo antes que el lead) y M7 (el lead como filtro de las rutas de siempre) caen en L9 y en la medición: M7 lee `cotizaciones_listado_idx` y crece de 271 a 42.006 bloques.
- **El lead en la papelera sale con el filtro igual que sin él.** El plan decía que un lead en la papelera daba una página vacía; la regla que se prueba es la otra mitad de su C4: lo que devuelve con `p_lead` es lo de sin
  él filtrado a `lead_id = p_lead`. La policy de `cotizaciones` no mira la papelera del lead (Ana ve `b_lead_borrado` sin filtro), y esconderlo sólo con el filtro pediría releer `leads` bajo su RLS. `cv_filtros` lo
  fija con «el lead en la papelera».
- **El terreno de la medición suma un lead ajeno**: las 5.005 del vehículo muy cotizado pasan a ser de un uuid sin fila en `leads` (como `_v`: la FK no se mira al sembrar), fijo entre los dos volúmenes y fuera de toda
  cartera, así que ninguna ruta de antes cambia de filas. Ana con ese lead paga un `en_cartera()` por cada una de las 5.005 (51 ms con 250.000, tope 100, como el vehículo): crece con las del lead, no con N.
- **La lectura de la sección (la del 4b, por PostgREST) se mide en `medir-cotizaciones-listado.sql`** y no en un archivo nuevo: usa el mismo terreno, las mismas familias de asserts y el mismo runner (un archivo aparte copiaría
  ≈ 150 líneas de siembra). Su SQL es literal y se planea en cada corrida: lee al planear la metapágina de un índice vacío (`cotizaciones_lote_papelera_idx`, vacío tras el truncate; un btree vacío no guarda su altura), que no
  cuenta como índice leído, igual que en `medir-vehiculos-inventario.sql`. Sólo en la forma `seccion`: el listado va con el plan genérico y no replanea.
- **No hubo compuerta `datos`.** La función sigue invocadora, estable, con `search_path` vacío y los mismos privilegios (`revoke` de public y anon, `grant` a authenticated); no cambia ninguna policy, permiso ni `security definer`.
  Lo único nuevo es que recibe un lead: su firma de 9 queda en `auditoria-leads.sql` con clase `L` (sólo como filtro, la RLS decide), que no pide fila en la matriz. M9 (definer) y M10 (EXECUTE a anon) caen.

## 2026-11-06 — Paso 4.17-4b: la sección «Cotizaciones» de la ficha del lead y `?lead=` en el listado

- **P2 aplicada tal cual: sin origen y sin cartera.** `LoQueVe.cotizaciones = puede(permisos, 'cotizaciones.ver')`, sin origen: con la clave en algún origen y cualquier alcance la sección aparece y la RLS
  recorta las filas (E3b: Ana con «propios» ve la suya sobre un lead que no es de su cartera). Sin la clave en ningún origen no aparece y `?seccion=cotizaciones` abre «Datos» (E3). Ningún `if (rol …)`.
- **Va entre «Oportunidades» y «Portal»** (microdecisión): junto a lo comercial del lead; «Portal», el acceso del cliente, sigue al final.
- **Se lee desde el navegador al abrirla**, sin lectura del servidor: `leerCotizacionesDelLead()` es `leerHistorialDelVehiculo()` con `.eq('lead_id', …)` (un ayudante privado, `leerPaginaPor(columna, id, cursor)`, que
  no cambia la firma de la del vehículo), por `cotizaciones_lead_creado_idx`, ya medida en el 4.17-4a. Con `<Suspense>` no hacía falta: no hay nada del servidor que esperar.
- **`ListaDe = { vehiculo } | { lead }`** reparte la paginación y la lista sin tocar el panel de la hoja ni la pestaña del vehículo: `usePaginasDelHistorial(de)` elige el lector en su rama y
  `<ListaDelHistorial de etiqueta>` enlaza `rutaDelListado(de)` en el tope. Los `vi.mock` de los dos tests del historial sólo definen `leerHistorialDelVehiculo`: el lector del lead se nombra únicamente en su
  rama, al llamarlo, y los dos tests pasan sin editarlos.
- **`diferidos.tsx` propio** (`features/historial/components/lead/`), como el de la pestaña del vehículo: un `diferido()` de nivel superior es un efecto de módulo y en el de la pestaña lo pagaría `/vehiculos/[id]`, y en el
  del historial, `/cotizaciones/nuevo` (4-73). `/cotizaciones/nuevo` quedó en 456,9 KB (igual que en el 4.17-3) y `/cotizaciones` en 359,1.
- **`?lead=` en `/cotizaciones` como `?vehiculo=`**: un guid leído fuera del esquema (ni chip ni lo borra «Limpiar»), que se manda como `p_lead`; «Ver todas» lo quita y conserva lo demás. Con los dos juntos se mandan los dos
  (la intersección, la base de 4.17-4a). `rutaDelListado({ lead, vehiculo })` escribe el lead primero.
- **El aviso y el vacío son dos funciones puras** (`textoDelAviso()`, `textoDelVacio()` en `entities/listado/aviso-del-listado.ts`): «Cotizaciones de <nombre>.», «Cotizaciones de un cliente.» y, con los dos, «Cotizaciones de
  <nombre> sobre <título>.»; el vacío, «Sin cotizaciones de este cliente que puedas ver.» (o «…de este cliente sobre este vehículo…»). El nombre sólo llega con `leads.ver` y si la lectura lo devuelve: un lead que no
  se ve se dice «un cliente», igual que si no existe. `aviso-del-vehiculo.tsx` pasó a `aviso-de-lo-filtrado.tsx` (`<AvisoDeLoFiltrado texto>`).
- **«Nueva cotización» de `/cotizaciones?lead=` no lleva el lead**, como con `?vehiculo=`: llevarlo sumaría un camino a un flujo y «Cotizar» ya está en la cabecera de la ficha del lead.
- **El vacío propio sólo sale sin otros filtros ni cursor**, como el del vehículo: con `?origen=` o `?clase=` puestos, un lead sin cotizaciones dice «Nada coincide» (con «Limpiar»). E8 lo prueba sin `?origen=`.
- **El spec de E3 se partió en dos** (E3 sin clave, E3b con «propios»): `entrar(…, { fresco: true })` dos veces en la misma prueba no encuentra el formulario de ingreso; mismo motivo para E8b en el listado.
- **El paso vale como pantalla** (sin datos, permisos ni migración nuevos: la lectura, su índice y su RLS son del 4.17-4a): sin mutaciones ni informe auditado.

## 2026-11-06 — Paso 4.17-5a: las revisiones de una cotización desde una fecha, en la base (y el rojo del CI de HEAD)

- **El 4.17-5 se parte en 3** (la fila junta capas con verificación distinta): el **5a**, la base (`p_hasta` y su índice; Nivel 2 por el índice, cadena db, `db:medir:volumen`); el **5b**, `<IrAUnaFecha>` a `src/shared/ui`
  (hoy vive en `leads/features/seguimientos`; `cotizaciones` no puede importar `features` de `leads` y copiar el formulario dejaría dos que divergen; Nivel 2, disparador 1, sin cambio visible); el **5c**, la pantalla
  («Ir a una fecha» en «Revisiones», su ventana, su aviso y su e2e con horas distintas; cierra 4-75). Total de la fase: 48 pasos y 101 prompts.
- **P1 (compuerta `datos`, contestada con la recomendada): `p_hasta` dentro de `cotizacion_revisiones()`.** Un solo pedido por salto, con la misma respuesta de siempre. Las otras dos (una función invocadora que da el
  ancla, o la consulta por PostgREST) eran dos pedidos por salto y, la primera, una RPC más que auditar; la segunda pagaba la policy por fila. Una sola firma (`drop` de la de 3 y `create` de la de 4: con `create or replace`
  quedarían dos sobrecargas), definidora, `search_path` vacío, los mismos grants.
- **El ancla por fecha con la página por id, no un cursor `(creado_en, id)`.** `p_hasta` sólo elige desde qué revisión empieza la página (la más nueva de ESA cotización con `creado_en < p_hasta`); de ahí la consulta de
  siempre, por `cotizaciones_revisiones_cotizacion_idx`, y «Ver más» (`p_antes = siguiente`, sin `p_hasta`) no cambia. Con los dos argumentos, gana el menor (`least(p_antes, ancla + 1)`). Un cursor de dos valores habría
  cambiado el contrato de «Ver más» y la pantalla ya hecha. El índice nuevo es `cotizaciones_revisiones_cotizacion_creado_idx (cotizacion_id, creado_en desc, id desc)`.
- **La guarda va primero, con o sin `p_hasta`:** ningún camino lee una revisión antes de `assert_activo()` y `puede_cotizacion(…, 'cotizaciones.ver')`, el ancla incluida; sin ancla, quien ve la cotización recibe la
  respuesta vacía y quien no la ve, el 42501 de una inexistente (F5 y M6 lo prueban). `p_hasta` no abre ni cierra nada que `p_antes` no abriera.
- **C7: `p_hasta` es un instante y es exclusivo.** La base no conoce zonas ni días: «ese día y lo anterior» lo arma la pantalla (5c) con el inicio del día siguiente en la zona de la empresa, como `cursorDeUnaFecha()`.
- **C8 y el abierto 4-95: se supone que el id crece con `creado_en`.** Vale para `cotizacion_guardar` (toma la fila con candado antes de comparar la versión: dos guardados que se cruzan no dejan dos revisiones). No vale para
  los caminos que escriben sin versión (`cotizacion_moderar`, `cotizacion_marcar_final`, que deja dos revisiones de una misma cotización en una transacción y las desempata `id desc`, `papelera_enviar`,
  `papelera_restaurar`, `_vehiculo_a_lote`, `vehiculos_papelera_restaurar`): `creado_en` es el `now()` del inicio de la transacción, así que una que espera el candado puede dejar un id mayor con una hora menor.
  Cota: lo que dura esa transacción hasta su `update`; por PostgREST, el `statement_timeout` de `authenticated` (8 s en la base local, leído con `select rolconfig from pg_roles where rolname = 'authenticated'`; no está en `migrations/`); `_vehiculo_a_lote` también lo llama `limpieza_automatica_correr`, un job
  cuyo rol y `statement_timeout` no se verificaron: ahí la ventana no tiene cota verificada. Qué cuesta: con `p_hasta`, una revisión de esa ventana puede quedar del otro lado del salto; ninguna se pierde ni se repite
  (la página va por id). No se arregla aquí; lo decide la persona si alguna vez se ve (`clock_timestamp()` o el salto por `(creado_en, id)`).
- **La medición, en un archivo propio** (`medir-cotizacion-revisiones-fecha.sql`): `medir-cotizaciones-lectura.sql` ya tiene 348 líneas (4-64) y siembra sus revisiones con `creado_en` al revés del id, que ninguna
  aserción lee. Con cuatro cotizaciones de miles de revisiones y nada más, el plan genérico leía la página por la clave primaria con filtro (estima mal las filas por cotización): la medición suma 20.000 cotizaciones de
  la siembra con una revisión cada una, como en producción, y entonces la página va por `cotizaciones_revisiones_cotizacion_idx` y el salto, por el nuevo. Lo leído es de 10 a 12 bloques a cualquier profundidad y con 500
  o 5.000; su guarda quita el índice y exige que caiga la cota contra N («crece con N»: 679 bloques contra 76), porque la cota contra la profundidad sola pasa sin índice (el top-N lee todo a cualquier profundidad).
- **El rojo del CI de HEAD (run `42220552200`, «Nivel 1»): tres pruebas del tope de 500 agotaban los 5.000 ms** (`historial-del-vehiculo`, `cotizaciones-del-vehiculo` y `cotizaciones-del-lead`, esta última la tercera
  copia del mismo bucle, del 4.17-4b). La causa que el plan suponía (24 rondas de «Ver más» × consultas por rol) era sólo la mitad: con dos respuestas fijas (una primera página de `TOPE − TAMANO_DE_VER_MAS` filas y un
  «Ver más») seguían cayendo a 1,5 s con un solo CPU, porque cada `*ByRole` sobre 480 filas calcula el nombre accesible de cada enlace (0,4 a 0,8 s por consulta). Las pruebas llegan al tope con dos respuestas y
  miran por texto (`getByText`), no por rol; pasan en 0,6 s con el mismo límite. No se sube el timeout ni se quita ninguna prueba; las constantes salen de `paginacion.ts`.

## 2026-11-06 — Paso 4.17-5b: `<IrAUnaFecha>` y `<DesdeUnaFecha>` a `src/shared/ui`

- **`<IrAUnaFecha>` entrega el día, no un instante.** El valor del campo (`YYYY-MM-DD`, en la zona de la empresa) es lo que la persona eligió; el borde exclusivo («ese día y lo anterior» = antes de
  `inicioDelDia(diaSiguiente(dia), { zona })`) es de quien lee: `cursorDeUnaFecha()` en seguimientos y, en el 4.17-5c, el `p_hasta` de las revisiones (C7 del 4.17-5a).
- **`<DesdeUnaFecha>` con props, no con `Seguimientos`:** `dia` (no nulo: quien lo dibuja decide cuándo), `zona`, `ocupado`, `volver` y `alVolver`. `volver` es el texto del botón porque concuerda con lo que se lista
  («los más recientes» en seguimientos, «las más recientes» en revisiones). La fecha sale de `formatearFecha(dia, { zona })`, que ancla el día a la medianoche de la zona: lo mismo que el `fechaDe` de antes.
- **El aviso del tope se queda en `leads`:** su texto es de seguimientos y el panel «Revisiones» ya dibuja el suyo con `<AvisoDeTope>` de `shared/ui`.
- **Un solo cargador para los tres diferidos** (auditoría del plan): separados, «Desde el …» pedía su chunk después de «Ir», con un instante vacío y, sin red, un «Sin conexión» que antes no existía. Con
  `Promise.all` de los tres `import()`, el primero que se dibuja trae los tres, como cuando vivían en un archivo.
- **Ningún ayudante nuevo en `shared/lib/fechas.ts`** («el instante exclusivo de un día»): la línea ya se escribe con dos funciones de `fechas.ts`, y tocar `src/shared/lib` vuelve el paso de rigor máximo. Si el 5c
  lo quiere, lo decide su plan.

## 2026-11-06 — Paso 4.17-5c: «Ir a una fecha» en «Revisiones»

- **«Ir a una fecha» abajo de la lista, como en la línea de tiempo** (4.15-3b P2 ya lo había decidido): se dibuja mientras haya más hacia atrás o se mire desde una fecha; «Desde el …» y «Volver a las más
  recientes» van arriba. Sin pregunta abierta: los textos («No hay revisiones hasta esa fecha.», «Mostrando 500 desde el …», «Para ver anteriores, ve a una fecha.») son microdecisiones tomadas de la línea de tiempo.
- **El borde en `entities/` de cotizaciones (`hastaDeUnDia()`):** son las tres líneas de `cursorDeUnaFecha()`, repetidas a propósito; subirlas a `shared/lib` vuelve el paso de rigor máximo.
- **El salto reemplaza lo leído y «Ver más» nunca manda `p_hasta`:** la base ya toma el menor de `p_antes` y `p_hasta`, pero el hook no los junta; así «Ver más» sigue por id y no se salta ni repite nada.
- **Un pedido nunca se adelanta a otro** (la auditoría del plan bloqueó una contradicción entre «ocupado no pide» y «un salto adelanta»): con cualquier pedido en vuelo, `verMas`, `irAUnaFecha`, `volverALasMasRecientes`
  y `reintentar` no piden, como `enExclusiva` de seguimientos; «Ver más», «Reintentar» e «Ir» quedan apagados sin cambiar su texto.
- **El error de un salto deja lo leído y su `desde`:** `fallido` guarda el día y el borde para que «Reintentar» repita ese salto; el error de volver, igual. El error de «Ver más» se reintenta como antes.
- **Import directo, sin `diferido()` propio:** el panel ya viaja con `diferido()`, así que `<IrAUnaFecha>` y `<DesdeUnaFecha>` viajan en su chunk; la carga en frío de `/cotizaciones/[id]` no se mueve (435,7 KB).
- **El motivo del registro de `drawers-con-salida.ts`** dice que «Ir a una fecha» es una posición y no algo que se guarde: su `<form>` vive en `shared/ui`.
- **El hook en tres archivos** (la función pasaba de 80 líneas): `ventana-de-revisiones.ts` (puro), `use-turno.ts` (un pedido a la vez y lo viejo se descarta) y `use-pedidos-de-revisiones.ts`.

<!-- paso:4.20-1 -->

## 2026-11-06 — Paso 4.20-1

- **El 4.20 se parte en cuatro, en cadena:** 4.20-1 (la base: el ⚙ y revertir publican desde la publicada sin pisar el borrador, la versión de origen, el PT409 con quién publicó, 4-36; Nivel 1 + cadena db), 4.20-2 (la pestaña «Fórmula» de Configuración › Cotización: historial por cursor, publicar con nota, descartar y revertir; la sección con `cotizaciones.configurar`; el enlace de «Falta publicar» con el origen), 4.20-3 (el ⚙ en la hoja: el `Proveedor`, la constante, el tipo de cambio por `empresa/client.ts` y «Aplicar también a esta cotización») y 4.20-4 (vigencia y vehículo obligatorio, que escribe `ajustes_empresa`, del A). Con un commit por intención eran 10 o más de código. Plan: `.piloto/planes/4.20.md`.
- **Para el coordinador (o el A), en `docs/PLAN.md`, fila del 4.20:** «Se parte en 4.20-1 (la base: el ⚙ y revertir publican desde la publicada sin pisar el borrador, la versión de origen, el PT409 con quién publicó, 4-36; Nivel 1 + cadena db), 4.20-2 (Fórmula en Configuración › Cotización), 4.20-3 (el ⚙ en la hoja) y 4.20-4 (vigencia y vehículo obligatorio); 4-33, 4-19 y 4-20 pasan al A; 5a-29 y 5a-30 quedan en el pulido de la Fase 9; 4-30 al 4.22». En `docs/plan.yaml` el id `4.20` se reemplaza por cuatro: `4.20-1` con el `depende_de` de hoy (`['4.15-4', '4.15-5', '4.15-6c']`) y `terminado` «El ⚙ y revertir publican la N+1 desde la publicada sin pisar el borrador; el borrador atrasado da PT409 con quién publicó; cierra 4-36 y la parte de 4-8 del ⚙ y de revertir»; `4.20-2` y `4.20-3` con `depende_de: ['4.20-1']`; `4.20-4` con el `depende_de` de hoy; el `4.21` pasa de `['4.20']` a `['4.20-2']` (`4.22` y `4.23` no cambian). **Este PR no marca `integrado 4.20`:** integra sólo el 4.20-1.
- **P1 = el ⚙ y revertir no tocan el borrador** (compuerta `producto` contestada el 2026-11-06, la recomendada): publican la N+1 desde la publicada como fila nueva (`_publicar_version()`); el borrador recuerda su versión de origen y publicarlo atrasado da PT409. Nunca frena al asesor que usa el ⚙; quien tiene el borrador lo descarta (4.20-2) o lo rehace (4.21). Negarse dejaba sin ⚙ a todo el origen por un borrador olvidado; mezclar tocaba en silencio el borrador de otra persona; archivarlo choca con `formulas_publicada_con_diseno`.
- **P2 = la versión esperada de `formula_guardar_borrador()` va al 4.21** (la recomendada): cambiarle la firma rompe `scripts/carreras/{niveles,tonos,cotizaciones}.mjs`, del A.
- **P3 = revertir pide `cotizaciones.configurar`** del origen (la recomendada), como publicar y el ⚙: sin clave nueva.
- **P4 = el ⚙ recibe `p_publicada_esperada uuid default null`** (la recomendada), como `formula_publicar()`: la regla «sin default» es para `p_actualizado_en_esperado` de una RPC que nace; ésta ya existía y su esperada es una versión, no una hora. `formula_revertir()` nace sin defaults.
- **P5 = los abiertos de la fila que el B no puede tocar se reparten** (la recomendada): 4-33 (`cotizacion_crear`, núcleo), 4-19 (`features/niveles`) y 4-20 (`src/shared/ui/sonner.tsx`) van al A; 5a-29 y 5a-30 quedan en «Pulido para la Fase 9»; 4-30 va al 4.22.
- **P6 = las pruebas nuevas van en archivos ya registrados** (la recomendada): bloques `-- @test` en `supabase/tests/publicar-diseno.sql` y las rondas en `medir-publicar.sql`. **Abierto para el A:** las carreras mixtas (el ⚙ contra publicar el borrador, revertir contra el ⚙) en `scripts/carreras/`; hoy el candado del origen las pone en serie y `db:probar` prueba cada lado.
- **P7 = revertir a una versión con un nivel retirado se rechaza** (la recomendada) con `22023 nivel_retirado`, como publicar un borrador: un nivel se retira para que deje de usarse. El ⚙ sigue aceptándolo porque copia el diseño de la publicada, que ya lo usa.
- **El candado es por origen** (`pg_advisory_xact_lock(hashtextextended('formulas:' || origen, 0))`), después del permiso y de la nota y antes de leer la publicada, en `_publicar_formula()` y `_publicar_version()`: sin él, el ⚙ (que ya no toma el borrador `for update`) podía publicar dos N+1 y la segunda daba 23505 de `formulas_publicada_unica` en vez de PT409.
- **El ⚙ compara la esperada con lo que leyó al entrar**, que es lo que copia, y `_publicar_version()` vuelve a comparar tras el candado: así nunca publica sobre un contenido distinto del que comparó.
- **La ayudante del texto se llama `_version_publicada_por()`**, no `_formula_publicada_por()` como decía el plan: `_formula_*` es el espacio de las ayudantes de `validar_formula()`, que `supabase/tests/validar-formula.sql:165` cuenta (7) y exige STABLE.
- **El texto del conflicto elige primero el sujeto** (quien llama, «Publicaste»; otra persona con nombre; «Otra persona») y quita el «hace…» aparte si no hay `publicado_en`, como `_conflicto_de_edicion()` mira primero a quien llama: con un nulo, `_hace()` diría «hace un momento».
- **4-36: la causa es el espacio libre que dejan las corridas revertidas.** La sección 1 de `medir-publicar.sql` mide cuántos bloques suman 1.800 versiones más; tras una corrida, un autovacuum que no trunca deja ~118 páginas libres en `formulas` y la siguiente las reusa: la sonda que recorre la tabla suma 0 bloques y la guarda cae (reproducido con `vacuum (truncate false)` entre dos corridas: `.piloto/salidas/4.20-1/causa-4-36-a2.txt`). El arreglo es `vacuum (full, analyze) public.formulas` antes del `begin;`: un `vacuum` simple sólo trunca las páginas vacías del final.
- **Los topes del ⚙ y de revertir salen de la regla del plan** (la mayor mediana de 3 tandas × 3 por 3; buffers, lo medido más un 20 %) y pasan los de publicar (60 contra 55; 600 contra 550 en revertir con 2.018 ítems) sólo por redondeo: sus medianas son como las de publicar (17,7 a 19,8 y 173,5 a 197,5 ms en las mismas corridas), porque validan y compilan lo mismo. El EXPLAIN de una llamada a una función no dice más (un solo `Result`); se aceptan así.
- **4-64:** `publicar-diseno.sql` pasa de 327 a 621 líneas y `medir-publicar.sql` de 324 a 417: ya pasaban de 300.
- **Textos para archivos del A:** (1) la ficha `src/modules/cotizaciones/CLAUDE.md` (lista de RPC, `:69` y `:74`): suma `formula_revertir()` y que el ⚙ no pisa el borrador; (2) la ficha `:85`: la excepción de los textos del candado suma los PT409 de `formula_publicar()`, `formula_cambiar_constante()` y `formula_revertir()`, que sólo nombran a una persona, una versión y cuándo, como el de `cotizacion_guardar()`; el 4.20-2 y el 4.20-3 los muestran tal cual; (3) `.claude/rules/migraciones.md`: `formula_publicar()` y `formula_cambiar_constante()` llevan `p_publicada_esperada uuid default null` (una versión, no una hora), y la excepción de `formula_guardar_borrador()` pasa de «hasta el 4.20» a «hasta el 4.21».

<!-- paso:4.20-2a -->

## 2026-11-06 — Paso 4.20-2a

- **El 4.20-2 se parte en dos:** 4.20-2a (la pestaña «Fórmula» de lectura: el hub y la página con `cotizaciones.configurar`, la publicada, el borrador y las versiones por cursor, y el enlace de «Falta publicar» al origen) y 4.20-2b (publicar el borrador con nota, descartarlo y revertir, por las RPC que ya existen). Leer y escribir juntos eran 6 commits de código. Plan: `.piloto/planes/4.20.md`.
- **Para el coordinador (o el A).** En HEAD, `docs/plan.yaml` todavía tiene un solo `4.20` y `docs/PLAN.md` no nombra su partición: primero va la del 4.20-1 (`docs/pasos/4.20-1/decisiones.md`) y, encima, ésta. En `docs/PLAN.md`, fila del 4.20: «El 4.20-2 se parte en 4.20-2a (la pestaña «Fórmula» de lectura: el hub y la página con `cotizaciones.configurar`, la publicada, el borrador y las versiones por cursor, y el enlace de «Falta publicar» al origen) y 4.20-2b (publicar con nota, descartar y revertir)». En `docs/plan.yaml`, el `4.20-2` se reemplaza por `4.20-2a` (`depende_de: ['4.20-1']`, `terminado`: «Configuración › Cotización abre con `cotizaciones.configurar` y su pestaña «Fórmula» muestra la publicada, el borrador y las versiones por cursor; el enlace de «Falta publicar» lleva al origen») y `4.20-2b` (`depende_de: ['4.20-2a']`); el `4.21` pasa a depender del `4.20-2b`. **Este PR no marca `integrado 4.20`.** La línea de la fila «quien sólo configura el origen cae en «No tienes permiso» hasta que esa pantalla abra con `cotizaciones.configurar`» queda cerrada.
- **Sin compuerta `datos`:** no hay policy, grant, `security definer` ni clave nueva; `cotizaciones.configurar` ya existe y la policy `formulas: leer` ya deja leer esas filas por la API a quien la tiene. Lo que cambia es qué pantalla dibuja `puede()`, y quién entra ya lo decidió la fila del 4.20. Es distinto del 4-89, donde quién veía la pestaña de un área estaba sin decidir.
- **Las pestañas llevan sus permisos y Niveles va primero:** quien tiene las dos claves y entra por el hub sigue cayendo en «Niveles de acceso» (los e2e de niveles no cambian); quien sólo configura cae en «Fórmula» y `?seccion=niveles` le abre «Fórmula». La barra recibe sus pestañas por props, como la de Empresa (`AlMenosUna` y `alMenosUna` se importan de `empresa/pestanas.ts`, sin editarlo), y al cambiar de pestaña limpia `panel`, `nivel` y `origen`.
- **El origen va por selector y entran los inactivos:** su fórmula se sigue pudiendo mirar (la policy no mira `activo`); se marcan «(inactivo)». Uno que no es suyo abre el primero (`origenElegido()`).
- **La lectura vive en un Server Component del área** (`SeccionDeLaFormula`, por `pantallas/formula.ts`, como `SeccionPortal` de leads) y no en el `index.ts`: sumar nombres a la API de `cotizaciones` cambia la cuenta de `scripts/mapa.test.ts` (T13, «+76»), que es del A. Los orígenes los compone la página (este módulo no depende de `origenes`).
- **La versión de origen del borrador se lee aparte, por clave primaria, sólo si está atrasado:** embebida por `formulas!version_origen_id(version)` la autorreferencia no llegaba como un objeto y la lectura del estado fallaba («No se pudo cargar la fórmula.» en el e2e). Si empezó sobre la publicada, toma su número sin leer nada más.
- **«Ir a la versión» es el camino a lo antiguo:** entero de 1 a 2.147.483.646 (el cursor N + 1 cabe en un `integer`); «Desde la versión N» vive en el hook y no en la URL (al recargar vuelve a la más nueva).
- **Un error de la lectura del servidor lo toma `src/app/(app)/error.tsx`** (ya trae «Reintentar»); el de «Ver más» queda en la lista sin perder lo cargado.
- **Necesita del carril A:** (1) el `EXPLAIN` de la lista de versiones en `pnpm db:medir:volumen` (un `medir-formula-versiones.sql` en `MEDICIONES` de `scripts/medir-listado.mjs`); mientras, la forma la fija `supabase/tests/areas/formula/versiones-por-cursor.sql` en PGlite; (2) la ficha `src/modules/cotizaciones/CLAUDE.md` › «Entra y sale»: «`/configuracion/cotizacion?seccion=formula&origen=<id>` (4.20-2a, `cotizaciones.configurar` en algún origen): `pantallas/formula.ts` da `<SeccionDeLaFormula>` (Server Component: los orígenes con la clave, la publicada, el borrador y la primera página de versiones por PostgREST sin lo oculto; «Ver más» desde el navegador por `areas/formula/composicion.client.ts`, de a 20 por cursor sobre `formulas_origen_id_version_key` hasta 500, con «Ir a la versión»)», y en la línea de los niveles, que la página abre también con `cotizaciones.configurar`; (3) `src/app/(app)/configuracion/origenes/pasos.ts:20-24`: el paso «fórmula» de un origen nuevo puede llevar `ruta: '/configuracion/cotizacion?seccion=formula'` (con el origen, si la ruta admite parámetros).
- **Pregunta que lleva el 4.20-2b:** `formula_descartar_borrador(p_origen)` borra el borrador sin versión esperada, así que quien descarta puede borrar lo que otra persona acaba de guardar encima. Opciones: (1, la que se recomendará) usar la RPC de hoy y llevar su esperada al 4.21 con la de `formula_guardar_borrador()` (hasta el 4.21 nadie guarda un borrador desde la pantalla); (2) una migración `formula_descartar_borrador(p_origen, p_actualizado_en_esperado)`, que vuelve rigor máximo al 2b y dispara la compuerta `datos`.

## 2026-11-06 — Paso 4.18-1: la plantilla de la tarjeta validada y la lectura de la tarjeta, en la base

- **El 4.18 se parte en 3 por capas** (la base con rigor máximo, la pantalla con Nivel 1 e interfaz, el PDF con el hito y el Nivel 2): el 4.18-1 es sólo base, el
  4.18-2 la tarjeta en pantalla y el 4.18-3 el PDF, «Compartir» y el hito 4-A (`docs/PLAN.md` › 4.18). Plan auditado en dos rondas (la 1.ª bloqueó: la tabla
  legible por todos podía dejar ver el id y el texto de un nodo restringido en un borrador, una archivada o una publicada vieja, y una mutación era equivalente).
- **La forma es declarativa, como el diseño (P2), no la de `COTIZADOR.md`** (paleta en hex y plantillas de texto `{{…}}`, anterior a D7): con hex el contraste no lo
  valida nadie (la base sólo lo valida en `tonos`) y una plantilla de texto podría nombrar cualquier nodo. Los colores salen del catálogo de tonos; los textos se
  cuentan en caracteres (como lo contará el TS del 4.19, 4-74).
- **La tarjeta lleva todos los grupos enteros (P3) y sólo nodos del nivel «todos»:** así lo que se ve suma el total y ningún costo oculto se deduce restando. «No
  figurar» en la visibilidad compilada cuenta como restringido: un nodo que el diseño no dibuja tampoco sale.
- **La plantilla es la publicada hoy, validada otra vez al leer contra la versión de la cotización (P1):** cambia el aspecto de una vieja, nunca sus números; si ya no
  le sirve, `sin_plantilla` sin regla ni `donde` (el `donde` podría nombrar un nodo oculto) y la tarjeta sale «por omisión». `plantilla_id` sigue sin uso (P5).
- **La tabla la lee sólo quien configura el origen (P8)**, con la regla de `formulas: leer`; los demás, por `cotizacion_tarjeta()`. Por eso el paso fue de Nivel 2.
- **Un tono borrado cae al del grupo al leer, y `tono_eliminar` no se tocó:** sumar las plantillas a `_tono_en_uso()` cambiaba otra `security definer`, su medición y
  dos carreras (no cabía); la lectura valida con `p_tonos` nulo y el aviso al configurar es del editor (4.19).
- **S0 no se cumplió en `planilla_usa`** (la persona contestó la compuerta): su diseño no dibuja tipos de cambio, así que su plantilla de la semilla va sin esa
  columna y la regla queda estricta. Se activa cuando su diseño los dibuje.
- **K6 prueba `moneda_bs` con una versión cuyo `total_en` es un tipo de cambio a otra moneda** (los de la semilla van todos a BOB) y la compara con la de
  `cotizacion_hoja`, no con una guardada como decía el plan: así distingue la moneda del `total_en` de la de un bucket (M23) sin crear una cotización.

## 2026-11-06 — Paso 4.18-2: la tarjeta de una cotización en pantalla

- **«Vista previa» entra por un hueco del núcleo, como el ⚙:** `ContextoDeLaVistaPrevia` lleva una función `dibujar(props)` que llena `<ProveedorDeLaTarjeta>` (del área `tarjeta`)
  con la cáscara de `diferido()` del modal y lo que sólo la página sabe (asesor, vehículo, número, logo). Sin proveedor ni un nodo cambia, y el núcleo no importa el área. La
  lee el navegador al abrir el modal (`cotizacion_tarjeta()`, una vez por versión, 5 min): la hoja no carga la tarjeta ni su modelo.
- **La tarjeta de una guardada dibuja lo guardado (P5 a):** la plantilla «cambia el aspecto de una vieja, nunca sus números» (4.18-1) también vale cuando lo de hoy difiere
  (las tablas vivas, el vehículo de hoy). `calculoDeLoGuardado()` toma valores y totales del snapshot (por eso `LoGuardado` suma `totalBs`, que la base ya devolvía recortado) y
  los **estados del primer recálculo**: el snapshot no los trae y dependen sólo de la variante y las banderas, no de las tablas. Si ese recálculo falló, la tarjeta va sólo con el
  total guardado. Fuera de la tarjeta, el modal dice si lo de hoy no es lo guardado y si hay cambios sin guardar. Así lo que ve la persona es lo que dirá el PDF del 4.18-3,
  que se arma en el servidor y no ve lo que no se guardó. El primer plan lo dibujaba de hoy sin decirlo: la 1.ª auditoría lo bloqueó y pasó a pregunta de producto.
- **El modelo toma de la hoja sólo números por id de nodo (C9):** filas, etiquetas, leyendas, total y lo aparte salen de lo que la lectura nombra (el nivel «todos»); quien ve
  «costos» ve en la tarjeta lo mismo que quien no. Cuatro mutaciones baratas (Vitest) lo prueban aunque el paso sea de pantalla, porque `entities/` decide qué monto ve el cliente.
- **Sin subtotales por grupo:** la base no los da (un grupo no es un nodo) y sumarlos en el navegador sería dinero calculado fuera de la base; si la persona los quiere, es una
  lectura de la base (otro paso). La moneda del total en Bs sale de una sola fuente, `hoja.cabecera.monedaBs` (la misma regla que `moneda_bs` de la lectura).
- **La fecha va corta («6 nov 2026», `formatearFecha`):** una fecha larga pedía `src/shared/lib/fechas.ts`, que sube el paso a Nivel 2. Hoy en la nueva; en una guardada, el día
  de su último guardado (`actualizadoEn`, sólo formateado).
- **«Asesor:»** es quien cotiza en la hoja nueva y quien creó la cotización en una guardada (`leerAsesorDeLaCotizacion`, una lectura por clave primaria con el autor embebido; si
  falla, no se nombra); la tarjeta por omisión lleva sólo el total (se corrigió el glosario: lo aparte de la pantalla es el de quien mira). El título de la tarjeta es el del
  vehículo y el encabezado el de la variante (P6 del 4.18-1): cierra 4-55.
- **La hoja pasó a 469 de 500 nodos al abrir (491 usada) y `/cotizaciones/nuevo` a 458,5 de 460 KB (4-73):** el botón es de sólo texto (P1) y su código, diferido. El «Compartir»
  del 4.18-3 sumará otro nodo y más JS: antes, atribuir lo que ya pesa. Se registró el modal en `scripts/guardas/modales-con-salida.ts` (sólo dibuja, no guarda nada tipeado).

## 2026-11-06 — Paso 4.18-3a: el PDF de una cotización guardada

- **El 4.18-3 se parte en 2:** el **4.18-3a** (el PDF en el servidor, su lector y el e2e del total) y el **4.18-3b** («Copiar texto», «Descargar PDF», la tarea de oro 2 con el PDF
  y el hito 4-A con el completo). Entero pedía 4 commits de código y juntaba dos capas que se verifican distinto. «Compartir» ya era dar acceso a un lead (`docs/GLOSARIO.md`):
  la cotización tiene dos acciones con su verbo (P5, para el 3b).
- **El PDF es de una guardada y de lo guardado:** `GET /cotizaciones/<id>/pdf` dibuja `modeloDeLaTarjeta()` con `calculoDeLoGuardado()`, como «Vista previa» de esa guardada
  (P5 del 4.18-2); lo que no se guardó no se puede armar en el servidor. Lo lee con la sesión de quien pide: lo deciden la RLS de la hoja guardada y `cotizacion_tarjeta()`, sin
  clave propia (P4). Pide `requerirSesion()` antes de leer (la segunda barrera tras el proxy: también ataja la cuenta dada de baja) y da el mismo 404 en texto que la página
  para lo que no existe, está en la papelera o no se ve.
- **Los montos van con `formatearMonto()`, sin `<Monto>` y sin Modo Live (P8):** `<Monto>` es del DOM y react-pdf no lo dibuja; `formatearMonto()` es el texto que `<Monto>`
  imprime. El PDF es lo que se entrega al cliente y lleva siempre las cifras; Live sirve para tapar la pantalla mientras se muestra. Es la única excepción a «dinero sin `<Monto>`»
  (`CLAUDE.md` › «Nunca») y vive en `infra/tarjeta/pdf/`.
- **Los ajustes por `leerAjustes()`, no por `getAjustes()`:** `getAjustes()` nunca falla y daría el locale y la zona de fábrica sin avisar; un PDF que va al cliente no sale con el
  formato equivocado: si la lectura falla, es un 500. Cuesta una RPC más (`empresa_con_datos_cargados`).
- **Las fuentes (P1):** Geist Regular y SemiBold en TTF del release oficial `vercel/geist-font` v1.9.2 (publicado el 2026-11-06, OFL 1.1, con su `OFL.txt`), en
  `src/modules/cotizaciones/infra/tarjeta/pdf/fuentes/`. sha256: `Geist-Regular.ttf` `2c460a7a71063e53491f343d44b382267bc0cf496e31db64865f962af3152e68`,
  `Geist-SemiBold.ttf` `01923aa148e5202ae70a2e11b2ab4dc41b80bcc374aedccc913d47bb2f591c06` (del zip
  `15f066d58dcb99fb10014a49913009fdaf41e464cfb8851a44b44e593c95d3d8`). `next.config.ts` las traza para el despliegue (`outputFileTracingIncludes`).
- **El logo (P2):** se baja en el servidor con 2 s y `PESO_MAXIMO_LOGO` (1 MB, el de Storage) y llega a react-pdf como `Buffer`, nunca como URL (react-pdf la bajaría sin espera
  ni tope y la guardaría en su caché de proceso). PNG y JPEG van siempre; un SVG sólo si no trae lo que `@react-pdf/svg` se salta (`<style>` y clases, `use`, `symbol`, `mask`,
  `filter`, `pattern`) ni `<image>` (bajaría o leería otro archivo sin tope). El WebP no lo dibuja: 4-98.
- **El lector del PDF es propio (P3):** `scripts/pdf/texto-del-pdf.ts`, sólo con `node:zlib`, lee lo que escribe pdfkit 0.20 (las CMap ToUnicode, también la ligadura «fi» con un
  espacio dentro del hex) y lo que no entiende lo dice. Su prueba arma PDFs con el renderer real: si cambia pdfkit, cae.
- **react-pdf se carga sólo al pedir un PDF** (`import()` en `areas/tarjeta/composicion.ts`) y nunca llega al navegador. Aun así, **suma ≈ 0,45 KB al JS en frío de todas las
  rutas**: `@react-pdf/renderer` es sólo ESM y Turbopack lo trata como externo asíncrono, y con él en el grafo del servidor el runtime del cliente (uno para todas) lleva el
  soporte de módulos asíncronos (3.973 → 4.423 bytes con gzip). Se midió build por build: sube con el área en el barril, con import estático y con el PDF en una entrada
  aparte; no sube sin el área. Todas las rutas siguen bajo su presupuesto; `/cotizaciones/nuevo` queda en 458,9 de 460 (4-73). Sacarlo del grafo (un `import()` que Turbopack
  ignore) obligaría a trazar el paquete a mano para desplegarlo: frágil, no se hizo.
- **La guarda de `diferidos` permite ese `import()`** por su ruta (`infra/tarjeta/pdf/pdf-de-la-tarjeta`): es servidor, no un componente del navegador.

## 2026-11-06 — Paso 4.18-3b: «Copiar texto», «Descargar PDF» y el hito 4-A

- **El texto es el espejo del PDF (C1):** `textoDeLaTarjeta()` (puro, `entities/tarjeta/`) escribe el mismo `ModeloDeTarjeta` en el orden del PDF (`documento-de-la-tarjeta.tsx`):
  el título, «<fecha> · Cotización n.º N» (con « · Vencida»), «Asesor:», el vehículo, cada grupo con sus columnas y filas, el total con su leyenda, el Bs y lo aparte, y la nota;
  bloques separados por una línea en blanco. Los montos con `formatearMonto()` y siempre con cifras, como el PDF (P7 y P8 del 4.18-3). El espacio duro que separa la moneda no
  se toca: el texto pegado dice lo mismo que la tarjeta.
- **P2 (la recomendada, 2026-11-06):** «Copiar texto» queda apagado mientras el modal dice «Total desactualizado.» o el total no tiene valor (`avisoDelTotal()`), y lo nombra por
  `aria-describedby` el aviso o «Falta el total para copiarlo.». Nunca se le manda al cliente un total que no es el de la hoja.
- **P1, microdecisión (`.claude/rules/ui.md`):** en el modal, «Descargar PDF» pide la ruta desde el navegador (`fetch` con `redirect: 'manual'` y `cache: 'no-store'`) y baja el
  blob con un `<a download>` de un momento; mientras pide dice «Descargando…»; un 404, la sesión que no vale (la redirección al ingreso o a cerrar la sesión) u otro fallo se dicen
  en el pie con textos propios y «Reintentar». Un `<a>` sin `download` sacaría de la página; uno con `download` se llevaría la página de ingreso como archivo si la sesión venció con el modal abierto. En la tarjeta de lo
  guardado de la hoja nueva sí vale el `<a download>`: aparece recién guardada, con la sesión que acaba de guardar, y no puede pagar el JS de la descarga (4-73).
- **El enlace de la hoja nueva no lleva JS (C6):** la tarjeta de lo guardado ofrece un `<a href={rutaDelPdf(id)} download>`; el nombre lo da la ruta. Lo de la descarga del modal
  viaja en su chunk diferido: `/cotizaciones/nuevo` pasó de 458,9 a 459,0 KB de 460 (4-73).
- **Los componentes del pie son dos archivos** (`copiar-texto-de-la-tarjeta.tsx` y `descargar-pdf-de-la-tarjeta.tsx`), no uno `acciones-de-la-tarjeta.tsx` como decía el plan:
  un componente por archivo (`.claude/rules/modulos.md`), y cada commit trae el suyo.
- **La tarea de oro 2 llega al PDF con 29 teclas de control** (25 antes: 3 Tab desde Ctrl+S hasta «Descargar PDF» y su Enter), igual en los dos proyectos; el foco no se pierde al
  guardar y no hay pulido que anotar. KLM 15,5 s con 4 decisiones.
- **El hito 4-A:** el completo de escritorio dio 980 en verde, 16 saltados y 2 caídas que pasan 3 de 3 solas: `cotizar-encima.spec.ts:104` (el 4-85, conocido) y
  `leads-recorrido-cierre-2.spec.ts:213` (nueva, 4-99). Con la tarea de oro 2 verde hasta el PDF en los dos proyectos, se cotiza de punta a punta con su PDF: el hito se anota.
  El CI del PR lo confirma.
- **T13 del mapa se sube en el mismo commit que el barril** (commit `fix(ci)` aparte, heredado del 4.18-3a): la ficha de `cotizaciones` lo dice en «Áreas».

<!-- paso:4.20-2b -->

## 2026-11-06 — Paso 4.20-2b

- **El 4.20-2b se parte otra vez:** 4.20-2b (publicar el borrador con nota y revertir a una archivada) y 4.20-2c (descartar el borrador). Descartar es irreversible y `ui.md` lo pide como `<Confirmar>` con su URL; todo `<Confirmar>` de `src/` tiene que figurar en `scripts/guardas/confirmar-con-url.ts` o cae `confirmar-con-url.test.ts`, y `scripts/` es del carril A: este carril no puede dejar el árbol en verde con un `<Confirmar>` nuevo. Plan: `.piloto/planes/4.20.md`.
- **Para el coordinador (o el A).** Encima de las particiones del 4.20-1 y del 4.20-2a (tampoco anotadas en HEAD): en `docs/PLAN.md`, fila del 4.20, «El 4.20-2b se parte en 4.20-2b (publicar el borrador con nota y revertir a una archivada) y 4.20-2c (descartar el borrador, con `<Confirmar>`: necesita del A el registro `confirmar-con-url-formula.ts`)». En `docs/plan.yaml`: el `4.20-2b` con `depende_de: ['4.20-2a']` y `terminado` «Desde la pestaña «Fórmula», publicar el borrador con nota y revertir a una archivada publican la N+1 por las RPC del 4.20-1, con su PT409 tal cual; la nota vacía se rechaza antes de pedir»; nace el `4.20-2c` (`depende_de: ['4.20-2b']` y el paso del A que crea el registro; `terminado` «Descartar el borrador del origen con `<Confirmar>` por URL»). El `4.21` sigue dependiendo del `4.20-2b`. **Este PR no marca `integrado 4.20`.**
- **Lo que el 4.20-2c necesita del A:** un registro por área, como `paginas-en-la-base-papelera.ts` del C: `scripts/guardas/confirmar-con-url-formula.ts` (vacío, `Record<string, ConfirmarConUrl>`) que `confirmar-con-url.test.ts` sume a `CONFIRMAR_CON_URL`, y en `docs/plan.yaml` dentro de `b.dueno_de`. Con eso el 2c suma su fila en su PR; sin eso, el 2c lo hace el A.
- **Pregunta abierta del 4.20-2c** (heredada del 4.20-2a; el 2b no la cierra): `formula_descartar_borrador(p_origen)` borra el borrador sin versión esperada, así que quien descarta puede borrar lo que otra persona acaba de guardar encima. Recomendación: usar la RPC de hoy y llevar su esperada al 4.21 junto con la de `formula_guardar_borrador()`, porque (1) el riesgo pide un `formula_guardar_borrador()` concurrente y hasta el 4.21 ningún código de `src/` lo llama (sólo `scripts/carreras/` y la semilla), y el `<Confirmar>` nombra el borrador («de <autor>, guardado <cuándo>»); (2) la versión que compararía es el `actualizado_en` del borrador, la misma que el 4.21 tiene que sumar a `formula_guardar_borrador()`: una migración, no dos; (3) hacerlo ahora es una migración con `security definer`, rigor máximo y compuerta `datos`. La alternativa: `formula_descartar_borrador(p_origen, p_actualizado_en_esperado)` en el 2c, que cambia su tipo. Como acepta que se borre un borrador ajeno («un dato que se guarda», `ui.md`), la contesta la persona en la compuerta del 2c.
- **Sin compuerta `datos`:** ni policy, ni grant, ni `security definer`, ni clave nueva. Las dos RPC (del 4.20-1) ya piden `cotizaciones.configurar` del origen y tienen `execute` para `authenticated`; las actions lo vuelven a mirar con `puede(ctx.permisos, …, origenId)` antes de llamar. **Es pantalla pura aunque cree `entities/formula/{publicacion,reversion,repositorio}.ts` e `infra/formula/`:** son textos, la forma de la URL, tipos y un adaptador de dos RPC que ya existen, sin regla de dinero ni dato nuevo (como el 2a); la regla (permiso, nota, esperada, atrasado, validación) vive en las RPC y su rigor fue del 4.20-1.
- **«Publicar…» sólo con el borrador al día:** atrasado, publicar da PT409 seguro, y el aviso de la tarjeta ya dice por qué. Por la URL, un atrasado no abre.
- **La nota:** se valida en el navegador y en la action con el mismo `esquemaDeNota` (recortada; vacía, «Publicar pide una nota.», el texto de la base; hasta 2.000 caracteres, el tope de `oportunidades_notas_largo`, porque la base no tiene). La de revertir viene escrita («Vuelve a la versión N.»): se puede cambiar.
- **Los PT409 de `formula_publicar()` y `formula_revertir()` se muestran tal cual** (la excepción que pidió el 4.20-1): dicen quién publicó qué versión y cuándo, sin «Recargá» (el e2e lo comprueba). Los 22023 también (están escritos para la persona). «Recargar» hace `router.refresh()` y conserva la nota; el conflicto se va cuando llega otra publicada (`useConflictoHastaLaVersion`). El hook del formulario es propio (`useFormularioDePublicacion`) porque `useEnvioDeModal` no da conflicto; lo comparten los dos modales.
- **De dónde sale la versión que se revierte:** las filas cargadas viven en `usePaginasDeVersiones` (dentro de `ListaDeVersiones`) y la revisión de la URL corre en cada apertura. Por eso «Revertir» entrega su fila a `usePanelDeLaFormula` antes de escribir `?version=`, y la revisión acepta la recién elegida (de cualquier página) o una archivada de la página del servidor (llegar por un enlace o recargar). Recargar con una de la 2.ª página avisa «Esa versión no está en la lista…». El modal fija la versión al abrir (`useUltimo`).
- **La lista vuelve a la primera página con otra publicada** (`key` con el origen y el id de la publicada): «Desde la versión N» se pierde, como al recargar.
- **Los specs del 2b van aparte** (`configuracion-cotizacion-formula-publicar.spec.ts` y `-revertir.spec.ts`), uno por commit. El de revertir comprueba por SQL que la actividad de la versión nueva lleva `version_copiada = 1` (las archivadas sembradas son iguales). En el del 2a, `getByLabel('Ir a la versión')` pasa a `exact`: el nombre «Revertir a la versión N» lo contiene.
- **Tachar en `docs/PLAN.md`:** «`formula_publicar` deja de decir «Recargá»» (cerrado en la base por el 4.20-1 y comprobado en pantalla aquí). El **4-8** se ve en pantalla (el PT409 con quién; revertir copia el diseño) pero no se cierra: la esperada de `formula_guardar_borrador()` sigue en el 4.21.
- **Textos para el A** (la ficha `src/modules/cotizaciones/CLAUDE.md`): en «Entra y sale», tras la línea de la pestaña «Fórmula» del 4.20-2a, «La pestaña publica el borrador con nota (`?panel=publicar-formula`) y revierte a una archivada (`?panel=revertir-formula&version=<id>`, 4.20-2b), por `features/formula/actions/{publicar-borrador,revertir-version}.ts` sobre `repositorioDeLaFormula` (`areas/formula/composicion.ts` → `infra/formula/publicacion.ts`, `formula_publicar()` y `formula_revertir()` con la publicada que se leyó)»; en «No se rompe», que la excepción de los textos del candado incluye los PT409 de `formula_publicar()` y `formula_revertir()` que esa pestaña muestra tal cual.

<!-- paso:4.20-2c -->

## 2026-11-06 — Paso 4.20-2c

- **P1 (la persona, compuerta de producto):** descartar el borrador usa la RPC de hoy, `formula_descartar_borrador(p_origen)`, sin versión esperada; la esperada llega en el 4.21, junto con la de `formula_guardar_borrador()`: una migración, no dos. Hasta el 4.21 ningún código de `src/` guarda un borrador (sólo `scripts/carreras/`, `scripts/mediciones.mjs` y pruebas SQL), así que ninguna pantalla puede pisar uno; el diálogo nombra el borrador («de <persona>», cuándo se guardó). El costo aceptado: si otra persona lo publicó o lo descartó entre abrir y confirmar, no se borra nada y el aviso igual dice «Se descartó el borrador.».
- **P2 (la persona):** descarta el borrador todo el que tiene `cotizaciones.configurar` del origen, lo mismo que deja la base (no sólo quien lo guardó): un borrador olvidado por alguien que se fue se puede limpiar. «Descartar…» sale de `puede()`, como las demás acciones de la pestaña.
- **Es pantalla pura aunque cree `entities/formula/descarte.ts` y toque `entities/formula/repositorio.ts` e `infra/formula/`:** como en el 4.20-2b (`docs/pasos/4.20-2b/decisiones.md`), son textos, la forma de la URL, un tipo y el adaptador de una RPC que existe; borrar el borrador no toca la publicada (la única con la que se cotiza) ni ningún cálculo, y el permiso y el borrado los pone la base.
- **Microdecisiones (ui.md):** «Descartar…» (`outline`) va junto a «Publicar…» y también con el borrador atrasado (ya no se publica, y se descarta). El `<Confirmar>`: «Descartar el borrador de <persona>», «Guardado <cuándo>. Se borra y no se puede deshacer; la versión publicada no cambia.», «Descartar borrador». Lo que no entró queda en un `<Aviso tono="peligro">` dentro del diálogo, que no se cierra: el mensaje de la base tal cual; sin respuesta, «No sabemos si se descartó: recarga para verlo.» (`enviarAccion()` da `sinRed` también si el servidor ya borró y se cortó la vuelta). **Sin reintento al volver la red:** es irreversible y se confirma otra vez a mano (repetir tras un borrado no borra nada). El borrador que nombra se fija al abrir (`useUltimo`). El mensaje de validación de la action: «No pudimos leer el pedido. Recarga y vuelve a intentar.».
- **El registro del diálogo:** su fila va en `scripts/guardas/confirmar-con-url-formula.ts` (del B, `a22c4151`), con `abre` = `use-panel-de-la-formula.ts` y `senal` = `PANEL_DESCARTAR_BORRADOR`.
- **La prueba del registro** (`scripts/guardas/confirmar-con-url-areas.test.ts`, «sin nada de la fórmula, es el núcleo»), del A, importaba el registro real de la fórmula y daba por hecho que estaba vacío: caía en cuanto el B registraba su diálogo. El paso paró en una compuerta `afuera` y el A la arregló simulando el registro vacío (`c3ec9a11`, PR #20). Un registro por área que el carril dueño va a llenar se prueba con el área simulada, nunca con el archivo real.
- **Para el coordinador (o el A):** en `docs/PLAN.md`, fila del 4.20, «4.20-2c hecho: descartar el borrador con `<Confirmar>` por URL (P1: la RPC de hoy, la esperada en el 4.21; P2: todo el que configura el origen)»; en `docs/plan.yaml`, el `4.20-2c` (`depende_de: ['4.20-2b']`) con `terminado` «Descartar el borrador del origen con `<Confirmar>` por URL»; siguen `4.20-3` (el ⚙ en la hoja) y `4.20-4` (vigencia y vehículo obligatorio, del A). Al **4-8**: el 4.21 suma también la esperada de `formula_descartar_borrador()`. **Este PR no marca `integrado 4.20`.**
- **Pulido para la Fase 9** (`docs/PLAN.md` › «Pulido para la Fase 9»): «Tras publicar o descartar el borrador de la fórmula, el foco cae al `body` (el botón que abrió el diálogo ya no está).»
- **Textos para el A:** en la ficha `src/modules/cotizaciones/CLAUDE.md` › «Entra y sale», tras la línea del 4.20-2b: «y descarta el borrador con `<Confirmar>` (`?panel=descartar-borrador`, 4.20-2c) por `features/formula/actions/descartar-borrador.ts` sobre `repositorioDeLaFormula.descartar` (`formula_descartar_borrador()`, sin versión esperada hasta el 4.21)»; en `.claude/rules/datos.md` («Toda edición manda `p_actualizado_en_esperado`…») y `migraciones.md`, sumar `formula_descartar_borrador` a las excepciones que esperan al 4.21.

<!-- paso:4.20-3a -->

## 2026-11-06 — Paso 4.20-3a

- **El 4.20-3 se parte en tres:** 4.20-3a (este: lo puro, la escritura y la lectura del ⚙ de una constante, sin pantalla), 4.20-3b (la pantalla del ⚙ de una constante: el `Proveedor` de `pantallas/formula-hoja.ts`, el panel, la esperada, «Aplicar también a esta cotización», la celda de tipo de cambio que dice dónde se cambia y el tope de nodos de la hoja) y 4.20-3c (el ⚙ de un tipo de cambio: pide saber qué tarifa nombra la celda). La pantalla sale del 3a porque el panel es un `<Drawer>` (se abre también dentro del modal «Avanzado» y `ui.md` prohíbe un modal sobre otro) y todo `<Drawer>` de `src/` tiene que estar en `DRAWERS` de `scripts/guardas/drawers-con-salida.ts`, del A, sin pedazo por área. Se descartaron la compuerta `afuera` (es para algo fuera del repo), parar a mitad del paso y que el B sume su fila al registro del A. El enlace de «Falta publicar la fórmula» ya lo hizo el 4.20-2a. Plan: `.piloto/planes/4.20.md` (y `4.20-3a.*`).
- **Rigor máximo** (`.claude/rules/e2e.md`): escribe los `params` de una fórmula del cotizador y convierte lo tipeado (13 → 0,13) antes de mandarlo. Plan con dos rondas de auditoría, pruebas en rojo contra HEAD, diez mutaciones e informe auditado; sin carreras nuevas (no cambia SQL: la carrera de dos ⚙ o de un ⚙ y «Publicar» la decide la base con la esperada, `supabase/tests/publicar-diseno.sql`).
- **El ⚙ no revalida ni refresca** (`features/formula/actions/cambiar-constante.ts`), excepción a `datos.md` («`revalidatePath` en la action que muta»): en Next 16.4.3 `revalidatePath` con **cualquier** ruta (`// TODO: only revalidate if the path matches`, `node_modules/next/dist/server/web/spec-extension/revalidate.js`), `revalidateTag` sin perfil, `updateTag` y `refresh` hacen que la action vuelva a dibujar la página desde la que se llama; `/cotizaciones/nuevo` volvería a leer `cotizacion_hoja()` y la `key` de la hoja la remontaría con otra abierta, a medio tipear. Es el mismo motivo de `crear-cotizacion.ts`. La pestaña «Fórmula» es dinámica y se vuelve a leer al ir a ella; vista desde el historial («atrás»), sus escrituras dan el PT409 de la base. Lo fijan dos pruebas: el espía de `next/cache` y una que lee el archivo y exige que no importe `next/cache`.
- **El 22023 con `hint = 'valor'`** («La constante ya tiene ese valor.», el único de `formula_cambiar_constante()` que lo lleva) cruza como `campo: 'valor'` desde el adaptador y llega a la pantalla como `porCampo.valor`, como el adaptador de `leads/infra/tipos.ts`; otro 22023 queda como `regla` sin campo. Límite conocido: el `hint` de `_formula_rechazar` es el id de un nodo, así que una fórmula con un nodo llamado `valor` pintaría su rechazo bajo el campo.
- **Lo tipeado se normaliza a 15 cifras**, como la XCell (`normalizar()` de `src/shared/ui/xcell/estado.ts`, que no se exporta): «1,1» en un porcentaje manda 0,011 y no 0,011000000000000001; la comparación con el valor por defecto también va a 15 cifras. `normalizar` queda privada de `entities/formula/ajuste.ts`.
- **La lectura del valor por defecto** pide `params->nodo` (el valor JSON tal cual) en vez de `params->>nodo`: un número llega como número y un texto que parece número no pasa por uno. Una fila por `formulas_publicada_unica`.
- **Lo que el 4.20-3b tiene que saber del hook y la lectura:** `useValorPorDefecto` da `sin_constante` sólo si no hay publicada o faltan **todos** los nodos; con dos nodos y uno que falta queda `listo` con ese valor nulo, y el panel dice cuál falta (`MENSAJE_SIN_LA_CONSTANTE`). Si cambian `origenId` o `nodos` el estado no vuelve a `leyendo`: el 3b monta el hook con `key` por celda. `consultaDelValorPorDefecto` interpola los nodos en el `select` y confía en que llegan validados con `esquemaId` (lo hace `valor-por-defecto.client.ts`, su único camino desde la pantalla). La base lee la constante como `(params ->> p_nodo)::numeric`: un `"5"` guardado como texto la base lo acepta y el ⚙ diría «ya no tiene esta constante»; no puede existir: `_formula_forma()` (F69, la que corre al validar una fórmula) exige que cada constante de `params` sea un número JSON. La forma real de la respuesta de PostgREST la prueba el E1 del 3b (que se vea el 5).
- **La cuenta de e2e:** vale la que da `node scripts/piloto/cuenta-e2e.mjs docs/BITACORA.md` (la que lee el bucle), no la suma a mano de las notas del 2a, 2b y 2c. Este paso no es de pantalla, así que no la mueve.
- **P1–P4 quedan para el 4.20-3b** (en su plan, con la recomendada primero): el tope de nodos de la hoja con el ⚙ (P1, cambia el techo de 500 que fijó la persona en P7 del 4.13-4b3), qué publicada espera el ⚙ (P2: la que el panel leyó), el ⚙ de un tipo de cambio en el 3b (P3: dice que se cambia en Configuración › Empresa › Monedas) y «En esta cotización» (P4: el panel muestra el valor por defecto y el nuevo).
- **Necesita del carril A** (para el 4.20-3b; mirado con `git ls-tree --name-only origin/main scripts/guardas/drawers-con-salida-formula.ts` tras `git fetch origin main`, `origin/main` = `abd2ee3d`: **no está**): (1) un registro de `<Drawer>` del área, `scripts/guardas/drawers-con-salida-formula.ts` (vacío, `Record<string, RegistroDeDrawer>`), que `scripts/guardas/drawers-con-salida.test.ts` sume a `DRAWERS`, en `docs/plan.yaml` › `b.dueno_de` (y, si se quiere, en los `modulos` del `4.20`), con su prueba hecha sobre el área **simulada** (la lección de `c3ec9a11`); llenarlo en el 3b abre la compuerta `guardas`; (2) `src/app/(app)/cotizaciones/con-proveedor-de-la-hoja.tsx:13-14` dice «Hoy no hay» `Proveedor`: con el 3b lo hay; (3) exportar `normalizar` (a `src/shared/lib`) y `MARCAS_DE_GESTORES` de la XCell, para que el ⚙ no los copie; (4) la cuenta de e2e ordena por nombre las notas que el plan no conoce: el `sí` del 4.24-1a (carril C) cae después de las `4.20-x` y deja la del B en 0 mientras no se consoliden.
- **Textos para el A:** en la ficha `src/modules/cotizaciones/CLAUDE.md` (› «Áreas» o «Archivos clave»): «`areas/formula/composicion.client.ts` da también `leerValorPorDefecto()` (4.20-3a): la publicada de un origen con su id, su versión y el valor de unas constantes, por `formulas_publicada_unica`; la action `features/formula/actions/cambiar-constante.ts` (`formula_cambiar_constante()` con la esperada siempre, sin revalidar ni refrescar: la llama el ⚙ del 4.20-3b)»; en `.claude/rules/datos.md`, junto a «`revalidatePath` en la action que muta»: «salvo la action que se llama desde la hoja (`crear-cotizacion.ts`, `cambiar-constante.ts`): revalidar remonta la hoja».
- **Para el coordinador (o el A):** en `docs/PLAN.md`, fila del 4.20, encima de las particiones del 4.20-1, 2a, 2b y 2c: «El 4.20-3 se parte en 4.20-3a (lo puro, la action y la lectura del ⚙ de una constante, sin pantalla), 4.20-3b (la pantalla del ⚙ de una constante con «Aplicar también a esta cotización»; una celda de tipo de cambio dice dónde se cambia; pide el registro de `<Drawer>` del área al A) y 4.20-3c (el ⚙ de un tipo de cambio)». La línea «Llena el hueco de la hoja con un `Proveedor`…» no la cierra el 3a. En `docs/plan.yaml` no hay pasos `4.20-x`: la dependencia del 3b con el registro la lleva este «Necesita del carril A». **Este PR no marca `integrado 4.20`.**

<!-- paso:4.20-3b -->

## 2026-11-06 — Paso 4.20-3b

- **Las cinco decisiones de la persona** (compuerta `producto`, «seguir con la recomendación» en todas): **P1**, el techo de 500 nodos de la hoja (P7 del 4.13-4b3) se mide como quien cotiza sin ⚙ (un rol con el nivel «costos», `cotizaciones.ver|crear` y sin `cotizaciones.configurar` ni `empresa.tipos_cambio.gestionar`), y quien configura tiene su tope: lo medido con la hoja usada más un 5 %, con techo en 600 y la misma regla de parar y reportar. **P2**, el ⚙ espera la publicada que el panel leyó, nunca la versión que dibuja la hoja; si no son la misma, el panel lo dice («Esta hoja usa la versión N de la fórmula; cambias la M, la publicada.»). **P3**, hasta el 4.20-3c, el ⚙ de un tipo de cambio dice dónde se cambia (Configuración › Empresa › Monedas), sin formulario. **P4**, el panel muestra el valor por defecto y el nuevo; el de esta cotización queda en su celda. **P5**, si el ⚙ pasaba el presupuesto de JS de `/cotizaciones/nuevo`, subía sólo lo del ⚙; no hizo falta (458,5 → 458,6 KB de 460).
- **El tope de nodos con ⚙: 585.** La subasta como la dueña mide 532 al abrir (21 ⚙) y 557 usada (22: la garantía, al encenderse, suma el suyo); sin ⚙, 469 y 491, igual que antes del paso. `cotizar-hoja-200.spec.ts` comprueba además que las dos personas ven las mismas celdas y que la diferencia es exactamente 3 nodos por ⚙ (la ayuda de una tabla depende de quién mira: misma cantidad de celdas no es misma cantidad de nodos).
- **El panel se desmonta al cerrar.** `LugarDelAjuste` (núcleo) dibuja el `Ajuste` sólo mientras la URL nombra la celda, así que el `<Drawer>` nace abierto, no sale deslizándose y no alcanza a devolver el foco: el cuerpo lo devuelve a mano al ⚙ de su celda (por `data-nodo` y el prefijo de su nombre) al desmontarse. Lo tipeado no tiene borrador, así que cerrar con algo escrito pregunta (`useCambiosSinGuardar(…, { preguntaAlCerrar: true })`), con **una sola llamada para todo el panel** (dos se pisarían: el `<Drawer>` guarda un estado). La fila de `drawers-con-salida-formula.ts` apunta a `cuerpo-del-ajuste.tsx` con `mecanismo: 'contexto'`.
- **El `Proveedor` es de servidor.** `ConProveedorDeLaHoja` (de servidor) le pasa `PropsDelProveedor` con los permisos; `ProveedorDelAjuste` pasa al navegador sólo el origen (`ProveedorDelAjusteCliente`, que pone `ContextoDelAjuste` y el contexto del origen): quién ve el ⚙ lo dice la base por celda (`ajustes`) y la escritura vuelve a mirar el permiso en la action y en `formula_cambiar_constante()`. El panel, su hook, la lectura y la action viajan con `diferido()` (`components/hoja/diferidos.tsx`, aparte del de la pestaña «Fórmula»).
- **«Aplicar también a esta cotización»** sólo aparece si el nodo se edita en esta hoja (`editable`; con candado o en sólo lectura no) y llama `alConfirmar(nodo, valor)` con el mismo nodo y la misma fracción que se publicó, después de la respuesta buena y antes de cerrar. Con un PT409 o sin red, nunca; sin red el panel dice «No sabemos si se cambió: vuelve a leer el valor por defecto.» y pide «Volver a leer», que conserva lo tipeado.
- **Con el Modo Live, «Valor nuevo» es un campo de contraseña**, como la entrada de la XCell (`inputMode="decimal"`, `autoComplete="off"` y las marcas de los gestores, copiadas de `src/shared/ui/xcell/entrada-de-xcell.tsx`, que no las exporta).
- **Necesita del carril A:** (1) el comentario «Hoy no hay» de `src/app/(app)/cotizaciones/con-proveedor-de-la-hoja.tsx`: desde el 4.20-3b el área `formula` llena el `Proveedor`; (2) que `LugarDelAjuste` recuerde la última celda (como `AyudaDeCelda`) para que el panel salga deslizándose y el `<Drawer>` devuelva el foco solo (pulido, Fase 9); (3) exportar `normalizar` (a `src/shared/lib`) y `MARCAS_DE_GESTORES` de la XCell, para que el ⚙ no los copie (sigue del 3a); (4) en la ficha `src/modules/cotizaciones/CLAUDE.md` › «Los huecos»: «`Proveedor` lo llena `ProveedorDelAjuste` (4.20-3b, de servidor: pasa sólo el origen): el panel del ⚙ de una constante por `diferido()`, con la publicada que leyó como esperada y «Aplicar también a esta cotización» sólo si la celda se edita; una celda de tipo de cambio dice dónde se cambia (su ⚙, 4.20-3c)».
- **Para el coordinador (o el A):** en `docs/PLAN.md`, fila del 4.20, la línea «Llena el hueco de la hoja con un `Proveedor` (el ⚙ de una celda y «Aplicar también a esta cotización»)» queda hecha para las constantes; el tipo de cambio la cierra el 4.20-3c. **Este PR no marca `integrado 4.20`.**

<!-- paso:4.20-3c -->

## 2026-11-06 — Paso 4.20-3c

- **La decisión de la persona** (compuerta `datos`, P1, «aprobar»): el ⚙ de una celda de tipo de cambio sabe qué tarifa nombra por una función del área, **`formula_tipo_cambio_del_nodo(p_formula, p_nodo)`**, `security definer`, y no porque el núcleo sume la clave a la celda (`_cotizacion_hoja()`, del A) ni porque sólo la tenga quien configura el origen. La celda no trae la clave del tipo de cambio: vive en `formulas.definicion`, que sólo lee quien tiene `cotizaciones.configurar` (D7), y el ⚙ de un tipo de cambio lo tiene quien gestiona los tipos de cambio de la empresa (`ajustes`).
- **Qué da y a quién.** Pide `empresa.tipos_cambio.gestionar` (42501; el mismo permiso que da el ⚙ y que `tipo_cambio_guardar()` vuelve a pedir) y que quien llama vea el nodo en esa versión (`_nodos_visibles()`: lo que un nivel esconde no sale; quien configura sin ver recibe sólo los nodos que no figuran en `visibilidad`, como en la hoja, y no filtra nada porque ya lee la definición). Devuelve sólo la fila de `tipos_cambio` (que lee toda cuenta): `id`, `clave`, `nombre`, las monedas, `valor`, `activo` y `actualizado_en` exacto, con sus microsegundos, que es la esperada de `tipo_cambio_guardar()`. De la fórmula no sale nada más (ni el nodo, ni su etiqueta, ni `params`). Un nodo que no se ve, uno que no existe, uno de otro tipo, una versión que no existe y una tarifa sin fila responden igual: `null`.
- **Un borrador no cuenta**: una hoja dibuja la publicada o la versión de una guardada (también archivada), nunca un borrador.
- **En el inventario de lo oculto es `recorta`**, no `no_devuelve`: lo que devuelve sale de contenido de la fórmula (la `clave` del nodo, recortada por `_nodos_visibles()`). La cubre T4 de `supabase/tests/areas/formula/tipo-cambio-del-nodo.sql`, por nivel, como `cotizacion_tarjeta` y `cotizacion_encima` en sus archivos.
- **Lo puro del valor tipeado** (`entities/formula/tipo-cambio.ts`): «Valor nuevo» de un tipo de cambio se lee con el lector de toda la app y el locale de la empresa, mayor que cero, con hasta 6 decimales, menor que un billón y distinto del de hoy («El tipo de cambio ya tiene ese valor.»: la base lo aceptaría sin dejar historial). Los textos son los de Monedas y del esquema de `guardarTipoCambio`. Copia la regla de `valorTipeado` de `empresa`, que no sale por su `client.ts`.
- **La partición** (para el coordinador; el B no edita `PLAN.md`): en `docs/PLAN.md`, fila del 4.20, junto a las particiones anteriores: «El 4.20-3c se parte en 4.20-3c (la lectura del tipo de cambio que nombra un nodo: `formula_tipo_cambio_del_nodo()`, `security definer`, y lo puro del valor tipeado; sin pantalla) y 4.20-3d (la pantalla del ⚙ de un tipo de cambio con `guardarTipoCambio`)». Después quedan el **4.20-3d** (B) y el **4.20-4** (vigencia y vehículo obligatorio, del A).
- **Lo que el 4.20-3d va a preguntar** (compuerta `producto`): (a) la guardada conserva sus tipos de cambio, así que cambiar el de la empresa desde ella no la mueve: la recomendada será el formulario sólo en la hoja nueva y, en la guardada, el texto del 3b más «Esta cotización conserva el tipo de cambio con que se guardó.»; (b) `guardarTipoCambio` hace `revalidatePath(inicio, 'layout')` y eso vuelve a abrir la hoja con otra abierta, que recalcula con el tipo de cambio nuevo y repone lo tipeado del borrador: la recomendada será aceptarlo sin tocar `empresa`; (c) el título del panel y si «Valor nuevo» va como contraseña con el Modo Live.
- **4-33** no lo cierra (es de `cotizacion_crear`, del A). Para el 3d: una escritura desde el ⚙ empieza después de abrir la hoja, así que su `cambiado_en` es posterior a la apertura y cuenta como cambiada; la ventana de 4-33 la sufren las otras hojas abiertas durante esa transacción.
- **Necesita del carril A:** (1) en la ficha `src/modules/cotizaciones/CLAUDE.md` › «Tablas», sumar `formula_tipo_cambio_del_nodo` a la lista de RPC («el tipo de cambio que nombra un nodo que se ve, para el ⚙ de su celda; con `empresa.tipos_cambio.gestionar`»); (2) exportar la regla de lo tipeado de un tipo de cambio (`valorTipeado`, `VALOR_INVALIDO`) por `empresa/client.ts`, para que el ⚙ no la copie. **Este PR no marca `integrado 4.20`.**

<!-- paso:4.24-1a -->

## 2026-11-06 — Paso 4.24-1a

- **El 4.24 se parte en cuatro, en cadena:** 4.24-1a (la base: enviar pide ver antes del candado, también la genérica; enviar por lote con versión; la lista
  y el lote por cursor; cierra 4-68), 4.24-1b (la base: restaurar por lote sin 23505, también la genérica; purgar; la purga automática con `medir-jobs.sql`;
  cierra 4-70), 4.24-2 (la pantalla y el enlace junto a «Nueva») y 4.24-3 («Enviar a la papelera» con «Deshacer» en la guardada). Con un commit por intención
  la base sola eran 6 de código. Plan: `.piloto/planes/4.24.md` (lo que el 1b no debe perder, en «Lo que sigue en el 4.24-1b»).
- **Para el coordinador (o el A), en `docs/PLAN.md`, fila del 4.24:** «Se parte en **4.24-1a** (la base: enviar pide ver antes del candado, también la
  genérica; enviar por lote con versión; la lista y el lote por cursor; cierra 4-68), **4.24-1b** (la base: restaurar por lote sin 23505, también la genérica;
  purgar; la purga automática con `medir-jobs.sql`; cierra 4-70), **4.24-2** (la pantalla y el enlace junto a «Nueva») y **4.24-3** («Enviar a la papelera» con
  «Deshacer» en la guardada)». En `docs/plan.yaml` el id `4.24` se reemplaza por cuatro, carril `c`: `4.24-1a` (el `depende_de` de hoy; riesgo `rojo`;
  `verificacion` «Nivel 2 + cadena db + db:carreras + db:medir:volumen»; `terminado` «Enviar a la papelera de cotizaciones pide ver antes del candado, también
  la genérica; enviar por lote con versión; la lista de lotes por cursor medida con volumen; cierra 4-68»; `modulos` `[docs/]`), `4.24-1b` (`['4.24-1a']`;
  `rojo`; «Nivel 2 + cadena db + db:carreras + medir-jobs.sql»; «Restaurar por lote no da 23505, también la genérica; purgar por lote; la purga automática
  incluye cotizaciones; cierra 4-70»; `[docs/]`), `4.24-2` (`['4.24-1b']`; `ambar`; `features/papelera/`, `entities/papelera/`, `infra/papelera/`,
  `pantallas/papelera.ts`, `pantallas/papelera-listado.ts`, `areas/papelera/`, `src/app/(app)/cotizaciones/papelera/`,
  `scripts/guardas/paginas-en-la-base-papelera.ts` y `docs/`) y `4.24-3` (`['4.24-2']`; `ambar`; `features/papelera/`, `pantallas/papelera-cotizacion.ts` y
  `docs/`). El `4.25` pasa de `['4.24']` a `['4.24-3']`. **Este PR no marca `integrado 4.24`:** integra sólo el 4.24-1a.
- **Para el coordinador, en 4-64** (archivos de más de 300 líneas que crecen): `supabase/tests/medir-escala.sql` 892 → 954, `auditoria-leads.sql` 436 → 441 y
  `cotizaciones-visibilidad.sql` 1.921 → 1.922. Y en 4-96: en la corrida entera de `pnpm test` de este paso, T13 de `mapa.test.ts` tardó 10.369 ms (sola, 3,2 s).
- **Lo que contestó la persona** (compuerta `datos`, «aprobar»: la recomendada en cada una). El 1b y el 2 las leen de acá.
  - P1 · Las RPC propias se llaman `cotizaciones_papelera_enviar|listar|lote|restaurar|purgar`, como las de leads y vehículos (la migración empieza por `papelera_`).
  - P2 · Las genéricas `papelera_enviar|restaurar|purgar` se quedan, con su firma, su retorno y sus textos, y pasan por los mismos ayudantes (enviar en el 1a;
    restaurar y purgar en el 1b). Las llaman `cotizacion_marcar_final()` y archivos del A; el A las retira cuando nadie las llame.
  - P3 · Una final la manda a la papelera quien puede guardarla: `cotizaciones.ver` y `cotizaciones.final.gestionar` del origen. Una preventa, ver y `editar` por
    su alcance, o `moderar`.
  - P4 · Una cotización con comprobante: se decide en el 4.26. Hoy enviar la acepta y la purga (1b) la deja «bloqueada» por la FK `restrict`.
  - P5 · (1b) Restaurar una N+1 cuya anterior ya tiene otra viva, o una final cuando el vehículo ya tiene otra: queda «pendiente» con su motivo y el resto
    del lote se restaura; la genérica (todo o nada) da PT409 con ese texto.
  - P6 · El lote dice de cada cotización número, título («Cotización #n» sin título), clase, origen y fecha: nada que la RLS esconda a quien tiene la clave y no la ve.
  - P7 · (1b) Restaurar una cuyo vehículo o lead está en la papelera o ya se purgó: «pendiente» con su motivo, atrapando también 23514 por cotización.
  - P8 · La papelera de cotizaciones lista sólo lotes `tipo = 'cotizaciones'`; la pantalla (4.24-2) dice que las que se fueron con su vehículo vuelven al
    restaurar el vehículo, en su papelera.
  - P9 · `cotizacion_marcar_final()` llama a la genérica con los derechos de quien marca: desde este paso, si no ve una preventa viva del vehículo, no marca y
    recibe 42501 «No tienes acceso a esta cotización.» (el de lo inexistente). El 4.25, que la reescribe, decide su texto.
- **Lo no obvio:**
  - Mandar a la papelera mira ver **antes** de tomar la fila y otra vez sobre la fila tomada, como guardar (4-34): quien no la ve recibe lo mismo que con una
    inexistente, en el texto y en el momento, y nunca espera su candado. La fila se toma `for no key update`, como `marcar_final`: `for update` choca con el
    `for key share` de las hijas (comentarios, revisiones, la N+1). En `db:probar` (una sesión) la espera no se ve: la prueba mira el orden en el cuerpo de la
    función (E10) y la carrera es del A (abajo).
  - La genérica es todo o nada y ya no saltea en silencio, con `moderar`, un id inexistente o ya en la papelera. Conserva sus textos (los esperan `matriz-leads.sql`,
    `humo.sql` y las carreras) salvo el de permiso, que pasa de «Sin permiso para eliminar la cotización <id>» a «No tienes permiso para enviarla a la papelera.»
    (nadie lo esperaba). Su lote queda con el resumen completo (`cantidad`, `restaurados`, `purgados`) y su versión, como el de vehículos.
  - La propia acepta 22023 («Falta la versión…») en `rechazados` con su texto, además de PT409, 42501, 23514 y P0001: también es nuestro.
  - «Le queda alguna en la papelera» es una sonda por lote (`(select true … limit 1)`) y no el `exists` de vehículos: con pocas en la papelera, el plan genérico
    del `exists` es un semi join que lee entero `cotizaciones_lote_papelera_idx` (crece con la papelera, no con la página). Medido en este paso
    (`.piloto/salidas/4.24-1a/forma-explorar.txt`: el `exists` en el plan genérico, sin cursor y por el cursor; `forma-variante.txt`, la sonda); con 20.000 más en la papelera el `exists` se vuelve sonda, la variante es sonda siempre.
  - `medir-escala.sql` mide la forma de la lista con una sentencia preparada (`v_todo` y `v_yo` como parámetros, el plan genérico): con literales el planificador
    elige `lotes_papelera_creado_por_idx` para Ana y un recorrido de la tabla para la dueña, que no es lo que corre (la 1.ª corrida, con literales; su salida se
    sobrescribió al repetir la medición: `escala()` fuerza el plan genérico, pero con literales en el texto no hay parámetros). Su sección va después de las demás
    mediciones (no cambia ninguna) y antes de `$violaciones$`, para que su violación haga caer la corrida.
  - Las pruebas de `supabase/tests/areas/papelera/` no usan a la dueña de `humo.sql`: con `SOLO=` no corre. Cada archivo crea «la jefa».
  - `database.types.ts` lista también los ayudantes `_…` (el generador no mira los grants): `_cotizacion_a_papelera` aparece aunque nadie de la app lo ejecute.
- **Abiertos nuevos para el 4.25 (del C):** `cotizacion_marcar_final()` toma su cotización `for no key update` sin mirar ver (quien no la ve espera su candado,
  y quien tiene `final.gestionar` marca final una que no ve: el defecto de 4-34 en otra puerta) y toma `for no key update` también las preventas que no ve antes
  de llamar a la genérica. El 4.25: pedir ver antes del candado propio, no tomar las preventas que no ve, y el texto de P9.
- **Necesita del carril A:**
  1. `vehiculos_papelera_restaurar()` restaura las cotizaciones del lote del vehículo sin mirar `cotizaciones_encima_unica` ni `cotizaciones_final_por_vehiculo`:
     sale «Choca con otro registro que ya existe.» para el vehículo entero.
  2. Las carreras en `scripts/carreras/`: quien no ve la cotización no espera su candado al enviarla, por la propia y por la genérica, mientras otra sesión la
     tiene tomada (como `cotizaciones-guardar.mjs:470`; demuestra la mutación M18); enviar con versión contra guardar; y una que cambia de clase entre la mirada
     sin candado y la de la fila tomada (M20, equivalente en una sesión).
  3. El `aplicado_en` de `cotizaciones.papelera.purgar` en `supabase/seed.sql` y en su catálogo pasa a nombrar `cotizaciones_papelera_*` (T1 de
     `cotizaciones-papelera-permiso.sql` fija hoy el texto).
  4. Retirar las genéricas cuando el 4.25 deje de llamar a `papelera_enviar`.
  5. La ficha `src/modules/cotizaciones/CLAUDE.md` suma las RPC de la papelera.
  6. En `docs/ESTADO.md`, la deuda «La papelera de cotizaciones no tiene versión ni purga automática (4.24)» pasa a «no tiene purga automática ni restaurar o
     purgar con versión (4.24-1b)»: `papelera_restaurar|purgar(p_lote)` siguen sin versión.
  7. `vehiculos_papelera_listar()` y `leads_papelera_listar()` tienen el mismo `exists`; sin medir si su plan genérico, con poco en la papelera, también lee
     entero el índice del lote (en la de cotizaciones sí: arriba). La sonda por lote lo evita.

<!-- paso:4.24-1b -->

## 2026-11-06 — Paso 4.24-1b

- **Lo que contestó la persona** (compuerta `producto`, la recomendada en las tres; después la `datos`, «aprobar»). El 4.24-2 las lee de acá.
  - P10 · Quien no envió el lote y no tiene `cotizaciones.papelera.purgar` recibe 42501 «Sólo lo restaura quien lo envió o quien puede vaciar la papelera.»
    (el texto de vehículos), antes de tomar el lote.
  - P11 · Quien envió el lote lo restaura entero aunque ya no vea una de sus cotizaciones: restaurar deshace su propio envío, como en vehículos y leads.
  - P12 · Una cotización de la papelera cuyo vehículo o cliente se purgó no se distingue de una que nunca lo tuvo (las FK son `set null`). Se resuelve en el A:
    purgar un vehículo o un lead queda «bloqueado» mientras una cotización de la papelera lo nombre («Necesita del carril A», 1). Hasta entonces, la preventa
    o la cotización cuyo vínculo se purgó vuelve sin él; la final sin vehículo queda pendiente («Su vehículo ya no existe.»).
- **Lo no obvio:**
  - Restaurar toma la cotización `for no key update` (no choca con el `for key share` de sus hijas) y purgar la toma `for update`: el `delete` pide ese
    candado, y tomarlo de entrada evita subirlo a mitad. Se aparta de lo que el plan del 1a dejaba para el 1b («`for no key update`» para las dos).
  - El ayudante de restaurar toma `for key share` los vehículos y después los leads del lote, por id, **antes de tomar cotización alguna**: es el orden de quien
    los purga (primero su fila; la FK `set null` actualiza después la cotización). Al revés, restaurar contra purgar el vehículo o el lead es un 40P01. Lo
    mostró un recorrido de tres conexiones contra la base del carril (`.piloto/salidas/4.24-1b/carrera.mjs`): con este orden no hay
    interbloqueo, B purga y la preventa vuelve sin vínculo (`carrera-verde.txt`); con el orden de antes (M6), 40P01 en K1 y K2 (`carrera-m6.txt`). Hasta que
    el A lo pase a `scripts/carreras/`, el CI sólo lo protege por R9, que mira el orden en el texto de la función.
  - La purga automática toma el lote de cotizaciones `for no key update skip locked`: el job, que ya retiene las filas de los lotes de vehículos o leads que
    purgó en su transacción, esperaría el lote que tiene un restaurar que a su vez espera uno de esos vehículos o leads. Saltado, vuelve en la corrida siguiente.
  - La genérica de restaurar es todo o nada (con algo pendiente, PT409 con el motivo de la primera por id, y nada vuelve) y la de purgar ya no: lo bloqueado se
    queda en la papelera y el lote sigue pendiente. Las dos conservan firma, retorno y textos (P2). La genérica de restaurar ya no vuelve a sellar un lote ya
    restaurado ni registra otra actividad (devuelve 0), y su actividad lleva el detalle `{tipo, cantidad}` en `p_detalle`, como la propia.
  - Una cotización con comprobante da **23001** (`restrict_violation`, la FK es `on delete restrict`), no 23503: el ayudante de purgar atrapa los dos. El de
    vehículos atrapa sólo 23503, pero allí `_vehiculo_motivo_de_bloqueo` ya bloquea un vehículo con comprobante antes de borrar.
  - La genérica de restaurar conserva de antes `v_por <> (select auth.uid())` (la propia usa `is distinct from`): sin sesión no pide la clave, como hoy. Con
    `creado_por` nulo quien no tiene la clave no recibiría el 42501, pero no se llega: enviar siempre graba quién y la FK a `perfiles` no es `set null`.
  - El ayudante de restaurar atrapa también 23514 con su texto (P7: la red por si `cotizacion_validar` suma reglas); la prueba R5b lo fija con un trigger
    temporal.
  - `cotizaciones_adjuntos_ruta_idx` (el disparador 6 del Nivel 2): cada adjunto purgado pasa por `storage_refcount('cotizaciones', ruta)`, que sin índice
    recorría la tabla. `medir-jobs.sql` lo mide en una sección al final, antes del `rollback` (lo de antes no cambia): 100.000 cotizaciones en 500 lotes, cada
    una con una revisión y un adjunto, más viejas que los lotes de leads; 10.000 por corrida en 8.099, 9.207 y 8.276 ms (presupuesto 25.000). Sin el índice,
    (a) cae por el `Seq Scan` del refcount; con el job de antes, (c) cae porque purga leads y ninguna cotización (`medir-jobs-rojo-head-{a,c}.txt`).
  - En las pruebas de `areas/papelera/` con `SOLO=`, la primera cuenta de cada bloque nace dueña (no corre `humo.sql`): una prueba de «sin la clave» crea antes
    a quien la tiene (PU4). Los teléfonos de los leads de prueba son fijos (`telefonos-en-pruebas.test.ts` prohíbe `random()`).
- **Necesita del carril A:**
  1. P12 (a): `_vehiculo_motivo_de_bloqueo` y `_lead_motivo_de_bloqueo` dan «Tiene cotizaciones en la papelera.» mientras una cotización de la papelera de
     cotizaciones los nombre. Arregla además el defecto de hoy: una **final** en la papelera de cotizaciones impide purgar su vehículo (la FK `set null` corre
     `cotizacion_validar` y da 23514, que `_papelera_purgar_vehiculos` no atrapa: cae la purga entera del lote; el job lo reintenta cada hora con un `warning`).
  2. Las carreras en `scripts/carreras/`: K1 y K2 (restaurar contra purgar el vehículo o el lead; el esqueleto en `.piloto/salidas/4.24-1b/carrera.mjs`);
     restaurar una versión nueva contra cotizar encima la misma anterior; restaurar contra mandar su vehículo o su lead a la papelera; purgar contra restaurar el
     mismo lote; la propia contra la genérica; y el job contra restaurar (el `skip locked`). **Riesgo que queda:** restaurar toma vehículos por id y después
     leads; el job purga lotes de vehículos y de leads por `creado_en` en una sola transacción y retiene lo tomado de cada uno: un job que tiene el vehículo 5 y
     pide el 1 contra un restaurar que tiene el 1 y pide el 5 es un 40P01 (si cae el job, su `exception when others` lo vuelve un `warning`; si cae restaurar,
     la persona ve un error técnico). Medirlo y, si se da, decidir un orden común.
  3. El job toma siempre los 50 lotes vencidos más viejos: 50 que no se pueden purgar del todo (un pago, un portal, un comprobante) ocupan todas las corridas y
     los más nuevos no se purgan nunca. Vale para los tres tipos; es lo de hoy.
  4. `documentos.ruta` no tiene índice y `_papelera_purgar_vehiculos` encola documentos por refcount: el mismo recorrido por ruta en la papelera de vehículos.
  5. En `docs/ESTADO.md` › «Deuda aceptada» sale la frase de que la papelera de cotizaciones no tiene versión ni purga automática: restaurar y purgar ya
     van por lote con versión y la purga automática la vacía.
  6. La ficha `src/modules/cotizaciones/CLAUDE.md` suma `cotizaciones_papelera_restaurar|purgar` (con lo pedido en el 1a, 5); el `aplicado_en` de
     `cotizaciones.papelera.purgar` sigue pendiente del 1a, 3.
  7. En `supabase/tests/volumen/sembrar-cotizaciones.sql` (o RENDIMIENTO › jobs, ya anotado): desde este paso el job purga los lotes vencidos de cotizaciones
     de la siembra.
- **Para el coordinador (o el A):** el 4.24-1b cierra **4-70** (en la propia y en la genérica); con 4-68 (1a) quedan cerrados los dos del `terminado` del 4.24.
  El PR no marca `integrado 4.24`: integra sólo el 4.24-1b. En **4-64**: `auditoria-leads.sql` 441 → 445, `numero-global.sql` 411 → 413 (los dos ya pasaban de
  300). `medir-jobs.sql` 114 → 211.

<!-- paso:4.24-2 -->

## 2026-11-06 — Paso 4.24-2

- **Lo que contestó la persona** (compuerta `producto`, la recomendada en las tres; después la `datos`, «aprobar»). El 4.24-2b y el 4.24-3 las leen de acá.
  - P2 · La papelera de cotizaciones, y el enlace de «Papelera» en `/cotizaciones`, los ve quien puede enviar cotizaciones a la papelera en algún origen
    (`cotizaciones.editar`, `.moderar` o `.final.gestionar`) o vaciarla (`cotizaciones.papelera.purgar`), como en vehículos y leads. Los lotes que ve los decide la base.
  - P3 · Por qué una cotización no volvió lo dice el aviso del resultado de restaurar (hasta tres motivos y «Y N más.»); la fila no lo dibuja.
  - P4 · La fila no muestra el cliente ni el vehículo: sólo número, título, clase, origen y fecha.
- **Partición** (decisión del orquestador, tras la 1.ª auditoría del plan): purgar necesita una fila en el registro de `<Confirmar>` (`scripts/guardas/confirmar-con-url.ts`),
  que es del A; el C no puede crearla (la guarda de carriles hace caer el PR). El 4.24-2 queda sin purgar y **purgar es el 4.24-2b** (borrador:
  `.piloto/planes/4.24-2b.borrador.md`).
- **Lo no obvio:**
  - Textos: la cabecera con la clave dice «Se purga solo cuando vence.» (el 2b suma «, o antes si lo purgas»); la línea de las que se fueron con su vehículo va siempre
    (P8 a) y el enlace a la papelera de vehículos sólo a quien puede abrirla (`puedeAbrirLaPapelera` de vehículos, compuesto en `src/app`: `cotizaciones` no importa
    `vehiculos`). «Envío de una» / «Lote de N · quedan M», «Restaurar el lote» sólo si quedan más de una. Restaurar no pregunta ni ofrece «Deshacer»: enviar de nuevo lo deshace.
  - La fila del lote se parte en `cotizacion-en-papelera.tsx` (el lote pasa de 100 líneas con ella).
  - El presupuesto de JS de la ruta (440 KB; medido 417,9) y los topes de la página (3.000 nodos; 360.000 B, medido 342.808) viven en el spec, porque `presupuestos.ts` es del A. Los
    previos del plan no alcanzaron en bytes: 150.000 B era una suposición (≈ 600 B por fila) y cada fila pesa ≈ 2,5 KB en el documento (HTML con sus clases y payload de RSC;
    el reparto exacto no se midió), contra 91.005 B del marco con la papelera vacía. Lo que protege la lista es que no crezca con el lote: con 21 o con 200 por lote, los mismos
    1.119 nodos y los bytes a ±0,1 %. Se fijó lo medido más un 5 %. Los 380 KB previos de JS tampoco: casi todo es el marco (`/perfil` 417,2).
  - La limpieza del spec va en un orden: cotizaciones del origen, lotes, leads, personas y roles. Un lote no se borra mientras una cotización lo nombra
    (`cotizaciones_lote_papelera_id_fkey`) ni una persona mientras un lote la nombra; el primer intento falló en el `afterAll` y dejó la base sucia para el siguiente.
  - Cambiar de persona en la misma página pide `page.context().clearCookies()` antes de `entrar`: `{ fresco: true }` no descarta la sesión y `/ingreso` rebota.
  - El lote en `/cotizaciones/papelera` se reconoce en los e2e por una cotización que no se restaura primero (el filtro de un `getByRole` se vuelve a evaluar).
- **Necesita del carril A:** 0. **Bloqueante.** `scripts/guardas/paginas-en-la-base.test.ts` › «sin nada de la papelera, es el núcleo» da `RPC_PAGINADAS` igual a `RPC_PAGINADAS_DEL_NUCLEO` con el registro
  de la papelera real: falla desde que el registro de cotizaciones (4.24-2, commit 1: `p_tope` y `p_primeros`) dejó de estar vacío. Hay que mockear
  `./paginas-en-la-base-papelera` con `RPC_PAGINADAS_DE_LA_PAPELERA: []` en ese caso (el C no puede editarlo: es del A). Hasta entonces, `pnpm test` cae en ese caso (y el CI del PR).
  1. Para el **4.24-2b**: el registro `scripts/guardas/confirmar-con-url-papelera.ts` (vacío, sumado en `confirmar-con-url.ts` tras el núcleo y la fórmula, su caso en
     `confirmar-con-url-areas.test.ts` con el área simulada —la lección del 4.20-2c, `c3ec9a11`—, y el archivo en `c.dueno_de` y en los `modulos` del 4.24-2b). Si no está cuando le
     toque al 2b, el 2b para en compuerta `afuera`.
  2. La ficha `src/modules/cotizaciones/CLAUDE.md` › «Entra y sale» suma `/cotizaciones/papelera` y nombra `areas/papelera/CLAUDE.md` (con lo pedido en el 1a, 5, y el 1b, 6).
  3. Mudar el presupuesto de JS de la ruta (`PRESUPUESTO_DE_JS_DE_LA_PAPELERA_EN_KB`, 440) y los topes de la página a `e2e/soporte/presupuestos.ts`.
  4. `diasParaLaPurga`, `textoDePurga` y el resumen del resultado de restaurar quedan en tres módulos (leads, vehículos, cotizaciones): a `src/shared/lib` cuando el A lo decida.
  5. `RUTAS.papeleraDeCotizaciones` en `src/shared/lib/rutas.ts` (hoy `RUTA_DE_LA_PAPELERA_DE_COTIZACIONES` en `entities/papelera/ruta.ts`), si quiere todas juntas.
- **Para un paso de base del C, si la persona lo pide:** P3 (`motivo_de_restaurar` y `motivo_de_bloqueo` en el JSON del lote) y P4 (`lead_id` y `vehiculo_id` en cada cotización del lote).
- **Para el coordinador (o el A):** en `docs/PLAN.md`, fila del 4.24: «el 4.24-2 se parte en 4.24-2 (la pantalla con restaurar y el enlace, sin purgar) y 4.24-2b (purgar con
  `<Confirmar>` por URL: necesita del A el registro `confirmar-con-url-papelera.ts`)». En `docs/plan.yaml` (hoy sólo tiene `'4.24'`): el `4.24-2` como lo pidió el 1a
  (`docs/pasos/4.24-1a/decisiones.md`) y un `4.24-2b` con `depende_de: ['4.24-2']` (`ambar`; `modulos`: `features/papelera/`, `entities/papelera/`, `infra/papelera/`,
  `areas/papelera/`, `scripts/guardas/confirmar-con-url-papelera.ts`, `docs/`); el `4.24-3` sigue en `['4.24-2']` y el `4.25` pasa a `['4.24-3', '4.24-2b']`. **Este PR no
  marca `integrado 4.24`:** integra sólo el 4.24-2 (`parcial: true`).
- **En 4-64:** ninguno de los archivos nuevos pasa de 300 líneas (el más largo, el spec, 250).

<!-- paso:4.24-2b -->

## 2026-11-06 — Paso 4.24-2b

- **Lo que contestó la persona:** compuerta `datos` del plan: «Aprobar y esperar al A». Compuerta `afuera` (P1), en dos vueltas: primero «Seguir con el 4.24-3
  mientras»; después el registro llegó a `main` (`2f87361d`, PR #39) y el paso se ejecutó con el plan aprobado.
- **Lo que se aprobó en permisos:** dos puertas en la app, ninguna en la base. La action mira `cotizaciones.papelera.purgar` antes de llamar. La revisión de
  `?panel=purgar` también la mira: leads no lo hace, pero aquí quien no purga ve sus propios lotes y una URL escrita a mano le abriría el diálogo.
- **Lo no obvio:**
  - Mismo rechazo, dos textos. La app dice «No tienes permiso para purgar la papelera de cotizaciones.» (nombra su papelera) y la base, «No tienes permiso para
    purgar la papelera.» (la misma para todas). En la app es una constante, `MENSAJE_SIN_PERMISO_DE_PURGAR`, que usan la action y la revisión de la URL.
  - «Purgar» va con `variant="destructive"`, como en leads y vehículos, y no `outline` como decía el plan: lo irreversible se ve distinto en las tres papeleras.
    El orden es «Restaurar» y después «Purgar» (la destructiva al final).
  - **El tope de bytes de E8 pasa de 360.000 a 475.000 B.** Con la dueña, la página 1 dibuja 100 «Purgar» y 5 «Purgar el lote» y mide 452.015 B: ≈ 1 KB por
    botón (342.808 B en el 4.24-2). Casi todo son las 598 letras de clases de la base de `Button` (`src/shared/ui/button.tsx`, del A). Medido el largo de las
    clases por variante: `ghost` ahorraría ≈ 107 por botón (≈ 11 KB, 2,5 %) y `outline` ≈ 44. No compensa perder el tono de lo destructivo, así que el tope
    queda en lo medido más un 5 %. La razón: una papelera es una pantalla de trabajo de quien la vacía, sin SEO, y lo que la protege es que no crezca con el lote.
    Con 21 o con 200, mide lo mismo (±0,1 %). Nodos 1.329 de 3.000; JS 424,5 de 440.
  - `resumenDeRestauracion` y `resumenDePurga` comparten un `resumir()` con sus palabras (el mismo esquema que leads). `usePapelera` avisa el resultado de
    purgar; el error lo dice el diálogo, y por eso `purgar` devuelve el `Resultado`.
  - Las acciones de un lote y de una fila salen de `<AccionesDePapelera>`, como `Acciones` de leads. El lote sólo las ubica.
  - La prueba de la pantalla monta `NuqsTestingAdapter`, porque ahora la pantalla lee `?panel=purgar`.
  - La limpieza del soporte e2e borra primero los comprobantes de la serie `E2E-PAPELERA` y su contador. Un comprobante frena el borrado de su cotización (`restrict`)
    y nombra a quien lo emitió: sin esto caían el `afterAll` y el `prepararPapelera` del proyecto `movil`. `irALaPapelera`, `lotesDeLaPagina` y `filasDe` pasaron al
    soporte para los dos specs.
- **Para el coordinador (o el A):**
  - 4-68 y 4-70 (`docs/PLAN.md`) ya están cerrados en la base: 4-68 en el 4.24-1a (`docs/pasos/4.24-1a/bitacora.md`) y 4-70 en el 4.24-1b
    (`docs/pasos/4.24-1b/decisiones.md`). Se quitan al integrar el 4.24.
  - El 4.24-2b (`depende_de: ['4.24-2']` y el chore del registro) purga desde `/cotizaciones/papelera`. El 4.25 depende de `4.24-3` y de `4.24-2b`.
  - Este PR **no marca `integrado 4.24`**: el 4.24 sigue con el 4.24-3 («Enviar a la papelera» con «Deshacer»).
  - Sigue abierto para un paso de base del C, si la persona lo pide: el motivo de lo bloqueado en la fila del lote (P3 del 4.24-2).

<!-- paso:4.20-3d -->

## 2026-11-07 — Paso 4.20-3d

- **Las decisiones de la persona** (compuerta `producto`, las cuatro «aprobar»): **P1**, el formulario sólo en la hoja nueva; en la guardada, el texto de Monedas y «Esta cotización conserva el tipo de cambio con que se guardó.», sin lectura (la guardada calcula con los tipos de cambio que congeló: cambiar el de la empresa desde ella no la mueve). **P2**, se acepta el `revalidatePath(inicio, 'layout')` de `guardarTipoCambio` sin tocar `empresa`: la hoja nueva se vuelve a abrir con otra abierta, la celda dice el valor nuevo, lo tipeado vuelve con el aviso «Recuperamos…» y «Descartar», y guardar no da el D2. **P3**, «Tipo de cambio de <celda>» para una celda de tipo de cambio; una constante sigue con «Valor por defecto de <celda>». **P4**, con el Modo Live «Valor nuevo» es de contraseña con las marcas de los gestores, como en una constante, y «Valor de hoy» se tapa por `<Monto>`.
- **Sólo tres claves.** El ⚙ manda `{ id, actualizadoEnEsperado, valor }`: la action de `empresa` toca lo que viaja, y el ⚙ no puede cambiar el nombre, `activo` ni el por defecto. La esperada es la `actualizadoEn` de la última fila leída, con sus microsegundos (nunca por `Date`); tras un PT409 se manda la nueva sólo después de «Volver a leer». Cada elección mala cae en una prueba: la esperada vieja, E2 contra la base y el caso del PT409 del hook; claves de más, «sólo esas claves» (`toStrictEqual`); el valor leído en vez del tipeado, E1 por SQL; otro `id`, E1 (cambia la fila propia y no `oficial`).
- **El remonte (V10, que era suposición) se midió** en E1, en los dos proyectos: tras la respuesta buena el panel queda cerrado (sin `ajuste=` en la URL), la hoja relee y hay una sola lectura del tipo de cambio.
- **Desactivado, sin formulario**: la hoja no usa un tipo de cambio inactivo (`_cotizacion_armar()`, `base.sql:1292`, `and t.activo`), así que cambiarle el valor desde la hoja no mueve nada; se activa en Monedas, y el panel lo dice.
- **4-33** no lo cierra (del A): la hoja desde la que se cambia se vuelve a abrir con otra abierta y no da el D2; las otras hojas abiertas sí lo dan al guardar, como hoy con Monedas.
- **Microdecisiones:** los textos de C4 a C8 del plan (`.piloto/planes/4.20-3d.md`); mientras lee la primera vez, sólo el esqueleto «Cargando el tipo de cambio» (el nombre del formulario llega con la lectura) y, al releer, el formulario con el valor de hoy en esqueleto y el campo apagado; `EsqueletoDelValor` recibe su letrero; las marcas de los gestores en un solo archivo del área.
- **Necesita del carril A:** (1) `src/modules/empresa/CLAUDE.md` › `client.ts`: «nadie lo usa todavía» → «lo usa el ⚙ de un tipo de cambio de la hoja (4.20-3d)»; (2) `src/modules/cotizaciones/CLAUDE.md` › «Los huecos»: «una celda de tipo de cambio abre «Tipo de cambio de <celda>»: en la hoja nueva lee la fila con `formula_tipo_cambio_del_nodo()` y la cambia con `guardarTipoCambio` (la hoja se reabre con el valor nuevo); en la guardada dice que conserva el suyo», y la RPC en «Tablas» (sigue del 3c); (3) exportar de `empresa` `valorTipeado`, `textoParaEditar` y `decimalesDeValor` (el área copia las tres: `tipoCambioTipeado`, `textoInicialDeTipoCambio`, `decimalesDeTipoCambio`); (4) el texto del botón ⚙ de la XCell para un tipo de cambio (sigue «Cambiar el valor por defecto de <celda>», `src/shared/ui/xcell`; pulido). En `docs/PLAN.md`, fila del 4.20: la línea «Llena el hueco de la hoja con un `Proveedor` (el ⚙ de una celda …)» queda hecha también para los tipos de cambio. Del 4.20 queda el 4.20-4 (A); **este PR no marca `integrado 4.20`**.

<!-- paso:4.20-4 -->

## 2026-11-07 — Paso 4.20-4

- **Aviso para quien integre el PR de `b/4.20`:** el 4.20 del B queda terminado salvo la vigencia y el vehículo obligatorio, que pasan al A (4.20-4a y 4.20-4b). **Antes de integrar el PR de `b/4.20`, sumarlos a `docs/plan.yaml`** (abajo): al fusionarse, `sincronizar` anota integrado el 4.20 solo (`scripts/coordinador/coordinador.mjs:170-173`) y libera el 4.21 (`plan.yaml:422`); sin los dos ids nuevos, la vigencia queda sin paso en ningún lado.
- **Por qué no lo hace el B:** hoy nada escribe `ajustes_empresa.vigencia_dias` ni `ajustes_empresa.vehiculo_obligatorio_al_cotizar` (`empresa_guardar_ajustes()` pide `empresa.ajustes.gestionar` y no las nombra, `base.sql:10003-10032`; sólo un soporte de e2e las cambia por SQL). Escribirlas pide una RPC nueva con su migración y la lectura, la action y el formulario de `empresa`: fuera del `dueno_de` del B y de sus migraciones (`formula|diseno|tablas`). Llamar `formula_…` a la migración pasaría la guarda (mira sólo el nombre, `scripts/guardas/carriles.mjs:82-84`), pero escribe una tabla de `empresa` y el dominio es el prefijo de sus tablas (`.claude/rules/migraciones.md`): descartado. Ya estaba anotado del A en el 4.20-1 (`docs/DECISIONES.md:2023`).
- **Las decisiones de la persona** (compuerta `producto`, las cuatro «aprobar»): **P1**, del A en dos pasos: **4.20-4a** (la RPC con su catálogo, la lectura, la regla de quién cambia, la action y las pruebas de la base; rigor máximo, Nivel 1 + cadena db) y **4.20-4b** (el formulario, la pestaña y el hub; pantalla pura, Nivel 1). **P2**, los cambia `cotizaciones.configurar` **concedida en todos los orígenes** (la concesión sin origen; el dueño la tiene): un ajuste de toda la empresa no lo cambia quien configura un origen. Es una regla nueva en la base (`tiene_permiso()` sin origen hoy es «en alguno»). **P5**, una pestaña «Ajustes» al final de Configuración › Cotización (`?seccion=ajustes`), para que quien sólo configura la fórmula siga cayendo en «Fórmula». **P6**, la ve quien tiene `cotizaciones.configurar` en algún origen; quien no cumple P2, con los campos apagados y el motivo «Cambiar estos ajustes pide configurar el cotizador en todos los orígenes.». P3 (RPC nueva `empresa_guardar_ajustes_de_cotizacion()` con su `p_actualizado_en_esperado`, o sumarlas a la de Empresa) queda para la compuerta `datos` del 4.20-4a, que también confirma P2 como permiso. P4 se retiró: que cambiar la vigencia mueva las ya guardadas lo decide D1 (`docs/PLAN.md:41`, `docs/DECISIONES.md:863`).
- **El plan del A** está en `docs/pasos/4.20-4/plan-del-a.md` (versionado; C1–C10, archivos, pruebas T1–T8, mutaciones M1–M10, docs y commits de cada parte).
- **Cómo se anota** (`docs/plan.yaml` y `docs/PLAN.md`, lo escribe la persona o el A):
  - El **`4.20` queda de una pieza**: la anotación del 4.20-1 que lo partía en `4.20-1`…`4.20-4` (`docs/DECISIONES.md:2024`) **no se aplica**, porque el coordinador ya lleva el `4.20` publicado con su PR y el `4.21` depende de él. Su `terminado` (`plan.yaml:419`) pasa a «El ⚙ y revertir publican la N+1 desde la publicada sin pisar el borrador; Configuración › Cotización › Fórmula; el ⚙ en la hoja; cierra 4-36 y la parte de 4-8 del ⚙ y de revertir; la vigencia y el vehículo obligatorio, al 4.20-4a y 4.20-4b (A)».
  - **`4.20-4a`**, carril `a`, `depende_de: ['4.15-4', '4.15-5', '4.15-6c']` (no toca nada del B), riesgo `rojo`, verificación `Nivel 1 + cadena db`, `modulos` de las filas 4a de «Archivos» del plan del A, `terminado`: «La base guarda la vigencia y el vehículo obligatorio con `cotizaciones.configurar` en todos los orígenes y su versión, y `empresa` los lee y los guarda por action».
  - **`4.20-4b`**, carril `a`, `depende_de: ['4.20-4a', '4.20']` (edita `pestanas.ts` y `page.tsx` de `src/app/(app)/configuracion/cotizacion/`, que son del 4.20 del B), riesgo `ambar`, verificación `Nivel 1`, `modulos` de las filas 4b, `terminado`: «La vigencia y el vehículo obligatorio se cambian en Configuración › Cotización › Ajustes».
  - `docs/PLAN.md`, fila del 4.20: «Se partió en 4.20-1, 4.20-2 (a–c) y 4.20-3 (a–d), del B, y 4.20-4a y 4.20-4b (vigencia y vehículo obligatorio, **del A**)», y dos filas 4.20-4a y 4.20-4b que citan `docs/pasos/4.20-4/plan-del-a.md`.
- **Necesita del carril A:** (1) el 4.20-4a y el 4.20-4b según `docs/pasos/4.20-4/plan-del-a.md`; (2) la anotación de `plan.yaml` y PLAN de arriba, si no la hizo la persona al integrar; (3) los siete abiertos que el `terminado` del 4.20 nombraba, todavía con «(4.20)» en `docs/PLAN.md`: **4-36** cerrado (4.20-1); **4-8**, la parte del ⚙ y de revertir cerrada (4.20-1) y la del borrador al 4.21; **4-33**, **4-19** y **4-20** al A; **5a-29** y **5a-30** a la Fase 9; **4-30** al 4.22; (4) `src/modules/empresa/CLAUDE.md:24` dice que `AjustesEmpresa` trae `vehiculoObligatorioAlCotizar` y es falso (`src/modules/empresa/entities/ajustes-empresa.ts:6-35`: la lee la base, no el tipo): sacar ese inciso y, con el 4.20-4a, nombrar `AjustesDeCotizacion`. Los textos de fichas que dejó el 4.20-3d siguen en `docs/pasos/4.20-3d/decisiones.md`.

<!-- paso:4.19-1 -->

## 2026-11-07 — Paso 4.19-1

- **El 4.19 se parte en cuatro, en cadena:** 4.19-1 (la base: la versión esperada y el candado por origen, descartar, la nota), 4.19-2 (`validarPlantilla()` de TS y el aviso del
  tono), 4.19-3 (el editor) y 4.19-4 (la vista previa en vivo). Con un commit por intención eran 9 o más de código. Plan: `.piloto/planes/4.19.md`. `docs/plan.yaml` conserva un solo
  `4.19` (como el 4.18): **este PR no marca `integrado 4.19`**; a sus `modulos` se suman `supabase/`, `scripts/carreras/`, `scripts/carreras.mjs`, `scripts/probar-schema.mjs`,
  `src/shared/types/database.types.ts`, la ficha de `cotizaciones` y `.claude/rules/`.
- **P1 a P6 contestadas el 2026-11-07, todas las recomendadas:** P1 el conflicto no dice quién guardó o publicó (la tabla no guarda quién; con nombre eran dos columnas y Nivel 2);
  P2 se puede descartar el borrador; P3 quien tiene `cotizaciones.configurar` del origen, sin clave nueva; P4 publicar pide una nota; **P5 (4.19-3)** el editor es una pestaña
  «Tarjeta» de Configuración › Cotización, tras «Fórmula» (esa carpeta es del `dueno_de` del B; el 4.19-3 toca `page.tsx` y `pestanas.ts` mientras el B hace el 4.21: integrar con
  cuidado); **P6 (4.19-4)** la vista previa muestra cifras de ejemplo, dichas («Cifras de ejemplo.»).
- **Esperada nula = crear** (`plantilla_guardar_borrador`): sólo hay una fila de su clase por origen (el borrador), así que la RPC que crea y edita toma la nula como crear y, si la
  fila ya existe, PT409; nunca `on conflict … do update`. Se aparta de «las de crear no pasan por `_exigir_version()`», y la regla lo dice ahora.
- **`plantilla_publicar` sigue en `uuid`:** una función que devuelve `jsonb` y lee `public.formulas` entra en el inventario de lo oculto de `cotizaciones-visibilidad.sql` y cae
  «sin registrar» (M9).
- **El rojo de K1 no era el 23505 de la fila de PLAN:** publicar son dos `update … where id =` sin `insert`; en READ COMMITTED la segunda espera, relee por id y publica también,
  pisando la nota de la primera (`rojo-head-carreras.txt`). PLAN y la fila del 4.19 dicen ahora lo medido.
- **La ayudante `_plantilla_borrador_ausente()` sólo es de `service_role`** (y la llaman las RPC, definer): su PT409 dice la versión y la hora de la publicada de un origen, y abierta
  a `authenticated` se saltaría la RLS de `plantillas_tarjeta`. T5 lo vigila.
- **Una `esperada` vieja en `db:probar` es la de la fila menos 1 µs:** dentro de una transacción `now()` no se mueve (trigger genérico); que guardar mueve la versión lo prueban
  K3 y K4 entre transacciones.
- **Terreno de las carreras:** un origen propio por carrera (prefijo «Carreras»), la fórmula `mini` del juego de la plantilla publicada por `insert` y la plantilla del caso «mínima»
  (sin tonos); lo que deja lo borra `limpiar()` con el origen (cascada de `plantillas_tarjeta_origen_id_fkey`).
- **`SOLO=` en `db:probar`** necesita `humo.sql` (crea las cuentas): `SOLO=humo.sql,plantilla-version.sql` corre en 7 s.

## 2026-11-07 — El plan sin cadenas de carril (la persona)

- **Medido del 6-11 00:00 al 7-11 11:36:** el B estuvo 32 % sin paso o esperando a main y el C 38 % sin paso; el A, 72 % trabajando. Parte de
  eso eran dependencias que `plan.yaml` no tomó de `PLAN.md`: el 4.22 (depende de 4.09 y 4.20), el 4.23 (de 4.05 y 4.20) y el 4.27 (de 4.10)
  iban detrás del paso anterior de su carril, que además tenía que integrarse antes de dar el siguiente.
- **`plan.yaml` dice ahora las de `PLAN.md`** (4.22 y 4.23 tras el 4.20; el 4.27 tras el 4.15-6c, por las áreas) y **el 4.27 pasa del C al A**:
  el C tenía tres rojos en cadena (4.25 → 4.26 → 4.27), el camino más largo de la fase; el A es base, dueño del módulo entero, y lleva el
  registro de RPC con tamaño que el 4.27 pide (4-91). El 4.28 depende de cada paso que no tiene otro detrás (el 4.20-4b faltaba).

<!-- paso:4.19-2 -->

## 2026-11-07 — Paso 4.19-2

- **El espejo va a mano, no con Zod:** la base fija el orden de las reglas y el `donde` de cada rechazo (el primero manda), y Zod da los suyos. Como `validarDiseno()`.
- **Se valida lo que viaja:** la entrada pasa por `JSON.stringify`/`JSON.parse`. Una propiedad `undefined` es una clave ausente; un ciclo, un `BigInt`, una función o `undefined`
  dan `forma@definicion`, lo que la base hace con un nulo.
- **Los números en `bytesComoJsonb()`:** se cuentan como los escribe JS; la base guarda su texto (`1.50`, `1e21`). En una plantilla un número siempre es `forma`, así que sólo
  puede cambiar el `donde` de una plantilla ya inválida que roza los 32 KB.
- **La 4.ª rama de `nodo_restringido` en la base (lo nombrado, `:110`) no se espeja:** tras `nodo_sin_lugar` todo lo nombrado ya está entre los miembros, el total o lo aparte, y
  nunca puede ser la primera. Lo dice un comentario en `nodos-de-plantilla.ts`.
- **`tonosQueYaNoEstan()` es el único predicado:** `tono_inexistente` es su primero; el editor (4.19-3) avisa con la lista entera, y su texto es del 4.19-3.
- **Los mensajes son los de la base** (`rechazoDePlantilla()`): el editor los puede mostrar al tipear sin una segunda tabla de textos.
- **`octetos` en el juego común:** el tope de 32 KB se cuenta en bytes del texto de `jsonb::text`; la lista fija ese texto para la base y para TS, y la prueba cae si falta.
- **El soporte del juego no lee el archivo:** `juego-de-plantilla.soporte.ts` sólo parsea con Zod (`plantilla: z.unknown()`, para no perder `__proto__`); la lectura con
  `node:fs` queda en los `.test.ts` (`entities/` sin I/O). `casos-de-plantilla.json` pasa las 300 líneas (2.756) como `casos-de-formula.json`: es un juego de datos.
- **Sin mutaciones formales:** no es de rigor máximo (sin dinero, RLS, permisos ni migración; la base vuelve a validar). Cada trampa conocida tiene su caso en el juego, que corre
  también la base, y cuatro sondas (`.trim()`, `.length`, orden UTF-16, `localeCompare`) confirmaron que caen.
- **Para el 4.19-3:** un texto con un surrogate suelto (`\ud800`) o con `\u0000` no lo rechaza `validar_plantilla()` sino la base al leer el JSON (22P02, 22P05): lo tiene
  que atajar la action del editor.

<!-- paso:4.21-1 -->

## Paso 4.21-1

- **La partición.** El 4.21 no cabía en una sesión: se parte en **4.21-1** (lo puro del texto de una fila), **4.21-2** (la versión esperada de `formula_guardar_borrador()` y `formula_descartar_borrador()`, también al crear el borrador; 4-8; base, compuerta `datos`, riesgo rojo), **4.21-3a** (el editor en texto con la vista previa del motor TS; cierra 4-5 y 4-6; depende del 4.20-4b, que toca la misma carpeta), **4.21-3b** (guardar el borrador) y **4.21-3c** (grupos, plazo y tipo de cambio). **El `4.21` sigue entero en `plan.yaml`** y cada parte menos la última sale con `parcial: true`: con el campo, `publicar.sh` abre el PR, `carril.sh` no lo anota `publicado` y el coordinador no integra solo un PR `ambar` a medias. Ids nuevos se descartaron por lo mismo que en el 4.20-4 (`docs/pasos/4.20-4/decisiones.md`).
- **P1 (4-5): reescribir el número en el texto.** Al abrir una fila cuyo ⚙ dejó otro valor en una constante nacida de un número del texto, `textoVigente()` lo reescribe en su tramo (`=(remate+fees)*4%` pasa a `…*5%`); si no se puede (un negativo, un `-0`, otra estructura, el texto ya no compila) la fila queda «el texto ya no manda» y recompilar da `pisa_un_valor` hasta `confirmaPisar`. **P2: escribir el texto desde el nodo** sólo si compilarlo da exactamente ese nodo; si no, `null` y la fila se muestra por sus campos.
- **El tope va en la fila, no en `compilarExpresion`** (C4): sus pruebas de escala compilan textos de 100.000 términos a propósito. Se mide en unidades UTF-16 (como el Zod que valida; la base cuenta caracteres, así que éste es el más estricto) y el tramo empieza en la unidad 2.001; si el corte cae dentro de un par de sustitutos, en el par entero.
- **Escribir un literal** (C8): `String(v)` y, con `%`, el punto corrido dos lugares **en el texto** (como el léxico; nunca `v * 100`). **Un negativo no se escribe por decisión**, no por la gramática (el menos se pliega al literal, pero en el tramo de `4` de `a-4` daría `a--3`). Un porcentaje cuyo texto desborda un doble (`1e310%` vale 1e308) tampoco: el compilador lee primero el número sin el `%`. Un literal entre paréntesis (`(4%)`) se reescribe por dentro.
- **Las auxiliares de una fila** (C2): se reconocen con la **misma regla de recorte** de `idAuxiliar()` (copiada en `filas.ts`; el compilador no se toca) y la cadena tiene que ser entera, contigua, sin texto propio, nombrada cada una por exactamente un nodo de la cadena o la fila, y el texto de la fila no las nombra: así `=total__1+remate` con una fila propia `total__1` sigue siendo una fila propia.
- **Una auxiliar que otra fila nombra** (C3): si el texto nuevo la cambia (otro valor, otro `formato`) o la quita, `compilarFila()` da `auxiliar_nombrada` en vez de conservar la vieja (quedaría suelta) o dejar una referencia rota (`validarFormula()` la rechazaría lejos de donde se escribió).
- **`condicion` y los demás campos** (C5): en un `SI` (el viejo o el nuevo) la decide sólo el texto; un interruptor no pasa a bandera ni al revés. `seccion` y `color` se conservan siempre, `sobrescribible` sólo si sigue siendo un cálculo, y lo que se suelta se dice en `soltados`.
- **Cómo quedó repartido** (límites de lint: complejidad 12, 4 parámetros): `compilar-fila-base.ts` hace C3 a C6 y `compilar-fila.ts` suma C10 (preguntar antes de pisar un ⚙); sin esa separación `texto-vigente.ts` y `compilar-fila.ts` se importarían en círculo. Además `sitio-de-la-fila.ts` (dónde va la fila; `fila_inexistente`, `id_invalido`, `id_ocupado`) y `conservar-de-la-fila.ts`. T10 vive en `compilar-fila-pisar.test.ts`. `textoVigente()` da también `sin_texto` (una fila sin texto o que no existe). `textoDeNodo()` no escribe el «=» (es opcional en el compilador) y recibe la fórmula y el id (`textoDeNodo(formula, filaId)`, no el nodo: compilar el texto pide su contexto). `compilarFila()` devuelve además de `formula` y `tramos` los `nodos` y `params` compilados y los `soltados`. La opción interna `sinAuxiliarNombrada` es de `textoVigente()`: si el ⚙ cambió una auxiliar que otra fila nombra, reescribir el texto es justo lo que lo arregla. El mensaje de `auxiliar_nombrada` nombra la fila por su etiqueta.
- **Sólo una constante o un cálculo se escribe como texto** (`tipo_no_editable`): compilar el texto sobre una bandera, un input, un tipo de cambio, una tabla o un tramo la volvería un cálculo y rompería lo que la nombra (un `SI` que lee la bandera), lejos de donde se escribió. Qué se hace con las demás filas en la pantalla (sólo etiqueta, formato y grupo, o por campos) es del 4.21-3a.
- **Para el coordinador (o el A), antes del 4.21-2:** (1) `plan.yaml` › `4.21` › `riesgo: rojo` (vuelve a `ambar` cuando el PR que trae la migración esté integrado, si la persona lo decide): la vuelta siguiente retoma la rama `b/4.21`, y con el 4.21-3c (sin `parcial`) un `4.21` ámbar se fusionaría solo con la migración `security definer`; (2) sumar a los `modulos` del `4.21` `supabase/migrations/`, `supabase/tests/`, `src/app/(app)/configuracion/cotizacion/` y `scripts/guardas/{confirmar-con-url,drawers-con-salida}-formula.ts`; (3) `docs/PLAN.md`, fila del 4.21: «Se parte en 4.21-1 (lo puro del texto de una fila), 4.21-2 (la esperada de guardar y descartar el borrador; 4-8), 4.21-3a (el editor en texto con la vista previa; cierra 4-5 y 4-6), 4.21-3b (guardar el borrador) y 4.21-3c (grupos, plazo y tipo de cambio); cada parte menos la última sale con `parcial`». El plan del 4.21-2 empieza verificando en `origin/main` que el `4.21` diga `riesgo: rojo` y traiga `supabase/` en `modulos`; si no, compuerta `afuera`. El del 4.21-3a verifica que el `4.20-4b` esté integrado.
- **Textos para el A** (la ficha `src/modules/cotizaciones/CLAUDE.md` es del núcleo): en «Archivos clave», sumar «`entities/formula/{filas,misma-estructura,sitio-de-la-fila,conservar-de-la-fila,compilar-fila-base,compilar-fila,texto-vigente,literal,texto-de-nodo}.ts` (4.21-1): una fila y sus auxiliares, si dos nodos son el mismo salvo la etiqueta, compilar una fila en su lugar con su texto (tope de 2.000), el texto vigente tras un ⚙ (4-5)».
- **Para el 4.21-2 (compuerta `datos`):** cambiar la firma de las RPC del borrador rompe `scripts/carreras/{niveles,tonos,cotizaciones}.mjs` (del A) y las pruebas SQL que las llaman (`supabase/tests/{humo,publicar-diseno,medir-publicar}.sql`); las opciones: parámetros nuevos con `default null` que la app siempre manda, cambiar la firma sin default con el A tocando sus carreras en el mismo tren, o una RPC nueva para el editor. La esperada también tiene que cubrir la creación del borrador (la publicada que el editor leyó).
- **Del 4.21-3a:** dónde vive el editor, con qué valores calcula la vista previa, qué filas se editan, si se puede cambiar el id de una fila, y avisar o bloquear si el borrador borra una fila que el diseño nombra (4.21-3b y 3c).
- **El `ff` del Paso 0:** `b/4.21` estaba en `681baf83`, 160 commits atrás de `origin/main`; se llevó a `06052b20` con `git merge --ff-only` antes de empezar.

<!-- paso:4.21-2 -->

## Paso 4.21-2 (2026-11-07)

- **Las respuestas de la persona** (compuerta `producto`, las cuatro recomendadas; después aprobó la compuerta `datos`):
  - P1, parámetros nuevos al final, con `default null` y sin sobrecargas. Es una excepción aprobada a `.claude/rules/migraciones.md` («toda RPC de edición nace con `p_actualizado_en_esperado` sin default y lo pasa por `_exigir_version()`»): en guardar la hora nula quiere decir «crear», y en descartar y publicar vale (no compara) hasta el 4.21-3b.
  - P2, publicar también pide la hora del borrador, en este paso.
  - P3, guardar encima de un borrador atrasado entra si la hora coincide.
  - P4, descartar con hora cuando ya no hay borrador da PT409 en vez de no hacer nada.
- **Guardar sin hora crea** (C2): si ya hay borrador da PT409 con quién lo empezó y cuándo se guardó, y no escribe nada. Si la publicada esperada viene y ya no es la publicada, da PT409 con quién publicó qué versión. La publicada nula no compara, como en `formula_publicar`.
- **Guardar con hora pisa** sólo si es la del borrador (C3). No cambian `version_origen_id` ni `creado_por`, y la publicada no se compara (P3). Guardar devuelve `jsonb` `{id, actualizado_en}` de la fila escrita (`returning`, después de `trg_actualizado_en`), nunca la hora esperada ni la leída antes. Así el 4.21-3b vuelve a guardar sin releer el borrador, porque releerlo dejaría entrar a otra persona entremedio. Antes devolvía `uuid`.
- **Descartar** (C4): con hora, un borrador que cambió da PT409 T2 y uno que ya no está da PT409 T3 (P4). Sin hora, como antes.
- **Publicar** (C5): mira primero la publicada esperada, como antes. Después, con hora, un borrador que cambió da T2 y uno que ya no está da T3, en vez del 22023 «No hay borrador». Sin hora, como antes.
- **El orden en las tres RPC** es permiso, validación (sólo en guardar, fuera del candado: con 2.000 ítems es lo caro), candado del origen, lectura del borrador `for update`, esperadas y escritura. Quien no configura el origen recibe 42501 antes de enterarse por un PT409 de si hay borrador. El candado es el mismo de publicar, el ⚙ y revertir, así que no aparece un orden nuevo que pueda trabarse.
- **Los ayudantes** se llaman `_borrador_formula_empezado_por(uuid)` (definer: lee `perfiles`) y `_exigir_borrador_formula(public.formulas, timestamptz)` (invocador). El plan los nombraba `_formula_…`, pero `supabase/tests/validar-formula.sql` toma toda función `_formula_%` como ayudante de `validar_formula()` y cuenta exactamente 7. Los dos llevan `set search_path = ''` y sólo los ejecuta `service_role`. `_publicar_formula`, recreada con la hora, sigue siendo sólo de `service_role`: sin el `revoke`, `authenticated` podría pasarle `p_ignorar_retirados = true`.
- **Guardar entra en el inventario de `cotizaciones-visibilidad.sql`** como `no_devuelve`: ahora devuelve `jsonb`, y el detector registra toda función que lee `formulas` y devuelve algo que no es un id.
- **Residuales (se anotan, no se resuelven):**
  - R1: con las dos esperadas nulas en un origen sin publicada, si otra persona publica la v1 entremedio, el borrador nace sobre esa v1. Una llamada vieja (las carreras) no se distingue del editor de un origen nuevo, y sólo pasa en la primera publicación de un origen.
  - R2: dos guardados en una misma transacción comparten la hora (`now()`). En el uso real cada guardado es su propia transacción. Las pruebas simulan a la otra persona con la hora −1 µs.
- **Para el coordinador:**
  - En la fila del 4.21 de `docs/PLAN.md`: «4.21-2 hecho: la versión esperada del borrador en la base (guardar crea sin hora y pisa con ella, y devuelve `{id, actualizado_en}`; descartar y publicar la aceptan); cierra 4-8».
  - Marcar **4-8 cerrado en la base**: «A guarda, B hace el ⚙ y A ve un conflicto al publicar» lo prueba B8. La pantalla manda las esperadas en el 4.21-3b.
  - **Abierto nuevo:** cuando el 4.21-3b mande la hora en descartar y publicar, decidir si la nula deja de valer (sería una migración más) y qué hacer con R1. Lo decide la persona.
  - `ESTADO`: «4.21-2: la versión esperada del borrador de la fórmula en la base (4-8)».
- **Para el A:**
  - Ficha `src/modules/cotizaciones/CLAUDE.md` (las RPC del borrador): «`formula_guardar_borrador(…, p_publicada_esperada?, p_actualizado_en_esperado?)` crea sin hora y pisa con ella, y devuelve `{id, actualizado_en}`; `formula_descartar_borrador(origen, p_actualizado_en_esperado?)` y `formula_publicar(…, p_actualizado_en_esperado?)` la aceptan (4.21-2)».
  - `.claude/rules/migraciones.md` › «Forma» y `datos.md`: sale la excepción «`formula_guardar_borrador` hasta el 4.20». Entra: «en `formula_guardar_borrador`, `p_actualizado_en_esperado` nula quiere decir crear; en `formula_descartar_borrador` y `formula_publicar` vale nula (no compara) hasta el 4.21-3b».
  - Una carrera en `scripts/carreras/` (en `tonos.mjs` o en un archivo propio): «dos crean el primer borrador a la vez: uno entra y el otro da PT409 T1». Las de hoy siguen en verde con la firma nueva (`db:carreras`).

<!-- paso:4.21-3a-1 -->

## Paso 4.21-3a-1 (2026-11-07)

- **Las respuestas de la persona** (compuerta `producto`, las seis recomendadas):
  - P1, seguir sin esperar al 4.20-4b: el `'4.20-4b'` del `depende_de` del `4.21` se puso porque el 4.20-4b edita `pestanas.ts` y `page.tsx`, y el 3a-1 no toca ningún archivo de `src/app/`. Cada plan del 4.21 lo vuelve a verificar.
  - P2, el editor vive dentro de la pestaña «Fórmula», en `?panel=editar-formula`: ocupa el lugar del selector, las tarjetas y la lista, con «Volver a la fórmula», y su código viaja con `diferido()`.
  - P3, en el 4.21 se edita el texto de los cálculos y las constantes; las demás filas se ven en sólo lectura, sin «Editar».
  - P4 (para el 3a-2 o el 3c), el id de una fila no se cambia: una fila con otro nombre es una fila nueva.
  - P5 (para el 3a-2), la vista previa calcula con valores de prueba que no se guardan (inputs en 0, banderas apagadas, la variante por defecto), los tipos de cambio de hoy de la empresa y las tablas vivas del origen, y dice «Cifras de prueba.».
  - P6 (para el 3a-2), «Sumar fila» debajo de una fila: cálculo o constante, con su etiqueta y un id propuesto desde ella (minúsculas ASCII y `_`, hasta 41, sin chocar con otro) que se puede cambiar antes de crearla.
- **La partición.** El 4.21-3a no cabía en tres commits: se parte en **4.21-3a-1** (el editor en texto: las filas, compilar al aplicar, el error en su fila y el borrador local; cierra 4-5 y 4-6) y **4.21-3a-2** (la vista previa con `evaluar()` y las filas nuevas). Sale con `parcial`, como las demás partes.
- **Entrar** (C1): «Editar» en la tarjeta del borrador (antes de «Publicar…», también atrasado) y, sin borrador, «Editar en un borrador» en la de la publicada. Sin publicada ni borrador no hay botón (una fórmula desde cero pide filas nuevas, 3a-2), y `?panel=editar-formula` por la URL dice «No hay una fórmula para editar en <Origen>.» y limpia la URL. «Atrás» cierra el editor y devuelve el foco al botón.
- **Leer** (C3): el editor lee desde el navegador una sola fila de `formulas` por su id (`formulas_pkey`, `.limit(1)`), con `id, definicion, params, actualizado_en` y la sesión de quien mira. La lectura exige la **forma** (el Zod de `formula.ts`): lo que no la tiene es un error con «Reintentar». Las reglas que cruzan nodos (`validarFormula()`) no impiden abrir: el editor dice el rechazo en su fila. El plan lo había puesto en la lectura (T1); se movió al editor para poder abrir y arreglar un borrador inválido. Si la fila no vuelve: «Esa versión de la fórmula ya no se puede abrir: se descartó o ya no configuras <Origen>.». No culpa a otra persona, porque la policy esconde igual una fila borrada que una de un origen que se dejó de configurar.
- **Las filas** (C4): las filas en su orden, con su etiqueta, su id (monoespaciado: el nombre que usan los textos) y su tipo.
  - Un cálculo o una constante muestra su texto vigente. Si un ⚙ cambió un número que el texto puede escribir, el texto reescrito y «Con ⚙ se cambió 4 % por 5 %: el texto ya dice el valor nuevo.»; si no puede, «El texto ya no manda: con ⚙ quedó -3 %, que el texto no puede escribir.». Las cifras van con el formato de su constante (la auxiliar de un `4%` es un porcentaje) y el dinero por `<Monto>`. Lo reescrito sólo se muestra: guardarlo así es del 3b.
  - Sin texto, el que se escribe desde el nodo. Si no se puede escribir, la fila se muestra por sus campos («Calcula: suma de a, b», «Vale 900») y se le puede escribir un texto.
- **Compilar al aplicar** (C5, C6): «Aplicar» o Ctrl/Cmd+Enter; Esc cancela. Hay una sola fila abierta a la vez, y los demás «Editar» quedan apagados.
  - Lo tipeado vive en el campo de la fila hasta aplicar, así que tipear no vuelve a dibujar la lista.
  - Un error deja la fila abierta con el mensaje debajo del texto (`aria-invalid`, `aria-describedby`) y la fórmula igual. El de 2.001 caracteres no llama a `validarFormula()`.
  - `pisa_un_valor` muestra una línea por valor del ⚙ que se pisaría, con «Pisar el valor».
  - Tras cada cambio corre `validarFormula()`. El rechazo va a la fila que nombra (por `donde`, de la fila o de una auxiliar suya, o por el lugar de `campo`); si no nombra ninguna, va arriba de la lista. El cambio queda aplicado.
  - Lo que una fila suelta al compilar se dice en ella: «Esta fila dejó de llevar: …».
- **Borrador local** (C7): lo aplicado (`definicion` y `params` planos) se guarda en la pestaña con `useBorradorDeEstado`, con la clave `formula-editor:<origen>:<versión>:<actualizado_en>`. Al volver o recargar se repone con el aviso de siempre y su «Descartar». Otra versión leída no lo repone.
- **El tope** (C8): se dibujan hasta 500 filas, con «Mostrando las 500 primeras filas. Busca una fila por su nombre o su etiqueta.». «Buscar fila» filtra por id o etiqueta, sin distinguir mayúsculas, antes de cortar. La fila abierta se dibuja aunque el filtro no la nombre. Sin coincidencias, «Nada coincide con los filtros» con «Ninguna fila tiene «…» en el nombre ni en la etiqueta.», sin «Limpiar filtros» (se limpia en el campo).
- **El costo de las filas:** calcular qué dibuja cada fila es O(filas × nodos), porque `textoVigente()` y `textoDeNodo()` recorren la fórmula entera en cada llamada. Se calcula una vez por fórmula de trabajo.
  - Medido en Vitest: 600 filas, 1,83 M visitas (~0,2 s); 2.000 filas, 20,1 M (~1,8 s).
  - En el navegador, con 600 filas: 957 ms del clic a la lista. Pasa de 1 s con más filas: **abierto** para una versión por lote de lo puro (del B, en un paso de rigor).
- **Para el coordinador:**
  - En la fila del 4.21 de `docs/PLAN.md`: «El 4.21-3a se parte en 4.21-3a-1 (el editor en texto: filas, compilar al confirmar, el error en su fila y el borrador local; cierra 4-5 y 4-6) y 4.21-3a-2 (la vista previa con `evaluar()` y las filas nuevas)».
  - Marcar **4-5 y 4-6 cerrados**: los prueba `e2e/configuracion-cotizacion-formula-editor.spec.ts`. El 4-6 también lo prueba `use-editor-de-la-formula.test.tsx`, que comprueba que no se llama a `validarFormula()`.
  - `ESTADO`: «4.21-3a-1: el editor de la fórmula en texto (cierra 4-5 y 4-6)».
  - El `depende_de: ['4.20', '4.20-4b']` del `4.21` sólo pesa en una parte que toque `pestanas.ts` o `page.tsx` (P1).
  - **Abierto nuevo:** el editor tarda ~1 s en abrir con 600 filas y ~2 s con 2.000 (O(filas × nodos)).
- **Para el A:** en la ficha `src/modules/cotizaciones/CLAUDE.md` (núcleo), en «Entra y sale», tras lo del 4.20-2c, sumar: «edita la fórmula en texto en `?panel=editar-formula` (4.21-3a-1): lee la fila del borrador o de la publicada desde el navegador (`infra/formula/definicion.client.ts`), compila cada fila al aplicar con `compilarFila()` y guarda lo aplicado en la pestaña (`useBorradorDeEstado`)».
- **Para el 3a-2:** aplicar P4 a P6. La vista previa lee las tablas y los tipos de cambio desde el navegador.
- **Para el 3b:**
  - Al guardar, escribir en el texto lo que reescribió `textoVigente()` (hoy sólo se muestra).
  - El borrador que se lee puede ser de otra persona: «Sobre el borrador de <persona>.».
  - La clave del borrador local lleva la `actualizado_en` leída: tras guardar, la clave cambia.

<!-- paso:4.24-3 -->

## 2026-11-07 — Paso 4.24-3

- **Lo que contestó la persona:** compuerta `datos` del plan: «aprobar» (P1 a: esperar el chore del A; P2 a: se envía aunque haya cambios sin guardar). Compuerta
  `afuera` (P1), en tres vueltas: «seguir» hasta que el chore del A llegó a `main` (`ef8f4dd7`, PR #46: el caso de huecos vacíos usa huecos de prueba). Segunda
  compuerta `afuera`, «seguir» (dos vueltas): el A arregló lo que el botón destapaba en `src/app` (`9bf2d6cd`: `loading.tsx` importa sólo
  `pantallas/esqueleto-de-hoja.ts`; `5b1154ef`: la prueba de los huecos simula `server-only`).
- **Lo que se aprobó en permisos:** una puerta en la app, ninguna en la base. La action mira `cotizaciones.editar`, `.moderar` o `.final.gestionar` en algún origen
  antes de llamar a `cotizaciones_papelera_enviar` (`puedeEnviarCotizacionesALaPapelera`, que ahora usa también `puedeAbrirLaPapeleraDeCotizaciones`). El botón lo ve
  quien puede guardarla o, en una preventa, quien modera (`puedeEnviarLaCotizacion`), el espejo de `_cotizacion_a_papelera()`; la base lo vuelve a decidir.
- **Lo no obvio:**
  - El botón es `outline`, a la vista en la cabecera después de «Revisiones», y no una opción de un «⋯» como en vehículos y leads: la guardada no tiene menú y el hueco
    `Acciones` del 4.15-6b es la barra. No es `destructive`: es reversible (el tono queda para purgar).
  - Enviar lleva a `/cotizaciones` (la guardada ya no existe para nadie) y «Deshacer» no la vuelve a abrir: el listado ya la muestra, como en leads y vehículos.
    `Debajo` queda vacío: «Papelera» ya está junto a «Nueva».
  - La base devuelve el `titulo` de `enviados` sin `coalesce` (nulo en una sin título; restaurar, purgar y el lote lo completan con «Cotización #n»). Lo completa
    `envioDesde()`; igualarlo en la base es un paso de base del C si la persona lo pide.
  - Un error de enviar dice el motivo de la base tal cual (el PT409 dice quién la cambió y cuándo): la persona está en esa cotización y no hace falta nombrarla.
    «Deshacer» que no la pudo restaurar es un error de regla con su motivo, como en la papelera.
  - El hueco es un Server Component (`<EnviarLaGuardadaALaPapelera>`) que decide quién lo ve y dibuja `<BotonEnviarALaPapelera>` con el id y la versión: al navegador
    no viajan los permisos ni `permisos.ts`. El botón es un `<button>` con `buttonVariants` (sin el primitivo de Base UI) y el envío
    (`hooks/envio-a-papelera.ts`) llama a las actions sin `useAction`, con su propio «en curso»: el JS en frío de la guardada está al tope (439,2 de 448 KB).
  - El primer intento midió 451,7 KB. No era el botón: `loading.tsx` importaba el barril `pantallas/cotizacion`, y al sumar un Client Component a la página el HTML
    bajaba dos chunks casi iguales (el de `loading` y el de `page`). Con `loading.tsx` sin el barril (prueba temporal) medía 438,5. Pedir el envío al primer clic con
    `import()` no lo arreglaba y además lo rechaza `scripts/guardas/diferidos.test.ts`. Lo arregló el A (arriba); queda en `docs/RENDIMIENTO.md`.
  - `resultados.test.ts` ya tenía 178 líneas: lo de enviar va en `resultados-envio.test.ts`.
- **Para el coordinador (o el A):**
  - El `4.24-3` (`depende_de: ['4.24-2']` y el chore `ef8f4dd7`; `ambar`; `modulos`: `features/papelera/`, `entities/papelera/`, `infra/papelera/`, `areas/papelera/`,
    `pantallas/papelera-cotizacion.ts`, `docs/`) envía desde la guardada. El `4.25` depende de `4.24-3` y de `4.24-2b`.
  - **Este PR marca `integrado 4.24`** si su CI va en verde: el `terminado` («`cotizaciones.papelera.purgar` gobierna su papelera; cierra 4-68 y 4-70») lo cumplen el
    1a y el 1b en la base y el 2 y el 2b en la pantalla; del título faltaba «Deshacer», este paso. 4-68 y 4-70 se quitan de `docs/PLAN.md`.
  - Abiertos para el A, en el núcleo (P2 a): enviar desde la guardada no mira lo tipeado sin guardar, que no vuelve con «Deshacer» (el borrador es por versión); y un
    guardado pendiente (por persona y cotización, sin versión) sobrevive al envío y, tras «Deshacer», el núcleo lo reintenta con la versión vieja y da un PT409 contra
    uno mismo.
  - Para el 4.25–4.27: con `9bf2d6cd` y `5b1154ef`, un área ya puede poner un Client Component con Server Actions en un hueco de la guardada sin duplicar el chunk
    ni romper la prueba de los huecos.
  - Siguen los pendientes del 4.24 que no son del `terminado` (el `aplicado_en` de la clave, la deuda de `docs/ESTADO.md:51`, la ficha del módulo, las carreras).

<!-- paso:flujo-1 -->

## 2026-11-07 — FLUJO-1: el flujo continuo de los carriles

- **El problema medido (5 al 7-11):** 23 fallas distintas pararon o frenaron a los carriles. Las que más costaron: re-arrancar a mano cuando cambiaban los
  scripts del piloto (≈ 4 h 30), la integración de lo rojo y del A que esperaba a la persona (8 h 17 en una noche), los pedidos de B y C al A sin mecanismo
  (≈ 3 h y 11 relanzamientos, ≈ 35 USD sin avance) y el rango del cierre ensuciado por main (54 y 165 commits ajenos). Lo tapaban scripts fuera del repo
  (`~/orca/supervision/`), sin pruebas, con rutas absolutas y compitiendo con el coordinador por `estado.json`. El A no podía publicar con coordinador.
- **La copia del bucle sale de `origin/main`, no de la rama del carril** (`copiar-bin.sh`). Es común a los carriles y cada uno la rehacía desde su rama: las tres
  iban sin los PR 44 y 49, y re-arrancar el A habría vuelto atrás el `cierre.sh` de los tres. Lo integrado ya pasó el CI y la compuerta «guardas». Se anota el
  `tree` de `origin/main:scripts/piloto` en `bin.origen`, y una copia sin `bucle.sh` (un main roto) no reemplaza a la que hay.
- **El bucle se relanza solo** cuando main cambia `scripts/piloto/`, entre pasos y nunca con un paso vivo (`exec`, mismas opciones). Un bucle viejo puede llamar a
  piezas nuevas hasta su próxima vuelta: son de línea de comandos estable, y el riesgo es menor que el de dejar un carril quieto horas. El cierre de un paso que
  tocó `scripts/piloto/` ya no pide re-arrancar: su cambio rige al integrarse.
- **La rama del carril trae main antes de cada parte, nunca a mitad de un paso** (salvo tras una espera, que es por eso). Sin commits propios, la rama pasa a ser
  `origin/main`; con commits, `git merge` (nunca rebase con push forzado). Así cada parte corre con las skills y agentes de main: el planificador en sonnet del
  PR 49 nunca llegó a correr porque las ramas iban atrás.
- **El cierre cuenta los commits propios** del paso: `HEAD de arranque..HEAD`, sin mezclas y sin lo que ya está en `origin/main` (`rango_propio`). Lo mismo para las
  guardas: lo que vino de main ya pasó su compuerta.
- **La compuerta `espera` y los pedidos.** Un paso que necesita algo de otro carril ya no pide una `afuera` ni ofrece «seguir mientras…», que el bucle no sabe
  cumplir. Pide `espera` con su `pedido`: el coordinador se lo da al dueño de los `archivos` (o al base), que lo toma antes que sus pasos (`pedido-<n>`). El que
  pidió espera a main sin preguntar y se retoma solo. Se descartó dejar que B y C editen los archivos del A: la guarda de carriles es lo que permite correr tres
  a la vez sin choques. Una `afuera` que dice «no está en main» también espera, por los carriles que todavía la piden así.
- **Un aviso se reintenta solo antes de ir al celular** (5, 15 y 45 min por motivo). Reintentar no se salta nada: repite la vuelta con todas sus paradas y
  verificaciones. Lo que repetir no arregla (el tope de gasto, el árbol que el paso dejó sucio) va directo a la persona. Va en `PILOTO_AUTO` (por omisión), así
  que se apaga como las otras respuestas solas.
- **El coordinador manda sobre el ruteo.** Si el ruteo elige otro paso que el asignado, se corre el asignado y la sesión elige su parte. Antes era una parada,
  5 veces al arrancar los carriles. Una «parte» que es otro id del plan (el 4.20-4a del A dentro del 4.20 de B) no vale.
- **El coordinador integra las partes** (`pr_parcial`, con merge y sin borrar la rama, porque el carril sigue en ella) y los pedidos (como un paso ámbar). Antes
  las partes sólo las integraba `integrar-verdes.sh`, fuera del repo.
- **Lo rojo lo integra el coordinador con el CI en verde** (lo decidió la persona el 2026-11-07). `integraSolo` ya no lo bloquea por código: vale lo
  que diga `COORD_MERGE_AUTO`, y `piloto.config` dice `verde,ambar,rojo` (antes la línea pisaba al entorno, así que el `rojo` con que corría el
  coordinador nunca rigió, y lo integraba `integrar-verdes.sh` sin quedar escrito). La última barrera son el auditor (Opus) y los jobs de base
  del CI (RLS, grants, advisors).
- **Lo que toca las guardas del piloto no se integra solo**, aunque sea verde (`scripts/piloto/`, hooks, settings, agentes, skills del piloto,
  lefthook, workflows): la copia del bucle sale de main y los tres carriles se recargan con ella, así que un paso que reescribe el bucle no
  entra sin que la persona lo vea. La compuerta «guardas» se contesta sola en el carril; el merge, no. `COORD_GUARDAS_SOLAS=1` lo deja.
- **Las pruebas inestables tienen un reintento sólo en CI** (lo decidió la persona el 2026-11-07). Del 3 al 7-11 hubo 13 corridas rojas sin código
  roto, y cada una devolvía el PR a su carril. La que pasa al reintentar se anota en el PR y en el resumen de la corrida
  (`e2e/soporte/reporter-de-inestables.ts`) y sigue siendo un abierto. En local, sin reintento, como siempre. Las 12 conocidas van como
  pedido al carril A.
- **La puerta de fase con carriles mira el CI de `main`**, porque la rama nueva del 4.28 no tendrá corridas. Una corrida cancelada no cuenta si hay otra detrás.
  Un `ci-fix` no se repite hasta que corra un CI que incluya su arreglo.
- **Lo que corrigió la revisión adversarial** (antes de integrar):
  - Un pedido o un paso que cierra «listo sin cambios» se lo decía sólo al registro, y el coordinador lo volvía a dar sin fin (una sesión pagada
    por vuelta). Ahora un pedido así se cierra (`cerrar-pedido`) y un paso del plan asignado sin nada que publicar va a la persona.
  - La copia se cambia con un enlace (`bin` → `bin.<árbol>-<hora>`, `mv -T`), sin un instante sin `bin/`, y cada bucle sigue con la suya
    (`comun.sh` resuelve el enlace) hasta relanzarse: ya no mezcla piezas viejas en memoria con nuevas en disco.
  - Lo que el bucle corre por fuera (`git`, el coordinador) no hereda el candado del bucle (fd 8): un `git gc` desprendido dejaba al bucle
    relanzado sin poder tomarlo. El relanzado espera 30 s el candado.
  - Un paso que falla, «tres fallas seguidas», la espera que pasa su tope y un ciclo entre carriles van directo a la persona: esperar no los arregla.
  - La `espera` pide `archivos` y despierta cuando **todos** cambian en main (o el dueño cierra el pedido), no con cualquier commit; hasta 3
    esperas por paso. Dos carriles que se piden mutuamente son un ciclo que va a la persona.
  - Un carril con sus pasos integrados no sale: atiende pedidos hasta que el plan entero termine.
  - El coordinador integra el commit que vio el CI (`--match-head-commit`).
- **Para el coordinador (o el A):** al consolidar, cerrar en `docs/PLAN.md` el 4-83 (`auto-carriles.test.ts` hermético).

<!-- paso:pedido-1 -->

## 2026-11-07 — Pedido del carril persona (estabilizar-1)

- **Lo no obvio:** un `toPass` que repite un clic para esperar la hidratación tiene que parar cuando el clic anterior ya hizo efecto, y el efecto que se ve
  antes que el modal es la URL (`?panel=`). Repetirlo no es inocuo: suma entradas iguales al historial y rompe «atrás». Un reintento sin esa guarda es una
  carrera propia de la prueba, y sube con la lentitud de la máquina.
- **Cómo se reproduce lo que no cae solo:** frenar la CPU del navegador (CDP `Emulation.setCPUThrottlingRate`, 8 a 16) ensancha las ventanas de hidratación
  mejor que quemar CPU de la máquina (8 procesos dieron 6 de 6 en 4-99; 20 no tocaron 4-80, 4-92, 4-93 ni 4-97). No se dejó en el repo: es un parche de tres líneas
  en `e2e/soporte/prueba.ts` (`process.env.E2E_CPU`).
- **No se subió ningún tiempo:** los topes de 1 s del `toPass` y de 5 s de los `expect` siguen; los clics suman un tope de 3 s para no esperar los 30 s de la prueba.

<!-- paso:pedido-2 -->

## 2026-11-07 — Pedido del carril persona (estabilizar-2)

- **Lo no obvio:** una espera de 5 s a algo que hace el servidor (el nombre del cliente en la barra, el total del recálculo) no es un tiempo mal puesto: es
  una espera al estado que depende de la latencia. Se prueba inyectando esa latencia (`page.route` sobre `rsc`, `rpc` o las Server Actions): el HEAD cae con la
  misma pantalla que en el CI y lo nuevo no. Frenar la CPU del navegador no alcanzó (0 de 86 a 6× y 16×), porque la caída era del servidor, no de la hidratación
  (la de 4-99, pedido-1).
- **Sí se subió un tiempo, en dos esperas, con la causa medida:** 4-81 y 4-86 pasan a 15 s, el tope que `alDia()` de `soporte/cotizar-vista-previa.ts` ya
  usa para el mismo recálculo. Una espera que no sube nada (4-85) se arregló esperando el estado nuevo, que es la regla de `.claude/rules/e2e.md`.
- **4-82, sin el assert de tiempo entre volúmenes:** los bloques de `vehiculos` por relación ya medían el crecimiento con N y no dependen de un autovacuum; el
  tiempo comparaba dos corridas de una máquina compartida. Se comprobó que sigue mordiendo: la consulta de hoy cae por bloques (`inventario-contra-hoy-1.txt`).
  Lo que pierde: un crecimiento en ms sin crecimiento en bloques de `vehiculos` (por ejemplo, más trabajo de CPU por fila) ya no lo ve esta medición;
  lo acotan los topes absolutos (10, 20 y 40 ms).

<!-- paso:pedido-3 -->

# pedido-3 (pedido del carril b, 4.21)

- `plan.yaml` › `4.21` pasa a `riesgo: rojo` y suma a `modulos` la base, sus pruebas, los tipos, la carpeta de Configuración › Cotización y las dos guardas, como pidió el carril b.
- Dos cambios más que el pedido no nombraba y que `scripts/coordinador/plan.mjs` exige (`coordinador.node.test.ts` cayó sin ellos):
  - un paso rojo va con opus, modo plan y revisor: el ruteo del 4.21 pasa de `sonnet / auto / ninguno` a `opus / plan→auto / claude-sesion-nueva`, como el 4.20-4a;
  - el 4.21 y el 4.20-4b (carril A) tocan `src/app/(app)/configuracion/cotizacion/`: el 4.21 pasa a depender del 4.20-4b, que es lo que el 4.21-3a ya verificaba.
- Si la persona prefiere que el 4.21 siga con sonnet, hay que decidir otra forma de mantenerlo rojo: el chequeo del plan no lo deja.

<!-- paso:4.19-3a -->

## 2026-11-07 — Paso 4.19-3a

- **El 4.19-3 se parte en tres** (3a servidor, 3b pestaña y editor que guarda, 3c publicar con nota y descartar): entero eran ≈ 35 archivos de capas con verificaciones distintas
  (Vitest y PostgREST contra e2e en escritorio y móvil), más de lo que caben tres commits de código. La fórmula hizo lo mismo en cuatro pasos. La cuenta de e2e: la 3a no la mueve (sin
  pantalla); la 3b la lleva a 2 y la 3c a 3, y el 4.19-4 correría el completo (confirmarlo con `cuenta-e2e.mjs`).
- **De la fórmula se lee sólo lo que mira `validarPlantilla()`** (`esquemaDefinicionParaPlantilla`, `esquemaDisenoParaPlantilla`: Zod `looseObject` sobre nodos, buckets, grupos, modos
  y secundarios de la tarjeta), no `esquemaDefinicion`: la base ya validó la fórmula al publicarla, y la plantilla no debe romperse con cada cambio de la fórmula. Lo que no tiene eso es
  «No pudimos leer la fórmula».
- **Guardar el borrador no manda `p_nota`:** el editor no escribe la nota del borrador; la nota es la de publicar, que la reemplaza.
- **El rechazo va a un campo con el `donde` de la base y su mensaje tal cual** (`rechazoHaciaUnCampo()`): `errorDePostgrest()` cambiaría por el genérico un mensaje con «column» o
  «relation», y un id de nodo puede traerlo (`columna_x`); con la regla en `details` se toma `error.message`.
- **`guardar` sólo valida la forma** (la base no pasa contexto): lo que cruza con la fórmula y los tonos lo dice publicar. El editor (4.19-3b) valida con `validarPlantilla(…, contexto)` al
  tipear, y guardar nunca sabe de un grupo ajeno.
- **La guarda del texto va en la action, con una pila y un tope de profundidad (8):** el recorrido recursivo no aguanta un pedido hostil, y `JSON.stringify` de supabase-js lanza `RangeError`
  con una profundidad grande. La ruta del problema nunca lleva el texto malo (una clave mala da la ruta de su objeto).
- **La nota de publicar tiene su propio esquema** (`esquemaDeNotaDePlantilla`): `entities/formula/publicacion.ts` es del carril B y de otra área. Los dos topes son 2.000; **pendiente:**
  mover la nota al núcleo y que las dos áreas usen una. Cuenta caracteres con `caracteres()`, no `.max(n)` (4-74).
- **La versión esperada se valida como `z.iso.datetime({ offset: true })`:** admite los 6 decimales y la zona de la base; un `Date`, un instante sin zona o vacío no pasan.

<!-- paso:4.25 -->

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

<!-- paso:4.21-3a-2 -->

## Paso 4.21-3a-2 (2026-11-07)

- **P4 a P6 como se aplicaron** (las recomendadas, contestadas en el 3a-1):
  - P4: ninguna fila existente cambia de id; «Editar» no tiene campo de nombre. Una fila con otro nombre es una fila nueva («Sumar fila»).
  - P5: la vista previa dice «Cifras de prueba.» con los datos en 0, las opciones apagadas, la variante por defecto, los tipos de cambio de hoy y las tablas vivas del origen; no se guarda en ninguna parte.
  - P6: «Sumar fila» debajo de una fila, cálculo o constante, con su etiqueta y un nombre propuesto desde ella (minúsculas ASCII y `_`, hasta 41, sin chocar con un nodo, una constante, un grupo, un bucket ni una clave de cambio) que se puede cambiar antes de crearla.
- **Lo de prueba se lee por páginas de 1.000 filas.** PostgREST no devuelve más de 1.000 filas por pedido (`max_rows`): una página de menos es entera y una de exactamente 1.000 puede estar cortada. La última tabla de una página llena queda pendiente, las anteriores se aceptan y las que la página no alcanzó siguen pendientes (jamás se aceptan como vacías); una tabla que ocupa sola una página tiene 1.000 filas o más y no se usa, con su aviso. Hasta 6 pedidos de filas (8 en total); 40 tablas y 100 claves de cambio como máximo, con su aviso. No se usa `.range()` (lo prohíbe `escala.md`): cada pedido es un `in` sobre las pendientes.
- **La moneda de los Bs sale de la base.** «Total en Bs» usa la `moneda_a` del tipo de cambio de `total_en` (o del primer bucket), que viaja con la lectura de los tipos de cambio; «Total en dólares» es USD.
- **Microdecisiones** (`ui.md`):
  - Las cifras llevan 2 decimales (`ValorDeConstante` recibe `decimales`, 6 por omisión sólo para porcentajes y números; a `<Monto>` sólo llega el valor explícito).
  - La cifra va en la cabecera de la fila, tras el tipo; una fila apagada dice «Fuera de la variante.» o «Condición apagada.», sin cifra 0.
  - La vista previa no es sticky.
  - «Sumar fila» y «Editar» se agrupan a la derecha de la cabecera y esperan con «Aplica o cancela la fila abierta.»; la fila bajo la que se suma, la que está en edición y la recién creada se dibujan aunque «Buscar fila» o el tope no las nombren.
  - Lo creado lleva el foco a su «Editar».
  - El tipo elegido se revisa contra lo compilado (`tipo_distinto`, junto al texto).
  - El aviso de la constante dice «Una constante nueva aún no aparece en la hoja: hay que colocarla en el diseño.» (el plan traía «(4.22)»: un número de paso no va en la interfaz).
  - El caso «un texto que compila y deja la fórmula inválida» de E5 se cubre en `use-editor-de-la-formula.previa.test.tsx` (T6): `no_valida` y el rechazo en su fila.
- **El tope de nodos con 500 filas sube** de 4.200 a 6.300 (medido 5.996, +5 %) en el spec base y en el de volumen: cada fila suma su cifra y su botón; es el costo de la función, no un tope aflojado para pasar.
- **Para el coordinador:**
  - En la fila del 4.21 de `docs/PLAN.md`: «**4.21-3a-2** (la vista previa con `evaluar()` y las filas nuevas) está hecho; sigue el 3b».
  - `ESTADO`: «4.21-3a-2: la vista previa con cifras de prueba y las filas nuevas del editor de la fórmula».
  - **Abierto nuevo:** una constante nueva (C5) no tiene celda en el diseño y `validar_diseno()` la rechaza al publicar con `nodo_sin_seccion`; un cálculo no. El 3b decide si avisa al guardar y el 4.22 la coloca.
- **Para el A:**
  - En `src/modules/cotizaciones/CLAUDE.md` (núcleo), en «Entra y sale», tras el texto del 3a-1: «la vista previa calcula con `evaluar()` (`entities/formula/vista-previa.ts`) las cifras de prueba —datos en 0, variante por defecto, tipos de cambio de hoy y tablas vivas, que lee desde el navegador `infra/formula/terreno-de-prueba.client.ts` en 3 pedidos (hasta 8, las filas por páginas de `limit(1000)`)— y «Sumar fila» crea una fila nueva con `compilarFila()` y un id propuesto (`entities/formula/fila-nueva.ts`)».
  - **EXPLAIN** (`escala.md`): sumar a `pnpm db:medir:volumen` el `EXPLAIN` de las tres lecturas del terreno de prueba: `tabla_id in (…) and activa order by tabla_id, orden, id limit 1000` sobre `tablas_referencia_filas_tabla_orden_idx` (sin ordenar ni descartar), `tablas_referencia` por `(origen_id, clave)` y `tipos_cambio` por `tipos_cambio_clave_key`.
- **Para el 3b:** las filas nuevas viven sólo en la fórmula de trabajo; una constante nueva no tiene celda en el diseño; el terreno de prueba no se guarda.

<!-- paso:4.21-3b-1 -->

## Paso 4.21-3b-1 (2026-11-07)

- **La partición del 4.21-3b.** Junta dos capas con verificación distinta: guardar desde el editor (pantalla, sin base: la RPC `formula_guardar_borrador` ya
  existe desde el 4.21-2) y lo que la base cambie según P2–P4. Va primero la pantalla: **4.21-3b-1** (este) y **4.21-3b-2** (la migración de P2).
- **P1 a P4, como las contestó la persona** (todas las recomendadas):
  - P1 (una constante sin celda en el diseño, al guardar): **guardar y avisar**. El editor dice, cerca del botón y mientras haya, «Para publicar, el diseño de la
    hoja tiene que mostrar: «…». Puedes guardar igual.» (las cinco primeras filas y «y N más»); sin diseño, «Este borrador no tiene el diseño de la hoja: todavía
    no se puede publicar.». Guardar entra y publicar sigue rechazando con su texto de siempre (`nodo_sin_seccion`).
  - P2 (¿una auxiliar `<fila>__<n>` tiene que tener celda?): **que el diseño no la pida**. Es el 4.21-3b-2: una migración de `validar_diseno()`, su espejo
    `validar-diseno-cobertura.ts`, sus casos en `casos-de-diseno.json` y el aviso de C6 sin auxiliares; compuerta `datos`.
  - P3 (la hora nula en publicar y descartar): **la base sigue aceptándola**. Desde este paso la app la manda siempre; el residual R1 del 4.21-2 queda anotado.
  - P4 (la fórmula desde cero): **después del 4.22** (hoy daría un borrador que no se puede publicar: `diseno_faltante`).
- **Lo que el editor guarda.** Sobre la publicada, crea el borrador con su diseño y la nota nula (la de la publicada es de su publicación); sobre el borrador, lo
  pisa con su hora, su diseño y su nota (la RPC los escribe tal cual: mandarlos nulos los borraría). La lectura del editor suma `estado, diseno, nota` en el mismo
  pedido y la misma fila (una sola foto). Tras guardar, la base pasa a ser la fila que devolvió la RPC (`{id, actualizado_en}`), **sin releer**: releer dejaría
  entrar a otra persona entremedio. Una fila `reescrita` por el ⚙ guarda el texto que ya dice el valor nuevo (cierra lo que quedaba del 4-5).
- **El pedido se arma en `features`, no en `entities`** (`use-guardar-borrador.soporte.ts`): usa `FilaParaDibujar`, `TextoDeLaFila` y `paramsPlanos`, que viven en
  el soporte del editor, y `entities` sólo importa `entities` y `shared`. Lleva su test igual. Sus funciones: `formulaParaGuardar(trabajo, filas)` (la fórmula
  con los textos reescritos), `pedidoDeGuardar(base, guardable, origenId)` y `hayCambiosPorGuardar(guardada, guardable)`; el plan nombraba
  `definicionParaGuardar` y `pedidoDeGuardar(base, trabajo, filas, origenId)`: se juntó en una fórmula para que el editor la tome tal cual al entrar.
- **Las esperadas, exactamente una, por su forma:** `esperada: { sobre: 'publicada', publicadaId } | { sobre: 'borrador', actualizadoEn }`, cada rama estricta
  (Zod `discriminatedUnion`), en vez de dos campos opcionales: lo que no es una de las dos no pasa el esquema. La hora es un ISO con zona (`z.iso.datetime({ offset:
true })`), tal cual la da la base con sus microsegundos.
- **Microdecisiones** (`ui.md`):
  - «Guardar el borrador» va arriba de la lista, bajo la cabecera del editor y antes de la vista previa, con una línea `role="status"`.
  - El botón espera, en este orden: con una fila abierta o el formulario de «Sumar fila», «Aplica o cancela la fila abierta.»; con un rechazo de
    `validarFormula()`, «Corrige lo marcado para guardar.»; sin cambios, «No hay cambios por guardar.»; con un conflicto, apagado (el aviso lo dice).
  - Tras guardar y sin cambios, «Se guardó el borrador.» ocupa el lugar de «No hay cambios por guardar.».
  - Una fila `reescrita` cuenta como cambio: guardarla es lo que la arregla.
  - No se confirma antes de guardar, ni sobre el borrador de otra persona: la cabecera ya dice de quién es («Sobre el borrador de <persona>.») y la base no
    deja pisar uno que cambió. Sin atajo de teclado.
  - Mientras guarda, «Editar» y «Sumar fila» esperan (`ui.md`: un formulario que se reemplaza al llegar lo guardado apaga sus campos): nada cambia el trabajo
    durante el envío, así que reemplazarlo y limpiar el borrador local no pisa nada.
  - El 22023 de guardar dice un texto propio, nunca el de la base: «La base no aceptó la fórmula por una regla que el editor no revisó: no se guardó.». El 42501,
    «Ya no configuras <Origen>: no se puede guardar.»; sin respuesta, «No sabemos si se guardó: recarga para verlo.» (como al descartar); cualquier otro error, «No pudimos guardar el borrador. Vuelve a intentar en un
    momento.». Sólo el PT409 muestra el texto de la base. Al volver a guardar, lo que dijo el intento anterior se borra mientras corre el nuevo.
  - El conflicto muestra el texto de la base (nombra a una persona y cuándo), «Recargar trae el borrador como quedó; lo que aplicaste y no guardaste se
    pierde.» y «Recargar».
  - **La `key` del editor ya no lleva la versión:** es `<origen>:<vuelta>`, y `vuelta` sube sólo con «Recargar», que hace `router.refresh()` y la sube en la misma
    transición. El editor fija el `formulaId` con el que abrió: guardar sobre la publicada cambia la versión de la pestaña («Sobre el borrador de <yo>.») sin
    volver a montar el editor ni releer.
  - En publicar, la versión del formulario es la publicada y la hora del borrador juntas: el conflicto se va cuando «Recargar» trae cualquiera de las dos. En
    descartar, el PT409 va dentro del `<Confirmar>` con «Recargar», y el diálogo pasa a nombrar el borrador de ahora.
- **Medido:**
  - El pedido de guardar con 600 filas (sin diseño), en el navegador: **69.372 B**, 130 ms del clic a «Se guardó el borrador.» (informativo, escritorio).
  - Una fórmula sintética de 2.000 nodos con un diseño de unos 2.000 ítems: **400.650 B** de JSON, bajo el tope de 1 MB de una Server Action (Next no lo fija en
    `next.config.ts`: rige el de fábrica). Lo fija un test de Vitest; si un día pasa de 1 MB, es un hallazgo que decide la persona.
  - Abrir el editor con 600 filas sigue bajo los 80.900 B del spec base (lee además `estado, diseno, nota`, nulos en ese borrador).
- **Para el coordinador:**
  - En la fila del 4.21 de `docs/PLAN.md`: «El 4.21-3b se parte en **4.21-3b-1** (guardar el borrador desde el editor: crear sobre la publicada o pisar el
    borrador con su hora, el texto que reescribió el ⚙, el aviso de lo que el diseño no muestra, y publicar y descartar con la hora del borrador; cierra 4-8 de
    punta a punta) y **4.21-3b-2** (la auxiliar sin celda, P2: la migración de `validar_diseno()`)».
  - **4-8, cerrado de punta a punta:** la base lo cerró en el 4.21-2 y la app manda ahora las esperadas al guardar, publicar y descartar.
  - `ESTADO`: «4.21-3b-1: guardar el borrador desde el editor de la fórmula (cierra 4-8)».
- **Para el A:**
  - En `src/modules/cotizaciones/CLAUDE.md`, «Entra y sale», tras el texto del 3a-2: «guarda el borrador con `guardarBorrador` (`formula_guardar_borrador`): crea
    sobre la publicada con su diseño o pisa el borrador con su hora, sin releer, y escribe el texto que reescribió el ⚙; publicar y descartar mandan la hora del
    borrador (4.21-3b-1)». En «No se rompe», sumar a las excepciones de los textos de la base los PT409 de `formula_guardar_borrador()` y
    `formula_descartar_borrador()` (nombran a una persona y cuándo; el 22023 de guardar no se muestra).
  - En `.claude/rules/migraciones.md:59`, la excepción «`formula_guardar_borrador` hasta el 4.21» pasa a decir que la app manda siempre la hora (4.21-3b-1) y la
    base sigue aceptando la nula (P3).
- **Abierto (viene del 4.20-2c):** al descartar y al publicar, un error que no es PT409 ni falta de red sigue mostrando `error.mensaje`, que puede ser el texto
  de la base; guardar ya usa su texto propio. Se arregla en el paso que vuelva a tocar esos formularios.
- **Para el 3b-2:** P2 = a: `validar_diseno()` deja de pedir celda a una auxiliar `<fila>__<n>` (la que tiene celda sigue valiendo), con su espejo, sus casos y
  `nodosSinCelda()` (`entities/formula/sin-celda.ts`) sin auxiliares; compuerta `datos`, porque cambia qué acepta publicar sobre nodos ocultos. El soporte de los e2e
  que le pone celda a mano a `comision__1` (`e2e/soporte/formula-editor.ts:34-43`) puede quedar.

## 2026-11-08 — Pruebas sólo en lo clave

La persona: «elimina el testing innecesario; no quiero sobretestear la app, sólo las partes clave», para cerrar la Fase 4 rápido. Se escriben los tests de
`entities/` con dinero, fórmula o permisos, las pruebas SQL de RLS, permisos y `security definer`, las carreras donde hay candados o numeración y **un** e2e del
camino feliz por pantalla nueva. Se dejan de escribir: mutaciones fuera del motor de la fórmula y el dinero, salidas en rojo contra HEAD, sondas de medición,
e2e de volumen de interfaz (salvo leads, vehículos y cotizaciones), e2e de conflicto ya cubierto por SQL, `medir-*.sql` de tablas de configuración, `movil` en
Configuración y capturas. Una inestable que pasa al reintentar no es un abierto ni un pedido (el pedido-1 y el pedido-2 costaron ≈ 3 h del carril A); un
presupuesto pasado por ≤ 5 % se sube en RENDIMIENTO. El auditor del plan corre una vez y sólo en pasos de datos o dinero (bloquea → la sesión corrige o achica),
el del informe sólo con RLS, permisos, `security definer` o dinero; hasta 6 commits de código por parte (eran 3: cada parte de más es un ciclo de plan, PR y CI).
Las pruebas que ya existen siguen corriendo; borrar las caras se decide aparte. Regla en `.claude/rules/e2e.md` › «Pulido y rigor por tipo de paso».

<!-- paso:4.20-4a -->

## 2026-11-08 — Paso 4.20-4a

- **Compuerta `datos`** (la decisión vigente «aprobar», la recomendada de cada una): **P1**, la vigencia y el vehículo obligatorio los cambia `cotizaciones.configurar` **concedida sin origen**. La RPC mira `mis_permisos()` con `origen_id is null`, no `tiene_permiso()`, que con origen nulo acepta la clave en cualquier origen. Es una regla nueva en la base: un ajuste de toda la empresa del cotizador no lo cambia quien configura un origen. `puedeCambiarAjustesDeCotizacion()` es su espejo (`origenesCon(…) === 'todos'`). **P2**, una RPC nueva, `empresa_guardar_ajustes_de_cotizacion(p_vigencia_dias, p_vehiculo_obligatorio, p_actualizado_en_esperado)`, y no sumar las dos columnas a `empresa_guardar_ajustes()`: no mezcla dos permisos en una función que hoy pide uno.
- **La versión es la de la fila:** la RPC usa el mismo `_exigir_version()` y el mismo texto que la de Empresa. Un guardado en Configuración › Cotización deja con `PT409` al formulario de Empresa abierto, y al revés; por eso la action revalida `/configuracion/cotizacion` y `/configuracion/empresa`. El plan decía el layout de `RUTAS.inicio`, como las otras dos escrituras de la fila; se acotó a las dos pantallas porque nada fuera de ellas lee estas columnas con caché (la hoja las lee al abrir).
- **Sin `client.ts`:** la action no sale por la entrada de cliente; su formulario (4.20-4b) vive en `empresa` y la importa por ruta relativa.
- **La carpeta es `features/ajustes-de-cotizacion/`** (el término del glosario), no `features/cotizacion/` como decía `docs/pasos/4.20-4/plan-del-a.md`: dentro de `empresa`, «cotizacion» se confunde con el módulo `cotizaciones`. El 4.20-4b pone ahí el formulario.
- **El `22023` no se vuelve error por campo:** `errorDePostgrest()` no lleva el `hint` y el esquema Zod rechaza antes lo mismo que la base (1 a 365, booleano); el `22023` sólo llega si alguien salta el formulario.

<!-- paso:4.19-3b -->

## 2026-11-08 — Paso 4.19-3b

- **Con qué nace el editor:** el borrador; sin él, **la copia de la publicada**; sin ninguna, la **omisión** (los grupos de la fórmula en su orden, el total con la etiqueta del nodo
  `total` recortada a 40 caracteres o «Total», `logo: true` y las tres columnas apagadas). Un borrador o una publicada ilegibles no se editan a medias: se dice por qué y se parte de la siguiente.
- **Lo alineado con la fórmula no se guarda solo:** quitar un grupo ajeno o sumar el nuevo cuenta como cambio y se guarda con «Guardar». «Guardar» está activo desde el principio sin borrador.
- **Lo que sólo rechaza `completa` no apaga «Guardar»:** lo que cruza con la fórmula (un nodo o un tipo de cambio de otro nivel) lo rechaza publicar; el editor lo dice arriba, «Con esto no se podría publicar».
- **Al navegador llega un contexto reducido** (`contextoParaElNavegador()`), no la `definicion`: su equivalencia con el contexto entero vale sobre el juego común y después de alinear (sin alinear, `{a sin lugar, z inexistente}` difieren).
- **Sin `maxLength` (4-74):** los topes cuentan caracteres (`caracteres()`); un emoji es uno.
- **«Buscar fila» es el camino a lo que pasa de 500 filas** (filtra en el navegador sobre todas las cargadas); mover, agregar o quitar grupos a mano queda como **4-101**.
- **Se rehacen en `plantilla` los orígenes de la pestaña** (`origenesDeLaTarjeta()` y la etiqueta «(inactivo)»), sin importar del área `formula` (la guarda de áreas lo prohíbe); si dos áreas lo necesitan, va al núcleo en otro paso.
- **La sección no lleva Vitest** (es un Server Component async): lo que decide está en `propsDelEditor()` y `origenesDeLaTarjeta()`, y la cubren E2 y E7. **No se cambia la descripción del hub** (`seccion.ts`).
- **El conflicto se va al llegar la versión**, no al pulsar «Recargar» (`useConflictoHastaLaVersion`); el editor se remonta con `key` por origen y esperada.

<!-- paso:4.19-3c -->

## 2026-11-08 — Paso 4.19-3c

- **Los botones viven en el editor y los modales fuera de su `key`:** los botones necesitan saber si hay cambios sin guardar (`hayCambios`), que sólo el editor sabe; los modales los monta
  `PestanaDeLaTarjeta`, sin `key` de versión, para que «Recargar» tras un PT409 remonte el editor y no pierda la nota.
- **«Publicar…» se apaga con su motivo a la vista y no por «Con esto no se podría publicar»:** sin borrador o con cambios sin guardar (se publica lo guardado, no lo que se ve). El
  contexto del navegador es reducido: lo que sólo ve la fórmula lo decide la base y su rechazo vuelve arriba del modal con la nota intacta.
- **«Descartar borrador…» se ofrece también con cambios sin guardar:** descarta lo guardado; lo sin guardar de esa versión no vuelve (queda bajo la clave de la versión vieja).
- **Un solo hook de panel** (`usePanelDeLaTarjeta`) con dos paneles: `useVueltaDelFoco` se llama una vez por clave y dos hooks con la misma se pisarían. Los nombres `publicar-tarjeta` y
  `descartar-plantilla` los fijaron los planes del 4.19-3 y 3b; la asimetría «tarjeta» / «plantilla» se conserva para no renombrar lo ya escrito en docs y planes.
- **«Nota de la versión», no «Nota»:** el pie del editor ya tiene una «Nota de la tarjeta». El texto dice «aquí» y no el «acá» del modal de la fórmula (tú neutro).
- **Se rehacen en `plantilla` el modal, el hook de publicación, el diálogo y las acciones** en vez de importar los de `formula`: la guarda de áreas lo prohíbe. Mover la nota al núcleo
  para que las dos áreas compartan un esquema sigue pendiente (de 4.19-3a).
- **El diálogo de descartar tiene PT409 y la fórmula no:** la base de la plantilla pide la versión esperada (4.19-1), así que el diálogo la manda, dice el conflicto y espera el borrador nuevo.
- **E1 de 3b sin aserción sobre los decimales de `actualizadoEn`** (ver bitácora): la precisión la prueba el PT409 de `-conflicto.spec.ts`.

<!-- paso:4.19-4 -->

## 2026-11-08 — Paso 4.19-4

- **El hueco es un tipo del núcleo con una lectura plana, no un contexto:** `plantilla` no puede importar `tarjeta` (ni su tipo), así que `entities/vista-previa-de-la-plantilla.ts` lleva la
  lectura (sin `Map`, porque cruza props de la página al editor) y `tarjeta` la vuelve `TarjetaLista` con un adaptador puro. La página de `src/app` pasa el componente por la sección,
  la pestaña y el editor. Va en `pantallas/tarjeta-plantilla.ts` y no en `tarjeta.ts`, para no sumar al JS de `/cotizaciones/nuevo` (4-73).
- **Lugar:** al costado desde `xl` (columna `minmax(0, 24rem)`, pegada arriba); debajo, tras el cuerpo del editor y antes de «Guardar». La página se ensancha a `max-w-6xl` sólo en «Tarjeta».
  La columna no es de `24rem` fijos: con el texto al 200 % (`html { font-size: 200% }`) los media queries siguen en 1280 px y una columna fija ensanchaba la página.
- **Tipo de cambio y leyenda:** el tipo de cambio es la etiqueta del nodo del bucket, no el nombre de `tipos_cambio`; la leyenda es sólo la escrita (**4-103**: lo demás no viaja al navegador).
- **Cifras de ejemplo (P6), deterministas:** la fila n-ésima vale `(n mod 8 + 1) × 250` USD, lo aparte `100 × (posición + 1)` y el total es la suma de las filas dibujadas. Pasan por `<Monto>`:
  con el Modo Live encendido se ocultan, como en cualquier pantalla.
- **Tope de 4 filas por grupo** (`FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA`): con 500 miembros en un grupo la vista previa suma ≈ 150 nodos; el aviso lo dice.
- **Página de ejemplo sin `Date`** (desajustaría la hidratación): textos fijos y la marca sin logo, para que el interruptor «Logo» se note.
- **Un tono sin colores válidos se ve neutro:** `<EstiloDeTonos>` lo descarta entero. `claro` y `oscuro` son opcionales en `TonoDelCatalogo` para no tocar cada fixture; la lectura de la base siempre los trae.
- **E1 corre también en móvil** por precedente de los cinco specs de la pestaña (la regla de «sin `movil` en Configuración» no se estrenó para esta pestaña).
- **Sólo `diferidos.tsx` puede declarar una diferida** (guarda `diferidos.test.ts`): la de la vista previa va en el de `tarjeta`, con un `div` de esqueleto y no `<Skeleton>`, para no sumar un import al archivo que viaja con la hoja.

<!-- paso:4.20-4b -->

## Paso 4.20-4b (2026-11-08)

- **Sólo lo clave:** del plan del B (`docs/pasos/4.20-4/plan-del-a.md`) no se escribieron el e2e del conflicto (E3: lo prueba la T3 de `supabase/tests/empresa-ajustes-de-cotizacion.sql`), el de la hoja sin vehículo (E4: sin código nuevo, la hoja ya lee el ajuste al abrir) ni el test de componente: la regla «Pruebas: sólo lo clave» de la persona (2026-11-08) es posterior. Quedan un e2e del camino feliz y uno de quien configura un solo origen.
- **Nombres:** el componente es `FormularioDeAjustesDeCotizacion` (`AjustesDeCotizacion` ya es el tipo); el aviso, «Ajustes de cotización guardados», como «Ajustes de la empresa guardados». El motivo sin permiso va en un `<Aviso>` arriba del bloque, como en Empresa.
- **Ajustes al final:** la pestaña va después de «Fórmula»: quien configura un solo origen sigue entrando por «Fórmula» y quien tiene todo, por «Niveles de acceso».

<!-- paso:4.27 -->

## 2026-11-08 — Paso 4.27-1

- **Lo que contestó la persona:** la compuerta `datos` del plan, «aprobar», con las recomendadas de P1 a P11:
  - P1 comenta quien ve la cotización.
  - P2 adjunta quien puede guardarla: preventa, ver y editar; final, ver y `final.gestionar` del origen.
  - P3 un solo nivel de respuestas.
  - P4 raíces de la más nueva a la más vieja, de a 20, con sus primeras 20 respuestas.
  - P5 el autor edita y borra; quien modera borra lo ajeno y no lo edita.
  - P6 reportar no cambia el estado ni la versión; moderar es invalidar o descartar los reportes.
  - P7 moderar una final pide `final.gestionar`.
  - P8 los tipos del bucket, hasta 20 por cotización, sin repetir el archivo.
  - P9 todo por RPC, con las escrituras directas revocadas.
  - P10 «los niveles» del terminado son los permisos de la cotización.
  - P11 la favorita es una marca privada; el filtro del listado no entra.
- **Lo que se aprobó en permisos (la base):**
  - Policies de `storage.objects` («cotizaciones: leer», «subir») y de `cotizaciones_adjuntos` («crear», «borrar») con ver y la regla de guardar (4-69).
  - «cotizaciones_reportes: leer» pide moderar y ver.
  - Sin insert, update ni delete para `authenticated` en comentarios, adjuntos, reportes y favoritos.
  - Doce funciones `security definer` (`cotizacion_puede_adjuntar` y las once RPC), todas con `search_path = ''` y sólo de `authenticated` y `service_role`; `_comentario_item` y
    el trigger, de nadie; `_cotizacion_de_objeto`, inmutable de invocador.
  - `cotizacion_moderar` cambia de firma: `(uuid, timestamptz, estado_cotizacion)`.
  - Sin permisos nuevos; el catálogo dice que comentar es de `ver` (antes decía `editar`).
- **Lo no obvio:**
  - **Borrar quita la fila salvo en una raíz con respuestas**, y la última respuesta se lleva la raíz eliminada: así `cotizacion_comentarios` lee sin descartar
    filas que crecen con la profundidad (`.claude/rules/escala.md`), y un `check` impide una respuesta eliminada. La migración normaliza antes lo que hubiera entrado por
    PostgREST (re-cuelga respuestas anidadas, quita respuestas eliminadas y raíces eliminadas sin respuestas) y crea los `check` `not valid` + `validate`.
  - **Reportar no mueve la versión** (los contadores no la mueven): quien tiene la cotización abierta no recibe un conflicto porque otra persona la reportó.
    «Descartar los reportes» es moderar a `activa` una que ya está activa: borra los reportes y, como el estado no cambia, la versión tampoco. `sin_cambios` sólo
    con el mismo estado y, si es `activa`, sin reportes.
  - **Orden de candados:** raíz → respuesta (comentar toma la raíz `for share`; borrar una respuesta, la raíz y la respuesta `for update`); cotización → reportes (moderar
    la toma `for no key update` y borra los reportes; retirar la toma antes de borrar el suyo, porque el trigger de contadores la toma después y se cruzaba con
    moderar: 40P01). Moderar mira el permiso global antes de tomar la fila.
  - **La carpeta y el objeto se comprueban en `cotizacion_adjuntar`, no en un trigger:** es la única que escribe, y las pruebas de la purga y `medir-jobs.sql`
    insertan adjuntos sin objeto. El trigger sólo rescata la ruta de la cola de limpieza. Tipo y tamaño salen de la metadata de storage cuando está.
  - El tope de 20 adjuntos se mira sin candado: dos a la vez pueden dejar 21 (aceptado).

## 2026-11-08 — Paso 4.27-2

- **Lo que contestó la persona** (compuerta `producto`, recomendadas): P1 a, la sección «Comentarios» siempre bajo la hoja, que lee al llegar a la vista; P2 a, al tope de 500
  «Ir a una fecha».
- **Sin `revalidatePath`** en comentar, editar y borrar: la sección lleva su propia lista y refrescar la página volvería a dibujar la hoja (y su recálculo).
- **«Ir a una fecha» sin migración:** el cursor `(inicio del día siguiente en la zona, 00000000-0000-0000-0000-000000000000)` trae ese día y lo anterior, porque ningún uuid es
  menor que el nulo y la RPC compara `(creado_en, id) <`.
- **`puedeModerar` lo dice la lectura**, no la sesión: el hueco sólo cruza el id al navegador y la base contesta con el mismo `tiene_permiso` que mira al borrar.
- **«Cancelar» de editar descarta sin preguntar:** lo original sigue en la base. Los borradores de editar y responder viven en la sección por clave, aparte de la lista, para
  que «Recargar» tras un conflicto los conserve y «Guardar» mande la versión nueva.
- **Se responde también a una raíz eliminada** que sigue con respuestas (la base lo admite).

## 2026-11-08 — Paso 4.27-3

- **Lo que contestó la persona** (compuerta `datos` del plan, «aprobar»): P1 a, el bloque «Adjuntos» dentro de la sección «Comentarios», arriba del campo, leído con la
  primera página y en el mismo `diferido()`; P2 a, quitar con `<Confirmar>` por URL (deshacer cambiaría el autor); P3 a, `mio` por el `sub` de `getClaims()` del navegador
  (tras la auditoría: el hueco sigue síncrono y sin depender de `equipo`); P4 a, sin miniaturas (bajarían el original de 1600 px por imagen en una lista).
- **Subida propia al bucket privado:** `subirPorHash` sólo admite buckets públicos y `src/shared` no es del C; `infra/comentarios/adjuntos.client.ts` copia su forma (hash,
  `upsert: false`, «ya existe» no es error). Se pide al A unificarla.
- **El bucket por constante** (`BUCKET_DE_ADJUNTOS`): un `.from('cotizaciones')` literal lo marca la guarda de escala como consulta sin tope.
- **`puedeModerar` de la lectura de comentarios**, como borrar un comentario: una sola fuente en la sección y, con «Ver como», la base usa los permisos reales.
- **«Tú» para lo propio** y la URL firmada pedida por clic (60 s), nunca al leer la lista. El e2e no borra la cola de limpieza: `storage-gc` barre el PDF quitado.

## 2026-11-08 — Paso 4.27-4

- **Lo que contestó la persona** (compuerta `datos` del plan, «aprobar»): P1 a, «Reportada» sólo para quien puede moderar (quien reportó lo ve en su botón); P2 a,
  «Reactivar…» con `<Confirmar>`, que también descarta los reportes; P3 a, «Invalidar…» en toda cotización activa, con o sin reportes.
- **La insignia va en un hueco nuevo del núcleo** (`Insignias`, después de la clase y la vigencia), no dentro de `Acciones`: es estado de la cotización, no una acción,
  y su lugar es junto a «Vencida». El C lo agregó en su PR, chico y con sus pruebas.
- **Las marcas se leen en el servidor**, tras `<Suspense>` y con `cache()` (la usan los dos huecos): la hoja no las trae, y leerlas en el navegador sumaba el cliente
  y Zod al JS en frío de la guardada (cerca de su tope). Al navegador llegan el id, la versión, la marca propia y las acciones de moderar ya calculadas.
- **Los reportes del Confirmar, hasta 21 sin «Ver más»:** hay uno por persona (lo acota el equipo) y moderar no depende de leerlos todos.
- **«Retirar mi reporte» sin confirmar, con «Deshacer»** (vuelve a reportar con el motivo que tenía): es reversible.
- **Invalidar y reactivar avisan que lo no guardado se descarta:** mueven la versión y la hoja se vuelve a montar (auditoría del plan); arreglarlo es del núcleo.

<!-- paso:4.21-3b-2 -->

## Paso 4.21-3b-2 (2026-11-08)

- **P2 del 3b-1, hecho:** una `constante` auxiliar de un número escrito en el texto de su fila (`<fila>__<n>`, la que crea el compilador) **no pide celda** en el
  diseño. Se edita por el texto de su fila. Si tiene celda, vale como siempre. Una fila constante («Sumar fila», un cálculo que pasa a número) sí la pide.
- **P1 de este paso, compuerta `datos`, como la contestó la persona:** «aprobar: la regla del editor, entera». La base reconoce la auxiliar con la misma regla con
  la que el editor decide qué es una fila (`filasDe`), incluido que el texto de la fila **no la nombre**. Por eso una fila escrita a mano como `total__1`, que el
  texto de `total` nombra, sigue pidiendo celda.
- **La regla, una sola vez en TS:** `entities/compilador-auxiliares.ts` (núcleo, del carril b: se sumó a su `dueno_de` en `docs/plan.yaml` y T12 de
  `areas-de-cotizaciones-plan.test.ts` pasó de 37 a 39 archivos de las familias del compilador). `filasDe()`, `validarDiseno()` (§5) y el aviso del editor
  (`nodosSinCelda()`) la usan. Su espejo en la base es `_diseno_auxiliares(p_def)`: invocadora, STABLE, `search_path` vacío, sin leer tablas, con los grants de los
  demás `_diseno_*`.
- **(e), el texto, en SQL:** los nombres salen de un patrón de clases **enumeradas**, sin rangos (no dependen de la colación) y sin grupos de captura
  (`regexp_matches(…, 'g')` devolvería el grupo). T1b compara, en 5.000 textos al azar con semilla fija, los nombres del patrón con los del léxico del compilador.
  T1c exige que la migración copie el patrón letra por letra. Antes del patrón, `strpos`: si ningún id de la cadena aparece como subcadena, no aparece como nombre.
- **(f), la posición tomada por otra cadena, no se alcanza:** una cadena anterior de raíz q no pasa por q, que tiene texto, así que (c) la corta antes. Se espeja
  literal y no lleva caso ni mutación.
- **La excepción es sólo de `constante`:** el compilador sólo crea `constante` y `calculo`, y el `calculo` nunca pidió celda. Un `input` con id de auxiliar dentro de
  una cadena sigue pidiéndola (su caso en el juego).
- **Cómo se le dice a §5, sin copiar `_diseno_secciones()` (cambio sobre el plan):** el plan cambiaba la firma de `_diseno_secciones()` (14 argumentos) y copiaba
  sus ≈ 217 líneas en una migración aparte. En cambio, `validar_diseno()` le pasa los tipos con cada constante auxiliar marcada como `constante_auxiliar`. Ese
  arreglo sólo decide §5: en §2 a §4, `_diseno_secciones()` compara el tipo con `opcion`, `bandera`, `tabla` y `calculo`, nunca con `constante`. Así una auxiliar
  con celda, con atajos o con subtotal se revisa como antes (`atajos_no_es_tabla`, `subtotal_no_es_calculo`). Con eso queda una sola migración de ≈ 210 líneas,
  la firma no cambia y no queda un cuerpo copiado que pueda desviarse de la base. `_diseno_modos()` sigue recibiendo los tipos de verdad.
- **Sin los mutadores nuevos del corpus (cambio sobre el plan):** el plan sumaba `auxiliar_sin_celda` y `fila_parecida_sin_celda` a los mutadores del corpus. No se
  sumaron (la persona, 2026-11-08: pruebas sólo en lo clave). Lo cubren los 14 casos nuevos del juego, que corren en TS y en la base. El corpus se regeneró
  porque se generan desde los casos válidos.
- **Seguridad, como la vio la compuerta:** publicar acepta ahora una auxiliar `constante` sin celda (antes, `nodo_sin_seccion`). No entra a la `visibilidad`
  (`_compilar_visibilidad` sólo nombra lo dibujado), `_nodos_visibles` la da sólo a `cotizaciones.configurar`, sin editar, y el recorte la deja fuera de la hoja y
  del recálculo de quien cotiza. Lo prueba `supabase/tests/areas/formula/auxiliar-sin-celda.sql` (S1–S4, S6), y dos mutaciones de la visibilidad lo hacen caer.
  Ninguna policy, RLS, `security definer`, permiso ni Vault nuevo.
- **Medido:** `db:medir` dentro de sus topes: `validar_diseno` 6,5 / 58,8 ms (topes 15 / 136; razón 9,0), 290 / 1.860 buffers de columna externa;
  `formula_publicar` 20,1 / 191,3 ms (topes 55 / 550). El ayudante solo, con una auxiliar por fila: 1,9 / 18 / 72 ms con 100 / 1.000 / 4.000 filas de texto
  corto, y 31 / 307 / 1.243 ms con textos de ≈ 2.000 caracteres que obligan al patrón en cada fila. Es lineal. El sintético de `db:medir` no lleva texto (no
  recorre el camino nuevo), y ese peor caso con texto pasa el tope de `validar_diseno` con 2.018 ítems desde unas 450 filas: queda informativo, sin guarda. La primera versión era cuadrática (40 → 308 ms de
  1.000 a 4.000 filas): una consulta dentro del bucle nombraba `v_refs[i]` y recibía el arreglo entero como parámetro. Ahora el elemento va antes a una
  variable, y el objeto final se arma con `jsonb_object_agg`, no concatenando.
- **Para el coordinador:**
  - En la fila del 4.21 de `docs/PLAN.md`: «4.21-3b-2 (la auxiliar de un número escrito en un texto ya no pide celda en el diseño: P2; compuerta `datos`)».
  - `ESTADO`: «4.21-3b-2: la auxiliar de un número no pide celda en el diseño (P2)».
  - El abierto de la constante sin celda queda sólo para la fila constante, hasta el 4.22.
  - `asignado.modulos` del 4.21 no lista `validar-diseno-*.ts` ni `casos-de-diseno.json` (el `dueno_de` sí). `compilador-auxiliares.ts` se sumó al `dueno_de`.
- **Para el A:** en `src/modules/cotizaciones/CLAUDE.md` › «Archivos clave», en la viñeta de la validación, tras «`validar-diseno*.ts` a `validar_diseno()` (28)»: «una
  `constante` auxiliar de un número escrito en el texto de su fila (`compilador-auxiliares.ts`, `_diseno_auxiliares()`) no pide celda (4.21-3b-2)».

<!-- paso:4.21-3c -->

## Paso 4.21-3c (2026-11-08)

- **La compuerta `producto`, como la contestó la persona** (todas las recomendadas):
  - **P1:** del tipo de cambio sólo se edita el de cada grupo, eligiendo su bucket. `buckets` y `total_en` no se editan: con modos en el diseño, la hoja usa
    los del modo, y los modos son del 4.22.
  - **P2:** no se suman ni quitan grupos en el 4.21. La plantilla de la tarjeta tiene que nombrar exactamente los grupos de la fórmula (`validar-plantilla.ts`);
    con uno de más o de menos, esa versión se quedaría sin tarjeta ni PDF.
  - **P3:** una fila se puede sacar de su grupo, con el aviso «Sin grupo, una fila no entra en el total.».
  - **P4:** el grupo de una fila se cambia en el formulario del grupo («Filas del grupo», «Quitar», «Sumar una fila»). La lista sólo dice el grupo de cada fila
    y no suma un selector por fila.
- **Qué puede sumar a un grupo:** una fila raíz (nunca una auxiliar) que `validarFormula()` acepta como miembro: da un monto, tiene formato de monto y no tiene
  salida (`puedeSumarAlGrupo()`). T4 lo compara con `miembro_no_es_monto` y `miembro_con_salida` en cada tipo de nodo de la fórmula de prueba.
- **Mover una fila sólo cambia `grupo` de su raíz:** su texto, sus auxiliares y su lugar no se tocan. Una fila quitada queda **sin** la clave `grupo` (no con un
  valor vacío).
- **El tono de la tarjeta (obs. 6 de la auditoría):** la plantilla puede elegir el tono de un grupo (`forma-de-plantilla.ts`, `tono?`). En la tarjeta y el PDF, el
  tono del grupo manda sólo si la plantilla no elige otro. El formulario lo dice bajo «Tono».
- **El «Aplicar» de una fila, a su hook:** `use-aplicar-fila.ts` recibe los `set` de `useState`, para que `aplicar` siga estable para las `FilaDelEditor` con
  `memo` (con un callback nuevo en cada render se volverían a dibujar las 500 filas).
- **Un `feat` con una extracción (obs. 3 de la auditoría del informe):** `4ff55f8f` lleva también el paso del «Aplicar» de una fila a `use-aplicar-fila.ts`, sin cambio de conducta. Lo impuso el lint de 80 líneas al sumar los grupos al hook del editor: es una excepción consciente a «un commit, un cambio».
- **Una auxiliar nunca suma a un grupo:** lo prueba T4 con una auxiliar `usd` en una cadena de `filasDe()` (el `fix` de la auditoría del informe, `83a18e41`). Una auxiliar compilada lleva `raw` o `pct` y ya la rechaza `esMonto`.
- **Microdecisiones de texto (`ui.md`):**
  - El botón dice «Editar», con el nombre accesible «Editar el grupo <etiqueta>».
  - «Queda sin grupo» se dice antes de aplicar y «Quedó sin grupo» después.
  - «n fila(s)» es el número de miembros de la fórmula en memoria, no un conteo de la base.
  - Una fórmula sin grupos no monta la sección ni lee los tonos.
- **Para el coordinador:**
  - En la fila del 4.21 de `docs/PLAN.md`: «**4.21-3c** (editar los grupos: etiqueta, plazo, tono, tipo de cambio y sus filas) está hecho; **el 4.21 está
    hecho**». Marcar el 4.21 hecho en `plan.yaml`.
  - `ESTADO`: «4.21-3c: los grupos de la fórmula en el editor (plazo, tono, tipo de cambio y sus filas); cierra el 4.21».
  - **Un abierto nuevo** para los abiertos de la Fase 4: sumar y quitar grupos en el editor, y editar `buckets`, `total_en` y los modos, esperan a que la
    plantilla de la tarjeta se edite junto con la fórmula (P2.1, P1.1). Lugar: `entities/formula/grupos.ts` y `entities/plantilla/validar-plantilla.ts`.
  - 4-5, 4-6 y 4-8 ya los cerraron el 3a-1 y el 3b-1. Si siguen como abiertos en `docs/PLAN.md`, márcalos cerrados.
  - El 4.21 tiene `riesgo: rojo`, sale sin `parcial` y no se integra solo.
  - **Pulido para la Fase 9** (una línea en `docs/PLAN.md`): con más de 500 grupos, el `<AvisoDeTope>` de la sección «Grupos» ofrece «Busca una fila por su nombre o su etiqueta.», que no lleva a los grupos que quedan fuera (`grupos-de-la-formula.tsx`). No pasa en la práctica: la plantilla nombra cada grupo.
  - (obs. 5) `TOPE_DE_TONOS_DEL_EDITOR` (`entities/formula/grupos.ts`) repite `TOPE_DE_TONOS` del área `plantilla` (`entities/plantilla/lectura-de-la-plantilla.ts`),
    porque un área no importa otra. Moverlo al núcleo cuando el A pueda.
- **Para el A:** el texto de la ficha `src/modules/cotizaciones/CLAUDE.md` (núcleo; «Entra y sale», tras lo del 3a-2): «edita los grupos que hay (etiqueta, plazo,
  tono, tipo de cambio por su bucket y sus filas) en la sección «Grupos» del editor (4.21-3c): `entities/formula/grupos.ts`, con los tonos leídos desde el
  navegador (`infra/formula/tonos.client.ts`)».

<!-- paso:4.23-1 -->

## 2026-11-08 — Paso 4.23-1

- **Lo que contestó la persona:** la compuerta `datos` («aprobar»), con P1–P5 en su recomendada:
  - **P1:** la pantalla edita y reordena en su memoria y publica la tabla entera con nota y versión. No hay borrador en la base ni RPC por fila, así que
    reordenar no es una escritura propia y la carrera de 5b-7 no puede darse en las tablas.
  - **P2:** una compartida pide `cotizaciones.configurar` en **cada** origen que la usa.
  - **P3:** se revoca la escritura directa.
  - **P4:** el tope es de 2.000 filas.
  - **P5:** columnas, alta y baja de tablas quedan fuera del 4.23 (por ahora, sólo por SQL).
- **Lo no obvio:**
  - **Un origen está afectado si su publicada usa la tabla en un nodo o en su copia** (`params.tablas ? clave`). Si sólo contara el nodo, una copia sin nodo
    se quedaría vieja y un borrador que vuelva a sumar el nodo la publicaría sin PT409.
    - La lista se arma tras el `for update` de la tabla y la publicada se relee dentro del candado de cada origen: si dejó de usarla, se salta; si empezó,
      se pide su permiso (R4 y R5).
    - Un origen inactivo cuenta igual: su fórmula existe y la usa, así que recibe la N+1 y su permiso se pide.
  - **«La tabla no cambió.» mira también las publicadas.** Tras `formula_revertir`, la publicada vuelve a la copia vieja y la viva sigue en la versión
    nueva: publicar las mismas filas tiene que devolverle la tabla.
    - **Para el 4.23-3:** el editor muestra la viva, no la copia de la publicada.
  - **Una compartida deja ver que otro origen la usa.** Quien configura un solo origen recibe 42501 si otro la usa, aunque no pueda leer la fórmula de ese
    otro (se acepta con P2).
  - **`p_version_esperada integer`,** no `p_actualizado_en_esperado`: la versión entera es la que el PT409 nombra («… la versión 3 de esta tabla …»), como
    la publicada esperada de la fórmula es una versión y no una hora (`.claude/rules/migraciones.md` › «Forma»).
  - **`aplicado_en`** queda `policy tablas_referencia (leer), tabla_referencia_publicar`: la lectura sigue siendo la policy con ese permiso.
  - **El `hint` de una fila va desde 0** (`filas.1.monto`, como un camino de Zod) y el mensaje dice la fila desde 1 («La fila 2: …»). Un `anio` es entero.
    `_tabla_referencia_filas_validas` es `stable` (con `immutable`, `db:lint` daba un aviso nuevo por el `raise`).
  - **Las filas inactivas se borran al publicar:** el cálculo y la copia sólo leen las activas, y la historia queda en las copias de cada versión de la
    fórmula. Una celda nula se guarda ausente (`jsonb_strip_nulls`) y así se compara.
  - **La base no congela al publicar una fórmula** (`_formula_forma` sólo valida). Una versión anterior que leía la viva recalcula con las filas nuevas;
    lo guardado de una cotización no cambia (la prueba de dinero guarda una y lo comprueba).
- **Para el coordinador:**
  - **La partición.** En `docs/PLAN.md`, la fila del 4.23 se parte en tres:
    - 4.23-1: la base (5b-7, versión de la tabla, `tabla_referencia_publicar` con la N+1 de sus fórmulas). Nivel 2 + `db:carreras`. Hecho.
    - 4.23-2: entidades, lectura por cursor y la action. Nivel 1.
    - 4.23-3: la pestaña «Tablas» de Configuración › Cotización y 4-47. Nivel 1.
  - **`plan.yaml`.** El id `4.23` se reemplaza por tres:
    - `4.23-1`: `depende_de: ['4.20']`, terminado «Las tablas de referencia tienen versión y se publican con la N+1 de sus fórmulas; cierra 5b-7».
    - `4.23-2`: `['4.23-1']`.
    - `4.23-3`: `['4.23-2']`, terminado «Se editan, reordenan y publican desde Configuración › Cotización; cierra 4-47».
    - El `4.28` pasa a depender de `4.23-3`.
  - **Línea de ESTADO:** «B/C, 4.23-1: las tablas de referencia tienen versión y se publican con la N+1 de sus fórmulas (5b-7 cerrado)».
  - **5b-7, cerrado.** El candado de `tipo_seguimiento_mover` se queda: la carrera nueva cae sin él.
  - **4-47** sigue para el 4.23-3. Su segunda mitad (una congelada sin viva se rotula con la clave): ninguna RPC deja hoy una congelada sin viva (no hay baja
    de tablas, P5), y el 4.23-3 decide si la cierra con ese argumento o rotula.
  - **RENDIMIENTO:** «Tablas de referencia: hasta 2.000 filas por tabla (`tabla_referencia_publicar`). La copia congelada viaja entera en cada
    `cotizacion_evaluar`, y el tope la acota.»
  - **`scripts/carreras.mjs` ya pasa de 300 líneas** (361). No se partió en este paso: R4 y R5 van en `scripts/carreras/tablas-compartida.mjs`, que llama
    `tablas.mjs`, y sólo se sumaron una importación y una llamada.

<!-- paso:4.23-2 -->

## 2026-11-08 — Paso 4.23-2

- **Lo no obvio:**
  - **Primero la versión y después las filas.** Si alguien publica entre los pedidos, se mezclan filas viejas y nuevas, pero la versión leída es la vieja y
    publicar da PT409: nunca se pisan filas nuevas.
  - **La lectura es entera o nada.** `tabla_referencia_publicar()` borra todas las filas y pone las que recibe: una fila que no se lee, o más de 2.000, y
    `leerTablaParaEditar` no devuelve la tabla (el tipo no deja armar un pedido con una tabla cortada).
    - Se para sólo con una página vacía o con el tope + 1, nunca con una página corta: `max_rows` es del despliegue (en la nube no lo fija `config.toml`). Cuesta un
      pedido más: 3 con `max_rows` 1.000.
  - **El 22023 con `hint` va con el mensaje tal cual,** no por `errorDePostgrest`: «… la tabla no tiene la columna «x».» dice «column» y se cambiaría por el
    genérico (`src/shared/lib/errores.ts`). El PT409 también va tal cual.
  - **El espejo copia tres detalles de la base:** el largo en puntos de código (`char_length`), las claves por punto de código con un comparador propio
    (`collate "C"`; el `<` de JS compara unidades UTF-16 y difiere fuera del BMP) y la etiqueta recortada sólo de espacios U+0020 (`btrim`). Además rechaza un
    `\u0000` y un surrogate suelto, que la base rechaza fuera del 22023 al pasar a jsonb.
  - **Diferencia aceptada del espejo:** una `etiqueta` que no es texto (sólo por SQL, P5) cae a la clave; la base la muestra como texto con `->>`.
  - **Una celda es número, texto, nulo o booleano.** El booleano sólo entra por SQL: se conserva y la base lo rechaza al publicar con su celda. Una celda que es
    un objeto o una lista hace fallar la lectura: esa tabla no se edita desde la pantalla.
- **Para el coordinador:**
  - **Línea de ESTADO:** «B/C, 4.23-2: las tablas de referencia se leen enteras por cursor y se publican por una action (sigue el 4.23-3)».
  - **RENDIMIENTO:** «El editor de tablas lee una tabla entera por `(orden, id)` hasta una página vacía o el tope de 2.000 + 1: ≤ 3 pedidos con `max_rows`
    1.000». Se suma a la del 4.23-1.
  - **Copias en el área `tablas`** (un área no importa otra): la nota de publicar (`esquemaDeNotaDeTabla`, igual a `esquemaDeNota` de `formula`) y el pedido
    de 1.000 filas (`FILAS_POR_PEDIDO`, igual a `FILAS_POR_PAGINA` de `formula`). Si el A los quiere compartir, van al núcleo.

<!-- paso:4.22-1 -->

## 2026-11-08 — Paso 4.22-1

- **Se parte en seis** (el 4.22 junta lo puro, la pantalla, la vista previa y una migración): **4.22-1** lo puro (hecho); **4.22-2** la pestaña con secciones y
  celdas, el aviso visible y guardar el borrador (`guardarBorrador` ya acepta `diseno`); **4.22-3** variantes, interruptores, atajos, subtotales, modos y tarjeta;
  **4.22-4** el catálogo de tonos (`tono_crear|guardar|eliminar` ya existen); **4.22-5** la vista previa a 412 y 1.280 px y al 200 %; **4.22-6** 4-30 (rojo, datos).
- **Preguntas que quedan para las partes que siguen** (la recomendada, primero; sin respuesta se toma ésta):
  - **P1 (producto/UX, 4.22-2) dónde vive el editor:** (a) pestaña nueva «Diseño» en Configuración › Cotización; (b) panel dentro de «Fórmula» (choca con `b/4.21`); (c) ruta propia.
  - **P2 (producto/UX, 4.22-5) cómo se ve 1.280 px en `max-w-3xl`:** (a) caja con scroll horizontal al ancho real; (b) escalada con `transform`; (c) sin el tope de ancho.
  - **P3 (producto, 4.22-5) de dónde sale la hoja de la vista previa:** (a) un armador puro en TS con cifras de prueba; (b) sólo la estructura (ya no sería «el mismo componente»).
  - **P4 (datos, 4.22-6) 4-30:** (a) `validar_diseno()` rechaza publicar un diseño de más de N ítems (regla nueva, espejo TS; N sale de medir); (b) sin tope, sólo aviso; (c) la hoja divide.
- **Lo no obvio:**
  - La visibilidad que da el diseño sigue siendo la que compila la base al publicar; `visibilidadDelDiseno()` es su espejo para mostrar y avisar, no la autoridad.
  - `docs/COTIZADOR.md` dice que lo no dibujado entra como `{todos, null}`; el SQL sólo lo hace con el total y lo `aparte`. Se sigue el SQL.
  - **Límites del aviso:** sólo la suma directa (`op: 'suma'`); no sigue cadenas (suma de sumas), ni `restar`, ni `porcentaje_de`. Si dos sumandos quedan sin ver, o uno sin
    dibujar además del restringido, no avisa (no se deduce con dos incógnitas). Es un aviso, no una garantía: la base nunca deja de enviar el total.
  - `ponerNiveles()`: «todos» se omite en una sección; en una celda se escribe si su sección está restringida (la celda gana a su sección: omitirlo la dejaría restringida).
- **Para el coordinador:** en la fila del 4.22 de `docs/PLAN.md`, tras «Prompts: 3.», sumar «Se parte en 4.22-1 (lo puro: visibilidad del diseño, aviso de deducción y
  par ver/editar), 4.22-2 (la pestaña: secciones y celdas; guarda el borrador), 4.22-3 (variantes, interruptores, atajos, modos y tarjeta), 4.22-4 (el catálogo de tonos),
  4.22-5 (la vista previa) y 4.22-6 (4-30, rojo de datos); cada parte menos la última sale con `parcial`.» `docs/ESTADO.md`: «4.22-1, lo puro del editor del diseño».
  **4-30 sigue abierto** hasta el 4.22-6. `docs/COTIZADOR.md` (el límite del aviso) dirá que cubre las sumas directas.

<!-- paso:4.22-2 -->

## 2026-11-08 — Paso 4.22-2

- **Preguntas sin respuesta → la recomendada** (la decisión vigente era de otras preguntas, las del 4.21): **P1 (a)** pestaña nueva «Diseño» en Configuración › Cotización
  (hecha aquí). **P2** (1.280 px: caja con scroll al ancho real), **P3** (armador puro con cifras de prueba) y **P4** (4-30: regla nueva en `validar_diseno()`, datos) siguen
  para las partes 5 y 6; P4 es compuerta `datos`.
- **Lo no obvio:**
  - El área `diseno` replica la lectura y la escritura de `formula` (su repositorio, su esquema de guardado, la comparación en profundidad): la guarda de áreas impide
    importar otra. Compartirlas subiéndolas al núcleo lo decide el carril A.
  - Los niveles se leen de `cotizaciones_niveles` (`select` para `authenticated`), no de `niveles_con_uso()` (pide `equipo.roles.ver|gestionar`).
  - Lo que `validarDiseno()` rechaza tras un cambio **queda aplicado y se dice**; «Guardar» no se apaga (un borrador puede quedar sin publicar; la base valida al publicar).
    Se pasan como `tonos` los de los grupos de la propia definición, así `tono_inexistente` no se dispara aquí (es del catálogo, 4.22-4).
  - Sólo «Quién la ve» se apaga donde la base daría `nivel_no_admitido` (total, lo aparte, la variante, el pct aparte; una sección que lo contiene). «Quién la edita»
    queda abierto: ver abierto con editar restringido vale.
  - `guardarDiseno` manda `definicion` y `params` como se leyeron, nunca los reconstruye; el e2e lo comprueba contra la publicada (jsonb a jsonb).
  - Se quitó del e2e el 200 % (es pulido, `e2e.md`): `min-w-0`, `grid-cols-[minmax(0,1fr)]` y `@container` ya van en los componentes.
- **Para el coordinador:**
  - **Mover, sumar y quitar secciones o ítems** (la estructura) no lo nombra ninguna parte de 4.22-2 a 4.22-6: asignarlo al 4.22-3 o a una 4.22-2b.
  - `docs/ESTADO.md`: «4.22-2: pestaña «Diseño» con secciones y celdas, aviso y guardar el borrador; siguen 4.22-3 a -6; mover/sumar/quitar sin dueño». `docs/PLAN.md`: nada
    nuevo si la fila ya lleva la partición del 4.22-1. `docs/COTIZADOR.md`: la pestaña «Diseño».
  - El hub dice «La fórmula y el diseño de la hoja de cada origen y los niveles de acceso.» (`seccion.ts`): el 4.20-4b (carril A) edita la misma línea; al integrar, unir ambos textos.

<!-- paso:4.22-3 -->

## 2026-11-08 — Paso 4.22-3

- **Preguntas:** ninguna nueva; P1–P4 siguen como las dejó el 4.22-1 (la recomendada). P2 y P3 son del 4.22-5; P4 (4-30), del 4.22-6, compuerta `datos`.
- **Lo no obvio:**
  - **Variante y subtotal sin campo:** no tienen más que su nodo (y el nivel de un ítem que no es celda lo hereda de su sección); cambiarles el nodo es mover estructura.
    Se dibujan como tarjeta de sólo lectura.
  - **Atajos:** la columna ofrece las claves de `match` y la `columna` del nodo `tabla` más la actual, sin leer la tabla de referencia (la base admite esas columnas).
  - **Ayuda de tabla:** sale de las tablas que nombran los nodos de la fórmula (`tabla` de tabla, tramo y depreciar) más la actual.
  - **`sumarModo` copia** `buckets` y `total_en` de la fórmula: valida de entrada. La clave se deriva del nombre (minúsculas sin tildes, `_`, `_2`…) y no cambia si se
    renombra el modo. Sin `total_en` o sin buckets no hay modos nuevos; los que ya hubiera siguen editables.
  - **`ver_total_bs`** no lo mira ninguna regla de `validarDiseno()`: el interruptor siempre está habilitado.
  - **Texto sin recortar al escribir:** la ayuda no pasa por `trim()` (un espacio al final es el de la palabra que sigue); sólo blancos la quitan. El nombre de un modo
    se aplica al salir del campo, por lo mismo. (El título de una sección, del 4.22-2, sí recorta al escribir.)
- **Para el coordinador:**
  - **Mover, sumar y quitar secciones o ítems** (la estructura) sigue sin dueño: asignarlo como un 4.22-3b o descartarlo.
  - `docs/ESTADO.md`: «4.22-3: ítems, cabecera y tarjeta del diseño; siguen 4.22-4 (tonos), -5 (vista previa) y -6 (4-30); mover/sumar/quitar sin dueño». `docs/PLAN.md`: en la fila
    del 4.22, sumar «4.22-3 (ítems, cabecera y tarjeta)».
  - El hub dice «La fórmula y el diseño de la hoja de cada origen y los niveles de acceso.» (`seccion.ts`): el 4.20-4b (carril A) edita la misma línea; al integrar, unir ambos textos.

<!-- paso:4.22-4 -->

## 2026-11-08 — Paso 4.22-4

- **Preguntas** (contestadas con la recomendada): **P1**, una pestaña propia «Tonos» después de «Diseño» (`?seccion=tonos`): el catálogo es de la empresa, se guarda al instante y no depende del selector de origen ni de «Guardar el borrador». **P2**, selector nativo más `#rrggbb`, muestra «Aa» y contraste en vivo, con «Guardar» siempre habilitado: al enviar, el motivo queda junto al campo.
- **Lo no obvio:**
  - **La lectura de tonos del 4.21 (`bcf1e208`) no se reusó:** no está en esta rama y sirve a otro uso (allá el navegador lee `clave` y `nombre` para elegir el tono de un grupo; aquí el servidor lee todo para editar). Al integrar no chocan; unificarlas sería un paso de pulido.
  - **«En uso» sólo lo dice el rechazo de la base:** `_tonos_lista()` no trae cuáles usa una fórmula, así que «Eliminar» siempre se ofrece y un 23503 sale como aviso con la frase de la base (nombra la fórmula). Una columna `en_uso` sería una migración de `datos`; no se abrió.
  - **La clave de un tono no cambia** (la nombran los grupos de una fórmula): editar manda sólo `nombre` y/o `colores`, y sólo lo que cambió, porque la base no vuelve a pedir AA a unos colores que no se tocaron.
  - **El AA se mira con los tres colores del tema bien escritos** y el motivo del AA reemplaza a la línea en vivo; un color a medio escribir no da contraste ni motivo de AA.
  - **El `<Confirmar>` de eliminar** se registró en `confirmar-con-url-formula.ts` (del B), no con el `REGISTRO` por carril (`areas-b/`): `confirmar-con-url-areas.test.ts` mockea ese archivo y habría caído con un registro más.
  - Las lecturas y escrituras del área `diseno` importan `features/niveles/actions/resultado.ts` (`comoResultado`), que es núcleo: es genérico y `FalloDeTono` tiene la misma forma que `FalloDeNivel`.
- **Para el coordinador:**
  - `docs/plan.yaml`: ya se sumó `pantallas/diseno-tonos.ts` al `dueno_de` del B en este PR (la guarda `areas-de-cotizaciones-plan` lo pide por cada segunda pantalla).
  - `docs/ESTADO.md`: «4.22-4: el catálogo de tonos (pestaña «Tonos»); siguen 4.22-5 (vista previa) y 4.22-6 (4-30, datos); mover/sumar/quitar secciones o ítems sigue sin dueño». `docs/PLAN.md`: en la fila del 4.22, «4.22-4 hecho: la pestaña «Tonos»».
  - El hub dice «La fórmula y el diseño de la hoja de cada origen y los niveles de acceso.» (`seccion.ts`); si quiere nombrar los tonos, es el mismo texto que edita el 4.20-4b: no se tocó.

<!-- paso:4.22-5 -->

## 2026-11-08 — Paso 4.22-5

- **Preguntas** (contestadas con la recomendada; ninguna toca datos ni permisos): **P1**, 1.280 px dentro de la pestaña es una caja con scroll horizontal al ancho real: es lo único que dispara los cortes de la hoja, que miran su contenedor. **P2**, un armador puro en TS que dibuja con los componentes de la hoja de verdad. **P3**, cifras de prueba que no leen nada (datos en 0, sin tipos de cambio ni tablas vivas): el objetivo es el ancho y el orden, no el número; leer el terreno como el editor de la fórmula pide subir `leerElTerrenoDePrueba` al núcleo y eso lo decide el carril A. **P4**, la vista previa lo ve todo (sin recortar por nivel; un «Ver como: <nivel>» sería otro paso de pulido). **P5**, un ancho a la vez, y «200 %» es el celular (412 px) con el texto al doble.
- **Lo no obvio:**
  - **El armador espeja `_cotizacion_hoja()` sin la parte de niveles:** si cambia esa función (un campo nuevo en la celda), hay que cambiar también `entities/diseno/hoja-del-diseno.ts`. No hay un juego compartido entre los dos; T1 sólo prueba el armador.
  - **No se reusó `calcularLaVistaPrevia()` ni `TERRENO_VACIO`:** son del área `formula` y la guarda de áreas impide importar otra. El área `diseno` escribe su entrada mínima con `evaluar()` y `validarFormula()` del núcleo.
  - **Las cifras se calculan una vez por versión leída** (dependen de la definición y los `params`, que este editor no cambia); el diseño sí vuelve a armarse con cada cambio. Con la fórmula del e2e (total con tipo de cambio) el total de dólares puede salir 0 o «—», y la vista previa lo dice con las palabras de la hoja.
  - **V15 se cumplió sin respaldo:** `zoom: 2` sobre un hijo de 206 px dobla el texto (la altura del título de una sección pasa de 1,8 veces la de 412 px) y la página no se ensancha. No se probó el respaldo de `transform: scale(2)`.
  - **Dibuja `SeccionDeHoja` y no `LugaresDeLaHoja`:** este último arrastra `?ayuda=` y `?panel=avanzado` de la URL de la hoja. Por eso las secciones «Avanzado» sólo se nombran.
  - **El spec no lleva la marca de sin celular:** mide la disposición, y la guarda `sin-celular` la rechaza («el celular sí le agrega algo»); corre en escritorio y en móvil y pasa en los dos.
  - **Los controles y el panel diferido se partieron distinto que en el plan:** `controles-de-la-vista-previa.tsx` y `panel-de-la-vista-previa.tsx` (los que carga la pestaña) y `vista-previa-del-diseno.tsx` (lo que pide el `diferido()`), para que la pestaña no cargue la hoja; el plan tenía los botones en el archivo diferido. `EditorDelDiseno` pasaba de 80 líneas con el panel adentro.
- **Para el coordinador:**
  - `docs/ESTADO.md`: «4.22-5: vista previa del diseño (412, 1.280 y 200 %); sigue 4.22-6 (4-30, datos)». `docs/PLAN.md`: en la fila del 4.22, tras «4.22-4 hecho: la pestaña «Tonos»», sumar «4.22-5 hecho: la vista previa (412, 1.280 y 200 %)».
  - No se tocó `docs/plan.yaml`, `areas/diseno/*` ni `supabase/`; la cuenta de la API de `docs/MAPA.md` no se movió.
  - El 4-30 (tope de tamaño del diseño) sigue abierto para el 4.22-6.

<!-- paso:4.22-6 -->

## 2026-11-08 — Paso 4.22-6

- **Preguntas:** ninguna nueva. P4 del 4.22-1 (4-30) con la recomendada, aprobada: **(a)** `validar_diseno()` rechaza publicar un diseño de más de N ítems.
- **Lo no obvio:**
  - **N = 40 es una cota estimada con lo ya medido, no una medición nueva** (no se hizo sonda: `.claude/rules/e2e.md`). Es el menor que deja válido todo lo
    de hoy (`subasta_usa` tiene 39 ítems; el juego ya traía un diseño válido de 40) y el mayor que entra en el techo de nodos: 491 nodos medidos para 39 ítems
    son 12,6 por ítem, una cota que **sobreestima** (le carga a los ítems también la parte fija de la hoja); con ella, 40 ítems ≈ 504 nodos contra el techo de
    500 (+0,8 %, dentro de la regla del 5 %); como quien configura (⚙), 557 / 39 = 14,3 por ítem, ≈ 571 contra 585 (`docs/RENDIMIENTO.md:168-171`).
  - **Qué cuenta:** todo ítem de toda sección, de cualquier tipo (`celda`, `atajos`, `variante`, `interruptor`, `subtotal`), principal o avanzado (los 491
    nodos se midieron con «Avanzado» abierto). La cabecera (modos, «Ver total Bs») y la tarjeta del total no cuentan. `donde` = la sección en la que la suma
    pasa de 40.
  - **Va tras la forma y antes de los modos** (sólo cuenta y acota todo lo demás): la forma le gana; el tope gana a todo lo cruzado. En TS es el 2.º código de
    `REGLAS_DE_DISENO`.
  - **El borrador lo admite** (`formula_guardar_borrador` sólo mira la forma); **publicar, el ⚙ y revertir** lo rechazan (pasan por `_preparar_publicacion()`).
    El editor del diseño lo dice con su aviso de siempre sin apagar «Guardar»; como no agrega ni quita ítems, la pantalla no cambió.
  - **El número vive en `_diseno_maximo_de_items()`** (invocadora, STABLE, `search_path ''`, sólo `authenticated` y `service_role`) para que
    `medir-validar-diseno.sql` y `medir-publicar.sql` lo apaguen dentro de su transacción revertida (devuelve `2147483647`) y sigan midiendo las sintéticas
    de 200 y 2.000 ítems; en TS, `validarDiseno()` cambia su 4.º parámetro (el medidor) por `opciones: { medidor?, maximoDeItems? }` (por omisión, `MAXIMO_DE_ITEMS_DEL_DISENO`; `max-params` no admite un 5.º) y las pruebas de
    escala pasan `Number.POSITIVE_INFINITY`. Esas dos mediciones no se corrieron (no están en el CI ni en este paso).
  - **Consecuencia para la persona:** la cobertura obliga a dibujar todo input, constante, la variante y cada bandera que condiciona algo
    (`validar-diseno-cobertura.ts`), así que **una fórmula con más de 40 de ésos tampoco se puede publicar**; `subasta_usa` sólo puede crecer un ítem. Si
    hace falta más, se sube el tope (una migración que reemplaza `_diseno_maximo_de_items()` y la constante) midiendo la hoja, o la hoja divide (la otra
    rama de 4-30, descartada hoy).
  - El corpus diferencial (`supabase/tests/corpus-de-diseno.json`) se rehízo entero con `ACTUALIZAR_CORPUS=1`: el mutador nuevo cambia las tiradas de la
    semilla fija. 820 casos; `demasiados_items` es primer rechazo en 21 y ninguna regla baja de 6.
- **Para el coordinador:**
  - `docs/ESTADO.md` (por sustitución, ≤ 60 líneas con `wc -l`): «**4.22 cerrado:** el editor del diseño (secciones, celdas, ítems, tonos y vista previa);
    4.22-6, un diseño de más de 40 ítems no se publica (`demasiados_items`, cierra 4-30)».
  - `docs/PLAN.md`: en la fila del 4.22, tras «4.22-5 hecho: la vista previa (412, 1.280 y 200 %)», sumar «4.22-6 hecho: el tope de 40 ítems
    (`demasiados_items`); 4.22 cerrado». **Cerrar 4-30** (`docs/PLAN.md:420-422`): «cerrado en el 4.22-6: `validar_diseno()` rechaza publicar un diseño de
    más de 40 ítems con `demasiados_items` y la sección en `hint`; el borrador lo admite».
  - `docs/BITACORA.md`: la entrada de `docs/pasos/4.22-6/bitacora.md`, con su marcador.
  - Este PR cierra el 4.22 (`parcial: false`). Sigue sin dueño «mover, sumar y quitar secciones o ítems» del editor (lo dijo el 4.22-2).

<!-- paso:4.22-7 -->

## 2026-11-08 — Paso 4.22-7

- **Subir el tope en vez de recortar el HTML.** El primer HTML de «Tarjeta» con 500 miembros pasó de 147.448 a 155.874 B (+5,7 %). La regla del 5 % del proyecto
  (`docs/ESTADO.md`: «se sube el tope») manda medir y subir; el nuevo tope es lo medido más 5 %. Queda abierto si el aumento es de las dos pestañas nuevas o de lo
  que trajo main; si el tope vuelve a romperse, ahí se mira.

<!-- paso:4.23-3 -->

## 2026-11-08 — Paso 4.23-3

- **Lo no obvio:**
  - **Lo tipeado en una celda es dinero** (una tabla de precios de referencia): sale sólo de `leerNumeroTipeado` con el locale de la empresa (en es-BO
    «9.200,5» es 9200,5 y «1.5» es un aviso). Un año va sin decimales; un texto se recorta (una clave con un espacio al final no casaría en un `match`); una
    columna de otro tipo (sólo por SQL) toma el número si se lee y si no, el texto. Lo que no se lee queda como texto crudo de la celda con su motivo y la fila
    conserva el valor de antes: nunca se publica un número distinto del que se ve escrito (el modal tampoco manda con un crudo, ni si se llega por la URL).
  - **Salir de una celda sin tocarla no cambia nada:** se aplica sólo si el texto difiere del que muestra el campo (`formatearParaEditar`, 15 cifras). Si no, un
    valor guardado con más precisión se redondearía al pasar con Tab y se publicaría. La otra cara (auditoría del informe): un valor de más de 15 cifras significativas (sólo por SQL) se ve redondeado y, si no se toca, se publica
    entero; desde la cifra 16 lo que se ve y lo que se publica difieren. Se acepta: es la precisión del cast de la base.
  - **Las páginas son de lo que está en memoria** (100 filas, el mayor de `TAMANOS_DE_PAGINA`): la tabla se lee entera (4.23-2), así que una de más de 1.000 filas
    llega a todas desde el editor y lo que se publica nunca está recortado. El selector dice «Desde la fila n», sin total, y la página no va a la URL.
  - **El borrador es por versión:** sobre la misma versión se repone; si la tabla se publicó después, se borra y se dice. Mientras se publica se pausa y se borra
    (si entra, el editor se vuelve a montar con la versión nueva y no tiene que encontrar uno viejo); si no entra, se vuelve a guardar.
  - **«Volver a las tablas» no pregunta** (el borrador conserva lo hecho) y **quitar una fila no pregunta** («Deshacer»): nada se escribe hasta publicar.
  - **`tapada` sale del ítem de la lista:** la lectura de una tabla no la sabe. Y una tabla se abre sólo si está en la lista del origen elegido.
  - **Copias en el área `tablas`** (un área no importa otra): el formulario de publicar (`usePublicacionDeTabla`, del de la fórmula, con la celda rechazada) y el
    campo de la nota.
- **Para el coordinador:**
  - **Línea de ESTADO:** «B/C, 4.23-3: las tablas de referencia se editan, reordenan y publican desde Configuración › Cotización; el enlace desde la ayuda, 4.23-4
    del A».
  - **Partición:** el 4.23 pasa a 4 partes. `docs/PLAN.md`, fila del 4.23: «4.23-3: la pestaña «Tablas» de Configuración › Cotización (editar, mover y publicar con
    nota; el editor llega a todas las filas). 4.23-4 (carril A): «Ver la tabla entera» desde la ayuda de una tabla de la hoja.». `docs/plan.yaml`: `4.23-3`
    terminado «Se editan, reordenan y publican desde Configuración › Cotización»; nuevo `4.23-4` (`carril: a`, `depende_de: ['4.23-3']`, riesgo verde, módulos
    `features/hoja/`), terminado «La ayuda de una tabla en su tope lleva a la tabla entera»; el `4.28` pasa a depender del `4.23-4`.
    - **Por qué se parte** (la guarda de carriles no lo impide: B y C editan lo del núcleo): la convención de áreas (B y C no editan los archivos compartidos de
      la hoja), el JS en frío de `/cotizaciones/nuevo` (459,0 de 460 KB, `docs/RENDIMIENTO.md`), que el enlace mueve, y que los e2e de la hoja se verifican aparte.
    - **Pregunta del 4.23-4:** quién ve el enlace. Recomendada: sólo quien tiene `cotizaciones.configurar` en el origen de la hoja (el editor pide esa clave); los
      demás siguen viendo «Mostrando las 1.000 primeras filas.».
  - **4-47:** la primera mitad («una tabla de más de 1.000 filas llega a todas desde el editor») queda cumplida; el enlace desde la ayuda, con el 4.23-4. La segunda
    mitad («una tabla congelada sin viva se rotula con etiquetas») **sigue abierta**: P5 permite la baja por SQL (`activa = false`), `cotizacion_tabla` lee sólo
    las vivas activas, y rotular sin viva exige congelar también las `columnas` (un cambio de base). Va al paso que traiga la baja de tablas o ese cambio.
  - **Choque con el 4.20-4b del A** (la pestaña «Ajustes» en los mismos `pestanas.ts`, `seccion.ts`, `page.tsx` y sus tests): resuelto en el merge `d3ce0c46`
    juntando las dos pestañas en el orden niveles, fórmula, tablas, ajustes. «Ajustes» sigue al final (lo pide su comentario: Niveles primero y Ajustes al
    final) y «Tablas» va junto a «Fórmula», porque sus tablas son parámetros de la fórmula. En la barra, sólo una clave más (`tabla`).
  - **`db:carreras` de la fila no se corrió en esta parte:** no toca `supabase/` ni un candado; las carreras de `tabla_referencia_publicar()` las corrió el 4.23-1.

<!-- paso:4.26-1 -->

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

<!-- paso:4.26-2 -->

## 2026-11-08 — Paso 4.26-2 y 4.26-3 (microdecisiones de UX; ninguna pregunta a la persona)

- La sección «Comprobantes» se dibuja sólo en una final o en una cotización que ya tiene alguno (una final que bajó a preventa con sólo anulados, P7 a). En una
  preventa sin comprobantes no gana ni un nodo.
- Anular abre un `ModalDeFormulario` (lleva un motivo tipeado), no un `<Confirmar>`; emitir, un `<Confirmar>` (no hay nada que tipear).
- `?panel=anular-comprobante` no lleva el id: hay a lo sumo un vigente (P2 a) y la isla lo recibe del servidor.
- «Emitir comprobante» sólo en una final **activa** (una reportada o inválida no lo ve): lo pide la partición del 4.26 y lo dijo la auditoría del plan.
- La lista se lee en el servidor tras `<Suspense>` y no se mide con volumen: no crece con el uso (un vigente y los anulados de una sola cotización), como los
  adjuntos (≤ 20).
- Los textos de error de `comprobante_emitir`, `comprobante_anular` y `comprobantes_serie_cambiar` se muestran tal cual (excepción anotada en la ficha del
  módulo): la base ya los escribe para la persona.
- El PT409 de la serie en Empresa va por el aviso con «Recargar» (`avisarError`), como el otro formulario con versión de Configuración.

<!-- paso:4.28 -->

## 2026-11-08 — Paso 4.28: el cierre de la Fase 4

- **El Nivel 3 en dos invocaciones, una por proyecto** (`pnpm test:e2e:completo --project=escritorio` y luego `--project=movil`, cada una desde `db:reset` y
  `db:carreras`), para que 5a-4b tenga el tiempo de cada proyecto: escritorio 38,6 min de Playwright (39,5 de reloj) con 1.062 pruebas; celular 29,9 (30,9)
  con 787. Los dos, 68,5 min (70,4 de reloj), lejos de los 25 del assert de 5a-4b, que sigue abierto y pasa a «lo decide la persona» con estos números: con una
  sola pila local la suite crece con cada paso (1.065 pruebas y 40,1 min el 2026-10-22; 1.849 hoy). La salida en CI siguen siendo los shards (CI-1).
- **La tarea de oro 2 entera, con dos cuentas** (`e2e/cotizar-tarea-de-oro-recorrido.spec.ts`): arranca en `/cotizaciones` del origen, no en la hoja con el lead
  en la URL. La dueña (R2) también tiene que cumplir los 90 s aunque vea los ⚙ y «costos»: la meta es de quien cotiza, configure o no. Las teclas de control son
  por proyecto (`Record`): en el celular el listado tiene 3 paradas menos antes de «Nueva cotización». Marcar final, comprobantes y comentarios quedan fuera del
  recorrido: tienen su e2e en sus pasos.
- **5a-33 queda pulido de la Fase 9, sin código**, aunque la fila del 4.28 lo nombre: la regla del 2026-10-30 (`docs/PLAN.md` › «Pulido para la Fase 9») dice que
  ningún paso lo recoge. El bloque de pulido pasa de la Fase 4 a la sección de la Fase 9, con el mismo título.
- **Los abiertos de la Fase 4, reconciliados** contra la BITACORA consolidada: los que su paso cerró (4-5, 4-6, 4-8, 4-17, 4-30, 4-68, 4-69, 4-70, 4-84,
  4-89, 4-91 y 5b-7) y las inestables (4-80, 4-92, 4-93, 4-99 y 4-100; regla del 2026-11-08) van a «Cerrados en la Fase 4»; los demás, a «Los decide la
  persona» o «Sin fase, con su disparador». **4-47 no se cierra**: el 4.23-3 cumplió la mitad del editor y el enlace desde la ayuda y el rótulo sin viva quedan.
- **No se movió nada a `docs/archivo/PLAN.md`**: esta sesión no puede leer el archivo (`Read(docs/archivo/**)` en `.claude/settings.json`) y no se escribe a
  ciegas en un doc que no se ve. La «Partición» y los cerrados quedan en `docs/PLAN.md` hasta que una sesión con permiso los pase.
- **Un defecto que destapó una inestable se arregla en el paso:** la caída de `equipo-busqueda-minima.spec.ts:98` en el celular (pasó 3 de 3 sola) mostró
  que el ingreso enviado antes de hidratar iba por GET, con la contraseña en la URL. No es pulido (es un dato que se filtra): `method="post"` en los cuatro
  formularios de auth (con `onSubmit` + `preventDefault` hidratado no cambia nada) y una prueba en `acceso.spec.ts` que bloquea los chunks de JS (sin
  JavaScript el streaming ni dibuja el formulario). La inestable en sí no se estabiliza.
- **La consolidación de `docs/pasos/` pierde partes:** `consolidar-docs.mjs` marca un paso entero con `<!-- paso:<id> -->` la primera vez, y las partes que su
  carpeta suma después (4.25-1b y 4.25-2) ya no pasan. Se copiaron a mano: en BITACORA al final (por el orden de fechas que exige `mapa.sh`), en DECISIONES tras el bloque del 4.25. El script queda como está (abierto 4-104).

## 2026-11-09 — FLUJO-2: el piloto de corrido (preparativos de las fases 5 a 9)

La persona pidió correr el resto del proyecto sin interrupciones. Antes de partir las fases se midió la Fase 4 con tres carriles (7 y 8-11): sólo el
27–33 % del reloj fue una sesión de paso viva; 1.104 USD en 72 partes (10,4 USD y 0,84 h por parte en el flujo del 8-11); 30 de 167 corridas de PR en
rojo. El detalle de cada cambio, en `docs/PILOTO.md` › «De corrido».

- **Un paso que no cierra se aparca; el carril no para.** La alternativa era seguir como estaba («tres veces el mismo aviso y el carril queda parado»): con
  nadie mirando, un carril parado no vuelve, y una caída de red de 2,6 h (la del 8-11) habría dejado a los tres así. Aparcar conserva el trabajo (rama, stash
  y nota), deja avanzar lo que no depende de ese paso y lo reintenta dos veces con una sesión nueva; lo que queda aparcado al final es la lista de lo que
  la persona tiene que mirar. Lo del entorno no se aparca (no es del paso): se espera media hora y se repite.
- **El límite de uso y la red no son fallas.** Se duerme y se retoma sin tope de veces; el límite se comparte entre carriles por un archivo.
- **El plan y la cuenta de GitHub dejan de depender del árbol y de la máquina.** El plan se lee de `origin/main`; la cuenta es la de `piloto.config`. No se
  cambió la cuenta activa de `gh` de la persona: se pide el token de la otra por `gh auth token --user`.
- **Las guardas del piloto siguen sin integrarse solas.** Sin compuertas, lo único que separa a una sesión de cambiar los hooks y los scripts que la vigilan
  es que ese PR no entra sin alguien que lo mire. Se deja así a propósito; los pasos que tocan workflows o guardas van al final del plan para que un PR
  retenido no trabe al resto.
- **No se quitó el ruteo ni se cambió de modelo.** El ruteo costó el 1,3 % (0,07 USD por vuelta) y no falló; el planificador en opus se lleva ≈ 9 % en los
  pasos de datos, que es donde más rinde. La persona dijo que el uso no es problema: se deja la política calibrada.
- **Lo que no se arregla aquí y se evita con el plan:** los 21 PR devueltos por chocar en `pestanas.ts` (cada carril sumaba su pestaña al mismo archivo). En
  las fases 5 a 9 el primer paso de cada módulo deja las entradas por área y los «huecos», y los siguientes sólo agregan archivos propios
  (lo dice la partición de cada fase en `docs/PLAN.md`).

## 2026-11-09 — El plan de las fases 5 a 9: 69 pasos, cinco fases abiertas a la vez

La persona pidió dejar todo listo para correr el proyecto hasta el final. Cinco lecturas en paralelo (una por fase) propusieron la partición
contra lo que la base ya tiene; aquí se unieron (`docs/PLAN.md` › «Carriles de las fases 5 a 9»; `docs/plan.yaml`).

- **Las cinco fases a la vez, con dependencias por paso y no por fase.** La alternativa, una fase tras otra, repetía lo de la Fase 4: carriles
  sin paso (23 h-carril en dos días). La Fase 7 y casi toda la 8 y la 9 no necesitan nada de la 5 ni de la 6. Simulado con la duración medida
  (0,84 h de sesión y 0,4 de CI por parte): los 69 pasos caben en ≈ 4 días de reloj con tres carriles, con 5 a 12 h de espera por carril.
- **Lo que comparte funciones de la base va en serie aunque sea de fases distintas** (6.02 tras 5.05 y 5.07; 8.08 tras 5.07 y 6.02): dos
  migraciones que recrean la misma función no chocan en git, y la segunda en integrarse borraría lo de la primera sin que nadie lo viera.
- **`cotizaciones` vuelve entero al carril base;** `b` y `c` llevan áreas o módulos enteros de las fases nuevas. Un paso de `b` o `c` declara en
  `modulos` sólo lo suyo: lo del núcleo que necesita lo agrega o edita en su PR.
- **Una sola casa para lo que varios llenan.** Tres propuestas ponían los bloques de la bandeja en tres lugares: queda el del 9.02
  (`tablero/features/bandeja/bloques/<clave>.tsx`), que pasa al carril base y va antes que 6.12, 7.07, 8.05 y 8.13.
- **Las dudas de cada fila ya traen su recomendada, y esa es la decisión** (sin compuertas nadie las contesta). Las que más pesan, para que la
  persona las mire cuando quiera: la versión de la configuración de un flujo es una por flujo (5.01); «trabado» se define en el 6.12; el
  tablero muestra totales exactos como excepción escrita (9.07); «exportar todo» no lleva teléfonos ni campos privados de carteras ajenas
  (9.05); sin dependencias nuevas (gráficas en SVG, cookie del portal con `node:crypto`).
- **El despliegue no se ejecuta:** el 9.13 deja la guía, la lista de la persona y todo probado en seco.

<!-- paso:5.02-1 -->

## 2026-11-11 — Paso 5.02-1: la base del módulo `flujos`

- **D1 · La versión del flujo es `flujos.actualizado_en`**, un texto ISO tal como lo trae la base, nunca un `Date`: ya existe, así que no hace falta migración (el 5.01 sólo
  suma `_flujo_para_editar()`, que la bloquea).
- **D2 · Sólo la lista de fases**, sin «camino» dibujado ni «historial»: las salidas serán chips por fila (5.06) y el historial de cambios es `actividad` (Fase 9).
- **D3 · El flujo se elige por la URL:** `?origen=<id>` y `?ambito=repuestos` (como Configuración › Cotización; sirve al enlace de Orígenes).
- **D4 · 4-48 y 4-102 se cierran aquí,** un commit cada uno: el paso ya toca `src/shared` (Nivel 2).
- **D5 · El 5.02 se parte en dos sesiones** (5.02-1 la base del módulo, 5.02-2 la pantalla): serían 8 commits de código y el tope es 6. Los dos van en la rama `a/5.02`; el PR
  del 5.02-1 **no** marca integrado el paso.
- **D6 · En `src/app/(app)/configuracion/flujos/` sólo habrá carpetas para `fases`, `requisitos`, `documentos` y `reglas`** (las áreas que llenan algo en `app`, según
  `docs/plan.yaml`); `transiciones`, `revisar` y `mover` entran por los huecos del módulo y no tienen carpeta.
- **D7 · Cada área suma sus pestañas** con `PESTANAS_DE_<ÁREA>: readonly PestanaDeFlujos[] = []` en su `pestanas.ts`; con una sola pestaña («Fases») la barra no se dibuja y
  una pestaña no existe hasta que su paso la llena (nunca un botón muerto).
- **D8 · `conDestino()` de Orígenes recibe el id del origen** para que el paso «Flujo» enlace con `?origen=<id>` (5.02-2; cambia `pasos.test.ts` y `[id]/page.tsx`).
- **Del módulo:** `features/configuracion/` es del núcleo; la guarda no deja carpetas nuevas sin dueño (o es de un área o la suma el A al núcleo). `leerRolesParaElegir()` expone
  id, nombre y color (ya los lee cualquier cuenta con sesión) y no trae permisos; `flujos` no importa `equipo`: `src/app` lo pasará al inspector.
- **Topes** (`entities/flujo.ts`): fases 200, transiciones y requisitos 500, roles de flujo 500, reglas 50, flujos 100, cada uno leído con `tope + 1`; sin `RENDIMIENTO.md` ni
  volumen sembrado (configuración, decenas de filas).

<!-- paso:5.02-2 -->

## 2026-11-11 — Paso 5.02-2: la pantalla de flujos (D9 a D20; D1 a D8 siguen en `docs/pasos/5.02-1/decisiones.md`)

- **D9 · Cuatro commits de código** con el árbol verde cada uno (entidades puras, pantalla del módulo, ruta de `src/app`, e2e), más un `fix` y un commit de docs de la pantalla.
- **D10 · `<PantallaDelFlujo>` es un Server Component async** (como `SeccionDeLaFormula`): `src/app` le pasa permisos, la promesa de `getOrigenes(true)`, la de `leerRolesParaElegir()` y los parámetros de la URL; una lectura que falla sube al `error.tsx` de `(app)`.
- **D11 · Cada pestaña es un flujo que quien mira puede configurar:** el de un origen lleva el nombre de la fila del origen (« (inactivo)» si no está activo); el de repuestos, `flujos.nombre`. `PestanasConDesborde` sólo recibe texto: el color del origen queda en la entrada del selector, sin dibujar.
- **D12 · `?ambito=repuestos` gana sobre `?origen=`;** una URL inválida o ajena abre la primera pestaña, nunca un error.
- **D13 · El inspector se registra con `sinFormulario`** (sólo muestra). El paso que le suma un formulario (5.04) lo pasa a `formulario`/`contexto` en `scripts/guardas/drawers-con-salida.ts`.
- **D14 · Los huecos son componentes de cliente opcionales** (`HuecosDelFlujo`); los junta `src/app/(app)/configuracion/flujos/huecos.ts` (`HUECOS_DE_FLUJOS = {}`), una línea por área. Supuesto sin ejercitar: nada llena un hueco todavía; uno de servidor no cruzaría a la lista.
- **D15 · Sin `error.tsx` propio:** sirve el de `(app)`, que ofrece «Reintentar».
- **D16 · El inspector no dice nombres técnicos:** de los requisitos sólo cuántos hay por tipo y si bloquean; de los roles, su nombre («otro rol» si no estaba en los 100 leídos). Roles de la fase = quienes pueden mover **hasta** ella; los de una transición mandan sobre ellos (`_puede_mover`).
- **D17 · Con sólo `logistica.catalogos.gestionar` se entra** y se lee «Por ahora no hay nada que configurar aquí con tus permisos.»; «Fases» pide `flujos.configurar` o `repuestos.configurar`.
- **D18 · El enlace del paso «Flujo» de Orígenes mira el permiso en ese origen** (`puede(permisos, 'flujos.configurar', origenId)`) y arma `?origen=<id>`; `conDestino()` recibe el id y `DESTINOS_DE_PASO` marca `porOrigen`.
- **D19 · `pestanas-de-flujos.tsx` se escribió pero no se dibuja** mientras haya una sola pestaña visible; no tiene prueba propia hasta que un paso sume una segunda.
- **D20 · `useVersionDelFlujo()` y su proveedor no salen por `client.ts`:** nadie fuera del módulo los necesita.
- **Del e2e:** la asesora de la semilla hace de «persona sin permiso» (una persona sin rol no entra a Configuración por otras razones); el spec cuenta lo que dice la base, no números de la semilla.
- **Estructura de `src/app`:** cada área con carpeta (`fases`, `requisitos`, `documentos`, `reglas`) trae `pestanas.ts` y `seccion.tsx` vacíos, y `secciones.ts` ya trae siete secciones: los carriles B y C no vuelven a editar `pestanas.ts` ni `seccion-abierta.tsx`.

<!-- paso:6.01-1 -->

## 2026-11-11 — Paso 6.01-1: la base del módulo `logistica`

- **D1 · Drawer y página con el mismo componente** (`<PanelDeLaUnidad>`): el drawer desde la cadena (`?vehiculo=<id>`) y la página para el enlace de una notificación.
- **D2 · `flujos/areas/mover/` ya existía** (5.02-1): 6.01 sólo le suma `leerFlujoDeOrigen`; no toca el núcleo ni las otras áreas.
- **D3 · La unidad se lee con la sesión de quien mira**, sin RPC ni `security definer`. La RLS de `vehiculos` pide `vehiculos.ver`, no `logistica.ver`: el panel exige las dos y no se
  relaja la RLS (sería una compuerta de datos).
- **D4 · `Unidad` es una unión por `tipo`** (`vehiculo` | `repuesto`); sólo se construye la de vehículo hasta 8.13.
- **D5 · Los huecos se ordenan por su `clave`** (`ORDEN_DE_HUECOS`), no por el archivo que los declara; una clave desconocida o repetida no se dibuja.
- **D6 · Formas de los otros huecos** (vacíos hoy, reversibles): `HuecoDelGrupo`, `EnlaceDeLogistica` (nulo = la página no existe) y `CatalogoDeLogistica`.
- **D7 · La guarda de áreas es copia de la de `flujos`**, sin prueba de coherencia con `plan.yaml` (la valida `coordinador.mjs validar`). El núcleo es la carpeta `nucleo` de cada capa.
- **D8 · `RUTAS` se agrega en la 6.01-2,** con su primer uso: así esta parte no toca `src/shared` y cierra en Nivel 1.
- **D9 · Un componente de hueco recibe sólo datos serializables** y carga lo suyo al abrirse el bloque (`diferido()`).
- **D10 · El título del panel es `vehiculos.titulo`** y los días en la fase salen de `fase_desde`; 6.13 lo cambia por el campo «principal».
- **D11 · El menú «Logística» sigue apagado** hasta 6.03.
- **Partición:** 6.01 son 3 partes (1: módulo; 2: panel y ruta de la unidad, Nivel 2; 3: `/logistica` y Configuración), con el plan en `.piloto/planes/6.01.md`.

<!-- paso:6.01-2 -->

## 2026-11-11 — Paso 6.01-2: el panel de la unidad y su ruta

- **D12 · Los días en la fase son de calendario** (`diasEnLaFase`, zona de la empresa) y el texto va por días aun pasados los 6 (`fechaRelativa` cae a la fecha absoluta): «Desde hace 3 días en esta fase».
- **D13 · `UnidadAbierta` junta los estados** (no disponible, sin permiso, panel) para la página y el drawer: la fila ilegible por RLS dice «ya no está disponible» antes de mirar `logistica.ver`, para no confirmar que existe.
- **D14 · Un error al leer el flujo del origen no tumba el panel:** deja apagados los huecos con regla y avisa en una línea; los errores de la unidad, las fases y los orígenes suben al `error.tsx`.
- **D15 · `<Bloque>` gana `onAbrir`** (aditivo) para montar el hueco al abrirlo; el contenido queda montado al cerrar.
- **D16 · El título de un origen en el panel sale de `getOrigenes`:** si el origen no figura se omite, sin texto fijo.

<!-- paso:6.01-3 -->

## 2026-11-11 — Paso 6.01-3: `/logistica` con el drawer y Configuración › Logística

- **D17 · La clave de la URL del drawer va en `clave-de-unidad.ts`, no en el archivo `'use client'`:** una constante importada de un módulo de cliente llega a un Server Component como referencia, no como el texto (la página leía `parametros[<referencia>]` y nunca abría el drawer).
- **D18 · El marco del drawer cierra con `shallow: false`:** quitar `?vehiculo=` vuelve a pedir la página, así el panel no queda montado con una unidad que ya no se muestra; la lectura la hace el servidor (`<UnidadAbierta>`) y llega como hijo. Abrirlo desde una tarjeta, sumando al historial y marcando la vuelta del foco, es del 6.03.
- **D19 · La sección «Logística» del hub existe sólo con un catálogo lleno** (`SECCIONES_DE_LOGISTICA` es vacía o de una): ninguna tarjeta lleva a una pantalla que dice «nada que configurar». La URL entra antes, con la clave.
- **D20 · El drawer se titula «Unidad»** (el término del glosario: puede ser un vehículo o, en 8.13, un repuesto); el título del vehículo lo dice el panel.

## 2026-11-11 — FLUJO-3: los rojos del entorno no vuelven al carril y el commit no repite la base

- **Por qué:** a 4 h de lanzar, 1 de 69 pasos integrado. `apt` caído en los runners tiró el e2e de los 7 PR; cada carril gastó una sesión en
  descubrirlo y los tres quedaron esperando un arreglo de `ci.yml` que sólo integra la persona. En cada parte, un tercio del reloj era el hook
  del commit repitiendo `probar-schema`.
- **Qué:** el coordinador reconoce un rojo del entorno (cayó un paso que no es prueba y el log trae la señal de red) y lo vuelve a correr hasta 8
  veces con espera creciente, sin devolver el paso; `lefthook.yml` salta `schema` con `PILOTO=1`; una parte que sigue se planifica desde el plan
  de la anterior. Detalle y medidas: `docs/PILOTO.md` › «Rojos del entorno y commits sin espera».
- **Integrar es del coordinador, no de una sesión** (la persona, el mismo día: «que los PR los integres tú, agnóstico a la sesión, automático»):
  con el CI en verde entra también lo que toca las guardas (`COORD_GUARDAS_SOLAS=1`) y los PR sueltos de una rama `fix/` de este repo. La barrera
  que queda es el CI (Nivel 1, Carriles, Base y e2e) y la auditoría del plan. Se vuelve atrás con `COORD_GUARDAS_SOLAS=0` y `COORD_SUELTOS=`.
- **Lo que no cambió:** la auditoría del informe (RLS, permisos, `security definer`, dinero); producción sigue siendo de la persona.

## 2026-11-11 — El coordinador renumera las migraciones atrasadas

- **Por qué:** el #103, el #113 y el #114 llevaban más de 1 h con el CI en verde, frenados sólo por una migración con versión anterior a la
  última de main. El carril la renumera sin sesión, pero recién al terminar el paso en curso, y mientras tanto no arrancaban los que dependen.
- **Qué:** el coordinador arma el commit de la renumeración con un índice aparte sobre la punta del PR y lo empuja a su rama
  (`scripts/coordinador/renumerar.mjs`). No pasa por los hooks (no hay árbol), pero sólo renombra y cambia la versión en los archivos del PR, y
  se integra con el CI de ese commit en verde. Si el carril empujó entre medio, no hace nada y vuelve a intentar. `COORD_RENUMERAR=0` lo apaga.

## 2026-11-11 — FLUJO-4: sin candado por la base en rojo, lo devuelto primero y renumerar sin otro CI

Medido a 13,5 h de lanzar: 20 de 69 pasos integrados; los carriles estuvieron vivos 11,1 (A), 10,0 (B) y 12,4 h (C), y el CI tarda ≈ 17 min.

- **La base en rojo ya no frena a un carril** (`scripts/piloto/ci.sh`): el B estuvo 3 h y el A 70 min sin poder publicar porque el último CI
  de su rama tenía «Base» en rojo, y sin publicar no corre otro CI. El rojo era una prueba inestable de main (arreglada en el #130) y el PR
  del B además chocaba con main, donde GitHub ni corre el CI. Con carriles nada se arrastra: cada paso sale de `origin/main` y el coordinador
  no integra un PR en rojo. Sin carril, la regla de antes.
- **Un PR devuelto va antes que la parte siguiente del paso en curso** (`plan.mjs` › `siguiente`): el 7.02, el 5.11 y el 6.05 esperaron de 3
  a 5 h devueltos (casi siempre un remiendo sin sesión) mientras su carril seguía, parte por parte, con otro paso, y con ellos lo que depende.
- **Renumerar con el CI en verde no paga otro CI** (`coordinador.mjs`, `renumerado_verde`): el commit de renumerar tiene el mismo contenido;
  se integra en la vuelta siguiente si sigue siendo la punta, no choca con main y su CI nuevo no cayó. Cada PR con migraciones pagaba de 2 a
  6 corridas (el 6.10: cinco renumeradas, 7 h abierto). `COORD_RENUMERAR_SIN_CI=0` vuelve a esperar.

## 2026-11-11 — FLUJO-5: los registros se unen sin sesión y GitHub se vuelve a pedir

- **Los registros donde cada carril agrega su línea se unen solos al traer main** (`carril.sh` › `unir_docs`, `REGISTROS_QUE_SE_UNEN`):
  `scripts/carreras.mjs`, `e2e/soporte/presupuestos.ts`, `auditoria-leads.sql`, `permisos-enforcement.sql`, `escala.sql`, los registros de
  `scripts/guardas/` y la ficha `CLAUDE.md` de una unidad chocaban una y otra vez, y cada choque era una sesión y otro CI. Sólo con puros
  agregados de los dos lados; si alguno cambió una línea que ya existía, o el `.mjs` unido no pasa `node --check`, va a la sesión como
  antes. Lo que la unión deje mal lo dice el CI del PR. Se descartó partir cada registro por carril: cinco refactors sobre archivos que
  los tres carriles tienen abiertos. `PILOTO_UNIR_REGISTROS=` (vacía) lo apaga.
- **GitHub se vuelve a pedir** (`pr.mjs` › `gh`, `publicar.sh` › `gh_insistente`): lo que sólo lee, hasta dos veces más; abrir o comentar
  el PR, hasta tres. Un HTTP 499 era un aviso y 5 min de espera, o una vuelta del coordinador perdida. Integrar no se repite a ciegas.
- **Un «conflicto con main» no se borra mientras GitHub no sabe** (`pr.mjs` › `sinSaber`, `coordinador.mjs`): tras cada integración
  GitHub contesta `UNKNOWN` unos segundos, la marca de devuelto se iba y el carril que preguntaba en ese rato tomaba un paso nuevo. El 7.02
  estuvo así más de 4 h, con cinco pasos colgando de él.

## 2026-11-11 — FLUJO-6: el coordinador une main a un PR en conflicto y renumerar no paga el hook

Medido el 2026-11-11, a 15 h de lanzar (23 de 69 pasos): los carriles estuvieron en sesión el 72–89 % del reloj, así que lo que
frena ya no es un carril parado sino el camino del PR hasta `main` (el 7.02, 8 h abierto con cinco pasos detrás; el 6.05 y el 5.04, 5 h).

- **Un PR publicado que choca con main sólo en notas o registros lo une el coordinador** (`scripts/coordinador/unir-main.mjs`): antes
  volvía a su carril, que lo remendaba sin sesión pero recién al terminar la sesión en curso (de 20 a 60 min), y en ese rato main se
  movía y volvía a chocar. Es `unir_docs` de `carril.sh` sin árbol de trabajo (`git merge-tree`, `git merge-file --union`, un commit de
  merge empujado a la rama del PR), con las mismas reglas: notas (`docs/*.md`, la ficha `CLAUDE.md`) y registros con puros agregados; un
  choque de código, de lo generado, de una línea que los dos cambiaron o un `.mjs` que no pasa `node --check` vuelve a su carril como
  antes. Sólo los pasos publicados: en una parte el carril sigue trabajando en la rama y un push ajeno lo haría divergir.
  `COORD_UNIR=0` lo apaga.
- **Si el choque era sólo de notas y el CI ya estaba en verde, se integra sin esperar otro CI** (`unido_verde`, como `renumerado_verde`):
  el merge no cambia nada de lo que el CI probó. Con un registro unido, el CI decide. Se descartó saltarse el CI también ahí: la unión de
  un `.ts` o un `.sql` puede dejar algo que no compila. `COORD_UNIR_SIN_CI=0` vuelve a esperar siempre.
- **El commit de renumerar del carril va con `PILOTO=1`** (`carril.sh` › `renumerar_migraciones`): sin él, el hook corría
  `probar-schema` sobre las migraciones renombradas, ≈ 4 min 30 s con el carril parado cada vez que traía main (medido en los tres).
- **Una migración sin fecha real se renumera sola** (`pr.mjs` › `fechaReal`, `renumerar.mjs`, `carril.sh` › `fecha_real`): la sesión
  del 6.05 renumeró a mano sumando uno hasta `…1260`, el Nivel 1 cayó y el PR perdió un CI y una vuelta por su carril. Va antes que el
  rojo: esa migración sola lo explica. La skill dice ahora que la sesión no renumera.
- **GitHub se vuelve a consultar cuando no sabe si un PR choca** (`pr.mjs` › `mirarPr`): calcula eso recién cuando se le pregunta, y la
  primera consulta tras cada integración contesta `UNKNOWN`. Con una consulta por vuelta, cada PR perdía 3 min después de cada
  integración (el #126 del 12-11, dos vueltas). Una segunda consulta a los 2,5 s (`COORD_SIN_SABER_VECES`, `COORD_SIN_SABER_ESPERA`).
- **No se hizo:** detectar un rojo heredado de main (el e2e no corre en los push a `main`; el 11-11 tres sesiones diagnosticaron la
  misma tarea de oro rota). Pide leer los nombres de las pruebas caídas de cada corrida y decidir quién arregla; se anota aquí por si
  vuelve a costar. La primera sesión que lo ve lo arregla en su PR y las demás lo reciben al traer main.

<!-- paso:5.03 -->

## 2026-11-11 — Paso 5.03: la base de «Tipos de documento»

- **D1 · Qué significa cada modo de vencimiento** (duda (a) de la fila, la recomendada):
  - `ninguno`: no vence;
  - `solicitar`: quien sube el documento escribe su fecha;
  - `renovar`: vence a los `vigencia_dias` de subido;
  - `aviso_dias`: cuántos días antes se avisa.
    Queda en `comment on column`. Lo hace cumplir la Fase 6 en `documentos.vence_el`.
- **D2 · `proposito` no se edita** (duda (b), la recomendada): ni crear ni guardar lo aceptan (`22023` con `hint = 'proposito'`).
- **D3 · Una combinación inválida se rechaza**, no se limpia en silencio. Son, por ejemplo, `renovar` sin vigencia, días de vigencia en otro modo o un aviso
  sin vencimiento. La pantalla manda el estado entero, y rechazar no borra un dato que la persona escribió. No hay `check` nuevo en la tabla: la única
  escritura es la RPC.
- **D4 · La versión es por fila, con un trigger propio** (`tipo_documento_version()`). El genérico pone `now()` y no se mueve dos veces en una transacción.
  Ordenar no cambia versiones.
- **D5 · El permiso del grupo se exige antes que la versión.** Que la fila exista no se oculta, porque todo `authenticated` lee la tabla.
- **D6 · Un global nuevo puede llevar el nombre de un tipo de un flujo.** Sólo se prohíbe la otra dirección: un tipo de flujo activo no repite un global
  activo. Quien gestiona los catálogos no puede arreglar los tipos de un flujo que no configura.
- **D7 · Un tipo que pide un requisito se puede desactivar, y el requisito queda.** Qué hacer con un requisito de un tipo inactivo lo deciden «Revisar» o la
  Fase 6.
- **D8 · Apagar `visible_portal_permitido` no oculta los documentos ya marcados visibles.** Eso es de `documentos` (6.05).
- **D9 · Tope de 100 tipos por grupo, y conteos de uso con tope de 50 + 1.** Es un catálogo de configuración: sin `medir-*.sql` ni fila en RENDIMIENTO.
- **D10 · Sin `trg_auditar` nuevo.** La actividad es de la Fase 9.
- **D11 · El candado de `fase_requisito_validar()` (`for share`) va sin prueba de carrera.** `scripts/carreras/` se limita a marcar final y comprobantes.
  El 5.07 parte de esta definición.
- **D12 · El paso cabe en una parte**, con cinco commits de código, uno por intención.
- **Ningún ayudante recibe sólo la fila** (`_tipo_documento_validar(fila, válidos)`, `_tipo_documento_nombre_libre(id, flujo, nombre, activo)`).
  PostgREST toma una función de un solo argumento de tipo fila como columna calculada de la tabla, y `db:types` la mostraba en `ComputedFields`.

<!-- paso:5.05 -->

## 2026-11-11 — Paso 5.05

- **Las transiciones y quién mueve se escriben sólo por RPC con la versión del flujo:** `transicion_crear`, `transicion_guardar`, `transicion_eliminar`,
  `fase_roles_poner` y `transicion_roles_poner`, todas por `_flujo_para_editar()`/`_flujo_tocar()` del 5.01, y sin escritura directa en `fases_transiciones`,
  `fases_roles` ni `fases_transiciones_roles`. Plan: `.piloto/planes/5.05.md`. La auditoría del plan dio observaciones; aplicadas abajo (D8, D14, D15 y la nota de
  `rbac_eliminar_rol` en la bitácora).

- D1 · Poner roles no exige `rol_dominado`: no otorga nada, sólo acota quién mueve (sigue haciendo falta `flujos.mover`, y `flujos.mover.cualquiera` salta las
  listas). Es la recomendada de la fila.
- D2 · Sólo el **destino** de una transición nueva tiene que estar activo: un origen jubilado puede tener salida (las unidades que siguen ahí necesitan salir).
  Guardar no revalida el destino y una fase jubilada acepta roles: ninguna de las dos abre un camino nuevo (`previsualizar_cambio_fase` ya rechaza el destino jubilado).
- D3 · Una fase que no existe es una pantalla vieja → `PT409`; una fase de otro flujo es un dato errado → `22023` con `hint` (`de_fase_id` o `a_fase_id`).
- D4 · La acción es el texto del botón: hasta 40 caracteres, recortada, vacía = sin acción (`null`).
- D5 · Poner la misma lista de roles mueve la versión igual (toda RPC de configuración devuelve la nueva) pero no escribe actividad. Tope de 100 roles por lista
  (el de `leerRolesParaElegir()` del 5.02); los repetidos se colapsan; un rol inexistente → `22023` con `hint roles`.
- D6 · Las transiciones ya se auditan por su `trg_auditar` (`fases_transiciones.<op>`): las RPC no duplican. Los roles, por `registrar_actividad()` con
  `fase.roles_cambiados` y `transicion.roles_cambiados`, `{roles: [uuid ordenados]}` antes y después (vacío = `[]`). Los roles que caen en cascada al borrar una
  transición no se registran aparte.
- D7 · Sin carrera nueva: el candado es el de `_flujo_para_editar()` (K1 del 5.01). `_roles_de_lista()` toma los roles con `for key share`, así un rol que se borra
  a la vez espera y no deja un `23503` crudo.
- D8 · El `23503` de un cambio de fase hacia una fase que se está borrando (D21 del 5.01-2, «lo traduce 5.05») no entra aquí: la fila del 5.05 excluye tocar
  `cambiar_fase`. **Para el coordinador, a PLAN:** en la fila del **6.02** (que recrea `cambiar_fase` y `cambiar_fase_lote`): «traducir el `23503` de
  `vehiculos_fase_id_fkey`/`historial_fases` de un cambio de fase hacia una fase que se borra a la vez, a `PT409` «Esa fase ya no existe. Recarga e intenta de
  nuevo.» (D21 del 5.01-2, D8 del 5.05)». El mismo caso en un vehículo que **nace** en esa fase (`vehiculo_crear`) va a la fila que recree `vehiculo_crear`
  (módulo vehículos; ninguna de la Fase 5 lo hace): hasta entonces queda como abierto.
- D9 · `transicion_guardar` no cambia origen ni destino: cambiar el destino es eliminar y crear (los roles propios de la transición no se arrastran a otro destino).
- D10 · Los errores de la lista de roles van después del permiso: un solo ayudante (`_roles_de_lista`) que también mira que los roles existan; quien no puede
  recibe `42501` primero.
- D11 · `transicion_eliminar` devuelve sólo la versión (`timestamptz`): a diferencia de `fase_eliminar`, tiene un único resultado.
- D12 · Los mensajes dicen «transición» (GLOSARIO); «salidas» es sólo el título del bloque del inspector (5.06).
- D13 · La ficha `src/modules/flujos/CLAUDE.md` no cambia aquí (este paso no tiene `src/modules/` entre sus módulos). **Para el coordinador, a la fila del 5.06:**
  sumar a la ficha la línea «RPC:» con las cinco nuevas y que «la configuración no se escribe directo» nombre también transiciones y roles.
- D14 · La fila dice «lista vacía = cualquiera con `flujos.mover`» para las dos RPC; en la de la transición, vacía significa que **manda la lista de la fase
  destino** (es lo que hace `_puede_mover`, que este paso no toca, y lo que dice la fila del 5.06: «vacío hereda los de la fase destino»). T5 lo prueba.
- D15 · `transicion_guardar` rechaza `{"nota_obligatoria": null}` con `22023` «no tiene el formato esperado» (`hint nota_obligatoria`), no con el `23502` crudo
  de la columna `not null`.

<!-- paso:5.09 -->

## 2026-11-11 — Paso 5.09: «Documentos» (tipos de documento de la empresa y del flujo)

- **D1 · La lectura va directa a la tabla**, con columnas nombradas, orden por `orden` y `nombre` y `limit(100 + 1)` por grupo (índice
  `tipos_documento_flujo_id_nombre_key`, `flujo_id` primero). El uso (`tipos_documento_con_uso`) se pide sólo si quien mira puede cambiar ese grupo: si no,
  la base da `42501`. Es un catálogo de configuración: sin medición de volumen.
- **D2 · La lista viene de props y cada escritura relee.** Ninguna RPC devuelve la lista, así que la action revalida la pantalla y el cliente espera el
  `router.refresh()`. Difiere de `tipos-de-seguimiento` de leads, donde cada RPC devuelve la lista entera.
- **D3 · Los conteos del uso se muestran acotados** (`conteoAcotado(n, 50)`, llegan como 51): «Lo usan 3 documentos y 2 requisitos», «más de 50».
- **D4 · Dos grupos con un solo componente de grupo**: «De toda la empresa» y «Sólo de este flujo».
- **D5 · La pestaña «Documentos» la ven** quienes tengan `flujos.configurar`, `repuestos.configurar` o `logistica.catalogos.gestionar`. Quien sólo tiene
  `flujos.configurar` ve los globales de sólo lectura, con el motivo.
- **D6 · Sólo lectura = «Editar» apagada con motivo y botones de orden apagados.** Se suma `motivoSinOrden` a `FilaDeCatalogo` para que el texto del botón
  apagado no diga «Ya es el primero…» cuando el motivo es el permiso (parte 2).
- **D7 · Los formatos llevan etiqueta humana** (PDF, JPG, PNG, WebP) y se guardan como MIME; al menos uno.
- **D8 · Cambiar el modo de vencimiento vacía los días que el modo nuevo no usa** (`borradorConModo`): la base los rechaza, y lo escrito no se pierde en
  silencio porque el campo desaparezca. La vigencia sólo con «renovar»; el aviso con «solicitar» o «renovar».
- **D9 · Eliminar se explica antes:** una fila sin uso ofrece «Eliminar»; una con uso, «Desactivar» con «Lo usan N documentos y M requisitos». Si el uso
  llega entre tanto, la base desactiva y el aviso lo dice con lo que devuelve.
- **D10 (5.09-1) · Las actions llevan el `flujoId` del grupo en su entrada.** Sin él no pueden exigir el permiso (`logistica.catalogos.gestionar` o
  `flujos`/`repuestos.configurar`) antes de la RPC; si alguien lo falsea, la base vuelve a exigirlo (`42501`).
- **D11 (5.09-1) · La validación del formulario se prueba contra la base**, no contra una tabla escrita a mano: PGlite con la tabla mínima y
  `_tipo_documento_validar()` de las migraciones, para que un cambio de la regla en SQL rompa la prueba de la app.
- **D12 (5.09-2) · Un solo cliente para los dos grupos.** `<TiposDeDocumento>` lleva los dos grupos, **un** modal (`?panel=nuevo-tipo|editar-tipo`) y **una**
  confirmación (`?panel=eliminar-tipo`), porque la URL tiene un solo `?panel=`. Las reglas de qué abre cada uno (`motivoParaNoAbrirTipo`,
  `motivoParaNoEliminarPorUrl`, en `entities/documentos/vista-de-grupo.ts`) cubren el grupo inexistente, el de sólo lectura, el tope y el uso.
- **D13 (5.09-2) · «Eliminar» de un tipo en uso se ve apagado con el motivo** («Lo usa 1 requisito: se desactiva en lugar de eliminarse.») en vez de
  desaparecer o cambiar de nombre; «Desactivar» ya está en el mismo menú. Es lo que pide `ui.md` (una acción que no se puede dice por qué) y deja un solo
  camino a «Desactivar».
- **D14 (5.09-2) · El foco tras «Subir»/«Bajar» se aplica cuando llega el orden nuevo.** La respuesta de la RPC no trae la lista: la página se relee y la fila
  cambia de lugar después. Mover un nodo con el foco puesto lo quita, así que el foco vuelve al botón al comparar la firma del orden contra la de antes de mover
  (`firmaDelOrden`). Al llegar al extremo, pasa al otro botón de la fila (como en las demás listas).
- **D15 (5.09-2) · La pestaña «Documentos» la ven quienes tienen alguna de `flujos.configurar`, `repuestos.configurar` o `logistica.catalogos.gestionar`**
  (la tarjeta «Flujos» del hub ya admitía las tres). Con sólo la tercera, es la única pestaña y la barra no se dibuja; con las otras dos, la barra aparece por
  primera vez («Fases» abre primero) y `pestanas.test.ts` y `configuracion-flujos.spec.ts` lo reflejan.
- **D16 (5.09-2) · `datosParaCrear` devuelve `DatosParaCrear` (todas las claves, sin `activo`)** para que el tipo coincida con el esquema de la action: un tipo
  nuevo nace activo y no manda `activo`.

<!-- paso:5.11 -->

## 2026-11-11 — Paso 5.11: «Reglas» y la oferta de transporte

- **D1 · Puertos y navieras sólo se leen** (los activos, `limit 201`, corte a 200 con `<AvisoDeTope>`). Su gestión es de la Fase 6 (`logistica`, con
  `logistica.catalogos.gestionar`); la pantalla dice «Todavía no hay navieras cargadas. Se cargan en Logística.».
- **D2 · La action de apagar pregunta el impacto antes de escribir.** Con uso devuelve `en_uso` sin llamar a `flujo_regla_cambiar`; si el uso llega entre
  la pregunta y la escritura, el `23514` se vuelve a preguntar al impacto y se dice igual. La pantalla no precarga el impacto de 10 reglas.
- **D3 · Encender también ofrece «Deshacer»**, por el mismo camino (puede dar `en_uso`). El toast dice «Regla «Aduana» apagada.», sin género propio
  de cada nombre.
- **D4 · «Deshacer» usa la última versión conocida del flujo** (la de la página o la de la última respuesta): apagar A y B y deshacer A no da `PT409` por
  culpa de la propia persona. Si otra persona tocó el flujo, el conflicto sale igual, dentro de la pantalla.
- **D5 · Los interruptores siguen a lo que lee el servidor** y se apagan mientras hay un envío en vuelo: un apagado que no se hace no «salta» y vuelve.
- **D6 · El permiso se dice con `motivoSinPermisoDeReglas`** (pantalla: interruptores y casillas apagados con el motivo; action: primera llave); la base
  decide. El selector ya sólo ofrece flujos configurables, así que el caso real es un `42501`.
- **D7 · El borrador de la oferta lleva `key` por la firma de lo guardado** (ids ordenados), no por la versión: encender o apagar otra regla no borra lo
  que se está marcando.
- **D8 · Una regla encendida que el ámbito no admite** (dato heredado) se muestra con su interruptor, nunca se esconde (`reglasParaMostrar`).
- **D9 · Un puerto o naviera guardado que se desactivó** se sigue mostrando, rotulado «(inactivo)», para poder quitarlo (la base los acepta).
- **D10 · «Vacío: se ofrecen todos.»** sólo se dice en un grupo que tiene algo para marcar; un grupo sin catálogo dice «Todavía no hay … cargad[o]s.».
- **D11 · Una sola parte** (el plan estimaba dos): pantalla pura sobre RPC con sus pruebas; la sección de `docs/UX.md` entró en el commit de la pestaña
  porque el e2e la cita y el hook de commit exige que el título exista.

<!-- paso:6.03 -->

# Paso 6.03 — La cadena de `/logistica`

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas: las dudas del PLAN, con su recomendada. El plan completo: `.piloto/planes/6.03.md`.

- **D1** La tarjeta no lleva foto: se reconoce por nombre, VIN, lote o contenedor y 350 miniaturas pesan.
- **D2** Con muchas fases la caja se desplaza de costado con `<PistaDeDesborde>`; no se pliegan columnas.
- **D3** «Sin fase» la pone la base (primera y sólo con tarjetas); el texto lo pone la interfaz. El kanban no ordena: el orden de las columnas es el de la base.
  Su cursor de «Ver más» va sólo por `id` (sin `fase_desde`, por `vehiculos_fase_desde_coherente`): `cursorDeLaColumna()`.
- **D4** La tarjeta se nombra `<principal> · <título>` (6.13) y se arma **en el servidor**: los atributos se leen de `vehiculos` bajo la RLS de quien mira, sólo si el
  origen tiene campo principal, por clave primaria y en tandas de ≤ 100 ids. Si falla o no llegan atributos, la tarjeta dice el título; no tumba el tablero.
  Una sola lectura del principal y de los ajustes por cadena, no por columna.
- **D5** «Ver más» es una Server Action de lectura (`verMasDeLaColumna`): así la identidad se arma igual que en la primera carga. Pide `logistica.ver` del origen
  antes de leer; la base lo vuelve a exigir. Un `22023` (cursor, fase ajena) se dice «No se pudo cargar más. Intenta de nuevo.».
- **D6** Hasta `TOPE_DE_LO_CARGADO` (500) por columna; al llegar, `<AvisoDeTope>`. El número de la columna es `conteoCorto()` («50+»), nunca un total.
- **D7** «Demoradas» y «Por aprobar» son una `eleccion` de dos valores y no un `booleano` (un «No» tri-estado no filtra y el chip sería engañoso); sólo se manda a la
  base lo que es `si`. La búsqueda `q` pide 3 letras o números (espejo de `_logistica_filtros`); `naviera` sólo se ofrece si hay navieras activas.
- **D8** Las pestañas de origen son los activos con `logistica.ver` y la regla `logistica` activa en su flujo; un `?origen=` ajeno cae en el primero. Un origen
  cuyo flujo no se pudo leer queda fuera y se cuenta (`fallaron`).
- **D9** a **D12** (parte 2): abrir una tarjeta es un enlace con `vehiculo=<id>`; celular, una fase a la vez con `?fase=`; «dónde está» la arma el servidor;
  el presupuesto de JS de `/logistica` se mide con el build.
- **D13** `navegacion.ts` ya tenía «Logística» disponible: `_shell` no se toca. El kanban no entra a `listas-con-patron.ts` (sólo vigila tablas).
- **D14** (parte 1) Las tres RPC entran a `RPC_PAGINADAS_DEL_NUCLEO` de `scripts/guardas/paginas-en-la-base.ts` (es del A): la cadena y su columna piden
  `TAMANO_DE_COLUMNA`; «dónde está», 10.
- **D14** (parte 2) Los e2e de 6.01 que afirmaban «La cadena llega con el próximo paso.» (`logistica-unidad.spec.ts`) afirman ahora la región de la fase sembrada («<fase>: 1 vehículo»): es consecuencia del cambio de texto, no un arreglo para que pasen.
- **D15** (parte 2) Cada tarjeta es un `<Link>` con `prefetch={false}`: un clic común abre el panel por nuqs sumando al historial (`useAbrirLaUnidad`, copiado al área `cadena`), y con Ctrl, Mayús, Alt o Meta el navegador abre la URL con `vehiculo=` en otra pestaña. El foco va a la primera tarjeta nueva tras «Ver más» y se anuncia «Se cargaron N más.».
- **D16** (parte 2) `/logistica` entra al presupuesto de JS con 410 KB (medido 388,9 KB en 30 chunks, más un 5 % a la decena). El e2e siembra tres orígenes: A (tres fases, cinco vehículos), B (una fase con 51) y C (vecino sin permiso).

<!-- paso:6.04 -->

# Paso 6.04 — «Qué falta», mover con nota y conflicto legible, notas, historial y el lote

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas: las dudas de la fila, con su recomendada. El plan completo: `.piloto/planes/6.04.md` (tres partes: 6.04-1 «Qué falta» y mover; 6.04-2 notas, historial y el enlace de la ficha; 6.04-3 el lote).

- **D1** El lote no mezcla fases: se arma desde una columna (o un grupo en una misma fase), así todas comparten destinos.
- **D2** «Mover los N que pueden», con su número en el botón: el resultado parcial explícito del Flujo 3 de UX, no todo o nada.
- **D3** La ficha del vehículo sólo gana el enlace «Ver en logística»: `vehiculos` no puede importar `logistica`.
- **D4** «Qué falta» nace **abierto** (es lo que se mira para mover); los demás huecos siguen plegados (`abiertoAlInicio` en `HuecoDeLaUnidad`).
- **D5** Sin realtime: «Qué falta» se relee al volver el foco a la ventana (mínimo 5 s entre lecturas) y cuando otro hueco avisa (`logistica:unidad-cambio`; 6.06 lo dispara al aprobar un documento).
- **D6** Los destinos salen de `fases_transiciones` desde la fase actual (o las fases iniciales activas si no tiene fase), hasta `TOPE_DE_DESTINOS = 12` (lee 13; si llega, lo dice). Una vista previa por destino, en paralelo.
- **D7** El `origenId` llega del panel a la action sólo para decidir con `puede()`; la base vuelve a decidir (`cambiar_fase`).
- **D8** La nota es obligatoria si lo pide la fase de destino o la transición; lo dice la vista previa y se dice junto al campo. Sin nota el botón queda apagado con ese motivo.
- **D9** Las notas que nacieron de un cambio de fase no se editan ni se borran en la interfaz (parte 2).
- **D10** «Reintentar los N» (parte 3) usa la misma fase de origen del lote como esperada.
- **D11** «Marcar que llegó» (hueco del grupo, parte 3) abre el lote del grupo; no inventa una fase «llegó».
- **D12** Sin actualización optimista: al mover, la action responde y `router.refresh()` repinta la cadena y el panel.
- **D13** El cuerpo de una nota se acota en la interfaz a 2000 caracteres (la base no tiene tope; no se toca la base).
- **D14** Un requisito dice a dónde ir por un mapa fijo de su clase (documento → `documentos`; `transporte.*`, `aduana.*`, `pagos.*` → su hueco); el atajo sólo se dibuja si ese hueco existe en el panel.
- **D15** Las actions de mover aceptan sólo vehículo; la rama de repuesto es de 8.13 (la infra de la base ya recibe `p_repuesto`).

Anotadas al hacer la parte 1:

- **D16** El estado del botón de mover (`estadoDelBoton`) vive en `flujos/entities/mover/` y no en `logistica`: depende de la vista previa y de los motivos de `flujos`, y una entidad de `logistica` no puede importar el `client.ts` de `flujos` (arrastra Server Actions). `logistica` lo usa por `@/modules/flujos/client`.
- **D17** El rechazo de la base llega a la pantalla como `porCampo: { <hint>: mensaje }` (patrón de `transiciones`): `conflicto`, `requisitos`, `rol`, `nota`, `transicion`, `acceso`.
- **D18** El borrador de mover (destino abierto, nota y aviso de conflicto) vive en el hueco, no en cada destino: tras un conflicto la unidad cambia de fase, los destinos son otros y la nota sigue a mano.
- **D19** El atajo de una falta encuentra su hueco por `data-bloque-del-hueco` y lo abre con un aviso del navegador (`logistica:abrir-hueco`); un hueco que el panel no dibuja no ofrece atajo.

Anotadas al hacer la parte 2 (2026-11-12):

- **D20** Notas e historial se leen desde el navegador con la sesión de quien mira (como `dinero`): un hueco recibe sólo `{ unidad }` y su bloque monta el contenido al abrirse. La RLS decide; escribir va por Server Action.
- **D21** El camino a lo antiguo es «Ir a una fecha»: `creado_en <` el inicio del día siguiente en la zona de la empresa (`hastaDeUnDia`, propio de `logistica` porque el de `cotizaciones` no se puede importar). El salto reemplaza lo leído y dice «Desde el …».
- **D22** Escribe quien ve la unidad (`logistica.ver` en su origen; la policy pide lo mismo). Editar es sólo de la propia y sin cambio de fase, en el lugar. **Sin «Borrar»** (cambia lo planeado): la prueba SQL N3 (`supabase/tests/areas/mover/notas.sql`) mostró que el borrado suave por `update` da 42501 aunque no pida `returning`, porque `notas: leer` también se aplica a la fila nueva, que ya no es legible. Borrar una nota propia pide una RPC `security definer`: abierto **6-3**, un paso de datos (riesgo rojo), fuera de esta parte.
- **D23** Más reciente primero, de a `TAMANO_DE_VER_MAS` hasta `TOPE_DE_LO_CARGADO`; el cuerpo de una nota se acota a 2000 en el Zod (D13).
- **D24** Las dos listas se releen sin soltar lo que se ve cuando cambia `unidad.faseId` y con `logistica:unidad-cambio`; guardar o corregir una nota avisa (también relee «Qué falta», barato).
- **D25** «Ver en logística» sale con sólo `logistica.ver` en el origen del vehículo: lo decide la página de la ficha con `puede()` y la ficha recibe una booleana (`vehiculos` no importa `logistica`, D3).
- **D26** Corregir una nota no manda versión (son notas propias; dos ventanas de la misma persona, gana la última). El texto de una nota de cambio sale de la fase embebida (`historial_fases → fases`), una sola consulta, nunca una por fila. Corregir pide la fila de vuelta (`select('id').limit(1)`) para saber si tocó alguna: la fila nueva sigue viva y pasa `notas: leer`.
- **Deuda de la base, sin tocar:** `authenticated` tiene `update` sobre toda la tabla `notas` y la policy `notas: editar` sólo mira el autor: la base no impide que su autora cambie el cuerpo de una nota de cambio de fase ni su `historial_fase_id`; el filtro `historial_fase_id is null` de la action es lo que lo cierra en la interfaz (D9). Una RPC para 6-3 puede cerrar las dos cosas.

<!-- paso:6.05 -->

## 2026-11-11 — Paso 6.05: documentos en la base

- **D1 · Un objeto y N filas** (duda 1, la recomendada). Un archivo subido para N vehículos es un objeto en la carpeta del primero y N filas de
  `documentos` con la misma ruta. Quien ve cualquiera de esas filas vivas lee el objeto (policy «documentos: leer» de `storage.objects`).
- **D2 · Eliminar no se deshace** (duda 2, la recomendada). Es un borrado suave y no hay restaurar. Para corregir, se sube otro.
- **D3 · `visible_portal` lo marca quien aprueba** (duda 3, la recomendada). `documento_registrar` no lo recibe; sólo lo cambia `documento_editar`
  con la clave de aprobar.
- **D4 · El refcount cuenta sólo las filas vivas.** `storage_refcount('documentos', …)` ignora las eliminadas. Si no, un documento eliminado retendría su
  objeto para siempre, porque `storage_gc_reclamar` vuelve a contar antes de borrar.
- **D5 · Hasta 100 vehículos por llamada.** Cubre un contenedor o un embarque y acota la transacción.
- **D6 · Los ids derivan de `p_id` y de la unidad** (`md5(p_id || ':' || unidad)::uuid`). Reintentar devuelve las mismas filas, sin importar el orden del
  arreglo. Si los ids ya existen con otra ruta, de otra persona o con otro conjunto de unidades, `23505/id`. Un reintento simultáneo cae en
  `on conflict do nothing` y vuelve a la rama idempotente, así que nunca sale un `23505` crudo.
- **D7 · El vencimiento se valida, no se limpia.**
  - `ninguno` con fecha da `22023/vence_el`, y `solicitar` sin fecha también.
  - `renovar` sin fecha calcula la emisión (o la subida) más `vigencia_dias`.
  - Al editar, las fechas se revalidan sólo si cambian: un tipo que cambió de modo no traba editar la nota.
- **D8 · El mime y los bytes de `storage.objects.metadata` pesan más que los del cliente**, como en `cotizacion_adjuntar`. Los formatos admitidos salen del
  tipo.
- **D9 · Quien subió puede editar y eliminar mientras siga «subido»**, si conserva la clave de subir. Lo aprobado o rechazado sólo lo toca quien aprueba.
- **D10 · Quien aprueba puede aprobar lo que subió él mismo.** El producto no tiene regla de cuatro ojos. Es reversible.
- **D11 · La carrera de dos quitas se prueba (K1, `supabase/tests/areas/documentos/carreras.mjs`).** El trigger serializa con un candado por unidad y
  tipo.
- **D12 · Queda una carrera para 6.02 (1), del carril a.** Mover a una fase que exige el documento mientras alguien lo quita puede dejar la unidad «fuera de
  regla», porque `cambiar_fase` evalúa antes de tomar la unidad. Cuando `cambiar_fase` tome la unidad `for update` antes de
  `previsualizar_cambio_fase`, el `for share` del trigger serializa los dos órdenes sin interbloqueo.
- **D13 · El portal oculta los tipos sin `visible_portal_permitido` al leer**, sin tocar `documentos.visible_portal`: volver a permitirlo los muestra de
  nuevo. Además, `documento_sellos` mira el permiso del tipo sólo cuando `visible_portal` se enciende. Así, un visible de un tipo al que se le apagó el
  permiso (D8 de 5.03) se sigue revisando, editando y eliminando.
- **D14 · El paso cabe en una parte** (6 commits de código). La fila estimaba 3.

<!-- paso:6.13 -->

# Paso 6.13 — El campo «principal» de un origen (6-1)

Fecha: 2026-11-11 (`TZ=America/La_Paz date +%F`). Sin compuertas: las dudas del PLAN, con su recomendada.

- **D1** Marcar otro principal **desmarca** el anterior en la misma llamada; el índice único parcial `origenes_campos_principal_unico`
  sigue siendo el candado.
- **D2** En logística la identidad **acompaña** al título («<principal> · <título>»); en la fila, la tarjeta y el resumen **reemplaza** al
  título como nombre y el título pasa a la línea secundaria (sólo con principal con valor). Se hace en el 6.13-2.
- **D3** Lo hace el carril c en su PR (lo del núcleo se agrega o edita en el PR del carril); la migración empieza por `origenes_campos`,
  dominio del carril c. Sin `espera`.
- **D4** `origen_campo_guardar` **sigue devolviendo `timestamptz`**: cambiar el retorno exige `drop` y rompe `humo.sql` y la infra. El PLAN
  pedía que devolviera el desmarcado; la pantalla avisa antes de guardar cuál deja de ser principal, con el layout cargado. Salvedad: si otra
  persona cambió el principal entre la carga y el guardado, el aviso nombra el que estaba en pantalla y no salta PT409 (sólo se compara la
  versión del campo que se guarda); el desmarcado igual queda bien en la base y se ve al revalidar. `origen_campo_crear` sí lo devuelve
  (`desmarcado` en su `jsonb`).
- **D5** Un campo `moneda` **no puede ser principal** (`check` y mensaje de la RPC): la identidad es texto y todo monto va por `<Monto>`.
- **D6** Ningún origen queda con principal al migrar: sin relleno. Nada cambia en pantalla hasta que alguien marca uno.
- **D7** (6.13-2) «Principal» vive sólo en el panel del campo y la fila lleva la insignia: el aviso se ve siempre antes de guardar.
- **D8** `origen_campo_guardar` toma **siempre** el origen `for no key update` antes que el campo (auditoría del plan): dos marcas
  concurrentes del mismo origen, un cambio de grupo que renumera el origen, `origen_campo_mover` y `origen_campo_crear` van en fila en el
  mismo orden (origen → campo), sin `40P01`. `no key update` no frena el `key share` de las FK que apuntan al origen. Lo prueba K1.
- **D9** (6.13-2) El e2e usa un campo propio «Lote interno»: «Lote» es la columna común `vehiculos.lote`, reservada.
- **D10** (6.13-2) `CampoDeVehiculo.principal` es opcional en `vehiculos`.
- **D11** (6.13-2) El panel de logística arma la identidad en la composición del núcleo con `leerCampoPrincipal()` de `origenes` e
  `identidadDeVehiculo` de `vehiculos` (dependencia nueva `logistica → origenes`, sin ciclo). **Para el carril a, 6.03:** la tarjeta de la
  cadena (`features/cadena`, todavía vacía) pide la identidad con estas mismas funciones.
- **D12** El principal puede ser además «En tarjeta»: `en_tarjeta` vuelve a decir sólo qué se ve en la tarjeta.
- **El desmarcar es un ayudante** (`_origen_campos_desmarcar_principal(origen, salvo)`, sin `security definer` y sin EXECUTE para nadie;
  lo llaman las dos RPC como su dueño). Aun así `origen_campo_guardar` queda en 119 líneas de función (ya medía ≈ 94, sobre el tope de 80):
  del tipo del abierto **4-64**; partirla mueve una `security definer` con sus pruebas. `scripts/carreras.mjs` (373 → 375 líneas, ya sobre
  300; 4-64) suma un import y una llamada: las carreras nuevas viven en `supabase/tests/areas/origenes/carreras.mjs`.
- **K2** (observación menor de la auditoría): la traducción del `23505` del índice a `PT409` sí tiene prueba que puede caer: una sesión
  `postgres` marca un principal sin confirmar y `guardar` espera en el índice y sale `PT409` con el mensaje humano.

## 6.13-2 (2026-11-11)

- **D13** La identidad recibe **el campo principal, no la lista**: `identidadDeVehiculo(vehiculo, principal, formato)`, con
  `campoPrincipalDe(campos)` aparte. Logística sólo tiene un `CampoPrincipal` de `origenes` (clave, etiqueta, tipo, opciones), no un
  `CampoDeVehiculo`: con la firma por lista no compilaba sin inventar campos. Cambia la firma, no la conducta.
- **D14** El panel del campo, con la bandera encendida, dice **antes de guardar** los dos rechazos de la base (monto, desactivado) con los
  mismos textos, y si desmarca a otro principal. Es ayuda, no bloquea: decide la RPC.
- **D15** El e2e también abre `/logistica/vehiculo/<id>`: es la única prueba de la identidad en el panel de la unidad.
- **D16** `configuracionDeOrigen` recibe el principal actual opcional (ausente = ninguno): el test del formulario de campo no cambia.
- **D17** La página `/vehiculos/[id]`, el PDF, la web, la hoja de cotizar y `leerTitulosDeVehiculos()` siguen con el título: la fila de
  PLAN nombra la lista, el resumen y logística. La misma función sirve después.
- **D18** (cambia lo del plan) La composición cruzada de logística no puede vivir en `areas/nucleo/composicion.ts`: el lint
  (`boundaries`) no deja que una entrada importe otro módulo. Va a `features/nucleo/unidad-con-identidad.ts` (como
  `vehiculos/features/alta/fuentes.ts`), que lee también `getAjustes()` de `empresa`: el principal de número o fecha sale con el formato
  regional de la empresa, sin deuda. Si el principal no se puede leer, queda el título.

<!-- paso:7.02 -->

# 7.02 (2026-11-11)

- **D1** · Abrir un aviso lo marca accionado sólo en `tarea_asignada`, `recordatorio` y `demora_fase`, y sólo si la fila pedía acción. `turno_web` se acciona por `web_confirmar_contacto` (Fase 8) y `limpieza_pronto` por «Conservar»: abrirlos sólo los marca leídos.
- **D2** · Realtime por `postgres_changes`, `INSERT` y `UPDATE` con `usuario_id=eq.<yo>`, nunca `DELETE` (no pasa por RLS). Plan B si en local no entrega: releer cada 30 s con la pestaña visible. Se confirma en la parte 2.
- **D3** · Sin migración: la lectura va por PostgREST bajo la RLS, con cursor `or(creado_en.lt.X, and(creado_en.eq.X, id.lt.Y))` con la fecha entre comillas, sobre los índices del 7.01.
- **D4** · «Marcar todas como leídas» sólo pone `leida_en`, por lotes de 200 y hasta 5 por clic; si el último vino lleno, `quedanMas`.
- **D5** · Se escribe por Server Actions con `update` bajo la RLS y los grants de columna; el cliente de navegador sólo lee.
- **D6** · La acción propia de cada tipo vive en un registro de `src/app/(app)/_shell/huecos/` (las funciones no cruzan de servidor a cliente); la Fase 8 suma «Contacté» editando sólo ese registro (parte 2).
- **D7** · El contador y la lista de la campana se leen en el cliente al montar, no en el layout; el contador lee 10 y muestra «9+».
- La consulta de lo de la campana y la de cada página están escritas una vez (`infra/consultas.ts`) y las usan el servidor y el navegador.
- **D2 (resultado)** · `postgres_changes` bajo RLS anda en el stack local (la campana de una sesión abierta se actualiza sin recargar): no hace falta el plan B ni policies en `realtime.messages`.
- **D8** · El canal de Realtime se une **después** de `realtime.setAuth()`. Unido antes entra como `anon`, que no puede leer `notificaciones`, y Realtime rechaza el filtro `usuario_id=eq.<yo>` con «invalid column for filter» (`realtime.subscription_check_filters` pide `SELECT` de columna al rol del token). Lo reusa 7.09 y 7.11 vía `canal.client.ts`.
- **D9** · El contador y Realtime van en un componente `diferido()` (`SuscripcionDeLaCampana`): el cliente de Supabase del navegador en el shell subía el JS en frío de `/cotizaciones` de 358 a 424 KB; diferido, 355 KB. El popover también va diferido. El documento de `/perfil` pasó de 80,3 a 82,7 KB (botón, rutas con pantalla y usuario por props): presupuesto de 82 a 85 KB (+3 %).
- **D10** · `destinoDe` trata `/` como sólo ella misma: como prefijo (`/` + `/`) toda ruta habría contado como disponible.
- **D11** · «Por accionar» sin filas dice «Nada pide tu acción» con «Ver todas» (un `EstadoVacio` con su botón) y no `EstadoSinResultados`, que sólo ofrece «Limpiar filtros»: acá no hay filtros que limpiar, hay una pestaña.
- **D12** · Tras una señal de Realtime la lista relee su primera página y la **funde** (`fundirPagina`): lo cargado dentro del tramo que cubre la lectura fresca y que ya no viene (se accionó, o se purgó) sale; lo de «Ver más» se queda. «Marcar todas como leídas» deja a la vista lo cargado como leído sin esperar la señal.
- **D13** · (CI del PR #116 en rojo, 2026-11-11) El canal relee **al unirse**, también la primera vez, no sólo tras un corte: un aviso insertado entre la lectura de la pantalla y la unión del canal (≈ 1 s en el CI) nunca llegaba como señal y «un aviso nuevo entra arriba de la lista abierta» caía. `alReconectar` de `canal.client.ts` es ahora «se unió o volvió a verse»; la campana lee dos veces al montar (la primera para pintar pronto el número).
- **D14** · La campana monta su contador y su canal (`SuscripcionDeLaCampana`) cuando el navegador descansa (`useAlDescansar`, `requestIdleCallback` con tope de 3 s), no al hidratar el marco: evaluar el código del cliente de Supabase mientras React hidrataba retrasaba ≈ 320 ms (480 → 800 ms, medido contra `origin/main` con el mismo spec) el primer clic que vale en toda pantalla, y caían «Ver más», «Salir de un lead» y la tecla N, que clican sin esperar la hidratación.
- **D15** · Los specs que cuentan pedidos a la base dejan fuera los de la campana (`e2e/soporte/pedidos-del-marco.ts`: `esDelMarco`): no son de la pantalla que se prueba. Y la campana suma una parada de Tab: `CONTROLES_DE_LA_ASESORA` 58/54 y `CONTROLES_DE_LA_DUENA` 54/50 (escritorio/celular) en la tarea de oro 2, y `CONTROLES_MAXIMOS` 33 en la tarea de oro 4 (KLM 13,3 s de 30).

<!-- paso:7.05 -->

## 2026-11-11 — Paso 7.05: correo de la app, adaptadores `resend` y `cloudflare` (7-1)

- **D1** · Variables: `RESEND_API_KEY`; `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_API_TOKEN` (los nombres estándar de Cloudflare). Cada una se pide sólo con su proveedor;
  las de otro proveedor no se piden ni se rechazan si están. El ID de cuenta se valida como 32 hexadecimales y además va con `encodeURIComponent` en la ruta.
- **D2** · `pnpm email:probar` es `scripts/email-probar.ts` con `tsx`, no `.mjs` como decía `docs/PLAN.md`: los adaptadores son TypeScript y un `.mjs` no los
  importa. Mismo patrón que `env-check.ts`. La elección del adaptador sale de `index.ts` a `proveedor.ts` (sin `server-only`) por lo mismo.
- **D3** · Cloudflare, según su documentación (leída 2026-11-11): el REST no devuelve id de mensaje (sólo el binding de Workers). El contrato de `AdaptadorDeEmail`
  exige un id, así que el éxito devuelve `sin-id`; lo que importa es que la API aceptó el envío (`success: true`). Con varios destinatarios, uno en
  `permanent_bounces` no tumba el envío de los demás: sólo es fallo si ninguno quedó en `delivered` ni en `queued`. Las etiquetas del mensaje se ignoran (Cloudflare no las tiene).
  Sigue sin probarse con un envío real; `email:probar` y `ENTORNOS.md` lo dicen hasta que alguien lo confirme.
- **D4** · Sin reintentos ni idempotencia: un fallo es un valor y quien llama decide (las notificaciones y los jobs vendrán después).
- **D5** · Cada pedido tiene un tope de 10 s (`AbortSignal.timeout`); vencido = «no respondió».
- **D6** · Un mensaje de error nunca lleva la clave ni el texto libre del proveedor (puede traer correos de personas): a lo sumo un código corto (`validation_error`, `10001`).
  401/403 dicen qué variable revisar; 429, que se espere.
- **D7** · El archivo de Resend se llama `resend-rest.ts`, no `resend.ts`: el lint (`NINGUN_SDK_DE_CORREO`, patrón `resend`) rechaza importar cualquier ruta llamada así.
  Su prueba conserva el nombre `resend.test.ts`. No se tocó la regla de lint.

<!-- paso:9.02 -->

# 9.02 · Inicio: la bandeja con huecos y los bloques de lo que ya existe (2026-11-11)

- **D1 · «Sin seguimiento».** Mío (mi cartera: `leads_cartera_vista`), sin ningún seguimiento (`ultimo_seguimiento_en` nulo) y creado hace más de 24 h. `ajustes_empresa.lead_dormido_meses` es otra cosa y sigue sin lector.
- **D2 · Dónde se lee.** En el servidor: cada bloque tras su `<Suspense>` con `await connection()`. Inicio no suma JS (salvo el botón «Reintentar») y un bloque lento no frena a los demás. La página también llama `connection()` antes de leer la sesión y los ajustes: sin eso, `leerAjustes()` corría mientras Next preparaba la ruta y avisaba de `Date.now()`.
- **D3 · Tope.** 5 por bloque, pidiendo 6; el número que se dice sale de `cantidadAcotada` («3 recordatorios», «más de 5 recordatorios»), nunca de un total.
- **D4 · «Recordatorios de hoy».** Los míos pendientes con hora antes del fin del día en la zona de la empresa, **vencidos incluidos** y marcados «Vencido»: uno olvidado no desaparece a medianoche. Amplía la fila (que dice «los que vencen hoy»); se revierte cambiando una condición de `leads/infra/queries/bandeja.ts`.
- **D5 · La zona.** Sale de `ajustes_empresa.zona_horaria` (la lee la página con `leerAjustes()`; si no se puede, `ZONA_POR_DEFECTO`). `leads` recibe instantes (`finDeHoy`, `creadoAntesDe`), no sabe de zonas al leer.
- **D6 · Quién dibuja el título.** `<Bandeja>` pone la `<section>` y el `<h2>`; el archivo de cada bloque sólo el cuerpo. El título se ve mientras carga o falla, y la fase que llena su hueco no toca el marco.
- **D7 · Sin filtro inventado.** Ni el listado de leads ni Equipo tienen el filtro que el bloque necesitaría («sin seguimiento», «sin rol»): el encabezado no enlaza y cada fila lleva a su ficha (`/leads/<id>?seccion=seguimientos`, `/configuracion/equipo?persona=<id>`).
- **D8 · «Sin rol».** Perfil activo, no bloqueado y sin fila en `usuarios_roles`, con la anti-unión de PostgREST (`.is('usuarios_roles', null)` sobre la relación embebida): sin RPC ni migración. Comprobado en el e2e contra la base local.
- **D9 · Error de un bloque.** `EstadoError` con «Reintentar» (`router.refresh()` en una transición); el resto de la bandeja queda pintado.
- **D10 · Sin migración ni índice.** Las tres lecturas usan lo que hay: `recordatorios_usuario_idx`, `leads_asesores_listado_idx` (por `leads_cartera_vista`) y `perfiles_vigentes_orden_idx`. Sin `count`, sin `offset`, `limit 6`.

<!-- paso:9.03 -->

## 2026-11-11 — Paso 9.03-1: dominancia sobre la persona, la base (9-1)

- **Desbloquear también exige dominar** (recomendada del PLAN): es la misma RPC con `p_bloquear = false`, y desbloquear a quien tiene más permisos que tú es devolverle el acceso.
- **Quitar un rol que dominas a alguien que no dominas, tampoco** (recomendada del PLAN): la regla del 2026-10-21 es sobre la persona, no sobre el rol.
- **`dominada` no entra en `equipo_lista()`; se lee con `personas_dominadas(p_ids uuid[])`** (≤ 101 ids, exige `equipo.usuarios.ver` o `.gestionar`). `equipo_lista()` devuelve `setof uuid` desde tres rutas de SQL dinámico: cambiarle el retorno obligaba a `drop function`, a reescribir `equipo-lista.sql` y `medir-equipo.sql` y a tocar el registro de páginas. La lectura aparte deja intacto el plan medido de la lista y sirve igual a la página de una persona.
- **Orden de las comprobaciones:** permiso → cuenta propia → perfil `for update` (PT409 si no está) → dominancia (42501) → estado (PT409). Quien no domina a la persona no se entera de su estado.
- **Candados:** además del perfil, los roles de la persona `for share` (un `rbac_otorgar()` sobre un rol que ya tiene no se cuela) y, al asignar y quitar, `p_rol` `for share` antes de `rol_dominado` (auditoría del plan). La comprobación va en una función `volatile` y en una sentencia aparte del candado: en READ COMMITTED así ve lo que el otro acaba de confirmar.
- **«El dueño domina a todos» = quien llama tiene el rol de clave `dueno`** (activo y sin bloqueo), aunque a ese rol le falte algún permiso (`nivel_crear(…, p_conceder = false)` o un permiso nuevo de una migración futura).
- **Asignar o quitar un rol a una persona sin perfil es PT409** «Esa persona ya no está en el equipo.» (antes, 23503 de la FK al asignar y nada al quitar).
- **El mensaje:** `No puedes <bloquear a | desbloquear a | dar de baja a | cambiar los roles de> <nombre>: tiene permisos que tú no tienes.` (42501).
- **`humo.sql`:** los dos tramos donde Gabriela bloqueaba o daba de baja a la dueña los hace ahora Pablo (rol `dueno`, invitación sin aceptar): Gabriela ya no domina a la dueña y caería por eso antes que por el guardián; el guardián sigue sin contar a Pablo.
- **Un commit para la regla y su lectura** (el plan decía dos): `personas_dominadas()` es la cara pública de `_personas_dominadas()`, va en la misma migración y así la base se resetea una vez por commit.

## 2026-11-11 — Paso 9.03-2: dominancia sobre la persona, la interfaz (9-1)

- **Deshabilitado con motivo, nunca escondido:** «Cambiar sus roles», «Bloquear»/«Desbloquear» y «Dar de baja» se siguen dibujando, apagados, con una nota al final del «⋯» (el patrón de la cuenta propia).
- **El motivo nombra lo que ofrece el menú:** «Tiene permisos que tú no tienes: no puedes cambiar sus roles, bloquearla ni darla de baja.» (o «desbloquearla»).
- **Si `personas_dominadas()` falla, apaga:** la lista se ve igual, `dominada` es `null` y la nota dice «No pudimos comprobar si tienes todos sus permisos. Recarga la página para intentarlo de nuevo.». Un error nunca habilita una acción.
- **La cuenta propia gana:** sobre sí misma no se mira `dominada` (quien llama se domina a sí mismo en la base).
- **`motivoSobrePersona()` no mira el estado** (auditoría del plan): el panel de roles se abre también a mano por `?persona=`, aun sobre una dada de baja, y ahí apaga igual.
- **Con `equipo.usuarios.ver` sin `.gestionar`** la lectura se pide igual, sin ramificar: el «⋯» y el panel no se dibujan para esa persona.
- **Panel de roles:** el motivo de la persona va una vez arriba de la lista y en el nombre accesible de cada interruptor; el motivo por rol se queda como estaba.
- **Fuera de alcance:** «Generar otro enlace de invitación» no se apaga (su action ya exige dominar los roles), y el `?baja=` escrito a mano abre el diálogo y la base rechaza con su mensaje.

<!-- paso:5.01-1 -->

## 2026-11-11 — Paso 5.01-1

- **El 5.01 se parte en dos:** 5.01-1 (la versión del flujo y su contrato, `fase_crear`, `fase_guardar`, sin escritura directa, la carrera) y 5.01-2 (`fase_mover`,
  `fase_eliminar` con versión y el `drop` de la firma vieja, `fase_reactivar`, `fase_impacto`, el flujo de repuestos por migración, la línea de `fase_eliminar` en
  `escala.sql` y sus 42501: «las seis»). Entero eran 9 o 10 commits de código. Plan: `.piloto/planes/5.01.md`. `docs/plan.yaml` conserva un solo `5.01`: **este PR no marca
  `integrado 5.01`**; 5.04, 5.05, 5.07 y 5.10 esperan al 5.01-2, aunque las firmas del contrato ya quedan aquí.
- **Firmas congeladas** (las usan 5.05, 5.07 y 5.10): `public._flujo_para_editar(p_flujo uuid, p_actualizado_en_esperado timestamptz) returns public.flujos` y
  `public._flujo_tocar(p_flujo uuid) returns timestamptz`, sin EXECUTE para `authenticated`. Toda RPC de configuración las llama (antes y al final) y devuelve la versión.
- **Lo que pidió la auditoría del plan (observaciones), aplicado:** en crear, la forma antes del permiso y las validaciones tras el candado; `if not found` → PT409 tras cada
  `for update`; K2 (quien no tiene `flujos.configurar`, `supervision` en las carreras, no espera el candado); `drop trigger trg_actualizado_en on flujos`; los topes nuevos sólo sobre las claves que llegan; enteros dentro de `int4`.

- D1 · Versión **por flujo**, no por fila (recomendada de la fila, duda a): una fila bloqueada sirve a las tablas hijas sin `actualizado_en`; dos personas en el
  mismo flujo chocan con `PT409`, aceptable en una pantalla de dueño.
- D2 · Se puede jubilar la única inicial activa (duda b); entra con `fase_eliminar` en el 5.01-2, con `unica_inicial` en `fase_impacto`.
- D3 · El flujo de repuestos por migración (duda c), en el 5.01-2.
- D4 · La versión la mueve un trigger propio de `flujos` (`flujo_version`, C1) y no `_flujo_tocar` a mano: el trigger genérico la pisaría con `now()` (V1) y
  `migraciones.md` › «Forma» pide `greatest(clock_timestamp(), anterior + 1 µs)` para lo que se mueve dos veces en una transacción.
- D5 · Los dos ayudantes del contrato sin EXECUTE para `authenticated` (C4): llamados sueltos dejarían bloquear filas de `flujos` a cualquiera.
- D6 · El permiso se mira antes del candado (C2 b-c): quien no puede no espera ni hace esperar; el permiso no depende de nada que cambie en la fila (ámbito y
  origen no se editan).
- D7 · Un flujo o una fase que ya no existen dan `PT409` con «Recarga» (como `categoria_mover`, B:8667), no `42501`.
- D8 · El texto del `42501` es «No tienes permiso para configurar este flujo.» (de tú); `fase_eliminar` vieja dice «Sin permiso…» hasta el 5.01-2, que la
  unifica.
- D9 · Renombrar un origen mueve la versión de su flujo (V13): quien tenga la pantalla abierta recibe `PT409` al guardar. Raro y reversible; no se exceptúa.
- D10 · `fase_crear` sin `es_logistica` toma el valor de la regla `logistica` del flujo, para que crear en un flujo con la regla apagada no falle por un
  default de la tabla (V5, V7).
- D11 · Topes de texto (nombre 60, alias 60, descripciones 500) e ícono por formato `^[a-z0-9-]{1,40}$`: la tabla no los tiene y la pantalla del 5.04 los
  necesita; el catálogo de íconos vive en TS, la base sólo mira la forma. Se miran sólo sobre las claves que llegan (una fase vieja que los pase guarda otros campos).
- D12 · El caso con usuario simulado de C12 va en `areas/flujos/fases-guardar.sql` (V7; empezó en `fases.sql`, que pasó de 300 líneas), no en `humo.sql` (la fila; `migraciones.md` pide `humo.sql` en general).
- D13 · «Versión del flujo» en `docs/GLOSARIO.md` la escribe el 5.02 (carril a, su fila lo nombra): escribirla aquí también chocaría en el mismo archivo.
- D14 · La carrera se registra en `scripts/carreras.mjs` (import + llamada, como comprobantes) y no con un `correr-carreras.mjs` suelto como `areas/final/`: así
  la corre `db:carreras` en el CI.
- **El candado del contrato es `for no key update`** (de la auditoría del informe): `for update` sobre `flujos` y sobre la fase chocaba con el `key share` de las FK de
  `cambiar_fase` (`vehiculos.fase_id`, `historial_fases.flujo_id`) y podía terminar en 40P01. Dos guardados de configuración se siguen serializando (K1). `fase_guardar`
  asigna `nombre` sólo si cambia: asignar una columna de un único (`fases_flujo_id_nombre_key`), aun con el mismo valor, toma el candado de clave (medido); renombrar sí
  espera a quien mueve un vehículo a esa fase. 5.05, 5.07 y 5.10 heredan el candado por `_flujo_para_editar`; si escriben una columna de un único de su tabla, lo mismo.

<!-- paso:5.01-2 -->

## 2026-11-11 — Paso 5.01-2

- **El 5.01 queda entero con el 5.01-2:** el 5.01-1 (la versión del flujo y su contrato, `fase_crear`, `fase_guardar`, sin escritura directa) y el 5.01-2 (`fase_mover`,
  `fase_impacto` y `_fase_uso`, `fase_eliminar` con versión y sin la firma vieja, `fase_reactivar`, el flujo de repuestos por migración, K4) hechos. Este PR marca
  `integrado 5.01` (`parcial: false`) y desbloquea 5.04, 5.05, 5.07 y 5.10. Plan: `.piloto/planes/5.01-2.md`.
- **Lo que pidió la auditoría del plan (observaciones), aplicado:** A2 deshabilita `trg_flujo_regla_apagar_validar` en su bloque revertido; D21 dice que un cambio de
  fase hacia la fase que se borra recibe el `23503`; la semilla no vuelve a meter reglas en un flujo de repuestos existente; `fase_impacto` no devuelve versión (D15).

- D15 · `fase_impacto` y `fase_eliminar` comparten `_fase_uso()`: lo que la pantalla anuncia es lo que eliminar hace. Tope fijo de 50 (lee 51) dentro de la
  función y sin parámetro: no es una página y un `p_tope` pediría `_acotar_pagina`. `fase_impacto` no devuelve versión: es una lectura sin candado (la versión la
  tiene la pantalla).
- D16 · Las paradas cuentan también las unidades en la papelera: la FK `restrict` de `vehiculos.fase_id` no las distingue y el borrado caería.
- D17 · Impiden borrar todas las esperas que apuntan a la fase: la FK `restrict` frena cualquiera. Una espera siempre viene del otro ámbito (vehículos ↔ repuestos: lo exige
  el trigger de `fases_requisitos`); el mensaje no dice «otro flujo».
- D18 · El resultado de `fase_eliminar` conserva los participios del viejo (`jubilada | eliminada`); `fase_impacto` usa los verbos de la fila (`jubilar | eliminar | bloqueada`), que anuncian.
- D19 · Una fase ya jubilada con historial o unidades no tiene nada que hacer: impacto `bloqueada`/`ya_jubilada` y eliminar `22023`. Una jubilada sin nada se borra.
- D20 · «Única inicial» se mira sólo si la fase está activa: una inicial jubilada no sostiene el flujo.
- D21 · `fase_eliminar` toma la fase `for update` antes de contar: espera al cambio de fase en curso hacia ella y cuenta lo que dejó (jubila en vez de un `23503`
  crudo). Jubilar sólo escribe `activa` (`no key update`): después no frena a nadie. Queda un caso: un cambio de fase hacia F (`cambiar_fase`, `cambiar_fase_lote` o un vehículo que nace en F) que llega mientras se
  borra recibe el `23503` de la FK (lo traduce 5.05).
- D22 · `fase_mover` renumera todas las fases del flujo (activas y jubiladas) de 10 en 10 por (posición, nombre, id), escribe sólo las que cambian y siempre mueve
  la versión (también sin cambio): una regla sola, como `categoria_mover`.
- D23 · `fase_reactivar` valida las reglas del flujo sobre la fila (`_fase_validar` con claves vacías); ya activa → `22023`. Sin evento de actividad nuevo
  (`trg_auditar` lo registra); jubilar y eliminar conservan `fase.jubilada` y `fase.eliminada`. Una regla apagada con una fase jubilada que la usa sólo se
  alcanza por escritura directa (`trg_flujo_regla_apagar_validar` cuenta también las jubiladas): la validación de reactivar queda como defensa.
- D24 · El flujo de repuestos por migración se crea sólo si falta, y las 7 reglas sólo con el flujo que crea: uno existente no se toca (sus reglas son de la
  empresa). `seed.sql` toma el flujo existente y siembra fases sólo si no tiene ninguna.
- D25 · Carrera nueva sólo K4 (eliminar contra un cambio de fase que entra): dos `fase_mover` o `fase_reactivar` con la misma versión los serializa el mismo
  `_flujo_para_editar` que K1 ya prueba.
- D26 · `p_despues_de` igual a la fase → `22023` con hint `despues_de` (es la forma del pedido); un ancla de otro flujo o que ya no existe → `PT409` «Recarga» (D7).
- D27 · El `42501` de las seis dice «No tienes permiso para configurar este flujo.» (cierra D8: la vieja «Sin permiso…» desaparece con su firma).
- D28 · (auditoría del informe, menor) Si ya había `orden` repetido y el ancla lo comparte con otra fase de nombre posterior, la movida cae detrás de esa otra (modelo
  `categoria_mover`). Tras el primer movimiento no quedan repetidos; queda para 5.04 si hace falta (desempatar por la posición renumerada del ancla).

<!-- paso:5.04-1 -->

## 2026-11-11 — 5.04-1: las fases, lo puro y las actions

Las decisiones D1 a D17 del plan (`.piloto/planes/5.04.md`) siguen en pie; esta parte (sin interfaz) cumple las que tocan lo puro y la escritura. Lo que
cambió o se precisó al escribirlas:

- **D2 afinada · `flujoId` sólo en crear.** Las demás RPC reciben la fase y la base saca su flujo; sólo `fase_crear(p_id, p_flujo, …)` necesita el
  `flujoId`. Todas las actions llevan `origenId` (nulo = repuestos) para exigir el permiso antes de escribir: `puede(permisos, 'flujos.configurar',
origenId)` o `puede(permisos, 'repuestos.configurar')`. Es la primera llave; la base (`puede_configurar_flujo`) vuelve a exigirlo y manda.
- **D3 · La lectura del impacto es la action `leerImpactoDeUnaFase`** (no escribe, no revalida). El área `fases` no tiene lectura propia: la lista y el
  inspector leen del núcleo (`leerFlujoParaConfigurar`).
- **D5 y C6 · «unidades», no «vehículos».** `fase_impacto().paradas` suma vehículos e ítems de repuestos (también en la papelera): el texto dice
  «N unidades siguen en ella» (el término ya está en el módulo), con «más de 50» en el tope.
- **Crear no es idempotente por id.** `fase_crear` no devuelve «repetido» como los tipos de documento: repetir el id del intento da `23505` con el
  texto «Esa fase ya existe.» (`hint = id`, que no es un campo del formulario). La interfaz (5.04-2) usa un id nuevo por apertura del modal y, si el
  intento se repite tras un corte, relee la lista antes de reintentar.
- **Revalidación.** Cada escritura revalida `RUTAS.configuracionDeFlujos` y `RUTAS.vehiculos` (`'layout'`): `vehiculos` lee `leerFasesDeOrigen`.
  Lo hace la action, no el repositorio.
- **Tipos de `database.types.ts`.** `fase_mover` y `fase_crear` no admiten nulo en `p_despues_de`; se castea en el repositorio (nulo = primera), igual
  que el 5.09.
- **Prueba contra la base (D11 del 5.09, opcional recomendada): hecha.** `reglas-de-fase-contra-la-base.test.ts` corre `_fase_validar()` real en PGlite
  (tabla mínima + `flujo_regla_activa` de tabla) sobre 26 casos y exige el mismo campo en el `hint` y el mismo texto que `validarFase()`. Sólo
  `_fase_validar`: `_fase_forma` (la forma) y `_fase_unico` los prueba `supabase/tests/areas/flujos/fases*.sql`.
- **Paleta de color (D7):** `Azul #465fff`, `Violeta #7a5af8`, `Cobre #c7680a`, `Turquesa #0e7490`, `Rojo #f04438`, `Naranja #f79009`, `Verde #027a48`,
  `Gris #717c93` (el neutro de `fase_crear`). Los nombres son de esta pantalla, no de la base.

<!-- paso:5.04-2 -->

## 2026-11-11 — 5.04-2: la lista de fases

Las decisiones D1 a D17 del plan (`.piloto/planes/5.04.md`) siguen en pie; esta parte cumple D1, D3, D4, D5, D13, D14 y D16. Lo que cambió o se precisó:

- **Sin segunda planificación.** El plan del 5.04 ya traía `Precondiciones` y `Conducta` de las tres partes; la 5.04-2 salió de ahí, sin otra pasada del planificador.
- **El estado de cada escritura vive en su componente.** `accionesDeFila` y `accionesDeLaLista` son huecos separados que sólo comparten la URL: cada uno lleva su
  `useListaDeFases()` (una escritura a la vez por componente) y el foco tras mover lo guarda la fila (`useFocoTrasMover` con la firma del orden).
- **D4 afinada · una jubilada no abre «Jubilar o eliminar» por URL:** `motivoParaNoQuitarFase` dice «Esa fase ya está jubilada: reactívala si la quieres usar.» y la URL se
  limpia; en el «⋯» una jubilada sólo ofrece Editar y Reactivar.
- **Conflicto (`PT409`):** va al aviso de arriba del flujo (`avisarConflicto`); en el modal de «Nueva fase», al aviso del propio modal con «Recargar», que se va cuando llega
  la versión nueva. Lo escrito queda.
- **Crear con un corte de red:** igual que el 5.09, lo escrito queda y sale solo al volver la conexión con el mismo id de intento. Si el servidor ya la había creado, la
  base contesta «Esa fase ya existe.» y la persona ve la lista releída (queda anotado: la base no es idempotente por id).
- **Reactivar** no ofrece «Deshacer» (C5): avisa «Fase «X» reactivada.»; si una regla del flujo lo impide, el `23514` se dice tal cual.
- **El e2e nuevo ya existe** (`e2e/configuracion-flujos-fases.spec.ts`, parte 1 del recorrido): la 5.04-3 lo completa con el inspector, el portal y la jubilación con historial.

<!-- paso:5.04-3 -->

## 2026-11-11 — 5.04-3: el inspector › Datos

D1 a D17 del plan padre (`.piloto/planes/5.04.md`) quedan cumplidas con esta parte. Lo que se decidió o se precisó aquí (`.piloto/planes/5.04-3.md`, D18 a D25):

- **D18 · Un solo bloque «Datos» con cinco `<Bloque>`s adentro** (Identidad abierto, el resto plegado; uno con un error se fuerza abierto). No se tocó `inspector-de-fase.tsx` más allá de D17: sin hueco, sigue la lectura.
- **D19 · Sin `diferido()` propio:** el inspector ya se pide al abrirse y el formulario viaja en su chunk. `presupuesto-js` no se corrió (el CI lo marca si pasa).
- **D20 · Una jubilada se edita** (la base lo acepta) y arriba dice que no es destino de ningún cambio.
- **D21 · Con errores locales no se llama a la base** (`validarFase`); el error de la base con su `hint` se pinta igual. Foco al primer campo con error en orden visual; el foco de un interruptor va a su botón (la tarjeta lleva el `id` y se busca el primer control adentro).
- **D22 · Tras guardar** el panel queda abierto con «Fase «X» guardada.»; el formulario se reinicia con `key` (`fase.id` + versión). Entre el envío y la llegada, todo apagado a mano.
- **D23 · El motivo del interruptor apagado va en su ayuda** (`<InterruptorConMotivo>`); «Es inicial» avisa, sin bloquear, si otra fase activa ya lo es.
- **D24 · «Llegada de repuestos»** en los dos ámbitos; su ayuda dice que sólo una fase por flujo puede contarla.
- **D25 · «Nombre para el cliente»** es obligatorio con «Visible en el portal» encendido y no se borra al apagarlo.
- **Pie del formulario con `<PieDelPanel>`** (no un pie propio): toma la salida del `<Drawer>` por contexto, así un aviso que sale de la pantalla con cambios sin guardar pregunta en el mismo pie. «Cancelar» vuelve a lo guardado y tira el borrador.
- **Se agregó `campo-de-texto-largo.tsx`** (etiqueta, ayuda y error sobre `<Textarea>`): `Campo` sólo cubre una línea y la descripción se usa dos veces. `use-valores-de-fase.ts` sí se partió del hook (el lint pide ≤ 80 líneas por función).
- **El e2e:** la siembra del historial va por SQL (`historial_fases`), como la prueba `fases-eliminar.sql`; el spec quita lo sembrado también al empezar, porque una corrida caída lo dejaba y frenaba el borrado del origen.

<!-- paso:5.06-1 -->

## 2026-11-11 — Paso 5.06-1

- **D1 · Una sola sección:** «Quién puede mover a esta fase» arriba (sólo lectura en la parte 1) y la lista de salidas debajo.
- **D2 · «Salida de una fase»** entra al glosario; en código sigue `transicion`.
- **D3 · El hueco `bloques.salidas` recibe `roles`** y el inspector los pasa: `flujos` no importa `equipo`. Con el hueco lleno ya no se dibuja `LecturaDeSalidas`.
- **D4 · Alta en línea con estado local;** sólo quitar vive en la URL (`?eliminar=salida&salida=<id>`). Reversible si la persona prefiere URL.
- **D5 · Destinos:** fases activas, distintas de la propia y que aún no son salida; sin ninguna, el botón se apaga con su motivo.
- **D6 · Acción vacía = «Mover»** (la base la guarda nula); máximo 40 caracteres.
- **D7 · Chips:** uno por salida en la fila, hasta 3 y «+N más»; texto con el color de la fase destino, no enlaces.
- **D9 · «Entradas»:** sólo lectura.
- **D10 · El id del intento se reutiliza al reintentar;** «ya existe» sobre el campo `id` se toma por hecho (sobre `a_fase_id` es un error de destino repetido y va junto a su campo).
- **Constantes de la URL de quitar** en `entities/transiciones/vista-de-salidas.ts`: `confirmar-con-url.test.ts` pidió sólo que el hook que abre nombre `PANEL_ELIMINAR_SALIDA` (lo hace por su `import`), no hizo falta declararla dentro.
- **Clave `eliminar` compartida** con requisitos y agenda: conviven (cada hook abre con su valor); el e2e recorre quitar una salida con el inspector abierto y pasa.

<!-- paso:5.06-2 -->

## 2026-11-11 — Paso 5.06-2

- **D11 · Un solo botón «Guardar» en la salida:** manda lo que cambió en dos pedidos seguidos (acción y nota, luego roles), el segundo con la versión del primero. Reversible a dos botones sin tocar las RPC.
- **D12 · «Acción» y «Pide nota al mover» se factorizan** de la forma de alta a `campos-de-salida.tsx`; el alta no cambia de conducta.
- **D13 · Lo nuevo cuelga de `useSalidasDeLaFase`** (`editar`, `ponerRolesDeFase`): una sola escritura a la vez en todo el bloque; la fase y las salidas no se pisan la versión.
- **D14 · `alternarRol(actuales, rolId, marcado)`** y no `(actuales, visibles, marcado)`: tocar un solo id ya conserva los que el selector no muestra.
- **D15 · Borrador con `key` por la firma de lo guardado** en el selector de la fase; en la salida, la forma nace al abrir «Editar» y no se reinicia mientras está abierta.
- **D16 · Estado local, no URL,** para editar; sólo quitar vive en la URL.
- **D17 · El e2e edita «Comprar»**, no «Embarcar» (el primer test ya la quitó).
- **D18 · Sin roles que elegir:** «No hay roles para elegir.»; guardar sigue permitido (lista vacía = quita la lista).
- **D19 · Una forma a la vez:** abrir «Editar» apaga «Agregar salida» y los demás «Editar» (y al revés) en vez de cerrar lo escrito sin avisar.
- **Sin avisos de precedencia:** limitar a un rol que quien configura no tiene, o dejar a nadie con el permiso, no avisa; eso es del 5.12 «Revisar».

<!-- paso:5.07-1 -->

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

<!-- paso:5.07-2 -->

## 2026-11-11 — Paso 5.07-2

- **Cierra el 5.07** (parte 2 de 2, la lectura). Plan: `.piloto/planes/5.07-2.md`; D1–D10 en `docs/pasos/5.07-1/decisiones.md`.
- **D11 · El `for share` vuelve a `fase_requisito_validar()`.** El 5.03 la recreó leyendo los formatos del tipo `for share`; la parte 1 la recreó desde la base en
  una migración posterior y lo perdió al unirse con `main`. Una migración nueva (`requisitos_validar_con_candado`) la recrea desde la vigente con ese único
  cambio, y una prueba de definición (R16) lo fija, porque el 5.03 no dejó carrera.
- **D12 · R11–R15 van en `supabase/tests/areas/flujos/requisitos-lectura.sql`**, no en `requisitos.sql` (que pasaría de 300 líneas).
- **D13 · `flujo_fuera_de_regla` mira también las fases jubiladas** con requisitos bloqueantes: quien sigue ahí sigue fuera de regla (mostrar de más es
  reversible; esconder, no).
- **D14 · A lo sumo 1.000 unidades por fase, sin orden**, tomadas una vez en un arreglo: ordenar leería la fase entera. Con más, es una muestra; `revisadas` lo dice.
- **D15 · GLOSARIO y RENDIMIENTO se editan en el PR del carril:** el paso 8 del piloto sólo veda ESTADO, PLAN, BITACORA y DECISIONES.
- **D16 · Las filas de `docs/PLAN.md` que nombran `fuera_de_regla` (751, 757, 1063) no se tocan** (carril con coordinador): van «Para el coordinador».
- **D17 · Un requisito o un flujo que no existe da `PT409` antes que el permiso**, como `requisito_guardar`: el id no dice nada que la lectura de
  `fases_requisitos` no diga ya.

<!-- paso:5.08-1 -->

## 2026-11-11 — Paso 5.08: «Requisitos para entrar» (decisiones de la parte 1)

- **D1 · Clave con regla apagada:** se ofrece con la nota «La regla «X» está apagada: nadie podrá cumplirlo.» y no se bloquea (la base la acepta). Los nombres de
  regla (`transporte`, `aduana`, `pagos`) salen del prefijo de la clave; confirmados contra `flujos_reglas_regla_check`.
- **D2 · El selector excluye las claves que la fase ya pide:** la base permite repetirlas, pero no tiene sentido; si ya las pide todas, «Agregar requisito» queda
  apagado con su motivo.
- **D3 · Los nombres que el bloque necesita se leen por una Server Action de lectura**, una vez por flujo y guardados un minuto: el hueco `bloques.requisitos` es de
  cliente y sólo recibe `{flujo, fase}`, y ampliarlo con datos rompería a 5.04 y 5.06, que lo comparten.
- **D4 · «Agregar requisito» es en línea dentro del bloque** (`?agregar=dato`), no un modal dentro del drawer (`ui.md`). La confirmación de quitar usa
  `?eliminar=requisito&quitar=<id>` para no ocupar `?panel=` ni `?fase=`.
- **D5 · El inspector sigue registrado `sinFormulario`** en `drawers-con-salida.ts`: la guarda no pidió otra cosa. El formulario avisa los cambios sin guardar con
  `useCambiosSinGuardar({ preguntaAlCerrar: true })`.
- **D6 · `LecturaDeRequisitos` (núcleo) queda arriba como resumen** y el bloque agrega la lista debajo.
- **D7 · Cada action lleva el `ambito` del flujo** para exigir `flujos.configurar` o `repuestos.configurar` antes de la RPC; la base lo vuelve a exigir.
- **D8 · Los tipos de documento se leen en `infra/requisitos/opciones.ts`, no de `documentos`:** un área no importa otra (`areas-de-flujos.test.ts`).

<!-- paso:5.08-2 -->

## 2026-11-11 — Paso 5.08: «Requisitos para entrar» (decisiones de la parte 2)

- **D1 · Una sola action `crearRequisito` con unión discriminada por `tipo`** (reemplaza `crearRequisitoDeDato`): tres actions iguales serían tres archivos con el mismo
  permiso y el mismo `revalidatePath`. El repositorio pasa a `crear({ id, faseId, actualizadoEnEsperado, tipo, datos })`.
- **D2 · El selector de la forma es en línea**, no un menú desplegable: se alcanza con teclado igual y no abre un segundo menú dentro del drawer.
- **D3 · La edición se abre en el lugar del botón de agregar**, no dentro de la fila: la lista conserva su orden y alto, y el foco vuelve al «⋯» de su fila al cerrar.
- **D4 · La espera ofrece las fases activas del otro flujo**, todas las que se leen (hasta 100 flujos y 1.000 fases; un tope lo dice con `<AvisoDeTope>`); sin filtrar por permiso
  de origen (la base no lo pide: `fases: leer` es de cualquier cuenta con sesión).
- **D5 · El ámbito del flujo viaja a la lectura de opciones** (`{ flujoId, ambito }`): evita releer el encabezado y la caché por flujo sigue igual.
- **D6 · Mínimo y máximo son enteros ≥ 1** (como la base): «Escribe un número entero.» si no lo es; «Pide al menos 1 archivo.» si es menor que 1.
- **D7 · «Sin cambios» se dice en el formulario** («No hay nada que guardar.»), no con un toast, y no llama a la base.
- **D8 · Las formas no guardan borrador en `sessionStorage`:** ninguna pasa de 6 campos (`ui.md`).
- **D9 · La URL del selector es `?agregar=nuevo&forma=…`** (no `?agregar=<forma>`): `usePanelPorUrl` lleva una sola pareja clave-valor por panel y la guarda de la vuelta del
  foco espera una sola entrada por clave; una forma desconocida cae en el selector. El e2e de la parte 1 se ajustó a esa URL.
- **D10 · `TipoParaRequisito` gana `delFlujo`:** con tipos de la empresa y del flujo a la vez, el selector marca los del flujo con « · de este flujo» (el nombre puede repetirse entre grupos).
- **D11 · Un tipo de documento que no se pudo leer** no deja enviar el formulario de documento (sólo «Cancelar») y la edición de un documento sin su tipo no toca los formatos.

<!-- paso:5.08-3 -->

## 2026-11-11 — Paso 5.08 (decisiones de la parte 3)

- **D11 · «Bloqueante» vive sólo en la fila**, no también en «Editar»: dos lugares harían dos caminos de impacto.
- **D12 · La confirmación de impacto es en línea**, no `<Confirmar>`: no destruye nada (se revierte con el mismo interruptor) y no entra en `confirmar-con-url`. Estado local: recargar la descarta.
- **D13 · El impacto se lee por una Server Action de lectura** (`leerImpactoDeRequisito`), como las opciones: el hueco es de cliente y la RPC necesita la sesión.
- **D14 · El aviso de fuera de regla no lleva esqueleto** (`<Suspense fallback={null}>`): lo normal es que no haya nada y un esqueleto saltaría.
- **D15 · Sin caché del conteo:** debe reflejar el último cambio; la RPC ya acota y la pestaña es de configuración.
- **D16 · Repuestos:** el título es «Ítem de repuestos» (no hay lector de títulos de ítems) y no hay «Verlas en el inventario».
- **D17 · El camino al inventario es por fase** (`/vehiculos?origen=&fase=`), porque el filtro del inventario es por fase; `FILTRO_FASE` sale por `vehiculos/index.ts` (una línea aditiva).
- **D18 · `revisadas ≥ 1.000` se avisa en el impacto:** el conteo sale de una muestra y callarlo daría un número que parece exacto.
- **D19 · Si no se pudieron leer los títulos,** el panel lo dice con un aviso y rotula «Vehículo» (no «Un vehículo que no puedes ver»: sería mentir sobre el permiso).
- **D20 · Una fase jubilada se rotula « (jubilada)»** en el panel: la RPC también mira las jubiladas.
- **D21 · `guardarRequisito` acepta `bloqueante`** (la RPC ya lo admitía) y el formulario de edición sigue sin escribirlo.

<!-- paso:5.10-1 -->

## 2026-11-11 — Paso 5.10-1

- **El 5.10 se parte en dos:** 5.10-1 (las reglas: uso, impacto, cambiar, sin escritura directa) y 5.10-2 (la oferta de transporte: tabla, `flujo_oferta_guardar`,
  `flujo_oferta`, sin escritura directa, fichas de `logistica` y `flujos`, glosario «Oferta de transporte»). Entero eran 7-8 commits de código y dos disparadores del
  Nivel 2 distintos (4 y 6). Plan: `.piloto/planes/5.10.md` (trae el 5.10-2 servido). `docs/plan.yaml` conserva un solo `5.10`: **este PR no marca `integrado 5.10`**; el
  5.11 espera al 5.10-2.
- **Lo que pidió la auditoría del plan (observaciones), aplicado:** apagar una regla ya apagada no mira el uso (puede haber flujos con «esperas» apagada y requisitos de
  espera vivos, de cuando la base no lo miraba); el `42501` antes que el `22023` del catálogo, con su caso en R1; el trigger trata cambiar `regla` o `flujo_id` de una fila
  encendida como apagarla; la prueba va antes de `vehiculos-visibilidad.sql` en la lista fija.

- D1 · Puertos y navieras no tienen pantalla ni RPC y `navieras` nace vacía: su catálogo queda para la **Fase 6** (es de `logistica`, con `logistica.catalogos.gestionar`), y
  el 5.11 lo dice en su vacío («Todavía no hay navieras cargadas. Se cargan en Logística.»). Es la recomendada de la fila: no mete tablas de otro módulo en la Fase 5.
- D2 · El paso se parte (arriba).
- D3 · Las fases jubiladas también cuentan como uso (como el trigger de antes y D23 del 5.01-2): reactivarlas exigiría la regla.
- D4 · Cada requisito del impacto lleva también `fase_nombre`, además del `{id, fase}` de la fila: la pantalla del 5.11 nombra la fase y enlaza `?fase=` sin otra lectura.
  «Vivos» = todos los de `tipo = 'espera'` de fases del flujo, activas o jubiladas (los requisitos no tienen borrado lógico).
- D5 · El trigger deja pasar el borrado en cascada de un flujo (el flujo ya no está). Es defensa: hoy la FK de `fases` corre antes que la de `flujos_reglas` y borra fases y
  requisitos primero; R8 es la guarda de que la cascada (`origen_eliminar`) sigue pasando, no una prueba de D5 sola.
- D6 · `flujo_regla_impacto` no devuelve versión ni toma candado (como `fase_impacto`). Con la regla ya apagada da `bloquea: false` (apagarla no hace nada) y las listas
  igual, informativas. Listas con tope 50 leyendo 51: la app las corta con `cortarAlTope()`.
- D7 · Encender una regla fuera del catálogo del ámbito → `22023`; apagarla se permite siempre (limpia una fila heredada, p. ej. un `aduana` en repuestos escrito a mano).
- D8 · `flujo_regla_cambiar` mueve la versión siempre, también si la regla ya estaba así (como `fase_mover`, D22 del 5.01-2).
- D9 · El mensaje del `23514` es genérico en la base («la usan fases o requisitos de este flujo», hint `regla`): los nombres humanos de las reglas viven en TS (5.11,
  `entities/reglas/catalogo.ts`) y la pantalla nombra fases y requisitos desde el impacto. El `22023` del catálogo tampoco nombra el ámbito («no está disponible en este flujo»).
- D10 · La prueba va en la lista fija (`supabase/tests/flujos-reglas.sql`), como pide la fila, y no en `areas/flujos/` (el carril a es base y edita la lista). Sus ayudantes usan
  el prefijo `flr_`: `fr_` ya lo usa `areas/flujos/fases-reactivar.sql` y la corrida es una sola sesión de PGlite.
- D11 · Queda una carrera hasta el 5.07, que no es regresión: `fases_requisitos` todavía se escribe directo, y su trigger lee la regla «esperas» sin tomar el flujo. Así,
  apagar «esperas» con `flujo_regla_cambiar`, que toma `flujos` `for no key update`, a la vez que otra persona crea un requisito de espera puede dejar la regla apagada con un
  requisito vivo. Ese estado ya se admite (una regla ya apagada no bloquea, R4). Se cierra cuando el 5.07 pase los requisitos por RPC con `_flujo_para_editar`.

<!-- paso:5.10-2 -->

## 2026-11-11 — Paso 5.10-2

- **Este PR marca `integrado 5.10`:** el 5.10-2 (la oferta de transporte) cierra el paso que el 5.10-1 dejó partido; el 5.11 queda libre. Plan:
  `.piloto/planes/5.10-2.md`. La auditoría del plan dio observaciones y quedaron aplicadas en el texto: O2 prueba que la validación no escribe (la atomicidad la da
  la transacción), la ficha de `logistica` dice que la leerá en la Fase 6, D1 nombra el aviso INFO y `flujo_oferta` dice de dónde sale su tope.

- D1 · La oferta queda sin PK, como pide la fila: la unicidad la dan los dos únicos parciales; sin `id` sustituto (nadie apunta a sus filas y el reemplazo es por
  flujo). El aviso INFO `no_primary_key` de `scripts/splinter.sql` sobre esta tabla es esperado: no se «arregla» con una PK sustituta.
- D2 · Un btree `(flujo_id)` además de los parciales: la FK `flujo_id` y el `delete` del reemplazo perdían el índice que les daba la PK.
- D3 · Tope de 200 ids por lista (`22023` con el nombre del arreglo en el hint): el selector nunca pasa de decenas; corta un pedido desmedido.
- D4 · Un id inexistente → `23503` con mensaje humano, comprobado antes de escribir; uno inactivo se acepta (la oferta «nunca invalida lo guardado»; la pantalla ofrece
  los activos y muestra el inactivo con su marca).
- D5 · Guardar exige «transporte» encendida (`23514`, hint `transporte`); apagarla después no borra la oferta (al volver a encenderla reaparece). `flujo_oferta` la lee
  siempre y dice `transporte`.
- D6 · `flujo_oferta` es `security invoker`, sin versión ni candado, y no exige permiso de configurar: todo lo que lee es «leer = true» y la usará Logística en la Fase 6.
- D7 · Orden de lectura: puertos por `(orden, nombre, id)`, navieras por `(nombre, id)`.
- D8 · `flujo_oferta_guardar` mueve la versión siempre, también sin cambio (como D8 del 5.10-1).
- D9 · La prueba va en su propio `supabase/tests/flujos-oferta.sql` (`flujos-reglas.sql` ya tiene 300 líneas; la fila decía ese archivo), en la lista fija justo detrás,
  con prefijo `flo_`. O7 es el caso con usuario simulado que pide `migraciones.md`, sin caso nuevo en `humo.sql` (como R7 del 5.10-1).
- D10 · La tabla, `flujo_oferta_guardar` y `flujo_oferta` van en un solo commit: los tipos regenerados traen las dos columnas nulables y las dos RPC juntas, y la regla
  pide migración y `db:types` en el mismo commit.

<!-- paso:5.12-1 -->

# Paso 5.12-1 — «Revisar», la base de `revisar_flujo()`

5.12-1 es parcial: el PR no marca `integrado 5.12`; la pantalla (la franja) sigue en 5.12-2.

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas: la duda del PLAN, con su recomendada. El plan: `.piloto/planes/5.12-1.md`.

- **D1** «Revisar» no frena: avisa y enlaza, nunca impide guardar (un flujo se arma por pasos y a medio armar siempre tiene avisos).
- **D2** Quien no configura el flujo recibe cero filas, no `42501` (lo pide el assert de la fila; además sólo quien configura ve la franja). Un flujo
  inexistente o nulo, también cero filas.
- **D3** `rol_sin_personas` sólo cuando **ninguno** de los roles de la lista tiene persona activa: un rol vacío al lado de uno con gente no impide mover.
  No replica la precedencia de `_puede_mover`: la lista de la fase cuenta aunque cada entrada tenga la suya, y no mira `flujos.mover.cualquiera` (un aviso
  de más ahí es tolerable: es sólo un aviso).
- **D4** `sin_salida` e `inalcanzable` no cambian: una fase cuya única salida va a una jubilada recibe `salida_a_jubilada` y no además `sin_salida`.
- **D5** Persona activa = `perfiles.activo and not perfiles.bloqueado`, la misma de la dominancia de equipo. No se usa `_estado_de_persona(…)` a propósito:
  ése separa «invitada» de «activa», y aquí una invitación sin aceptar cuenta como persona (menos avisos falsos; reversible).
- **D6** `entrada_no_automatica` sólo en flujos de vehículos (espejo de `_vehiculo_fase_de_entrada`, que sólo existe para vehículos). Con una sola inicial,
  cualquier requisito bloqueante cuenta (sin un vehículo no se puede evaluar si se cumple): por eso es `info` y dice «pueden nacer».
- **D7** La salida no promete orden (lo ordena `entities/revisar/avisos.ts` en la 5.12-2); los textos de los ocho códigos de antes no cambian.

<!-- paso:5.12-2 -->

# Paso 5.12-2 — «Revisar», la franja sobre el flujo

5.12-2 cierra el paso 5.12: el PR marca `integrado 5.12`.

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/5.12-2.md`.

- **D1** El resumen cuenta errores y avisos; las de información no entran («Todo en orden» con sólo información, que se ve al abrir). No alarma por lo que
  no es un problema; reversible.
- **D2** La franja nace cerrada **siempre**, también con un error (cambia lo que proponía la 5.12-1): todo flujo recién creado tiene `sin_inicial` y la
  franja abierta empujaría la lista en cada visita; el resumen ya dice «1 error» con su icono. Reversible.
- **D3** La palabra del nivel `info` es «Información», no «Sugerencia» (cambia la 5.12-1): `entrada_no_automatica` y `sin_bloqueantes` describen, no
  proponen un cambio.
- **D4** Lectura por Server Action desde el hueco de cliente (sólo recibe `{flujo}`), releída por `flujo.version` y conservando lo leído mientras relee;
  sin `memoriaDeLectura` (el resultado cambia con cada guardado).
- **D5** Tope de 200 avisos con `<AvisoDeTope>` (un flujo tiene decenas de fases; `escala.md` › «Lo que se dibuja tiene tope»).
- **D6** Un aviso abre su fase con un botón que llama `useFaseAbierta().abrir()`, no un `<Link>`: suma al historial igual, conserva la query y devuelve el
  foco; un enlace con nombres de fase chocaría con los locators de los specs vecinos.
- **D7** Permiso de la action por ámbito sin origen, como las demás lecturas del módulo; el origen lo decide la base, que da cero filas.
- **D8** Un aviso sin fase (`sin_inicial`, varias iniciales) o con una fase fuera de las leídas va sin botón.
- **D9** La sección de `docs/UX.md` va en el commit de la franja y no en el de docs: la guarda del mapa exige que el título que cita el spec exista en el
  árbol al commitear.

<!-- paso:6.01-4 -->

- **D18 · Logística se enciende en la navegación con su primera pantalla**, no con la cadena (6.03): `disponible` dice si existe la página (`navegacion.test.ts`), y `/logistica` ya existe con el drawer de la unidad.

<!-- paso:6.02-1 -->

## 2026-11-11 — Paso 6.02-1

- **Parte 1 de 3** (la escritura de mover). Plan: `.piloto/planes/6.02.md`; las respuestas a la auditoría, `.piloto/planes/6.02.respuestas.md`.
- **D1 · «Publicar sin mover la versión de la ficha» (duda 1 de la fila) no entra:** toca `vehiculos/features/vitrina`, fuera de este paso de base. Queda
  como abierto **6-2** (`vitrina_actualizado_en`), como dice la propia duda.
- **D2 · `for no key update` y no `for update`:** serializa a dos que mueven la misma unidad y no frena el `key share` de las FK de quien inserta hijos del
  vehículo (documentos, notas, transportes) mientras se mueve; `fase_id` y `fase_desde` no son clave de nadie. El acceso va antes del candado (como
  `_flujo_para_editar` del 5.01): quien no ve la unidad recibe 42501 sin esperar.
- **D3 · La esperada nula es estricta:** vale sólo para una unidad sin fase; con fase da PT409. Cierra la deuda aceptada «`cambiar_fase` acepta
  `p_fase_esperada` nulo» en vez de dejarla escrita. Nadie de `src/` llama todavía; `supabase/tests/humo.sql:230` pasa la esperada real.
- **D4 · Inexistente, en la papelera o sin `logistica.ver` (`repuestos.ver` para un ítem) dan un solo texto y 42501 (hint `acceso`)**, el mismo
  «… ya no está disponible: no existe o ya no tienes acceso.» de la interfaz del 6.01; sale de un ayudante, `_unidad_sin_acceso()`, que sólo ejecuta
  `service_role`. El nombre de quien movió (PT409) sólo llega a quien ya pasó el acceso.
- **D5 · El PT409 de mover no dice «Recarga»:** la interfaz ofrece recargar (patrón del 4.20-1).
- **D6 · `flujo_fuera_de_regla` no se ensancha a `logistica.ver`** (punto 4 de la fila): el 5.07 la dejó sólo para quien configura; lo de una unidad lo dará
  `logistica_unidad` (6.02-3). Ensanchar después es reversible; esconder, no.
- **D7 · Un lote mal formado no mueve nada** (22023, hint `p_unidades`): la forma es del llamador, no de una unidad. Un vehículo repetido se rechaza para que
  el resultado tenga una fila por unidad. Los ids se validan con `pg_input_is_valid` antes de convertir.
- **D8 · La vista previa del lote es invocadora:** sólo llama a la `definer` de una unidad, que ya mira el acceso.
- **D9 · Sin `flujos.mover` del origen da 23514 con hint `rol`**, como hasta ahora `_puede_mover`: la fila pide cuatro códigos de rechazo.
- **D10 · Sólo `vehiculos` deja de mover su versión al mover;** `repuestos_items` queda para la Fase 8.
- **D11 · La carrera vive en `supabase/tests/areas/mover/carreras.mjs`** (patrón del 5.01) y no en `scripts/carreras/mover.mjs`; `scripts/carreras.mjs` la
  importa y la llama.
- **D12 · El 6.02 se parte en 3:** 6.02-1 la escritura (Nivel 1), 6.02-2 la cadena (índice, Nivel 2), 6.02-3 la unidad y «dónde está».
- **D13 · «Documentos cargados» = vivos de cualquier estado y sólo frenan enviar a la papelera y la limpieza** (`p_al_enviar`). La purga de lo que ya está en
  la papelera no cambia: junta y encola las rutas de `documentos` a propósito, y frenarla dejaría para siempre a un vehículo ya borrado.
- **D14 · Los docs de esta parte van a `docs/pasos/6.02-1/`** (como 5.07-1 y 5.07-2).
- **D15 · El lote toma `assert_activo()` al principio:** una cuenta bloqueada aborta el lote entero en vez de devolver 200 filas sin código.

<!-- paso:6.02-2 -->

## 2026-11-11 — Paso 6.02-2

- **Parte 2 de 3** (las lecturas de la cadena). Plan: `.piloto/planes/6.02-2.md`; las respuestas a la auditoría (bloqueó una vez: «Sin fase» sin origen),
  `.piloto/planes/6.02-2.respuestas.md`.
- **D1 · `security definer`, no invocadora** (la fila decía `security invoker`): las policies de `transportes` y `documentos` preguntan
  `puede_unidad(…, 'logistica.ver')` por fila; una invocadora que filtra por naviera, contenedor, booking o «por aprobar» pagaría un `puede_vehiculo` por fila
  recorrida, justo lo que la fila prohíbe. La definer resuelve el alcance una vez por origen y lo aplica a `vehiculos` con el predicado de su policy; toda
  consulta empieza por `origen_id = p_origen and eliminado_en is null`. Reversible sin cambiar la firma si las policies de las hijas dejan de ser por fila.
- **D2 · Se borra `vehiculos_origen_fase_idx`:** `vehiculos_cadena_idx (origen_id, fase_id, fase_desde, id)` lo cubre como prefijo con el mismo predicado y
  nadie lo nombra; la FK sigue cubierta por `vehiculos_fase_id_idx`.
- **D3 · Alcance = el menor de `logistica.ver` y `vehiculos.ver` del origen:** es lo que vería la invocadora (la policy de `vehiculos` más la regla de la
  fila). Quien tiene `logistica.ver` todos y `vehiculos.ver` propios ve sólo lo suyo (CA2).
- **D4 · Sin acceso, 42501 hint `acceso`** antes de leer nada, no una cadena vacía: la interfaz distingue «sin permiso» de «origen vacío».
- **D5 · «Sin fase» = `fase_id` nulo, por `id`; `fase_desde` existe si y sólo si hay fase:** lo asegura el check `vehiculos_fase_desde_coherente`, y el
  trigger `trg_0_fase_desde_coherente` completa a quien escribe sólo `fase_id` (los fixtures de las pruebas y `e2e/soporte/inventario-postgrest.ts` lo hacen;
  el check solo los rompería). Sin eso, una fila incoherente desaparecía del tablero sin aviso (auditoría, objeción 4).
- **D6 · Jubiladas y «Sin fase» sólo si traen tarjetas con los filtros aplicados;** las jubiladas al final. Una fase activa sin `es_logistica` no es columna.
- **D7 · Los filtros son de fila sobre el recorrido de la columna** (como la búsqueda del kanban): `q` contiene en título, VIN y lote y es prefijo en
  contenedor y booking, sin el GIN de trigramas (eso es de «dónde está», 6.02-3); `contenedor` y `booking` por igualdad sin mayúsculas; `naviera` por id.
- **D8 · `demorada` = el predicado de `alertas_demora`** (excluye la fase final y pide la regla `alerta_demora`); el filtro `demoradas` es rango del índice
  (`fase_desde < corte`). `demora_dias` de la columna son los días con que alerta (nulo si no alerta).
- **D9 · «Propios» es filtro de fila** con el predicado de la policy, sin rutas por cartera: una columna es una fase de un origen. Medido con Ana (informe).
- **D10 · El registro en `scripts/guardas/paginas-en-la-base.ts` pasa a 6.03:** `paginas.test.ts` cae con una entrada que nadie llama desde `src/`; la
  guarda de la base (`escala.sql`) ya exige `_acotar_pagina(p_tope, 50, 100)` desde esta parte.
- **D11 · `logistica_cadena_columna` lleva `p_origen` primero:** «Sin fase» (`p_fase` nulo) necesita el origen, y el alcance se resuelve sin leer la fase.
- **D12 · Entradas malas:** filtro desconocido o de otro tipo → 22023 hint `filtros`; fase de otro origen o sin `es_logistica` → 22023 hint `p_fase`; cursor
  sin `p_desde` → 22023 hint `cursor`; `q` sin 3 letras o dígitos seguidos se ignora.

<!-- paso:6.02-3 -->

## 2026-11-11 — Paso 6.02-3

- **Parte 3 de 3** (la unidad y «dónde está»; cierra el 6.02). Plan: `.piloto/planes/6.02-3.md`; las respuestas a la auditoría (observaciones),
  `.piloto/planes/6.02-3.respuestas.md`.
- **D1 · `notas_vehiculo_id_idx` se queda:** el nuevo `notas_vehiculo_vivas_idx` es parcial (`where eliminado_en is null`) y no sirve a la FK para las notas
  borradas; borrarlo dejaría la cascada de un vehículo sin índice.
- **D2 · El acceso de `logistica_unidad` es el de la cadena** (`_logistica_alcance` + el «propios» de la policy de `vehiculos`), no un `puede_vehiculo(…,
'logistica.ver')` suelto: el panel y la tarjeta se ven con la misma regla. Inexistente, papelera y sin acceso: un solo texto (D4 de 6.02-1).
- **D3 · «Dónde está» busca sólo en orígenes con la regla `logistica` activa:** elegir un resultado cambia a la pestaña de su origen (6.03), y esas pestañas
  son las de esa regla. Todo origen nuevo la trae activa (`origen_crear_flujo`).
- **D4 · «Fuera de regla» = algún bloqueante sin cumplir en su fase actual** (el criterio de `flujo_fuera_de_regla`); `faltan` lleva sólo esos. Sin fase, nada falta.
- **D5 · `movida` sin la nota:** la nota la muestran «Notas» e «Historial» (6.04) con su paginación; aquí sólo quién y cuándo.
- **D6 · Un texto corto o vacío no es error:** `{unidades: [], hay_mas: false}`; sólo uno de más de 100 caracteres da 22023 hint `p_buscar`.
- **D7 · Sin orígenes visibles, vacío y no 42501:** «dónde está» cruza orígenes; vacío no dice nada de lo que no se ve.
- **D8 · Orden:** el VIN o el lote exactos primero, luego lo más nuevo. Con más de 1.000 coincidencias de título se toman 1.000 cualesquiera; con «propios»,
  el rescate por `vehiculos_creador_idx` trae sólo lo que creó quien busca, no lo de su cartera creado por otra persona (el límite de `buscador_cotizaciones`).
- **D9 · `titulo` tal cual:** el título con el campo principal (6.13) lo compone la interfaz.
- **D10 · «Dónde está» busca por título, VIN y lote,** no por contenedor ni booking (son filtros de la cadena, con igualdad, y sus índices no sirven a un `ilike`).

<!-- paso:6.10-1 -->

## 2026-11-11 — Paso 6.10-1: gastos y pagos en la base

- **D1 · El tipo de cambio lo elige quien carga** entre los activos que unen esa moneda con la base. La base guarda el valor de ese momento y el id del tipo
  (`tipo_cambio_id`, para que lo muestre el drawer de 6.11).
- **D2 · Una confirmación no se deshace.** `pago_anular` va al 6.10-2 y, si no cabe, al abierto 6-3.
- **D3 · La «venta» sigue siendo la suma de los pagos confirmados.** `margen_vehiculo` no cambia de contrato.
- **D4 · En la moneda base, un tipo de cambio es un error** (22023) y no se ignora en silencio.
- **D5 · La regla `gastos` (o `pagos`) se exige al registrar y al prorratear**, no al corregir ni al borrar. El flujo es el de la fase; sin fase, el del origen
  (vehículo) o el de repuestos.
- **D6 · Al prorratear, la suma exacta es la del monto.** Cada fila lleva `round(parte × tasa, 2)`, así que en base puede diferir del total convertido en algún
  centavo.
- **D7 · Prorratear reparte en el orden del arreglo**, entre 1 y 200 vehículos, sin repetir, y sólo entre vehículos.
- **D8 · Un reintento nunca duplica ni pisa.** Por id o por lote devuelve lo ya registrado; con otra unidad u otro conjunto da 23505; un id ya borrado da PT409.
- **D9 · `pago_registrar` es sólo de vehículo.** Los pagos de un proyecto de repuestos los suma el paso de repuestos.
- **D10 · Confirmar pide la clave global y además ver el pago** (`logistica.pagos.ver` de la unidad).
- **D11 · El sello y la inmutabilidad viven en triggers**, no sólo en las RPC: ni `service_role` ni una RPC futura editan un pago confirmado.
- **D12 · La versión de gastos y pagos sale de un trigger propio** (`greatest(clock_timestamp(), anterior + 1 µs)`).
- **D13 · `comprobante_ruta` se valida con la forma `<unidad>/<sha-256>.<ext>`**, la que mirarán las policies del 6.10-2.
- **D14 · El tributo exigido se protege con cualquier requisito `aduana.tributos_pagados` de la fase actual**, bloqueante o no.
- **D15 · Las carreras viven en `supabase/tests/areas/dinero/carreras.mjs`** y no en `scripts/carreras/pagos-confirmar.mjs`. `scripts/carreras/` no es del
  carril c; el enganche en `scripts/carreras.mjs` son tres líneas.
- **D16 · El monto de un gasto es ≥ 0** (un reparto puede dejar 0,00). **El de un pago, > 0.**
- **D17 · Los docs van a `docs/pasos/6.10-1/`**, porque el paso se parte.
- **D18 · Las pruebas van en `supabase/tests/areas/dinero/`**, no en `humo.sql`.
- **D19 · Al corregir, la tasa se relee sólo si cambian la moneda o el tipo.** Con sólo el monto, se usa la tasa guardada en el sentido del tipo guardado. Un
  registro viejo en otra moneda y sin `tipo_cambio_id` pide elegir el tipo aun para corregir las notas, y eso lo revalúa. En local no hay ninguno; mirarlo
  antes de cargar datos reales.
- **D20 · Un tipo de cambio sirve en los dos sentidos:** moneda → base multiplica y base → moneda divide. Se guarda el valor tal cual y el sentido sale del tipo
  (`on delete restrict`). Los datos reales son USD → BOB con la base en USD.
- **D21 · Un monto con más de dos decimales es un error.** Se mira antes de asignarlo a la fila, porque numeric(18,2) redondea en silencio.
- **D22 · Un pago confirmado admite `lead_id` → nulo** (la FK al borrar el lead) **y `eliminado_en`**, nada más.

<!-- paso:6.10-2 -->

## 2026-11-11 — Paso 6.10-2: comprobantes, listas, margen y anular un pago

- **D1 · Un comprobante se lee por la fila que lo nombra**, no sólo por la carpeta. Un gasto pide `gastos.ver` de su unidad, un pago `pagos.ver` y una compra
  de repuestos `costos.ver`. Con la carpeta sola, quien ve pagos (el asesor, con «propios») listaría la carpeta del vehículo y bajaría los comprobantes de
  gastos (DECISIONES, 2026-10-13: el inventario no muestra costos). Un prorrateo se lee desde cualquier vehículo del lote, aunque el archivo esté en la
  carpeta del primero.
- **D2 · Un objeto que ninguna fila nombra** (recién subido) lo lee sólo quien puede subir a esa carpeta. Uno de una fila borrada no lo lee nadie por la API
  (lo limpia `storage-gc` por refcount).
- **D3 · La unidad sale del nombre con `_comprobante_unidad`**, como `_cotizacion_de_objeto`: un nombre fuera de `<uuid>/<64 hex>.<ext>` da falso y no 22P02.
- **D4 · `gastos_listar` y `pagos_listar` son de vehículos.** Los de repuestos los lista su paso (Fase 8).
- **D5 · El tamaño es `_acotar_pagina(p_tope, 50, 100) + 1`** (una de más: hay otra página). El registro en `paginas-en-la-base.ts` va en 6.11, con la
  llamada. Con cursor y sin cursor son dos consultas (`escala.md`), para que la condición del cursor quede como condición de índice.
- **D6 · Sin la clave en ningún origen, la lista sale vacía**, como la RLS, y no da 42501.
- **D7 · Las listas no devuelven el lead ni las notas** (el drawer de 6.11 lee la fila). Sí el título del vehículo y el nombre de la categoría: quien ve la
  fila del gasto o del pago ya ve a qué vehículo pertenece y su categoría.
- **D8 · `margen_vehiculo` con un vehículo inexistente o en la papelera da 42501** con el mismo texto que sin la clave; antes devolvía ceros a quien tenía la
  clave en otro origen. `por_categoria` lleva sólo las categorías con gasto vivo, en el orden del catálogo, y suma `real`.
- **D9 · `pago_anular`** usa la clave de confirmar y un motivo de 1 a 500; sólo anula confirmados de vehículo. No deja sin cumplir un requisito
  `pagos.confirmado` o `pagos.umbral_pct` de la fase actual, bloqueante o no. La constancia va a `actividad`, sin columnas nuevas. Mira si se ve el pago
  antes de decir que es de un proyecto. Límite conocido: no cubre la anulación a la vez que un cambio de fase (abierto, como los tributos).
- **D10 · Un pago confirmado y anulado no vuelve**: su `eliminado_en` sólo va de nulo a una fecha (lo dice `pago_sellado`).
- **D11 · Los gastos y pagos viejos sin `tipo_cambio_id` no se migran.** Al corregirlos, la base pide el tipo; en local no hay ninguno y la nube no se toca.
- **D12 · Las pruebas de storage van en `areas/dinero/comprobantes.sql`**, sobre el doble de `storage.objects` de PGlite, y corrieron también contra el
  storage real del Postgres 17 local.

<!-- paso:6.11-1 -->

## 2026-11-11 — Paso 6.11-1: los huecos «Gastos» y «Margen» (parte 1 de 4 del 6.11)

- **D1 · El 6.11 se parte en cuatro** (la fila lo estimaba): 6.11-1 (esta: entities, lecturas, hueco «Gastos», hueco «Margen», e2e tramo 1), 6.11-2 (hueco «Pagos» con confirmar, sello visible y
  anular un confirmado), 6.11-3 (`/logistica/gastos`, `?ver=gastos|pagos`, `ENLACE_DE_DINERO` y el registro de `gastos_listar`/`pagos_listar` en las guardas) y 6.11-4 (prorratear a un grupo y las
  categorías de gasto).
- **D2 · Permisos en el cliente por `mis_permisos`** (`infra/dinero/permisos.client.ts`, 30 s de memoria): un hueco sólo recibe `{ unidad }` y no hay hook de permisos en el cliente. Los botones de
  escribir salen de `puede(permisos, 'logistica.gastos.editar', unidad.origenId)`; mientras llegan o si falla la lectura no hay ninguno. No se tocó el núcleo.
- **D3 · El comprobante tiene su propia subida** (`infra/dinero/comprobante.client.ts`): `subirPorHash` de `shared` sólo admite buckets públicos y un documento no se comprime. Valida tipo
  (pdf, jpeg, png, webp) y peso (≤ 10 MB) antes de subir, no usa `upsert` y «ya existe» cuenta como éxito. Un objeto subido y no guardado lo limpia `storage-gc` (D2 de 6.10-2).
- **D4 · El margen no depende de la regla `gastos` ni `pagos`** (`regla: null`): existe aunque el flujo apague una de las dos. Se dibuja con `logistica.margen.ver` del origen.
- **D5 · La lista de gastos de una unidad es una lectura directa** (`gastos_vehiculo_idx`, tope 50 + 1, más recientes primero), no `gastos_listar`, que no filtra por vehículo (es de 6.11-3).
- **D6 · Eliminar un gasto no ofrece «Deshacer»**: `<Confirmar>` que nombra la categoría y la fecha en el título y muestra el monto con `<Monto>` adentro (el título es texto y con el Modo Live
  encendido un monto escrito ahí se vería). Un `PT409` al eliminar («ya no existe») es éxito suave.
- **D7 · Preselección del tipo de cambio:** uno solo, o el predeterminado si es el primero; si no, lo elige quien carga (D1 de 6.10-1). Con la moneda base no hay campo.
- **D8 · `gasto_registrar` se llama con todos sus parámetros** (`nuloParaLaBase`): no declara valores por omisión y sus tipos generados no admiten nulo. Un cambio de firma sería una migración
  (fuera de este paso).
- **D9 · El e2e va sólo en escritorio** (la fila lo pide); el archivo lo marca con `@sin-celular-archivo`.

<!-- paso:6.11-2 -->

## 2026-11-11 — Paso 6.11-2: el hueco «Pagos» (parte 2 de 4 del 6.11)

- **D1 · Anular va en un `<Drawer>` con motivo** (`?panel=anular-pago&pago=<id>`): el `<Confirmar>` no tiene campo de texto. Motivo de 1 a 500 letras con el error junto al campo; el rechazo general de la
  base (la fase actual pide pagos confirmados, `23514`) se dice dentro del drawer, que no se cierra.
- **D2 · Confirmar y eliminar van con `<Confirmar>` en su URL** (`?panel=confirmar-pago|eliminar-pago&pago=<id>`) que nombra el concepto en el título y muestra el monto con `<Monto>` adentro (con el
  Modo Live un monto escrito en el título se vería). «Confirmar pago» dice «Queda sellado: no se podrá editar. Si te equivocas, se anula con un motivo.» Eliminar no ofrece «Deshacer».
- **D3 · El lead no se elige en esta parte.** El alta manda `p_lead = null` y la edición no toca `lead_id`: el disparador `trg_lead_visible` rechaza con 42501 un lead que quien escribe no ve, y un asesor
  sin acceso al lead vinculado no podría registrar el pago. El margen no depende del lead. **Abierto:** «vincular el pago a un lead» para quien lo pida.
- **D4 · Un confirmado es de sólo lectura:** sin «Editar» ni «Eliminar» aunque quien mira lo pueda todo; ofrece «Ver comprobante» y, con `logistica.pagos.confirmar`, «Anular pago» en `⋯`. Qué botones
  salen lo decide una sola función pura, `accionesDelPago`; la base lo vuelve a exigir.
- **D5 · Quien no puede confirmar no ve el botón** (`logistica.pagos.confirmar` es global). Un conflicto al confirmar («Ana ya lo confirmó hace 2 min»), al eliminar (ya confirmado) o al anular no es un
  error para quien actuaba: se cierra el diálogo, se dice con el mensaje de la base y se vuelve a leer.
- **D6 · Sello:** «Confirmado por <nombre> el <fecha y hora>» en la zona de la empresa; si `perfiles` no da el nombre (persona dada de baja, lectura caída), «Confirmado por otra persona el …». Los nombres
  se leen en una sola consulta por todos los pagos de la lista.
- **D7 · Monto de un pago: mayor que cero con a lo sumo dos decimales** (D16 de 6.10-1); el de un gasto sigue siendo ≥ 0. La lectura del texto tipeado se extrajo a `entities/dinero/monto-tipeado.ts` y
  la usan los dos formularios.
- **D8 · Tipo de cambio:** igual que el gasto (lo elige quien carga; con la moneda base no hay campo). El equivalente en base lo devuelve la base: nunca se calcula en el navegador.
- **D9 · Se reutiliza lo de 6.11-1** (`campo-de-comprobante`, `use-comprobante`, `useOpcionesDeGasto`, las memorias de lectura); «Ver comprobante» salió a `components/ver-comprobante.ts` para las dos
  filas. El rechazo de la base por campo (`falloDeLaBase`) pasó a `infra/dinero/rpc.ts` y lo comparten gastos y pagos.
- **D10 · La lista de pagos de una unidad es una lectura directa** (`pagos_vehiculo_idx`, tope 50 + 1, más recientes primero), no `pagos_listar` (de 6.11-3).
- **D11 · El e2e no sube comprobante ni anula:** lo de anular lo cubren vitest y las pruebas SQL de 6.10; el e2e registra, confirma con otra cuenta y mira el margen. Los tres diálogos de URL declaran su
  `usePanelPorUrl` en su propio archivo (lo exige `confirmar-con-url.test.ts`) y comparten la revisión de `usePagoPorUrl`.

<!-- paso:6.11-3 -->

## 2026-11-11 — Paso 6.11-3: `/logistica/gastos` (parte 3 de 4 del 6.11)

- **D1 · El cursor de `(fecha, id)` viaja como instante** `<fecha>T00:00:00Z` para pasar `leerCursor()` (que sólo acepta instantes completos); la infra manda a la base sólo la fecha. No se tocó `src/shared`.
- **D2 · Sin «Anterior».** Las dos RPC sólo caminan hacia adelante (`(fecha, id) < cursor`). Hay «Siguiente», «Volver a los más recientes» y el «atrás» del navegador; `anterior` es siempre nulo. Sin migración.
- **D3 · La fila abre el panel de la unidad de `/logistica`** (`?vehiculo=`, el mismo `DrawerDeLaUnidad` y `UnidadAbierta`): la página los importa de `src/app`, y pasa la clave al componente del módulo como prop. Abrir suma al historial con la vuelta del foco.
- **D4 · La lista de pagos no nombra a quien confirmó:** `pagos_listar` no lo trae y leer `perfiles` por fila sería N+1. Dice «Confirmado» con «el <fecha>»; el nombre está en el sello del panel de la unidad.
- **D5 · Cambiar de vista («Gastos» ↔ «Pagos») limpia filtros y página:** no son los mismos filtros.
- **D6 · Ninguna suma ni total en la lista.** Cada monto es el de su fila y el equivalente es el `monto_base` que guardó la base; el total de una unidad es su margen.
- **D7 · Sin «Ver comprobante» ni acciones por fila:** abrir la unidad es el camino a corregir, eliminar, confirmar o anular (los diálogos viven en un solo lugar).
- **D8 · La lista no se refresca mientras el panel está abierto;** al cerrarlo, la página se vuelve a pedir (`shallow: false`).
- **D9 · Página fija de `TAMANO_DE_PAGINA_POR_DEFECTO`** (50), sin `?por=`: así lo registra la guarda de tamaño de página.
- **D10 · El enlace «Gastos» pide `logistica.gastos.ver`** (un enlace lleva un solo permiso). Quien sólo ve pagos entra por «Ver todos en Gastos» del hueco «Pagos» o por la URL; la página atiende cualquiera de las dos claves.
- **D11 · `?ver=` o un filtro inválido se descartan, nunca dan error.** El pedido manda a cada RPC sólo las claves que acepta (una de más da 22023); lo cubre `entities/dinero/listas.test.ts`.
- **D12 · Limitación aceptada:** la hoja de filtros del celular usa `?panel=filtros`, la misma clave que los drawers de gasto y de pago (abrir uno cierra el otro). La hoja se cierra al tocar una fila.
- **D13 · Sin filtro por vehículo ni por proveedor:** la base no los tiene (sería una migración). Abierto para quien lo pida.
- **D14 · La prueba de huecos de la unidad** (`huecos-de-la-unidad.test.tsx`) afirmaba que ninguna área declaraba huecos y estaba en rojo desde 6.11-1: ahora afirma que sin permisos no se dibuja ninguno.

<!-- paso:6.11-4 -->

## 2026-11-11 — Paso 6.11-4: prorratear y categorías de gasto (parte 4 de 4, cierra el 6.11)

- **D1 · Partes iguales**, como la base en 6.10. Por valor del vehículo u otro criterio es el abierto **6-6** (base e interfaz).
- **D2 · El prorrateo no tiene e2e de pantalla:** ninguna página de grupo monta `HUECOS_DE_DINERO_EN_EL_GRUPO` (6.08 y 6.09 no están integradas). Se cubre con vitest de entidad (los números de la base), de esquema y de componente; el e2e de esta parte es el de las categorías. Quien monte la página de grupo añade su recorrido.
- **D3 · `id` de embarque = booking; de contenedor = número** (no hay otra definición hoy: `pantallas/transporte-*.ts` siguen vacíos). El hueco lee sus unidades con `.limit(201)`; con más de 200 avisa y no deja repartir (no se parte en lotes).
- **D4 · Sin comprobante en el prorrateo:** cargarlo una vez y repetirlo en N filas rompe «borrar por refcount» sin ganar nada; se adjunta desde cada unidad.
- **D5 · La vista previa nunca muestra un equivalente ni un total en base:** muestra cada parte en la moneda del gasto, la suma de las partes (el monto tipeado) y dice que el equivalente lo calcula la base al confirmar.
- **D6 · Categoría en uso:** la lista no cuenta usos por fila; «Eliminar» se ofrece siempre y, si la base responde 23503, el diálogo dice que se desactive. Una categoría con propósito `tributos` no cambia de propósito en la interfaz (Aduana la lee); la base no lo impide.
- **D7 · Orden = un número 0–32767 del modal**, no botones: intercambiar dos serían dos escrituras sin transacción. La lista usa `ListaDeCatalogo` con `icono: null` y los botones de orden apagados con el motivo.
- **D8 · Propósito = un select con los seis del `check` de la base** más «Sin propósito»; sus nombres salen de una tabla en `entities/dinero/categoria.ts` con un test que la ata a esa lista.
- **D9 · Escritura directa por Server Action** con el cliente de quien pide; el límite es la RLS (`logistica.catalogos.gestionar`). Una escritura que la RLS deja en cero filas se dice «No tienes permiso…», nunca éxito.
- **D10 · El `lote` del prorrateo** se conserva si la respuesta se perdió (`inesperado`) o no hubo red y se renueva al cambiar lo escrito, al rechazar la base (no escribió nada) y tras un éxito; un reintento devuelve `ya_existia` y se trata como éxito.
- **D11 · El catálogo llena la sección «Logística» del hub:** `secciones.test.ts` pasa a ocho y `catalogos.test.ts` y el e2e de Configuración › Logística dejan de afirmar «no hay nada que configurar».

<!-- paso:7.01-1 -->

## 2026-11-11 — Paso 7.01-1: notificaciones, la base (la puerta, la lista, realtime y los jobs)

- **D1 · Las preferencias no apagan la campana** (la recomendada de la fila): la puerta mira sólo baja y bloqueo; la campana es el registro y las preferencias
  gobiernan sólo el push (7.03). Así no cambian las filas que insertan otras fases.
- **D2 · La limpieza avisa al creador del vehículo, 3 días antes** (la recomendada de la fila; se hace en la 7.01-2): es quien tiene «Conservar».
- **D3 · `actividad_purgar()` no se programa** (la recomendada de la fila): borra auditoría y es de la Fase 9. Esta fase purga lo suyo con
  `notificaciones_purgar()`; que las dos borren lo mismo cuando la Fase 9 la programe no hace daño.
- **D4 · Cambiar la hora de un recordatorio reemplaza su aviso abierto:** antes de avisar, `recordatorios_notificar()` borra la notificación del mismo
  recordatorio que sigue sin accionar. Si quedara, el antispam se tragaría el aviso nuevo y `notificado_en` quedaría sellado sin aviso. Se puede revertir
  cambiándolo por sellar `accionada_en`.
- **D5 · Un recordatorio eliminado se sella sin avisar:** si sólo se filtrara, quedaría al frente de `recordatorios_pendientes_idx` y cada corrida lo volvería a
  recorrer. Conducta aceptada (auditoría del plan, obs. 4): uno borrado antes de su hora y restaurado después no avisa (`recordatorio_restaurar` no vuelve
  `notificado_en` a nulo); la agenda igual lo muestra «Vencido».
- **D6 · La publicación de Realtime tiene su doble en PGlite** (el preámbulo de `scripts/probar-schema.mjs` la crea vacía) en vez de quitar la línea de la
  migración: así `db:probar` mira el catálogo de verdad. No hizo falta el plan B.
- **D7 · `notificaciones_por_accionar_idx` lleva las columnas de la lista** (`usuario_id, creado_en desc, id desc`): «primero las que piden acción» de 7.02 corre
  el mismo cursor sobre el parcial.
- **D8 · Sin índice nuevo para la purga:** el `limit` corta el recorrido al llenar el lote, lo viejo está al principio y corre una vez al día. Un índice por
  `visto_en` pagaría una escritura en cada visita.
- **D9 · Un destinatario sin perfil también se descarta en silencio** (antes caía por la FK): una notificación nunca hace fallar la operación que avisa.
- **D10 · `recordatorios_notificar()` entra al inventario de la cartera de `humo.sql`:** lee la fila vigente de `leads_asesores` del dueño del recordatorio
  sólo para elegir la `ruta` de su propio aviso; a quien está de baja no le llega nada (la puerta).
- **D11 · Sin prueba de carrera para el job:** dos corridas solapadas se reparten las filas con `skip locked` y el antispam frena lo que quede; no hay candado
  de numeración ni de dinero.
- **D12 · Realtime no aplica RLS a los `DELETE`** (llegan a todo suscriptor con la PK): este paso borra en D4 y en la purga diaria. 7.02 se suscribe sólo a
  `INSERT` y `UPDATE` con filtro `usuario_id=eq.<yo>` y nunca reacciona a `DELETE` (auditoría del plan, obs. 2). Va en la ficha de `notificaciones`. Realtime
  igual decodifica cada `DELETE` de la purga (hasta 50.000 por noche): 7.02 apunta ese costo en `docs/RENDIMIENTO.md` al escribir la fila de la campana.
- **D13 · El 7.01 se parte en dos sesiones:** 7.01-1 (esta) y 7.01-2 (los avisos al compartir, transferir y limpiar, con `avisos-de-cartera.sql`). Juntas
  pasaban de 6 commits de código, y la 7.01-2 tiene que decidir la marca de «ya avisado» de la limpieza, el choque con el antispam al volver a compartir y en
  qué job corre.

<!-- paso:7.01-2 -->

## 2026-11-11 — Paso 7.01-2: los avisos de cartera y de limpieza

- **D1 · Ningún aviso nombra al lead** (ni teléfono, ni número, ni nombre): un lead puede llamarse como su teléfono (alta desde un mensaje), el texto viaja
  por Realtime y el aviso queda después de que le quiten el acceso. Dice «<quien> te compartió/transfirió un lead» y se abre por la `ruta` (`/leads/<id>`).
  Sumar el nombre es una línea.
- **D2 · La limpieza avisa al creador del vehículo, 3 días antes:** ya anotada en la 7.01-1 (la recomendada de la fila).
- **D3 · Repetir reemplaza el aviso abierto:** volver a compartir tras quitar el acceso, o transferir A→B→A→B, borra el aviso sin accionar de antes y deja
  uno nuevo (si no, el antispam se lo tragaría). Como estos avisos no piden acción y 7.02 marca leída al abrir, `accionada_en` casi siempre queda nulo:
  en la práctica se borra también el anterior ya leído, y lo reemplaza uno igual y más nuevo. Se acepta (sellar `accionada_en` dejaría dos iguales).
- **D4 · La marca de «ya avisado» de la limpieza es una tabla propia** (`limpieza_avisos`): una columna en `vehiculos` movería `actualizado_en` (PT409 a quien
  tiene la ficha abierta) y escribiría en `actividad`; un `exists` sobre `notificaciones` se pierde cuando la persona borra el aviso o lo purga la purga.
- **D5 · Una vez por vehículo, para siempre:** ni quitar «Conservar» ni restaurar de la papelera vuelven a avisar. Límite conocido; la marca guarda la fecha
  avisada para poder cambiar la regla sin migrar datos.
- **D6 · Sólo avisa al destinatario:** al saliente de una transferencia (queda compartido), a quien transfiere, a quien quita el acceso o a quien sale, no.
- **D7 · `lead_compartido` y `lead_transferido` sin acción** (`requiere_accion = false`): informan; no hay botón que los resuelva.
- **D8 · `limpieza_pronto` con acción:** pide decidir «Conservar». Al accionarse se libera el antispam, pero manda la marca (D4).
- **D9 · No se toca quién puede conservar ni restaurar:** si el creador ya no puede editar el vehículo, igual se le avisa (lo conservador).
- **D10 · La ficha de `vehiculos` no cambia:** el aviso lo documenta la de `notificaciones` y el GLOSARIO.
- **D11 · La ventana se repite en SQL** (`_limpieza_ventana_de_aviso()` = 3), atada a `VENTANA_DE_AVISO_DIAS` por comentarios en los dos lados; la prueba L1
  fija el borde (hoy + 3 avisa, hoy + 4 no).
- **D12 · Un vencido pendiente también avisa, una vez:** su fecha cae en hoy o mañana (`greatest(vence, proxima)`), que es cuando se va.
- **D13 · Job propio y diario** (`limpieza-avisar`, 13:15 UTC, ≈ 09:15 en La Paz): `limpieza_automatica_correr` devuelve temprano (`temprano`, `ya_corrio`) y
  recrearla para avisar era más riesgo.
- **D14 · Un aviso por vehículo, no agrupado por creador** (la fila: «una vez por vehículo»), con tope de 200 por corrida. Agrupar, si resulta ruidoso, es de
  7.02/7.03.
- **D15 · El cuerpo de `limpieza_pronto` no lleva la fecha:** una fecha visible se formatea con `fechas.ts`, no con `to_char` en SQL; la ficha, a la que lleva
  la `ruta`, ya dice «Se limpia el dd/mm». (El plan la ponía en el cuerpo.)
- **D16 · Sin tope de filas revisadas en `limpieza_avisar()`:** cada día recorre, por `vehiculos_limpieza_orden_idx` y con cota superior, los retenidos por
  ancla y los ya avisados (saltados por PK), como la corrida nocturna recorre los retenidos. Límite conocido: si crecen, el arreglo es una cota inferior o
  un índice parcial (sin `limpieza_avisos`).

<!-- paso:7.03-1 -->

## 2026-11-11 — Paso 7.03-1: push web, la base

- **D1 · Un pase y no un secreto compartido** (duda 1 de la fila): la base no guarda secretos. `push_disparar()` crea un pase de un uso (10 min) atado a
  la notificación y lo manda por `pg_net`; la función lo canjea con `push_abrir()`.
- **D2 · El envío va con Web Crypto (RFC 8291/8292) en la 7.03-2** (duda 2): el contrato lo importa Vitest desde Node y un `npm:web-push` no carga ahí.
  Se verifica ese día con `pnpm funciones`.
- **D3 · El push lleva título, cuerpo y `ruta`, nada más** (duda 3): `push_abrir()` no devuelve tipo, ids ni referencia.
- **D4 · Tope de 10 por persona: se borra la menos reciente** en vez de rechazar (quien cambia de navegador no queda trabado; cambiarlo por un 22023 es una
  línea). El candado consultivo del tope no lleva carrera en `scripts/carreras/`: si fallara quedarían 11, sin dinero ni datos ajenos; el canje de un uso
  lo serializa el `update … where usado_en is null`.
- **D5 · `push_desuscribir` no exige el permiso:** quien perdió el rol tiene que poder quitar las suyas; sin el permiso igual no recibe nada.
- **D6 · `push_pases` es tabla propia, no `cola_gc_pases`:** el pase queda atado a su notificación (cascade) y `storage_gc_abrir` no puede quemar uno de push.
- **D7 · Un pase y un pedido por notificación** (`for each row`): la función manda a lo sumo 10 por invocación. Un lote de 200 avisos de un job encola hasta
  200 pedidos `pg_net` si todos tienen push; se acepta (asíncronos tras el commit).
- **D8 · Sin `url_proyecto` el disparo calla** (sin warning): corre por cada notificación y los jobs ya avisan de la falta.
- **D9 · `fallos` sólo cuenta;** se borran sólo las 404/410 (un servicio caído no tira suscripciones buenas). 7.04 puede mostrar `fallos`.
- **D10 · Las pruebas van en `areas/push/push.sql` y `disparo.sql`** (tope de 300 líneas por archivo).
- **D11 · `push_abrir` y `push_resultado` entran en la 7.03-1** (la fila los ponía en la parte 2): son SQL y se prueban con `db:probar`; la 7.03-2 no toca la base.
- **D12 · Sin caso en `humo.sql`** (desvío de `.claude/rules/migraciones.md`): las policies tocadas tienen su prueba de área con usuario simulado (S2, S4).
- **D13 · Dos defensas contra el proxy abierto:** la base valida el endpoint (`_push_endpoint_valido()`: `https`, sin `\`, espacios ni control, host de la
  lista justo tras `https://`), borra al migrar las filas que no pasan (antes cualquiera insertaba la suya) y `push_abrir` sólo devuelve las válidas; el
  adaptador de la 7.03-2 vuelve a validar con `new URL()` y no hace `fetch` si no pasa.
- **D14 · La preferencia de push por tipo es un objeto** (check `preferencias_push_por_tipo`, `not valid` para no frenar la migración por una fila previa).

<!-- paso:7.03-2 -->

## 2026-11-11 — Paso 7.03-2: push web, la función

- **D15 · Web Crypto propio, no `web-push` en Deno** (duda 2 de la fila; confirma D2 de la 7.03-1): `webpush.sendNotification` hace su propio pedido
  `https` de Node y no admite el `fetch` inyectado que pide la fila; la decisión no depende de si `npm:web-push` carga en el runtime. `web-push` y su
  `http_ece` quedan como oráculo de la prueba de contrato (sin instalar nada).
- **D16 · Primero el pase, después las claves:** con `verify_jwt = false` cualquiera puede llamar; si las claves se miraran antes, un anónimo sabría si
  el push está configurado. Que el pase quede usado sin resultado no cuesta nada: `push_abrir` lo limpia al día.
- **D17 · `{ ok: false, error: { codigo: 'sin_claves', mensaje } }` con HTTP 200:** la convención de errores como valores del README y de `storage-gc`.
  La fila decía `{ ok: false, codigo }` de corrido; el código es el mismo y nadie más lo consume (`pg_net` sólo lo guarda). Desvío dicho.
- **D18 · Sólo 404/410 caducan:** 3xx, 400, 403, 413, 429 y 5xx son `fallo`; no se borra una suscripción buena por un error nuestro (un 403 es otra
  clave VAPID).
- **D19 · Carga ≤ 3000 bytes, `TTL` de 24 h, sin `Urgency` ni `Topic`:** lejos del límite de 4096 del registro; un aviso de más de un día ya está en la
  campana. `ruta` viaja sólo si empieza por `/` y no por `//`.
- **D20 · En paralelo, 10 s por suscripción:** ≤ 10 suscripciones en ≤ 10 s, debajo de los 30 s de `pg_net`.
- **D21 · `push` no entra a la guardia de funciones del e2e ni a la lista del CI:** ningún spec la llama y `push_web` nace apagada.
- **D22 · La lista de hosts vive dos veces** (SQL y `enviar.ts`) a propósito: es la segunda defensa contra el proxy abierto.
- **D23 · `redirect: 'manual'`** (auditoría del plan): un 307/308 de un host permitido reenviaría el `POST` con su cuerpo a un host que la lista no
  revisó; todo 3xx es `fallo`.
- **D24 · La prueba de la función va en su archivo** (`push-funcion.test.ts`) y no en `push-contrato.test.ts`: juntas pasaban las 300 líneas.

<!-- paso:7.06-1 -->

## 2026-11-11 — Paso 7.06-1: escribir eventos y tareas por RPC

- **D1 · Un evento puede llevar una cotización:** `eventos.cotizacion_id`, FK `on delete set null`, con índice. Las tareas ya la tenían.
- **D2 · Quién cambia una tarea:**
  - El creador la edita, la elimina y la reasigna (reasignar, con `agenda.tareas.asignar`).
  - El responsable sólo la completa y la reabre.
  - Se aparta de antes, cuando el responsable con `asignar` también reasignaba: sigue la recomendada de la fila.
- **D3 · Una tarea nacida en una conversación** sólo se da o se reasigna a un miembro de esa conversación.
- **D4 · La conversación de la tarea es una columna,** `tareas.conversacion_id`, que fija `tarea_crear` y no cambia. No se deduce de
  `mensajes.tarea_id`: una ficha compartida después en otro chat no amplía quién la ve.
- **D5 · La versión de `eventos` y `tareas` la mueve `agenda_version()`,** con `greatest(clock_timestamp(), anterior + 1 µs)`. Reemplaza a
  `trg_actualizado_en`, que no se movía dos veces en una transacción.
- **D6 · `aplicado_en` de los permisos de agenda no se toca:** vive en `seed.sql` (carril a), y el seed lo pisaría.
- **D7 · El registro de `paginas-en-la-base.ts`** llega con la primera llamada de su RPC (7.07). La guarda falla con una entrada que nadie llama.
- **D8 · Las pruebas con usuario simulado** van en `supabase/tests/areas/agenda/`, no en `humo.sql`.
- **D9 · Un evento puede empezar en el pasado** (para registrar una reunión hecha). Sólo la tarea no vence en el pasado.
- **D10 · Avisos de evento:** `evento_invitacion` no pide acción y quitar a alguien no avisa. Un evento privado o público no lleva destinatarios.
- **D11 · Completar, eliminar o reasignar** accionan la `tarea_asignada` abierta del responsable (al reasignar, la del anterior).
- **D12 · `reasignar_tarea` cambia de firma** a `(p_tarea, p_actualizado_en_esperado, p_responsable)`. La vieja se borra con `drop`, sin dejar sobrecarga.
- **D13 · Las RPC de escritura responden `{resultado, id, actualizado_en}`.** La cotización se comprueba con `puede_cotizacion()`, nunca leyendo `public.cotizaciones`.
- **D14 · Los docs van por parte,** en `docs/pasos/7.06-1/`.
- **D15 · `p_datos` al guardar:**
  - Una clave presente es un cambio, una ausente no toca nada y un nulo quita el valor.
  - Una clave desconocida da 22023 con la clave en el hint.
  - `p_destinatarios` nulo deja la lista como está.
- **D16 · Eliminar un evento público o «seleccionados»** exige `agenda.eventos.publicar`.
- **D17 · Orden en toda RPC que edita:**
  - `assert_activo()`, luego la fila `for update`.
  - Si no la ve, 42501 «No encontramos…». Si no le toca, 42501.
  - Después `sin_cambios`, luego la versión (PT409) y al final el cambio.
  - `reasignar_tarea` pide `asignar` antes de tomar la fila: a una persona bloqueada le llega «No tienes el permiso», y escribir no puede igual.
- **D18 · Publicar también para despublicar:** `evento_guardar` exige `agenda.eventos.publicar` si el evento era o queda público o «seleccionados».
  Es coherente con D16: sin esto, quien perdió el permiso podría volverlo privado y después eliminarlo.
- **D19 · A quien ya estaba no se le revalida:** al guardar, sólo a quien se suma como destinatario se le pide estar activo y sin bloqueo. Una baja
  posterior no impide editar el título.

<!-- paso:7.06-2 -->

## 2026-11-11 — Paso 7.06-2: lecturas de la agenda y visibilidad

- **D20 · Las lecturas de la agenda son de invocador:** `agenda_rango` y `agenda_tareas_sin_fecha` dejan que la RLS de cada tabla decida y «mi agenda»
  es un filtro encima. Así las subastas quedan bajo la RLS de vehículos y ningún error de la función filtra una fila. `agenda_quienes_reciben` es
  definer porque usa ayudantes revocados (`_agenda_puede_recibir`, `_equipo_lista_indexable`, `_equipo_busqueda_patron`).
- **D21 · `eventos: leer` en línea,** con `_agenda_soy_destinatario(id)` definer y de authenticated (la evalúa la policy). `puede_evento` queda para
  `eventos_destinatarios: leer` y `evento_guardar`. E10 y T8 la exceptúan por firma.
- **D22 · «Mi agenda»:** eventos que creé, públicos o donde soy destinatario; tareas de las que soy responsable; mis recordatorios pendientes; las
  subastas que la RLS me deja ver. Con `p_de_todos` (exige `agenda.ver_todo`): todos los eventos y todas las tareas con fecha. Las tareas que di a
  otros no están: si 7.07 las pide, es una ruta más por `(creado_por, vence_en)`.
- **D23 · Cada cosa entra por su fecha** en `[p_desde, p_hasta)`: el evento por su inicio (uno que empezó antes y sigue no aparece), la tarea por su
  vencimiento, el recordatorio por su hora y la subasta por su cierre.
- **D24 · Tope fijo de 200 por clase,** sin parámetro de tamaño; la respuesta trae `tope` y `hay_mas`. El rango es obligatorio, en orden y de hasta 45 días.
- **D25 · `agenda_rango` devuelve sólo lo que dibuja un chip.** El recordatorio va sin lead; ninguna lectura toca `cotizaciones`.
- **D26 · «Sin fecha»:** mis tareas (responsable) vivas, sin fecha y no canceladas (pendientes y completadas), la más nueva primero, cursor
  `(creado_en, id)`, 20 por defecto y 50 como mucho.
- **D27 · `agenda_quienes_reciben` suma `p_conversacion`** a la firma de la fila, para que reasignar una tarea del chat no ofrezca a quien D3
  rechazaría. Pide `agenda.tareas.asignar`, busca como Equipo (nombre o email, ≥ 3 letras o dígitos) y corta en 20.
- **D28 · 7.06-3 entra en esta parte:** `entities/visibilidad.ts` es espejo de la base, nunca la autoridad; D3 y quién puede recibir siguen en la base.
- **D29 · Sin `medir-*.sql`:** `eventos` y `tareas` no son tablas que crecen y el rango acota a 45 días. Las subastas usan el mismo índice por origen y
  tienen el mismo límite con «propios» que ya anotó 4-23 para el panel del vehículo (`medir-panel-cierre-subasta.sql`).
- **D30 · Docs en `docs/pasos/7.06-2/`** (carril con coordinador); la sección «Agenda» de `docs/RENDIMIENTO.md` sí se toca.

<!-- paso:7.07-1 -->

## 2026-11-11 — Paso 7.07-1: el calendario de lectura de `/agenda`

- **D1 · La semana empieza el lunes.** Es lo que se usa en el país de la zona por defecto; es una constante (`PRIMER_DIA_DE_LA_SEMANA`) de `entities/calendario`.
- **D2 · El mes en el celular es una lista por día,** sólo con los días que tienen algo, no la grilla (la recomendada de la fila). Mes y semana comparten `ListaPorDia`.
- **D3 · El celular abre en «día»** por el ancho de la petición (`anchoDeEstaPeticion()` contra `CORTE_DE_LA_TABLA`) y el escritorio en «mes»; `?vista=` manda.
- **D4 · «Hoy» y los cortes de día son los de la zona de la empresa** (`ajustes_empresa.zona_horaria`, `ZONA_POR_DEFECTO` si falla). El rango que se pide a la base se
  arma con `inicioDelDia(primerDía)` y `inicioDelDia(díaSiguiente(últimoDía))`: un día con cambio de horario dura 23 o 25 h (lo prueba el 25 de oct de 2026 en Madrid).
- **D5 · `?de=todos` sin `agenda.ver_todo` se ignora** (la base volvería a exigirlo) y el interruptor «Ver la de todos» no se dibuja: es un filtro de lectura, no una acción.
- **D6 · Colores por clase con tokens existentes:** evento `info`, tarea `positivo`, recordatorio `aviso`, subasta `visitado`; el chip dice su clase con texto.
- **D7 · El error de lectura sube al `error.tsx` de `(app)`** con «Reintentar» (`datosO`), como el resto de las pantallas de lectura.
- **D8 · Calendario propio con CSS grid y `date-fns`/`Intl`:** ninguna librería nueva. El título del rango sale de `Intl` en español; ningún mes escrito en el código.
- **D9 · En esta parte evento, tarea y recordatorio no son enlaces** (sus paneles llegan en 7.07-2 y 7.07-3); sólo la subasta navega, a `/vehiculos/<id>`.
- **D10 · El título es el `<h1>` y las cuatro clases del filtro son botones de alternar con texto** (`aria-pressed`); sin ninguna elegida se vuelve a «todas».
- **D11 · `Agenda` aparece en la barra lateral de todos** (`permisos: null`): `navegacion.test.ts` ahora espera `['inicio', 'agenda']` sin permisos.
- **D12 · El «+N más» de una celda cuenta lo cargado:** si una clase llegó al tope (`hay_mas`), dice «+N+ más» y al pie sale el `AvisoDeTope` con «Ver el día».
- **D13 · Los números de `?ver=` van como un solo `parseAsString`** con la lista separada por comas (no `parseAsArrayOf`: ningún uso existente en el repo); `leerClases` ignora lo desconocido.

<!-- paso:7.07-2 -->

## 2026-11-11 — Paso 7.07-2: los paneles de evento y de tarea de `/agenda`

- **D1 · El selector de destinatarios lee `perfiles` desde el navegador** (`id` y `nombre`, activas y sin bloqueo, desde 3 letras, 21 filas y 20 mostradas): `perfiles: leer`
  lo deja a toda persona activa y la base vuelve a exigir activos y sin bloqueo al guardar. `equipo_lista` no sirve (pide `equipo.usuarios.ver`). Descartada: una RPC nueva.
- **D2 · El responsable de una tarea usa `agenda_quienes_reciben`** y sólo con `agenda.tareas.asignar`; sin él, el texto dice «Será tu tarea.».
- **D3 · Los chips de evento y tarea son enlaces** a `?evento=` / `?tarea=` que conservan `vista`, `fecha`, `ver` y `de` (`entradasDeAgenda(…, rutaDe)`).
- **D4 · Ver y editar comparten la URL:** `?evento=<id>` ve; `&editar=1` cambia el cuerpo (dos `<Drawer>`, el de detalle y el de formulario, ambos registrados). Cerrar vuelve a pedir
  la página sin esas claves (`shallow: false`); entrar y salir de «editar» no pide nada.
- **D5 · «Nuevo evento» y «Nueva tarea» son `?panel=nuevo-evento|nueva-tarea`** (shallow); `N` abre «Nuevo evento». Tras crear, se cierra el alta y se abre el detalle por
  `usePanelDeDetalle().abrirEvento(id)` (nuqs): un `router.replace` dejaba el estado de nuqs con `panel` abierto y el alta seguía a la vista.
- **D6 · Valores de partida en la zona de la empresa:** el evento, a las 09:00 del día de la vista (hoy si ya pasó); la tarea, a las 18:00 y, si ya pasaron, mañana.
- **D7 · Los vínculos (lead, vehículo, cotización) se muestran como enlace y no se editan;** los formularios no mandan esas claves, así que la base las conserva.
- **D8 · El vencimiento de una tarea es obligatorio en la interfaz** mientras no exista «Sin fecha» (7.07-3): una tarea sin fecha no saldría en el calendario.
- **D9 · Quién ve a quién:** la lista de destinatarios la ve sólo quien creó el evento; «Editar» y «Eliminar» no se dibujan para quien no puede (`puedeEditarEvento`, `puedeEditarTarea`);
  sólo las opciones «Público» y «Seleccionados» se deshabilitan con motivo.
- **D10 · El detalle se lee en el servidor por id** (`leerEvento`, `leerTarea`); lo que no se ve, no existe o está eliminado dice lo mismo: «No encontramos este evento/esta tarea».
- **D11 · Errores:** el `hint` de la base va junto a su campo; `PT409` → `<AvisoDeConflicto>` con «Recargar»; eliminar es un `<Confirmar>` que nombra el objeto.
- **D12 · `evento_guardar` recibe siempre la lista de destinatarios** (`[]` si no es «seleccionados»): el tipo generado no admite nulo. `tarea_guardar` nunca manda `responsable_id`.
- **D13 · «Destinatario» es el término** (tabla `eventos_destinatarios`, pantalla «Destinatarios»), no «invitado»; entró al glosario.
- **D14 · La asesora del terreno del e2e no recibía tareas:** el spec le agrega `agenda.tareas.recibir` a su rol (lo borra `limpiarListado` con el rol).

<!-- paso:7.07-3 -->

## 2026-11-11 — Paso 7.07-3: completar, reasignar, «Sin fecha», recordatorios y la bandeja

- **D1 · Completar es un botón en el pie del panel de la tarea** (`Marcar como hecha` / `Reabrir`), sólo para quien `puedeCompletarTarea`; poner, no alternar (`completada: true|false`).
- **D2 · Reasignar vive dentro del detalle, sin URL propia:** «Cambiar de responsable» despliega el selector de una persona (`agenda_quienes_reciben`) y «Reasignar»; no es otro drawer. El rechazo de la
  base (`hint responsable_id`) va junto al selector.
- **D3 · «Sin fecha» es una sección bajo el calendario,** cerrada al entrar, que se lee al abrirla y descarta lo cargado al cerrarla (una tarea completada o creada desde un panel no queda vieja).
  Sólo se dibuja si el filtro incluye tareas. Cada fila es un enlace a `?tarea=<id>`.
- **D4 · Tope de «Sin fecha»:** 500 (`TOPE_DE_LO_CARGADO`) con `<AvisoDeTope>`; son tareas mías y pocas, no hay otra pantalla donde ir.
- **D5 · El vencimiento de una tarea es opcional** (relaja la D8 de 7.07-2): vacío es «sin fecha»; con valor y cambiado, no puede quedar en el pasado. Una tarea sin fecha no sale en el calendario.
- **D6 · El panel del recordatorio lee por id en el servidor** (`recordatorios_vista`, bajo la RLS); lo que no existe, está eliminado o es ajeno dice «No encontramos este recordatorio.». Estado con texto
  (Pendiente, Completado, Vencido; completado gana sobre vencido). No se edita aquí: el pie dice «Edítalo desde el lead».
- **D7 · «Completar» el recordatorio usa la action de `leads` por su `client.ts`** (la RPC exige que sea de quien actúa); como esa action no revalida `/agenda`, el hook llama `router.refresh()`.
- **D8 · «Mis tareas»:** pendientes cuyo responsable soy yo (la RLS deja ver también las que di y, con `agenda.ver_todo`, todas: por eso el filtro), `vence_en` ascendente con las sin fecha al final
  (el orden de `tareas_responsable_idx`), `limit 6`; cada fila enlaza a `/agenda?tarea=<id>`.
- **D9 · «Ver todas» lo dibuja cada bloque** (`VerTodasDelBloque`) siempre que haya filas, hacia `/agenda?ver=tarea` o `/agenda?ver=recordatorio`; las filas de «Recordatorios de hoy» no cambian de destino.
- **D10 · El e2e prueba el camino de la fila y lo nuevo en dos pruebas** (escritorio, `@sin-celular` con motivo); nada de volumen ni de conflicto por interfaz.
- **D11 · «Sin fecha» es el nombre** en tipos, tablas y UI (`agenda_tareas_sin_fecha`, «Tareas sin fecha»); entró al glosario.

<!-- paso:7.08-1 -->

## 2026-11-11 — Paso 7.08-1: conversaciones y membresía del chat (parte 1 de 3 del 7.08)

- **D1 · El 7.08 se parte en tres** por capa de la base: 7.08-1 conversaciones y membresía, 7.08-2 mensajes y menciones, 7.08-3 lecturas paginadas
  y no leídos.
- **D2 · `par_directo` es un `uuid[]` ordenado que puede quedar nulo.** Una directa vieja duplicada queda con nulo: sus miembros la siguen leyendo,
  pero `chat_directa` no la devuelve. No se fusionan conversaciones en una migración.
- **D3 · La regla del canal global vive en `es_miembro()`,** no en cada policy: un solo lugar corta la lectura, la escritura de mensajes y lo que la
  agenda pasa por ahí (`tareas: leer`, `tarea_crear`, `agenda_quienes_reciben`, `_agenda_tarea_tomar`). Quien pierde `chat.global` y no es
  responsable ni creador de una tarea del canal deja de verla y de tocarla.
- **D4 · Con quien no puede usar el chat** (de baja, bloqueado o sin `chat.participar`) no se abre una directa ni se lo suma a un grupo.
- **D5 · Una directa no se deja; se silencia.**
- **D6 · El grupo lo administra quien lo creó** (duda 3 de la fila). Si sale, nadie lo administra y el grupo sigue.
- **D7 · `chat_grupo_miembros`, `chat_leer` y `chat_silenciar` van sin versión:** son idempotentes y no pisan nada. La versión de `conversaciones` la
  movería cada mensaje y daría PT409 falsos. Hay que sumarlas a las excepciones de `.claude/rules/migraciones.md` (lo hace el coordinador).
- **D8 · Un grupo tiene de 2 a 50 personas** (el tope de destinatarios de un evento) y un nombre de 1 a 80 caracteres.
- **D9 · `chat_leer` recibe hasta dónde se leyó** y no lee `mensajes`: un mensaje de otra transacción con hora anterior no queda leído sin verse.
- **D10 · `ultimo_mensaje_en` lo mueve un trigger,** no cada RPC: lo cubre todo camino que inserte un mensaje. En el canal global los envíos se
  serializan en el tramo corto del `update`.
- **D11 · El canal global se siembra en la migración** (la nube no corre el seed) con el nombre del seed, «Equipo».
- **D12 · La publicación de realtime se toca en un bloque `do`** que mira `pg_publication`: PGlite no la tiene y la migración queda idempotente.
- **D13 · `aplicado_en` de `chat.*` no se toca:** vive en `seed.sql` (carril a).
- **D14 · Sin prueba de carreras** (duda 4 de la fila): la directa la cuida el índice único y `chat_directa` relee si pierde.
- **D15 · Las RPC responden `{resultado, id}`** (más `ultimo_leido_en` en `chat_leer`); ninguna expone versión.
- **D16 · Entrar al canal global no pide `chat.participar`:** se puede leer sin escribir.
- **D17 · Los docs de la parte van en `docs/pasos/7.08-1/`;** la partición en `docs/PLAN.md` la anota el coordinador.
- **D18 · La dueña no lee conversaciones donde no es miembro** (a propósito); ninguna RPC le da un atajo.
- **D19 · `conversaciones_miembros` va a realtime como pide la fila,** sabiendo que Realtime no aplica RLS a los DELETE: un suscriptor recibe la
  clave `(conversacion_id, usuario_id)` de quien sale de una conversación ajena (sólo uuids). Se acepta; regla para 7.09: suscribirse sólo a INSERT
  y UPDATE filtrados por `usuario_id=eq.<yo>`.

<!-- paso:7.08-2 -->

## 2026-11-11 — Paso 7.08-2: mensajes del chat (parte 2 de 3 del 7.08)

- **D1** · 7.08-2 lleva todo lo de mensajes (cabe en 5 commits); 7.08-3 no cambia.
- **D2** · El cuerpo guarda cada mención como `#[<tipo>:<uuid>]` y la RPC exige que el conjunto de tokens del texto sea igual al de `p_menciones`: la referencia, nunca el
  nombre. El parser de 7.10 escribe y lee ese formato.
- **D3** · Mencionar o mandar en ficha un vehículo, lead o cotización exige verlo (lo mismo para los dos caminos); a una persona se la puede mencionar
  siempre.
- **D4** · El aviso `mencion` va sólo a miembros vigentes, no a quien envía, aunque esté silenciada (recomendada de 7.10); sin cuerpo (no copia el texto
  a `notificaciones`), referencia `mensaje`, ruta `/chat?c=`. Al editar, los repetidos los absorbe `notificaciones_antispam`.
- **D5** · Un mensaje admite hasta 4.000 caracteres; con ficha, el texto es opcional.
- **D6** · Ventana de 15 minutos, constante en la RPC (duda 1). Editar pide `chat.participar` y versión `coalesce(editado_en, creado_en)` (regla de
  `.claude/rules/migraciones.md`: toda RPC de edición lleva versión).
- **D7** · Editar reemplaza el conjunto de menciones.
- **D8** · Borra el autor o quien tiene `chat.moderar`, siempre siendo miembro (la dueña sin atajo, D18 de 7.08-1); sin ventana; sin versión (idempotente,
  como `leads_papelera_enviar`): va a las excepciones. El cuerpo se vacía y las menciones se borran (duda 2); la ficha queda y el aviso ya dado queda
  (no tiene contenido).
- **D9** · El borrado sin cuerpo es un check, no sólo la RPC; un borrado previo con cuerpo se vacía en la migración (sin prueba de datos previos: PGlite
  arranca vacío, lo dice la bitácora).
- **D10** · `mensaje_editar_validar` se conserva como defensa (autor y `editado_en`) y deja pasar el borrado del moderador.
- **D11** · El id del mensaje viene del navegador; el de la tarea o el evento lo genera el servidor. Un candado consultivo por id hace idempotente el par sin
  dejar una tarea huérfana si chocan dos reintentos.
- **D12** · Primero la RPC de agenda con sus reglas y después la del chat (miembro vigente), todo en una transacción: un error deshace la tarea o el evento.
- **D13** · El evento sigue la visibilidad de 7.06 (privado por defecto): los demás miembros ven la ficha como placeholder salvo que lo publique quien puede.
- **D14** · `tarea_crear` y `agenda_quienes_reciben` (carril b) no se tocan: `mensaje_tarea_crear` es más estricto; aviso al carril b.
- **D15** · El índice del hilo reemplaza a `mensajes_conversacion_fecha_idx`; `mensajes_conversacion_id_idx` queda (reversible, sin medir hoy).
- **D16** · `mensaje_enviar` no crea fichas de tarea ni de evento.
- **D17** · `p_responde_a` es de la misma conversación; puede estar borrado.
- **D18** · Sin prueba de carreras (duda 4).
- **D19** · Docs en `docs/pasos/7.08-2/`; la partición la anota el coordinador.
- **D20** · `creado_en` lo fija el servidor con `clock_timestamp()`.
- **D21** · Una ficha de vehículo, lead o cotización puede quedar sin su referencia: sus FK son `on delete set null` y las papeleras borran de verdad;
  exigirla frenaba la purga. Tarea y evento la siguen exigiendo (sus FK son `restrict`).

<!-- paso:7.08-3 -->

## 2026-11-11 — Paso 7.08-3: lecturas del chat (parte 3 de 3 del 7.08)

- **D1** · `chat_conversaciones` y `chat_no_leidos` son `security definer`, no de invocador (a diferencia de `agenda_tareas_sin_fecha`): contar no
  leídos bajo la RLS paga `es_miembro` por cada mensaje (hasta 2.000 por página). Repiten la regla entera, calculada una vez
  (`v_global := tiene_permiso('chat.global')`; por fila `m.usuario_id = yo and (not c.es_global or v_global)`), y `lista.sql` L1 y L4 la prueban en el
  borde que importa (global con fila y sin permiso). Si la regla de `es_miembro` cambia, cambia en los tres lugares.
- **D2** · La lista parte de las filas de miembro de quien mira y ordena el top-N; `conversaciones_ultimo_mensaje_idx` (orden global) no sirve a
  ninguna ruta y se borra: con él, cada mensaje volvía no-HOT el update de `ultimo_mensaje_en`. Respaldo: `EXPLAIN` con 200.000 conversaciones
  (`.piloto/salidas/7.08-3/explain-200k.txt`, como dueño de la tabla y con valores literales). Desnormalizar `ultimo_mensaje_en` en `conversaciones_miembros` se descarta: cada mensaje del global
  escribiría una fila por miembro, todas en `supabase_realtime`. Reversible.
- **D3** · No leídos lee a lo sumo 100 entradas de `mensajes_hilo_idx` posteriores a la lectura y cuenta las de otros: acotado aunque la persona
  haya escrito mucho sin leer. Si entre esas 100 hay propias, el número puede quedar bajo «99+»; por la pantalla no pasa (7.09 marca leído lo que
  se ve, también al enviar). Los eliminados cuentan (el hilo muestra «Mensaje eliminado»).
- **D4** · Tope 100 = `tope + 1` con tope 99: la base devuelve 0…100 y el código escribe «99+» con `conteoAcotado`/`conteoCorto`.
  `chat_no_leidos()` devuelve un entero, no un objeto.
- **D5** · Enviar no mueve la última lectura de quien envía: lo haría con `clock_timestamp()` y marcaría leído un mensaje ajeno de otra
  transacción con hora anterior (lo que D9 de 7.08-1 evitó con `p_hasta`). Lo hace 7.09 con `chat_leer`.
- **D6** · `p_tamano`: 20 por defecto (`TAMANO_DE_VER_MAS`) y 50 como mucho, como la agenda. Cursor `(ultimo_mensaje_en, id)`: una conversación
  que recibe un mensaje mientras se pagina sube y no reaparece abajo; la trae la relectura de la cabeza (realtime de 7.09).
- **D7** · El registro en `scripts/guardas/areas-c/paginas-en-la-base.ts` va con el primer llamador (7.09): `paginas.test.ts` rechaza una entrada
  sin `.rpc(` en `src/`. `_acotar_pagina` ya lo vigila `escala.sql`.
- **D8** · Sin vista previa del último mensaje: su cuerpo lleva tokens de mención que resuelve 7.10; 7.09 la suma con `create or replace` si su
  diseño la pide.
- **D9** · La lista devuelve `no_leidos` también de las silenciadas (con `silenciada`, la pantalla decide); el total no las suma («silenciar apaga
  los no leídos», PLAN:1681).
- **D10** · Leer no pide permiso aparte de la membresía (como la RLS de `mensajes`); `otro.nombre` sale aunque la persona esté de baja (la directa
  sigue siendo legible).

<!-- paso:7.12-1 -->

## 2026-11-11 — 7.12-1: el buscador, la base

- **Compuerta `datos`** por `buscador_cotizaciones` (un `security definer` nuevo): con `PILOTO_AUTO=todo` se aprobó sola. La sostiene B4 de
  `supabase/tests/areas/buscador/buscador.sql` (la RPC ve lo mismo que la tabla para tres personas) y las mutaciones del informe.
- **D1 · Las tres secciones son RPC**, no sólo la de cotizaciones: el assert pide «con 2 letras, nada» y el mínimo en el servidor, y por PostgREST no
  hay dónde ponerlo. Las de leads y vehículos son invocadoras: no copian ninguna visibilidad.
- **D2 · `buscador_leads` devuelve ids**, no filas: una `setof leads_vista` sólo nace en `_leads_vista_crear()`; el 7.12-2 hidrata con
  `leads_vista_por_ids`, que recorta teléfono y privados.
- **D3 · «La cotización que su nivel no ve»** se lee como el alcance de `cotizaciones.ver` (propios o todos, y la cartera): la fila no se recorta por
  los niveles de la fórmula y la RPC no devuelve nada que un nivel recorte.
- **D4 · No entra al inventario de `cotizaciones-visibilidad.sql`:** su detector no la ve (no nombra lo oculto ni devuelve la fila) y registrarla
  rompería esa prueba; la ata B5 de `forma.sql` (columnas exactas y cuerpo sin lo oculto). Si un cambio la hace nombrar lo oculto, el detector la pide.
- **D5 · Sin `lead_id`, `vehiculo_id` ni `creado_por`** en `buscador_cotizaciones`: el buscador muestra número y título; lo demás, al abrir la ficha.
- **D6 · Hasta 1.000 candidatas por título**, de los orígenes que quien llama ve, más sus propias por `cotizaciones_creador_idx`: con más coincidencias
  la sección muestra las propias más nuevas y cinco de la muestra; las de cartera ajena pueden quedar fuera. El camino a lo completo es
  `/cotizaciones` (7.13 decide el enlace).
- **D7 · `visita_registrar` no mira si la entidad se ve:** escribe sólo filas propias y no revela nada; la hidratación (7.12-2) pasa por la RLS de
  cada entidad. Acepta `lead`, `vehiculo` y `cotizacion`.
- **D8 · El tope de 50 sin candado:** dos visitas a la vez pueden dejar 51 un rato; la próxima recorta y `actividad_purgar()` borra lo de más de 30 días.
- **D9 · Sin `medir-buscador.sql` en esta parte** (pruebas sólo en lo clave): el `EXPLAIN` de `buscador_cotizaciones` queda pendiente del 7.12-2, dicho
  en RENDIMIENTO como límite sin assert.
- **D10 · `#n` busca leads y cotizaciones**, no vehículos.
- **D11 · Los docs de esta parte van a `docs/pasos/7.12-1/`**, como `docs/pasos/5.02-1/`.

<!-- paso:7.12-2 -->

## 2026-11-11 — Paso 7.12-2: el buscador, lo del navegador y la medición (parte 2 de 2 del 7.12)

Siguen la numeración del 7.12-1 (`docs/pasos/7.12-1/decisiones.md`, D1–D11).

- **D12 · Las lecturas viven en `buscador/infra` y salen por `buscador/client.ts`**, no en `leads`, `vehiculos` y `cotizaciones`: llaman a las RPC
  `buscador_*` (dominio y carril b) y D1 ya las hizo RPC del buscador. 7.10 (`chat`) importa `@/modules/buscador/client` y suma `chat --> buscador` a
  `docs/ARQUITECTURA.md`, sin ciclo. Reversible: se mueven a sus módulos sin tocar la base.
- **D13 · El mínimo se decide con `interpretarBusqueda()` de `@/modules/leads/client`, y la llama la feature que compone** (la paleta del 7.13, el selector
  `#` del 7.10). `entities` e `infra` no pueden importar otro módulo (`eslint.config.mjs`, auditoría del plan): `ranking.ts` recibe la interpretación ya
  hecha con su propio tipo estructural (`Interpretacion`), y `buscar*.client.ts` reciben el texto ya validado. La base repite el mínimo y manda.
- **D14 · Cancelar no tiene un valor propio:** la lectura no lanza; con la señal ya cancelada no pide nada, y quien canceló descarta la respuesta mirando su
  `signal`. Así no se ensancha `Resultado` (de `src/shared`, del A, y disparador del Nivel 2).
- **D15 · Los últimos abiertos son una lista mezclada por recencia**, sin grupos: se leen 16 y se muestran 8, para que una oculta o purgada no deje la lista corta.
- **D16 · Registrar la visita no entra aquí:** es una escritura y va por Server Action en el 7.13 (`<RegistrarVisita>`).
- **D17 · La hidratación no muestra marcador:** lo que no se ve desaparece, como en `leerNombresDeLeads`; si falla una de las tres lecturas, falla la lectura entera.
- **D18 · `medir-buscador.sql` mide sólo `buscador_cotizaciones`** (D9: el único definer con `ilike` sobre una tabla que crece). El número se mide como `#n`
  (`soloNumero`), Ana con 100 propias fijas (no crecen con N) y las 10 «Zafiro único» de la dueña entre las más viejas; antes de medir se vacía la lista
  pendiente del GIN (`gin_clean_pending_list`), que en la nube vacía el autovacuum. La guarda (sin el GIN) muerde si recorre la tabla o si el heap crece.
- **D19 · `MEDIR_SOLO` en el runner:** corre una medición sin las otras veinte de `db:medir:volumen`; va en el mismo commit que la medición (sin él no se corre sola).
- **D20 · Sin test de `resultados.ts` aparte ni de `infra/`:** pruebas sólo en lo clave; `filasDesde` lo cubre `ranking.test.ts` y el camino feliz, el e2e del 7.13.
- **D21 · `POR_SECCION` vive en `buscador/entities/ranking.ts`**, no en `src/shared/lib/paginacion.ts`: es el tope de una sección del buscador, no una página de
  lista (precedente: `MAXIMO_DE_PAGINA_DE_VEHICULOS`), y `shared` es del A y dispara el Nivel 2.
- **D22 · La contingencia de la medición entró: la ruta de las propias sólo corre donde se tiene «propios» sin «todos»** (`20261111200531_buscador_cotizaciones_rutas.sql`).
  Con el plan genérico, un título raro de la dueña recorría todas sus propias por `cotizaciones_creador_idx` (2.235 → 11.147 bloques, 46 → 229 ms): la ruta corría
  también en los orígenes con «todos». Se probó además pasar las dos consultas de candidatas a `execute … using` (`medir-buscador-2.txt`): planificada con el
  texto, la del título va por un Seq Scan con `limit 1000` para un título común (≈ 600 bloques si las coincidencias se reparten; la tabla entera si quedan al
  final), y la medición lo marcó como recorrido. Se quedan estáticas: el genérico va por el GIN. Queda como límite declarado en RENDIMIENTO lo que hace el plan a
  medida en las 5 primeras llamadas de una sesión. La visibilidad no cambia: menos candidatas, y la misma policy repetida (B4 de `buscador.sql` sigue en verde y
  suma el caso mixto: «todos» en un origen y «propios» en otro, atrapado por la mutación `v_solo_propios := v_t`). Lo que se pierde: quien ve «todos» en un
  origen, con más de 1.000 coincidencias de un título, ya no tiene sus propias primero (la ruta del título toma 1.000 cualesquiera); llega por `#número` o
  afinando el texto. Es un buscador con tope, no una lista. Se desvía de C14 del plan, que proponía `execute … using`: lo medido lo descartó.
- **Compuerta `datos` (contingencia de C14):** cambiar `buscador_cotizaciones`, un `security definer`, sin cambiar su firma, lo que devuelve ni la policy repetida.
  Con `PILOTO_AUTO=todo` se aprueba sola con la primera opción («seguir con la migración»); el informe se audita.

<!-- paso:8.06-1 -->

# 8.06-1: decisiones (2026-11-11)

- **D1 · La dirección vive en un solo lugar.** Va en `integraciones.config.revalidar_url` y el secreto en Vault (`integracion:web_publica`). Esto cierra la
  contradicción 1 de `docs/PLAN.md` (dos casas para la URL). La base es la que avisa al sitio y no lee variables de Vercel. El 8.06-2 borra
  `WEB_PUBLICA_REVALIDAR_URL` y `WEB_PUBLICA_REVALIDAR_SECRETO` de `esquemas.ts`, `.env.example` y `docs/ENTORNOS.md`.
  Mientras pg_net no manda el pedido, el secreto queda en las cabeceras de `net.http_request_queue`. Es lo normal en pg_net, y en Supabase esa tabla no se
  le concede a `authenticated`. `db:probar` no lo puede comprobar, porque en PGlite el doble es `net.pedidos`.
- **D2 · Cola y job cada minuto, no un disparo por cambio.** Una limpieza puede tocar miles de vehículos y serían miles de POST. Se usan triggers por
  sentencia y un pedido por minuto que junta todas las etiquetas.
- **D3 · Qué direcciones se aceptan.** La dirección puede ser `https://`, o `http://localhost|127.0.0.1`, que sirve sólo para «Probar» en local y en el e2e.
  **El job sólo envía a `https://`**, así pg_net nunca le pega a un puerto local del servidor de la base. Riesgo aceptado: la regex acepta IP literales y
  hosts privados. Lo acota que la dirección la fija sólo `empresa.ajustes.gestionar`, que el cuerpo es fijo y que nadie lee la respuesta de pg_net.
  El 8.06-2 rechaza el loopback en producción, para que «Probar» no mande el secreto al localhost del servidor de Next.
- **D4 · Sin índice único ni `on conflict` sobre la etiqueta** (bloqueo de la auditoría del plan). Con `on conflict`, la inserción especulativa espera el
  commit de quien encoló primero. Eso serializaba todas las escrituras de vehículos del minuto y abría interbloqueos nuevos. Ahora es un insert simple
  que deduplica sólo dentro de la propia transacción (columna `transaccion xid8`).
  Tampoco se deduplica contra cualquier fila, como proponía la auditoría. Si una transacción confía en la fila confirmada de otra, el job puede
  consumirla y avisar al sitio antes de que la propia confirme, y ese cambio no se revalidaría.
  Las filas repetidas entre transacciones se borran al enviar (`array_agg(distinct …)`). Si el job no puede enviar, las compacta y deja la más vieja de
  cada etiqueta, así una cola apagada no crece. R7b cae si alguien vuelve a poner un índice único.
- **D5 · Triggers por sentencia sin tablas de transición.** Anotan aunque la sentencia no cambie filas: el peor caso es un pedido por minuto.
- **D6 · Apagar no avisa al sitio.** `web.vehiculos` deja de devolver filas al instante, y lo que el sitio tenga en caché vence por su propia caducidad.
- **D7 (8.06-2) · «Probar» corre en el servidor de Next**, con el cliente admin acotado a `integracion_secreto('web_publica')` y con el permiso comprobado antes.
- **D8 · Encender no exige dirección ni secreto.** Sin ellos, la cola espera y no se pierde nada.
  En `web_publica`, `integracion_guardar` guarda sólo `revalidar_url`, así que un `p_config` sin esa clave la borra. Por eso el 8.06-2 tiene que mandar
  siempre `revalidar_url` junto con la config, o `p_config` nulo cuando sólo enciende o apaga.
- **D9 · La cola de asesores anota sólo con `insert`, `delete` y `update of orden`.** `disponible`, `ultima_asignacion_en` y `asignadas_total`
  cambian con cada turno.
- **`categorias` también anota `vehiculos`** (auditoría, punto 4): `interno.vitrina_vehiculos` publica el nombre de la categoría.
- **La fila `web_publica` pasa a ser catálogo:** está en una migración con `on conflict`, porque la nube no corre el seed.
- **Contrato con el sitio** (lo escribe el 8.06-2 en la ficha de `web`):
  - El pedido es `POST <revalidar_url>`, con `Content-Type: application/json` y `Authorization: Bearer <secreto>`.
  - El cuerpo es `{"etiquetas": [...]}`, ordenadas y sin repetir. `{"etiquetas": []}` es «Probar».
  - Sale a lo sumo un pedido por minuto. pg_net no reintenta: un pedido perdido lo cubre la caducidad del sitio.

<!-- paso:8.06-2 -->

# 8.06-2: decisiones (2026-11-11)

- **D10 · El loopback se prueba sólo si la base del despliegue es local.** «Probar» acepta `http(s)://localhost|127.x` sólo si
  `NEXT_PUBLIC_SUPABASE_URL` también es de loopback (local, CI, e2e). No se corta por `NODE_ENV`: el e2e de CI corre `next start` y se rechazaría
  también ahí. Tampoco hace falta una variable nueva: la base local ya dice «esto no es la nube». Un despliegue propio con Supabase en el mismo host
  (`http://127.0.0.1` tras un proxy) dejaría probar contra el loopback: es aceptable, `docs/ENTORNOS.md` da Vercel con la base en la nube.
- **D11 · SSRF: se acotan las IP literales, no lo que resuelve el DNS.** La app rechaza el loopback (salvo D10), las redes internas escritas tal cual
  (`0/8`, `10/8`, `100.64/10`, `169.254/16`, `172.16/12`, `192.168/16`), IPv6 literal, usuario y clave, y mira el host ya normalizado por WHATWG
  (`2130706433` y `0x7f.1` son `127.0.0.1`) y sin el punto final (`localhost.`). Un nombre que resuelve a una IP interna no se ataja: no hay
  dependencia para fijar la IP resuelta y un `dns.lookup` previo no evita el rebinding. Lo limitan el permiso `empresa.ajustes.gestionar`, el cuerpo
  fijo, no seguir redirecciones y que sólo vuelve el código. Tampoco se rechazan las redes reservadas que no son del servidor (`192.0.0.0/24`,
  `198.18.0.0/15`, multicast `224.0.0.0/4`, `240.0.0.0/4`): no apuntan a la red del servidor y «Probar» sólo devuelve el código.
- **D12 · No se rechaza el loopback al guardar.** La base lo acepta (D3 del 8.06-1), el job no lo usa (sólo manda a `https://`) y «Probar» lo corta
  (D10). El esquema del formulario corre también en el navegador y no lee el entorno.
- **D13 · La app es más estricta que la base.** La regex de `integracion_guardar` queda como está: lo que la app rechaza (redes internas, IP en decimal)
  no llega; lo que entra por RPC directa lo acota D3 del 8.06-1.
- **D14 · Apagar la web pública no lleva «Deshacer» ni confirmación.** Es el patrón de apibara, se revierte con el mismo interruptor y la ayuda dice
  antes del clic cuántos vehículos dejan de verse.
- **D15 · Mensajes del secreto neutros** («Tiene al menos 8 caracteres.») para las dos integraciones: un solo esquema, sin texto por clave.
- **D16 · «Probar» no guarda el resultado** (sin columna ni evento): es una comprobación a pedido, no un estado.
- **D17 · Segunda excepción del cliente admin.** `integracion_secreto()` sólo la ejecuta `service_role`; «Probar» corre en el servidor de Next
  (no en pg_net, que no devuelve el código a la pantalla). `probarRevalidacion()` comprueba el permiso con el cliente de quien prueba, lee y valida la
  dirección guardada y recién entonces crea el admin para esa única llamada. El lint, `.claude/rules/datos.md` y `admin.ts` la nombran.

## Contrato con el sitio

`POST <revalidar_url>` con `Content-Type: application/json` y `Authorization: Bearer <secreto>`; cuerpo `{"etiquetas": [...]}` con
`guias|faqs|testimonios|ajustes|asesores|vehiculos`, ordenadas y sin repetir. `{"etiquetas": []}` es «Probar» y no revalida nada. El receptor compara el
secreto en tiempo constante y responde 2xx. A lo sumo un pedido por minuto y sólo a `https://`; sin reintentos (lo cubre la caducidad propia del
sitio); apagar la integración no avisa (D6 del 8.06-1). Ninguna variable de entorno: dirección y secreto en Configuración › Empresa › Integraciones ›
Web pública.

<!-- paso:8.08-1 -->

# 8.08-1: decisiones (2026-11-12)

- **D1 · Un ítem que terminó sin llegar no frena al vehículo** (duda 1 de la fila; cierra la contradicción 3 de la Fase 8). `evaluar_requisitos` (rama
  `hijos`) cumple si todos los ítems vivos fuera de stock llegaron a la fase esperada o terminaron en otra final («Perdido»); el `detalle` suma
  `sin_llegar`. La regla vive en `_repuesto_ante_espera` (sólo `service_role`), que da `llego` también si el ítem está en la fase esperada aunque no tenga
  historial. Cambia una función de `flujos`, cuya ficha no está en los módulos del paso: el aviso va en la ficha de `repuestos` y la bitácora le pide al
  coordinador la línea en `src/modules/flujos/CLAUDE.md`.
- **D2 · Un proyecto sólo se elimina vacío** (duda 2): sin ítems vivos, compras, pagos ni cotizaciones; borrado suave, con «Deshacer» por
  `repuesto_proyecto_restaurar(p_proyecto, p_eliminado_en_esperado)`. Restaurar choca con el único proyecto vivo por vehículo: 23505.
- **D3 · `datos` (jsonb) de los catálogos no se dibuja** (duda 3; aplica en 8.08-3).
- **D4 · Eliminar un ítem o un proyecto lleva la versión esperada**, como `tarea_eliminar` y `evento_eliminar` (`migraciones.md` › «Forma»), aunque la fila
  escriba `repuesto_item_eliminar(p_item)`.
- **D5 · También se quita el INSERT directo de proyectos** y el UPDATE de tabla (queda UPDATE por columna de etiqueta, VIN, lead, cliente y notas). Sin eso,
  quien tiene `repuestos.editar` creaba un proyecto de un vehículo que no ve. Un `check` impide etiqueta o VIN propios en un proyecto con vehículo.
- **D6 · La lista no trae `lead_id` ni el teléfono del cliente**, y el título del vehículo sale sólo con `vehiculos.ver` de su origen. Los pendientes de un
  vehículo traen los nombres de sus fases sólo con `logistica.ver` del vehículo (auditoría del plan, hallazgo 3).
- **D7 · Búsqueda de la lista:** sólo dígitos (hasta 18) busca el número o el texto; si no, 3 caracteres o más, escapado, sobre etiqueta, VIN y cliente. No
  busca por el título del vehículo, que no todos ven.
- **D8 · Un proyecto cerrado no recibe ítems**, y cerrarlo no exige que los ítems hayan terminado.
- **D9 · «Borrar sólo sin uso» va con un trigger** `before delete` en la base, no con un control en la app: no tiene carrera y cubre los ítems eliminados y
  las líneas de cotización.
- **D10 · Sin carrera en esta parte.** El arnés `scripts/carreras.mjs` lo arma a mano el carril A y no está en los módulos del paso. «Eliminar un proyecto
  mientras se crea un ítem» lo resuelve el orden de candados (`for update` del proyecto al eliminar contra `for share` al crear el ítem, tomado antes de
  leer su estado). Se propone sumar esa carrera a `scripts/carreras/repuestos-stock.mjs` en el 8.10.
- **D11 · Docs:** una carpeta por parte (`docs/pasos/8.08-1/`), porque `consolidar-docs.mjs` consolida una vez por carpeta.
- **D12 · Estado del proyecto:** la base da las cuentas (`items`, `pendientes`, `en_stock`, `terminados`) y `entities` deriva la etiqueta (8.09).
- **D13 · Qué espera el vehículo:** las esperas de las fases a las que puede pasar desde la actual; sin fase, las de las iniciales activas de su flujo.
- **D14 · Validaciones del ítem:** descripción de 1 a 500 caracteres; cantidad entera desde 1; precio ≥ 0 y con moneda existente; cada catálogo, vivo y de
  su tipo.
- **D15 · Registro de páginas:** ninguna entrada en `paginas-en-la-base.ts` hasta que haya quien llame la RPC desde `src/` (la lista en 8.09, los pendientes
  en 8.13): la guarda rompe con una entrada sin llamador.
- **D16 · Toda RPC que escribe pide `repuestos.editar` antes del candado** (auditoría del plan, que bloqueó por `eliminar` y `restaurar` sin permiso
  explícito). R6 y B2 lo prueban con `repuestos.ver` sin `repuestos.editar`.
- **D17 · Abierto para 8.09 (auditoría del informe, hallazgo 3).** Dos `repuesto_item_crear` (o `repuesto_proyecto_crear`) a la vez con el mismo id caen
  en la PK con un 23505 sin mensaje humano, y la repetición idempotente de un ítem responde sin mirar si el proyecto sigue vivo. No rompe datos; 8.09 envuelve
  el `insert` en `exception when unique_violation` con «Ese identificador ya está en uso…».
- **D18 · Eliminar un ítem recién nacido de un proyecto cerrado se permite** (auditoría del informe, hallazgo 4): es borrado suave de un ítem sin historial
  ni uso, y deshacer una carga equivocada no debería exigir reabrir el proyecto. Crear sí lo rechaza.

<!-- paso:8.08-2 -->

# 8.08-2: decisiones (2026-11-12)

- **D19 · Los nombres de los cuatro catálogos son fijos.** Las claves son el `check` del esquema (`repuestos_catalogos_catalogo_check`), no un dato de la
  empresa, como `PROPOSITOS_DE_CATEGORIA` (6.11-4). `catalogo.test.ts` (K1) ata la lista a la última migración que define el `check`; los valores salen de
  la base. `modo_transporte` se muestra como «Vía de transporte» (glosario).
- **D20 · La guarda de áreas va en `scripts/guardas/areas-c/`**, que es del carril. En `logistica` y `flujos` la dejó el A en la raíz de `scripts/guardas/`.
  Es una copia adaptada, no se generaliza (generalizarla es editar archivos del A); unificarla queda para el A.
- **D21 · «Ordenar» es el campo «Orden» del formulario**, con las flechas apagadas y su motivo, como «Categorías de gasto». Mover con flechas sin RPC son dos
  `UPDATE` no atómicos. Reversible: una RPC `repuesto_catalogo_mover` y las flechas, más adelante.
- **D22 · Tope de 200 valores por catálogo**, como las categorías de gasto, con `limit 201` y `cortarAlTope`.
- **D23 · Escritura directa bajo RLS, sin RPC**, como las categorías de gasto (6.11-4, D9): un valor de catálogo no otorga permisos, y «en uso» lo protege el
  trigger del 8.08-1.
- **D24 · Cero filas: sin permiso o «ya no existe».** Una relectura por id lo distingue (la policy de lectura es `true`), en vez de decir siempre «sin permiso».
- **D25 · La columna «Uso» no tiene dato** para quien sólo configura (la RLS de ítems pide `repuestos.ver`). La 8.08-3 escribe «—», y el motivo lo da el
  error al borrar.
- **D26 · Las actions comprueban `repuestos.configurar` antes de escribir**, aunque no salgan por `client.ts`: da el texto propio y deja la RLS como la
  protección (probada en K2 y K3).
- **D27 · Ninguna action sale por los barriles.** Los componentes de la 8.08-3 viven en el mismo módulo y las importan en relativo (`modulos.md`).

<!-- paso:8.08-3 -->

# 8.08-3: decisiones (2026-11-12)

- **D28 · «Cotizador» no se dibuja hasta el 8.12.** Una pestaña sin contenido es una pestaña muerta. `pestanas.ts` lleva sólo «Catálogos» y, con una, no hay
  barra. El 8.12 suma su línea y la barra.
- **D29 · La columna de uso dice el «Orden».** `columnaDeUso` es obligatoria y el uso real no se puede leer (D25: la RLS de ítems pide `repuestos.ver`).
  Mostrar el número explica el orden, que se cambia en «Editar» (D21). Cambia la presentación de D25 («—»), no su regla.
- **D30 · «Agregar <valor>»** en vez de «Nuevo/Nueva»: los cuatro valores tienen género distinto, y «Agregar» no lo pide.
- **D31 · El e2e no prueba «en uso».** K1 de `supabase/tests/areas/repuestos/catalogos.sql` lo prueba con el texto exacto y el diálogo lo muestra tal cual.
  Sembrar un ítem en uso desde el e2e pide proyecto y fase.
- **D32 · «Eliminar», no «Borrar»,** como Categorías de gasto y Tipos de lead: una misma palabra en toda Configuración.
- **D33 · Lo nuevo sale al final:** el «Orden» inicial es `ordenSiguiente` del catálogo, no 0.
- **D34 · La lectura va en el servidor** (como Leads › Tipos) y no en el cliente como Categorías de gasto: `leerCatalogosDeRepuestos` ya es de servidor y el
  `revalidatePath` de cada action renueva la página. El e2e lo prueba.
- **D35 · La entrada es `pantallas/catalogos.ts`, no `pantallas/configuracion.ts`** como nombra el «Lugar» de la fila 8.08 de `docs/PLAN.md`: la guarda de
  áreas del 8.08-2 exige una entrada por área.

<!-- paso:pedido-4 -->

# pedido-4 (pedido del carril c, 5.03)

- `.github/workflows/ci.yml` › job `e2e`: el paso «chromium y lo que pide del sistema» corre `playwright install --with-deps chromium` con `timeout --kill-after=10 240`; si cae (apt sin espejo, exit 100) o se cuelga, un aviso `::warning::` y `playwright install chromium` sin apt.
- Por qué es seguro: la imagen ubuntu-24.04 ya trae las bibliotecas del sistema (apt decía «already the newest version»); sin apt sólo faltan fuentes extra (fonts-ipafont, unifont, wqy, xfonts), que no cambian los e2e.
- El tope de 240 s cubre apt normal (≈ 30–60 s) más la descarga de chromium; si el timeout corta durante la descarga, el respaldo la repite sin red de apt.
- `timeout` mata el grupo de procesos, así que un `apt-get` colgado no queda vivo.
- Es una guarda del piloto (`.github/workflows/`): el coordinador no integra este PR solo; lo deja entrar la persona.
- Prueba: `scripts/guardas/workflows.test.ts` (45 en verde) y el chequeo de la sintaxis shell con un `timeout` que falla y otro que vence; el efecto real se ve en el CI del PR.

<!-- paso:5.13-1 -->

# Paso 5.13-1 — El cierre de la Fase 5 (parte 1 de 2): el recorrido y el Nivel 3

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/5.13-1.md`.

- **D1** El 5.13 se parte en 5.13-1 (el recorrido y el Nivel 3) y 5.13-2 (los docs de cierre: tabla de criterios, «Partición» marcada, DECISIONES de la
  fase, fichas, abiertos para la Fase 6 y pulido). El Nivel 3 solo son ≈ 70 min de reloj y la lectura de los 20 docs de paso de la Fase 5 no cabe con margen
  en la misma sesión.
- **D2** Los docs de esta parte van en `docs/pasos/5.13-1/` (no en `5.13/`), como 5.12-1 y 5.12-2: cada parte se consolida una vez.
- **D3** La regla «Esperas» del flujo de repuestos de la semilla se enciende por SQL en `beforeAll` y se devuelve como estaba en `afterAll`: es el flujo de
  la semilla, no el que arma la dueña. El flujo que arma la dueña no lleva nada de SQL.
- **D4** El vehículo nace por la pantalla de alta y se mueve y se previsualiza por SQL **como la dueña** (sus claims y `set local role authenticated`,
  `e2e/soporte/flujos-recorrido.ts` › `comoPersona`), no como `postgres`: pasa por el mismo permiso que usará la pantalla de mover de la Fase 6.
- **D5** Un solo vehículo: el contraste es la misma previsualización antes (`ok`) y después de jubilar («La fase destino está jubilada.», comparado como
  elemento de `motivos`); la insignia de `/vehiculos` y la ficha la nombran porque la unidad sigue en esa fase. El diálogo de jubilar lo dice: «1 unidad
  sigue en ella y deja de ser destino».
- **D6** «Los abiertos de la sección C» de la fila 5.13 no tienen una sección C en la Fase 5: el 5.13-2 los toma como los huecos que la Fase 5 deja a la 6 y
  los escribe como `6-x` en «Riesgos y huecos» de la Fase 6.
- **D7** El completo se corre por proyecto, cada uno desde su `db:reset` (lo hace `pnpm test:e2e:completo`), como en el 4.28: da los minutos por proyecto
  que pide el 5a-4b.
- **D8** Una caída del completo que pasa 3 de 3 sola es inestable y se anota sin arreglar (`.claude/rules/e2e.md` › «Inestables»); una que cae siempre es un
  rojo real y se arregla en el paso con su propio `fix` (no se cierra una fase con rojos).

<!-- paso:7.04 -->

## 2026-11-12 — Paso 7.04: preferencias de notificaciones y activar el push

- **D1 · Las preferencias viven en `/perfil`** (duda de la fila, la recomendada), con un enlace desde `/notificaciones`: es donde ya están las demás.
- **D2 · Apagar un tipo sólo detiene el push, no la campana:** la campana es el registro (ficha del módulo); el bloque lo dice una vez.
- **D3 · La preferencia se escribe directo bajo RLS propia, no por RPC:** no otorga permisos y la base ya exige un objeto. Una acción lee la fila,
  cambia una clave y borra la fila si queda vacía (vuelve a «todo encendido»). Dos pestañas pueden pisarse una clave: aceptado.
- **D4 · El `tipo` acepta `^[a-z][a-z0-9_]{0,59}$`, no sólo el catálogo:** una fase nueva suma tipos sin tocar el esquema; la interfaz ofrece el catálogo.
- **D5 · La clave pública VAPID se lee en el servidor y llega por props:** ni el e2e ni el despliegue dependen de que el bundle la haya incrustado.
  `playwright.config.ts` le da al servidor de e2e una clave pública de prueba (no hay privada).
- **D6 · Con `push_web` apagada, el interruptor del navegador queda deshabilitado con su motivo; los de por tipo siguen activos** (son preferencias).
- **D7 · `usePush` registra `/sw.js` al encender:** el layout sólo lo registra en producción y `getRegistration()` (no `ready`) lee el estado sin colgarse.
- **D8 · «Tus navegadores» nombra el navegador desde `user_agent`** («Chrome en Windows») y nunca muestra el `endpoint`; el actual lleva «Este navegador».
- **D9 · El documento de `/perfil` sube a 96 KB** (de 91): el bloque, el esqueleto de su `<Suspense>` y las props del bloque diferido suman ≈ 6,7 KB
  (93.382 B medidos); regla del 5 %, sin refactorizar. El JS en frío no cambió de presupuesto (421,7 de 440 KB).
- **D10 · Los textos de las descripciones por tipo** (`entities/tipos.ts`) son microdecisión de UX: una línea por tipo, «Cuando …».

<!-- paso:5.13-2 -->

# Paso 5.13-2 — El cierre de la Fase 5 (parte 2 de 2): los docs de cierre

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/5.13-2.md`.

- **D1** La configuración del flujo se escribe por RPC con la versión del flujo: `flujos.actualizado_en` (texto ISO, microsegundos), `_flujo_para_editar()` y
  `_flujo_tocar()`, `PT409` «Otra persona cambió este flujo mientras lo editabas.»; `authenticated` no escribe directo `fases`, `flujos`, transiciones, roles,
  requisitos, reglas ni oferta (las pruebas de `42501` en `supabase/tests/areas/flujos/`); los tipos de documento, con versión por fila. Por qué: `datos.md` y
  `migraciones.md`; antes se escribía bajo policies sin versión (`docs/PLAN.md` › «Fase 5» › «Lo que ya existe»). Detalle: `docs/pasos/5.01-1/`, `5.01-2/`,
  `5.03/`, `5.05/`, `5.07-1/`, `5.10-1/`.
- **D2** La oferta de transporte es de `flujos`: la escribe `flujo_oferta_guardar()` (Configuración › Flujos › Reglas, 5.11) y la lee `flujo_oferta()`;
  `logistica` sólo la lee (el hueco «Transporte», 6.08). Puertos y navieras son catálogos de `logistica` (6.08). Detalle: `docs/pasos/5.10-1/`, `5.10-2/`, `5.11/`.
- **D3** Lo decidido en las dudas de la fase, todas con la recomendada (sin compuertas), con su detalle en `docs/DECISIONES.md` › `<!-- paso:5.xx -->`: 5.01
  (versión por flujo; se puede jubilar la única inicial; el flujo de repuestos por migración), 5.02 (sólo la lista, sin «camino» ni «historial»; `?origen=` y
  `?ambito=repuestos`), 5.03 (qué significa cada modo de vencimiento; `proposito` no se edita), 5.04 (en repuestos, web, portal y aduana deshabilitados con
  motivo), 5.05 (se puede limitar a un rol que no se domina), 5.07 (nace informativo; se borra `fuera_de_regla()`), 5.08 (una clave con su regla apagada se
  ofrece con nota → 6-4), 5.10 (puertos y navieras a la Fase 6), 5.12 («Revisar» avisa y no frena). Sin dudas: 5.06, 5.09, 5.11, 5.13.
- **D4** Los abiertos numerados que la fase deja a la 6 van en «Abiertos que caen aquí» de la Fase 6, donde vive el 6-1 y donde los busca el 6.14; «Riesgos y
  huecos» sólo se corrige donde quedó viejo (sin borrar). Afina el D6 del 5.13-1, que decía «Riesgos y huecos».
- **D5** De lo que la fase dejó a la 6, sólo el requisito de dato con su regla apagada no tiene paso (mover → 6.04, puertos y navieras → 6.08, vencimiento →
  6.05/6.06/6.12, triggers del dato exigido → 6.07, rama de repuestos → 8.13): un abierto, **6-4** (6-2 y 6-3 están reservados). La campana sin red es
  **7-2**; `rbac_eliminar_rol` con el `23503` crudo es **9-13** (ninguna fila de las fases 6 a 8 toca roles).
- **D6** `flujos.activo` no se edita ni se quita: nadie lo lee ni lo escribe (comprobado con grep en `src/` y las migraciones nuevas); se anota en «Riesgos y
  huecos» de la Fase 5 y en la ficha. Es lo más reversible.
- **D7** La inestable de `configuracion-flujos-requisitos` no es abierto (`.claude/rules/e2e.md` › «Inestables»): se nombra en la tabla y en el cierre.
- **D8** La fase se da por cerrada con el Nivel 3 del 5.13-1 y el CI del PR; si el CI sale rojo, se arregla en su `fix` aparte antes de integrar.
- **D9** La «Partición» de la Fase 5 se queda en `docs/PLAN.md`, como la de la Fase 4 (esta sesión no lee `docs/archivo/`); ESTADO lo dice en la misma línea.
- **D10** GLOSARIO no se toca: «Versión del flujo», «Fase jubilada», «Oferta de transporte», «Jubilar» y «Revisar» ya están. «Siguientes pasos» de Orígenes ya
  enlaza al flujo desde el 5.02 (`e2e/origenes.spec.ts`): se anota, sin código.

<!-- paso:6.06-1 -->

## 2026-11-12 — Paso 6.06-1: documentos de la unidad, lectura

- **D1 · Una foto de la cámara es un documento y no se comprime** (duda 1, la recomendada). Se avisará el tamaño antes de subir si pasa de 10 MB (6.06-2).
- **D2 · La pestaña «Documentos» y el panel son un solo componente** (duda 2, la recomendada): `HuecoDeDocumentos` con `{ unidad }`; el permiso lo decide la base.
- **D3 · El hueco declara `permisos: ['logistica.ver']` y `regla: null`.** No hay regla «documentos» en `CLAVES_DE_REGLAS`. Reversible: se agrega cuando exista.
- **D4 · Lectura con tope.** Los documentos vivos de la unidad por `documentos_vehiculo_id_idx`, más recientes primero, tope 50 con `limit 51` y `<AvisoDeTope>`. Los tipos
  activos con `limit 101` (el tope de la base es 100); los de un flujo aparecen sólo en las unidades de ese flujo.
- **D5 · «Lo que pide la fase siguiente»** = los requisitos de documento de las fases a las que esa unidad puede ir (`fases_transiciones` desde su fase), porque
  `evaluar_requisitos` mira `fases_requisitos` por la fase de destino. Sin fase no hay ninguno.
- **D6 · «Hoy» es el día de la empresa** (`diaEnZona` con su zona horaria, calculado al leer). La base compara con su `current_date`: en el borde de la medianoche
  «Vencido» puede diferir unas horas de «Qué falta»; manda la base.
- **D7 · «pendiente» se muestra «Sin subir»**; los otros, «Subido», «Aprobado», «Rechazado». Siempre texto, el color es refuerzo.
- **D8 · Quién subió y quién revisó:** nombres de `perfiles` en una consulta por todos; si falla, «otra persona». Nunca un uuid.
- **D9 · Ver y Descargar, dos botones por fila.** La URL firmada de 60 s se pide al tocar. «Descargar» sigue la URL con `download` y el nombre del archivo.
- **D10 · La pestaña lee `leerUnidad` en el servidor** (tras `<Suspense>`) y, si la unidad es nula, dice «Esta unidad ya no está disponible.».
- **D11 · El hueco se arma por tipo:** los pedidos por una fase primero, luego los que tienen documentos, cada bloque por `orden`; un tipo pedido sin documentos
  dice «Aún no hay ninguno»; un documento de un tipo desactivado va a «Otro tipo».
- **D12 · Sin `medir-*.sql`:** una unidad por índice con tope 51; sin tabla ni índice nuevos.
- **D13 · La fecha de vencimiento se escribe con `formatearFecha`** («Vence el 10 ene 2027»), no «10 de enero de 2027» como decía el plan: el formato de toda la app.

<!-- paso:6.06-2 -->

## 2026-11-12 — Paso 6.06-2: subir documentos con una bandeja

- **D14 · El tipo se elige antes que los archivos y manda.** El selector de tipo va arriba de la zona porque de él salen el `accept` y el aviso de formatos. Un archivo que el tipo
  no admite no se pierde: sale de lo que se sube con su motivo y vuelve si se elige otro tipo (`repartirLaBandeja`).
- **D15 · El id del intento va por archivo y atado a lo escrito** (hash + tipo + fechas + nota). Reintentar sin cambiar nada manda el mismo id y la base devuelve las mismas filas; si
  la persona cambia el tipo o una fecha entre un intento y otro, es otro registro y no choca con `23505/id`.
- **D16 · Se sube uno por vez y se corta ante lo que fallaría igual:** sin red o con un campo rechazado por la base no se insiste con los demás; los que quedan se reintentan con su
  motivo. Los registrados salen de la bandeja y avisan a «Qué falta» con `logistica:unidad-cambio`.
- **D17 · Los campos del formulario que la base nombra por `hint`** son `vence_el`, `tipo` y `nota`; ruta, formato, peso y unidad no tienen campo y se dicen junto al archivo. `42501` dice
  siempre «No puedes subir documentos a esta unidad.».
- **D18 · El e2e de subir se adelanta a la parte 2** (el plan lo traía en la 3): subir contra el bucket real es lo único que prueba la policy de carpeta y el registro juntos. La 3 lo extiende con aprobar.
- **D19 · «Emitido el» sólo se pregunta si el tipo vence.** Un tipo `ninguno` no lleva fechas (la base rechaza un vencimiento) y no se ofrece ni una emisión.

<!-- paso:6.06-3 -->

## 2026-11-12 — Paso 6.06-3: revisar, editar, eliminar y subir a un grupo

- **D20 · Sin identidad en el navegador, «Editar» y «Eliminar» se ofrecen a quien tiene aprobar o subir** (lo mínimo que la base pide) y la base decide: un `42501` se dice dentro de la fila o del
  diálogo. Reversible: si hace falta apagarlo antes, se lee el uid con `getClaims()` en un `infra/…client.ts`.
- **D21 · «Aprobar» sale en un documento «Subido» o «Rechazado»; «Rechazar» sólo en «Subido».** Un aprobado que se quiere deshacer se elimina y se sube de nuevo (la base permitiría rechazarlo, no se ofrece).
- **D22 · El motivo del rechazo se escribe junto al botón** (1 a 500, recortado); vacío apaga «Confirmar rechazo» y dice por qué. Un `PT409` lo conserva porque la fila no se desmonta al releer.
- **D23 · «Visible en el portal» es un interruptor por fila**, apagado con motivo sin la clave de aprobar o si el tipo no lo admite. Apagar siempre se puede; uno visible de un tipo que ya no lo admite queda
  encendido y dice «No se ve en el portal: el tipo ya no lo permite.» (D13 de 6.05).
- **D24 · «Editar» es un formulario dentro de la fila**, sin `<Drawer>` (así no hay guarda de salida nueva); «Guardar» manda sólo lo que cambió y está apagado si nada cambió.
- **D25 · El hueco del grupo reutiliza la bandeja:** cada archivo se sube una vez a la carpeta de la primera unidad (la de menor id, para que un reintento caiga en la misma ruta) y se registra para todas.
  Más de 100 unidades: se apaga con «Este grupo tiene más de 100 unidades: súbelo por partes.».
- **D26 · Los tipos del grupo son los de la primera unidad** (globales y del flujo de su origen); si otra unidad es de otro flujo y la base rechaza el tipo, el motivo sale junto al archivo.
- **D27 · El hueco del grupo no tiene e2e** (no existe página de grupo): lo prueba un test de componente; su e2e llegará cuando 6.08 o 6.09 lo monten.
- **D28 · Quien aprueba en el e2e lleva también `flujos.mover`:** sin esa clave «Qué falta» no ofrece el destino y no se puede ver el requisito cumplido.

<!-- paso:6.07-1 -->

## 2026-11-12 — Paso 6.07-1: la escritura del transporte

- **D1 · Los grupos se ordenan por clave**, con filtros y prefijo, no por ETA (ordenar por ETA agrupa toda la tabla). Va en 6.07-3.
- **D2 · Una declaración muestra sólo los vehículos que quien mira ve.** La cabecera, a quien ve al menos uno o tiene `logistica.aduana.gestionar`.
  Va en 6.07-3.
- **D3 · El canal de aforo se puede cambiar con la versión**, pero no vuelve a nulo: la composición sigue congelada. Va en 6.07-2.
- **D4 · El paso se parte en tres:** la escritura del transporte, la de aduana y las lecturas paginadas.
- **D5 · Contenedor y booking en mayúsculas y sin espacios**, vacío = nulo, sólo `A-Z 0-9 . / -` y hasta 40. No se valida el dígito de control ISO 6346:
  uno mal calculado frenaría cargas reales.
- **D6 · Una unidad sin fase no recibe contenedor:** `permite_contenedor` es de la fase.
- **D7 · Una naviera o puerto nuevo** debe existir, estar activo y, si la oferta del flujo para su tipo no está vacía, estar en ella. Lo ya guardado se
  conserva aunque salga de la oferta o se inactive.
- **D8 · ETA y arribo no pueden ser antes del zarpe**; se valida sólo si cambia alguna de las tres fechas. Las fechas van como `AAAA-MM-DD`.
- **D9 · `sigue_al_vehiculo` no se cambia aquí** (lo decide repuestos, 8.x); a un repuesto que sigue a su vehículo no se le pone naviera, contenedor ni
  booking.
- **D10 · El trigger mira la fase de la unidad dueña de la fila.** Un repuesto que sigue a su vehículo no frena vaciar el transporte del vehículo: queda
  para 8.08, que recrea `evaluar_requisitos`.
- **D11 · Con la esperada nula y la fila ya existente, PT409 siempre**, aun sin diferencias. Fuera de eso, sin diferencia no escribe ni mueve la versión.
- **D12 · Un grupo se lee y se aplica sobre a lo sumo 200 filas**; con más, `hay_mas` al leer y 22023 (`hint = 'grupo'`) al aplicar. Las notas no se
  aplican a un grupo: son de cada unidad.
- **D13 · Al aplicar, el permiso antes que la versión:** una unidad del grupo que no veo o no puedo editar da 42501, sin decir cuántas.
- **D14 · La carrera vive en `supabase/tests/areas/transporte/`** (como las de dinero y mover), no en `scripts/carreras/`; `scripts/carreras.mjs` sólo
  suma su import y su llamada.
- **D15 · `transporte_grupo` devuelve por unidad sus datos y si es `editable`:** 6.08 los necesita para «varios» y para apagar con motivo.
- **D16 · Para un repuesto, la clave es `repuestos.editar`** (la de la policy de antes).
- **D17 · No se borra una naviera que una unidad usa si su fase exige `transporte.naviera` como bloqueante:** el `on delete set null` dispara el
  trigger y da 23514. Es conducta nueva del catálogo; 6.08 la muestra con un mensaje humano. Un borrado de naviera a la vez que un aplicar al mismo
  grupo puede dar 40P01: es raro y se acepta.
- **D18 · Leer un grupo pide `logistica.ver` o `repuestos.ver` en algún origen, y aplicarlo, la clave de editar:** sin eso, 42501 antes de tocar nada.
  Si no, cualquier cuenta podría probar números de booking y saber si existen.
- **D19 · La fila de una unidad en la papelera no es del grupo:** nadie la ve ni la edita, y si contara, el grupo quedaría con `hay_ocultas` y sin poder
  editarse en bloque hasta purgarla o restaurarla.

<!-- paso:6.07-2 -->

## 2026-11-12 — Paso 6.07-2: la escritura de aduana

- **D20 · La cabecera tiene versión propia:** `declaracion_version()` reemplaza al trigger genérico, como `documento_version`. Poner vehículos toca la
  cabecera y mueve su versión aunque el cambio sea en la tabla hija.
- **D21 · Esperada nula sobre una declaración que existe → PT409**, como D11 del transporte. Crear es `p_id` nulo; con esperada, 22023. Una que no existe,
  PT409 «La declaración ya no existe».
- **D22 · El número se guarda tal cual, sin espacios alrededor**, 1 a 60. Despachante y depósito ≤ 200, notas ≤ 2.000, fechas sólo `AAAA-MM-DD`. Sin regla
  entre aceptación y vencimiento de tributos (nadie la pidió).
- **D23 · Poner y quitar piden ver cada vehículo** (`logistica.ver`): 42501 sin decir cuál. A lo sumo 200 por vez. Agregar uno ya vivo o quitar uno que
  no está no hace nada.
- **D24 · Un vehículo vivo en otra declaración: 23514 con el número de la otra.** Lo frena el índice único al escribir: si otra sesión lo está quitando,
  se espera y entra.
- **D25 · Agregar pide la regla `aduana` del flujo y una fase con `permite_aduana`.** Quitar no: salir siempre se puede, salvo con canal o si la fase
  exige la declaración.
- **D26 · No se pone canal a una declaración sin vehículos vivos:** congelaría una composición vacía.
- **D27 · El congelamiento vale también en la tabla**, por cualquier camino. La purga en cascada de un vehículo no la frena.
- **D28 · No se quita un vehículo si su fase exige `aduana.declaracion` o `aduana.canal` como bloqueante**, aunque el canal todavía no se cumpla.
- **D29 · Carrera propia de aduana** (quitar contra mover, pasar un vehículo entre declaraciones y el intercambio), en `supabase/tests/areas/aduana/`.
- **D30 · Las policies de leer no cambian aquí:** la lectura con D2 es `declaracion_leer`, en 6.07-3.
- **Un solo recorrido en orden de id al poner** (de la auditoría del plan): quitar todo y después agregar todo formaba un ciclo cuando dos personas
  intercambian vehículos entre dos declaraciones (40P01). Ahora toda espera va hacia un id mayor y el intercambio termina en 23514.

<!-- paso:6.07-3 -->

## 2026-11-12 — Paso 6.07-3: las lecturas de transporte y aduana

- **D31 · `pagada` se calcula sobre todos los vehículos vivos de la declaración, los vea o no quien mira:** es un hecho de la declaración. `vehiculos` y
  `faltan` cuentan sólo los que ve; `hay_ocultos` dice si hay otros, sin número. Sin vivos, `pagada` es falsa. Lo que se deduce, deliberado: con
  `pagada = false`, `faltan = 0` y `hay_ocultos`, quien mira sabe que a algún vehículo que no ve le falta el tributo (sí o no). `pagada` y `tributo` llegan
  a quien no tiene `logistica.gastos.ver`: es el estado del requisito `aduana.tributos_pagados`, no un monto ni un comprobante. Vivo = en la
  composición: un vehículo de la composición que está en la papelera entra en `pagada` y cuenta como oculto para todos.
- **D32 · Quién lista y lee:** con `logistica.aduana.gestionar`, toda declaración; con `logistica.ver`, la que tiene un vehículo vivo que se ve; sin
  ninguna de las dos, 42501 antes de leer.
- **D33 · Una declaración que no existe y una que no ves dan el mismo P0002.** Con la policy de D41, el select directo tampoco las distingue.
- **D34 · La lista de declaraciones descarta filas del índice** (filtros y visibilidad sin gestionar): la tabla es de volumen bajo y quien la usa a diario
  tiene gestionar. Sin siembra en `db:medir:volumen`; la prueba L4 fija el plan.
- **La lista de declaraciones recorre el índice por lotes de 200 y filtra en plpgsql:** con los filtros en la consulta, el plan genérico los creía
  selectivos y ordenaba toda la tabla.
- **D35 · `transporte_grupos` devuelve `{tipo, grupos, siguiente, cortada}` y mira a lo sumo 2.000 filas por llamada;** cada clave suma al menos 1.
  `cortada` = paró por el recorrido antes de llenar la página (la pantalla ofrece «Seguir buscando»). La lista de declaraciones no tiene ese tope
  (D34): si 6.09 mide que crece, que lo sume con su `cortada`.
- **D36 · Un grupo entra si alguna unidad que se ve cumple todos los filtros;** sus datos salen de las que se ven: el valor si coinciden, si no nulo y
  la clave en `varios`.
- **D37 · La visibilidad de los grupos se resuelve una vez** (orígenes de `logistica.ver`, `repuestos.ver`): equivale a `transporte_grupo`.
- **D38 · El registro en `paginas-en-la-base.ts` lo hace quien llame** (6.08, 6.09): la guarda exige que alguien en `src/` llame a cada RPC registrada.
- **D39 · El prefijo corta por la forma normalizada de la clave y el cursor es opaco:** una clave vieja en minúsculas (de antes de `transporte_guardar`)
  ordena, en ICU, dentro del bloque del prefijo y no corta la búsqueda; el cursor nunca se normaliza (D43). No se normalizan las claves viejas. El
  caso ICU queda razonado, no probado (PGlite ordena en `C`).
- **D40 · Filtros de grupos, lista cerrada:** `naviera`, `puerto_origen`, `puerto_destino`, `en_transito`, `prefijo`; un valor mal escrito, 22023 con la clave.
- **D41 · La policy de leer de `declaraciones_aduana` pasa a la regla de D2:** gestionar, o un vehículo vivo de la declaración que se ve con
  `logistica.ver`. Antes, con `logistica.ver` en cualquier origen un select directo leía toda cabecera. No se revoca el select.
- **D42 · `aplicado_en` de `logistica.aduana.gestionar` suma las lecturas y la policy.** El de `logistica.ver` (`puede_unidad`) no se toca.
- **D43 · El cursor de `transporte_grupos` es el id de una fila de `transportes`, no la clave** (de la auditoría del informe): con `cortada`, la última
  clave mirada podía ser de un grupo con sólo unidades que quien llama no ve, y siguiendo las páginas se recorrían esas claves. La llamada siguiente
  resuelve la clave por la PK; una clave o un id que ya no existe da 22023 `hint = 'cursor'` (la lista vuelve a empezar).
- **Para el coordinador:** filas propuestas para `docs/RENDIMIENTO.md`: «`/logistica/aduana` · `declaraciones_listar` · 50 (máx. 100) ·
  `declaraciones_aduana_creado_idx` · lotes de 200, filtros sobre el orden, volumen bajo» y «`/logistica/embarques` · `transporte_grupos` · 50 (máx. 100) ·
  índices parciales de booking y contenedor · recorrido ≤ 2.000 filas, `cortada`». Las filas de 6.08 y 6.09 suman el registro de D38 y el contrato de
  `transporte_grupos` (`siguiente`, `cortada`, `varios`).

<!-- paso:7.09-1 -->

## 2026-11-12 — Paso 7.09-1: base del módulo `chat` y la lista de conversaciones (parte 1 de 4 del 7.09)

- **D1** · Presencia y «escribiendo…» no entran (la recomendada de la fila 7.09). Cumplida.
- **D2** · La lista se actualiza por dos señales de Realtime, nunca `DELETE`: `mensajes` `INSERT` con `autor_id=neq.<yo>` (la RLS de
  `mensajes: leer` decide por suscriptor) y `conversaciones_miembros` `INSERT`/`UPDATE` con `usuario_id=eq.<yo>`. Ante cualquiera se relee la
  cabeza con `chat_conversaciones` (una sola relectura por ráfaga: espera de 250 ms). Cumplida (`infra/realtime.client.ts`).
- **D3** · Iniciar una directa buscará en `perfiles` bajo `perfiles: leer`, sin RPC nueva ni migración: el paso no toca la base. Es de la parte 2.
- **D4** · Las dos pantallas del celular van por CSS (`hidden md:flex` según haya `?c=`), sin medir el ancho; «Volver a la lista» es un
  `<Link href="/chat">` visible sólo en celular. Cumplida (`e2e/chat.spec.ts`, `movil`).
- **D5** · `chat` se prende en `navegacion.ts` en esta parte: `navegacion.test.ts` exige que `page.tsx` exista si `disponible` es `true`. El hilo
  dice «Los mensajes llegan con la siguiente parte.» hasta la parte 3.
- **D6** · La lista se lee con el mismo código en servidor (primera página, `composicion.ts`) y navegador («Ver más» y señales,
  `composicion.client.ts`): `infra/consultas.ts` y un parser Zod en `entities/conversaciones.ts` (un JSON mal formado es un `Resultado`).
- **D7** · Una `?c=` ilegible cuenta como sin selección; un GUID que no es mío dibuja «Esta conversación ya no es tuya» con «Volver a la lista».
  `leerConversacion` decide por la fila propia de `conversaciones_miembros` (con `chat.global` perdido, la base tampoco la devuelve), no por poder
  leer `conversaciones`. Cumplida (`e2e/chat.spec.ts`, tercera prueba).
- **D8** · Sin `chat.participar` la página dice «No tienes permiso…» con `puede()` y no lee la base. Cumplida (cuarta prueba).
- **D9** · Tope de lo cargado: `TOPE_DE_LO_CARGADO` (500) con `<AvisoDeTope>`; el camino a lo antiguo es abrir la directa por la persona (parte 2).
- **D10** · Cambio frente al plan: «99+» sale de `textoDeNoLeidos()` (puro, con test), no de `conteoAcotado`/`conteoCorto`: la base ya acota en 100 y
  esas funciones piden un conteo con `tope + 1` que aquí no hay. El nombre accesible de la insignia en 100 es «Más de 99 sin leer».
- **D11** · El tope sin assert de `docs/RENDIMIENTO.md` (una conversación que sube mientras se pagina) se deja: lo cubre `fundirPagina` al releer la cabeza
  (`entities/conversaciones.test.ts`: no borra lo cargado más abajo ni duplica).

<!-- paso:7.09-2 -->

## 2026-11-12 — 7.09-2

Siguen la numeración de la parte 1 (llegó a D11). Plan: `.piloto/planes/7.09-2.md`.

- **D12** — Un grupo se arma con 1 a 49 personas más quien lo crea (2 a 50 en total): espeja `chat_grupo_crear`, que rechaza 50 elegidas. El plan servido decía «2–50».
- **D13** — Cada acción es una Server Action sobre `RepositorioDeConversaciones` (`features` no importa `infra`); la RPC corre con la sesión de quien actúa y el campo del
  rechazo sale del `hint`. Éxito ⇒ `revalidatePath('/chat')`.
- **D14** — «Silenciar» y «Salir» viven en el «⋯» del encabezado del hilo. El diálogo de salir se monta en la lista porque un `DELETE` de miembro no genera señal de Realtime:
  la lista gana `quitar(id)` y se relee.
- **D15** — `?panel=nueva|grupo|salir` sin claves nombradas: abrir o cerrar un panel no toca `?c=` (con `claves: ['c']`, cerrar cerraría el hilo). Lo mismo valdrá para el panel de
  borrar de 7.09-4: `claves: ['mensaje']`, sin `c`.
- **D16** — El buscador de personas se copia dentro del módulo (sin importar `agenda` ni subirlo a `shared`); Enter en el campo no envía el formulario del grupo.
- **D17** — Se puede dejar un grupo y el canal global; una directa no (se silencia). Si la fila de la conversación abierta no está cargada, el diálogo abre y la base responde.
- **D18** — «Entrar al canal del equipo» sólo con `puede(permisos, 'chat.global')`; `ya_estaba` no es error. El nombre «Equipo» es del catálogo, no se escribe.
- **D19** — Quién no puede usar el chat se rechaza en la base (`23514`): el buscador lista a toda persona activa y sin bloqueo y el modal dice el texto de la base.
- **D20** — El modal de la directa es un `<Modal>` registrado como `sinFormulario`; el del grupo, un `ModalDeFormulario`. Los paneles van con `diferido()` y `useAbiertoAlgunaVez()`.
- **D21** — Nivel 1 (esta parte no toca `_shell`, `shared` ni la base); los e2e dirigidos en `escritorio` y `movil`.
- **Pendiente para la persona:** agregar o quitar miembros de un grupo (`chat_grupo_miembros`, ya en la base) no tiene pantalla en ningún paso de la fila 7.09 ni 7.10.

<!-- paso:7.09-3 -->

## 2026-11-12 — 7.09-3

Siguen la numeración de la parte 2 (llegó a D21). Plan: `.piloto/planes/7.09-3.md`.

- **D22** — La señal de `mensajes` de la lista pierde el filtro `autor_id=neq.<yo>`: sin eso, lo que escribo no mueve mi propia fila. La RLS sigue decidiendo qué llega. Para poder suscribirse sin filtro,
  `suscribirseACambios` (`shared/lib/supabase/canal.client.ts`) hace `filtro` opcional (no manda `filter`), con su prueba.
- **D23** — La primera página del hilo se lee en el navegador al montar (esqueleto mientras llega); se descartó `infra/mensajes.ts` de servidor. El hilo se reinicia con el `key` que ya tiene la página.
- **D24** — El `select` del hilo no trae el embed `responde`; la cita es de 7.09-4 (ensancha `COLUMNAS_DEL_HILO` y el esquema).
- **D25** — La señal relee los 20 más nuevos y funde por `id`; con hueco (más atrás y ningún `id` conocido) reemplaza lo enviado cargado y vuelve a ofrecer «Ver anteriores». Un `UPDATE` más viejo que esos 20 no se refresca.
- **D26** — Envío optimista sin `revalidatePath` ni `useEnLinea`: siempre se intenta; si no llega queda «No enviado · Reintentar» y reintentar reusa el mismo `id` y cuerpo (`repetido`). Los envíos van de a uno, en orden.
- **D27** — `chat_leer` va por una Server Action (`marcar-leido`), sin `revalidatePath`; un fallo no se dice y se reintenta con el siguiente cambio.
- **D28** — `<IrAUnaFecha>` sólo se ofrece al llegar al tope de 500, junto a `<AvisoDeTope>`. Mirando desde una fecha, el hilo no sigue lo nuevo ni marca leído; enviar vuelve a lo más reciente.
- **D29** — Fuera de la parte: separadores de día, borrador persistente, «no leídos desde aquí», adjuntos y fichas.
- **D30** — Nivel 1 (no toca `_shell`, `shared/ui`, la base ni `database.types.ts`; sí `shared/lib/supabase`, que `nivel.mjs` no cuenta como disparador); e2e dirigidos en `escritorio` y `movil`.
- **D31** — El aviso de largo del redactor y su botón viven en `redactor.tsx` (no hay `pie-del-hilo.tsx`); el cuerpo (cargando, error, vacío, lista) está en `cuerpo-del-hilo.tsx` y `hilo.tsx` sólo une hooks.

<!-- paso:7.09-4 -->

## 2026-11-12 — 7.09-4

Siguen la numeración de la parte 3 (llegó a D31). Plan: `.piloto/planes/7.09-4.md`. Las no mencionadas se cumplieron tal cual.

- **D32 (cambiada)** — `Mensaje.responde: CitaDeMensaje | null`, campo requerido. **Pero la cita no sale del embed** `responde:mensajes!…`: sobre `mensajes → mensajes` PostgREST da 400 con el nombre de la FK y un arreglo
  con la columna. Se lee en una segunda consulta por pk (`conSusCitas`, ≤ 21 ids, sólo con respuestas); si falla o la RLS no deja ver el original, queda sin cita y la burbuja dice «Mensaje no disponible».
- **D33** — Las reglas van en `entities/reglas-del-mensaje.ts`, no en `mensajes.ts`. Los tests de la cita se partieron a `mensajes-cita.test.ts` (el de `mensajes.ts` pasaba de 300 líneas).
- **D34** — Ventana de 15 minutos desde `creadoEn`, borde inclusivo; sólo texto propio y enviado.
- **D35** — `puedeBorrar` = enviado, no eliminado y (autor o `puedeModerar`, que llega de `puede(…, 'chat.moderar')`).
- **D36–D38** — Editar y borrar esperan a la base y se aplican por `reemplazar(id, …)`; el error queda dentro del editor o del diálogo; el borrado vive en `?panel=borrar-mensaje&mensaje=<id>`.
- **D39 (ajuste)** — El menú es de Base UI, no Radix: el foco no vuelve al «⋯» tras elegir una acción (`finalFocus`) y los renglones usan `onClick`. El reloj de `puedeEditar` se toma al abrir el menú.
- **D40–D43** — Cumplidas: la cita sobre el redactor se conserva al reintentar; los estados del hilo ya estaban (7.09-3) y se documentan en `docs/UX.md`; Nivel 1 con e2e dirigido en los dos proyectos; lo demás queda fuera.
- **D44** — El CI cayó en `e2e/cotizar-tarea-de-oro-recorrido.spec.ts` (escritorio): la entrada de Chat en la navegación suma una parada de Tab (59 → 60 la asesora; 55 → 56 la dueña); el celular no cambia. Contados de nuevo con el spec dirigido en los dos proyectos (6 ✓, `.piloto/salidas/7.09/recorrido.log`).

<!-- paso:9.07 -->

# 9.07 · Tablero: las métricas en la base (2026-11-12)

- **D1 · Excepción a «un número que se muestra nunca es un total exacto».** Un agregado de un período cerrado (las RPC `tablero_*`) se cuenta en la base, con ventana máxima de 366 días y por índice de fecha; si usa `count(`, con su motivo en `supabase/tests/escala.sql` (`tablero_cotizaciones`; `tablero_leads` suma con `sum` y no entra al registro). Las listas siguen igual. Escrita en `.claude/rules/escala.md`.
- **D2 · Conversión.** «Convertidos» = leads con `cliente_desde` en el período; «Tasa» = convertidos / creados del período, con 4 decimales y nula con `creados = 0`. Puede pasar de 1 (se convierten leads creados antes): no se recorta.
- **D3 · Los clientes de antes.** Quedan con `cliente_desde` nulo: no se sabe cuándo pasaron y no se inventa. `tablero_leads` devuelve `conversion_desde` (el día en que se aplicó la migración en ese entorno, `_tablero_conversion_desde()`) para que el widget diga «Desde <fecha>».
- **D4 · Alta directa como cliente.** Un lead que nace con un tipo de clase `cliente` (también por importación) queda sin fecha: sólo el paso de prospecto a cliente la pone, así una importación no infla la tasa.
- **D5 · De cliente a cliente.** Conserva la fecha; volver a prospecto la vacía. Nadie la escribe a mano (el trigger la repone).
- **D6 · «Finales».** Las cotizaciones creadas en el período que hoy son de clase final, cualquiera sea su estado: no hay fecha de cuándo se marcó final. Sumar esa fecha es otro paso.
- **D7 · Ranking por persona.** Por el dueño vigente del lead. Un lead sin dueño, o cuyo dueño está en una baja en curso (`_bajas_en_curso()`), cuenta en el total y no en el ranking (la regla de humo.sql: toda lectura que nombra a una persona dice quién se queda).
- **D8 · Ranking por origen de leads.** Por `leads.origen_lead_id`; el lead sin origen es un grupo con id y nombre nulos (la pantalla escribe «Sin origen»).
- **D9 · Alcance.** Quien tiene `tablero.metricas.ver` (global) cuenta toda la empresa, sin mirar carteras, niveles ni `cotizaciones.ver`: sólo hay cuentas y nombres de personas y orígenes, ningún dato de un lead ni monto.
- **D10 · Período.** Fechas inclusivas en la zona de `ajustes_empresa`, como intervalo semiabierto; nulas, al revés o de más de 366 días dan 22023 con su `hint`.
- **D11 · Orden de los rankings.** Más creados, más convertidos (o finales), nombre (nulos al final), id; sólo grupos con algo en el período; `*_hay_mas` dice si había más que el tope.
- **D12 · `cliente_desde` en la actividad.** Aparece en la foto que guarda `lead_auditar` como cualquier columna: no es privado (el cambio de tipo ya está en la misma foto). Recortarla es de la revisión de `registrar_actividad` del 9.01 (carril c).
- **D13 · Sin partir.** Una parte: tres migraciones (`tablero_cliente_desde`, `tablero_leads`, `tablero_cotizaciones`), un test SQL y los tipos.

<!-- paso:6.08-1 -->

## 6.08-1 — Catálogos de puertos y navieras (2026-11-12)

- **D1** (duda 1 de la fila) Sacar una unidad de un contenedor **no** es «editar el grupo»: se hace en el hueco de esa unidad (6.08-2); el grupo sólo aplica el mismo cambio a todas.
- **D2** (duda 2 de la fila) Los catálogos de puertos y navieras son de esta fase: la Fase 5 sólo los lee (`flujos`: «Se cargan en Logística»). La semilla trae 5 puertos y ninguna naviera.
- **D3** Sin «Eliminar»: borrar un puerto o una naviera deja nulos los transportes y vacía la oferta de los flujos (`ON DELETE SET NULL` / `CASCADE`); se desactiva.
- **D4** Escritura directa bajo la RLS (`logistica.catalogos.gestionar`), sin RPC ni migración: no otorgan permisos (como las categorías de gasto). Una escritura que deja 0 filas es «sin permiso».
- **D5** Un puerto sin país puede repetirse: la unicidad `(nombre, pais)` no cubre `NULL`. La action lo mira antes y rechaza igual que la base; una alta simultánea de dos personas puede duplicarlo y se tolera
  (se arregla desactivando uno) en lugar de agregar un índice por expresión (migración).
- **D6** El orden de los puertos es un número en «Editar» (como las categorías): intercambiar dos serían dos escrituras sin transacción. Las navieras no tienen `orden` y se listan por nombre.
- **D7** «Puertos» es la pestaña por omisión de Configuración › Logística (el primer catálogo de `CATALOGOS_DE_TRANSPORTE`, que `catalogos.ts` antepone).
- **D8** Desactivar no cambia lo guardado ni la oferta del flujo: `_transporte_validar` sólo frena lo nuevo y `flujo_oferta` devuelve `activo`. La ayuda del formulario lo dice.
- **D9** Sin versión en el catálogo (la tabla no tiene `actualizado_en`): gana el último, igual que las categorías de gasto; sin `<AvisoDeConflicto>`.
- **D10** (microdecisión) Un solo `CatalogoDeTransporte` (encabezado, cinco estados, lista) sirve a los dos catálogos; los formularios son dos hooks y dos modales porque los campos difieren. Un nombre se normaliza
  (recorta y colapsa espacios) antes de validar y guardar; el código se guarda en mayúsculas y sin espacios.

<!-- paso:6.08-2 -->

## 6.08-2 — El hueco «Transporte» de la unidad (2026-11-12)

- **D11** (microdecisión) Los campos van en tres `<Bloque>` abiertos (Ruta; Contenedor y booking; Fechas y notas) dentro del bloque del hueco: lo que pide la fila sin esconder nada. Un bloque con un error adentro se fuerza abierto.
- **D12** Sin `logistica.transporte.editar` del origen: los mismos campos apagados con lo guardado y el motivo escrito, sin «Guardar». Mientras `mis_permisos` no llegó, el formulario está apagado.
- **D13** Opciones del selector = lo que ofrece `flujo_oferta` (vacío = todos los activos) más lo ya guardado, siempre visible y rotulado («(inactiva)», «(fuera de la oferta)»): una desactivación no esconde un dato guardado (la base sólo frena lo nuevo).
- **D14** El flujo de la unidad se busca con `flujos` por origen, ámbito y `activo` desde el navegador (precedente `infra/documentos/tipos.client.ts`); no se cambia `Unidad`, que es del núcleo. No hay lector de la oferta para el navegador en `flujos` (es `server-only`): el hueco llama
  `flujo_oferta` y parsea con una copia de `ofertaDesde` (un área no importa otra).
- **D15** El formulario guarda un borrador de los campos tocados, no una copia de la fila: «Recargar» tras un conflicto trae la versión nueva y lo tocado sigue escrito; tras guardar, lo escrito se suelta cuando llega la versión nueva.
- **D16** La validación local repite las reglas de la base con sus mismos textos sólo para ahorrar un viaje, y sólo en lo que cambió; manda la base (su rechazo viaja por `hint`).
- **D17** Sin fila y sin campos tocados, «Guardar» está apagado: no se crea un transporte vacío.
- **D18** Las fechas son `date` (sin hora): `<input type="date">` y `AAAA-MM-DD` tal cual; no pasan por zona ni por `fechas.ts`.
- **D19** La unidad de repuesto no existe aún (8.13): el hueco sólo trata vehículos y, ante un repuesto, lo dice en una línea.
- **D20** Sin migración: la base de 6.07 cubre guardar, la oferta y los rechazos con `hint`.
- **D21** (corrige el plan) La base quita **todo** espacio del contenedor y del booking (`regexp_replace(v, '\s', '', 'g')`) y los pasa a mayúsculas: «ecmu 123» no es un error sino «ECMU123». La validación local hace lo mismo antes de revisar la forma.

<!-- paso:6.08-3 -->

## 6.08-3 — `/logistica/embarques`: embarques y contenedores (2026-11-12)

- **D22** Sin botón «Editar grupo» en esta parte: lo trae la 6.08-4 junto con su drawer (un control apagado sin destino confunde). Reversible.
- **D23** No se crea `pantallas/transporte-grupo.ts`: el área no declara ningún hueco propio en el grupo; lo que declaran `mover`, `documentos` y `dinero` se monta desde `src/app` (`embarques/huecos-del-grupo.ts`).
- **D24** Las vistas `?grupo=` son enlaces que no conservan filtros ni cursor (la clave de `q` y el cursor significan otra cosa en cada tipo), como las de Gastos.
- **D25** `DrawerDelGrupo` se registra `sinFormulario` (el resumen sólo muestra; cada hueco pregunta al cerrar por sí solo), con el argumento del panel de la unidad.
- **D26** Se omite «días en la fase» del resumen: `transporte_grupo` no lo trae y leerlo sería una lectura por fila (N+1, `escala.md`).
- **D27** Los huecos de grupo se dibujan por permiso en cualquier origen y sin mirar la regla de flujo: un grupo puede cruzar orígenes y flujos, y la base vuelve a exigirlo por unidad. Sólo con unidades visibles.
- **D28** El cursor de la lista es el `siguiente` opaco de la base (uuid) en `?cursor=`, validado con `z.guid()`; no se usa `leerCursor` de `shared` (su formato, instante + id, no aplica). No se toca `shared`.
- **D29** El filtro de estado se escribe «En tránsito» (sin fecha de arribo) / «Ya llegaron» (con arribo); «Todos» no manda nada.
- **D30** «Varias»/«Varios» y «—» se distinguen: un dato que difiere entre unidades se dice «Varias»; uno que ninguna tiene, «—». Un id de catálogo que no aparece (p. ej. un catálogo de más de 200) se dice «—», nunca el uuid.
- **D31** La unidad de repuesto aparece en el resumen como texto plano (sin enlace) hasta 8.13; la lista no las distingue.
- **D32** Sin migración: `transporte_grupos` y `transporte_grupo` (6.07) cubren la lista y el resumen.
- **D33** Sin `medir-*.sql`: no existe una sonda de volumen de transporte (sólo la prueba SQL de 6.07-3); la fila de `docs/RENDIMIENTO.md` dice «sin medir con volumen», como Gastos. Corrige la afirmación de la parte 1 de que la sonda ya existía.
- **D34** Los filtros de naviera y de puertos ofrecen sólo los activos de los catálogos (sin opciones, el filtro no se dibuja); el nombre de una fila sale de todos, activos o no. Un grupo cuya naviera se desactivó se ve por su nombre pero no se filtra por ella.
- **D35** La búsqueda `q` se manda como `prefijo` sólo si, además del mínimo del esquema, tiene tres `[A-Za-z0-9]` seguidos (la base los exige tras quitar espacios y pasar a mayúsculas): «ab-c» no filtra.

<!-- paso:6.08-4 -->

## 6.08-4 — «Editar grupo» y cierre de la fila 6.08 (2026-11-12)

- **D36** El formulario de «Editar grupo» **tapa** al resumen (un solo drawer a la vez, como aduana D8); cancelar y guardar vuelven al resumen con `replace`. Dos drawers apilados son más difíciles de cerrar y de probar, y aduana ya tiene el patrón.
- **D37** Sin `logistica.transporte.editar` ni `repuestos.editar` en ningún origen no se dibuja el botón y `?panel=editar-grupo` se ignora. Con permiso pero con un grupo que no se puede editar desde aquí (más de 200 unidades, unidades que no se ven o que no se pueden editar), el botón sale apagado con el motivo y una URL escrita a mano abre el drawer con el motivo y sin campos. La base manda siempre.
- **D38** «Varios» = las unidades **vistas** difieren (`valoresComunes` sobre `transporte_grupo`). Un campo en «Varios» **no se vacía**: vacío = no tocar. Vaciar el dato de todas se hace en un campo común.
- **D39** `notas` queda fuera del grupo: la RPC no las admite y son de cada unidad.
- **D40** Campos propios del grupo (`campos-del-grupo.tsx`) y no los del hueco: no se toca 6.08-2, no hay notas ni enlace a Configuración, y las opciones son todos los activos (un grupo cruza flujos; la oferta y la fase las revisa la base por unidad y rechaza con «<título>»).
- **D41** Los rechazos se dicen «No se cambió ninguna: <motivo>» (es todo o nada); «Recargar» = `router.refresh()` y conserva lo escrito (borrador por campo tocado).
- **D42** Si se cambia el contenedor o el booking del tipo, el resumen sigue abierto bajo la clave nueva que devuelve la base; no se avisa de una fusión con otro grupo que ya la tuviera.
- **D43** El e2e de `configuracion-logistica` (crear una naviera y verla ofrecida) ya existe desde 6.08-1; no se repite.
- **D44** Sin migración y sin auditor: pantalla sobre una RPC existente, sin permiso ni dato nuevo.
- **D45** Las reglas van en `entities/transporte/edicion-del-grupo.ts` y no en `grupos.ts` (267 líneas: pasaría de 300). Se aparta de la fila sólo en el nombre del archivo.
- **D46** El e2e arma un grupo en el que difieren el ETA **y** el zarpe (sólo la primera unidad tiene zarpe), así que esperaba un «Varios» y hay dos: el plan lo había supuesto de un solo campo. La prueba comprueba los dos y que sólo se toca el ETA.

<!-- paso:6.09-1 -->

## 6.09-1 — Aduana de lectura (2026-11-12)

- **D1** «Pagada» y «Faltan los tributos de N» salen sólo de la base (`pagada`, `faltan`); nunca se calculan en el cliente. Con `hayOcultos` y `faltan > 0` el texto agrega «y de unidades que no ves»;
  ya pagada no se dice nada de ocultos; sin vehículos, «Sin vehículos».
- **D2** El vencimiento usa el día de la empresa (`diaEnZona`): «Vencida el …» si pasó y no está pagada, «Vence hoy», «Vence mañana», «Vence en N días» (hasta 7), si no «Vence el 10 ene 2027». Una pagada
  muestra la fecha sin alarma. Siempre texto; el color sólo refuerza.
- **D3** El canal se dice con su texto («Verde», «Amarillo», «Rojo», «Sin canal»); los valores salen del tipo generado y el texto de un `Record` exhaustivo.
- **D6** Quien tiene `logistica.aduana.gestionar` y no `logistica.ver` no entra a la página ni ve el enlace (la página exige `logistica.ver`): lo más conservador.
- **D8** La lista abre el resumen por `?declaracion=<id>` en un `<Drawer>`; el alta y la edición (6.09-2) van por `?panel=` y no conviven con él.
- **D9** «Unidades» es el número de la base (acotado a 201: «más de 200»), nunca un total exacto.
- **D11** Sin paginación numerada: «Siguiente» por cursor `(creado_en, id)` y «Volver a las más recientes»; sin «Anterior».
- **D13** El hueco lee «Tributos pagados» de `declaracion_leer` (sin montos, funciona con sólo `logistica.ver`); si la unidad no está entre las 200 que trae, dice «Abre la declaración para ver los tributos.».
- **D14** El hueco pide `logistica.ver` y la regla `aduana`; sin declaración dice «Esta unidad no está en ninguna declaración.» con «Ver declaraciones».
- **Tributos en la lista:** el filtro «pagada» es una elección de tres (todas, pagadas, con tributos pendientes) y no un booleano: un «No» tri-estado no filtraría y el chip diría lo contrario.
- **Sin `medir-*.sql`** (tabla de volumen bajo, D34 de 6.07).

<!-- paso:6.09-2 -->

## 6.09-2 — Aduana: escribir (2026-11-12)

- **D15** El buscador de vehículos busca al enviar (Enter o «Buscar»), no con un debounce a cada letra: una petición por intención, sin temporizadores, y una respuesta vieja no pisa a una nueva. El mínimo (3 letras o números) es el mismo que el de la lista.
- **D16** El alta y la edición no convive con el resumen (D8): el formulario es un panel propio por `?panel=` que la página dibuja leyendo la declaración en el servidor (`shallow: false`); guardar o cancelar vuelve al resumen con `replace` para que «atrás» no reabra el formulario.
- **D17** `?panel=canal` va sobre el resumen sin tocar `?declaracion=`: se abre con `usePanelPorUrl(PANEL_CANAL)` sin claves extra, así abrir y cerrar sólo escriben `?panel=`.
- **D18** Tras un conflicto de versión el formulario y la composición guardan la versión con la que chocaron: «Recargar» (`router.refresh()`) trae la declaración nueva y lo escrito se queda; el aviso se apaga solo cuando la versión cambia. El borrador se compara contra la versión nueva.
- **D19** Un vehículo ya marcado para quitar o ya agregado por otra persona se descarta solo al releer la declaración; «Guardar vehículos» manda sólo lo que aún aplica.
- **D20** El e2e no consulta la lista por rol mientras hay un panel modal abierto (el resto de la página queda oculto para el árbol de accesibilidad): el «Faltan los tributos de 2» se lee en el resumen y la fila «Pagada» se lee tras recargar la página.

<!-- paso:6.12-1 -->

## 6.12-1 — Alertas y bandeja de logística: la base (2026-11-12)

- **D1 · «Trabado»:** una unidad **demorada** a la que le falta al menos un requisito **bloqueante** para entrar a su fase siguiente (la activa de menor
  `fases.orden` entre las que tienen transición desde la suya); se evalúan sólo las primeras 50 demoradas que ve quien mira. Sin transición de salida no
  está trabada. El motivo es la descripción del primer requisito incumplido por `fases_requisitos (orden, id)`. Cierra el abierto «Trabado no está definido».
- **D2 · A quién se avisa la demora:** a quien tiene `flujos.mover`, `logistica.ver` y `vehiculos.ver` del origen; manda el menor alcance de las tres (con
  `propios`, la unidad que creó o la de un lead de su cartera). Nadie recibe un aviso de lo que no puede abrir. Quien está en una baja en curso deja de contar
  su cartera.
- **D3 · Cada cuánto:** `alertas-demora` cada hora en el minuto 12; `alerta_cada_horas` nulo = 72 h. `documentos-vencimientos` a las 11:15 UTC (07:15 en
  America/La_Paz).
- **D4 · Reabrir** es la misma fila (el antispam deja una abierta por persona, tipo y unidad): sin leer, `creado_en = now()`, título y cuerpo al día. El
  primer aviso es un insert y ya empuja si `push_web` está activa (`trg_notificaciones_push`, 7.03); reabrir es un update y no empuja.
- **D5 · Después de accionada** (abrir un `demora_fase` lo acciona): no se avisa de nuevo hasta pasado `alerta_cada_horas` desde el último aviso de la
  fase actual; uno anterior a `fase_desde` no cuenta.
- **D6 · Vencimientos:** sólo documentos de vehículos (los de repuestos, Fase 8) que todavía no vencieron (`vence_el >= hoy`, el día de la empresa);
  una vez por persona y documento desde que empieza su ventana (`vence_el - aviso_dias`, medianoche de la empresa): si alguien corre la fecha y la ventana
  vuelve a abrirse, avisa otra vez. Destinatarios: `logistica.documentos.subir` del origen con la regla de D2. Con `aviso_dias` mayor que 90, la purga diaria
  puede borrar el aviso leído y se avisa dos veces: se acepta.
- **D7 · Textos** (en la base): `Vehículo demorado en «<fase>»` / `<título> lleva <N> días en la fase (el límite es <D>)`; `Documento por vencer:
«<tipo>»` / `<título> · vence el <d> <mes> <aaaa>.` más `Sube el nuevo para renovarlo.` o `Pide uno nuevo antes de que venza.`. El mes sale de un
  arreglo fijo, no de `lc_time`. Ruta: `/logistica/vehiculo/<id>`.
- **D8 · Las pruebas de los jobs** van en `supabase/tests/areas/alertas/jobs.sql`, no en `supabase/tests/jobs.sql` (ése es de los jobs de funciones edge).
- **D9 · Sin candado en el job:** si alguien mueve la unidad mientras corre, puede quedar abierto un aviso de la fase anterior; se cierra al abrirlo o al
  volver a moverla. Hacer esperar a quien mueve sería peor. Para achicar la ventana, cada escritura vuelve a pedir que la unidad siga en esa fase con ese
  `fase_desde`.
- **D10 · Índice nuevo** `notificaciones_referencia_idx`: «ya avisé» y «cerrar al mover» buscan por unidad o documento y el antispam empieza por
  `usuario_id`. Con él el paso es Nivel 2: el e2e completo lo corre el CI del PR.
- **D11 · Topes por corrida:** 2.000 unidades y 2.000 documentos, de a 200 por cursor. Con más de 2.000 demoradas a la vez, las más nuevas esperan.
- **D12 · Sin `medir-*.sql`:** rangos acotados de índices ya medidos (`vehiculos_cadena_idx`, 6.02), una cola corta y jobs con tope.
- **D13 · Firma:** `alertas_demora()` conserva `returns integer`: cuántos avisos intentó (la puerta de 7.01 puede descartar en silencio).
- **D14 · Orígenes de la bandeja:** todos los que la persona ve, activos o no. «Por aprobar» lista sólo documentos de vehículos (los de repuestos, 8.05).
- **D15 · La papelera no cierra avisos abiertos:** la unidad borrada ya no alerta; el aviso viejo muere al abrirlo o con la purga.

<!-- paso:6.12-2 -->

## 6.12-2 — La bandeja de logística en Inicio (2026-11-12)

- **D16 · «Ver todas».** «Alertas por demora» → `/logistica?origen=<origen de la primera fila>&demoradas=si`: sin `origen` la cadena abre la primera
  pestaña y cambiar de pestaña suelta los filtros, así que una demora de otro origen no se vería. «Documentos por aprobar» → `/logistica?por_aprobar=si`
  (sus filas no traen el origen). «Vehículos trabados» **no lleva** «Ver todas»: la cadena no tiene un filtro de trabados, y mandar a las demoradas
  mostraría unidades que no están trabadas.
- **D17 · Una lectura para los tres bloques:** `bandejaLogistica(tope)` va memorizada por request con `cache()` de React, así los tres bloques de la misma
  pantalla hacen una sola llamada a `logistica_bandeja`. El `tope` lo pasa el bloque (`TOPE_DE_BLOQUE`): `logistica` no importa `tablero`.
- **D18 · El título es el de la base** (`vehiculos.titulo`), sin el campo principal de 6.13: para nombrarlo habría que leer los atributos de cada fila. La
  fase y el enlace al panel identifican la unidad.
- **D19 · Textos de las filas:** demorada, `«<fase>» · Desde hace N días en esta fase` (el texto del panel de la unidad, del núcleo: el de la tarjeta es del
  área `cadena` y un área no importa otra); trabado, `Falta para «<fase siguiente>»: <motivo>` (el motivo de la base ya dice «Documento: <tipo>»); por
  aprobar, `<tipo> · subido <hace…>`. Las rutas de «Ver todas» las arma cada bloque en `tablero` con las claves de URL que exporta el área `cadena`.
- **D20 · Un fallo de la lectura apaga los tres bloques** (es una sola llamada): cada uno dibuja `<ErrorDeBloque/>` con «Reintentar».
- **D21 · El spec viejo de Inicio** («un bloque de otra fase todavía muestra su vacío») miraba «Vehículos trabados», que ahora depende de la base; pasa a
  mirar «Esperas que destraban vehículos», que sigue hueco hasta la Fase 8.
- **D22 · El e2e corre en `escritorio` y `movil`** (Inicio no es Configuración). En el celular la cadena muestra una fase a la vez: el spec elige la pestaña
  de la unidad si está la lista «Fases», sin preguntar por el proyecto.
- **D23 · `documento_por_vencer` en el catálogo:** icono `FileClock`, `accionAlAbrir: true` (abrirlo lleva al panel donde se sube el nuevo), etiqueta
  «Vencimientos», descripción «Cuando un documento de una unidad está por vencer.». Las preferencias de push suman la fila solas.

<!-- paso:7.10-1 -->

## 2026-11-12 — 7.10-1

Plan: `.piloto/planes/7.10.md`. Las no mencionadas se cumplieron tal cual (D5, D8 y D9 son de las partes 2 y 3).

- **D1** — El 7.10 se parte en tres partes que cierran solas: leer y dibujar (esta), el selector `#`, y `/tarea` y `/evento`. En el e2e de esta parte la mención se siembra por SQL.
- **D2 (desviación de la fila)** — El drawer de la mención es **propio del chat**: muestra lo ya leído y un enlace «Abrir en Leads|Vehículos|Cotizaciones». No reusa `DrawerDeLead`, `ResumenDeVehiculo` ni `ResumenDeCotizacion`: ninguno sale por `client.ts` y
  se montan con las filas, orígenes y permisos que trae la página de su lista. Reversible: se cambia el cuerpo del drawer sin tocar la URL ni el parser.
- **D3** — «Eliminado» sólo cuando se sabe (la fila vino con `eliminado_en` o la FK de la ficha quedó nula). Un lead purgado, para quien no lo ve, se lee «No tienes acceso…»: decirlo distinto filtraría existencia sin una función `security definer`.
- **D4** — El chip de persona no abre drawer (sólo hay un nombre); `?mencion=usuario:<id>` se limpia como un valor ilegible. Reversible con «Escribirle por chat» (7.11).
- **D6** — La interfaz no envía fichas de lead, vehículo o cotización; si llega una (otro cliente), se dibuja como mención.
- **D7** — La edición de un mensaje con menciones no cambia en esta parte; 7.10-2 manda `menciones` también al editar.
- **D10 (ajuste)** — Un chip «No tienes acceso…» o «Eliminado» (de lead, vehículo o cotización) es un botón que abre el drawer, que dice lo mismo sin ningún dato ni enlace (así el clic de la fila del plan es alcanzable). La persona sin acceso es texto.
- **D11 (ajuste)** — La mención abierta por una URL pegada (que el hilo no leyó) se pide con la misma lectura de una referencia (`adicional` de `useReferenciasDelHilo`, memorizada por el texto de la URL para no repetirla en cada dibujo).

<!-- paso:7.10-2 -->

## 2026-11-12 — 7.10-2

Plan: `.piloto/planes/7.10-2.md`. Cierra la D7 de 7.10-1 (editar manda `p_menciones`).

- **D10** — La consulta del `#` es una palabra sola, sin espacios: un nombre de dos palabras se halla por una de ellas. Reversible: cambiar la expresión de `consultaAbierta`.
- **D11** — Dos referencias con la misma etiqueta se distinguen con « (2)» sólo en el campo; el cuerpo guarda el token.
- **D12** — El campo es un `<textarea>` plano: `#Nombre` no se resalta ni se protege; si se edita, queda como texto y no menciona.
- **D13** — El panel va dentro del formulario, sobre el campo, no como popover (no pelea el foco y se prueba igual).
- **D14** — Un envío rechazado por una mención (ya no la ves) queda «No enviado» con su motivo; no se quita la mención en silencio.
- **D15** — Se puede mencionar a cualquier persona activa y sin bloqueo, sea o no miembro; la base sólo avisa a los miembros vigentes.
- **D16** — No se ofrece mencionarse a uno mismo (`leerPersonas` excluye a quien escribe).

<!-- paso:7.10-3 -->

## 2026-11-12 — 7.10-3

Plan: `.piloto/planes/7.10-3.md`. **Corrige la D8 de 7.10**: suponía que un evento privado llegaba a las personas elegidas y la base lo rechaza (los destinatarios sólo valen con visibilidad `seleccionados`, que pide `agenda.eventos.publicar`).

- **D17** — `/evento` con invitados es un evento «para seleccionados» y pide `agenda.eventos.publicar`; sin ese permiso nace privado y sin invitados, y la ficha dice «Evento no disponible» a los demás miembros. No se otorga nada.
- **D18** — `/tarea` y `/evento` se reconocen al enviar (Enter o el botón), con un aviso bajo el campo; un menú de comandos con `/` queda fuera. Reversible: sólo cambia `useRedactor`.
- **D19** — El responsable y los invitados se eligen con `SelectorDePersonas` de agenda (≥ 3 letras), no con la lista de todos los miembros: el canal global no tiene tope. La tarea sólo ofrece a quien puede recibir y es miembro (`agenda_quienes_reciben` con la conversación).
- **D20** — En una directa la otra persona viene elegida (responsable o invitada) y se puede quitar. Sin `agenda.tareas.asignar`, la tarea es de quien la crea.
- **D21** — Sólo el responsable completa o reabre desde la ficha; el creador, que también puede en la base, lo hace en la agenda (enlace en la ficha). Reversible: `puedeCompletarDesdeFicha`.
- **D22** — El título de partida (lo escrito tras el comando) vive en estado y no en la URL: recargar con el panel abierto lo abre vacío.
- **D23** — Sin Realtime de tareas: si otra persona completa, la ficha lo muestra al releer el hilo.
- **D24** — El drawer de «Nueva tarea» no reusa el panel de agenda (monta calendario, `hoy` y el detalle); los campos y las reglas sí vienen de agenda por `client.ts`.
- **D25** — La tarea del chat nace sin vencimiento (opcional) y el evento empieza mañana a las 09:00 de la zona de la empresa; no hay descripción ni lugar en el formulario corto.

**Para `docs/DECISIONES.md` al cerrar el 7.10** (las de las tres partes): D2 y D3 de 7.10-1 (drawer propio del chat; «purgado» y «no lo veo» no se distinguen), D10, D12 y D15 de 7.10-2 (una palabra tras el `#`; campo plano; cualquier persona activa) y D17–D25.

<!-- paso:7.13-1 -->

## 2026-11-12 — 7.13-1

- **La visita va por Server Action**, no por un RPC del navegador: es una escritura (D16 de 7.12-2). Cuesta un POST más al abrir una ficha; ningún spec que cuenta acciones lo notó.
- **La lista de atajos es un `Dialog` sin URL**, no un `<Modal>`: es una ayuda de sólo lectura, sin nada escrito que perder.
- **La lista sale del catálogo `ATAJOS`**: un atajo nuevo aparece solo y `teclasDelAtajo` falla en test si no se puede mostrar.
- **`<RegistrarVisita>` va después de las salidas «no disponible»** de cada ficha: lo que la RLS esconde no deja marca.

<!-- paso:7.13-2 -->

## 2026-11-12 — 7.13-2

- **D4 · Un texto que parece teléfono no pide la sección de leads.** `pareceTelefono` (≥ 7 dígitos, sólo separadores, sin `#`) la omite y el estado `listo` trae `porTelefono`
  para decir «No se busca por teléfono». Vehículos (VIN, lote) y cotizaciones sí se piden. Costo: un número de lead de 7 o más dígitos sin `#` no se encuentra por su número; con `#` sí. Reversible borrando una línea del hook.
- **D5 · «Últimos abiertos» sin memoria:** se releen cada vez que la paleta se abre, porque las visitas cambian con cada ficha.
- **D6 · `reposo` y no «vacío»:** bajo el mínimo (o cerrada) se muestran «Últimos abiertos» y acciones; la parte 3 no necesita un estado «mínimo».
- **D7 · El estado se deriva** de lo guardado y de una clave en vez de un `setState` en el efecto: sin parpadeo de la lista vieja y sin `react-hooks/set-state-in-effect`.
- **D8 · Las acciones se filtran en `entities`, sin mínimo y sin base:** valen sin red y con texto corto.
- **D9 · Los hooks reciben las lecturas por argumento** (con `composicion.client.ts` por defecto): el test no mockea módulos.
- **«Sin conexión» no es un código de `ErrorApp`:** `errorDePostgrest` da `inesperado` y cambia sólo el mensaje; se decide con `!navigator.onLine` o `MENSAJE_SIN_CONEXION` (`estadoDeError`). `MENSAJE_SIN_RESPUESTA` queda como `error` con «Reintentar».
- **El test del hook mockea `server-only`:** `leads/client` reexporta una Server Action y en Vitest el import llega entero (el mismo `vi.mock` que usan otras pruebas).

<!-- paso:7.13-3 -->

## 2026-11-12 — 7.13-3

- **D1 · «Ver atajos» cierra la paleta y abre la lista de `?`** en el mismo estado del hueco (`HuecoBuscador`).
- **D2 · `Ctrl+K` con la paleta abierta no alterna:** es idempotente como `?`; se cierra con Esc.
- **D6 · «Ver todos en Leads» sólo sale si la sección de leads trae filas;** lleva el texto interpretado (`#12` queda `#12`).
- **D7 · Las acciones «ir a» incluyen las secciones de Configuración visibles** (≈ 30 acciones para la dueña). Costo medido: +7 KB en el documento de cada pantalla (tope de `/perfil` 96 → 103 KB). Reversible quitando `configuracion` de `accionesDeLaPaleta`.
- **D8 · Enter navega con `router.push`,** no con `<Link>`: una fila de cmdk no es un enlace; Ctrl+clic no abre pestaña nueva.
- **Corrección de V32:** `useAbrirNuevoLead` no envuelve a `usePanelDeAlta` (registraría dos veces la vuelta del foco); lee sólo `panel` y llama `abrirConVuelta`. Vive en el mismo archivo que `usePanelDeAlta` porque
  `scripts/guardas/paneles-con-vuelta.test.ts` exige las dos funciones de la vuelta en todo archivo con `history: 'push'`.
- **Grupos de la paleta:** «Crear», «Navegar» y «Ayuda» (el plan decía «Ir a»; las acciones se llaman «Ir a …» y el grupo repetía el texto). Sin token `--color-ink-muted` en el diseño: la segunda línea de las filas usa `--color-ink-soft`.
- **El foco del alta tras la paleta:** la acción se ejecuta en el siguiente macrotask tras cerrar; el e2e confirma que el foco queda dentro del panel.

<!-- paso:8.01-1 -->

# 8.01-1: decisiones (2026-11-12)

- **D1 · El HTML del sitio lo deriva la base** (duda 1 de la fila; cierra la contradicción 4 de la Fase 8, «Tiptap saneado» sin con qué). El editor
  manda un documento de ProseMirror; `_web_doc_html()` lo valida contra una lista blanca y escribe el HTML (como `_seguimiento_detalle()` en leads). Sin
  saneador de HTML ni dependencia nueva. Espejo en `src/modules/web/entities/contenido/doc.ts` con la misma tabla de casos.
- **D2 · `legales` = `{terminos|privacidad: {titulo, doc, html, actualizado_en}}`** (duda 2). `html` y `actualizado_en` los pone
  `trg_web_ajustes_legales`, escriba quien escriba (también `service_role`); `actualizado_en` cambia sólo si cambió el título o el documento. La
  migración pasó lo guardado por la misma validación y se detiene si una clave no cumple (en la nube no hubo pantalla de legales: se espera `{}`).
  **Contrato con el repo del sitio:** `web.ajustes.legales` cambia de forma; el sitio dibuja `legales.<clave>.html` y `titulo`.
- **D3 · La política de la cola la cambia quien tenga `web.cola.gestionar` o `web.ajustes.gestionar`** (duda 3; cierra la contradicción 2). Las claves
  `cola_activa`, `ttl_contacto_minutos`, `dias_pegajoso`, `max_abiertas_default` y `max_intentos`; lo demás pide `web.ajustes.gestionar`. El permiso se
  mira por las claves que llegan, no por las que cambian: la pestaña «Ajustes» (8.01-4) manda sólo las del sitio.
- **D4 · Imagen del documento = `{type: 'image', attrs: {ruta, alt?}}`**, con `ruta` relativa al bucket público `web` (letras, dígitos, `_`, `-`,
  carpetas y extensión `webp|png|jpg|jpeg` en minúsculas). Sale `<img data-ruta="…" alt="…">` y el sitio arma la URL pública, como ya lo hace con
  `portada`. Un `src`, un esquema u otro host se rechazan. **Contrato con el repo del sitio.**
- **D5 · Fuera de la lista blanca se rechaza (22023, hint `doc`), no se recorta**: el editor (8.03) limpia antes de mandar.
- **D6 · `minutos_lectura` lo calcula sólo la base**: palabras / 200 hacia arriba, al menos 1; sin palabras, nulo. No se espeja en TS.
- **D7 · Los legales no llevan imágenes** (nadie cuenta sus rutas) y no pueden quedar vacíos.
- **D8 · Una guía de antes sin documento conserva su HTML** mientras nadie escriba el cuerpo (la migración no borra contenido), pero una guía publicada
  siempre lleva el HTML derivado: la migración despublica las publicadas sin documento (con `raise notice` de cuántas) y publicar recalcula desde el
  documento. El HTML heredado no está saneado: por eso no se sirve.
- **D9 · `redes` admite `facebook`, `instagram`, `tiktok`, `youtube`, `x` y `linkedin` (`https://`, hasta 500); `seo`, `titulo` (70) y `descripcion`
  (160).** Se reemplazan enteros; un valor nulo o vacío omite la clave. Ampliar es una migración.
- **D10 · `web_testimonio_consentir` y `web_testimonio_retirar` llevan `p_actualizado_en_esperado`** aunque la fila las nombre sin él (`migraciones.md`:
  toda RPC de edición). Retirar uno ya retirado devuelve la versión sin escribir.
- **D11 · El canal del consentimiento es texto libre de 1 a 80** (la pantalla de 8.02 ofrece sugerencias). Registrarlo de nuevo tras retirarlo lo reactiva.
- **D12 · La migración despublicó los testimonios publicados sin el trío**: la vista ya no los mostraba; así el trigger no rompe sus próximas escrituras.
- **D13 · `aplicado_en` de `web.ajustes.gestionar` pasa a `web_ajustes_guardar`** y el de `web.cola.gestionar` suma la política de la cola, en la
  migración y en el seed (auditoría del plan).
- **D14 · Los ayudantes del documento y de los ajustes no son superficie de PostgREST**: sin `execute` para `anon` ni `authenticated`; los usan triggers y
  RPC `security definer`.
- **D15 · El consentimiento está atado al texto**: en un testimonio con consentimiento registrado, cambiar `cliente`, `texto` o `foto_ruta` anula el
  consentimiento y lo despublica (auditoría del plan: la persona consintió ese texto y esa foto). Cambiar la ciudad o el vehículo apaga sólo el permiso
  de mostrarlos (`consent_ciudad`, `consent_vehiculo`) y el testimonio sigue publicado (auditoría del informe); cambiar el orden no toca nada.
- **D17 · Queda para después (auditoría del informe, menores):** la migración no vuelve a validar `redes` ni `seo` ya guardados (en la nube nunca hubo
  pantalla; se validan al guardar por la RPC); `_web_doc_nodo` y `_web_ajustes_objeto` pasan las 80 líneas por función: se parten cuando se toquen.
- **D16 · La RPC no crea la fila única de `ajustes_web`**: la crea el seed y la migración (`on conflict do nothing`); un `insert … on conflict` en cada
  llamada dispararía los triggers por sentencia (revalidar) aunque no escriba.

<!-- paso:8.01-2 -->

# 8.01-2: decisiones (2026-11-12)

- **D1 · La rueda es del área `turnos`** (lo dice la fila). El componente va en `features/turnos/rueda/components/`, un caso dentro del área (como
  `logistica/features/mover/lote/`), y deja lugar a otros casos de turnos (8.05).
- **D2 · La dirección pública es del área `sitio`.** `infra/queries/sitio.ts` pasa a `infra/sitio/direccion-publica.ts` (un archivo, una
  responsabilidad: 8.01-4 suma el escritor al lado) y la interfaz a `entities/sitio/repositorios.ts` (en la raíz de `entities/` sería núcleo).
- **D3 · Hay `areas/nucleo/` aunque hoy esté vacío:** lo exige el modelo (las guardas de `logistica` y `repuestos`) y da lugar a lo compartido sin tocar
  las entradas de la raíz.
- **D4 · Sin `features|entities|infra/nucleo/` vacíos:** la guarda no los pide; los crea quien los llene.
- **D5 · La guarda nombra el área de una pantalla con `PANTALLAS_DE_AREA` antes de mirar el prefijo.** `pantallas/perfil.ts` no cambia de nombre (la
  fila) y es de `turnos`; los huecos `sitio-guias|faqs|testimonios` (8.01-3) reexportarán `features/contenido/`. Sin el mapa, `perfil` sería núcleo y
  el núcleo no importa áreas. Es una tabla: reversible. `htmlDelDocumento` no sale por `areas/contenido/` hasta que alguien lo use (8.03).
- **D6 · La guarda vive en `scripts/guardas/areas-b/`** (del carril B), como la de `repuestos` en `areas-c/`, y no se registra en ningún archivo del
  carril A: es un `*.test.ts` que vitest descubre.

<!-- paso:8.01-3 -->

# 8.01-3: decisiones (2026-11-12)

- **D1 · El hueco es `HuecoDePestana<P = never> = ComponentType<P> | null`**, en `entities/nucleo/hueco-de-pestana.ts` (lo usan `sitio` y `contenido`).
  Nulo = la pestaña no existe; el paso que lo llena declara sus props. El `| null` se queda en el tipo aunque se llene: sin él, `no-unnecessary-condition`
  avisaría en `pestanas.ts`.
- **D2 · Sin pestañas llenas, «Sitio web» no figura en el hub** (precedente `SECCIONES_DE_LOGISTICA`): `secciones.ts` importa `SECCIONES_DE_WEB` (0 o 1),
  no `SECCION_DE_WEB` suelta como decía la fila; el efecto es el que la fila pide (nadie ve una tarjeta que lleva a nada).
- **D3 · La tarjeta se abre con las claves de las pestañas llenas**, no de todas: al llenarse sólo «Ajustes», quien tiene sólo `web.contenido.gestionar` no la ve.
- **D4 · Por URL:** sin ninguna clave de las pestañas, «No tienes permiso»; con alguna pero sin pestaña llena para esa persona, «Por ahora no hay nada que
  configurar aquí.» (como Logística).
- **D5 · `/configuracion/cola-web` es del 8.04:** aquí sólo `RUTAS.configuracionDeColaWeb`, sin carpeta ni sección vacía.
- **D6 · `sitio-legales` es del área `contenido`** en `PANTALLAS_DE_AREA` de la guarda: el 8.03 la llena desde `features/contenido/legales/`. El permiso sigue
  siendo `web.ajustes.gestionar` (es de la pestaña, no del área).
- **D7 · Textos:** «Sitio web» con `GlobeIcon`; pestañas «Ajustes», «Legales», «Guías», «Preguntas frecuentes», «Testimonios», en el orden de la fila.
  Reversibles: los ajusta el paso que llena cada una.

<!-- paso:8.01-4 -->

# 8.01-4: decisiones (2026-11-12)

- **D1 · El formulario de «Ajustes» viaja diferido** (`diferido()`, `features/sitio/ajustes/components/diferidos.tsx`). `pestanas.ts` importa el hueco para saber
  si está lleno y el hub (`secciones.ts`) importa `pestanas.ts`: con el componente directo, el formulario y su action entrarían al grafo de `/configuracion`. La
  pestaña no se dibuja en el servidor; mientras llega el código, `<EsqueletoFormulario bloques={3} campos={4} />`. Reversible.
- **D2 · El conteo de lo que deja de verse sale de la vista pública `web.vehiculos`**, filtrada por `origen_nombre` (único) con `limit 51`: sin RPC, sin
  migración, sin permiso nuevo. Es lo que ve un visitante, así que incluye «web activa»: con la web apagada no deja de verse nada y no hay aviso.
- **D3 · El conteo se lee al abrir la pestaña**, uno por origen que hoy se ve, en paralelo. Si uno falla, ese origen avisa sin número y la pestaña sigue en pie.
- **D4 · El aviso sale bajo la casilla al destildar un origen que hoy se ve**, antes de guardar y sin confirmación (guardar es reversible). Con 0 vehículos no avisa.
- **D5 · Un origen visible que no aparece en la lista (inactivo) se conserva al guardar** (`origenesAGuardar`): no se cae de la web sin que nadie lo vea.
- **D6 · Se mandan todas las claves del sitio que edita la pestaña**, no sólo las cambiadas; la versión frena el pisotón, y `redes` y `seo` se reemplazan
  enteras de todos modos. Nunca `legales` ni la política de la cola.
- **D7 · El conflicto (`PT409`) va con `<AvisoDeConflicto>` dentro del formulario**, con el texto de la base. «Recargar» borra el borrador y hace
  `router.refresh()`: la versión nueva cambia la `key` y el formulario se vuelve a montar desde la base. Un error 22023 de la base va junto a su campo (por el
  `hint`); los demás, por toast.
- **D8 · El borrador** (`useBorrador('ajustes-del-sitio')`) **guarda sólo los 13 campos de texto**; las casillas y el interruptor arrancan de lo guardado. Sin
  modo de sólo lectura: la página sólo abre la pestaña con `web.ajustes.gestionar`.
- **D9 · Textos** (reversibles): bloques «Identidad», «Contacto», «Vitrina» (abiertos), «Redes» y «Buscadores» (plegados, se abren con un error); éxito
  «Ajustes del sitio guardados»; sin orígenes «Todavía no hay orígenes activos.»; los mensajes de validación son los de la base, palabra por palabra.
- **D10 · `docs/UX.md` no se toca** en esta parte. Estados de la pestaña, para que el carril `a` sume la fila: cargando (el `fallback` de la página y el
  esqueleto del diferido); error al leer (el `error.tsx` con «Reintentar»); sin permiso (la página, 8.01-3); vacío (no aplica a la fila única; la lista de
  orígenes tiene su texto); sin red (el aviso «No hay conexión…» y `conRed`); conflicto (D7).

<!-- paso:8.07-1 -->

# 8.07-1: decisiones (2026-11-12)

- **D1 · `node:crypto`, no `jose`.** La cookie del portal (8.07-2) se firma con HMAC-SHA256 de `node:crypto`: firma lo mismo sin dependencia nueva.
- **D2 · El sitio reescribe `/api/portal/*` hacia el CRM.** Así la cookie queda de primera parte y alcanza `SameSite=Lax`. Va como contrato en el 8.07-3.
- **D3 · Sesión de 7 días.** Revocar o volver a otorgar la cortan antes, por `otorgado_en`.
- **D4 · `portal_intento` recibe la IP y calcula la huella adentro** con `HMAC-SHA256(ip, portal:sal)`, en vez de recibir una huella hecha
  (`p_huella`, como decía la fila). La sal nunca sale de Vault y no hace falta otra RPC para leerla. Es HMAC y no `digest` porque una sal como clave es la
  forma correcta de un hash con secreto (un sha256 sin clave de una IPv4 se adivina recorriendo 2^32 direcciones) y porque PGlite sólo trae el HMAC real.
  El assert «otra huella no» se prueba como «otra IP no» (L2).
- **D5 · Ventana fija de 15 minutos por huella, que cuenta todo intento.** El límite va antes del login, cuando todavía no se sabe si falla.
  `Retry-After: 900` fijo, el máximo: no hace falta otra lectura ni le dice a nadie cuánto falta. Reversible: la función puede devolver los segundos.
- **D6 · Qué IP llega detrás de la reescritura: pendiente de medir (no es contrato todavía).** Vercel reescribe el `x-forwarded-for` que llega de
  afuera: detrás de la reescritura del sitio todos los clientes podrían llegar con la IP de salida del sitio y, como se cuenta todo intento, el portal
  entero quedaría en 10 ingresos cada 15 minutos. Si nada pisa la cabecera, tomar su primera entrada deja saltarse el límite. La base de esta parte no
  depende de eso: `portal_intento(p_ip)` sirve igual. El 8.07-3 mide qué IP llega a través de la reescritura y elige entre una cabecera propia que el
  sitio firme con un secreto compartido, o limitar también por código cuando la IP no es de fiar (`docs/PLAN.md` › «La IP real tras la reescritura»).
  Mientras, la base sigue bloqueando por código (5 fallos, 15 minutos).
- **D7 · El `Origin` del sitio se lee con `web.portal_direccion_publica()`** (sólo `service_role`), que entra en «el admin sólo para `web.portal_*`».
  `direccion_publica` no se suma a la vista `web.ajustes`: cambiaría el tipado del sitio, que es otro repo.
- **D8 · La purga corre cada 5 minutos, de a 10.000**, sobre las ventanas vencidas, por el índice de `ventana_desde`.
- **D9 · Sin script en `scripts/carreras/`.** El contador es un solo `insert … on conflict do update` por la clave primaria: dos pedidos a la vez de la
  misma IP se serializan en esa fila y ninguno se pierde. No hay candado de aplicación ni numeración.
- **D10 · `otorgado_en` viaja en la cookie como el texto de la base**, con microsegundos. Un `Date` de JS lo redondearía a milisegundos y
  `_portal_vigente` (igualdad exacta) dejaría de reconocer la sesión.
- **D11 · Un cuerpo inválido en `ingresar` responde el mismo 401 que un login fallido.** Sólo el 429 (límite) y el 503 (sin secreto) se distinguen, a
  propósito.
- **El contrato del portal.** `docs/PLAN.md` pide leer `docs/archivo` (`rg -n 'Contrato del portal' docs/archivo`): esta sesión lo intentó y el permiso
  lo negó (también al auditor). El contrato vigente es `docs/DECISIONES.md` › «Contrato del portal para la Fase 8» (2026-10-15): no fija nombre de cookie,
  duración ni forma del límite; pide la cookie firmada con `lead_id` y `otorgado_en`, el login que responde igual a cualquier fallo y que nunca se vean
  costos, VIN completo ni privados. No contradice la fila.
- **Compuerta `datos`** (`security definer` y Vault): aprobada sola por `PILOTO_AUTO` (decisión vigente «aprobar»).

<!-- paso:8.09-1 -->

# 8.09-1: decisiones (2026-11-12)

- **D36 · El filtro de estado tiene tres opciones:** Abiertos (por defecto), Cerrados y Todos. La fila pide «abiertos o cerrados» y un proyecto cerrado no debe
  desaparecer sin camino de vuelta. `todos` manda `p_estado` nulo. Reversible.
- **D37 · Sin «Anterior».** El cursor es el `numero` del último proyecto; la base sólo camina hacia adelante. Se reusa `<Paginacion siguiente anterior={null}>`
  (como `/logistica/gastos`): el plan creía que no servía, pero acepta cualquier texto de cursor. Con cursor, «Volver al principio».
- **D38 · El cliente de un proyecto de un vehículo no se pide:** la ficha del vehículo ya lo vincula. El cliente libre, el teléfono y el lead sólo existen en el
  proyecto externo (la base no los prohíbe; no se exponen juntos para no duplicar).
- **D39 · Tras crear, el drawer se cierra y se queda en el listado** (toast «Proyecto #N creado.»). El detalle llega en 8.09-2, que lo cambia a «ir al detalle».
- **D40 · Un `?vehiculo=` inválido o que no se ve abre el formulario como «Externo» con el aviso «No encontramos ese vehículo o no tienes acceso.»,** nunca un error.
  El servidor lo resuelve sólo con el panel abierto y con `repuestos.editar`; la URL puede cambiar después de cargar, así que el id resuelto se compara con el de la URL.
- **D41 · «Completo» no es «Cerrado»:** cerrar es una acción explícita (8.09-2). El estado derivado sale sólo de las cuentas de la base (≤ 201 ítems por proyecto);
  no hay un estado «Con problema».
- **D42 · El lead se pide sólo con `leads.ver`;** sin ella el bloque no se dibuja (la base lo vuelve a exigir con `trg_lead_visible`).
- **D43 · «200+» en vez de un total exacto:** las cuentas de ítems leen como mucho 201 por proyecto (`textoDeItems`).
- **D44 · El vacío de primera vez no sabe si hay proyectos cerrados:** con el filtro «Abiertos» dice «Todavía no hay proyectos de repuestos.» y aclara que los cerrados
  no se muestran (elige «Todos»). Evita una segunda lectura sólo para afinar el texto.
- **D45 · La guarda de páginas pide `TAMANO_DE_PAGINA_POR_DEFECTO` (50), no el máximo:** `paginas.test.ts` exige que lo registrado sea el valor por defecto de
  `_acotar_pagina(p_tamano, 50, 100)`; el máximo de la lista (100, `MAXIMO_DE_PAGINA_DE_REPUESTOS`) sale del selector «Ítems por página».
- **D46 · Esta parte es Nivel 1, no 2:** `navegacion.ts` (`_shell`, el disparador) no se toca hasta 8.09-2; `/repuestos/<id>` da 404 hasta entonces y el menú
  sigue sin llevar a `/repuestos`. Se entra por la URL.
- **D47 · Los buscadores de vehículo y de lead viven en `src/app/(app)/repuestos/`** y llegan al drawer como funciones de render: `repuestos` no importa `buscador`.
  Un número solo («#12») no busca vehículos (D10 del buscador); un vehículo se busca con texto.

<!-- paso:8.09-2 -->

# 8.09-2: decisiones (2026-11-12)

- **D48 · Sólo cantidad y precio son `XCell`.** Es numérica (`format: numero | monto | porcentaje`): no tiene texto ni selección. Descripción, tracking, notas y los cuatro catálogos son celdas
  propias de `features/items/` (entrada de texto y `<select>` nativo) con el mismo teclado básico (Enter guarda y baja a la misma columna de la fila siguiente; Esc vuelve a lo guardado). No se
  ensanchó `shared/ui/xcell` (duda 1 de la fila). La `XCell` muestra su etiqueta en cada celda: la densidad compacta va a «Pulido para la Fase 9».
- **D49 · Un proyecto que no existe, está eliminado o no se ve da el mismo mensaje** («Este proyecto ya no está disponible: no existe o ya no tienes acceso.», con «Volver a Repuestos»); sin `notFound()`.
- **D50 · La cabecera no muestra el teléfono ni el lead del cliente:** sólo el nombre (la lista tampoco). Reversible.
- **D51 · Los pendientes del estado derivado se cuentan sobre las filas leídas** (≤ 200): sin stock y sin fase o en una fase no final (la misma cuenta de `repuestos_proyectos_listar`).
- **D52 · La moneda por defecto de un precio es la primera de las activas** (la lista de `leerMonedasYTiposCambio` no trae un orden propio). Va en el mismo `update` cuando el ítem no tenía moneda;
  vaciar el precio no borra la moneda.
- **D53 · El conflicto no nombra a quién cambió el ítem** (el `update` directo no lo dice): «Otra persona cambió este ítem. Recarga para ver lo nuevo.» con `<AvisoDeConflicto>`.
- **D54 · Con 200 ítems no se dibuja la fila nueva** y `<AvisoDeTope>` dice por qué; la hoja no pagina.
- **D55 · Eliminar un proyecto vacío (y su «Deshacer») pasa a 8.09-4:** la fila del PLAN no lo pide.
- **D56 · «Cerrar proyecto» no pide confirmación** (se deshace con «Reabrir»): toast con «Deshacer», que llama a la acción contraria con la versión que devolvió la primera.
- **D57 · La hoja no se pide con `diferido()`:** es el contenido de la pantalla, no un panel que se abre; sólo el `<Confirmar>` de eliminar va diferido (`useAbiertoAlgunaVez`).
- **D58 · Sólo lectura = texto plano**, no 200 `XCell` con candado (sin `repuestos.editar` o con el proyecto cerrado). El aviso del proyecto cerrado va arriba de la hoja.
- **D59 · La fila nueva lleva sólo la descripción:** la cantidad (1 por defecto), el precio y lo demás se llenan después con el teclado. La action `crearItem` acepta cantidad, precio y moneda (validados con las
  mismas reglas) por si la fila crece, pero la hoja hoy no los manda.
- **D60 · Guardar una celda, agregar y eliminar un ítem no llaman a `revalidatePath`:** la hoja ya tiene la fila nueva (la action la devuelve entera) y recargar lee de la base; un `revalidatePath` volvería a
  mandar las filas y pisaría lo que se está tecleando en otra celda. Cerrar y reabrir sí revalidan el detalle y el listado.
- **D61 · «Nuevo proyecto» ya no cierra el panel antes de ir al detalle:** nuqs escribe `?panel=` de forma asíncrona y pisaba el destino de `router.push`. Ir al detalle saca el panel de la pantalla.
- **D62 · Un guardado por celda va por una cola por fila** (`colaPorClave`): el segundo parte de la versión que dejó el primero. Cada guardado lee la versión de la fila al correr, no al encolarse.
- **Hueco que queda para 8.10** (la base no lo frena hoy): el `update` por columna de un ítem **no mira si el proyecto está cerrado** ni valida que un `tipo_pieza_id` sea de su catálogo (sólo
  `repuesto_item_crear` lo hace). La pantalla vuelve la hoja de lectura al cerrar; 8.10, que ya revisa los `grant` de `repuestos_items` (quita `UPDATE(en_stock_desde)`), decide si lo cierra con una RPC.

<!-- paso:8.09-3 -->

## 2026-11-12 · Paso 8.09-3: imágenes del ítem (parte 3 de 4 del 8.09)

- **D63 · Se hace con una migración, no acotada:** sin ella «borrar por refcount» y el tope de 8 no se cumplen (`cola_gc_storage` sólo la escribe `service_role`). Dos triggers y un índice; sin RPC, policy ni permiso nuevos.
- **D64 · La lista del panel se lee por una action** (`leerImagenesDeItem`) al abrirlo, no por un lector de navegador: `repuestos` no tiene `composicion.client.ts` y la guarda de áreas no lo admite. Nada de esto viaja con la hoja.
- **D65 · Sin miniatura de 480 px:** la tabla no tiene columna para ella. Se sirve el WebP de ≤ 1600 px con `unoptimized` (como las fotos del vehículo: `next.config.ts` sólo admite `*.supabase.co`), sólo de las ≤ 8 de un panel abierto. Excepción anotada en `docs/RENDIMIENTO.md`.
- **D66 · No se barren los huérfanos de `repuestos`** en `storage_gc_reclamar()` (subidas a medias): hoy sólo barre `vehiculos`. Cuesta almacenamiento, no corrección. Pulido de la Fase 9.
- **D67 · Tope 8 en la base, bajo candado por ítem** (`pg_advisory_xact_lock`), y el mismo 8 en `entities/items/imagenes.ts`. No hay prueba de carrera de dos sesiones: el peor caso es una imagen de más. El conteo va acotado con `limit 8` (`supabase/tests/escala.sql`).
- **D68 · «Quitar» no pide confirmación y ofrece «Deshacer»:** volver a insertar la ruta la saca de la cola de limpieza (rescate) mientras corre la gracia de 24 h; pasada la gracia, si la limpieza ya la reclamó, falla con su mensaje.
- **D69 · Elegir sube al momento** (sin bandeja de «Subir N»): el panel es chico y la bandeja es de `vehiculos`. Lo repetido se detecta por el hash del WebP achicado, no por el del original.
- **D70 · El botón «Imágenes» y la columna «Acciones» se ven también para quien sólo ve:** ver las imágenes es de `repuestos.ver`; sin `repuestos.editar` (o con el proyecto cerrado) el panel no tiene zona ni «Quitar».
- **D71 · La tabla ya no se actualiza:** `drop policy "repuestos_items_imagenes: editar"` y `revoke update`. Nadie cambia `item_id` ni `ruta` (saltaría el tope, la carpeta y el encolado); la app sólo inserta y borra.
- **D72 · El proyecto cerrado y el ítem eliminado frenan el INSERT en la base** (23514, hint `proyecto` / `item`), no sólo la pantalla. La action no lo consulta antes: lo dice el trigger y `errorDePostgrest` conserva su mensaje.
- **D73 · La subida del navegador usa `subirPorHash` de `shared` desde el hook** (`use-subida-de-imagenes.ts`): los demás módulos lo envuelven en `infra/*.client.ts` + `composicion.client.ts`, pero la guarda de áreas de `repuestos` sólo admite `index`, `client` y `composicion`. Deuda para la Fase 9 (ampliar la guarda y mover la subida a `infra/items/imagenes.client.ts`), no se tocó la guarda.
- **D74 · Agregar usa `insert` y no `upsert … ignoreDuplicates`:** el repositorio ya filtra lo repetido contra lo leído; si dos «agregar» de la misma ruta coinciden, uno falla con 23505 (error de más, nunca éxito falso).
- **Huecos que quedan para 8.10** (la base no los frena hoy): borrar una imagen de un proyecto cerrado o de un ítem eliminado (la policy de borrar sólo mira `repuestos.editar`; la pantalla esconde «Quitar»); y el trigger de insert corre antes del `with check`, así que quien no puede editar recibe 23514 en vez de 42501 (sólo adivinando un uuid sabría si un ítem existe). Además, la policy de Storage de `repuestos` no mira la carpeta.

<!-- paso:8.09-4 -->

## 2026-11-12 · Decisiones del paso 8.09-4

- **D75 · La ficha del vehículo lo muestra en una pestaña «Repuestos» (no en un bloque de «Ficha»):** la ficha ya la declaraba, las listas hijas se leen al abrir su pestaña (`escala.md`) y quien no la abre no paga la lectura. Visible con `repuestos.ver` global (no por origen) y la última de la barra. Como ya todas las pestañas declaradas tienen sección, sale el campo `disponible`: el test compara cada pestaña con su `seccion-<clave>.tsx`.
- **D76 · `pantallas/proyectos-vehiculo.ts` y no `pantallas/vehiculo.ts`** (la fila de PLAN decía `vehiculo.ts`): un archivo sin prefijo de área es del núcleo y el núcleo no importa el área `proyectos` (guarda `areas-de-repuestos`).
- **D77 · Eliminar un proyecto vacío no pide confirmación:** es reversible (`repuesto_proyecto_restaurar`), así que se hace de una vez y el aviso ofrece «Deshacer» (`ui.md`). Sólo se ofrece con `repuestos.editar` y la hoja sin ítems; compras, pagos o cotizaciones los rechaza la base con su texto. Al eliminar se vuelve al listado.
- **D78 · El recuento por fase se lee dentro del área `proyectos`** con su propia consulta de ≤ 201 ítems (un área no importa otra: no se reutiliza `leerItemsDelProyecto`). Dos lecturas chicas, sin N+1; el conteo nunca es un total exacto («más de 200»).
- **D79 · Cinco pestañas ensanchaban la página en el celular:** la raíz de las pestañas lleva `min-w-0` para que se desplace la barra y no la página (la hizo caer `vehiculos-fotos` y `vehiculos-cotizaciones` en `movil`).

<!-- paso:8.09-5 -->

- **D80 · La dueña suma una parada de Tab con «Repuestos» en el menú (57 en escritorio):** 8.09-2 encendió la entrada (`disponible: true`) y sólo quien tiene `repuestos.ver` la recibe; la asesora no, y sigue en 60. Se subió `CONTROLES_DE_LA_DUENA` de escritorio a 57 (el celular sigue en 50: su menú no suma paradas antes del contenido). Lo cayó el CI en el bloque 2 (`E2E R2`); `E2E R1` salió «inestable» sólo porque el grupo es `serial` y el reintento repite todo.

<!-- paso:8.10-1 -->

## 2026-11-12 · Decisiones del paso 8.10-1 (la base del stock de repuestos)

- **D1 · «Vender suelto» no registra precio:** es un movimiento con motivo y nota (la tabla no tiene monto); el cobro es un pago del proyecto (8.13). La recomendada de la fila.
- **D2 · La cantidad va siempre positiva y el sentido sale del motivo:** la fila del movimiento guarda la cantidad con signo. Un signo mal puesto no puede volver una salida en entrada.
- **D3 · Mover y reasignar valen en un proyecto cerrado:** los sobrantes nacen justamente al terminar un proyecto. El que no recibe nada es el **destino** cerrado.
- **D4 · Motivos cerrados y validados en la RPC, sin `check` en la tabla:** `sobrante` (entra), `vendido`, `devuelto`, `ajuste` (salen por `repuesto_stock_mover`) y `reasignado` (sale sólo por `repuesto_stock_reasignar`). La nube puede tener filas viejas con otro texto y un `check` fallaría la migración allá.
- **D5 · «Devolver» es devolver al proveedor** (sale del stock). Volver un sobrante al proyecto no se ofrece: sería un `ajuste`, con rastro.
- **D6 · `ajuste` sólo resta** (merma, conteo): uno de entrada fabricaría stock y sacaría ítems de la espera. En 8.10 no tiene botón (sólo la RPC y la regla).
- **D7 · Lo que entra por `sobrante` tiene tope:** la cantidad del ítem menos lo que ya entró por `sobrante` (bajo el candado, por `repuestos_stock_movimientos_item_id_idx`). Una unidad que salió no vuelve a entrar como si no hubiera salido. **Abierto:** `cantidad` se sigue editando directo en la hoja (`GRANT UPDATE("cantidad")`, `infra/items/guardar.ts`): subirla habilita más sobrante y bajarla puede quedar por debajo de lo ya pasado. El candado del stock no lo cubre (auditoría del plan, 3).
- **D8 · La espera no cambia:** `en_stock_desde` se fija al pasar de 0 a más y se limpia al volver a 0; `evaluar_requisitos` mira `en_stock_desde is null`. Así, **una sola unidad** en stock saca el ítem entero de la espera de su vehículo, y uno que vació su stock vuelve a contar si no llegó a su fase (E7 de `esperas.sql` lo fija). Es lo conservador (ante la duda, el vehículo espera; se destraba marcándolo perdido); si cambia, lo decide 8.13.
- **D9 · `nota` nueva en `repuestos_stock_movimientos`** (nula o de 1 a 500 caracteres) y `p_nota` al final de `repuesto_stock_mover`: la fila habla de «motivo y nota» y la tabla no tenía dónde.
- **D10 · `repuesto_stock_reasignar` suma `p_id`** (el id del ítem nuevo): idempotente como `repuesto_item_crear`. La búsqueda del id va **después** del candado del origen: dos llamadas con el mismo id (doble clic) se ordenan ahí y la segunda devuelve la misma respuesta en vez del 23505 crudo de la clave primaria (auditoría del plan, 1; carrera K2b). No lleva stock esperado: dos reasignaciones válidas de un stock que alcanza entran las dos; lo que se impide es el negativo.
- **D11 · El ítem reasignado** copia descripción y los cuatro catálogos tal como están, `cantidad = unidades`, sin precio, moneda ni tracking (el precio es para otro cliente), nota «Reasignado desde el proyecto #N.», y nace como cualquier ítem: en la fase de entrada con su historial. Efecto conocido: si el destino tiene un vehículo con una espera `hijos`, ese vehículo espera una pieza que ya está en el depósito hasta que alguien la mueva (8.13).
- **D12 · Cursor de la lista en dos parámetros** (`p_cursor_en`, `p_cursor_id`, como `gastos_listar`) e índice `(en_stock_desde desc, id desc)` (la fila decía `id` ascendente): con `desc` en las dos columnas el cursor es una comparación de filas que el índice resuelve. En la app viaja con `codificarCursor` de `shared`.
- **D13 · El historial no cambia de índice:** `repuestos_stock_movimientos_item_id_idx (item_id)` alcanza (pocos movimientos por ítem).
- **D14 · Quedan abiertos para «Pulido para la Fase 9» › seguridad** (la fila no los pide): el `update` por columna de un ítem de un proyecto cerrado sin validar el catálogo (8.09-2), borrar una imagen de un proyecto cerrado o de un ítem eliminado y la policy de Storage que no mira la carpeta (8.09-3), y el `UPDATE(cantidad)` directo frente al tope de D7.
- **D15 · El parámetro se llama `p_unidades` y no `p_cantidad`** (la fila decía `p_cantidad`): `supabase/tests/escala.sql` toma todo `p_cantidad` de una función que el cliente ejecuta por un tamaño de página y exige `_acotar_pagina`. Cambiar el nombre es más barato y más claro que abrirle una excepción a la guarda.
- **D16 · `infra/stock/listar.ts` entra en esta parte** (el plan lo dejaba para 8.10-2): `scripts/guardas/paginas.test.ts` exige que toda RPC con tamaño esté en el registro **y** que cada entrada tenga quién la llame. Es la lectura sola, sin barril ni pantalla.
- **D17 · El UPDATE de `repuestos_catalogos` es sólo de `nombre`, `activo` y `orden`** (H1 de 8.08-2): `catalogo`, `id` y `datos` dan 42501. `datos` no lo escribe la app (auditoría del plan, 8).
- **Escrituras directas quitadas** (abierto «Quitar escrituras directas» de `docs/PLAN.md`): el INSERT de `repuestos_stock_movimientos` (con su policy y la secuencia), el `UPDATE(en_stock_desde)` de `repuestos_items` y el UPDATE de `catalogo`/`id`/`datos` de `repuestos_catalogos`. Ninguna pantalla las usaba; `humo.sql` y `permisos-enforcement.sql` siguen en verde.

<!-- paso:8.10-2 -->

## 2026-11-12 · Decisiones del paso 8.10-2 (el servidor del stock, «Pasar a stock» y el historial del ítem)

- **D1 · Reasignar del lado servidor va a 8.10-3**, donde está su botón: aquí nadie lo llamaría.
- **D2 · `moverStock` acepta `sobrante`, `vendido` y `devuelto`:** 8.10-3 la reusa sin tocarla. `ajuste` no tiene botón (D6 de 8.10-1) y `reasignado` tiene su RPC.
- **D3 · Tras mover, la fila toma la respuesta de la RPC** (`stock_cantidad`, `en_stock_desde`, `actualizado_en`) y no se relee con `leerItem`, como decía el plan
  del 8.10-1: `leerItem` es del área `items` y el área `stock` no la importa. El cambio se aplica sobre la fila **vigente** de la hoja (`cambiarFila(id, cambio)`), así
  no pisa una celda guardada entretanto, y la celda siguiente no choca con `PT409` (la respuesta trae el `actualizado_en` que puso el trigger).
- **D4 · El hueco de la hoja se llena en un Client Component de `src/app`** (`src/app/(app)/repuestos/[id]/hoja-con-stock.tsx`), no en `page.tsx`: una función no
  cruza de un Server Component a uno de cliente. El hueco tiene dos partes, `accionDeFila(fila)` y `panel(api)`; el área `stock` declara su propio tipo de `api`
  (`ApiDeLaHojaParaStock`) y no importa el de `items` (auditoría del plan, 3).
- **D5 · «Stock» está en toda fila, también para quien sólo ve:** el historial se lee con `repuestos.ver`, como «Imágenes». El formulario, sólo con `repuestos.editar`,
  y vale con el proyecto cerrado (D3 de 8.10-1: los sobrantes nacen al terminar).
- **D6 · «En stock: N» sólo con N > 0**, en un `<Badge>` de texto junto al botón. Con 0 no se dice nada.
- **D7 · El formulario no sabe cuánto entró ya por `sobrante`:** valida entero ≥ 1 y ≤ la cantidad del ítem; el tope exacto lo dice la base junto al campo.
- **D8 · Tras pasar, el panel queda abierto:** el formulario se vacía, el historial se relee y un toast lo confirma. **Sin `revalidatePath`**, como `guardarCelda`:
  la hoja ya tiene la fila. Efecto conocido: el estado derivado de la cabecera (pendientes) se ve al volver a entrar.
- **D9 · El historial va por la action `leerMovimientosDeItem`**, `id desc` con el `id` como cursor, de a `TAMANO_DE_VER_MAS` hasta `TOPE_DE_LO_CARGADO` con
  `<AvisoDeTope>`. **Sin «Ir a una fecha»:** un ítem tiene pocos movimientos (D13 de 8.10-1); la excepción quedó escrita en `docs/RENDIMIENTO.md`. La primera página se
  lee con `useLecturaAlMontar` (como las imágenes) y otra vez tras pasar a stock (un esqueleto breve); «Ver más» suma por evento.
- **D10 · Un motivo que no está en la lista** (filas viejas de la nube) se muestra con su texto tal cual.
- **D11 · Las actions no llevan test de Vitest** (no hay precedente de una action con sesión en Vitest): el permiso lo prueba la base (S3 de `stock.sql`, 8.10-1) y
  `moverStock` mira `puede()` antes de escribir. Lo clave con test: el esquema y la traducción de errores.
- **D12 · El e2e usa la etiqueta `Prueba stock e2e <proyecto>`**, que no empieza con «E2E»: la limpieza de `repuestos-proyecto.spec.ts` borra `like 'E2E%'`. Cada
  proyecto de Playwright limpia sólo la suya.
- **D13 · El e2e corre en `escritorio` y `movil`** (auditoría del plan, 1): el CI lo corre en los dos y el hueco se dibuja también en las tarjetas.
- **D14 · Un `porCampo` de una clave que no es un campo del formulario** (`motivo`, `proyecto`, `id`) va como aviso del formulario (auditoría del plan, 5).

<!-- paso:flujo-7 -->

## 2026-11-12 — FLUJO-7: la tarea de oro 2 se mide por KLM y no por la cuenta exacta de teclas

Medido el 2026-11-12, a 23 h de lanzar (39 de 69 pasos; los carriles en sesión el 81–93 % del reloj): de los CI rojos de un PR que no eran
del entorno, el que más se repitió no era de ningún paso.

- **`e2e/cotizar-tarea-de-oro-recorrido.spec.ts` ya no exige la cuenta exacta de teclas de control** (`toBe(60)`, `toBe(56)`): la anota y
  exige lo que pide `docs/UX.md`, KLM ≤ 90 s (hoy ≈ 57 s la asesora y 41 s la dueña; cada parada más son 0,28 s). Tras abrir la hoja el
  foco recorre el marco, así que cada entrada nueva de la navegación sumaba una parada y el spec caía en el PR de **otro** paso, que no
  la había tocado: dos PR en verde, cada uno con su «+1», quedaban en rojo al entrar el segundo. Cayó en 6.01, 7.07, 7.02, 7.09 y 8.09
  (este último, tres CI rojos seguidos y 7 h abierto con el paso terminado): de 1 a 3 h y una sesión de arreglo cada vez, y a las fases 8
  y 9 les faltan más entradas. Se descartó descontar las paradas del marco para conservar la cuenta: pedía medirlas en cada pantalla del
  recorrido y volver a contarlas con el completo local. `cotizar-tarea-de-oro-enlace` conserva su cuenta exacta: arranca en la hoja con
  «Saltar al contenido» y no cruza la navegación.
- **El mismo spec espera las dos fotos de la subasta en la base** (`fotosConOrigen`) y no su aviso, que se cierra solo a los pocos
  segundos: si las fotos terminaban antes que el recorrido, el aviso ya no estaba (así cayó el spec corriendo solo, como dirigido, en
  el PR de este arreglo; en el completo pasaba por tiempos).
- **`e2e/configuracion-flujos-requisitos.spec.ts` espera el orden de la lista tras «Subir»** (`expect.poll`) en vez de leerla una vez: la
  base ya había cambiado y la lista se volvía a dibujar un instante después (el 9.04-1, rojo en los dos intentos del CI).
- **Medido y no cambiado:** el reintento a ciegas de un CI rojo. Desde el arreglo de chromium, de 31 reintentos 11 terminaron en verde
  (el FLUJO-6 había contado 2 de 14): vale los ≈ 17 min que cuesta. Los choques «dudosos» de un registro (una línea editada de un lado
  y un agregado encima del otro, `scripts/guardas/areas-c/drawers-con-salida.ts`) siguen yendo al carril: unirlos a ciegas deja un `.ts`
  que no compila.

<!-- paso:6.14-1 -->

# Paso 6.14-1 — El cierre de la Fase 6 (parte 1 de 2): la tarea de oro 3 y el recorrido

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/6.14-1.md`.

- **D1** El 6.14 se parte en 6.14-1 (la tarea de oro 3, el recorrido y el pulido) y 6.14-2 (el Nivel 3 y los docs de cierre): el completo corre una vez,
  sobre el SHA final, después de cualquier arreglo que pida el recorrido; y los 32 docs de paso de la Fase 6 no caben con margen junto a las hojas de contacto.
- **D2** El spec corre en `escritorio` y `movil`: la tarea de oro 3 es de quien está en el puerto con el celular, y no es Configuración.
- **D3** La medida de logística es con puntero: KLM con 1,3 s por gesto (apuntar 1,1 + clic 0,2), 0,28 por tecla y 1,35 por decisión; en el celular un toque
  cuesta lo que un clic. `Teclado.klm` de la tarea de oro 2 sólo cuenta teclas: el contador `Gestos` vive en el spec.
- **D4** La nota de R1 es corta («Zarpó.»): la fase la exige y el tramo mide mover, no redactar.
- **D5** El contenedor de 8 lleva una unidad sin el BL: «ver antes de confirmar qué falta en cada uno» es la mitad de la meta; el reloj para en el resultado
  («Se movieron 7 de 8.» y la que no). Aprobar y reintentar ya lo prueba `logistica-lote.spec.ts`.
- **D6** La dueña de prueba (rol `dueno`) tiene `flujos.mover`, `logistica.ver`, `logistica.gastos.ver` y `logistica.margen.ver` para todos los orígenes:
  comprobado por SQL antes de escribir R3 y R5; no hizo falta darle un rol de prueba.
- **D7** El conflicto lo provoca la dueña (la segunda cuenta de la fila); su nombre es el que se lee.
- **D8** R6 sólo asserta que cada pantalla carga (la sub-navegación con su pestaña marcada, o `main` en Inicio): es para mirar; lo que se juzga va al pulido.
- **D9** El contenedor se busca como fila **o** tarjeta de lista (`row` o `listitem` con el botón «Abrir el contenedor …»): en el celular
  `/logistica/embarques` dibuja tarjetas. Es del spec, no un defecto.
- **D10** (Para el 6.14-2) 6-4 no lo tomó ningún paso y arreglarlo es código de producto: queda en «los decide la persona», con las dos opciones de su fila.
- **D11** (Para el 6.14-2) El 6-3 de «borrar una nota propia por RPC» (6.04, D22) pasa a **6-7**: el número 6-3 ya era `pago_anular`, cerrado en el 6.10-2.

<!-- paso:7.11-1 -->

## 2026-11-12 · Decisiones del paso 7.11-1 (widget del chat)

- **D1 · En el celular la burbuja es un enlace a `/chat`:** un panel flotante taparía el pie y las listas. El botón que abre el panel existe desde 768 px.
- **D2 · La burbuja va con `z-40`, por debajo de los modales y drawers (`z-50`):** con un panel abierto su velo la cubre y no tapa el pie. El panel del widget no es modal y se cierra con Escape.
- **D3 · Abajo a la derecha;** en el celular, a 5 rem del borde para no tapar los avisos (el toaster sale abajo a la derecha allí y a la izquierda desde 768 px).
- **D4 · El estado del widget (abierto, conversación elegida) es local, no la URL:** abrirlo no cambia la pantalla de atrás, y llevarlo a la URL cambiaría la de `/leads`. Es la excepción a «registro abierto en la URL» de `.claude/rules/ui.md`; el panel no tiene `<Confirmar>` ni `<Drawer>`.
- **D5 · El panel es sólo leer y responder:** el «⋯» del mensaje no se dibuja (`AccionesDelMensaje.sinMenu`); editar, borrar, responder con cita, `/tarea`, `/evento` y silenciar viven en `/chat`. Un comando `/tarea` o `/evento` y una mención llevan allí (`?panel=`, `?mencion=`).
- **D7 · El contador cuenta sólo lo no silenciado y 100 es «99+»:** lo que dice la base (`chat_no_leidos`); no se inventa otro.
- **D8 · El hilo recibe la conversación de la lista ya leída** (con su `ultimo_leido_en`): el panel no relee una por una, y el contador se mueve cuando `useMarcarLeido` llama a `chat_leer` (la señal de mi fila de miembro).
- **D9 · El panel se monta sólo abierto** (su código ya cargado no se vuelve a pedir): al cerrar se sueltan sus canales de Realtime y al reabrir se relee la primera página. Queda una sola suscripción permanente: la del contador.
- **D10 · Tope de JS de `/cotizaciones/[id]`: 448 → 452 KB.** Ya medía 447,3 antes del paso; el marco con la burbuja suma ≈ 1,9 KB (y un chunk) en toda pantalla, más de los 1,5 KB previstos, con el panel, el hilo y Realtime por `diferido()`. Regla del 5 %: el resto de topes no se tocan.

<!-- paso:7.11-2 -->

## 2026-11-12 · Decisiones del paso 7.11-2 («Escribirle por chat» y `/chat?con=`)

- **D6 · El enlace se ofrece a quien tiene `chat.participar`;** que la otra persona también lo tenga no se sabe en el navegador sin una RPC nueva: lo decide `chat_directa` y la página `/chat` lo dice. Sin SQL.
- **D11 · No se agrega `RUTAS.chat`:** no existe y el widget y la barra usan la ruta literal; el enlace usa `/chat?con=` con `as Route`.
- **D12 · Un `?con=` que falla se dice con `<Aviso tono="peligro">` y la lista debajo,** no con `EstadoError` (de cliente, exige «Reintentar»): no se pierde la pantalla; reintentar es recargar. El mensaje es el de la base.
- **D13 · `ASESORA` de los e2e del alta no se toca** (no trae `chat.participar`; sumarlo movería el marco de unos 15 specs): el caso feliz va en `chat-widget.spec.ts` (con chat y `leads.ver` sólo de los propios, para que el aviso diga «Lo tiene Luis» y no «Ya existe») y `leads-alta.spec.ts` afirma que sin chat no hay enlace.
- **D14 · `?con=` se resuelve en el render con `chat_directa`,** una RPC idempotente (devuelve la directa existente), en vez de una action desde el cliente: un enlace plano sirve con el botón de atrás y en el celular sin JS extra. Una directa recién creada y vacía no aparece en la lista del otro hasta el primer mensaje.

<!-- paso:7.11-3 -->

## 2026-11-12 · Decisiones del paso 7.11-3 (rojos del CI)

- **D15 · La burbuja del chat no cuenta como lo que «tapa» un texto en la medición del 200 %:** flota sobre el marco por diseño y al final de una página cae sobre lo último. Rellenar el pie de toda pantalla para esquivarla es pulido de la Fase 9 (`docs/PLAN.md` › «Pulido para la Fase 9»): al 200 % la burbuja puede tapar la última línea de una página.
- **D16 · `chat_no_leidos` es pedido del marco** (`esDelMarco`), como los avisos de la campana: una prueba que cuenta pedidos de su pantalla no lo cuenta.

<!-- paso:7.14-1 -->

# Paso 7.14-1 — El cierre de la Fase 7 (parte 1 de 2): el recorrido, el push de verdad, 7-2 y el JS del marco

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/7.14-1.md`.

- **D1** El 7.14 se parte en 7.14-1 (7-2, el push de verdad, el recorrido y el JS) y 7.14-2 (el Nivel 3 y los docs de cierre): el completo corre una vez sobre
  el SHA con el arreglo de 7-2 y lo que pida el recorrido; los 33 docs de paso de la fase y las dos esperas largas no caben con margen en la misma sesión.
- **D2** Un endpoint simulado no puede recibir el push: la base (`push_suscribir`) y la función (`endpointPermitido`) sólo aceptan `https` sin puerto de los
  servicios de push conocidos, a propósito (la función no es un proxy abierto, D22 del 7.03-2). Sumar un host de prueba debilitaría esa defensa y tocaría una
  función `security definer`: no se hace. `push-de-verdad.sh` prueba de verdad todo lo que está antes (aviso → disparo → pase → pg_net → gateway → función →
  canje) y la última milla vale por `push-contrato.test.ts`, como dice la fila.
- **D3** El script corre sin claves VAPID en la función y se niega si `supabase/functions/.env` las trae: con claves mandaría un pedido real a un servicio de
  push con un endpoint inventado. Una respuesta que no sea `sin_claves` es ✗.
- **D4** El aviso del script entra por `notificar()` con el tipo `tarea_asignada`, la puerta que usa la tarea; la tarea nacida en el chat la recorre el e2e (R1).
- **D5** El recorrido corre en `escritorio` y `movil` (la campana y el chat se usan con el celular); sin capturas (pruebas sólo lo clave).
- **D6** 7-2 lo toma este paso: un arreglo en la campana, sin tocar `src/shared` (un reintento general en `diferido()` es otra intención y Nivel 2). La burbuja
  del chat tiene el mismo patrón; el 7.14-2 la anota como abierto.
- **D7** Al volver la red se remonta la suscripción (`key`): vuelve a pedir el código y el conteo y quita el «Sin conexión» de ese intento. Sin red, el aviso
  sigue con «Reintentar».
- **D8** Ningún tope de JS cambió: todas las rutas quedaron bajo el suyo.
- **D9** (Para el 7.14-2) PLAN y ESTADO se editan directo y BITACORA y DECISIONES por el script, como el 6.14-2. Si el 6.14-2 todavía no está en `main`, ESTADO
  sólo sustituye lo de la Fase 7.
- **D10** (Para el 7.14-2) `aplicado_en` de `chat.participar` y `chat.moderar` es dato de catálogo: queda como **7-3**, lo decide la persona.
- **D11** R3 busca con Ana el teléfono de su propio lead y el lead de la dueña, y con Luis (sin `leads.ver`) el lead de Ana: «no busca por teléfono» no se
  confunde con «no lo ve».
- **D12** Con la base sin cuentas, `push-de-verdad.sh` crea primero una dueña de prueba en su propia transacción y la borra al salir: la primera cuenta nace
  dueña y el permiso de registro (`auth_registro_permitido`, diferido) se mira al confirmar.

<!-- paso:8.02-1 -->

- **D1 · La categoría de una pregunta frecuente es texto libre con sugerencias** (8.02-1): la columna `web_faqs.categoria` es `text` y `web.faqs` la expone tal cual; el campo lleva un `<datalist>` con las categorías ya usadas. Reversible: un catálogo sería una migración.
- **D2 · La respuesta es texto plano:** la vista la entrega como está escrita y el sitio la escapa; guardar HTML o Markdown sería un contrato nuevo con el repo del sitio. El campo dice «Se muestra tal como la escribes, sin formato.». Reversible: sale del esquema de la action.
- **D3 · Se escribe directo, con el cliente de quien pide y la RLS como límite** (como las categorías de gasto y los catálogos de repuestos): una pregunta no otorga permisos, así que no hay RPC ni migración. La versión se compara con `.eq('actualizado_en', esperado)`; 0 filas se relee por id y se dice «ya no existe», conflicto (otra versión) o sin permiso (misma versión: la RLS la dejó en cero). `supabase/tests/areas/web/faqs-permisos.sql` demuestra el límite.
- **D4 · No se edita `ListaDeCatalogo`** (`src/shared`: Nivel 2 y regresión en sus otros usos): la fila lleva `activo: true` y el estado se dice con la insignia «Publicada» / «Sin publicar». Costo: la columna «Estado» y la tarjeta del celular dicen «Activo» en todas las filas. **Pulido para la Fase 9:** una `etiquetaDeEstado` opcional en `FilaDeCatalogo` (sirve también a los testimonios de la 8.02-2).
- **D5 · La sección viaja diferida** (`diferido()` en `features/contenido/faqs/components/diferidos.tsx`) porque `pantallas/sitio-faqs.ts` lo importa `pestanas.ts` y, por él, el hub de Configuración. El panel y el diálogo de eliminar se piden al abrirse (`useAbiertoAlgunaVez`).
- **D6 · Mover se calcula en el servidor sobre la lista releída** (`reordenar()` de `entities/contenido/faqs.ts`): renumera 0…n−1 en el orden mostrado y escribe sólo las filas que cambian, cada una con su versión (los `orden` iguales, como el 0 por defecto, no se pueden intercambiar sin renumerar). No es atómico; si una versión cambió, dice «Alguien cambió el orden mientras lo veías. Recarga para seguir.». Con la lista cortada por el tope, mover se apaga con su motivo (y el repositorio lo rechaza). Reversible: una RPC `web_faqs_reordenar` sería una migración.
- **D7 · Eliminar sólo desde el «⋯» de la lista** (`?panel=eliminar-faq&faq=<id>`): así `?panel=` tiene un solo dueño a la vez; el panel de edición no lleva botón de eliminar.
- **D8 · Dos paneles en la URL:** `?panel=nueva-faq` y `?panel=faq&faq=<id>` (un `<Drawer>` con `<CambiosSinGuardar>` y borrador por `useBorradorDeEstado`); una pregunta que no está en lo leído no abre (se avisa una vez y la URL se limpia); si desaparece con el panel abierto, el panel lo dice y no deja guardar. «Recargar» tras un conflicto descarta lo escrito (como en la tarea).
- **D9 · Sin vista previa ni columna de «última edición»:** la publicación revalida el sitio por el trigger `web_revalidar` que ya existe (etiqueta `faqs`).
- **D10 · «Sitio web» aparece en el hub con sólo `web.contenido.gestionar`:** al llenarse la pestaña de FAQs, quien tiene esa clave sin `web.ajustes.gestionar` ve la tarjeta (antes ninguna pestaña llena le correspondía). `pestanas.test.ts` pasó de «sólo Ajustes está llena» a «Ajustes y Preguntas frecuentes».

<!-- paso:8.02-2 -->

- **D1 · Crear, editar y eliminar un testimonio es directo bajo la RLS con versión** (como las FAQs, D3 del 8.02-1); el consentimiento, por las RPC `web_testimonio_consentir` y `web_testimonio_retirar` que ya existen (8.01-1). Sin migración. `supabase/tests/areas/web/testimonios-permisos.sql` demuestra el límite de la escritura directa; el del consentimiento ya lo cubría `testimonios-consentimiento.sql`.
- **D2 · Registrar y retirar el consentimiento son paneles por URL distintos del de edición** (`?panel=consentimiento-testimonio&testimonio=<id>`, `?panel=retirar-consentimiento&testimonio=<id>`): `?panel=` tiene un solo dueño a la vez y el trigger anula el consentimiento al cambiar nombre, texto o foto, así que mezclarlos en un formulario lo escondería.
- **D3 · Sin orden manual de testimonios en esta parte:** nacen al final (`orden` = máximo + 1) y se leen por `orden` y luego el más reciente primero. Los botones de orden de `ListaDeCatalogo` salen apagados con su motivo «Los testimonios se muestran en el orden en que se crearon.». Reversible: copiar `reordenar()` de las FAQs.
- **D4 · Aviso en vivo, no un diálogo extra**, antes de guardar un cambio que anula el consentimiento («Cambiar esto borra el consentimiento y lo despublica.»; ciudad o vehículo, «…apaga el permiso para mostrarla/o»). En un cambio que lo anula no se manda `publicado`: el trigger lo apaga. Reversible: un `<Confirmar>` por URL.
- **D5 · La foto se sube desde el navegador al guardar**, no al elegirla, y se limpia con `quitarSiHuerfano('web', ruta)` si el guardado falla, si la reemplaza o la quita y al eliminar el testimonio (`web_testimonios` no tiene trigger de limpieza; el nombre es el hash, así que un objeto compartido no se borra). Un huérfano por un corte entre subir y guardar es posible y barato. Carpeta `testimonios/`.
- **D6 · Las tres casillas del consentimiento empiezan apagadas** (consentir de menos es lo conservador) y sólo se pueden encender si el testimonio tiene ese dato; con un consentimiento vigente, el panel empieza con lo registrado. El nombre y el texto quedan autorizados siempre (el panel lo dice).
- **D7 · Un testimonio retirado se puede volver a consentir** desde el mismo «⋯» (la base lo reactiva); no hay «deshacer retiro». Con uno vigente, la línea dice «Cambiar consentimiento».
- **D8 · La lista dice «Consentimiento registrado el <fecha>», no quién lo registró:** resolver `consent_por` pide leer personas; el dato está en la base. Reversible: un join de lectura.
- **D9 · La sección viaja diferida** (`diferido()`), como Ajustes y las FAQs, y los dos paneles y los dos diálogos se piden al abrirse.
- **D10 · `lead_id` queda nulo** (fila del PLAN) y no hay vista previa con el diseño del sitio.
- **D11 · La subida de la foto la ofrece `areas/contenido/client.ts`** (la puerta de cliente del área) a los hooks de `features`; la guarda de áreas lo aceptó, no hubo que reubicarla.
- **D12 · Los errores `22022` y `P0002` de las RPC se dicen con su mensaje:** `errorDePostgrest` no los conocía (caían en «Algo falló…»); `rechazoDeTestimonio()` los mapea en `entities/contenido/errores.ts`, con el `hint = 'canal'` junto al campo. `rechazoDeEscritura()` y `sinFilas()` toman sus textos por parámetro (con los de las preguntas por omisión: la parte 1 no cambia).
- **D13 · Los tres paneles de «un testimonio por id» comparten un hook** (`use-testimonio-de-url.ts`) y cada uno tiene su hook fino con su `usePanelPorUrl(<su constante>)`, porque la guarda de `<Confirmar>` pide el nombre del panel y el estado en la URL en el archivo registrado.
- **Pulido para la Fase 9 (ya anotado en 8.02-1, D4):** la columna «Estado» de `ListaDeCatalogo` dice «Activo» en todos los testimonios; una `etiquetaDeEstado` opcional lo resolvería para FAQs y testimonios.

<!-- paso:8.03-1 -->

# 8.03-1: decisiones (2026-11-12)

Guías con el editor, publicar y la página de la guía (parte 1 de 2 del 8.03; categorías y legales son el 8.03-2).

- **D1 · Legales (8.03-2): `terminos` y `privacidad`**, los dos que la base admite (`_web_ajustes_validar`). La recomendada de la fila.
- **D2 · «Programar» entra**: `publicada_en` futura; `web.guias` ya filtra `publicada_en <= now()`. Sin base nueva. La recomendada de la fila.
- **D3 · Guardar, publicar, programar y despublicar son un solo `update`** con `actualizado_en` esperado: publicar guarda lo que hay en pantalla (no existe «publicar
  lo guardado» con cambios sin guardar). Sin RPC ni migración: la policy `web_guias: editar` y `trg_web_guia_publicar_validar` (`42501` sin `web.guias.publicar`, sólo si
  cambia `publicada_en`) ya lo cubren. La action comprueba los dos permisos antes de escribir; la base los repite.
- **D4 · «Nueva guía» crea el borrador con título y dirección** en un `<Drawer>` (`?panel=guia-nueva`) y lleva a `/configuracion/web/guias/<id>`: la página sólo edita
  filas que existen.
- **D5 · Conflicto = cero filas** del `update … where actualizado_en = <esperado>`; un segundo `select` distingue «Esta guía ya no existe.». Es una tabla de configuración
  sin RPC de versión.
- **D6 · «Publicar» pone `publicada_en = ahora − 60 s`**: el reloj de Next no es el de la base y con «ahora» exacto la guía saldría «Programada» unos segundos.
  «Programar» pide una fecha de al menos un minuto adelante.
- **D7 · Publicar y programar exigen texto**, permiso y red, con ese orden de motivos; despublicar sólo pide el permiso. El motivo del botón apagado queda a la vista
  bajo los botones (`aria-describedby`), no sólo en un `title`.
- **D8 · La dirección** (`slug`) se arma con el título en «Nueva guía» y se puede editar. En la página de la guía **no sigue al título** (cambiaría la URL de una
  guía ya publicada) y la ayuda lo advierte.
- **D9 · Categoría y autor** se leen con tope + 1 (100); la categoría y el autor actuales entran aunque ya no estén activos («(desactivada)»). El nombre del autor sólo
  se ve en la web si su perfil es público: la ayuda lo dice. Hasta el 8.03-2 no hay forma de crear categorías.
- **D10 · Sin migración, sin `src/shared`**: la ruta de la guía se arma en `entities/contenido/guias.ts` (`rutaDeGuia`), no en `rutas.ts`.
- **D11 · Imágenes en `guias/<hash>.webp` del bucket `web`** (WebP de hasta 1600 px). Al guardar o eliminar se retiran con `quitarSiHuerfano` las que dejaron de estar; una
  imagen subida y nunca guardada queda huérfana (deuda aceptada).
- **D12 · La imagen sólo entra en el primer nivel del documento** (así lo exige `_web_doc_html`): el botón la inserta tras el bloque donde está el cursor y
  `documentoLimpio` descarta lo anidado. Una `<img>` pegada de otro sitio no crea nada (el nodo sólo lee `img[data-ruta]`).
- **D13 · La búsqueda por título es del servidor** (`?q=`, desde 3 letras, `ilike` con `%`, `_` y `\` escapados): son decenas de guías, sin índice ni cursor.
- **D14 · El estado se calcula al leer** (`ahora` se toma tras la consulta, tras `await connection()`): «Borrador», «Programada para el …» o «Publicada el …», siempre
  con palabras.
- **D15 · «Programar…» es un campo en línea bajo la barra** (fecha y hora de la empresa; ISO al servidor), no un modal: ningún modal abre otro nivel y evita un
  `?panel=` más sin ganar nada. Microdecisión de pantalla.
- **D16 · «Eliminar guía» es un botón al pie de la página**, no un menú «⋯» (la cabecera no tiene otra acción secundaria). Abre `<Confirmar>` con `?eliminar=guia`.
- **D17 · La lista no tiene «⋯»**: un clic en la fila (o el botón con el título) abre la página de la guía. Con `<AbrirResumen>` como parada de Tab.
- **D18 · `documentoLimpio` aplana las listas demasiado hondas** (la base admite profundidad 6: una lista sólo cabe hasta la profundidad 3) y baja a párrafo un
  título dentro de una lista o una cita; los títulos de nivel distinto de 2 y 3 pasan a 3. Defensa en el navegador y otra vez en la action: la base es la frontera.

<!-- paso:8.03-2 -->

# 8.03-2: decisiones (2026-11-12)

Categorías de las guías y legales con el editor (parte 2 de 2 del 8.03: con ella el 8.03 queda completo).

- **D1 · Dos legales fijos**, `terminos` («Términos y condiciones») y `privacidad` («Política de privacidad»): los que la base admite. Sus títulos nacen con esos textos
  y se pueden editar (1–120). La recomendada de la fila.
- **D2 · Un solo formulario y un solo «Guardar» para los dos legales.** `ajustes_web.actualizado_en` es una versión para toda la fila: guardar un documento por separado
  cambiaría la `key` y descartaría lo escrito en el otro. Se manda `{ legales: { terminos?, privacidad? } }` con sólo los documentos que tienen texto; la base
  aplica encima de lo guardado y conserva lo que no llega. Un documento sin texto y sin guardar antes no se crea; uno ya guardado al que se le borra el texto da «Escribe
  el texto de …» junto al editor (quitar un legal no entra: la base lo permite con `null`, la pantalla no lo ofrece).
- **D3 · Conflicto de legales = el de «Ajustes»**: `PT409` → `<AvisoDeConflicto>` dentro del formulario y «Recargar» (borra el borrador y refresca); la versión es la `key`.
  Guardar legales y guardar «Ajustes» comparten versión.
- **D4 · Borrador de legales** con `useBorradorDeEstado` (clave `web-legales`): el título y el documento de cada uno son estado controlado.
- **D5 · Etiquetas fijas de los dos editores** («Texto de los términos», «Texto de la política»): con dos editores en la pantalla el nombre accesible `Texto` de las
  guías chocaría. La imagen va apagada (`imagenes={false}`) y, por defensa, la escritura quita cualquier nodo `image` de primer nivel (`sinImagenes`); la frontera es la base.
- **D6 · La tabla de categorías no tiene versión** (`id, slug, nombre, orden, activa`): la última escritura gana. Renombrar con cero filas es «Esta categoría ya no existe.».
  Sin RPC ni migración.
- **D7 · La dirección (`slug`) de una categoría sale del nombre al crearla** (`slugDe`, el de las guías) y **renombrar no la cambia**: la dirección del sitio no se
  mueve por un cambio de texto. Sin letras ni números: «Escribe un nombre con letras o números.». `23505` → «Ya hay una categoría con ese nombre.» junto al campo.
- **D8 · Ordenar reescribe `orden` 0..n−1** de todas, con **un** `upsert` de sólo las filas que cambian (con todas en `0` por defecto, intercambiar dos no ordenaría).
  Una carrera con un renombrar simultáneo es una ventana de milisegundos sobre una tabla de configuración: aceptada. Crear pone `orden` = el mayor + 1.
- **D9 · Tope de 100 categorías** (`TOPE_DE_CATEGORIAS`, igual que las opciones de la guía: el selector las muestra todas). La lista se lee con 101; la 101.ª no se crea.
  La tabla entra a `TABLAS_ACOTADAS` de la guarda de escala con ese motivo.
- **D10 · «Borrar sólo sin guías» es regla de la action**: `web_guias.categoria_id` es `on delete set null`, el borrado no falla solo. La action lee una guía de esa categoría
  (`limit 1`); si hay, rechaza y no borra. En la lista, «Eliminar» sale apagado con «Tiene guías: desactívala.».
- **D11 · «Con guías» / «Sin guías» sale de una sola lectura acotada** (`web_guias.categoria_id in (…) limit 1000`, por `web_guias_categoria_id_idx`), sin consulta por fila ni
  números. Si llega al tope, las que no aparecen dicen «Sin verificar» y «Eliminar» queda encendido (la action vuelve a revisar).
- **D12 · Desactivar sólo esconde la categoría del selector de la guía nueva**: la guía que ya la tiene la sigue mostrando («(desactivada)») y `web.guias` sigue sirviendo
  su nombre. Reversible, sin confirmación.
- **D13 · La lista de categorías se lee con la pestaña «Guías»** (en paralelo con las guías); el panel (`?panel=categorias`) y sus cinco actions viajan en su chunk
  diferido y el diálogo de eliminar tiene su URL (`?eliminar=categoria&categoria=<id>`). Tras cada cambio, `revalidatePath` en la action y ningún `router.refresh()`.
- **D14 · El selector de la guía dice** «Todavía no hay categorías. Se crean desde «Categorías» en Guías.» (lo anunció la D9 del 8.03-1).
- **D15 · Docs del paso en `docs/pasos/8.03-2/`** (como el 8.03-1 dejó `docs/pasos/8.03-1/`): con un carril con coordinador no se editan `ESTADO`, `PLAN`, `BITACORA` ni
  `DECISIONES`.
- **D16 · El pie del panel «Categorías» es «Listo»** (cierra). El nombre escrito sin agregar avisa con `<CambiosSinGuardar>` (la guarda de drawers lo exige) pero no
  hay borrador: es una sola línea.

<!-- paso:8.04-1 -->

## 2026-11-12 · Decisiones del paso 8.04-1 (la base del tablero de la cola web, las solicitudes por cursor y el job)

- **D1** · **Una lectura propia, sin tocar `estado_cola_web`**: `cola_web_tablero()` lista **todas** las habilitadas, con `en_la_rueda` calculado por
  `puede_estar_en_la_rueda()`. La vista queda como está: filtra por la rueda y esconde justo a quien está habilitada sin el permiso (8-1).
- **D2** · **Respuesta `jsonb` `{filas, hay_mas}`**, como `agenda_tareas_sin_fecha`: la base lee `tope + 1`. El tablero, `_acotar_pagina(p_tope, 100, 200)`
  (100 = `TOPE_DEL_EQUIPO`: la rueda no pasa del equipo); las solicitudes, `_acotar_pagina(p_tamano, 20, 50)` (20 = `TAMANO_DE_VER_MAS`). Los registros de
  `scripts/guardas/areas-b/paginas-en-la-base.ts` entran en la 8.04-2, con su llamada: la guarda exige que cada entrada tenga quién la llame.
- **D3** · **El índice va `(estado, creado_en desc, id desc)`**, no `(…, id)` como decía la fila: el orden de la lista es `creado_en desc, id desc` y el
  cursor `(creado_en, id) < (c, i)` sólo es condición de índice con las dos columnas en el mismo sentido.
- **D4** · **«Sin asignar» = todas las `sin_asignar`, de la más nueva a la más vieja, por cursor**, sin recorte por fecha (no esconder nada). El número que
  dibuje la 8.04-2 es el de la primera página («más de 20»), nunca un `count(*)`.
- **D5** · **El título del vehículo sale de `web.vehiculos`** (lo que el visitante vio; nulo si dejó de verse): costos y VIN quedan fuera por construcción.
- **D6** · **El tablero no devuelve el WhatsApp**, sólo `falta_whatsapp`; una solicitud tampoco trae `token_visitante`, `utm` ni `lead_id`.
- **D7** · **`cuenta_activa` aparte de `en_la_rueda`**: `puede_estar_en_la_rueda()` también es falso con la cuenta bloqueada o inactiva, y la pantalla no
  debe decir «su rol no recibe turnos» de quien está bloqueada.
- **D8** · **`cola_web_configurar` no cambia** (upsert sin versión, última escritura gana): `cola_web_asesores` es de configuración y no tiene
  `actualizado_en`; ponerle versión es otra RPC y otro paso.
- **D9** · **`aplicado_en` de `web.cola.gestionar` se actualiza en la migración y en `supabase/seed.sql`**: el seed corre después de las migraciones con
  `on conflict (clave) do update … aplicado_en = excluded.aplicado_en` y, sin tocarlo, dejaba el texto viejo en local y en el CI (auditoría del plan).
- **D10** · **El job va en su propia migración**, `web-expirar-solicitudes` cada 5 minutos con el límite por defecto de la función (200 por corrida);
  comando sin URL. Cierra el arrastrado «el job `web_expirar_solicitudes` se programa con esta fase».
- **D11** · **`abiertas` del tablero es un conteo exacto a propósito**: el orden de la rueda que dibuja la app es el espejo del de `web.solicitar_asesor`,
  que cuenta igual; lo acota el cupo de cada persona (≤ 50) y va por `solicitudes_web_asesor_abiertas_idx`. Dicho en el comentario de la función.
- **D12** · **Para la 8.04-2:** `ruta` de una solicitud es texto libre del visitante anónimo (`web.solicitar_asesor`, `p_ruta`): la pantalla lo dibuja
  como texto, nunca como enlace ni como HTML (auditoría del informe).

<!-- paso:8.04-2 -->

## 2026-11-12 · Decisiones del paso 8.04-2 (la lectura del tablero de la cola web y su pantalla de sólo lectura)

- **D13** · **«Ver más» se lee en el navegador**, como «Tareas sin fecha» de la agenda: `infra/cola/solicitudes.client.ts` llama `cola_web_solicitudes` con
  la sesión de quien mira (la RPC es de definidor y vuelve a exigir `web.cola.gestionar`) y sale por `areas/cola/client.ts`. La primera página la lee el
  servidor, para el conteo y para que la pantalla llegue dibujada. Ninguna Server Action para leer.
- **D14** · **El orden de la rueda usa el `cupo` de cada fila** (la base ya lo da como `coalesce(max_abiertas, max_abiertas_default)`): `ordenDeLaRueda(filas)`
  no recibe `cupoPorDefecto` (lo nombraba el plan de la 8.04-1). Una sola fuente del cupo.
- **D15** · **La rueda muestra a todas las que están en ella**: primero, numeradas en el orden de la ruleta (`<ol>`), las que hoy recibirían un turno nuevo
  (disponibles y con WhatsApp); al final, por nombre, las que no, con «Hoy no recibe turnos nuevos: …» (le falta el WhatsApp gana sobre no disponible). Sin
  etiqueta «le toca»: el turno abierto y el pegajoso de la base pueden adelantarse; el número es el orden de la ruleta, no una promesa.
- **D16** · **`fuente` y `ruta` se dibujan como texto tal cual**: no hay catálogo de fuentes ni en la base ni en `src`. Ponerles nombre es del 8.05
  (`<TarjetaTurno>`); si allí nace una etiqueta, va en el núcleo para que `cola` la pueda usar (un área no importa otra).
- **D17** · **La política se lee en el área `cola`** (`infra/cola/politica.ts` sobre `ajustes_web`, una fila), no en `sitio`: un área no importa otra. El
  tablero usa `colaActiva` y `whatsappRespaldo` (los avisos de arriba); la 8.04-3 reusa el lector para el formulario (trae las cinco claves y `actualizadoEn`).
- **D18** · **«Actualizar» y volver a la pestaña = `router.refresh()`** desde `actualizar-tablero.tsx`, una copia corta de `RefrescarAlVolver` de `leads`: no
  se mueve a `src/shared` (subiría la parte a Nivel 2) ni se importa de otro módulo. La lista de «Sin asignar» lleva `key` = la firma de la primera página,
  así «Actualizar» descarta lo traído con «Ver más».
- **D19** · **Al tope de lo cargado (500), el aviso sin camino a lo antiguo**: no hay filtro ni fecha para las `sin_asignar` (fuera de la fila del PLAN), y a
  quien quedó ahí ya se lo mandó al respaldo. Reversible: un filtro por fecha es otra RPC.
- **D20** · **El tablero con `hay_mas`** (más de 100 habilitadas, `TOPE_DEL_EQUIPO`) avisa «Mostrando las primeras 100 habilitadas, por nombre.» y agrupa lo
  leído. Los números de cada fila (vencidas, abiertas de su cupo) son columnas o conteos acotados por el cupo, no totales de una tabla que crece.
- **D21** · **Cada parte del tablero con su error**: si una de las tres lecturas falla, esa parte muestra su error con «Reintentar» (`router.refresh()`) y las
  otras se dibujan igual; no se tira la pantalla entera a `error.tsx`.

<!-- paso:8.07-2 -->

# 8.07-2: decisiones (2026-11-12)

- **D1 · `acciones.md` sin `jose` entra aquí y no en el 8.07-3.** La cookie con `node:crypto` llega en esta parte y la regla no puede contradecir el código.
- **D2 · `ipDelPedido(headers)` queda entero en el 8.07-3.** Qué cabecera es de fiar depende de la medición D6 del 8.07-1. `contarIntentoDelPortal`
  aplica `agruparIp` adentro: ningún handler puede olvidarla.
- **D3 · IPv6 por su /64.** Es lo mínimo que se asigna a un cliente: recorrerlo no salta el límite ni llena la tabla. Una IPv4 mapeada cuenta como su
  IPv4; lo que no es IP va como `''` y la base lo cuenta como `'desconocida'`, un solo balde.
- **D4 · La firma se compara como texto base64url.** 32 bytes en base64url dejan dos bits sueltos en el último carácter: comparar los bytes
  decodificados aceptaría ese carácter cambiado. Antes, las dos partes tienen que ser del alfabeto base64url, así `timingSafeEqual` nunca lanza.
- **D5 · `urlDeDocumentoDelPortal` une `portal_documento_ruta` y `createSignedUrl` de 60 s.** La ruta privada no llega a `src/app` como dato: lo
  garantiza la forma, no la disciplina del handler. Sí viaja dentro de la URL firmada (así la arma Supabase), que sin el token no abre nada.
- **D6 · Toda respuesta de RPC que se interpreta pasa por Zod** y acepta nulo donde la base puede darlo, aunque el tipo generado diga `string`. El
  snapshot va tal cual (`unknown`): lo interpreta el sitio.
- **D7 · Los nombres públicos llevan «DelPortal»:** `web/index.ts` hace `export *` de todas las áreas y `sitio` ya exporta `leerDireccionPublica`.
- **D8 · Sin prueba unitaria para el esquema del entorno ni para `rpc.ts`:** son envoltorios; `rpc.ts` lo recorre el e2e del 8.07-3 contra la base.
- **D9 · `leerSesion` descarta un valor de más de 1024 caracteres** antes de calcular nada (una cookie válida ronda los 170).
- **D10 · `cookie.ts` es puro:** recibe el secreto y la hora, y se prueba sin mocks del entorno. El secreto se lee en `secreto.ts` (`server-only`).
- **D11 · Un cliente admin nuevo por llamada,** creado dentro de cada función de `rpc.ts` (nunca global).
- **D12 · Lo que entra a `rpc.ts` lo validan los handlers** con Zod en la frontera HTTP (8.07-3); `rpc.ts` valida lo que vuelve de la base.
- **D13 · El secreto no sale del área:** `composicion.ts` lo ata a la firma y a la lectura; `src/app` sólo ve `portalDisponible()`.

<!-- paso:8.07-3 -->

# 8.07-3: decisiones (2026-11-12)

## El contrato con el sitio

El sitio (repo `sitio-marketing`) reescribe `/api/portal/*` hacia el CRM, así la cookie `portal` es de primera parte (`HttpOnly`, `Secure`,
`SameSite=Lax`, `Path=/api/portal`, 7 días). Los POST llevan el `Origin` del sitio, que debe ser el de `ajustes_web.direccion_publica`
(Configuración › Sitio web). Toda respuesta lleva `Cache-Control: no-store`. Sin `PORTAL_COOKIE_SECRETO`, toda ruta responde 503.

| Ruta                  | Pide                                  | Responde                                                                                                                             |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `POST ingresar`       | `{ codigo, clave }`, `Origin`         | 200 `{ nombre, debe_cambiar_clave }` + cookie · 401 `{ error }` (todo fallo, el mismo cuerpo) · 403 · 429 + `Retry-After: 900` · 503 |
| `GET estado`          | cookie                                | 200 con el snapshot de `portal_snapshot` · 401 y la cookie borrada · 500 · 503                                                       |
| `GET documentos/[id]` | cookie                                | 302 a una URL firmada de 60 s · 401 y la cookie borrada · 404 (id inválido o ajeno, el mismo) · 500 · 503                            |
| `POST clave`          | `{ actual, nueva }`, cookie, `Origin` | 200 `{ ok: true }` · 400 `{ error }` · 401 · 403 · 500 · 503                                                                         |
| `POST salir`          | `Origin`                              | 204 y la cookie borrada · 403 · 503                                                                                                  |

La ruta del documento no sale en el cuerpo ni en un error; sí viaja dentro de la URL firmada de 60 s, como la arma Supabase.

## Decisiones

- **D1 · La IP del límite** (D6 de la 8.07-1). `ipDelPedido` toma la primera entrada de `x-forwarded-for` y, si falta, `x-real-ip`. En Vercel la
  plataforma pisa `x-forwarded-for` con la IP de quien se conecta; Next 16.4.3 conserva la que llega (`base-server.js`, `??=`). **El límite supone
  Vercel** (o un proxy que pise la cabecera): con `next start` sin proxy, o un proxy que agrega en vez de pisar, el cliente elige esa entrada y el
  límite se salta; sólo queda el bloqueo por código (5 fallos), que no frena probar una clave contra muchos códigos. Otro alojamiento cambia
  `ipDelPedido`. Qué IP ve el CRM detrás de la reescritura no se puede medir sin producción: si fuera la del sitio para todos, el límite (10 por
  15 min) frenaría el portal entero. Hoy el portal no tiene pantallas publicadas. **Abierto:** al publicarlo, mirar en los registros de Vercel la IP
  de `/api/portal/ingresar`; si es la del sitio, una cabecera propia firmada por el sitio con un secreto compartido (un solo archivo puro y una variable).
- **D2 · IPv6 al azar en el e2e.** Cada prueba usa un /64 al azar: `agruparIp` cuenta por /64 y una segunda corrida local no hereda la cuenta.
- **D3 · `Origin` obligatorio en los POST**, comparado por `URL.origin` contra el del pedido o la dirección pública del sitio (que se lee sólo si no
  es el propio). Más estricto que `leads/exportar`, que acepta un POST sin `Origin`: aquí no hay sesión de Supabase detrás.
- **D4 · Todo fallo de `ingresar` da el mismo 401**, también un error de la base (contador o login) y un cuerpo de más de 2 KB: falla cerrado y sin
  oráculo. Sólo 403, 429 y 503 se distinguen.
- **D5 · Una cookie inválida, vencida o revocada** responde 401 y la borra: el sitio sólo sabe «volver a ingresar».
- **D6 · El e2e manda la cookie a mano** en `Cookie`, con un contexto de `request` nuevo por pedido: no depende de si el almacén guarda una `Secure`
  sobre `http://localhost`.
- **D7 · La comparación del `Origin` es una función pura** (`mismoOrigenDelPortal`) con su prueba: es la puerta contra CSRF de un endpoint sin sesión.
- **D8 · Sin Vitest de los handlers** (envoltorios de HTTP sobre `rpc.ts`): los recorre el e2e contra la base real. El 503 no se prueba por e2e.
- **D9 · El secreto de prueba** va en `playwright.config.ts` con `||` (una variable vacía daría 503) y no en `.env.example`.
- **D10 · `salir` no revoca en la base:** la sesión es una cookie firmada sin estado; el corte del lado del CRM es «Volver a otorgar» o revocar.
- **D11 · `documentos/[id]` mira la cookie antes que el id:** sin sesión no se sondea qué ids existen.
- **D12 · `POST clave` no pasa por el límite por IP:** exige la cookie y la base bloquea a los 5 fallos de la clave actual.
- **D13 · Cada handler llama `await connection()` antes que nada.** Con `cacheComponents`, `next build` prerenderizaría un GET que sale por el 503 (el
  CI compila sin el secreto) y lo serviría estático aun con el secreto cargado (auditoría del plan). El build los marca `ƒ`.
- **D14 · `POST clave` con `false` responde 400 sin borrar la cookie**, aunque la causa sea una sesión que ya no vale (la RPC no las distingue): el
  sitio lo ve en el siguiente `estado`. Separarlo pide cambiar la base; no vale el costo.

<!-- paso:8.10-3 -->

## 2026-11-12 · Decisiones del paso 8.10-3 (reasignar, la vista «Stock» y el e2e del assert)

- **D1** · **Sin SQL nuevo.** La base de 8.10-1 ya da `repuesto_stock_reasignar`, `repuesto_stock_mover` y `repuestos_stock_listar` con sus pruebas y la carrera (V1, V23); la parte es
  servidor de app y pantalla. Sin `db:*` ni `database.types.ts`.
- **D2** · **El buscador de destino vive en el área `proyectos` y lo compone `src/app`**: la lectura de proyectos es de esa área (`leerProyectosDelListado`, V16) y el área `stock` no la
  importa (V27). La vista recibe el campo por render prop desde un Client Component de `A:` (como `hoja-con-stock.tsx`, D4 de 8.10-2), que usa `BuscadorConLista` (V14).
- **D3** · **La vista es `?vista=stock`** con dos enlaces arriba, «Proyectos» y «Stock» (`aria-current`, como `?ver=` de logística, V12); «Proyectos» sigue siendo la de por defecto;
  un `?vista=` desconocido es «Proyectos»; cambiar de vista no conserva filtros ni cursor. «Nuevo proyecto» (botón, `N` y drawer) sólo en «Proyectos».
- **D4** · **«Stock» sin filtros, búsqueda ni selector de tamaño** (la fila no los pide; `.piloto/planes/8.10.md:82`): una página de `TAMANO_DE_PAGINA_POR_DEFECTO` por cursor
  `(en_stock_desde, id)` con «Siguiente» y, con cursor, «Volver al principio»; el camino a lo antiguo es «Siguiente».
- **D5** · **El clic en la fila** (y `<AbrirResumen>` con el teclado) abre el ítem en la hoja de su proyecto con su panel de stock, `/repuestos/<proyecto>?panel=stock&item=<id>`
  (8.10-2): allí están el historial y «Pasar a stock»; no se duplica un resumen.
- **D6** · **Las acciones de la fila van en «⋯»** (`<MasAcciones>`), sólo con `repuestos.editar`: «Reasignar a un proyecto», «Vender suelto», «Devolver al proveedor», en ese orden.
  Sin el permiso no se dibuja «⋯». «Ajuste» no se ofrece (D6 de 8.10-1). Valen con el proyecto de origen cerrado (D3 de 8.10-1).
- **D7** · **Cada acción es un `<Drawer>` con URL**: `?vista=stock&panel=reasignar-stock|vender-stock|devolver-stock&item=<id>`. El ítem se busca en la página vigente; si no está (ya
  salió del stock, o es de otra página) → `useRevisionAlAbrir` con «Ese ítem ya no está en stock.» y la URL se limpia, una vez (V20).
- **D8** · **Vender suelto y Devolver al proveedor** comparten un drawer con el motivo: «Cantidad» (entero desde 1 hasta lo que hay, `validarMovimiento` de salida) y «Nota» opcional
  (hasta 500); `moverStock` con `stockEsperado` = el stock de la fila (V5): si cambió, PT409 → toast con «Recargar». Vender suelto no pide precio (D1 de 8.10-1).
- **D9** · **Reasignar**: «Proyecto destino» (buscador: sólo abiertos, sin el proyecto de origen) y «Cantidad» (1 hasta lo que hay, `validarReasignacion` con `mismoProyecto` falso y
  `destinoCerrado` falso: el buscador ya los excluye, la base vuelve a mirar). El `id` del ítem nuevo sale de `crypto.randomUUID()` al abrir el drawer, se conserva en cada
  reintento y se renueva tras el éxito o al reabrir, atado a la `apertura` de `useApertura` (C10; el drawer no se remonta con `useAbiertoAlgunaVez`) (idempotencia de la
  RPC, D10 de 8.10-1). Sin stock esperado (D10 de 8.10-1).
- **D10** · **Tras el éxito** el drawer se cierra, un toast lo dice («Vendiste N.», «Devolviste N al proveedor.», «Reasignaste N al proyecto #M.» con la acción «Ver proyecto» que va a
  `/repuestos/<destino>`) y `router.refresh()` relee la página: la lista es del servidor. Sin `revalidatePath` (como D8 de 8.10-2). Una fila que llega a 0 sale de la lista.
- **D11** · `buscarProyectosAbiertos` pide `repuestos.editar` con `puede()` antes de leer (sólo la usa reasignar; no abre una lectura nueva a quien sólo ve) y lee bajo la RLS: con
  `estado: 'abiertos'`, `cursor: null`, `tamano: TAMANO_DE_VER_MAS` y el texto sólo si cumple `MINIMO_DE_BUSQUEDA_DE_PROYECTOS` (si no, lista vacía sin llamar a la base).
- **D12** · Las actions no llevan test de Vitest (D11 de 8.10-2): el permiso de reasignar lo prueba la base (`stock-reasignar.sql`) y la action mira `puede()` antes. Lo clave con
  test: el esquema (lo que cruza a la base) y la respuesta de reasignar.
- **D13** · La columna «Proyecto» dice `#N` y el vehículo (título, si no la etiqueta, si no «Externo»), y un `<Badge>` «Cerrado» si el proyecto está cerrado; «Desde» con
  `formatearFecha` (fecha sin hora, `fechas.ts`); «En stock» a la derecha con `tabular-nums` y `formato.ts`.
- **D14** · Estados de la vista: **cargando**, el `<EsqueletoListado>` del `<Suspense>` de la página (V9); **vacío por primera vez**, «No hay repuestos en stock.» con «Lo que sobra de un
  ítem se pasa a stock desde la hoja de su proyecto.»; **cursor fuera de rango**, `EstadoPaginaSinFilas`; **error**, el de `(app)` con «Reintentar» (`datosO`, como proyectos);
  **sin permiso**, el de la página. Sin «vacío por filtro» (no hay filtros).
- **D15** · El e2e **extiende** `repuestos-stock.spec.ts` con un segundo test del mismo `describe` serial (usa el proyecto y el stock del primero, V22); el proyecto destino se crea por
  la interfaz con la etiqueta `Destino stock e2e <proyecto>` (no empieza con «E2E», D12 de 8.10-2; no contiene la de origen, así la búsqueda no la confunde) y la limpieza borra
  las dos etiquetas. Al final, «Vender suelto» de lo que queda → la fila sale (cubre el otro drawer sin un test aparte). `escritorio` y `movil` (interfaz, D13 de 8.10-2).
- **D16** · El GLOSARIO suma «Devolver al proveedor» (V24): término nuevo en la interfaz.
- **D17** · Lo que sumó la auditoría del plan: `buscarProyectosAbiertos` lee por `repositorioDeProyectos.listar` (`features` no importa `infra`) y arma las opciones
  en el servidor (no viaja la fila entera); el `id` del ítem nuevo nace con el formulario, cuya `key` es la `apertura`, así reabrir da uno nuevo.

<!-- paso:8.11-1 -->

## 2026-11-12 · Decisiones del paso 8.11-1 (la base de compras y margen de repuestos)

- **D1 · El tipo de cambio es el por defecto vigente al guardar,** congelado en la fila (`tipo_cambio_id` y `tipo_cambio_aplicado`), como `pagos`: la recomendada de la fila.
  Primero `moneda → base` y, si no hay, `base → moneda`. Editar sin cambiar la moneda conserva la tasa; cambiar la moneda toma la vigente. Sin un tipo por defecto activo,
  23502 hint `moneda` con el texto que dice dónde marcarlo. La compra no deja elegir el tipo (a diferencia de `pagos`): se puede ampliar con una clave más en la lista.
- **D2 · `monto_base`, `tipo_cambio_aplicado` y `tipo_cambio_id` en `p_datos` dan 22023,** no se ignoran en silencio (como `_pago_de_cambios`). El assert («`monto_base`
  lo pone la base aunque el cliente mande otro») se cumple porque el valor del cliente nunca queda guardado: al crear no queda la fila y al editar las tres columnas
  no cambian (B1).
- **D3 · Una sola RPC crea y edita:** con la esperada nula crea, idempotente por id (un reintento devuelve lo guardado con `ya_existia: true`) y nunca pisa, como
  `gasto_registrar`; el mismo id en otro proyecto da 23505. Sin cambios devuelve `sin_cambios: true` sin mirar la versión, como `pago_guardar`.
  El reintento idempotente no mira si el proyecto sigue abierto: no escribe nada y devuelve la compra que ya existe (auditoría del informe, 4).
- **D4 · Un proyecto cerrado no recibe ni cambia compras** (23514 hint `proyecto`), igual que la hoja: se reabre, se registra y se cierra.
- **D5 · `repuesto_compra_restaurar` entra aunque la fila no la nombra:** borrar es reversible y `ui.md` pide «Deshacer». Restaurar una compra cuyo ítem se eliminó da
  23514 hint `item_id`: la regla de 8.08 («un ítem con compras vivas no se borra») no se rompe por la puerta de atrás (auditoría del plan, 3).
- **D6 · El precio de un ítem es `cantidad × precio_cliente`** (`precio_cliente` es unitario: 8.12 copia allí el precio unitario de la línea). Con un ítem vivo sin precio
  **o con precio y sin moneda** (la hoja escribe las dos celdas por separado), el margen es nulo en **todas** las monedas: no se sabe en qué moneda iría ese precio
  (auditoría del plan, 1). El margen usa la cantidad pedida: lo que pasó a stock o se reasignó (8.10) no la descuenta; si eso cambia, es de 8.13.
- **D7 · El margen y las tres RPC de escritura piden además `repuestos.ver`:** el margen revela la suma de los precios de los ítems y la respuesta de escribir devuelve
  `monto_base` y la tasa (auditoría del plan, 6).
- **D8 · Sin carrera nueva:** no hay saldo ni numeración; la versión bajo `for update` es el patrón de `pagos`, probado por K1 de `supabase/tests/areas/dinero/carreras.mjs`.
- **D9 · La prueba de las policies va en `areas/repuestos/compras.sql`** (B3, B4) y no en `humo.sql`: es la regla de un carril (`migraciones.md`), como en 8.10-1.
- **D10 · Sin índice nuevo para la lista:** es por proyecto, con `repuestos_compras_proyecto_id_idx`, y llevará un tope de 200 (8.11-2). Compras no es una tabla que crece.
- **D11 · El monto es ≥ 0,** como el `check` de la tabla y los gastos. El proveedor es opcional, de hasta 200 caracteres; las notas, de hasta 2000.
- **D12 · Un conflicto de versión da PT409 sin hint** (lo lanza `_exigir_version`, como en `pagos` y `gastos`); «ya no existe» lleva hint `conflicto`.
- **D13 · `aplicado_en` también en `seed.sql`:** el seed hace `on conflict (clave) do update set … aplicado_en` y con `db:reset` pisaría la migración (auditoría del plan, 2).
  `repuestos.costos.ver` nombra además las policies de `pagos`, `gastos` y `repuestos_cotizaciones`, que ya lo usaban.
- **D14 · La migración `repuestos_compras_guardar` tiene 345 líneas y `_repuesto_compra_de_datos` 136** (el plan estimaba ≈ 230): es la lista cerrada con un hint
  por campo, como `_pago_de_cambios`, y la tasa. No se parte después de verificada con las mutaciones de dinero. Si un paso la recrea, la parte en
  `_repuesto_compra_validar` y `_repuesto_compra_tasa`. La prueba sí se partió (`compras.sql` B1–B4 y `compras-version.sql` B5–B8, auditoría del informe, 1–3).
- **Escrituras directas quitadas** (abierto «Quitar escrituras directas» de `docs/PLAN.md`, que cita 8.11): las policies «repuestos_compras: crear» y «editar» y los
  privilegios de INSERT, UPDATE y DELETE de `authenticated`. Ninguna pantalla las usaba; las tres pruebas SQL que insertan compras corren como `postgres`.
- **Queda abierto** para «Pulido para la Fase 9» › seguridad: los pagos de un proyecto de repuestos todavía se escriben sólo por `pago_*` de vehículo
  (`pago_registrar` exige `p_vehiculo`). Es de 8.13.

<!-- paso:8.11-2 -->

## 2026-11-12 · Decisiones del paso 8.11-2 (la pestaña «Compras», la lista y el margen)

- **D1 · La clave de URL es `?pestana=compras`,** no `?seccion=` como dice la fila: la barra de `/repuestos/[id]` usa `pestana` desde 8.09-2. La conducta pedida
  (sin permiso cae en «Ítems») es la misma.
- **D2 · Sin `diferido()` para la sección:** se lee y se dibuja en el servidor sólo con la pestaña abierta, y `diferido()` no dibuja en el servidor. No se midió si el
  código de cliente de la lista (≈ 120 líneas) entra al chunk de la ruta; `/repuestos/[id]` no tiene presupuesto de JS. El Drawer de 8.11-3 sí va con `diferido()`.
- **D3 · La celda del comprobante pasa a 8.11-3,** con la subida: verlo pide la URL firmada y hoy ninguna compra puede tener comprobante desde la app.
- **D4 · Con «Compras» abierta se sigue leyendo la hoja:** la cabecera (estado del proyecto, «sin ítems») la necesita; son ≤ 201 filas por índice.
- **D5 · La fila ya trae `item_id`, `notas`, `comprobante_ruta` y `actualizado_en`** para que 8.11-3 edite sin tocar la lectura.
- **D6 · Si la lista o el margen fallan, sube al `error.tsx` con «Reintentar»,** como las demás lecturas de la página.
- **D7 · El permiso de una pestaña es una sola clave opcional (`permiso?`),** no una lista como en Configuración.
- **D8 · Tipo de esta parte: pantalla** sobre permisos y RPC de 8.11-1 (sin migración). Lo de riesgo: quién ve la pestaña (`pestanasLlenas`) y nulo ≠ 0 en pantalla.
- **D9 · El equivalente en la moneda base sale de `monto_base`, leído, nunca calculado;** una fila de antes de 8.11-1 con `monto_base` nulo se lee y no dibuja
  «Equivale a» (la columna admite nulo; auditoría del plan, 1).
- **D10 · El tope de 200 compras por proyecto lleva `<AvisoDeTope>` sin camino** (excepción a «siempre hay un camino a lo antiguo»): compras no es una tabla que
  crece y un proyecto no llega a 200. Si aparece, el camino (filtro por fecha) va a «Pulido para la Fase 9».

<!-- paso:9.04-1 -->

## 2026-11-12 — Paso 9.04-1: `leads.campos.gestionar` (9-3)

- **Nombre y orden de la clave:** «Gestionar los campos de los leads», orden 215 (justo después de «Configurar leads», 210). «Gestionar» es el verbo de las claves hermanas (`equipo.usuarios.gestionar`, `leads.portal.gestionar`).
- **«Mismo alcance» = «todos» y sin origen:** `leads.configurar` no va por origen ni por alcance, así que toda concesión suya es ésa; copiar filas podría duplicar por origen. La reciben el dueño y todo rol con alguna fila de `leads.configurar` (precedente: `cotizaciones.papelera.purgar`, 4.15-7). Nadie pierde nada.
- **La pestaña que no puedes abrir se ve apagada con su motivo** en una línea visible bajo la barra (no sólo un `title`), y las que comparten motivo van en una línea. La URL que pide una apagada abre la primera habilitada, en vez de un «sin permiso» dentro de la página. La lectura del motivo con lector de pantalla (un `TabsTrigger` deshabilitado no recibe foco) queda para el pulido de la Fase 9.
- **El enlace «Configurar los campos» del listado y el editor de campos siguen a la clave nueva**, y también `vista-previa-de-campo` (llama a `lead_campo_impacto`).
- **No se editan `permisos-enforcement.sql` ni `humo.sql`:** la clave nueva entra por el caso genérico, y el bloque de `…0030` sólo espera `insufficient_privilege`.
- **La prueba de la concesión vuelve a ejecutar la migración** sobre roles propios, como el precedente: en la base reseteada no hay más rol con `leads.configurar` que el dueño, y la concesión no se pondría a prueba.
- **Las dudas del PLAN, con la recomendada:** (1) un valor que ya estaba fuera del rango no impide guardar → 9.04-2; (2) las plantillas con `leads.configurar`, sin clave nueva → 9.04-4; (3) el 6.13 ya está en `main`, así que no choca con el panel del campo; (4) el paso se parte en cinco partes (9.04-1 a 9.04-5).
- **El nombre del permiso en los motivos va escrito en el código** (`MOTIVO_SIN_PERMISO_CAMPOS`, `pestanas.ts`), como el `MOTIVO_SIN_PERMISO_LEADS` de antes: `permisos.ts` no tiene un mapa de etiquetas y el nombre del catálogo sale de `permisos.nombre`.

<!-- paso:9.04-2 -->

## 2026-11-12 — Paso 9.04-2: el rango de un campo numérico en la base (9-2)

- **Un valor que ya estaba fuera del rango no impide guardar** (duda 1 del PLAN, la recomendada): se valida un campo sólo si su valor cambió respecto del anterior. Cambiar el rango no revalida lo cargado; el impacto avisa cuántos quedan fuera.
- **`*_campo_crear` también recibe el rango** (`p_minimo`/`p_maximo` al final, con default): el alta de un campo numérico con límites es una sola llamada, y la 9.04-3 no necesita otra migración.
- **El impacto recibe `p_cambios jsonb`** (las claves `minimo`/`maximo`, como guardar) y no dos `numeric`: con dos `numeric` no se puede proponer «quitar un límite». Sin `p_cambios`, mide el rango vigente.
- **`fuera_de_rango` acotado a 51** (tope 50 y uno de más, `conteoAcotado(n, 50)`), como `fase_impacto`; null cuando el campo no es numérico o no tiene límites.
- **En vehículos rige para toda escritura que cambie el valor**, también la importación de la subasta (escribe con sesión): es el mismo trigger que ya valida el tipo. Si cambia el origen se valida todo, porque los campos son otros.
- **La base escribe los números del motivo sin separadores** (`trim_scale`): «"Edad" va de 18 a 99.». El formulario de la 9.04-3 los muestra con el locale.
- **Un límite en un campo que no es numérico se rechaza** (22023, `hint minimo`); si el tipo deja de ser numérico, el rango se va solo, como las opciones.
- **Un valor por defecto fuera del rango se rechaza** (`hint valor_defecto`): precargaría un valor que no se puede guardar.
- **Tres migraciones y tres commits** (validación, RPC de leads, RPC de orígenes), para no pasar de 300 líneas por archivo.
- **`lead_campo_guardar` y `lead_campo_impacto` figuran en `numero-global.sql` sin número de lead:** nombran el tipo `numero` (por el rango) y caen en el inventario por texto, pero devuelven una versión y conteos.

<!-- paso:9.04-3 -->

## 2026-11-12 — Paso 9.04-3: el rango de un campo numérico en `shared` y el panel (9-2)

- **El rango no rechaza un valor igual a lo guardado** (como la base, 9.04-2): abrir un lead viejo y guardar otro dato no choca con un rango nuevo. Para eso la edición de lead pasa `guardado` a `esquemaDeValor()`, como ya hacía el vehículo; de paso, una opción que se sacó del campo y el lead conserva sigue valiendo al editar otro dato, que es lo que `ContextoDeEsquema.guardado` documenta.
- **En vehículos, si cambia el origen** la base valida todo (los campos son otros), pero el cliente deja pasar el valor igual a lo guardado: en ese caso raro el rechazo de la base cae junto al campo por su `hint`.
- **«Mínimo» y «Máximo» usan el control de «Valor por defecto»** (`type="number"`, `valueAsNumber`), no el lector con locale de `numero()`: es el patrón del panel. Reversible si el panel pasa al lector.
- **El motivo del formulario dice lo mismo que la base** con los números en el locale de la empresa (hasta 6 decimales); la base usa `trim_scale`.
- **Se cuenta antes de guardar sólo si el rango se acota** (aparece o sube el mínimo, aparece o baja el máximo); quitar o ensanchar no deja a nadie fuera. La vista previa manda sólo el rango propuesto en `p_cambios`.
- **El aviso de fuera de rango no bloquea** y dice «más de 50» con el tope de la base (51, `conteoAcotado`).
- **El panel valida el rango antes de enviar** con los textos de la base y lo dice junto a «Mínimo», «Máximo» o «Valor por defecto»; la base sigue siendo la última línea. El esquema de crear lo vuelve a mirar (`conReglasDeCampo`).
- **Cambiar a un tipo sin rango vacía «Mínimo» y «Máximo»** en el formulario, como las opciones; la base hace lo mismo.
- **`CampoDeVehiculo` suma el rango como opcional**: `vehiculos` no importa `origenes` y declara la forma; opcional, como `principal`.
- **`NUMERO_MAXIMO` pasa a `tipos.ts`** (lo reexporta `esquema-de-valor.ts`): `rango.ts` lo necesita y así no hay un ciclo de imports.
- **No se partió en 3a/3b:** el corte natural no compila sin código de relleno (`cambiosRespectoDe(…, Required<…>)` obliga al formulario a dar el rango apenas los cambios lo llevan).

<!-- paso:9.04-4 -->

## 2026-11-12 — Paso 9.04-4: las plantillas por empresa en la base

- **Sin permiso nuevo:** las plantillas las edita quien tiene `leads.configurar` (duda 2 del PLAN, la recomendada). Su descripción y su `aplicado_en` las nombran, en la migración y en `seed.sql`.
- **Dos versiones, no una:** `embudo_actualizado_en` y `portal_actualizado_en` en vez del `actualizado_en` único del PLAN. Son dos secciones de pantalla independientes; con una sola, guardar una daría PT409 en la otra sin que nadie la tocara. Reversible.
- **Null restablece la de fábrica** (el «Restablecer» de 9.04-5); un mensaje en blanco cuenta como null.
- **Las seis etapas de fábrica pasan a `_embudo_etapas_de_fabrica()`** y `ajustes_leads_leer()` las entrega: la pantalla no las copia en TS. El texto de fábrica del portal sigue en `textoParaWhatsApp()`, como dice el PLAN.
- **El mensaje:** tope de 1000 caracteres; una variable desconocida `{x}` se rechaza (que una errata no salga literal al cliente); toda `{…}` cuenta como variable (`{Codigo}` o `{ codigo }` se rechazan); `{codigo}` y `{clave}` obligatorias, `{direccion}` opcional (sin dirección, 9.04-5 pone «la web de <empresa>»).
- **La plantilla no guarda ids de etapa** (cada embudo nuevo crea los suyos), descarta las claves que sobran y los booleanos son estrictos (22023, no 22P02); un `null` de JSON cuenta como ausente (`false`), como en `_embudo_insertar`.
- **Orden:** permiso → validación → candado y versión → sin cambios. Sin cambios devuelve la versión vigente sin moverla, como `web_ajustes_guardar`.
- **Sin carrera nueva:** la fila se bloquea con `for update` y la versión da PT409, y eso lo cubre el SQL. `pnpm db:carreras` corrió entero por regresión de `_embudo_defecto_de`.
- **La lectura es de toda cuenta activa**, como `ajustes_web`: no hay secretos y el texto lo necesita quien otorga el portal sin `leads.configurar`.
- **Sin `actualizado_por`:** `trg_auditar` ya guarda quién y qué en `actividad`.
- **`_embudo_plantilla_normalizar` y `_embudo_etapas_de_fabrica` son STABLE, no IMMUTABLE:** `jsonb_build_object` es STABLE y `db:lint` lo avisa (`_portal_mensaje_normalizar` sigue IMMUTABLE).
- **`embudo_plantilla_guardar` entra a la matriz de leads** (la guarda por nombre `^(oportunidad|embudo)_` de `auditoria-leads.sql`): las 8 personas dan 42501 o «cuenta»; el camino que pasa está en `areas/plantillas/plantillas.sql`. No se renombró la RPC (el PLAN la nombra así).

<!-- paso:9.04-5 -->

## 2026-11-12 — Paso 9.04-5: las plantillas por empresa en pantalla

- **Las pestañas se llaman como el glosario**, «Plantilla del embudo» y «Mensaje del portal»; van tras «Tipos de seguimiento», en `?seccion=embudo|portal`, y piden `leads.configurar` (duda 2 del PLAN). Las actions repiten el `puede` y la RPC lo exige otra vez.
- **«Restablecer» confirma en la URL** (`?panel=restablecer-embudo`, `?panel=restablecer-portal`, registrados en `scripts/guardas/confirmar-con-url.ts`) y se apaga si ya está lo de fábrica; escrita a mano en ese caso, se avisa y se limpia. El del portal envía `''`, que la base toma como nulo, porque el tipo generado de `p_texto` no admite `null`. El del embudo envía `null`. Un conflicto al restablecer se dice dentro del diálogo, con «Recargar».
- **El editor de la plantilla vive en la página, no en un drawer,** y reusa `ListaDeEtapas` con un tipo más angosto (`EtapasEnEdicion`). Las etapas llevan un id local sólo para la `key` y no viaja: la infra lo quita antes de llamar a la RPC.
- **Sin aviso de cambios sin guardar en la página:** `useCambiosSinGuardar()` sólo pregunta dentro de un `<Drawer>`. «Guardar» se apaga sin cambios, como en las demás pantallas de Configuración.
- **El textarea del portal parte del texto de fábrica con sus variables**, para editar sobre lo de hoy. Guardar ese texto tal cual envía `null`, para que la empresa no fije el de fábrica como propio y un cambio futuro del de fábrica le llegue. En blanco no se guarda: «Para volver al texto de fábrica, usa «Restablecer».», que confirma.
- **La vista previa usa un cliente, un código y una clave de ejemplo fijos** (nunca una clave real), con la empresa y la dirección reales. La compone `src/app`: `leads` no importa `empresa` ni `web`.
- **`{cliente}` de un lead sin nombre queda vacío.** No se reescribe la puntuación de la plantilla; el de fábrica sí saluda «Hola.» sin nombre.
- **La validación del mensaje en TS es espejo de `_portal_mensaje_normalizar`:** el orden, los textos, el largo en code points y el recorte sólo de ` \t\n\r`. Se dice junto al campo antes de enviar; la base decide.
- **Si la ficha no puede leer los ajustes, la sección «Portal» cae al `error.tsx` con «Reintentar»**, como cuando no puede leer el acceso: no se manda un texto que la empresa no eligió.
- **Las variables se reemplazan en una sola pasada:** un nombre con `{clave}` o `$&` sale literal.
- **El e2e deja `ajustes_leads` en lo de fábrica** con service_role, antes y después, porque Playwright corre con un solo worker. `leads-portal` y `leads-embudo` siguen viendo lo de fábrica.
- **Sin e2e en celular, capturas ni volumen** (pruebas sólo en lo clave); `configuracion-200.spec.ts` no suma las dos pestañas, pero corre dirigido por la barra.

<!-- paso:6.14-2 -->

# Paso 6.14-2 — El cierre de la Fase 6 (parte 2 de 2): el Nivel 3 y los docs de cierre

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/6.14-2.md`.

- **D1** Movil corre sobre el HEAD que haya al terminar el triaje de escritorio, como el 5.13-1: un proyecto no espera al otro y un `fix` ya se probó en
  los dos con su spec.
- **D2** El carril `a` edita `docs/PLAN.md` y `docs/ESTADO.md` directo («el ESTADO lo lleva el carril `a`»; así lo hicieron el 5.13 y el 6.14-1);
  BITACORA y DECISIONES, sólo por `consolidar-docs.mjs`.
- **D3** Los abiertos que sobreviven (6-2, 6-4, 6-5, 6-6, 6-7) quedan en «Los decide la persona»: ninguno es pulido, cerrarlos es código o datos fuera del
  «NO entra» del cierre, y ningún paso de las fases 7 a 9 los nombra.
- **D4** El 6-3 de las notas se renumera **6-7** (D11 del 6.14-1): el número ya era `pago_anular`, cerrado en el 6.10-2.
- **D5** En la ficha de `logistica` se borran las dos líneas duplicadas de «Tablas» que empezaban con «RPC: `margen_vehiculo`»: las siguientes dicen lo mismo
  y más (6.08 y la escritura de la oferta).
- **D6** La ficha de `flujos` (> 30 KB) suma una frase y no se recorta en este paso: recortarla es otra intención.
- **D7** La ficha de `tablero` ya está al día (los tres bloques de logística llenos, 6.12-2): se verifica, no se reescribe.
- **D8** Una fila de la tabla de criterios con más de una prueba sólo dice «verde» si todas lo están; una inestable lo dice con su nombre.

<!-- paso:flujo-8 -->

## 2026-11-12 — FLUJO-8: la puerta de fase mira el último veredicto, y el camino de un PR a `main` se acorta

Medido el 2026-11-12 a las 13:25, a 28,7 h de lanzar (49 de 69 pasos; 10 pasos en las 5 h desde FLUJO-7). De los 23 PR integrados
ese día, de abierto a integrado: mediana 38 min, p75 77, máximo 309 (el 9.04, cuatro CI rojos). Simulado con `plan.mjs` › `siguiente`
y las duraciones del día, lo que queda termina en serie (8.14 → 9.12 y 9.13 → 9.14) y cada PR de ese tramo y cada puerta suman
entero al reloj: con 40 min por PR, ≈ 14 h; con 75, ≈ 17.

- **La puerta de fase con carriles mira el último veredicto del workflow `ci` en `main`** (`scripts/piloto/ci.sh` › `ci_veredicto`,
  `bucle.sh` › `puerta_de_fase`), no su última corrida. En `main` cada integración cancela la corrida anterior (42 de 79 del 11 al
  12-11; 35 verdes, 2 rojas), así que «la última» casi siempre corría o estaba cancelada, y `gh run list` mezclaba el workflow `demo`:
  el 6.14 esperó 24 min con `main` sano y pasó por una corrida de `demo` de 38 s, que no prueba nada. Ahora: una corrida terminada, ni
  cancelada ni saltada, dice cómo está `main`; verde, la puerta abre sin esperar a la que corre; roja, espera a la más nueva en curso
  si la hay. Se descartó quitar la puerta en los cierres (el cierre corre su Nivel 3 igual): «no cerrar una fase con el CI en rojo»
  sigue siendo la regla, y con el último veredicto se cumple sin esperar.
- **Un rojo de `main` se vuelve a correr una vez antes del `ci-fix`** (`gh run rerun --failed`, anotado en `.piloto/puertas/rerun-<id>`):
  los rojos de `main` de esos dos días con un job caído a la vista fueron del runner (apt el 11, Docker Hub «toomanyrequests» el 12) y
  un `ci-fix` es una sesión de opus en el carril del camino crítico. Mientras esa corrida corre otra vez sigue siendo la del rojo: no
  vale el verde de antes. Y el rojo de la base (`rojo-base`) no entraba en ningún caso de la puerta: terminaba en «no encuentra un CI
  completo» y, tras seis esperas, aparcaba el cierre; ahora va al `ci-fix` como cualquier rojo.
- **Un check con veredicto está terminado, diga lo que diga su `status`** (`scripts/coordinador/pr.mjs` › `estadoDe`). GitHub dejó
  «Cambios · ¿base y e2e?» del #181 (6.14, parte 1) en `IN_PROGRESS` con conclusión `SUCCESS` y hora de fin: con todos los jobs en
  verde el PR quedó «pendiente» más de una hora y nada lo iba a integrar hasta el push siguiente.
- **Sólo «Carriles» en rojo y con migraciones atrasadas: renumera el coordinador** (`pr.mjs` › `soloElOrden`). Es lo que dice esa
  guarda cuando el CI corre después de que otra migración entró a `main`; como era un «rojo firme», el PR volvía a su carril y
  esperaba a que terminara la sesión en curso para un remiendo sin sesión (el 9.04: 33 min, y otro CI). Si «Carriles» caía además por
  otra cosa, lo dice el CI del commit renumerado, en 30 s.
- **`pnpm test` corre en 3 jobs** (`.github/workflows/ci.yml` › `pruebas`, `vitest --shard`). En un solo job eran 14 de los 15 a 18 min
  del «Nivel 1» (962 archivos, 10 052 pruebas, 844 s): el job más largo de un PR con e2e dirigidos (los cierres y las partes: el e2e
  terminaba a los 5 min y la base a los 8) y la causa de que el veredicto de `main` llegara tarde. Son dos jobs más por corrida; el
  repo es público y el promedio medido es de ≈ 2,4 corridas a la vez. No se tocaron los bloques del e2e (18 a 22 min con el completo):
  cada bloque comparte una base entre sus specs, y repartirlos de otro modo a esta altura puede destapar dependencias de orden.
- **`limpiar-ramas` ya no escribe en el registro** «fatal: Not a valid commit name» en cada vuelta (84 líneas en una mañana): la punta
  de un PR que empujó el propio coordinador no está en el repo local, y `git` lo decía por stderr.
- **Medido y no cambiado:** el reintento a ciegas de un CI rojo (de 10 de ese día, 3 terminaron en verde: sigue valiendo lo que
  cuesta). Los rojos de e2e de la tarde fueron casi todos del propio paso: la paleta (7.13) y el widget del chat (7.11) suman un pedido
  del marco y caen las pruebas que cuentan pedidos (`cotizar-guardada-guardar`, `cotizaciones-listado-resumen`, `vehiculos-resumen`);
  la sesión de arreglo los resuelve en ≈ 5 min, lo caro es la vuelta de CI. Y un carril que choca consigo mismo (8.02, 8.03 y 8.04 en
  `configuracion/web`): encadenar la rama del paso nuevo sobre la del PR propio sin integrar pide cambiar cómo se cortan las ramas con
  el piloto en marcha; queda anotado.

<!-- paso:8.04-3 -->

## 2026-11-12 · Decisiones del paso 8.04-3 (las escrituras de la cola web)

- **D22** · **Sin migración.** Las dos RPC ya existen y exigen `web.cola.gestionar`: `cola_web_configurar` (habilitar, quitar, cupo, prioridad, orden) y
  `web_ajustes_guardar` (la política). «Quedó habilitada sin el permiso» se sabe releyendo `puede_estar_en_la_rueda(p_usuario)` en la misma escritura,
  después de configurar. Cambiar el `returns void` de `cola_web_configurar` sería `drop`/`create` de un `security definer` para ahorrar un pedido: más riesgo
  que valor. El `terminado` de base (`tablero.sql` T1–T5, el caso de `jobs.sql`) ya lo cumplió la 8.04-1.
- **D23** · **T6 en `supabase/tests/areas/cola/tablero.sql`**: `cola_web_configurar` no tenía prueba SQL. Sin `web.cola.gestionar` da 42501 y la fila no
  cambia; habilitar no toca `disponible` y deja fuera de la rueda a quien su rol no participa; quitar con sus valores y «Deshacer» la dejan igual.
- **D24** · **«Agregar a la rueda» busca con la lista del equipo** (la recomendada de la fila): `src/app` lee `leerEquipo(filtroDelEquipoDesde({ q }))`
  sólo con el panel abierto y si quien mira tiene `equipo.usuarios.ver` o `.gestionar`; `web` no importa `equipo` (recibe `PersonaParaLaRueda`, armada por
  `personasParaLaRueda()` con tipado estructural). Sin esas claves, el botón va apagado con «Tu rol no ve el equipo.». El mínimo de 3 letras es un espejo
  comentado de `MINIMO_DE_BUSQUEDA_DEL_EQUIPO`, que no sale de `equipo`: la base decide.
- **D25** · **Quién se elige:** dada de baja no figura; bloqueada sale apagada («Cuenta bloqueada»); activa e invitación pendiente se eligen (la rueda mira
  sólo `activo` y `bloqueado`). Así, si al guardar no quedó en la rueda, la causa es el rol.
- **D26** · **Quien ya está habilitada** figura con «Ya está en la rueda» y elegirla precarga su cupo, prioridad y orden (el botón dice «Guardar»): nunca se
  pisan con los de fábrica. Si el tablero llegó al tope, el panel avisa que puede haber habilitadas que no se leyeron (O4 de la auditoría).
- **D27** · **Rangos de la interfaz:** cupo vacío (hereda la política) o 1–50 (el `check` de la tabla); prioridad 0–10; orden 0–999. La base acepta todo
  `smallint`: lo angosto es lo conservador y se ensancha sin migrar. Sólo el formulario: quitar y «Deshacer» devuelven lo que la fila ya tenía y aceptan
  todo `smallint` (una fila escrita por fuera de la pantalla se puede quitar igual; auditoría del informe).
- **D28** · **El aviso al habilitar sin el permiso** es un toast neutro con «Abrir Roles» (`sale: true`) sólo si quien mira ve Roles; con el permiso,
  «<nombre> está en la rueda.». Si la relectura falla, el guardado ya ocurrió: sólo se dice que se guardó.
- **D29** · **«Quitar» = hacer + «Deshacer»** (reversible, sin `<Confirmar>`): `cola_web_configurar(…, false, …)` con los valores que tenía; «Deshacer»
  la vuelve a habilitar igual. Sin versión: la última escritura gana (D8).
- **D30** · **La política** va plegada al final de la pantalla, con la versión como `key` y su código diferido. Manda siempre las cinco claves de la cola
  (`cambiosDePolitica`, con test) y nunca `whatsapp_respaldo`, que es del sitio y con sólo `web.cola.gestionar` haría fallar todo con 42501. `PT409` →
  `<AvisoDeConflicto>`. Cinco campos: sin borrador.
- **D31** · **Cada búsqueda del panel vuelve a correr la página** (`shallow: false`, con transición y 300 ms de pausa al tipear): son las tres lecturas del
  tablero y una página de `equipo_lista`, todas acotadas. Reversible: leer el equipo desde el navegador sería otra entrada de `equipo`.

<!-- paso:8.11-3 -->

# 8.11-3 · Compras y margen: escribir (2026-11-12)

- **D1 · Tipo de esta parte.** Datos y dinero (pantalla sobre las RPC de 8.11-1 y la policy de comprobantes de 6.10-2, sin migración): se verificó que la base trae
  guardar, eliminar, restaurar, la lista cerrada, el comprobante en la carpeta del proyecto y `storage_refcount`. El informe se audita: lo de riesgo es qué viaja y
  quién escribe (el esquema estricto y las actions) y que `monto_base` lo pone la base.
- **D2 · La URL del Drawer.** `?panel=compra&compra=<id|nueva>`, el patrón de `?panel=gasto&gasto=<id|nuevo>`, con `nueva` en femenino. Convive con `?pestana=compras`.
- **D3 · Refrescar tras escribir.** La action hace `revalidatePath` de `/repuestos/<id>` (`.claude/rules/datos.md`), no `router.refresh()` como decía el plan de
  8.11-2. La ruta se arma con `RUTAS.repuestos` porque `rutaDelProyecto` es del área `proyectos` y un área no importa otra. `router.refresh()` queda sólo para
  «Recargar» tras un conflicto.
- **D4 · Las opciones de «Ítem».** Los ítems vivos de la hoja que ya leyó la página (≤ 200, sin otra lectura) más «Sin ítem». Si la compra que se edita tiene un ítem
  fuera de esa lista, se suma con su descripción para no perderlo; si se elige otro, la base mira que sea del proyecto.
- **D5 · Las opciones de «Moneda».** Las activas y, al editar, también la de la compra aunque se haya desactivado: si no se cambia, no viaja y la base conserva la
  tasa. Sin selector de tipo de cambio: lo pone la base con el por defecto vigente (D1 de 8.11-1), y el Drawer lo dice en su descripción.
- **D6 · Un solo «Registrar compra».** Arriba de la lista, también cuando está vacía; el estado vacío no lleva botón. Sin `repuestos.costos.editar` o con el
  proyecto cerrado, se ve apagado con su motivo escrito al lado, y la fila no ofrece «⋯». El pie del Drawer repite «Registrar compra» a propósito (está dentro del
  diálogo).
- **D7 · Eliminar no pregunta.** Se hace y deja un toast con «Deshacer» (`ui.md`: lo reversible se hace y ofrece «Deshacer»). Gastos usa `<Confirmar>`, pero allí
  no hay restaurar. Si el ítem se eliminó entretanto, «Deshacer» dice el texto de la base.
- **D8 · El e2e no sube un comprobante.** Subir es la copia del flujo de logística (su storage se probó en 6.11) y la ruta la valida la base. El caso clave es el
  dinero: registrar suma al margen y `monto_base` lo pone la base.

<!-- paso:7.14-2 -->

# Paso 7.14-2 — El cierre de la Fase 7 (parte 2 de 2): el Nivel 3 y los docs de cierre

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/7.14-2.md`.

- **D1** El Nivel 3 corre sobre la rama unida a `main` al empezar (`941663d6`, con el 8.04 del carril b), antes de los docs: los docs no cambian lo que
  prueba el e2e y así el completo no espera a que se escriban.
- **D2** El 6.14-2 sigue en su PR: no se une `origin/a/6.14` a esta rama (acoplaría los dos PR y el coordinador integra cada uno con su CI). ESTADO sólo
  cambia lo de la Fase 7 y dice que la 6 cierra con el 6.14-2; PLAN sólo la sección de la Fase 7, para que la unión posterior choque lo menos posible.
- **D3** GLOSARIO suma «Campana» y «Widget del chat». El widget es el nombre del código (`<WidgetChat>`); «la burbuja», como le dicen los docs y las
  pruebas, queda dicha en su entrada y separada de la burbuja de un mensaje del hilo (que ya usa «Cita»), en vez de abrir un término aparte.
- **D4** 7-3, 7-4 y 7-5 quedan para la persona: tocan un dato de catálogo (una migración), una función `security definer` y otra pantalla, fuera de un
  paso de docs y de lo que pide la fila.
- **D5** Lo que no corre en el completo (`push-de-verdad.sh`, la unidad) va en la tabla con el resultado de su última corrida y dónde se corrió, no como
  verde del Nivel 3.
- **D6** UX tenía duplicadas las filas de Chat, Notificaciones y Perfil (una corta y otra al día): quedan las completas.

<!-- paso:9.09 -->

# 9.09 · higiene del e2e, del CI y de los entornos (partes 1 y 3)

- **Partición.** El paso entero no cabe en un PR: 9.09 lleva la parte 1 (9-8) y la 3 (9-11, 9-4, 9-5, 9-6); 9.09-2 lleva 9-9 y 9-10 (sólo
  specs de e2e, Nivel 1); 9.09-3 lleva 4-41 (`env:check produccion`, toca `src/shared/config/esquemas.ts`, Nivel 2). Para `docs/PLAN.md`:
  la fila 9.09 queda «hecha la parte 1 (9-8) y la 3 (9-11; 9-4 y 9-5 cerrados como decididos; 9-6 abierto)»; 9-9, 9-10 y 4-41 se cierran
  en su paso. 9.09-3 no puede correr a la vez que la Fase 7 (7-1 también edita `esquemas.ts`) ni que el 9.13.
- **9-8: no se renombra la clave real.** El plan la apartaba renombrándola; medido en la base local, `postgres` sólo tiene `select`,
  `delete`, `truncate` y `references` sobre `vault.secrets` (no `update`), y `vault.update_secret()` mueve `updated_at`, de modo que la
  huella `id|updated_at|md5` no volvería. Una clave borrada tampoco vuelve con su id. Se aplica la salida prevista (D1b): con una clave
  real, la prueba que escribe la clave se salta (`test.skip`) y la huella se afirma igual; sin ella, el spec quita lo que dejó. Sigue la
  regla de `asegurarClaveDeRelleno()`: nunca pisa una clave que exista.
- **9-11: el rojo provocado en un dispatch es de la persona.** Una sesión no puede disparar un workflow a mano (el hook lo rechaza): se
  demostró con el guion en local (cinco archivos con contenido) y con la guarda y sus mutaciones. `volcar-base.sh` nunca sale con error y
  cada volcado es independiente. El artefacto vive 14 días y el repo es público: el log de la base y `pg_stat_statements` (consultas
  normalizadas, sin literales) no llevan claves; los datos del e2e son de prueba, como los del `funciones.log` que ya se sube.
- **9-4 y 9-5: cerrados como decididos.** Quedan fuera de CI (`FUERA_DE_CI` en `scripts/guardas/workflows.ts` ya lo vigila): sin runner
  dedicado ni cuenta de cinco corridas. **9-6 sigue abierto con la persona** (cuenta 3 de 5; faltan dos corridas manuales).
- **La guarda nueva va aparte** (`workflows-fallo.ts`): `workflows.ts` (298 líneas) y su test (338) no crecen.
- Sin dependencias nuevas en ninguna parte.

## 9.09-2 · esperas del e2e (9-9 y 9-10)

- **El ayudante envuelve la acción.** `conRespuesta(page, coincide, accion, espera)` recibe la acción y no una promesa ya armada: así la espera
  queda siempre armada antes del clic. `espera` es la etiqueta (tope de 30 s) o `{ etiqueta, tope }`: el lint limita a 4 los parámetros.
- **9-9: 5 de 5, no 15 de 15** (decidido el 2026-11-08: no se gasta en estabilizar). Sin variable permanente `E2E_CPU` en el fixture: el parche
  fue temporal. Con la CPU a 20× una prueba entera supera los 30 s del tiempo de la prueba: se corrió con `--timeout` alto y sólo los casos
  tocados. `esperarHidratado(page, tope = 5_000)` gana un tope opcional; el resumen del lead lo pide de 30 s.
- **9-10: un caso por archivo** con el pedido demorado 6 s. El de `leads-escala` va a `leads-escala-demorado.spec.ts` (el archivo pasaba del tope
  de líneas) y no lleva `@sin-celular` porque la guarda no lo deja: sus ayudantes tienen rama de celular; sale del celular con `test.skip`.
- **`escala-recorrido` sin correr.** No hay volumen sembrado en la base del carril y sembrarlo es un paso largo fuera del alcance: queda escrito,
  tipado por el build del e2e, y el informe lo dice.
- **Las líneas de PLAN de 9-9 y 9-10 eran de antes del 7.x**: la lista de sitios del plan (`.piloto/planes/9.09-2.md`) las reubicó. 9-9 y 9-10
  se cierran con este paso; la fila 9.09 queda «hechas las partes 1, 2 y 3; falta la 4 (4-41) = 9.09-3».
- **Pedido al integrador** (`.claude/rules/e2e.md` está fuera de los módulos del paso): sumar una línea en «Escribir specs»: «un pedido se espera
  con `conRespuesta()` y tope propio: `soporte/esperas.ts`».
- **Trampa del build:** si `next build` cae con «Type '/tablero' is not assignable to RouteImpl», `pnpm typecheck` (que corre `next typegen`)
  lo arregla; no era del código.
- **4-41 (9.09-3), D1–D6.** Producción pide en Vercel las públicas, la secreta, `PORTAL_COOKIE_SECRETO`, la VAPID pública, el correo (remitente, nombre y un
  juego completo de Resend o de Cloudflare: el valor de `EMAIL_PROVEEDOR` no se lee); un preview sólo las cuatro que arrancan la app; las funciones, las
  tres de push; Auth, SMTP, plantillas, URLs y `mailer_otp_exp` = 86400 (lo único que se compara). Tokens e ids de proyecto sólo de `process.env`; el
  ref de Supabase de `SUPABASE_PROJECT_REF` o de `[remotes.demo]`. Salida 0/1/2 (2 gana sobre 1). `pnpm env:check` sin argumento no usa la red.
  Un fallo de la API dice «HTTP n» o «sin respuesta», nunca el cuerpo ni la URL. El tipo `Lectura` vive en `lectura.ts` (no en `produccion.ts`) para
  que los lectores no importen a quien los usa. Contratos de las dos API sin verificar con la nube: lo confirma el primer corrido real de la persona.
- **Pedido al integrador** (docs de carril): PLAN › fila 9.09 «hechas las partes 1 a 4» y mover el abierto 4-41 al archivo como cerrado por 9.09-3.

<!-- paso:9.10 -->

# 9.10 · PWA: instalar la app (parte 1)

- **Partición.** El logo oscuro cambia la base (redefine `empresa_guardar_ajustes` y `web.ajustes_acceso()`, ambas `security definer`, esta
  legible por `anon`) y suma capas con otra verificación: va en 9.10-2, paso de datos (plan y informe auditados). Su alcance, archivos y trampas
  están en `.piloto/planes/9.10.md` › «Parte 2 servida». Para `docs/PLAN.md`: la fila 9.10 queda «hecha la parte 1 (instalar, manifest,
  `sw.js`)»; «PWA» (PLAN ~2454) y el logo oscuro de «Sin interfaz» (~2433) se cierran con la 9.10-2.
- **D1 · Sin aviso que invite a instalar:** sólo la entrada del menú (un aviso que nadie pidió tapa trabajo).
- **D2 · Los atajos del manifest no se filtran por permiso:** el manifest se pide sin sesión. Son rutas que la app ya protege.
- **D3 · Las instrucciones de iOS van como aviso (toast)**, no como diálogo: es una línea y un `<Modal>` exige su URL.
- **D4 · La app no se instala de verdad en Chromium de pruebas.** El clic de la notificación no depende del modo de visualización, así que se
  prueba con el service worker real y la ventana abierta. `WindowClient.focus()` lo rechaza Chromium para un evento sintético («Not allowed
  to focus a window»: pide el gesto de un clic real): el spec lo sustituye sólo durante el evento y comprueba `matchAll`, la elección de la
  ventana y `navigate()` de `sw.js`. Que `focus()` enfoque la ventana con la app instalada de verdad queda a mano de la persona (9.14).
- **D5 · `id: '/'`**, igual que el `start_url`: cambiarlo después reinstalaría la app a todos.
- **La oferta se decide con el evento guardado al evaluarse el módulo**, no en un efecto del menú (el evento no se repite). En el e2e el aviso
  puede llegar antes de hidratar: el caso lo repite hasta que la entrada aparece.

# 9.10 · el logo oscuro (parte 2)

- **D1 · La base no valida la forma de `logo_oscuro_ruta`**, igual que `logo_ruta`: la valida Zod en la action (`RUTA_DE_LOGO`) y el permiso
  `empresa.ajustes.gestionar` es el filtro. Ninguna regla nueva que el logo normal no tenga.
- **D2 · Un solo «Guardar», una sola versión:** los dos logos viajan en la misma llamada de `empresa_guardar_ajustes()`; dos llamadas darían
  `PT409` a la segunda.
- **D3 · Con logo oscuro y sin normal**, el tema claro dibuja el glifo neutro. Sin logo oscuro, `<Marca>` queda como antes.
- **D4 · Los íconos de la app, la tarjeta y el PDF de una cotización salen del logo normal:** la pantalla de instalación y el papel son claros.
- **D5 · Dos imágenes y el tema elige por CSS**, no por JS: `next-themes` pone `.dark` antes de pintar, así el servidor y el cliente dibujan lo
  mismo y no hay parpadeo. La vista previa del oscuro en el formulario lleva `dark` para verse sobre el fondo de ese tema.

<!-- paso:8.05-1 -->

## 2026-11-12 · Decisiones del paso 8.05-1 (la tarjeta de turno y el bloque de Inicio)

- **D1** · La tarjeta vive en el bloque de Inicio y sale por `client.ts` (no por `pantallas/`: el bloque es código de `tablero`, y `pantallas/` sólo lo importa `src/app`)
  y la action por `index.ts` para la campana de la Fase 7 (recomendada de la fila).
- **D2** · «Aparecer en la web» lo decide la persona (8.05-2; recomendada de la fila).
- **D3** · «Contacté» sin «Deshacer» ni confirmación (recomendada de la fila): un toque.
- **D4** · **No se puede vincular una solicitud ya contactada**: `web_confirmar_contacto` sólo escribe `lead_id` en `asignada` o `vencida`. Vincular y confirmar son un
  solo acto desde la tarjeta. **Abierto nuevo (8-NN, lo decide la persona):** una RPC `web_vincular_contactada(p_solicitud, p_lead)` si se quiere vincular después.
- **D5** · Un turno de un vehículo que dejó de ser público (no sale en `web.vehiculos`) se dibuja sin título; no se lee `vehiculos`.
- **D6** · `pantallas/turnos.ts` queda como estaba; la tarjeta no pasa por ahí (ver D1).
- **D7** · El panel de vincular es propio y compone las piezas de `panel-para-cotizar` en lugar de exportar el interior de `PanelDelCliente`: mínima superficie de
  cambio en un módulo que otros pasos tocan.
- **D8** · Orden: vigentes por `vence_en` (las directas, sin reloj, al final de las vigentes) y luego las vencidas de la más reciente a la más antigua.
- **D9** · La fuente se muestra tal cual (`fuente` es texto libre del sitio); sin catálogo.
- **D10** · **El filtro por `usuario_id` va a mano en `leerMisTurnos`**: la RLS de `solicitudes_contacto_web` deja ver todas las filas a quien tiene `web.cola.gestionar`;
  sin el filtro, la dueña vería (y podría «confirmar») los turnos de otra persona. Lo cubre `e2e/web-turno.spec.ts`.
- **D11** · «Crear lead» cruzó sin tocar `leads/features/alta`: el «+» abre el alta con `?elegir=vincular`, que ya devuelve `?vincular=<id>`; Inicio lo ve junto al `turno`.
- **Pendiente anotado:** `PANEL_VINCULAR_TURNO` limpia con la tarjeta sólo `panel` y `turno`; la búsqueda del panel (`clase`, `buscar`, `cursor`) se limpia al cerrar.

<!-- paso:8.05-2 -->

## 2026-11-12 · Decisiones del paso 8.05-2 (la disponibilidad y la ficha en `/perfil`)

- **D11** · El identificador (`handle`) se pasa a minúsculas y pide 3 a 30 caracteres de `a-z0-9._-`, sin signo en los bordes; la base sólo pide unicidad. Lo más
  conservador y reversible: aflojarlo no pide migración.
- **D12** · Con «Ver como» el interruptor y la ficha quedan de sólo lectura con «Estás mirando como otro rol…»: escribirían en la cuenta real de la dueña.
- **D13** · «Aparecer en la web» sin WhatsApp lo rechaza el formulario («Para aparecer en la web necesitas tu WhatsApp.»); la base no lo exige.
- **D14** · Si el motivo del interruptor es «Tu rol no recibe turnos de la web.», el texto de «Turnos de la web» no lo repite (los e2e de `rueda-por-rol` buscan esa frase una vez).
- **D15** · El formulario de la ficha se pide con `diferido()` al abrir su bloque: montado de entrada, el documento de `/perfil` pasaba de 103 a 115,9 KB (12 % sobre el
  tope); diferido, 107,0 KB. El tope sube a 113 KB (lo medido más un 5 %).
- **D16** · La versión de la ficha es `perfiles.actualizado_en`, la misma de «Tus datos»: `/perfil` le pone esa `key` a los dos formularios para que guardar uno vuelva a
  montar el otro (el bloque de la ficha, que no lleva la `key`, no se cierra al guardar).

<!-- paso:8.12-1 -->

## 2026-11-12 · Decisiones del paso 8.12-1 (la fórmula y la base del cotizador de repuestos)

- **D1 · No hay caja sugerida automática:** la línea elige una caja activa del snapshot o «Sin caja» (0); `caja_sugerida` guarda la elegida. La recomendada de la fila.
- **D2 · Aceptar copia el unitario de cada línea con ítem a `repuestos_items.precio_cliente`** (y su `moneda`); una sola aceptada por proyecto (índice parcial;
  aceptar otra anula la anterior). La recomendada de la fila.
- **D3 · La cotización de repuestos se numera con `identity`, con huecos:** no es un comprobante.
- **D4 · Un total que no cabe en numeric(18,2) es un error de la línea** (`no_cabe` en la fórmula, 22023 hint `cantidad` al guardar), no un recorte.
- **D5 · El snapshot guarda los números como texto y sólo lo activo de la moneda** (la configuración de id más alto, tramos por `costo_min`, cajas por `monto`):
  un `float` de JSON perdería cifras, y es lo que se usó, no la tabla entera. Versión 1.
- **D6 · El total de la cotización es nulo si falta el de alguna línea o no hay líneas** (nulo no es 0, como el margen del 8.11).
- **D7 · `redondeo > 0` como `check … not valid`:** no valida filas viejas, que la fórmula toma como 0,01; se valida del todo cuando 8.12-2 escriba la configuración.
- **D8 · Crear, guardar, aceptar y anular exigen el proyecto vivo y abierto** (como compras): para tocar una cotización de un proyecto cerrado, se reabre.
- **D9 · Las RPC responden los montos como texto,** para que la hoja no pase por `float`.
- **D10 · Mandar `total`, `logistica_sugerida`, `caja_sugerida`, `orden` o `cotizacion_id` en una línea es un error (22023 con esa clave),** no se ignora.
- **D11 · Aceptar no copia a ítems eliminados ni a líneas libres,** y no falla por ellos.
- **D12 · Anular una aceptada no revierte el precio del ítem:** el precio queda como dato del ítem; se cambia en la hoja de ítems o aceptando otra.
- **D13 · Aceptar pide `repuestos.cotizar`, `repuestos.ver` y `repuestos.editar`:** fija `precio_cliente`, que hoy escribe quien edita ítems (auditoría del plan, 2;
  la opción conservadora). Crear, guardar y anular piden `repuestos.cotizar` y `repuestos.ver`.
- **D14 · La logística y la caja son por unidad y el redondeo va al unitario:** así el precio que se copia al ítem es exacto (`total / cantidad`).
- **D15 · `guardar` y `aceptar` exigen `config_snapshot ->> 'version' = '1'`** (23514 hint `config_snapshot`); la migración anula las cotizaciones no anuladas sin
  esa versión antes del índice: las escribió el cliente cuando la policy lo dejaba, y el área nunca tuvo pantalla (auditoría del plan, 3).
- **D16 · `repuestos_cotizacion_guardar` tiene 86 líneas y su migración 320:** pasa los topes de 80 y 300 por poco; la validación de cada línea ya vive en
  `_repuesto_cotizacion_linea_de` y `_repuesto_cotizacion_monto`, y partir más el armado de la respuesta no ayuda a leerla (auditoría del informe, 1).
- **D17 · El permiso va con `assert_permiso`** (como compras): el 42501 dice «No tienes el permiso «repuestos.cotizar».».

<!-- paso:8.12-2 -->

## 2026-11-12 · Decisiones del paso 8.12-2 (Configuración › Repuestos › «Cotizador»)

- **D18 · Los dos `check` se validan sólo si ninguna fila los rompe** (`repuestos_tramos_logistica_signo_check` y `repuestos_cotizador_config_redondeo_check`):
  si las hay, quedan `not valid` (igual protegen lo nuevo), la migración avisa con `raise notice` y no falla en un despliegue con datos viejos.
- **D19 · El recargo local se tipea en % con dos decimales y se guarda como fracción con cuatro:** es el mismo entero (`'10'` → `'0.1000'`), sin redondeo ni `float`.
- **D20 · Los decimales de la configuración viajan como texto canónico** (`'1.3500'`): se leen con `::text`, el formulario los lee con el lector único de
  números tipeados (`leerNumeroTipeado`: el decimal es el del locale y el otro separador sólo agrupa de a 3) y arma el texto exacto con enteros a escala fija; la
  action lo vuelve a validar con `decimalCanonico`. `Number` sólo para dibujar con `<Monto>` y para el JSON del `insert`/`update`: los topes de pantalla dejan a
  lo sumo 15 cifras (montos ≤ 999 999 999 999,99), que la forma más corta del JSON escribe igual y la base lee exacta. Auditoría del plan, objeción 1: aceptar
  `,` o `.` como decimal sin mirar el locale guardaba «2.000» como 2,00 en es-BO.
- **D21 · Tramos y cajas no se borran desde la pantalla: se desactivan.** El snapshot de una cotización guarda lo que se usó; borrar no da nada y no se deshace.
- **D22 · El historial no dice quién publicó** (se puede sumar leyendo `creado_por`); dice cuándo y con qué valores.
- **D23 · Publicar compara la vigente que se vio con la última antes de insertar** (chequeo de buena fe, no atómico): la tabla es append-only y una carrera deja
  dos filas visibles en el historial; no se pierde nada.
- **D24 · La moneda de un tramo o de una caja no cambia al editar:** se desactiva y se agrega en la otra.
- **D25 · Tramos y cajas no tienen versión: gana la última escritura** (configuración de decenas de filas, una persona a la vez).
- **D26 · El redondeo se dibuja como monto sólo si hay una sola moneda activa;** con varias, como número (vale para todas las monedas del cotizador).
- **D27 · El e2e usa tramos de 900 000 en adelante** y los limpia por rango; la configuración que publica una cuenta de prueba la borra `borrarPersonasDePrueba()`
  (la FK de `creado_por` no tiene `on delete` y la tabla es append-only para la app; ninguna cotización la referencia).
- **D28 · Configuración, tramos y cajas siguen bajo RLS, sin RPC:** no otorgan permisos, la configuración es append-only con `creado_por` verificado por la
  policy y el solape lo cuida el trigger de 8.12-1. «Quitar escrituras directas» (Riesgos de la Fase 8) queda cerrado para el cotizador.
- **D29 · Los modales de tramo y caja viven en la URL** (`?panel=tramo&tramo=<id|nuevo>&moneda=` y lo mismo con `caja`), como todo modal (`ui.md`): uno nuevo
  pide una moneda activa y uno que se edita, estar en lo leído; si no, no abre.

<!-- paso:8.12-3 -->

## 2026-11-12 · Decisiones del paso 8.12-3 (la pestaña «Cotizaciones» y la hoja en sólo lectura)

- **D30 · La pestaña, la hoja y crear piden `repuestos.cotizar`** (además de `repuestos.ver`): quien sólo tiene `repuestos.costos.ver`, que la RLS deja leer,
  no las ve. Es lo que dice la fila; abrirlas después es sumar una clave.
- **D31 · La moneda se elige en la misma barra que «Nueva cotización»**, sin modal: crear no destruye nada y pide un solo dato; con una moneda activa no hay elección.
- **D32 · Crear lleva directo a la cotización nueva.** El id lo genera el cliente una vez por intento y se reusa al reintentar (la RPC es idempotente por id);
  se renueva al salir bien y al cambiar la moneda: la pantalla conserva su estado al volver y el mismo id devolvería la ya creada (auditoría del plan, obs. 1).
- **D33 · Con el proyecto cerrado, «Nueva cotización» se ve apagado con el texto de la base**; la base vuelve a decidir.
- **D34 · No se lee la configuración antes de crear:** sin configuración, el 23514 `config` dice el mensaje de la base y, sólo con `repuestos.configurar`, el
  enlace a `?seccion=cotizador`.
- **D35 · La lista de un proyecto va con tope 50 y `<AvisoDeTope>`**, de la más nueva, sin cursor: son decenas por proyecto.
- **D36 · La hoja muestra los montos que guardó la base y su total;** no los recalcula, no suma subtotales por bloque ni muestra el unitario. `calcularLinea`
  sólo dice qué le falta a una línea sin total; si la fórmula daría total y la base no lo guardó, el motivo queda sin decir (auditoría del plan, obs. 2).
- **D37 · La hoja dice con qué configuración se calculó** (factor, recargo, redondeo y desde cuándo); los tramos y cajas del snapshot no se listan. Sin snapshot
  válido sólo pide «anúlala y crea otra» en borrador (obs. 3).
- **D38 · Los montos llegan como texto y pasan a `Number` sólo al entrar a `<Monto>`** (como D20): arriba de ~9·10¹³ el último centavo podría redondearse al
  dibujarse; nada se calcula ni se escribe con ese número.
- **D39 · El e2e siembra configuración y líneas por SQL** como `postgres` (escribir líneas es de 8.12-4) y `borrarPersonasDePrueba()` borra antes las
  cotizaciones de repuestos de las cuentas de prueba (la FK de `creado_por` no tiene `on delete`).
- **D40 · La ruta de la hoja no lleva `loading.tsx` propio:** la cubre el `<Suspense>` de la página (un `loading.tsx` más con el barril de pantallas duplica el
  chunk en frío).

<!-- paso:8.12-4 -->

## 2026-11-12 · Decisiones del paso 8.12-4 (la hoja editable, aceptar y anular)

- **D41 · La hoja es editable sólo en borrador, con el proyecto abierto y el snapshot válido;** si no, la de lectura. La base rechaza lo mismo (V4): mostrar una hoja
  que no se puede guardar sería mentir.
- **D42 · El total de la línea es `<Monto>` (o «Sin total · motivo»), no una `XCell`:** no se edita, y una celda con candado en cada fila es ruido; la caja es un `<select>`
  de las del snapshot (D1).
- **D43 · Sin `emptyLabel`:** `XCell` no lo tiene (V12) y agregarlo toca `src/shared` (Nivel 2). La celda vacía y «Sin total · Falta la logística» dicen lo mismo; la
  ficha se corrige.
- **D44 · Una línea nueva nace sin caja elegida** («Elige una caja»), no con «Sin caja»: olvidarla no cotiza por debajo; la línea queda sin total hasta elegir.
- **D45 · El total en vivo sólo informa;** lo que vale es lo que guarda la base y la hoja nace de nuevo de lo guardado (`key` con la versión).
- **D46 · Guardar manda todas las líneas** (la RPC reemplaza) y ↺ de la logística manda `logistica: null`.
- **D47 · Aceptar sólo con lo guardado:** con cambios sin guardar, con total nulo o sin `repuestos.editar`, apagado con el motivo escrito.
- **D48 · Anular pasa por `<Confirmar>`** (no hay restaurar) y vale en borrador y en aceptada; una anulada no muestra acciones.
- **D49 · Los ítems para «Agregar desde un ítem» los lee la página** con `leerItemsDelProyecto` y los pasa como datos (`{id, descripcion, cantidad}`): el área
  `cotizador` no importa `items`. Se ofrecen sólo los que no están en otra línea.
- **D50 · Una línea no cambia de bloque:** se quita y se agrega en el otro.
- **D51 · Las cajas del `<select>` se llaman «Caja 1», «Caja 2»…** (un `<option>` no admite `<Monto>`) y la elegida se dibuja al lado con `<Monto>`: así ninguna
  cifra se ve antes de hidratar con el Modo Live encendido (auditoría del plan, obs. 2).
- **D52 · Sin tests de `errores.ts` ni de las actions** (como en 8.12-3): sin dinero ni fórmula; la autoridad es la RPC con sus pruebas SQL y el e2e recorre guardar y
  aceptar.
- **D53 · El spec de 8.12-3 siembra su cotización como aceptada** para seguir probando la hoja en sólo lectura (la borrador ahora es editable).
- **D54 · El e2e de cotizar corre sólo en escritorio** («un e2e del camino feliz por pantalla nueva, en escritorio», `e2e.md`); el celular sigue recorriendo la hoja de
  lectura en `repuestos-cotizaciones.spec.ts`.
- **D55 · Las notas se editan en la hoja** (la RPC las guarda con las líneas; ≤ 2000).
- **D56 · Quitar una línea no se confirma:** es local hasta «Guardar» y «Recargar» la trae de vuelta.

<!-- paso:8.12-ci -->

## 2026-11-12 · Decisiones del arreglo del CI del 8.12

- **D57 · El rojo se arregla en la app, no en la prueba:** una barra fija «Sin conexión» que no se va al volver la red tapa la pantalla a cualquiera que pierda la
  red un momento; esperar en el spec a que llegue el código del chat escondería eso. Es la primera mitad de 7-5, tal como la anotó el 7.14-1.
- **D58 · `useVueltaDeLaRed` a `src/shared/ui`:** lo usan dos módulos (campana y chat) y uno no importa adentro del otro. El archivo de `notificaciones` queda
  como reexportación porque un carril no borra lo del núcleo; el carril A puede borrarlo y apuntar la campana a `shared`.

<!-- paso:8.13-1 -->

## 2026-11-12 · Decisiones del paso 8.13-1 (el motor de mover y las esperas)

- **D1 · Generalizar en este PR, no pedir al carril ni duplicar:** `flujos` mover y el núcleo de `logistica` son de la base; se agrega la rama de repuesto sin borrar nada del vehículo.
- **D2 · `Unidad.origenId` pasa a `string | null` en la parte 2** (nulo para el ítem); en la parte 1 `origenId` sólo se exige al vehículo.
- **D3 · Sin «fuera de regla» ni «quién la movió» para un ítem:** `logistica_unidad` es sólo de vehículo y leerlo exigiría una RPC `security definer`. Queda el abierto **8-13a**.
- **D4 · La vista «Cadena» y los bloques de Inicio leerán `repuestos_items` por PostgREST bajo la RLS**, con cursor `(fase_desde, id)` y tope + 1 (partes 3 y 4).
- **D5 · «Esperas que destraban vehículos» lista ítems pendientes de proyectos con vehículo**, sin el cruce exacto con la fase del vehículo (abierto 8-13a).
- **D6 · Los pagos del proyecto van como parte 5:** `pago_registrar` es sólo de vehículo; hace falta una RPC nueva `security definer` de dinero.
- **D7 · El carril `c` escribe sus docs en `docs/pasos/8.13-N/`.**
- **D8 · `unidadParaMover` cambia `vehiculoId` por `unidadId` y `tipo`:** nadie fuera de `flujos` lo usaba.
- **D9 · `esperasQueDestraban` va sin interfaz de repositorio ni composición:** es una lectura (como `leerMargenDelProyecto`); el `index.ts` del área la exporta desde `infra/`.
- **D10 · `p_tope` = 50 y no 51:** la RPC suma una fila de más por sí misma (`_acotar_pagina(p_tope, 50, 200) + 1`); el plan decía 51 y habría pedido 52.

<!-- paso:8.13-2 -->

## 2026-11-12 · Decisiones del paso 8.13-2 (el panel del ítem)

- **D1 · Generalizar en `logistica` y `flujos` dentro de este PR**, de forma aditiva: nada del camino del vehículo cambia de texto ni de conducta.
- **D2 · `?item=<id>` sólo se abre sin `?panel=`:** el stock y las imágenes usan `?panel=…&item=<id>` y no se pisan. `<ItemAbierto>` no se ata a la página: la «Cadena» (parte 3) lo monta igual.
- **D3 · Variante de repuesto en el hueco** (`repuesto?: { permisos, regla }`): sin ella el hueco no se dibuja para un ítem (Aduana, Gastos, Pagos, Margen). El filtro de tipo va antes de descartar repetidos.
- **D4 · Un solo botón en la fila:** «Abrir panel» (Qué falta ya nace abierto: «Mover» sería el mismo panel).
- **D5 · Transporte del ítem: sólo texto.** El formulario propio queda como abierto **8-13b** (la tabla `transportes` ya tiene `repuesto_id` y `transporte_guardar` acepta `p_repuesto`).
- **D6 · `Unidad.proyecto?`** opcional, sólo en un ítem, para «Abrir proyecto» y el texto del transporte; `esUnidadDeVehiculo` estrecha `origenId`.
- **D7 · El ítem se lee en `repuestos`** (`leerItemDelPanel`, con `fase_desde` y el proyecto) y `src/app` arma la `Unidad`: `logistica` no importa `repuestos`. Un proyecto que la RLS no deja ver deja el ítem en nulo.
- **D8 · Notas de un ítem:** `crearNota` y `editarNota` piden `repuestos.ver` (global) y no `logistica.ver` del origen; la policy de `notas` ya acepta ambas.
- **D9 · Documentos de un ítem:** los tipos del flujo de repuestos se buscan con `origen_id is null` (hoy `.eq('origen_id', …)` con nulo no encuentra nada).
- **D10 · Sin volumen:** notas e historial de un ítem son pocos por ítem y cada lectura lleva `limit 21`.
- **D11 · «Elegir» apagado con su motivo sólo para un ítem:** para un vehículo sin permiso el botón no se dibuja (así ya era); para el ítem se dibuja apagado con «No tienes permiso para mover repuestos.» debajo, como pide la fila 8.13.
- **D12 · Un hook con `history: 'push'` marca la vuelta del foco** (`abrirConVuelta` y `useVueltaDelFoco`, que `scripts/guardas/paneles-con-vuelta.test.ts` exige): `useItemPorUrl` lo hace con la clave `item`.

<!-- paso:8.13-3 -->

## 2026-11-12 · Decisiones del paso 8.13-3 (la Cadena y el hueco del vehículo)

- **D1 · El filtro `proyecto` sólo va por URL**, sin selector: lo usarán los «Ver todas» de Inicio (parte 4); con él puesto, aviso «Mostrando un solo proyecto» con «Ver todos». Un selector se agrega después sin cambiar la URL.
- **D2 · Lectura sin migración:** una consulta por fase (≤ 30) en paralelo, `limit 51`, por `repuestos_items_fase_id_idx`; el proyecto va embebido (`!inner`: un ítem de un proyecto que la RLS no deja ver ni de la papelera no sale). Abierto 8-13c.
- **D3 · Orden:** fases no finales, las que llevan más tiempo primero; fases finales (Recibido, Perdido), las más recientes primero; «Sin fase» por `id`.
- **D4 · La tarjeta** no lleva el vehículo ni foto (leerlos pagaría otra pasada de la RLS por tarjeta); el proyecto lleva a su hoja.
- **D5 · `entities/flujo/cadena.ts` y `cadena-filas.ts`** copian lo mínimo de la cadena de `logistica` (un módulo no importa a otro), con su prueba; los días en la fase usan `diaEnZona` de `shared`.
- **D6 · El panel del ítem es el de la parte 2:** `PanelDelItem` pasa a un archivo propio de `src/app/(app)/repuestos/`, que importan la hoja y la Cadena.
- **D7 · El hueco lee con una Server Action** (`leerEsperasDelVehiculo`): `esperasQueDestraban` es de servidor y el hueco, de cliente.
- **D8 · El hueco** pide `repuestos.ver` y la regla `esperas`, sin variante de repuesto. No escucha `logistica:unidad-cambio` (es de `logistica`): se relee al cambiar la fase del vehículo y al volver a abrir el bloque.
- **D9 · Tipo estructural del hueco:** `repuestos` declara el suyo; `ComponentType` no es asignable por `defaultProps`, así que el cast va en `src/app/(app)/logistica/huecos-de-la-unidad.tsx`, no en el módulo.
- **D10 · El e2e** usa las fases «En tránsito» y «Recibido» de la semilla y un origen propio con la espera; «Recibido» no pide nada, así que «Qué falta» del ítem no marca «Cumplido» (sólo lo hace el vehículo, que tiene un requisito).

<!-- paso:8.13-4 -->

## 2026-11-12 · Decisiones del paso 8.13-4 (bloques de repuestos de Inicio y enlace en Configuración)

- **D1 · «Repuestos por mover» = ítems en vuelo**, no «listos»: en una fase no final, sin stock, de un proyecto vivo; el que más lleva en su fase, primero. «Listo» exigiría evaluar los roles por transición ítem por ítem (N+1); la fila abre el
  panel del ítem, donde «Qué falta» y los botones lo dicen. Los ítems «sin fase» no entran (los muestra la Cadena).
- **D2 · «Esperas que destraban vehículos»** = lo mismo, sólo de proyectos con vehículo y nombrado por el vehículo. Sin el cruce con la fase del vehículo (`repuestos_pendientes_de_vehiculo` es por vehículo: N+1): abierto 8-13a.
- **D3 · «Ver todas»** de los dos va a `rutaDeLaCadena()` sin filtros; no se inventa un filtro «con vehículo» en la Cadena.
- **D4 · Lectura por PostgREST, sin RPC ni migración**, bajo la RLS de `repuestos.ver` (quien tiene `repuestos.mover` sin `repuestos.ver` ve el vacío). El orden `fase_desde` no tiene índice propio: se suma al abierto 8-13c.
- **D5 · El título del vehículo se lee embebido** (`vehiculo:vehiculos(titulo)`), no de `vehiculo_etiqueta`: un proyecto de un vehículo no copia el título (la RPC deja la etiqueta nula) y la e2e lo mostró. Si quien mira no ve el vehículo, la fila
  dice sólo el repuesto.
- **D6 · Las lecturas y los textos viven en `repuestos`** (un módulo no consulta tablas ajenas); los bloques de `tablero` sólo componen `ListaDeBloque`.
- **D7 · `inicio-bandeja.spec.ts`** deja de afirmar el vacío de «Esperas…» (la base compartida puede traer ítems de otro spec): comprueba que el bloque se dibuja y no cae a su error.

<!-- paso:8.13-5 -->

## 2026-11-12 · Decisiones del paso 8.13-5 (los pagos del cliente del proyecto de repuestos)

- **D1 · Una RPC gemela, `pago_registrar_proyecto`**, no un `p_proyecto` en `pago_registrar`: no cambia la firma ni el tipo de la RPC que usa Logística. Pide
  `repuestos.costos.editar` y `repuestos.ver` (como las compras), `security definer`, `set search_path = ''`, idempotente por id (`on conflict do nothing` y relectura).
- **D2 · Sin lead:** el pago de proyecto lo deja nulo; no se amplía la superficie de `leads` (`auditoria-leads.sql` la registra como `X`).
- **D3 · Sin la regla de flujo `pagos`:** el proyecto no tiene fase propia y la fila de la regla del flujo `repuestos` sólo la garantiza el seed. Lo que bloquea es el proyecto cerrado.
- **D4 · Un pago de proyecto confirmado no se anula todavía** (`pago_anular` es de vehículo): queda sellado. La UI no ofrece «Anular» ni por la lista ni por `?panel=anular-pago`, y
  el texto de confirmar lo dice («no se podrá editar, eliminar ni anular por ahora»). **Abierto nuevo 8-13d.**
- **D5 · Proyecto cerrado:** no admite pagos nuevos (23514 «El proyecto está cerrado: reábrelo para registrar pagos.»); los sin confirmar se corrigen y eliminan como hoy. El
  reintento de un id ya guardado devuelve lo guardado aunque el proyecto se haya cerrado después. El proyecto se toma `for share` antes de mirar el pago: eliminarlo o cerrarlo espera.
- **D6 · La UI generaliza con un contexto** (`AmbitoDePagoContext`, por defecto `vehiculo`) y un `CuerpoDePagos` compartido: el hueco del vehículo no cambia de conducta.
- **D7 · Los permisos de los botones del proyecto llegan por props** desde la página (`puede()`), sin leer `mis_permisos` otra vez; la base vuelve a exigirlos.
- **D8 · «Pagos» sólo con `repuestos.costos.ver`** (la policy de lectura); «Registrar», «Editar» y «Eliminar» con `repuestos.costos.editar`; «Confirmar» con `logistica.pagos.confirmar`.
  «Registrar pago» siempre a la vista, apagado con su motivo (como «Registrar compra»).
- **D9 · Nivel 1**, no Nivel 2 como decía la partición del 8.13: `scripts/piloto/nivel.mjs` no ve disparadores (una RPC sin tabla, índice ni policy). Lo que manda el dinero es la
  auditoría (plan e informe), `db:probar` y `db:carreras`.
- **D10 · La gemela rechaza `NaN`** (`'NaN' > 0` es verdadero en PG y `numeric(18,2)` lo guarda). El mismo hueco en `pago_registrar` (vehículo) queda como **abierto 8-13f**.
- **Abierto nuevo 8-13e:** eliminar el último pago vivo sin confirmar de un proyecto puede dejar sin cumplir `proyecto.pago_cliente` de la fase actual de un ítem (el vehículo tiene esa
  guarda para los requisitos de pagos; el proyecto no). Se deja hasta que la persona lo pida.
- `accionesDelPago` y `validarMotivoDeAnulacion` salen de `entities/dinero/pago.ts` (pasaba de 300 líneas) a `acciones-del-pago.ts` y `anulacion-de-pago.ts`.

<!-- paso:8.13-6 -->

## 2026-11-12 · 8.13-6

- **`UnidadAbierta` en vez de volver nulo `Unidad.origenId`.** El 8.13 pedía a las áreas `transporte` y `documentos` (del carril b) leer un ítem sin origen; la guarda de carriles no lo
  deja y un pedido a b era circular (sus cambios no compilan sin el tipo nuevo). Con dos tipos, b no cambia y el núcleo (que el c sí puede editar) lleva al ítem.
- **Sólo `tipos.client.ts` se le pide a b** (compuerta `espera`): es el único lugar donde un área de b decide con `origenId`, y ensanchar su parámetro compila y pasa lint sobre `main`.

<!-- paso:9.01-1 -->

## 2026-11-12 · Decisiones del paso 9.01-1 (la base de lectura de la actividad)

- **D1 · Sin línea de tiempo en la ficha** (duda 1, la recomendada): un «Ver actividad» en el «⋯» de la ficha de lead y de vehículo a
  `/actividad?entidad=<tabla>&registro=<id>`, sólo con `actividad.ver` (parte 4).
- **D2 · Del diff de un lead ajeno, sólo lo público** (duda 2, la recomendada): lo que da `leads_vista` fuera de la cartera; y nada si quien mira
  no ve el lead (`puede_lead` con `leads.ver`). Nadie ve teléfonos ni números.
- **D3 · Se parte en base (partes 1 y 2) y pantalla (3 y 4)** (duda 3, la recomendada).
- **D4 · La lista cerrada vive en `_actividad_recorte(tabla)`** (`lead`, `entidad`, `configuracion` o null). `tipos_lead` y `tipos_seguimiento`, que la
  fila no nombraba, van a configuración. `formulas` va a entidad, no a configuración: su policy pide `cotizaciones.configurar` del origen (auditoría
  del informe).
- **D5 · «Entera» = las columnas que authenticated puede leer** (`has_column_privilege`): `cotizaciones` nunca da más que su grant por columnas y
  una columna nueva sin grant no sale.
- **D6 · Nunca salen** `actualizado_en` (ruido), `clave_hash`, `apibara_raw`; de un lead, además, `numero`, `numero_propio`, `telefono_principal`,
  `cartera` y `cliente_desde`.
- **D7 · El permiso de una entidad es el espejo de su policy «leer»** sobre la foto del cambio o, sin foto, sobre la fila vigente por su PK; sin la
  condición `eliminado_en` (las `puede_*` exigen el padre vivo: conservador).
- **D8 · `actividad_diff` no distingue «no existe» de «no lo ves»:** los dos dan `{id, visible: false}`.
- **D9 · La página no lleva valores:** cabecera, `visible`, hasta 5 nombres de campos y `mas_campos`, sólo en los `*.update` visibles.
- **D10 · Filtros combinados van por la ruta más selectiva** (registro > persona > acción > tabla) y el resto filtra sobre ella; el descarte lo
  acota la retención.
- **D11 · `?accion=` entra ya en la base** (`p_accion` e índice `(accion, id desc)`; auditoría del plan): la parte 3 no cambia la firma.
- **D12 · Índices sin `concurrently`** (la migración va en transacción): abierto 9-01b para la guía del 9.13.
- **D13 · La purga borra sólo actividad y `eventos_web`,** de a 10.000 y hasta 10 lotes por tabla y corrida; notificaciones y visitados quedan para
  `notificaciones_purgar()`. Job a las 03:25 UTC.
- **D14 · La prueba de la purga va en `areas/actividad/purgar.sql`,** no en `supabase/tests/jobs.sql` (de la lista fija del `a`).
- **D15 · Tablas sin declarar a propósito:** `lotes_papelera`, `cotizaciones_niveles`, `tonos`, `perfiles`, `roles`, `importaciones`,
  `accesos_portal`, `oportunidades`, `tablas_referencia`, `limpieza_corridas`, `comprobantes_ajustes`. Sólo reciben `registrar_actividad()` sin
  fotos, así que no hay diff que mostrar: salen `visible: false` hasta que la 9.01-2, al revisar `detalle`, decida si alguna se declara.
- **D16 · El registro de páginas de `actividad_listar` pasa a la 9.01-3:** la guarda `paginas.test.ts` saca una entrada sin quién la llame.

<!-- paso:9.01-2 -->

## 2026-11-12 · Decisiones del paso 9.01-2 (privilegios de `registrar_actividad()` y de `actividad.detalle`)

- **D17 · `registrar_actividad()` pierde el `execute` de `authenticated`** (y se revoca de `public` y `anon`, que no lo tenían). Nadie que no sea
  definer la llama y nada de la app ni de edge; las definer corren como su dueño. `areas/actividad/registrar.sql` (T2) cae si una función de
  invocador la llama.
- **D18 · `service_role` conserva el `execute`:** quitarlo no protege nada (escribe `actividad` directo) y deja la puerta a un job futuro.
- **D19 · `actividad.detalle` pierde el `select` de `authenticated`:** hay detalle privado (tabla de abajo) y nadie de la app lo lee. Los lectores
  definer (`_lead_crear`, `leads_importaciones_recientes`) siguen igual.
- **D20 · Revoke de columna, nunca de tabla:** el grant de `authenticated` sobre `actividad` es por columna; un revoke de tabla se llevaría la cabecera.
- **D21 · Ninguna tabla que quedó sin declarar en `_actividad_recorte` (D15) se declara:** sin `detalle` para la app no hay nada nuevo que mostrar.
- **D22 · No se cambia lo que guardan las llamadas ni las filas viejas:** quitar la columna a la app basta; enmascarar el código o sacar montos
  rompería pruebas que leen esas claves sin ganancia. Si la app necesita leer `detalle`, será por una función definer que lo recorte.
- **D23 · El detector lee `pg_get_functiondef`, no `prosrc`** (una `language sql` con `begin atomic` deja `prosrc` vacío), mira todos los esquemas
  menos los del sistema y se prueba con dos sondas creadas y descartadas en la misma transacción (T4).

### Revisión de lo que guarda `detalle` (sexto argumento de `registrar_actividad`)

Los `insert into public.actividad` directos de los triggers (`auditar`, `cotizacion_auditar`, `formula_auditar`, `lead_auditar`, los de
`origenes_lead`, `tipos_lead` y `tipos_seguimiento`) no escriben `detalle`.

**Con dato privado:**

| Acción · función                                                                                                | Claves                                                      | Por qué                                                   |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| `lead.telefono_cambiado` · `cambiar_telefono_lead` (`base.sql:8559-8561`)                                       | `anterior`, `nuevo`                                         | trozo del teléfono de un lead que quien mira puede no ver |
| `lead.telefono_extra_*` · `lead_telefono_guardar`, `lead_telefono_quitar` (`base.sql:12676, 12693, 12716`)      | `telefono`                                                  | ídem                                                      |
| `portal.otorgado` / `reotorgado` · `otorgar_portal` (`base.sql:15814-15816`)                                    | `codigo`, `codigo_anterior`                                 | la mitad de la credencial del portal                      |
| `portal.desbloqueado` · `portal_desbloquear` (`base.sql:16106`); `portal.revocado` · `revocar_portal` (`16777`) | `codigo`                                                    | ídem                                                      |
| `pago.confirmado` · `pago_confirmar` (`20261111225327_pagos_confirmar.sql:80-81`)                               | `monto`, `moneda`, `monto_base`                             | dinero de un origen que quien mira puede no ver           |
| `pago.anulado` · `pago_anular` (`20261111225333_pagos_anular.sql:89-91`)                                        | `motivo`, `monto`, `moneda`, `monto_base`, `confirmado_por` | ídem                                                      |

**Dudosas** (texto del filtro): `leads.exportado` · `leads_exportacion_registrar` (`base.sql:13262`); `datos.exportado` ·
`datos_exportacion_registrar` (`20261112194922_datos_exportacion_registrar.sql:53, 92`).

**Sin dato privado** (por familia): bajas (`_baja_terminar`, `equipo_dar_de_baja`: conteos); alta y adopción de lead (`_lead_crear`: `intento`);
oportunidades (ids y `cantidad`); papeleras de leads, vehículos y cotizaciones (`tipo`, `cantidad`, `automatica`, `desde`); importación (conteos y
`por_motivo`); limpieza automática (conteos, `lote`, `parcial`); niveles (`concesiones`); catálogos de leads (`nombre`, `por_defecto`,
`despues_de`); seguimientos (ids, `tipo`, `visibilidad`, nunca el texto); fotos (`foto`, `hash`, `cantidad`); vehículo (`publicado`,
`destacado`); comentarios (ids). Las ≈ 30 llamadas restantes pasan 4 o 5 argumentos: `detalle` queda nulo. El detalle con `archivo:línea` está en
el plan del paso.

<!-- paso:9.01-3 -->

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

<!-- paso:9.01-4 -->

## 2026-11-12 · Paso 9.01-4: el diff en su drawer, «Ver actividad» en las fichas

- **La moneda de cada lado sale de la foto** (D37). `actividad_diff` suma `moneda_antes = antes->>'moneda'` y `moneda_despues = despues->>'moneda'`,
  nunca de la fila vigente (pudo cambiar o borrarse). Sólo fuera de `leads` y sólo si `authenticated` lee la columna `moneda` de esa tabla: la misma
  regla de grants con que `_actividad_recortar` elige columnas. Una tabla nueva con `moneda` entra sola. Sin foto (un evento de
  `registrar_actividad`), `null`, y el monto sale con «(moneda sin conocer)».
- **`origen_id` de la foto en la cabecera de un vehículo** (D38): sin él el drawer no sabe de qué origen leer las etiquetas de `atributos`. Quien
  recibe `visible: true` ya pasó `puede_vehiculo`.
- **Las etiquetas de `atributos` se leen al abrir y sólo de las claves que llegaron** (D39), activas o no; si la lectura falla, la clave sale
  humanizada y el resto del diff se ve igual.
- **La fila sin acceso no abre nada** (D40); por la URL, el drawer dice «No tienes acceso a este cambio.».
- **`?cambio=` se lee como texto** (D41, auditoría del plan): `idDelCambio` exige sólo dígitos, entero seguro y positivo. Cualquier otra cosa abre el
  drawer con «No tienes acceso a este cambio.» sin leer nada.
- **Abrir el drawer suma al historial y no va al servidor** (D42); **el título es fijo, «Detalle del cambio»** (D43), y la descripción llega con la lectura.
- **Un monto sin moneda conocida va por `<Monto moneda={null}>`** (D44, cambia lo del plan): el plan pedía `formatearNumero()` suelto, pero un número
  de dinero fuera de `<Monto>` no se oculta en el Modo Live. `<Monto>` acepta `moneda: null` (sólo el número, sin inventar moneda) y sigue siendo
  el único lugar donde se imprime dinero.
- **«Ver actividad» entra en la lista única del «⋯»** (D45) de lead y de vehículo, en un bloque propio antes de la papelera, sin «…» (lleva a otra
  página). Sólo la ficha lo ofrece. **La ruta la arma `src/app`** (D46) con `puede(permisos, 'actividad.ver')` y `rutaDeActividadDe`: `leads` y
  `vehiculos` no importan `actividad`. Son núcleo del carril A (D47): se editan sin borrar nada.
- **El e2e entra por «Ver actividad»** (D48) y elige la fila por la persona (el alta del lead la hizo el sistema).

<!-- paso:9.05-1 -->

# 9.05-1 · Datos: exportar todo, la base (2026-11-12)

- **D1 a D3 · Las dudas de la fila, con la recomendada.** Leads, vehículos y cotizaciones; «todo» no trae teléfonos ni lo privado de carteras ajenas;
  hasta 250.000 filas por archivo y 3 exportaciones por hora.
- **D4 · Las filas se registran antes del primer byte.** El route handler cuenta con un tope de 250.001 antes de llamar al registrar: con el CSV ya en
  camino no se puede cambiar el código de estado.
- **D5 · La lectura no pide el permiso.** `datos_exportar_leads()` devuelve lo mismo que `leads_vista` a esa sesión, así que no abre nada; pedirlo la
  volvería plpgsql y dejaría de inlinearse. El enforcement es el registrar, que el route handler llama antes de leer.
- **D6 · El candado es por persona** para las tres entidades; el tope, por entidad.
- **D7 · Sin script de carrera.** El candado es el patrón de `leads_exportacion_registrar` y una prueba de catálogo exige que vaya antes de leer
  `actividad`; lo que se perdería en una carrera es una exportación de más.
- **D8 · Filtros guardados:** sólo `desde`, `hasta` y `origen`. Vehículos exige origen (un archivo por origen), leads lo rechaza, cotizaciones lo admite.
- **D9 · El límite lee las 3 más recientes** (`order by creado_en desc limit 3`, por `actividad_actor_accion_idx`) en vez de contar: `libre_en` es la más
  vieja de las tres más una hora, y `escala.sql` no necesita otra excepción.

<!-- paso:9.05-2 -->

# 9.05-2 · Datos: exportar todo, el route handler con la fuente de leads (2026-11-12)

- **D10 · La 9.05-2 se parte.** Esta parte lleva el route handler y la fuente de leads; la 9.05-2b, vehículos y cotizaciones (dos lecturas por RPC
  distintas, cada una con su medición: no cabían en 6 commits).
- **D11 · El flujo lee con un token fijo, no con la cookie.** Un cliente de supabase-js con `accessToken` no refresca nunca: refrescar después de
  responder rotaría el refresh token sin poder guardarlo y la detección de reuso cerraría la sesión. El token se toma con `getSession()` y se verifica
  ese mismo con `getClaims(token)`; identidad y vencimiento salen de los claims. Es la única excepción a «nunca getSession()» y está en la ficha.
- **D12 · El conteo previo va por páginas de ids**, sin SQL nuevo. Medido: 0,3 s con 200.000.
- **D13 · Primero el permiso efectivo**, para no contar de balde; la autoridad sigue siendo el registrar (42501).
- **D14 · Una sola regla por tipo de campo:** las celdas salen de la exportación propia de `leads`, reexportadas por su `index.ts`.
- **D15 · Columnas de leads:** `N.º` (sólo con su permiso), Nombre, Teléfono, Tipo, Origen, Dueño, Creado, Último seguimiento y los campos activos.
  Sin `N.º propio` (la función no lo trae). Fechas como `AAAA-MM-DDTHH:mm` en la zona de la empresa.
- **D16 · El archivo se llama `leads-todos-AAAA-MM-DD.csv`.**
- **D17 · El conteo y la lectura usan el mismo instante de corte** y la lectura corta en las filas registradas: el archivo nunca pasa la constancia.
- **D18 · Un fallo a mitad del flujo lo corta con error** y el cupo queda gastado (la constancia ya se dejó; no hay RPC que la devuelva).
- **D19 · No se pide una página con menos de 30 s de token:** corta con error antes que mandar un pedido que dará 401.
- **D20 · La fila de rendimiento va en `docs/pasos/9.05-2/rendimiento.md`**, con su ancla.
- **`TOPE_DE_FILAS` queda en 250.000:** la lectura entera extrapolada da 42 s, y aun doblándola por el viaje HTTP y el JSON entra en los 5 min de
  vida mínima del token.
- **Las columnas viven en `features/exportar/`** y no en `entities/` (la auditoría del plan): `entities` no puede importar otro módulo, y las celdas son de `leads`.

<!-- paso:9.05-2b -->

# 9.05-2b · Datos: exportar los vehículos de un origen (2026-11-12)

- **D21 · Se parte otra vez:** la 9.05-2b lleva vehículos; la 9.05-2c, cotizaciones. Juntas eran 8 commits de código y sus lecturas no se parecen
  (tabla de a 1.000 contra una RPC de a 100). «Partes estimadas»: 5.
- **D22 · Los vehículos se leen de la tabla `vehiculos`**, bajo la RLS de quien exporta, y no con `vehiculos_inventario()`: exportar lee el origen
  entero y por la tabla es una pasada; la función corta en 100 y suma la portada. Las dos traen las mismas filas.
- **D23 · Columnas:** `N.º`, los comunes del tipo del origen, los campos activos del layout por orden, `Fase`, `Creado`, `Actualizado`. Sin vitrina,
  lead, creador, portada ni limpieza (lo conservador; se suma sin romper).
- **D24 · Celdas:** el número tal como llega (el precio sin redondear), «Sí»/«No», categoría, fase y opción por nombre, varias opciones con `' | '`
  (el separador de la exportación de leads), fechas con hora en la zona de la empresa. Vacío o tipo que no corresponde: `''`.
- **D25 · El pedido es una unión por `entidad`:** vehículos exige `origen` (guid); leads no lo admite. La base lo vuelve a exigir.
- **D26 · Un origen que no está da 404 `vacia`** sin contar ni registrar: la misma respuesta que uno sin vehículos visibles. Los inactivos sí exportan
  (`getOrigenes(true)`, auditoría del plan).
- **D27 · El archivo:** `vehiculos-<nombre del origen en ASCII>-todos-AAAA-MM-DD.csv` (hasta 40 caracteres; sin nada, el comienzo del id).
- **D28 · `TOPE_POR_ENTIDAD`:** 250.000 para leads y vehículos (medido: conteo 0,3 s y lectura 0,4 s con 250.000); el 409 lleva el de su entidad.
- **D29 · El orden se escribe una vez** (`seguirCon`); cada entidad entra con un `case`.
- **D30 · La medición va aparte** (`medir-datos-exportar-vehiculos.sql`), con 250.000 vehículos sembrados en la transacción.
- **D31 · La prueba SQL va en su archivo** (`exportar-vehiculos.sql`, auditoría del plan), con la papelera y un assert de catálogo: ninguna
  `datos_exportar_*` definer. Es una guarda de regresión: no podía salir en rojo porque la base no cambia.
- **D32 · La fase** se nombra con `leerFasesDeOrigen` (también las jubiladas); nula o desconocida, vacía.
- **El encabezado del precio queda «Precio»**, la etiqueta de `camposComunes()` (el vehículo no lleva moneda por fila); la 9.05-2c decide si su
  `Total (<moneda base>)` se alinea (auditoría del plan, menor).

<!-- paso:9.05-2c -->

# 9.05-2c · Datos: exportar las cotizaciones (2026-11-12)

- **D33 · Las cotizaciones se leen de la tabla `cotizaciones`**, bajo la RLS de quien exporta, y no de `cotizaciones_listado()`: la función es plpgsql
  (PostgREST no le empuja rango ni límite) y corta en 100 (2.500 llamadas contra 250). **Se aparta de la letra de la fila 9.05** («la cabecera que
  entrega `cotizaciones_listado()`»), no de su conducta: «total visible» es `total_base`, lo mismo que da la RPC; sin función definer nueva.
- **D34 · Columnas:** `N.º`, `Título`, `Cliente`, `Vehículo`, `Origen`, `Clase`, `Estado`, `Total (<moneda base>)`, `Creado`, `Actualizado`. **También se
  aparta de la fila:** sin `Vence el` ni «vencida» (se calculan con la vigencia de hoy, no se guardan) ni `moneda_mostrar` (sin término en el glosario).
  Se suman después sin romper.
- **D35 · Celdas:** número y total tal como llegan; «Preventa»/«Final» (las palabras de `ETIQUETA_DE_CLASE` de `cotizaciones`, que no sale por su entrada)
  y «Activa»/«Reportada»/«Inválida», en `Record` exhaustivos sobre los enums; lo nulo o lo que no llega, `''`; fechas en la zona de la empresa.
- **D36 · El encabezado del total es `Total (<moneda base>)`** con la moneda de los ajustes (`Total` si no se leen). El «Precio» de vehículos no se toca.
- **D37 · Los nombres se traen por página y se olvidan en la siguiente**, con el cliente del flujo: clientes por `leads_vista_por_ids` sólo con
  `leads.ver`; títulos de `vehiculos` de a 100 (un GET con `.in`).
- **D38 · `origen` es optativo en cotizaciones:** con él, su etiqueta va en el nombre del archivo; uno que no está da 404 `vacia` sin contar ni registrar.
- **D39 · `TOPE_POR_ENTIDAD.cotizaciones` queda en 250.000** (`TOPE_DE_FILAS`): la exportación entera con nombres se estima en 2,6 s de base (más
  ≈ 2.500 viajes de PostgREST, unos 25 s a 10 ms cada uno), lejos de 150 s.
- **D40 · La medición va aparte** (`medir-datos-exportar-cotizaciones.sql`), con 200.000 sembradas en la transacción sobre las 50.000 de la siembra.
- **D41 · La prueba SQL va en su archivo** (`areas/datos/exportar-cotizaciones.sql`), guarda de regresión; suma un lead de la cartera de Bea para
  recorrer `en_cartera`.
- **D42 · Sin migración, función, policy ni grant.**
- **D43 · El filtro `eliminado_en is null` va explícito** en la lectura (auditoría del plan): `eliminado_en` tiene grant y así el índice parcial no
  depende de que el planificador lo deduzca de la policy.

<!-- paso:9.05-3 -->

# 9.05-3 · Datos: la pantalla `/datos` (2026-11-12)

- **D44 · Sin `datos.exportar.todo` no se dibuja «Todo».** La fila pide a la vez «una asesora ve sólo Mis leads» y «sin permiso: la tarjeta
  deshabilitada con su motivo»: lo primero manda para el bloque entero; lo segundo es la tarjeta que, con el permiso, el rol no puede usar (no ve leads,
  vehículos o cotizaciones en ningún origen) y «Mis leads» sin `leads.exportar`. Reversible: mostrar el bloque apagado es un cambio de `tarjetas.ts`.
- **D45 · «Importar» es un hueco declarado** (`SECCIONES_DE_DATOS`, `disponible: false`): mientras haya una sola sección no hay barra de pestañas y
  `?seccion=importar` abre «Exportar» (ninguna pestaña se dibuja vacía). El 9.06 la prende y escribe la barra.
- **D46 · Delimitador fijo `;`** (Excel en español, como dice la ficha); sin selector.
- **D47 · «Descargado» no dice cuántas filas**, sólo el nombre del archivo (un número que se muestra nunca es un total exacto).
- **D48 · Orígenes del selector:** `getOrigenes(true)` (también inactivos, D26) filtrados por `vehiculos.ver` o `cotizaciones.ver` en ese origen;
  vehículos arranca en el primero, cotizaciones en «Todos los orígenes».
- **D49 · El rango y el origen de cada tarjeta viven en el formulario**, no en la URL: no son filtros de una lista; recargar los limpia.
- **D50 · «Mis leads» enlaza a `/leads?panel=exportar`** con `PANEL_EXPORTAR`, que `leads` exporta ahora por su `index.ts` (aditivo, una línea).
- **D51 · El e2e borra antes las constancias `datos.exportado` de su dueña** (por `sql()`) para que un reintento no choque con el cupo, y corre sólo
  en escritorio (pantalla nueva: un camino feliz). Identifica lo suyo por un lead propio con nombre del proyecto: «Propio Dalia» de otro proyecto
  sería ajeno para esta dueña.
- **D52 · El límite no apaga «Descargar»:** dice la hora en que se libera; decide la base.
- **D53 · El rango se valida en el navegador con el mismo `esquemaDelPedido`** (`pedidoDelFormulario`) antes de pedir: no gasta un viaje ni cupo.
- **D54 · Los orígenes se leen sólo con `datos.exportar.todo`:** quien ve sólo «Mis leads» no paga esa lectura.
- **D55 · La entrada «Datos» la ve todo el mundo** (`permisos: null`): «Mis leads» es de todos. `navegacion.test.ts` pasa a esperar Perfil y Datos sin
  ningún permiso.

<!-- paso:9.08-1 -->

## 2026-11-12 · Decisiones del paso 9.08-1 (`/tablero`: las cinco cifras)

- **D1 · Inicio sigue siendo la bandeja;** sólo gana «Ver el tablero» para quien tiene `tablero.metricas.ver`.
- **D2 · Los widgets se muestran por permiso,** no por rol: cada uno declara los suyos en el catálogo y la RPC los exige otra vez (42501).
- **D3 · Las gráficas serán SVG propio con `--viz-*`** (parte 2), sin dependencia nueva.
- **D4 · Una llamada por grupo de RPC y request:** `cache()` con `(desde, hasta)`; cada widget captura su error y uno caído no tumba a los demás.
- **D5 · El período vive en la URL** (`?periodo=mes|mes-anterior|90d`; ausente o desconocido es `mes`) y el selector son tres `<Link>`: sin JS.
- **D6 · «Mes» = del día 1 a hoy; «mes anterior» = el mes entero; «90d» = hoy − 89 a hoy,** todo en la zona de la empresa (ventana ≤ 366 días).
- **D7 · Una tasa nula es «Sin datos», nunca «0 %»;** una tasa de cero con leads sí es un dato. Cada cifra es un `role="group"` con nombre «Título: valor».
- **D8 · «Convertidos» dice «Cuenta desde <fecha>»** cuando `conversion_desde` cae después del inicio del período (9.07: los clientes de antes no tienen fecha).
- **D9 · «Leads creados» en cero dice «Todavía no hay leads en este período»** y ofrece «Nuevo lead» sólo con `leads.crear`.
- **D10 · Margen y cola web entran al catálogo como huecos** (`disponible: false`): no se montan ni se ofrecen; el 9.11 cambia el indicador y llena su archivo.
- **D11 · La preferencia `tablero.widgets` la valida `equipo`** y viaja en la `Sesion` (parte 3).
- **D12 · El encendido del menú va en el commit de la pantalla,** no en el siguiente como decía el plan: con la ruta creada y la entrada apagada, `navegacion.test.ts` falla.
- **D13 · El e2e compara el aumento de «Convertidos»** (n a n + 1), no un valor fijo: otros specs también convierten leads en el mismo mes.
- **D14 · Tipo de esta parte: pantalla** sobre las RPC de 9.07, sin SQL. Riesgo: el texto de la tasa nula y quién ve la entrada.

<!-- paso:9.08-2 -->

## 2026-11-12 · Decisiones del paso 9.08-2 (las gráficas del tablero)

- **D15 · Gráficas en HTML y SVG, sin librería.** El texto (ejes, nombres, números) es HTML; el SVG sólo pinta barras con `viewBox` y `preserveAspectRatio="none"`: ocupa el ancho de la tarjeta, ningún texto se deforma y en el celular no desborda. Alto fijo (`h-40`) para que no salte al cargar.
- **D16 · Cinco widgets anchos** con `tablero.metricas.ver` y el grupo de su RPC, después de las cifras y antes de los huecos del 9.11 (el orden del catálogo es el de la pantalla).
- **D17 · El contenedor de una gráfica es `role="img"`, no `group`,** y ningún título empieza como una cifra: así `getByRole('group', { name: /^Cotizaciones: / })` sigue encontrando una sola.
- **D18 · «Ver como tabla» es un `<details>` nativo** (Server Component, sin JS), cerrado por defecto, con todos los números en un contenedor de alto máximo.
- **D19 · Dos series por gráfica, siempre con leyenda en texto** (cuadrito de color y nombre); cada barra lleva su `<title>` y los números están en la tabla.
- **D20 · El ranking respeta el orden de la RPC** (creados de mayor a menor); las barras son proporcionales al máximo de la lista y los números van escritos. Origen nulo: «Sin origen»; persona sin nombre: «Sin nombre».
- **D21 · Topes con frase, nunca un total:** «Se muestran los 10 primeros orígenes.» y «Se muestran las 20 primeras personas.» sólo si la RPC dice que hay más; los 10 y 20 son constantes con la migración de 9.07 citada.
- **D22 · Vacío = sin movimiento en todo el período:** «Todavía no hay leads / cotizaciones en este período»; «Nuevo lead» sólo en leads y sólo con `leads.crear`.
- **D23 · Un solo e2e de camino feliz (T5), sembrando su propio lead** para no depender de otros specs; sin capturas, volumen ni e2e de vacío. Lo clave con vitest: la escala y los textos.
- **D24 · La tabla equivalente figura en `listas-con-patron.ts` con su motivo** (una tabla de sólo lectura de una gráfica, no una lista de registros): la guarda lo exigió al sumar `<Table>`.
- **D25 · Tipo de esta parte: pantalla** sobre las RPC de 9.07, sin SQL ni permisos nuevos.

<!-- paso:9.08-3 -->

## 2026-11-12 · Paso 9.08-3 (sigue la numeración de 9.08-2, que llegó a D25)

- **D26 · Sin SQL.** `preferencias_usuario(usuario_id, clave, valor jsonb)` con su RLS por dueña ya sirve: no hay migración, ni `db:*`, ni policy nueva.
- **D27 · La acción sale por `equipo/client.ts`, no por `index.ts`.** El consumidor es un Client Component y `index.ts` arrastra `server-only` (precedentes `agenda/client.ts` y `leads/client.ts`). Es la misma acción genérica `guardarPreferencia`; no se crea otra.
- **D28 · Qué se guarda:** `orden` = todas las claves que la persona puede ver, en su orden (ocultas incluidas); `ocultos` = las ocultas. Una clave que ya no existe o que dejó de ver se ignora al leer y se pierde al volver a guardar; un widget nuevo del catálogo queda al final.
- **D29 · Guarda al cambiar, sin botón «Guardar».** Una sola petición en vuelo (los controles se apagan mientras guarda); si falla, la lista queda como estaba y sale el error; si sale bien, `router.refresh()` redibuja el tablero.
- **D30 · «Restablecer»** manda `valor: null` (la acción borra la fila) y devuelve el orden del catálogo con todo visible; va apagado si no hay nada guardado. Sin confirmación (es reversible).
- **D31 · Ocultar todos es válido:** «Ocultaste todos los widgets» con «Elige cuáles quieres ver en «Personalizar».»; `EstadoSinPermiso` queda sólo para quien no ve ninguno. «Personalizar» está siempre en la cabecera y su `?panel=personalizar` conserva `?periodo=`.
- **D32 · El `<Drawer>` va con `diferido()` y figura en la guarda de drawers como `sinFormulario`** (interruptores y botones que guardan en el acto: no hay nada tipeado).
- **D33 · `BotonesDeOrden` y `useFocoTrasMover` se importan por su ruta**, sin ampliar el barril de `src/shared/ui/lista-de-catalogo/`. `aplicarPreferencia` pasó a ser genérica en el tipo del widget para conservar `WidgetConClave` sin tocar su regla.
- **D34 · El e2e cierra el panel antes de mirar el tablero:** con el `<Drawer>` abierto lo de atrás queda fuera del árbol de accesibilidad, así que un `toHaveCount(0)` con el panel abierto sería un falso verde.
- **D35 · Los controles de «Personalizar» siguen apagados hasta que el tablero se redibuja** (`enviando || redibujando`): cerrar el panel cambia la URL y un `router.refresh()` en vuelo se perdía, así que bajo la carga del CI el tablero seguía con lo anterior (T6 cayó en el PR del 9.08-3). Ahora «habilitado» en el e2e significa «ya redibujado».

<!-- paso:9.11-1 -->

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

<!-- paso:9.11-2 -->

# 9.11-2 · Tablero: los widgets del margen del mes y la cola web (2026-11-12)

- **D12 · El nombre del grupo del margen no lleva el monto.** `CifraDelWidget` pone el valor en el `aria-label`: con un monto, el Modo Live lo dejaría en
  el árbol de accesibilidad. El margen va en `CifraDeMonto` (grupo «Margen del mes», el monto por `<Monto>`); nulo, `CifraDelWidget` con «Sin venta
  registrada», que no es dinero. Reversible.
- **D13 · `TEXTO_SIN_VENTA` propio del tablero**, con el mismo texto que logística: `SIN_VENTA_REGISTRADA` no sale por la entrada de `logistica` y abrirla
  por una cadena no vale un cambio en otro módulo.
- **D14 · «Turnos», no «Solicitudes»**, en el widget de la cola: el glosario llama **Turno web** a la fila de `solicitudes_contacto_web`. El título sigue
  «Cola de la web».
- **D15 · El caso T7 lo hace entero la dueña** (registra y confirma el pago): `pago_confirmar` no impide confirmar un pago propio y así el caso no depende
  de dos sesiones.
- **D16 · T7 no siembra gasto:** la diferencia esperada es el pago. La resta pago − gasto al centavo la prueba R1 de `margen-y-cola.sql` (9.11-1).
- **D17 · El margen se dibuja sin «mes cerrado»:** la nota dice que cada vehículo cuenta por su último pago confirmado (consecuencia de D3 de la 9.11-1).
- **D18 · `mediana_minutos` sin `min(0)` en el esquema:** un turno con `contactada_en` anterior a `asignada_en` tumbaría el widget entero; la RPC no lo
  acota y un número raro se ve, no esconde las demás cifras.
- **D19 · `borrarDineroDeEsteOrigen`** en `e2e/soporte/dinero.ts`: `borrarDinero` barre todos los orígenes `e2e_%` y no convive con un terreno que tiene
  cotizaciones vivas (el de la final en `tablero.spec.ts`).
