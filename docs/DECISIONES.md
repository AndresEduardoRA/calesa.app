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
