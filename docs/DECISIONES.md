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
