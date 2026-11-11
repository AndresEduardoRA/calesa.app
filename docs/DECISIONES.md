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
