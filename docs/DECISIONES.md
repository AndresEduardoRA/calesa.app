# Decisiones

Registro ligero. Una entrada por decisión que costaría entender de nuevo dentro de tres meses.
No documentes lo obvio.

Formato:

## AAAA-MM-DD — <decisión en una línea>

**Contexto:** qué problema había.
**Decisión:** qué se eligió.
**Alternativas:** qué se descartó y por qué.
**Consecuencia:** qué se vuelve fácil y qué se vuelve difícil por haber elegido esto.

---

## 2026-10-11 — Stack y andamiaje inicial

**Contexto:** proyecto nuevo, construido principalmente con asistencia de IA, que reemplaza al
prototipo `ip` (Next 16 + Supabase, 120 tablas, 20 features) cuyos problemas fueron mala
documentación, difícil de escalar y exceso de peticiones a la base.
**Decisión:** Next 16 App Router + React 19 + TypeScript 6 + Tailwind 4 + shadcn + TanStack Query +
Zod 4 + next-safe-action + nuqs + Supabase (SSR, RLS, Realtime, Storage, pg_cron, edge functions)
sobre Vercel Pro y Supabase Pro; pnpm; ESLint 10 con `eslint-plugin-boundaries` y typed linting,
Prettier, lefthook + commitlint, Vitest 4 + Playwright; hooks de Claude Code que bloquean (lint por
archivo, verificación al terminar, comandos peligrosos); memoria del proyecto por capas (mapa
generado, fichas por módulo, glosario, UX).
**Alternativas:** TypeScript 7 (10× más rápido, pero sin API del compilador: se pierde
`no-floating-promises`); Biome (sin boundaries, que es la regla central); husky (sin publicar desde
2024); Serwist para offline (el brief pide shell mínimo, no offline).
**Consecuencia:** el lint y los hooks bloquean antes que la revisión humana; el setup inicial es
más pesado y cambiar de arquitectura después cuesta más.

## 2026-10-11 — Nivel 2, monolito modular con 17 módulos

**Contexto:** más de diez áreas de negocio con datos y reglas propias; `ip` empezó en features
planas y a las 20 features ya nadie sabía qué dependía de qué.
**Decisión:** `src/modules/<dominio>/` con capas adentro (`features`, `entities`, `infra`) y API
pública en `index.ts`; dependencias en un solo sentido declaradas en `docs/ARQUITECTURA.md` y
verificadas por `scripts/mapa.sh --check`.
**Alternativas:** nivel 1 (features planas: lo que no escaló); nivel 3 (monorepo: no hay dos apps
Next que compartan código; la web pública es otro repo sobre el mismo Supabase).
**Consecuencia:** un nivel más de carpeta y una ficha por módulo; a cambio, cada módulo se puede
entender solo y el mapa muestra los ciclos.

## 2026-10-11 — Un motor de flujos para vehículos y repuestos, no tres copias

**Contexto:** `ip` tiene `vehicle_states`, `part_states` y `china_unit_states` con requisitos,
historial, documentos, transporte y RPC triplicados; agregar un origen (Corea) era copiar todo.
**Decisión:** `flujos` (uno por origen + uno de repuestos) con `fases`, `fases_transiciones`,
`fases_requisitos` (documento | dato | espera), roles por fase/transición, reglas por flujo;
`historial_fases`, `documentos`, `transportes`, `gastos`, `pagos`, `notas` con dos FK nullable
(`vehiculo_id` | `repuesto_id`) + CHECK; una única RPC `cambiar_fase`.
**Alternativas:** tabla `unidades` genérica con extensiones 1:1 (más indirección en PostgREST y
FKs menos claras); mantener tablas por origen (lo que se quiere dejar atrás).
**Consecuencia:** un origen nuevo es una fila y su flujo nace por trigger; a cambio, cada consulta
de hijas lleva `coalesce`/CHECK de dos columnas y las claves de dato de los requisitos son código
(`_requisito_dato_cumplido`).

## 2026-10-11 — Orígenes configurables: campos comunes como columnas, el resto en `atributos`

**Contexto:** el brief pide orígenes custom con layout propio (preconfig subasta/apibara o manual).
**Decisión:** `origenes_campos` describe el layout; `vehiculos` tiene columnas para lo común
(marca, modelo, año, VIN, lote, precio…) y `atributos jsonb` validado por trigger para lo
específico; los filtros se derivan de `origenes_campos.filtrable`.
**Alternativas:** todo jsonb (no se indexa ni se pone UNIQUE al VIN); una tabla por origen.
**Consecuencia:** agregar un campo no toca el schema; a cambio, un campo nuevo que necesite índice
o unicidad sí es migración (se promueve a columna).

## 2026-10-11 — La fórmula de cotización es un grafo versionado validado en SQL

**Contexto:** `ip` tiene 28 constantes por código y tres cotizadores escritos a mano; el brief
pide que un origen custom se cotice sin programar.
**Decisión:** `formulas.definicion` = lista ordenada de nodos (input, constante, tipo_cambio,
campo_vehiculo, bandera, tabla, tramo, calculo con operaciones cerradas), `params` para las
constantes, `buckets` por tipo de cambio; `validar_formula()` es el candado (sin ciclos, un único
total); versionado append-only con un borrador y una publicada por origen; snapshot de valores por
cotización; el motor TS en `entities/` evalúa; el ⚙ de una XCell publica N+1. Detalle en
`docs/COTIZADOR.md`.
**Alternativas:** expresiones libres (un motor de expresiones en SQL es un riesgo y una deuda);
constantes por código como `ip` (obliga a programar cada origen).
**Consecuencia:** el editor de fórmulas es trabajo de UI real (fase 4); a cambio, cotizar un origen
nuevo es configurar.

## 2026-10-11 — Permisos: catálogo fijo por código, roles libres, origen y alcance como parámetros

**Contexto:** el brief pide permisos «hasta el más mínimo detalle» y roles creados por el dueño.
**Decisión:** `permisos` se siembra por migración (una clave existe sólo si hay enforcement);
`roles_permisos(rol, clave, origen_id NULL=todos, alcance propios|todos)`; unión sin herencia;
dominancia (nadie otorga lo que no tiene); guardián diferido; `dueno` nunca pierde `equipo.*`.
**Alternativas:** permisos creables desde la UI (un toggle que no protege nada); claves por origen
(`flujos.china.mover`: no escala a orígenes custom).
**Consecuencia:** un permiso nuevo es una migración con su policy; a cambio, cada toggle de la
matriz protege algo de verdad.

## 2026-10-11 — Teléfono único global y enmascarado salvo cartera; leads en limbo

**Contexto:** el brief: el teléfono identifica al lead, «el que registra se lo queda», nadie más lo
ve; al dar de baja, los leads quedan «de nadie» hasta que alguien registre ese teléfono.
**Decisión:** índice único parcial entre leads vivos; `revoke select (telefono_principal)` y
`leads_vista` con `telefono_lead()` definer (enmascara incluso al dueño); limbo = sin filas
vigentes en `leads_asesores` (sin columna); `crear_lead` adopta y audita.
**Alternativas:** receptor obligatorio al dar de baja (lo que hace `ip`): el brief pide lo contrario.
**Consecuencia:** un lead en limbo es invisible para todos hasta que alguien tipea su teléfono;
el tablero debe mostrar cuántos hay para que no se olviden (fase 9).

## 2026-10-11 — Policies de la fila propia inline, no por función

**Contexto:** la prueba de humo falló: `INSERT … RETURNING` sobre `vehiculos` con policy SELECT
`puede_vehiculo(id)` — una función STABLE no ve la fila insertada en la misma sentencia.
**Decisión:** las policies de `vehiculos`, `leads` y `cotizaciones` se escriben sobre las columnas
de la fila; `puede_*(id)` queda para las tablas hijas.
**Consecuencia:** regla en `.claude/rules/migraciones.md`; una policy nueva sobre una tabla raíz
se escribe inline.

## 2026-10-11 — Embarques y contenedores son grupos; la DUI es entidad

**Contexto:** `ip` congeló `shipments` tras una auditoría: una tabla dueña de datos que había que
sincronizar con el transporte por vehículo.
**Decisión:** `transportes` 1:1 por unidad; embarque = grupo por `booking`, contenedor = grupo por
`contenedor` (vistas); `declaraciones_aduana` N:M con `removido_en`.
**Consecuencia:** editar un embarque es «aplicar a todos los del grupo», todo o nada con `PT409`.

## 2026-10-11 — Secretos fuera de la base; integraciones como interruptor

**Decisión:** `integraciones.config` nunca guarda claves; apibara, VAPID y el secreto de
revalidación de la web van en variables de entorno de Vercel y de las edge functions (o Vault).
**Consecuencia:** activar apibara es un switch en la UI + una variable en el entorno.
Reemplazada más abajo: «Secretos: Vault por RPC para lo que se edita en la interfaz».

## 2026-10-11 — Monedas: base + N tipos de cambio nombrados, congelados por cotización

**Contexto:** «agnóstico al país»; Bolivia usa oficial y paralelo, otro país puede usar uno.
**Decisión:** `monedas`, `tipos_cambio(clave, moneda_de, moneda_a, valor)` con historial; la fórmula
declara `buckets` → clave de tipo de cambio; la cotización guarda `tipos_cambio` usados.
**Consecuencia:** cambiar el TC no mueve cotizaciones guardadas; el Modo Live oculta símbolos y
cifras en toda la app, no sólo en el cotizador.

## 2026-10-11 — Cola web: habilitado nace en false; prioridad ponderada

**Decisión:** conserva la ruleta de `ip` (puntero al asignar, pegajoso, cupo, reasignación fuera
de la cadena) y agrega `prioridad` (divide la carga abierta por prioridad+1) y `max_intentos`.
`habilitado` arranca apagado: un asesor entra a la rueda cuando alguien lo decide.
**Consecuencia:** publicar de menos; el tablero de la cola es la pantalla que lo enciende.

## 2026-10-11 — PDF de cotizaciones en servidor con `@react-pdf/renderer`

**Contexto:** `ip` usaba `jspdf` + `html-to-image` en el cliente: resultados distintos por navegador.
**Decisión:** la plantilla versionada (`plantillas_tarjeta.definicion`) se renderiza a PDF en un
route handler con `@react-pdf/renderer` (fuentes TTF), idéntico siempre; la tarjeta en pantalla
usa el mismo modelo de vista.
**Consecuencia:** una sola fuente de verdad del layout; no hay imágenes de cotización en el cliente.

## 2026-10-11 — Íconos PWA neutros hasta que la empresa cargue su logo

**Contexto:** producto white-label; no hay logo del producto, cada empresa carga el suyo.
**Decisión:** `public/` lleva un ícono neutro generado (glifo de tres tramos con flecha sobre el
primario `#3b5bdb`, ver `design/ICONOS.md`); en la fase 1, «Regenerar íconos» los produce desde
`ajustes_empresa.logo_ruta` y `manifest.ts` los prefiere cuando existen.
**Consecuencia:** no hay placeholders feos ni marca ajena; el despliegue se identifica al configurar.

## 2026-10-11 — Lo que se dejó fuera a propósito

Editor de artes (Konva) y directorio de contactos (`navieras` es un catálogo plano; proveedores
son texto en gastos): el usuario los marcó como fuera. Modo Live se conserva y además oculta los
símbolos de moneda. Comprobantes de venta internos se conservan.

## 2026-10-11 — Boundaries con la sintaxis v7, no la legacy

**Contexto:** `eslint-plugin-boundaries` 7.2 acepta la sintaxis vieja (`rules`, `mode: "full"`,
`${from.modulo}`) pero avisa que desaparece en la v8, y con patrones `**/*` + `partialMatch`
clasificaba mal los archivos que cuelgan directo de `infra/` (quedaban «unknown» y la regla no
los veía).
**Decisión:** elementos como carpetas (`src/modules/*/features`, sin `**/*`), `policies`, y
`captured: { modulo: "{{ from.element.captured.modulo }}" }` para «mismo módulo»; probado contra
un árbol de ejemplo con las cuatro violaciones típicas (features→infra, app→infra, tripas de otro
módulo desde features y desde infra) y las importaciones permitidas.
**Consecuencia:** el lint sí atrapa la regla central; el PROMPT 0 lo vuelve a probar en el repo real.

## 2026-10-11 — Migración base generada desde `supabase/schemas`

**Contexto:** las tablas vivían sólo en `supabase/schemas/` y las migraciones a mano arrancaban en
`000100_rbac.sql` dándolas por creadas. `supabase start` y `supabase db reset` aplican únicamente
`migrations/`: la base local no levantaba (`type public.alcance_permiso does not exist`).
`pnpm db:probar` no lo veía porque aplica `schemas/` y `migrations/` por su cuenta.
**Decisión:** `scripts/esquema-base.mjs` (`pnpm db:base`) concatena los `schema_paths` de
`config.toml`, en su orden, en `migrations/20261011000000_esquema_base.sql`. Ese archivo es
generado y no se edita. `db:probar` lo salta al aplicar (ya aplica `schemas/`) y falla si quedó
desactualizado, así que el pre-commit lo vigila.
**Alternativas:** `supabase db diff` para generarla (no se probó: pasa por una herramienta de diff
en vez de copiar el SQL tal cual, y las migraciones a mano tendrían que apartarse para correrlo);
mover las tablas a una migración escrita a mano y abandonar `schemas/` (se pierde el estado
declarativo por dominio, que es lo que lee `docs/MAPA.md`).
**Consecuencia:** mientras no exista base en producción, un cambio de schema es editar `schemas/`
y correr `db:base` + `db:reset` + `db:types` + `db:probar`. Después del primer `db push` la base
queda congelada (ya está aplicada) y los cambios pasan a ser migraciones incrementales: ese día
hay que cambiar esta regla y el chequeo de `db:probar`.

## 2026-10-11 — shadcn dentro de `src/shared/ui`, con sus variables puenteadas a los tokens

**Contexto:** `shadcn init` dejó los componentes en `src/components/ui` y su propio tema neutro en
`globals.css`, fuera de las capas que vigila boundaries y sin relación con `design/tokens.css`.
Los nombres chocaban: `--sidebar` (un ancho en los tokens, un color en shadcn) y `--radius-sm|md`.
**Decisión:** los componentes viven en `src/shared/ui` (alias de `components.json` apuntando ahí).
`globals.css` importa `design/tokens.css` sin capa y define las variables semánticas de shadcn
(`--primary`, `--border`, `--muted-foreground`…) como referencias a tokens. Se eliminaron las
variables de sidebar y de gráficas de shadcn. Los tokens no se registran en `@theme`: en
componentes propios se usan con la sintaxis de variable (`bg-(--color-surface)`), como pide la
cabecera de `tokens.css`.
**Alternativas:** copiar los tokens dentro de `@theme` (dos fuentes que se desincronizan);
reescribir los componentes de shadcn con los nombres de los tokens (se pierde `shadcn add`).
**Consecuencia:** `shadcn add` sigue funcionando y lo nuevo nace con el diseño del proyecto, en
claro y en oscuro, sin tocar cada componente. Un token nuevo que shadcn deba usar necesita su
línea en el puente.

## 2026-10-11 — `puede()` y el catálogo de claves viven en `src/shared/lib/permisos.ts`

**Contexto:** la ficha de `equipo` los ubicaba en su `entities/permisos.ts`, pero `entities/` de
cualquier otro módulo sólo puede importar `@/shared`, y todos necesitan `puede()`.
**Decisión:** el tipo `ClavePermiso`, `puede()`, `alcanceDe()` y `origenesCon()` están en `shared`,
con la misma semántica que `tiene_permiso()`, `alcance_de()` y `origenes_con_permiso()`. Un test
lee `supabase/seed.sql` y falla si el catálogo y el archivo divergen.
**Consecuencia:** `equipo` aporta los datos (`mis_permisos()`), no la regla. Un permiso nuevo se
agrega en el seed (o su migración) y en `permisos.ts` en el mismo commit, o el test lo frena.

## 2026-10-11 — Lo que se ve sin sesión sale de `web.ajustes_acceso()`, con `primer_registro`

**Contexto:** las pantallas de acceso necesitan el nombre, el logo y saber si ofrecer «Crear
cuenta», pero corren como `anon` y `ajustes_empresa` sólo la lee `authenticated`. Además
`registro_abierto` nace en `false`: mirando sólo esa columna, en una instalación recién hecha el
botón queda oculto y la primera persona (la dueña) no tiene por dónde entrar.
**Decisión:** función DEFINER `web.ajustes_acceso()` con las columnas contadas (nombre, logo,
locale, moneda base, registro abierto) más `primer_registro` (no hay perfiles todavía).
`registroDisponible()` repite en TS la condición del trigger `auth_registro_permitido()`.
**Alternativas:** un grant de columnas a `anon` sobre la tabla (rompe «`anon` sólo toca `web`» y
no resuelve `primer_registro`); leer con el cliente admin (la regla lo reserva a portal y crons).
**Consecuencia:** `web` deja de ser sólo «lo que consume la web pública»: también lleva lo poco
que el propio sistema muestra antes de ingresar. Lo que haga falta ahí se suma a esa función.

## 2026-10-11 — `/auth/callback` canjea `code` (Google) y `token_hash` (correos)

**Contexto:** el pedido era un handler que canjea el código. Con PKCE ese código sólo sirve en el
navegador que lo pidió: recuperar la contraseña desde la computadora y abrir el correo en el
celular falla. Y los enlaces que genera la API admin (las invitaciones) no traen `code`.
**Decisión:** las plantillas de correo (`supabase/templates/`, declaradas en `config.toml`) arman
el enlace como `{{ .SiteURL }}/auth/callback?token_hash=…&type=…`; el handler acepta las dos
formas y los errores que Auth devuelve por redirección. `recovery` e `invite` siguen a
`/auth/nueva-contrasena`; lo que falla vuelve a una pantalla con su `?aviso=`.
**Consecuencia:** un enlace funciona en cualquier dispositivo y las invitaciones entran por la
misma puerta. En la nube las plantillas se cargan a mano (Auth › Emails) y `Site URL` tiene que
ser la dirección real de la app; los e2e reescriben el origen porque corren en otro puerto.

## 2026-10-11 — `mi_sesion()`: la sesión entera en una ida a la base

**Contexto:** cada pantalla necesita perfil, roles, permisos y preferencias (cuatro consultas), y
una persona bloqueada ni siquiera puede leer su perfil (la policy exige estar activa), así que
la app no tenía cómo decirle por qué no entra. El exceso de peticiones fue un problema de `ip`.
**Decisión:** RPC DEFINER `mi_sesion()` que devuelve estado de la cuenta (`activa`, `bloqueada`,
`baja`), perfil, roles, concesiones y preferencias de quien llama; `getSesion()` la envuelve en
`cache()` de React: una verificación del JWT y una RPC por request.
**Alternativas:** `'use cache: private'` (guarda la sesión cinco minutos en el navegador: un
permiso quitado se seguiría viendo); el hook de access token (ya anotado como deuda, sólo si esto
se vuelve caro).
**Consecuencia:** un dato nuevo que el shell necesite de la persona se suma a esa función.
`actionClient` sigue llamando a `mis_permisos()` por su lado.

## 2026-10-11 — Google sin variable de entorno; el botón depende de lo que diga Auth

**Contexto:** con el proveedor apagado, mandar a alguien a `/authorize` le muestra un JSON de error.
**Decisión:** `/ingreso` consulta `/auth/v1/settings` (público) y dibuja el botón sólo si Google
está encendido. Lo que falla después vuelve por `/auth/callback` y se lee como aviso (cancelado,
registro cerrado, error genérico).
**Consecuencia:** no hay nada que configurar del lado de la app. Queda un caso sin cubrir:
proveedor encendido con credenciales de relleno (el local de hoy), donde el error lo muestra
Google en su propia página. Se resuelve apagando el proveedor donde no hay credenciales.

## 2026-10-11 — El `index.ts` de un módulo se importa sólo desde Server Components

**Contexto:** la API de `equipo` mezcla código de servidor (`requerirSesion`, actions) con
componentes de cliente. Probado: un Client Component que importa `@/modules/equipo` rompe el build
(arrastra `next/headers` y `server-only` al navegador).
**Decisión:** un Client Component de `app/` o de otro módulo recibe la action o el dato por props
desde un Server Component (así llega `cerrarSesion` al menú del usuario). Dentro del módulo,
`features/` toma las implementaciones de `composicion.ts` (servidor) y `composicion.client.ts`
(navegador), nunca de `infra/`.
**Alternativas:** una segunda entrada `cliente.ts` por módulo: hoy `scripts/mapa.sh --check` la
contaría como «importar las tripas».
**Consecuencia:** cuando `equipo` exponga hooks (`usePerspectiva()`) para Client Components de
otros módulos, hará falta esa segunda entrada y ajustar el mapa y el lint. Resuelto más abajo:
«Un módulo tiene dos entradas».

## 2026-10-11 — La navegación se declara entera y un test la compara con las rutas que existen

**Decisión:** `src/app/(app)/_shell/navegacion.ts` lista todas las pantallas de `docs/UX.md` con
su permiso y un `disponible`; sólo se muestran las disponibles. `navegacion.test.ts` falla si
`disponible` no coincide con que exista `page.tsx`.
**Consecuencia:** ningún enlace del menú lleva a un 404, y quien agrega una pantalla tiene que
prender su entrada (el test se lo recuerda).

## 2026-10-11 — El e2e de acceso exige la base local sin personas

**Contexto:** «la primera persona nace dueña» sólo se puede probar con el equipo vacío.
**Decisión:** el e2e crea cuentas `@e2e.importadora.test`, borra sólo esas y, si encuentra otras,
frena y pide correr `pnpm db:reset`. Se niega a correr contra un Supabase que no sea local.
**Alternativas:** borrar a todos (destruye datos de quien desarrolla); un stack aparte para e2e.
**Consecuencia:** quien tenga gente cargada en su base local tiene que resetearla para correr los
e2e. Si molesta, la salida es un segundo stack de Supabase sólo para e2e.

## 2026-10-11 — Un módulo tiene dos entradas: `index.ts` (servidor) y `client.ts` (cliente)

**Contexto:** `usePerspectiva()` lo necesita el menú del usuario, que es un Client Component de
`app/`. Importar `@/modules/equipo` desde el navegador rompe el build, y un hook no se puede
entregar por props.
**Decisión:** `src/modules/<x>/client.ts` es la segunda entrada pública: sólo hooks, componentes
de cliente (o puros) y tipos de `entities/`. El lint pasó de vetar tres carpetas a vetar todo
`@/modules/*/*` salvo `/client`, y un override le prohíbe a `client.ts` importar `./composicion`,
`./infra`, `server-only` y `next/headers`; lo transitivo lo frena el build. `scripts/mapa.sh` la
lista como «API de cliente» y deja de contarla como importar las tripas.
**Alternativas:** todo por props (no alcanza para hooks); mover el hook a `shared` (mete una regla
de `equipo` donde no hay reglas de negocio).
**Consecuencia:** de paso se cerró un hueco: `@/modules/equipo/composicion` se podía importar
desde otro módulo. Un componente puro puede salir por las dos entradas (`RoleBadge`).

## 2026-10-11 — El cliente admin tiene una sola excepción: `conAdminDeAuth()`

**Contexto:** invitar exige `auth.admin.*`, que sólo anda con la secret key, y la regla reservaba
ese cliente al portal, los webhooks y los crons.
**Decisión:** una única función, en `equipo/infra/invitaciones.ts`, lo crea. Antes comprueba
`equipo.usuarios.gestionar` en la base con el cliente de quien invita, y entrega sólo `auth.admin`
envuelto en `CuentasInvitadas` (crear, borrar, enviar correo, generar enlace): nadie recibe
`.from()` ni `.rpc()`. El rol no lo asigna ella: lo hace `rbac_asignar_rol` con la sesión de quien
invita, para que valga la dominancia. El lint prohíbe importar el cliente admin desde otro archivo.
**Alternativas:** una RPC `equipo_invitar` en SQL (no puede crear cuentas de Auth); pasar el
cliente admin entero a la action (nada impediría leer `leads` con él).
**Consecuencia:** los pasos de invitar viven en `features/equipo/invitar.ts` contra puertos, y se
prueban con un Auth de mentira. El portal, los webhooks y los crons se suman a la lista del lint
cuando existan.

## 2026-10-11 — El registro cerrado se comprueba al cerrar la transacción, no al insertar

**Contexto:** el diseño decía «los invitados pasan porque traen `app_metadata.invitado`». Probado
contra Auth: `createUser` inserta la cuenta y recién después, en un UPDATE de la misma
transacción, le pone `app_metadata`. El trigger `BEFORE INSERT` nunca veía la marca y rechazaba
también a los invitados. La prueba de humo pasaba porque insertaba la fila con la marca puesta.
**Decisión:** `auth_registro_permitido()` pasa a ser un constraint trigger diferido que lee la fila
como quedó. La prueba de humo ahora imita a Auth (INSERT sin marca, UPDATE con marca).
**Alternativas:** una tabla de invitaciones preautorizadas por correo, escrita con la sesión de
quien invita (más superficie; queda como salida si Auth deja de hacer las dos cosas en una
transacción).
**Consecuencia:** al fallar en el commit, Auth ya no responde «Database error saving new user»
sino un error sin detalle. La app comprueba `registroDisponible()` antes de pedir el alta y al
volver de Google. El e2e de invitación es la alarma si un cambio de Auth rompe el supuesto.

## 2026-10-11 — Un solo enlace de invitación vigente por persona

**Contexto:** se pedía enlace copiable **y** correo. Auth guarda un solo token de invitación por
cuenta y `generateLink` no envía correo: el enlace de la pantalla y el del correo no pueden ser el
mismo sin un servicio de correo propio.
**Decisión:** al invitar se intenta el correo de Auth. Si falla, el enlace se genera y se muestra
solo. Si sale, «Copiar enlace» genera uno nuevo a pedido y avisa que el del correo deja de servir.
Generar un enlace exige dominar los roles de esa persona (quien lo abre elige su contraseña).
**Alternativas:** dos tokens (invitación por correo + recuperación copiable): el segundo seguía
sirviendo hasta una hora después de que la persona entrara; correo propio con SMTP en la app
(dependencia nueva y configuración repetida).
**Consecuencia:** nada queda vivo después de que la persona entra. La invitación vence con
`otp_expiry` (1 h en local, tope de 24 h en la nube): la lista ofrece «Generar otro enlace».

## 2026-10-11 — La perspectiva «ver como» viaja en una cookie y se calcula en SQL

**Contexto:** quien diseña roles necesita ver la app como la ve cada rol, sin que eso le dé nada.
**Decisión:** una cookie `perspectiva` (`httpOnly`, de sesión, sin firma) guarda el id del rol.
`getSesion()` la lee y llama `mi_sesion(p_perspectiva)`, que devuelve los permisos efectivos de
`permisos_efectivos()`: los míos ∩ los del rol (origen más angosto, alcance menor). La usa sólo
quien tiene `equipo.roles.gestionar` real; para el resto la función ignora el parámetro. RLS, las
RPC y `actionClient` siguen con `mis_permisos()`.
**Alternativas:** guardarla en `preferencias_usuario` (seguiría puesta en otro dispositivo y al
día siguiente); un permiso nuevo `equipo.perspectiva.usar` (a quien no diseña roles sólo le
serviría para ver menos); calcular la intersección en TypeScript (la regla quedaría en dos lados).
**Consecuencia:** la cookie no necesita firma: lo peor que logra quien la falsea es ver menos.
Sigue siendo una ida a la base por request. «Salir» sale del permiso real, así no se pierde al
mirar como un rol sin `equipo.*`. La perspectiva no protege nada: sólo dibuja.

## 2026-10-11 — La vista previa de una baja es una RPC que sólo cuenta

**Contexto:** antes de dar de baja hay que decir cuántos leads van al limbo, y quien gestiona
personas no necesariamente ve los leads ajenos. Además `equipo_dar_de_baja` contaba filas de
dueño revocadas: un lead con un compartido vigente se contaba aunque no cayera al limbo.
**Decisión:** `equipo_vista_previa_baja()` (STABLE, DEFINER, con `assert_permiso`) devuelve sólo
conteos. Comparte `_leads_al_limbo_de()` con la baja, que ahora devuelve lo mismo. El diálogo
tiene URL (`?baja=`): el Server Component lee el conteo y lo pasa por props.
**Alternativas:** contar para toda la lista (una consulta por persona); una action que lea al
abrir el diálogo (el botón existiría antes que el número).
**Consecuencia:** nadie confirma sin ver el número, y la vista previa y el resultado no pueden
decir cosas distintas.

## 2026-10-11 — La versión de un rol cubre sus concesiones; bloquear usa el estado

**Contexto:** `roles_permisos` y `usuarios_roles` no tienen `actualizado_en`, y la regla pide que
toda edición mande la versión esperada.
**Decisión:** la versión de un rol es `roles.actualizado_en`: otorgar, revocar y eliminar la
reciben, bloquean la fila, levantan `PT409` y devuelven la nueva. En la matriz, cada celda es una
edición y van de a una por rol, para no chocar consigo misma. Bloquear y dar de baja usan como
precondición el estado de la cuenta (ya bloqueada, ya de baja → `PT409`). Asignar y quitar un rol
son idempotentes y no llevan control.
**Alternativas:** `perfiles.actualizado_en` para bloquear (cambia cuando la persona edita su
nombre: conflictos falsos); guardar la matriz entera con un botón (un conflicto perdería todos
los cambios).
**Consecuencia:** dos personas editando el mismo rol se enteran; dos editando roles distintos no
se molestan.

## 2026-10-11 — El guardián cuenta la unión de roles y cuida todo `equipo.*` del dueño

**Contexto:** exigía que un mismo rol tuviera los dos permisos de administración (los permisos
son la unión de roles) y al rol dueño sólo le cuidaba `equipo.roles.gestionar`.
**Decisión:** queda al menos una persona que puede operar (activa, sin bloqueo, invitación
aceptada) cuyos roles sumados dan los dos permisos; y el rol dueño conserva todos los permisos
del módulo `equipo`. Una invitación pendiente no cuenta.
**Consecuencia:** un permiso nuevo de `equipo` se le otorga al dueño en la misma migración que lo
crea, o el guardián rechaza el siguiente cambio. Bloquear y dar de baja siguen sin exigir dominar
los roles de la persona: se decidió dejarlo fuera de esta parte.

## 2026-10-11 — Voz: español neutro con tuteo, también en la base

**Contexto:** la interfaz nueva hablaba de tú y `errores.ts`, `safe-action.ts` y las RPC de vos.
**Decisión:** tuteo en todo lo que llega a la pantalla, incluidos los `raise exception` (el
mensaje de una RPC se muestra tal cual). Se reescribieron `errores.ts`, `safe-action.ts` y las
funciones SQL de equipo y roles.
**Consecuencia:** las RPC de leads, flujos y cotizaciones siguen de vos hasta que su fase las toque.

## 2026-10-12 — Secretos: Vault por RPC para lo que se edita en la interfaz

**Contexto:** la decisión anterior mandaba el secreto de apibara a una variable de entorno, y la
ficha de `empresa` lo dejaba pendiente. El producto se vende por repositorio: quien configura
apibara es el dueño, que no entra a Vercel. Además apibara corre en una edge function y la
revalidación de la web sale de un trigger: los dos leen de la base, no del entorno de la app.
**Decisión:** lo que el dueño carga desde la interfaz vive en Vault. `integracion_guardar_secreto()`
(con `empresa.ajustes.gestionar`) crea o reemplaza `vault.secrets` con el nombre
`integracion:<clave>` y sella `integraciones.secreto_guardado_en`, que es lo único que la app lee:
la pantalla dice «Guardada el …» y ofrece reemplazarla. `integracion_secreto()` lo devuelve sólo a
`service_role`. La dirección a la que apibara manda la clave sólo puede ser de `apibara.tech` (Zod
y la RPC): si fuera libre, quien edita la configuración podría llevársela. Variables de entorno quedan para la infraestructura del despliegue:
`SUPABASE_SECRET_KEY`, `VAPID_PRIVATE_KEY`, las credenciales de Google.
**Alternativas:** todo en variables de entorno (activar una integración exige a alguien con acceso
al despliegue, y un trigger no las lee); una columna cifrada propia (reinventa Vault).
**Consecuencia:** activar apibara es guardar la clave y prender el interruptor, sin tocar el
despliegue. PGlite no trae Vault: `scripts/probar-schema.mjs` lo imita, así que la prueba de humo
cubre nuestras funciones y sus grants; contra el Supabase local, el e2e guarda la clave en el Vault
real y comprueba que ni quien la guardó ni alguien sin sesión ejecutan `integracion_secreto()`.
No hay borrado desde la interfaz: apagar el interruptor alcanza.

## 2026-10-12 — La empresa se escribe sólo por RPC; sus tablas son de sólo lectura

**Contexto:** `ajustes_empresa`, `monedas`, `tipos_cambio` e `integraciones` se editaban con
`.update()` bajo RLS. El grant de tabla dejaba escribir a mano `moneda_base`, `registro_abierto` y
`actualizado_por`, no había control de versión y nada impedía dos tipos de cambio por defecto.
**Decisión:** se quitaron las policies de escritura y cada edición pasa por una RPC DEFINER
(`…001200_empresa.sql`): comprueba el permiso, compara `actualizado_en` (`PT409`), sella quién
cambió y aplica lo que un CHECK no expresa (la moneda base no cambia con datos cargados; un solo
tipo por defecto entre dos monedas; apibara no se activa sin su clave). Los ajustes viajan como
`jsonb` porque ahí «no tocar» y «vaciar» son cosas distintas; el resto, con parámetros opcionales.
**Alternativas:** `.update().eq('actualizado_en', …)` como en `perfiles` (cero filas no distingue
un conflicto de una falta de permiso, y la guarda de la moneda base quedaba sólo en la interfaz).
**Consecuencia:** una columna editable nueva de `ajustes_empresa` se suma a la lista de la RPC, no
a un grant. Nada de esto se borra desde la app: monedas y tipos de cambio se desactivan.

## 2026-10-12 — El color de la marca se acepta si el texto de un botón se lee sobre él

**Contexto:** se pedía rechazar un color que no diera contraste AA «en claro y oscuro». El relleno
(`--color-primario`) es el mismo en los dos temas, así que exigirle contraste contra las dos
superficies a la vez es imposible: lo que es legible sobre blanco no lo es sobre casi negro.
**Decisión:** se rechaza el color sobre el que el texto de un botón no llega a 4,5:1 ni en blanco
ni en la tinta oscura (un rojo puro, por ejemplo); el que mejor dé pasa a ser
`--color-sobre-primario`, que deja de ser blanco fijo. El texto en el color de la marca (`-ink`)
se deriva por tema, oscureciendo o aclarando hasta llegar a AA sobre su superficie. El rechazo
dice cuánto da y propone el tono más cercano que sí sirve. Entra por un `<style>` y no por
`<html style>`: un estilo en línea le ganaría al bloque `.dark`, y el layout raíz es estático.
**Alternativas:** exigir además 3:1 del relleno contra las dos superficies (deja una franja de
tonos tan angosta que ni el color neutro del producto pasa).
**Consecuencia:** negro, azul marino y amarillo se aceptan. En una carga completa, el esqueleto
del marco sale con el color neutro un instante antes de que llegue el de la empresa.

## 2026-10-12 — Íconos: dibujados en el navegador, guardados en Storage, servidos por el manifest

**Contexto:** «Regenerar íconos» tenía que salir del logo. `sharp` es sólo una dependencia
transitiva de Next y el layout raíz, que lleva los `<link rel="icon">`, es estático.
**Decisión:** se dibujan con Canvas (cero dependencias, como las fotos), se muestran y recién al
confirmar se suben a `marca/iconos/<hash>.png`; las rutas van a `ajustes_empresa.iconos`.
`manifest.ts` lee los ajustes y declara esas direcciones, que cambian en cada regeneración. Los
`<link>` apuntan a `/iconos/vigente/<tamaño>`, que redirige al de Storage o al neutro. El fondo se
elige (color de la marca o blanco): un logo del color de la marca no se ve sobre ese color.
**Alternativas:** `generateMetadata()` en el layout raíz (con Cache Components rompe las rutas
estáticas, como `/_not-found`); `sharp` en el servidor (una dependencia más y una subida desde el
servidor que hoy no existe); un route handler que los dibuje en cada pedido (sin hash en la
dirección, el navegador no se entera del cambio).
**Consecuencia:** el título de la pestaña y `favicon.ico` siguen neutros. En iOS, una PWA ya
instalada no cambia de ícono hasta que se reinstala; en Android cambia sola, con días de demora.

## 2026-10-12 — Empresa es una pantalla con pestañas; cada formulario lleva de `key` lo que edita

**Contexto:** hay dos permisos de empresa y ninguno de «ver»: quien tiene uno lee todo. Y los
ajustes son una sola fila que editan dos cosas distintas (el formulario y los íconos).
**Decisión:** una ruta, `/configuracion/empresa`, con la pestaña en la URL (`?seccion=`). Entra
quien tiene cualquiera de los dos permisos y ve deshabilitada, con el motivo, la parte que no
puede editar. La versión de la fila llega por props, y cada formulario lleva de `key` una huella
de lo que él muestra (`huellaDelFormulario()`): arranca de lo guardado cuando eso cambia (lo
guardó esta persona u otra), sin estado local de versión que mantener.
**Alternativas:** tres secciones en el hub (cada una se esconde sin su permiso: no hay dónde
mostrar «ves pero no editas»); `key={actualizadoEn}` (se probó: regenerar los íconos o prender una
integración, que tocan la misma fila, reiniciaban el formulario de al lado y borraban lo tipeado);
sin `key` (al volver a la pantalla, Next conserva el formulario viejo con la versión nueva, y
guardar pisaría sin conflicto lo que otra persona cambió).
**Consecuencia:** al guardar, los bloques vuelven a su estado inicial (el secundario se pliega).
El borrador de `sessionStorage` guarda sólo lo que la persona cambió, no el formulario entero:
reponerlo todo revertiría en silencio lo que otra guardó mientras tanto.

## 2026-10-12 — Un logo no pasa por la compresión de fotos

**Decisión:** el SVG se sube tal cual (hasta 200 KB; se rechaza si trae código, contenido
incrustado o no dice cuánto mide). Un raster va tal cual si su lado mayor no pasa de 1024 px; si
pasa, se reduce a PNG, sin pérdida y con su transparencia. Tope de lo que se sube: 1 MB.
**Alternativas:** `comprimirImagen()` como una foto (WebP con pérdida: ensucia los bordes de un
logo plano y convierte un SVG en una imagen).
**Consecuencia:** `comprimirImagen()` acepta el formato de salida. «Retenciones», que el plan
nombraba sin definir, son `papelera_dias` y `actividad_dias` (`docs/PRODUCTO.md`).

## 2026-10-12 — Toda RPC de edición exige la versión: un nulo se rechaza

**Contexto:** `_rol_para_editar()` y `_exigir_version()` saltaban el control con la versión nula
«para el seed y las pruebas», y las tres RPC de roles llevaban `default null`. Quien olvidara mandar
la versión pisaba en silencio lo que otra persona había cambiado, y nada en los tipos lo avisaba.
**Decisión:** `p_actualizado_en_esperado` es obligatorio y un nulo se rechaza con un mensaje legible
(`…001300_version_obligatoria.sql`). En las RPC de roles pasa antes de `p_origen` y `p_alcance`:
Postgres exige que lo que sigue a un parámetro con default también lo tenga. Las pruebas de humo
pasan la versión real. La regla quedó en `.claude/rules/migraciones.md` y `datos.md`.
**Alternativas:** dejar el nulo para las pruebas (un control que se salta en la prueba no está
probado); sólo rechazarlo en el helper y mantener el default (el tipo generado seguía diciendo
«opcional»).
**Consecuencia:** el parámetro es obligatorio en `database.types.ts` y `typecheck` caza al llamador
que lo omite. Crear una fila no lleva versión: no hay nada que versionar.

## 2026-10-12 — Orígenes, campos y categorías se escriben sólo por RPC, con versión por fila

**Contexto:** las tres tablas se editaban con `.update()` bajo RLS: sin control de versión, sin
regla sobre lo que ya tiene datos y con un `INSERT` del origen que dependía de que la interfaz no
duplicara lo que los triggers ya crean. Campos y categorías no tenían `actualizado_en`.
**Decisión:** `origenes`, `origenes_campos` y `categorias` son de sólo lectura; cada operación es una
RPC con permiso, versión y sus reglas (`…001400_origenes.sql`). Campos y categorías ganan su
`actualizado_en`: editar una fila sólo choca con otra edición de **esa** fila. Ordenar toma el
origen entero `FOR UPDATE` y renumera 10, 20, 30… tocando sólo las filas que cambian. Crear un origen
es un solo `INSERT`: sus triggers (flujo, reglas, campos) corren en la misma transacción, así que no
queda uno a medias. El nombre del origen y el de una categoría no se repiten sin importar
mayúsculas ni espacios (índice único; en categorías, con el padre nulo bajo una constante).
**Alternativas:** la versión del origen como versión de su layout (dos personas editando campos
distintos chocarían siempre); un `UNIQUE` común en categorías (los nulos no chocan: dos raíces con el
mismo nombre pasaban).
**Consecuencia:** el layout editado por dos personas a la vez sólo avisa si tocan lo mismo; reordenar
sí conflictúa con otro reordenamiento. Un campo o categoría nuevo no necesita versión.

## 2026-10-12 — Un origen con uso se desactiva; sólo uno sin uso se elimina

**Contexto:** un origen cuelga de vehículos (`restrict`), cotizaciones (`restrict`), un flujo, una
fórmula, categorías, campos y concesiones de roles (`cascade`). Eliminarlo con datos rompe fichas y
cotizaciones; dejarlo para siempre estorba al dar de alta.
**Decisión:** desactivar (`activo = false`) siempre se puede y es reversible: se hace y sale
«Deshacer». Deja de ofrecerse y un trigger le impide recibir vehículos y cotizaciones nuevos; sus
fichas se siguen viendo y la matriz de roles lo sigue listando, marcado «inactivo». Eliminar sólo
vale sin vehículos (papelera incluida), cotizaciones ni fórmula publicada; es irreversible y pide
tipear el nombre porque la cascada (campos, categorías, flujo, borrador, concesiones) no se ve. Con
uso, el botón sale apagado y dice qué lo ata («tiene 12 vehículos y 3 cotizaciones: desactívalo»).
**Alternativas:** archivar con una fecha (otra columna que significa lo mismo que `activo`);
bloquear toda baja (un origen creado por error quedaba para siempre); cascada con confirmación (se
llevaba vehículos y cotizaciones).
**Consecuencia:** desactivar el último origen activo deja el alta sin dónde caer (se avisa, no se
bloquea). Antes de que haya vehículos, un origen equivocado se elimina y se vuelve a crear.

## 2026-10-12 — Un campo con datos no cambia de tipo ni se elimina: se desactiva

**Contexto:** los valores de un campo viven en `vehiculos.atributos`. Cambiar el tipo de uno con
datos deja valores que ya no son de ese tipo, y `vehiculo_validar_atributos` sólo mira al escribir
el vehículo: el dato malo aparecería recién cuando alguien lo edite.
**Decisión:** la regla vive en la base y la pantalla la cuenta antes (`origen_campo_impacto`, que
incluye la papelera). **Quitar** es desactivar: el dato queda y reactivar lo devuelve (reversible,
«Deshacer»). **Eliminar** sólo un campo propio sin ningún valor. **Cambiar el tipo** sólo con 0
vehículos con valor; el de un campo de sistema no cambia nunca. **Volver requerido** se permite con
aviso («2 vehículos no tienen este dato: no podrán guardarse hasta completarlo»): no toca
vehículos. **Sacar una opción en uso** se permite con el conteo por opción: el valor se conserva. El
aviso va dentro del panel del campo, no en un diálogo: un modal no abre otro modal.
**Alternativas:** convertir los valores al cambiar el tipo (reescribir datos sin que nadie lo vea);
bloquear también «volver requerido» (impide ordenar el layout antes de cargar datos).
**Consecuencia:** para «cambiar» el tipo de un campo con datos hay que desactivarlo y crear otro. Un
campo desactivado sigue ocupando su clave: no se puede crear otro con ella.

## 2026-10-12 — El tipo de un origen (subasta o manual) no cambia

**Contexto:** el tipo decide, sólo al insertar, los campos preconfigurados, la regla `aduana` del
flujo y el mapeo `clave_apibara`. Cambiarlo después dejaría un origen con la mitad de cada mundo.
**Decisión:** no se edita: la RPC no lo recibe y un trigger `before update of tipo` lo impide para
cualquier escritor. El alta muestra qué trae cada tipo (espejo `entities/preconfiguraciones.ts`,
comparado por un test con el SQL de los triggers). Un origen equivocado y todavía sin uso se elimina
y se crea de nuevo. `clave_apibara` y `apibara_plataformas` sólo existen en subasta (RPC y trigger).
**Alternativas:** re-preconfigurar al cambiar (borra y vuelve a crear campos de sistema con datos
posibles, y decide si `aduana` se apaga con fases ya armadas); permitirlo sólo sin uso (dos caminos
para lo mismo: ya existe eliminar y crear).
**Consecuencia:** acierta o se rehace: por eso la decisión de eliminar «sin uso» va con ésta.

## 2026-10-12 — Nombre, sustantivo y género: tres datos de la fila y reglas puras

**Contexto:** `docs/UX.md` pide que ningún texto fijo nombre un origen, y la interfaz necesita
concordar («ninguna unidad en Corea todavía»). El esquema ya tiene `nombre`, `sustantivo` y `genero`.
**Decisión:** un formulario con tres campos: el nombre, cómo se llama lo que entra por ahí (con
sugerencias, libre) y su género, que acompaña al sustantivo mientras la persona no lo elige. Debajo,
la frase con la concordancia a la vista. Las reglas son puras y salen por `client.ts`
(`claveDeNombre`, `generoSugerido`, `pluralDe`, `contados`, `frasePorVacio`) para que cualquier
pantalla las use sin repetirlas. La clave sale del nombre en el servidor, una vez.
**Alternativas:** plural editable (una columna más sin necesidad todavía); género de un
diccionario cerrado (obliga a programar cada sustantivo nuevo).
**Consecuencia:** el esquema no tiene plural: `pluralDe()` es una regla (vocal → s, consonante → es,
z → ces, -ón → -ones). Si falla en un caso real, la salida es una columna `sustantivo_plural`.

## 2026-10-12 — El orden se cambia con botones y por movimiento relativo, no arrastrando

**Contexto:** reordenar el layout de campos y las categorías no puede depender de arrastrar: no
funciona con teclado ni bien en el celular, y arrastrar exige una dependencia (dnd-kit) que
`CLAUDE.md` pide verificar el día que se agrega.
**Decisión:** «Subir» y «Bajar» por fila, con `aria-label` del campo y apagados en los extremos con
el motivo. La RPC recibe «después de X» (nulo = primero) y no una posición: si otra persona agregó un
campo entre tanto, queda junto al vecino que se eligió. `destinoDeMovimiento()` lo calcula sobre el
origen entero (desactivados incluidos) pero sólo se mueve dentro del grupo; cambiar de grupo es
editar `grupo`, y lo manda al final del grupo nuevo.
**Alternativas:** posición numérica (con un campo nuevo entre tanto, queda en otro lugar sin
avisar); arrastrar con una dependencia nueva (queda sumable: la RPC ya admite «después de X»).
**Consecuencia:** mover un campo muy lejos cuesta varios toques. El arrastre es una mejora de
interfaz que no toca la base.

## 2026-10-12 — Quién abre Configuración › Orígenes: sin `origenes.ver`

**Contexto:** el esquema sólo tiene `origenes.gestionar`, y la lectura de las tres tablas es `true`
para toda cuenta (los selectores y las fichas la necesitan). Quien configura el flujo o la fórmula
de un origen necesita ver cómo está armado.
**Decisión:** entra quien tiene `origenes.gestionar` y, de sólo lectura (todo deshabilitado con el
motivo), quien tiene `flujos.configurar` o `cotizaciones.configurar`. El resto ve «No tienes permiso»
y la tarjeta no aparece en el hub. No se crea `origenes.ver`: sin enforcement no hay permiso, y
restringir el `select` rompería los selectores de todos. Contar vehículos por origen y por categoría
pide uno de esos tres permisos (`origenes_resumen()`).
**Consecuencia:** una cuenta sin esos permisos sigue pudiendo leer `origenes` por la API; es lo que
ya pasaba y lo que necesita el resto de la aplicación.

## 2026-10-13 — FilterShell vive en `shared`; las vistas guardadas las posee `equipo`

**Contexto:** el inventario necesita filtros en la URL, chips, panel lateral y hoja inferior, y lo
mismo van a necesitar leads y cotizaciones. Las vistas guardadas están en una tabla de `equipo`.
**Decisión:** `shared/lib/filtros` (el esquema declarativo, la lectura tolerante de la URL, los
chips) y `shared/ui/filtros` (`<FilterShell>`), sin importar ningún módulo: cada listado arma su
esquema en `entities/` y se lo pasa. La lectura no usa nuqs (`nuqs` a secas es `'use client'` y la
página la corre en el servidor): todas las claves son texto y `leerFiltros()` decide qué significan,
igual en las dos partes. Las vistas son de `equipo`: `leerVistas(pantalla)` por `index.ts` y
`<MenuDeVistas>` por `client.ts`; el listado lo monta en un hueco del FilterShell. Una vista guarda
parámetros de URL, así que `equipo` no conoce los filtros de nadie.
**Alternativas:** FilterShell dentro de `vehiculos` (leads lo importaría de otro módulo); las vistas
en `shared` (una lectura con reglas va en `infra/` de un módulo, y la tabla ya tenía dueño); parsers
tipados de nuqs por filtro (tipos heterogéneos por un mapa que se arma en ejecución, y dos lectores).
**Consecuencia:** un listado nuevo declara su esquema y suma su pantalla a `RUTA_DE_PANTALLA`. Una
vista de un origen que la persona ya no ve no se lista; un filtro que dejó de existir se ignora solo.

## 2026-10-13 — Un solo esquema Zod, armado desde el layout, valida en el navegador y en el servidor

**Contexto:** los campos de un vehículo dependen del layout de su origen: no hay un schema fijo que
poner en `schemas/`, y el trigger de la base valida tarde, de a un error y sin conocer las opciones.
**Decisión:** `esquemaDeVehiculo(fuentes)` (en `vehiculos/entities/esquema.ts`) arma un `z.object`
con los datos comunes y un validador por tipo de campo. El formulario lo usa antes de enviar; la
Server Action recibe el estado del formulario, **vuelve a leer el layout** y usa la misma función.
Los motivos vuelven por campo en un resultado propio (`porCampo`): `returnValidationErrors` sólo
aplana un nivel. La base es la última línea y dice en `hint` qué campo frenó el guardado. Una opción
que se sacó del campo, o una categoría desactivada, siguen valiendo mientras el vehículo las tenga.
`origenes_campos` gana `valor_defecto`, que sólo precarga el alta.
**Alternativas:** confiar en el trigger (errores tardíos); guardar un JSON Schema en la base (otra
fuente que mantener igual al layout); mandar al servidor el dato ya convertido (el servidor tendría
que confiar en la conversión del navegador).
**Consecuencia:** un tipo de campo nuevo se suma en `ESQUEMA_POR_TIPO`, `CONTROL_DE_TIPO`,
`LECTOR_POR_TIPO` y `FILTRO_POR_TIPO`: son `Record<TipoDeCampo, …>` y no compilan si falta uno.
`entities/` no importa otros módulos: declara la forma de campo que necesita y recibe el de `origenes`.

## 2026-10-13 — Filtros sobre `atributos` por PostgREST, keyset y policy de InitPlan; el GIN no cuenta

**Contexto:** hay que filtrar por atributos dinámicos y paginar con eficiencia. Se daba por hecho
que las policies eran de InitPlan y que el GIN de `atributos` servía a los filtros.
**Decisión:** una consulta por página, siempre de un origen. Opciones y sí o no por contención
(`@>`), números por rango sobre `atributos->clave`, fechas como texto ISO, texto con `ilike`; la clave
sale del layout, nunca de la URL, y todo texto de la persona pasa por `citar()` o `patronContiene()`.
Keyset `(creado_en, id)` con índice propio (`vehiculos_origen_listado_idx`). La policy de lectura se
reescribió: `origen_id = any ((select origenes_con_alcance(…))::uuid[])` es InitPlan; la anterior,
`(select alcance_de('x', origen_id))`, corría por fila. Una prueba de humo lo comprueba con `EXPLAIN`.
**Lo que se encontró:** bajo RLS, `@>` e `ilike` no son `leakproof` y Postgres no los evalúa antes
que la policy: ni el GIN ni los trigram se usan. La consulta camina el índice del listado, filtra y
corta. En `atributos` nunca se guarda un `null` (entraría en todo «hasta N»).
**Alternativas:** una función `definer` de búsqueda desde el primer día (ahí el GIN sí entra, pero el
permiso queda en dos lugares antes de saber si hace falta); una tabla EAV; `offset`.
**Consecuencia:** alcanza para miles de vehículos por origen. Si un origen pasa de decenas de miles y
un filtro poco selectivo se siente, el listado pasa a esa función `definer`. Los planes se midieron
con la tabla vacía: hay que volver a mirarlos con datos reales.

## 2026-10-13 — Vehículos se escriben sólo por RPC; el alta entra a la única fase inicial

**Contexto:** no había RPC de alta ni de edición. El `INSERT` directo dejaba poner `fase_id` y
`publicado_web` (el grant por columna sólo cubría el `UPDATE`) y editar no comparaba versión. Ningún
trigger ponía la fase inicial, y quien carga un vehículo no suele tener `flujos.mover`.
**Decisión:** la tabla queda de sólo lectura y se escribe por `vehiculo_crear(p_id, p_origen,
p_datos)` y `vehiculo_guardar(p_vehiculo, p_actualizado_en_esperado, p_datos)`, con una lista cerrada
de claves. El `id` del alta lo genera el navegador: reintentar no duplica. Al nacer, el vehículo entra
a la fase inicial **sólo si no hay nada que decidir** (una sola inicial activa, sin nota obligatoria,
sin requisitos bloqueantes pendientes, sin roles que excluyan a quien crea), con su fila en
`historial_fases`; si no, nace «Sin fase». Es la segunda y última escritura de `fase_id`. El conflicto
dice quién y cuándo, sacado de `actividad`; guardar lo ya guardado no es conflicto. Un origen
desactivado conserva y deja editar lo suyo, pero no recibe altas.
**Alternativas:** `INSERT` con grant por columna (deja la fase y la versión del lado de la app);
`.update().eq('actualizado_en', …)` (cero filas no distingue conflicto de falta de permiso); una
columna `actualizado_por` (la auditoría ya lo sabe); dejar siempre la fase en nulo (lo que carga un
asesor no aparecería en la cadena hasta que otra persona lo ubique).
**Consecuencia:** `lead_id`, `subasta_*` y `apibara_*` quedaron sin escritor: el vínculo y apibara
traen su RPC. Cualquier escritura sobre la fila (mover de fase) mueve la versión, y quien edita la
ficha en ese momento ve un conflicto: pierde un clic, no pisa nada.

## 2026-10-13 — Campos sensibles: el esquema no los resuelve, y el inventario no muestra costos

**Contexto:** se pedía respetar los campos sensibles (costos) en el listado y la ficha.
**Decisión:** no hay marca de «sensible» en `origenes_campos` ni permiso de costos de vehículos, y RLS
no esconde columnas ni claves de un jsonb. Nada de lo que muestra el inventario es un costo
(`vehiculos.precio` es precio de lista; los `moneda` del layout son datos de la subasta), así que no
se inventó un control. Todo monto pasa por `<Monto>` (Modo Live). Los costos reales (gastos, pagos,
margen) llegan con logística, ya protegidos por `logistica.gastos.ver`, `.pagos.ver` y `.margen.ver`.
**Alternativas:** una columna `sensible` y esconder el campo en la interfaz (no protege nada: el dato
viaja igual en `atributos`).
**Consecuencia:** el día que haga falta ocultar un campo del layout, es esa columna **más** una vista
o RPC que recorte `atributos` (como `leads_vista`), con su permiso sembrado en la misma migración.
**Actualización (2026-10-14):** para los leads ese día llegó: ver «Los privados se recortan al leer».
Vehículos sigue sin marca de sensible.

## 2026-10-13 — Un VIN repetido bloquea, y se dice junto al campo

**Contexto:** la ficha decía «un VIN repetido avisa, no bloquea». `vehiculos_vin_unico` es UNIQUE
entre los vehículos vivos y global, no por origen; fue una decisión del 10-11 (por eso el VIN es
columna y no atributo).
**Decisión:** se respeta el índice. La RPC lo detecta antes y responde con el VIN y `hint = 'vin'`; el
lote se frena también con la plataforma vacía, que el índice deja pasar.
**Consecuencia:** puede chocar con un vehículo de un origen que la persona no ve: el mensaje dice que
existe, no cuál. Si eso molesta, la salida es hacer el índice por origen.

## 2026-10-13 — Los e2e del inventario no piden el equipo vacío

**Contexto:** los e2e existentes exigen la base local sin personas ajenas (`pnpm db:reset`), porque
prueban que la primera persona nace dueña. Resetear borra la cuenta de quien está usando la app local.
**Decisión:** `e2e/soporte/inventario.ts` crea sus personas como invitadas con un rol de prueba que
tiene los permisos de vehículos, y limpia sólo lo suyo (orígenes `e2e_…`, cuentas `@e2e…`, roles «E2E …»).
**Consecuencia:** se pueden correr mientras alguien usa la app local. `pnpm test:e2e` entero sigue
necesitando el reset por los otros specs.

## 2026-10-13 — Las fotos van a un bucket público, cada una en la carpeta de su vehículo

**Contexto:** había que decidir bucket público o privado, la ruta, y qué pasa con las policies cuando
la misma foto la usan dos vehículos de orígenes distintos. La policy que había dejaba a `anon` listar
el bucket entero (ids de vehículos y fotos de lo no publicado) y a quien edita borrar objetos.
**Decisión:** bucket `vehiculos` público, ruta `<vehiculo_id>/<sha-256 del contenido>.<webp|jpg>`.
Subir exige `vehiculos.editar` sobre el vehículo de la carpeta; listar, `vehiculos.ver` (sólo con
sesión); borrar y pisar, nadie desde la app. La misma foto en dos vehículos son dos objetos, y la
base rechaza una fila cuya ruta no empiece por su propio vehículo.
**Alternativas:** bucket privado con URL firmada (la firma cambia en cada lectura: ni el navegador ni
el CDN cachean, y la vitrina necesita URL pública igual); un objeto por hash compartido entre
vehículos (ahorra ~0,3 MB cuando ocurre, pero un objeto compartido no tiene origen: su policy sólo
podría decir «edita vehículos en algún lado», y borrar en uno dependería del otro).
**Consecuencia:** storage se limita por origen igual que las tablas. La foto de un vehículo no
publicado es alcanzable por quien tenga su URL (uuid + SHA-256, no adivinable): lo confidencial va a
`documentos`, que es privado. Para fotos de vehículos el refcount vale 0 o 1 (2 si la foto es tan
chica que su miniatura es el mismo objeto): es la red de la limpieza, no un mecanismo de compartir.

## 2026-10-13 — Dos tamaños por foto, hechos en el navegador; sin optimizador

**Contexto:** el listado muestra la portada en un hueco de 56 a 96 px y había una sola ruta, la de
1600 px. El egress de Storage se cobra, las transformaciones de imagen de Supabase también (por
imagen de origen), y el optimizador de Next volvería a bajar cada foto desde Supabase.
**Decisión:** el navegador decodifica el archivo una vez y genera la completa (≤ 1600 px) y la
miniatura (≤ 480 px), con nombre por hash y caché de un año. El listado, la cabecera y la grilla
cargan sólo miniaturas, con `<Image unoptimized loading="lazy">`; la completa se abre aparte. La
miniatura se genera al elegir el archivo y es la vista previa.
**Alternativas:** un solo tamaño (una página de 50 filas pesaría ~15 MB en vez de ≤ 2 MB);
tres tamaños con `srcset` (el más chico ahorra unos KB por fila y suma un objeto y una columna);
transformaciones de Supabase o el optimizador de Next (se pagan y no hacen falta: ya llega chica).
**Consecuencia:** 480 px sobra en el listado y alcanza para la tarjeta de la vitrina. Safari no
codifica WebP en un canvas y devuelve PNG sin avisar: se mira el tipo del blob y ahí se usa JPEG.
Eso no lo cubren los e2e (corren en Chromium): hay que probarlo a mano en un iPhone.

## 2026-10-13 — Las fotos tienen su propia versión, aparte de la de la ficha

**Contexto:** reordenar, fijar portada y eliminar necesitan una versión para dar `PT409`. La del
vehículo estaba a mano, pero cualquier escritura la mueve: subir fotos desde el celular le daría un
conflicto a quien tiene la ficha abierta en el escritorio (la misma deuda de «mover de fase»).
**Decisión:** `vehiculos_imagenes_version (vehiculo_id, actualizado_en)`. Las tres RPC de edición la
mandan; agregar no lleva versión (sumar no pisa a nadie y es idempotente por hash). Su fila es además
el candado que ordena las operaciones sobre las fotos de un vehículo: el tope de 24 se cuenta con
ella bloqueada. La versión se pone con la hora del reloj, no con la de inicio de la transacción.
**Alternativas:** la versión del vehículo (conflictos falsos entre quien sube fotos y quien edita
datos); una columna en `vehiculos` (el trigger genérico mueve `actualizado_en` igual, y `auditar`
anotaría cada foto como un cambio del vehículo); comparar el conjunto de ids (detecta altas y bajas,
no dos reordenamientos).
**Consecuencia:** un conflicto de fotos dice «<quién> cambió las fotos de este vehículo»: el quién
sale de `actividad`, donde cada operación de fotos deja su registro. Una tabla más, de una fila
por vehículo con fotos.

## 2026-10-13 — La limpieza de Storage reclama antes de borrar; la función queda para la parte 4

**Contexto:** `quitarSiHuerfano()` cuenta referencias y después borra, desde el navegador: entre las
dos cosas puede nacer una fila (deshacer un eliminar, volver a subir la misma foto) que queda
apuntando a nada. La cola existía pero sólo la llenaba la purga y no tenía estados.
**Decisión:** nadie borra objetos de `vehiculos` desde la app. Eliminar una foto borra la fila y
encola sus rutas. La limpieza **reclama** antes de borrar: con el candado consultivo del objeto
tomado recuenta, y sólo si da 0 lo marca `reclamado_en`; sólo se borra lo reclamado, y sólo lo que
lleva 24 h en la cola. Toda fila nueva pasa por un trigger que toma el mismo candado: si el objeto
está reclamado no nace (reintentable), y si sólo estaba en la cola lo saca. El mismo trigger exige
que los dos objetos existan. Lo que se subió y no llegó a tener fila lo encola un barrido en SQL.
La edge function `storage-gc` (un bucle sobre reclamar y confirmar) no se construye ahora.
**Alternativas:** bloquear la fila de la cola en vez del objeto (un objeto puede no estar todavía en
la cola cuando alguien lo referencia); borrar desde SQL (`delete` sobre `storage.objects` deja el
archivo en el disco); que el navegador avise qué descartar (no avisa si se cierra la pestaña);
construir la función ya (no hay proyecto en la nube, ni `pg_cron`, ni forma de dejarla en verde).
**Consecuencia:** una fila de foto nunca apunta a un objeto borrado; el peor caso es un «vuelve a
intentarlo». Hasta la parte 4 nada se borra de Storage: cada foto eliminada deja ~0,35 MB.
`marca` y `avatares` siguen con `quitarSiHuerfano()`: tienen un solo dueño y la ventana no les pega.

## 2026-10-13 — Una foto se valida decodificándola, y se reconoce por el hash del archivo original

**Contexto:** qué formatos entran, qué pasa con un HEIC, cuánto puede pesar un archivo y cómo se
detecta «la misma foto».
**Decisión:** el selector ofrece `image/*` (así un iPhone entrega sus HEIC como JPEG). Lo que no
declara ser imagen se rechaza sin abrirlo; lo demás se intenta decodificar, y si no se puede se dice
(con un mensaje propio para HEIC). Tope de entrada: 25 MB por archivo. La misma foto se detecta por
el SHA-256 del **archivo que eligió la persona** (`vehiculos_imagenes.hash`, único por vehículo).
**Alternativas:** validar por extensión (miente en los dos sentidos); un decodificador HEIC en wasm
(1 a 2 MB para un caso que iOS ya resuelve); detectar el duplicado por el hash del WebP (cambia de
un navegador a otro, y de WebP a JPEG).
**Consecuencia:** los motivos se dicen en la bandeja, antes de subir, y sus textos viven en un solo
lugar (`entities/seleccion-de-fotos.ts`). Dos copias de la misma foto con distintos bytes (una
reenviada por WhatsApp) cuentan como dos fotos.

## 2026-10-13 — Vínculo e interesados: RPC y lectura ahora, interfaz con leads

**Contexto:** el vínculo y los interesados dependen de `leads`, que llega en la Fase 3: `vehiculos`
no puede importar una API que no existe. Y `vehiculos.lead_id`, que con alcance «propios» da ver y
editar, había quedado sin escritor.
**Decisión:** en la parte 3, las RPC (`vehiculo_vincular` con la versión del vehículo;
`vehiculo_interesado_marcar` y `_quitar`, idempotentes y sin versión porque no editan nada), dos
funciones de lectura que corren con la RLS de quien llama y devuelven el nombre del lead sólo si lo
ve, y un bloque de sólo lectura bajo la ficha. La interfaz que escribe llega en la Fase 3, se muestra
en la ficha del lead y **vive en `vehiculos`**, compuesta por `app/`. «Editar» deja de copiar la
regla: `vehiculos_editables(ids)` le pregunta a la base por lo vinculado a un lead de la cartera.
**Alternativas:** embeber `leads(nombre)` por PostgREST desde `vehiculos` (lee una tabla de otro
módulo); poner la interfaz de escritura en `leads` (`vehiculos` depende de `leads` por
`<SelectorLead>`: sería un ciclo); traer toda la cartera al servidor para decidir «Editar» (no tiene
cota).
**Consecuencia:** hay tres RPC sin interfaz hasta la Fase 3; las cubre el humo. Desvincular un
vehículo con una cotización final no se frena todavía (el portal del cliente deja de mostrarlo): se
decide cuando exista el botón.

## 2026-10-13 — En plpgsql un permiso se pregunta con `puede_*()`, no con un `if` sobre `in (…)`

**Contexto:** `vehiculo_guardar` decidía el alcance «propios» con
`if not (creado_por = yo or lead_id in (select mis_leads()))`. Con `lead_id` nulo y la cartera no
vacía, `in` da nulo, el `if` no levanta y se editaba cualquier vehículo sin vínculo del origen. No
se veía porque en las pruebas nadie tenía leads.
**Decisión:** las RPC de vehículos comprueban con `puede_vehiculo(id, clave)`, que es la regla de las
policies y vive en un `where` (ahí un nulo es «no»). El humo lo prueba con una persona que tiene un
lead en su cartera.
**Consecuencia:** una sola regla para leer, escribir y dibujar. Lo mismo vale para las RPC de
leads y cotizaciones cuando se reescriban: se revisan con esta lupa.

## 2026-10-13 — La vitrina muestra identidad, precio público, campos públicos y la portada; nada más

**Contexto:** `web.vehiculos` exponía, además de los campos que el origen marcó como públicos, el
kilometraje, el lote, la fecha y el estado de la subasta, parte del VIN, el nombre interno de la
fase, si el precio es negociable, si acepta permuta y **todas** las fotos. Las columnas comunes no
tienen fila en `origenes_campos`: nadie las puede marcar ni desmarcar como públicas.
**Decisión:** la vista queda en `id, numero, origen, origen_nombre, titulo, marca, modelo, anio,
categoria, precio, precio_hasta, precio_nota, destacado, atributos, imagen, miniatura,
actualizado_en`. De las columnas comunes sale sólo la identidad; `atributos` trae sólo los campos
`publico_web` activos (y `{}`, no nulo, si no hay ninguno); de las fotos, la portada en sus dos
tamaños. Las filas no cambian: publicado, fuera de la papelera, fase activa que publica, origen
activo y visible, integración web activa.
**Alternativas:** dejar las diez columnas como estaban (el sitio todavía no existe para decir cuáles
necesita, y el lote más la fecha de subasta dejan encontrar el precio de martillo); una marca
«público» para las columnas comunes (es una pantalla de configuración nueva: va con el sitio).
**Consecuencia:** hoy no hay consumidor (el sitio es la Fase 8), así que achicar no rompe nada;
agrandar después es deliberado y columna por columna, con su razón acá. El tipado del sitio sale de
esta lista. Despublicar no revoca una URL de foto que alguien ya tenga: el bucket es público.

## 2026-10-13 — Una sola definición de lo público: el esquema `interno`

**Contexto:** la ficha tiene que mostrar «así lo verá el visitante» también antes de publicar, y el
listado, cuáles de los publicados se ven de verdad. Copiar la proyección o el `WHERE` de la vista en
una RPC o en TypeScript es la forma de que la vista previa mienta el día que la vista cambie.
**Decisión:** `interno.vitrina_vehiculos` proyecta **todo** vehículo vivo a lo público y calcula sus
cinco condiciones (`publicado`, `fase_publica`, `origen_activo`, `origen_visible`, `web_activa`) y
`visible`. `web.vehiculos` es esa vista `where visible`; `vehiculo_vitrina_previa()` devuelve su
fila sin las banderas; `vitrina_del_origen()` da las condiciones que no son del vehículo, y con ellas
el listado arma el filtro y el indicador. `interno` no se expone en PostgREST y ningún rol de la app
tiene `usage`.
**Alternativas:** la vista interna en `public` (toda relación nueva nace ahí con privilegios para
`anon`, y una vista sin `security_invoker` en un esquema expuesto es un error de los advisors); en
`web` sin grants (aparece en los tipos del sitio); una función que devuelva la proyección (no se
integra al plan: cada lectura del sitio recorrería todo el inventario).
**Consecuencia:** el humo compara la vista previa con la fila de `web.vehiculos` campo por campo.
Publicar no exige que la fase publique: la marca es del vehículo y la visibilidad se calcula, así
que existe el estado «publicado, no visible», y la interfaz tiene que decir por qué.

## 2026-10-13 — Publicar lleva la versión del vehículo y manda el estado entero

**Contexto:** `vehiculo_vitrina()` no llevaba versión ni bloqueaba la fila, y sus parámetros con
default pisaban el precio y la nota cuando alguien despublicaba sin reenviarlos.
**Decisión:** siete parámetros sin default, con `p_actualizado_en_esperado` obligatorio; exige
`vehiculos.vitrina` del origen **y** ver el vehículo; guardar lo ya guardado no es conflicto; el
precio nulo es «Consultar»; despublicar apaga el destacado.
**Consecuencia:** como toda escritura sobre la fila, publicar mueve la versión: quien tiene la ficha
abierta en edición ve un conflicto (la misma deuda que mover de fase).

## 2026-10-13 — Qué no va a la papelera, y que todo lo que entra se pueda purgar

**Contexto:** `papelera_enviar` sólo frenaba un vehículo con un comprobante **no anulado**; la FK de
`comprobantes` es `restrict` para cualquiera, y la purga borra en cascada pagos, gastos, documentos
y transportes. Un vehículo podía entrar a la papelera y no salir nunca, o salir llevándose dinero
registrado. Tampoco miraba el vínculo, la fase ni la vitrina.
**Decisión:** una sola lista (`_vehiculo_motivo_de_bloqueo`) para enviar y para purgar. **Bloquea:**
vínculo activo (es de un cliente y su portal lo muestra); estar fuera de la fase inicial (ya entró a
logística: sacarlo de la cadena no lo decide quien sólo tiene `vehiculos.eliminar`); cualquier
comprobante, pagos, gastos, una declaración aduanera vigente o un proyecto de repuestos vivo.
**Despublica y sigue** lo publicado (en la misma RPC; conserva el precio). **Sigue** con
interesados: se conservan y vuelven. Las cotizaciones del vehículo viajan con él, como antes.
**Alternativas:** avisar en vez de bloquear (el patrón de la papelera es «hacer y deshacer», sin
diálogo previo: un aviso llegaría después del hecho); permitir cualquier fase (hoy nadie llega a
otra fase sin `cambiar_fase`, así que bloquear no le cuesta a nadie; relajarlo en la Fase 6, con la
cadena a la vista, es seguro, y endurecerlo después dejaría vehículos en proceso ya en la papelera).
**Consecuencia:** para mandar a la papelera un vehículo vinculado hay que desvincularlo, y eso no
tiene interfaz hasta la Fase 3. La purga vuelve a preguntar: `cotizacion_marcar_final` puede
vincular un vehículo que ya está adentro.

## 2026-10-13 — Los vehículos tienen su papelera; el envío es por lote, con versión por vehículo

**Contexto:** `papelera_*` servía a leads, vehículos y cotizaciones con una función por operación:
sin versión, todo o nada, con el uuid en los mensajes y restaurando sólo el lote entero.
**Decisión:** `vehiculos_papelera_enviar(p_vehiculos jsonb)` recibe `[{id, actualizado_en}]`, va uno
por uno en su subtransacción y devuelve `enviados` y `rechazados` (con `codigo` y `motivo`, y el
título sólo de lo que quien llama ve). Un envío es un lote; si no pasa ninguno, no queda lote.
`lotes_papelera` gana `actualizado_en`, su versión: restaurar (y purgar) la mandan y aceptan el lote
entero o algunos de sus vehículos; el lote se cierra cuando no le queda nada. **Restaurar** vuelve
sin publicar —también con «Deshacer»— y deja pendiente, con el motivo, lo que choca con un VIN o un
lote de subasta que ya tomó otro. Lo hace quien envió el lote o quien tiene
`vehiculos.papelera.purgar`: no hay permiso nuevo. Las genéricas rechazan vehículos, por el tipo que
reciben y por el del lote.
**Alternativas:** reescribir las genéricas (las reglas de un vehículo —vínculo, fase, vitrina, VIN—
no son las de un lead; cada una se reescribe con su fase); una RPC de uno y otra de lote (dos
puertas para la misma regla); `p_actualizado_en_esperado` escalar (un lote no tiene una versión
antes de existir: la versión que protege es la de cada vehículo).
**Consecuencia:** la regla «toda RPC de edición lleva `p_actualizado_en_esperado`» se lee, para un
lote, como «cada elemento lleva su versión». `vehiculos.papelera.purgar` sigue siendo global y
gobernando también la papelera de leads y cotizaciones: se parte cuando lleguen sus fases.

## 2026-10-13 — La purga manual y la automática son la misma función

**Contexto:** `papelera_purgar` borraba el lote entero sin versión y sin mirar qué se llevaba la
cascada; encolaba sólo la foto completa (no la miniatura) y con 24 h de espera;
`papelera_purgar_vencidos` abortaba entera si un lote fallaba, y su job nunca se había programado:
`papelera_dias` no hacía nada.
**Decisión:** `vehiculos_papelera_purgar(p_lote, p_actualizado_en_esperado, p_vehiculos)` (con
`vehiculos.papelera.purgar`) y `papelera_purgar_vencidos()` (el job, sin sesión) llaman a
`_papelera_purgar_vehiculos()`, que vuelve a preguntar qué no se purga. La automática no puede
purgar lo que la manual bloquea: lo bloqueado se queda en la papelera, la lista dice por qué, y el
lote sigue abierto. Cada lote y cada vehículo van en su subtransacción. Se encolan las dos rutas de
cada foto y lo que haya quedado en la carpeta del vehículo, sólo lo que quedó sin referencia, y
**sin espera** (`encolado_en` retro-fechado, como ya hace el barrido de huérfanos): un vehículo
purgado no tiene «Deshacer». Documentos y adjuntos conservan las 24 h.
**Alternativas:** una columna `reclamable_en` (el barrido ya usa `encolado_en` como «desde cuándo
corre la espera»: una columna más para decir lo mismo); no filtrar por referencias al encolar
(reclamar recuenta igual, pero la cola se llenaría de lo que se sabe que no se va a borrar).
**Consecuencia:** la automática, por ahora, sólo purga lotes de vehículos: los de leads y
cotizaciones esperan las reglas de sus fases. Si alguien recreara un vehículo con el mismo id antes
de que corra la limpieza, lo que protege sus fotos es `storage_gc_rescatar()` bajo candado, no la
espera.

## 2026-10-13 — `storage-gc` se dispara desde la base y se autentica con un pase de un solo uso

**Contexto:** los archivos sólo se borran por la API de Storage, así que hace falta una función con
la service key y algo que la llame cada tanto. El contrato decía «secreto en Vault»; Vault quedó
para lo que el dueño edita desde la interfaz (decisión del 10-12), y un secreto de infraestructura
vive en el entorno de un despliegue. Pero quien llama es la base (`pg_cron` → `pg_net`), que no
tiene entorno: el secreto tendría que estar en Vault o en claro dentro de `cron.job`. Además
`pg_cron` y `pg_net` nunca se habían instalado: ningún job había corrido jamás.
**Decisión:** la base no guarda ningún secreto. `storage_gc_disparar(url)` crea un pase (uuid, un
uso, 10 minutos) y lo manda; la función lo canjea con `storage_gc_abrir()` usando la service key
que el runtime ya le inyecta, que es el único secreto en juego, y sin pase válido no hace nada
(`verify_jwt = false`). La migración instala las extensiones donde están disponibles y programa la
purga automática; `storage_gc_programar(url)` programa la limpieza cada hora y es el único paso
por despliegue, porque la dirección de la función no se conoce desde una migración. La función no
tiene dependencias: habla con PostgREST y Storage por HTTP.
**Alternativas:** `STORAGE_GC_SECRET` compartido (`supabase secrets set` + el mismo valor incrustado
en el job: queda en claro en `cron.job` y en cada fila de `cron.job_run_details`, y hay que rotarlo
en dos lados); Vault (descartado arriba; PGlite no lo trae); un cron de Vercel que llame a un route
handler (el cliente admin saldría de la edge function, y el despliegue todavía no existe);
dejar la función abierta (el barrido de huérfanos recorre el bucket: cualquiera lo dispararía).
**Consecuencia:** nada que sincronizar entre despliegues, y `cola_gc_pases` es la bitácora de las
corridas. `pg_cron` da por bueno un job que sólo encola un pedido: si la función deja de responder
no avisa, y por eso existe `storage_gc_pendiente()`. Deno queda fuera de lint y typecheck: a la
función la cubre el e2e. Los otros cuatro jobs de `…000800` siguen sin programar hasta sus fases.

## 2026-10-13 — Vitrina y papelera no suman permisos: los cuatro que había, todos con enforcement

**Contexto:** había que saber qué permisos existen para publicar, enviar, restaurar y purgar, y si
alguno no tenía enforcement en la base.
**Decisión:** ninguna clave nueva. **Publicar:** `vehiculos.vitrina`, por origen, en
`vehiculo_vitrina()`, que ahora exige además ver el vehículo. **Enviar:** `vehiculos.eliminar`, por
origen y con alcance, en `vehiculos_papelera_enviar()` (con `puede_vehiculo`, la regla de las
policies) y en `vehiculos_con_permiso()`, que es lo que le pregunta la interfaz para dibujar las
casillas. **Restaurar:** sin permiso propio: quien envió el lote, o quien purga. **Purgar y ver toda
la papelera:** `vehiculos.papelera.purgar`, global, en `vehiculos_papelera_listar/restaurar/purgar`
y en la policy de `lotes_papelera`. Las cuatro acciones tenían enforcement; lo que faltaba era la
versión, el resultado parcial y las reglas de qué no entra.
**Alternativas:** un `vehiculos.restaurar` (quien envió algo por error tiene que poder traerlo de
vuelta sin pedirle permiso a nadie; quien purga ya ve todo); `vehiculos.papelera.purgar` por origen
(hoy gobierna también la papelera de leads y cotizaciones, que no tienen origen: se parte con sus
fases).
**Consecuencia:** quien tiene `vehiculos.papelera.purgar` ve en la papelera títulos de orígenes
donde quizá no tiene `vehiculos.ver`. Es un permiso de administración, y así se describe en el
catálogo.

## 2026-10-14 — apibara: se guarda todo lo que devuelve, y cada dato normalizado es un campo

**Contexto:** el pedido era traer _todo_ lo que la API devuelve y dejar que el dueño decida después
qué no usar. Las 17 `clave_apibara` del preset eran suposiciones: ninguna calzaba con la respuesta
real (`drivetrain`, `title_code`, `location`…), y una clave plana no alcanza para los grupos
anidados (`vehicle_specs.engine.raw`). La respuesta de IAAI trae además `details`, el volcado de su
página (~450 hojas con `$id`, HTML y «You are not logged in»).
**Decisión:** dos capas. **La respuesta entera** en `vehiculos.apibara_raw` (tope 512 KB, que la base
repite), con `apibara_sync_en`. **Cada hoja normalizada** (106 campos con los 17 de siempre) es un
campo del origen con su ruta con puntos como `clave_apibara`, activo, sin tarjeta ni filtro y **no
público**: la vitrina es segura por defecto. El catálogo vive en `_apibara_catalogo()` y lo espeja
`catalogo-apibara.ts`, con un test que lo compara con el SQL y con las respuestas grabadas. Quedan
fuera de los campos (y siguen en el bruto): `details`, las listas, lo que caduca al minuto, los
duplicados, las clases CSS y lo que ya es columna. Los orígenes que existían reciben el catálogo
por migración (`origen_apibara_completar()`, idempotente); los cinco campos de opciones del preset
sin opciones pasan a texto, porque un valor de la API no calza con una lista vacía. Un dato nuevo
de la API **no crea un campo solo**: queda en el bruto y la pestaña Campos avisa, con «Agregarlos».
**Alternativas:** todo en `atributos` sin campo (el dueño no podría apagar nada ni verlo en el
layout); incluir `details` (580 campos, la mayoría ruido de una página de IAAI); crear el campo
solo al ver un dato nuevo (el alta es de un asesor y el layout, del dueño: un campo que aparece
solo mueve la versión de todo el origen).
**Consecuencia:** el formulario de alta de un origen de subasta tiene ~100 campos más (los grupos
secundarios nacen plegados). Un campo nuevo no rellena a los vehículos que ya estaban: se llena
desde su próximo refresco. `estado_subasta` pasó de texto libre a un enum (`abierta`, `en_vivo`,
`terminada`, `vendida`) que deriva la base del bruto: una sola regla para el alta, el refresco y la
limpieza que viene.

## 2026-10-14 — Refrescar no pisa lo que la persona editó: tres vías con el bruto anterior

**Contexto:** al volver a consultar cambian la puja, el estado y la fecha; pero un asesor pudo
corregir el título o el color a mano, y la API volvería a pisarlos.
**Decisión:** siempre se actualizan `apibara_raw`, `apibara_sync_en`, `subasta_en`, `subasta_fin_en`
y `estado_subasta` (son del sistema y nadie los edita). Del resto (columnas mapeadas y atributos con
ruta), `fusionarRefresco(previo, nuevo, actual)` compara tres cosas: si lo guardado es lo que la API
había dicho la vez anterior, la persona no lo tocó y toma el valor nuevo; si difiere, lo editó y se
conserva. Un dato que la API no cambió no se escribe ni se cuenta como conservado; uno que dejó de
traer no borra nada. El refresco lleva la versión del vehículo (`PT409` si alguien editó en el medio).
**Alternativas:** una columna con «qué editó la persona» (hay que mantenerla en cada edición, y
`vehiculo_guardar` no sabe de apibara); pisar siempre (pierde ediciones); no actualizar nada salvo
la puja (deja el vehículo con datos viejos).
**Consecuencia:** sin columnas nuevas. Un vehículo cargado a mano no tiene bruto anterior: el
refresco llena lo vacío y respeta lo escrito.

## 2026-10-14 — Las fotos de una subasta pasan por la tubería del navegador, en primer plano

**Contexto:** bajar 24 fotos por `/image-proxy` y dejarlas como las de la parte 3 (dos tamaños,
nombre por hash, registro idempotente). La clave sólo la tiene la edge function.
**Decisión:** la edge function descarga (sólo de `cs.copart.com` y `vis.iaai.com`: la clave no es un
proxy abierto) y devuelve los bytes; el navegador los pasa por `prepararFoto()` y `subirFoto()` y
registra con **una** llamada a `vehiculo_fotos_agregar`, que ahora guarda `origen_url`. Las primeras
24 imágenes (`full` en Copart, `large` en IAAI: ninguna pasa de 1600 px); la primera es la portada
sólo si el vehículo no tenía fotos; el video y el 360° quedan en el bruto. Cuesta ~1,4 s por foto sin
caché, de a tres (24 fotos en 10–15 s) y ~120 KB por foto cruzando la edge function (~3 MB de egress
por vehículo; con 500 altas al mes, ~1,5 GB frente a los 250 GB del plan Pro). **No se hace en
segundo plano en el servidor:** el aviso de progreso es de la pantalla y sigue aunque se cierre el
panel; si se cierra la pestaña, lo que falta se trae después con «Traer las que faltan».
**Alternativas:** generar los tamaños en el servidor (`sharp` o un codificador WebP en WASM dentro de
Deno: una dependencia y otra tubería, sin ganancia); una cola con un job con la service role (las
RPC de fotos piden `auth.uid()` y habría que duplicar el registro).
**Consecuencia:** a revisar con uso real si alguien carga decenas de lotes y cierra la pestaña en
el medio.

## 2026-10-14 — La llamada a apibara vive en la edge function y la hace el navegador

**Contexto:** `.claude/rules/acciones.md` decía «apibara en lote: encolar y procesar en
`supabase/functions/`», y `datos.md` prohíbe el cliente admin fuera de portal, webhooks, crons e
invitar. La clave está en Vault y `integracion_secreto()` sólo la entrega a `service_role`.
**Decisión:** la única que lee la clave es la edge function `apibara`, con la service key que le
inyecta el runtime. La llama el **navegador** con su sesión (`functions.invoke`), no una Server
Action: antes de leerla le pregunta a la base **como quien llama** `apibara_contexto(origen)` (si
está activa, a qué dirección, qué plataformas, y si esa persona puede crear o editar ahí). La
dirección sólo puede ser de `apibara.tech`. Los errores salen como valores (`{ ok: false, error: {
codigo } }`, siempre HTTP 200): apagada, sin permiso, entrada, plataforma, no soportado, no
encontrado, clave inválida, cuota, tiempo, proveedor. **Guardar** sigue siendo una Server Action
con RPC. El alta de varias líneas son consultas cortas de a dos con resultado por línea; con la
cuota agotada o la clave rechazada se deja de consultar. «Ver uso» (`/usage`) se pide a mano.
**Alternativas:** una Server Action que lea el secreto con el cliente admin (rompe la regla del
admin); encolar el lote (no hay dónde mostrar el resultado por línea y no es trabajo largo);
llamar a la API desde el navegador con la clave (nunca).
**Consecuencia:** la función se prueba cargándola en Node con un `fetch` simulado que responde con
lo grabado; el e2e la intercepta en el navegador y otro spec sólo toca la verdadera en los caminos
que no llegan a apibara. Ningún test llama a la API real.

## 2026-10-14 — «Subastas próximas en la ficha» es la subasta de ese vehículo

**Contexto:** `docs/PLAN.md` lo nombra y `docs/PRODUCTO.md` no lo define (sólo «subastas en un
calendario», de la Agenda, Fase 7). `GET /vehicles?upcoming=only` lista subastas de cualquier
vehículo, no las nuestras.
**Decisión:** el bloque «Subasta» de la ficha de un vehículo de subasta muestra su fecha en la zona
de la empresa con la cuenta regresiva, su estado, la puja y cuándo se consultó, con «Refrescar». Si
la hora pasó y el estado sigue «abierta», avisa que quedó vieja. No usa `/related` ni `upcoming`:
gastan cuota y la Agenda compondrá su calendario con `subasta_en`, que ya está indexada.
**Consecuencia:** `subasta_en`, `estado_subasta` y `apibara_sync_en` quedan en columnas con índices
parciales (`(estado_subasta, subasta_en)` y `(apibara_sync_en)`, sólo vivos): lo que necesita la
limpieza automática de la parte 6 sin tocar el bruto.

## 2026-10-14 — Migraciones sobre una base viva, y e2e que no exigen la base vacía

_Relajada, en propuesta, más abajo (2026-10-15): con `db:reset` disponible ya no hace falta la idempotencia. Los e2e ya no se saltan «la primera persona nace dueña» ni el guardián._

**Contexto:** la base local tenía una cuenta real y la clave real de apibara; `pnpm db:reset` las
habría borrado, y cuatro specs exigían el equipo vacío.
**Decisión:** el cambio de esquema va en `supabase/schemas/` (para la migración base) **y**, de forma
idempotente, en su migración (`do` con `if not exists`, `create … if not exists`): se aplicó con
`supabase migration up` y `pnpm db:probar` prueba el camino desde cero. Los e2e no exigen la base
vacía: la dueña de prueba entra invitada con el rol de dueño cuando ya hay cuentas. Sólo «la primera
persona nace dueña» y el guardián (que protege a la _última_ que administra) necesitan el equipo
vacío: se saltan en local con un aviso y corren siempre en CI. El spec de empresa guarda cómo estaba
la empresa y la clave real y los deja como estaban.
**Consecuencia:** quien corre los e2e con cuentas reales no pierde su clave ni sus ajustes, pero esas
dos pruebas no corren en su máquina.

## 2026-10-14 — El bruto de apibara lo origina la función; el navegador manda una referencia

**Contexto:** `vehiculo_crear(…, p_apibara)` y `vehiculo_subasta_refrescar(…, p_apibara, …)` guardaban el
JSON que mandaba el navegador, y de él la base deriva `subasta_en` y `estado_subasta`. Quien crea o
edita podía falsear la fecha o el estado de lo suyo, y la limpieza automática decide por ellos.
**Decisión:** la edge function guarda cada ficha que trae en `apibara_consultas` (sólo `service_role`) a
nombre de quien consultó (`apibara_contexto()` devuelve su `usuario`) y devuelve `{ consulta, data, url }`.
El alta y el refresco reciben el id y la base copia el bruto, con cuatro condiciones: la consulta es de
quien llama, es del mismo origen, tiene menos de 24 h y la usa un solo vehículo (reintentar el mismo
no choca). Las firmas viejas desaparecen (`drop function`). Nace `vehiculos.importado_apibara`, que sólo
pone `vehiculo_crear` con consulta y no cambia nunca; en la base viva se rellenó con `apibara_raw is not null`.
La action de refrescar lee el bruto nuevo con `apibara_consulta_leer()`, no del input. Un job borra las
consultas de más de 48 h.
**Alternativas:** re-consultar a apibara dentro de la limpieza (gasta cuota y el pedido de la limpieza
es no llamar); firmar el bruto con un HMAC (hay que guardar un secreto en la base y rotarlo); una tabla
con la clave del cliente y su bruto sin vencimiento (crece sin cota).
**Consecuencia:** el navegador sigue recibiendo `data` (llena el formulario y lista las fotos), pero lo que
viaja al guardar es el id. Costo: un INSERT por línea dentro de la función y un SELECT más al refrescar; ni
una consulta más a la API. Un vehículo cargado a mano y refrescado después nunca fue «importado» (no pasa
por `vehiculo_crear` con consulta): el relleno inicial de la base viva los contó como importados porque
la base no podía distinguirlos; es el único caso.

## 2026-10-14 — La regla de limpieza vive en un solo lugar de la base

**Contexto:** el job, el filtro «Se limpiará pronto» y el banner de la ficha necesitan la misma regla:
si un vehículo es basura, qué lo retiene y en qué fecha se va. Copiarla en TypeScript es la forma de que
el banner prometa una fecha distinta de la que aplica el job.
**Decisión:** funciones SQL, y sólo ellas: `_limpieza_aplica` (importado por apibara, de un origen de
subasta, vivo), `_limpieza_termino` (por la fecha guardada: fin o inicio si ya pasó; fecha en el futuro =
no terminó aunque el estado diga «terminada»; sin fecha y estado terminal, desde la última consulta; sin
fecha y sin estado terminal, nunca), `_limpieza_vence` (el día **local** en que cumple los días de
gracia), `_limpieza_ancla` (el código de la primera ancla) y `_limpieza_fecha` (el día en que el job lo
mueve). `limpieza_el(vehiculos)` es la columna calculada que leen el filtro (`.lte('limpieza_el', hasta)`),
la insignia y el banner. La fecha es **un día, no una hora**: lo que cumple después de las 03:00 locales
espera al día siguiente, así que banner y job no discrepan por minutos; una fecha ya vencida se dice como
la próxima corrida. Cambiar los días de gracia o la zona mueve los dos por igual, porque los dos leen
`ajustes_empresa`. El interruptor apagado hace nulas las fechas: desaparecen filtro, insignia y banner.
**Alternativas:** una vista `vehiculos_a_limpiar` (no compone con el listado ni se filtra por `or()`);
persistir la fecha en una columna (caduca con cada cambio de ajustes o de ancla); calcularla en la app.
**Consecuencia:** la columna calculada corre con los derechos de la base (mira pagos y documentos que
quien lista quizá no lee) y sólo devuelve una fecha o nulo: revela, como mucho, que algo retiene al
vehículo. Se evalúa por fila (50 por página): medirla con 5 a 10 mil vehículos es de la Fase 9.

## 2026-10-14 — Qué ancla y qué no; la cotización final queda para la Fase 4

**Contexto:** un vehículo de subasta que nadie compró se va; uno al que alguien le puso algo encima, no.
**Decisión:** ancla = marca «Conservar», vínculo activo con un lead, fase posterior a la inicial,
documentos, gastos, pagos (cuentan todas las filas, también las borradas: la purga las llevaría en
cascada), publicado en la vitrina, y lo que la papelera manual ya rechaza (comprobante, declaración
aduanera, proyecto de repuestos): la limpieza nunca intenta lo que la puerta de siempre cerraría. Los
**interesados no anclan**. «Sin fase» no ancla. El orden de los códigos es `conservar`, `vinculo`, `fase`,
`documentos`, `gastos`, `pagos`, `vitrina`, `bloqueo`, y la corrida cuenta cada ancla por separado.
**La cotización final será ancla en la Fase 4:** `cotizaciones.clase = 'final' and estado = 'activa'`
ya existe en la base; no se suma ahora porque nada la crea todavía. Se suma con una línea en
`_limpieza_ancla()` (hay un comentario en el punto exacto). Hoy `cotizacion_marcar_final` vincula el lead
si no tenía, y eso ya ancla por el vínculo.
**Consecuencia:** hasta la Fase 3 ninguna ancla de vínculo se puede crear desde la pantalla, y hasta la
Fase 6 tampoco documentos, gastos ni pagos: en la práctica sólo retienen «Conservar» y la vitrina.

## 2026-10-14 — «Conservar» es una marca aparte, sin versión, y restaurar la deja puesta

**Contexto:** hay que poder decir «éste no», sin mover la versión de la ficha (que le daría un conflicto
a quien la está editando) y sin que un vehículo restaurado vuelva a irse esa noche.
**Decisión:** `vehiculos_conservados (vehiculo_id, conservado_por, conservado_en)`, de sólo lectura para la
app, escrita por `vehiculo_conservar(p_vehiculo, p_conservar)`. La marca y quitarla las hace quien puede
editar el vehículo (`puede_vehiculo`), sólo en un importado de apibara, y dejan una fila en `actividad`
(`vehiculo.conservado` / `vehiculo.conservar_quitado`). Manda el estado deseado y no lleva
`p_actualizado_en_esperado`: es idempotente y no edita la ficha; es la misma razón por la que marcar un
interesado no la lleva. Al restaurar un lote de limpieza un trigger deja el vehículo conservado, con quien
restauró: la puerta de restaurar no se reescribe.
**Consecuencia:** coherente con el pendiente de la Fase 6 (mover de fase sin cambiar la versión de la
ficha). Quien quita la marca a mano lo devuelve a la limpieza, y se irá la noche en que le toque.

## 2026-10-14 — El job: una vez por día local, desde las 03:00, lote acotado y con registro

**Contexto:** `pg_cron` corre en UTC (`cron.timezone = GMT`) y ningún job miraba la zona de la empresa:
`papelera-purgar` «03:30» es la madrugada de Greenwich (las 23:30 en La Paz).
**Decisión:** `limpieza_automatica_correr(p_ahora, p_origenes)`, sólo `service_role`, programada **cada
hora** (`7 * * * *`) y que actúa a lo sumo una vez por día local, a partir de las 03:00 de la zona de la
empresa: una corrida perdida (base caída) se recupera a la hora siguiente y un cambio de zona no la
desplaza. La reserva del día es una fila de `limpieza_corridas` con índice único por fecha, tomada antes de
mover nada; dos a la vez no duplican. Por vehículo: fila bloqueada con `for update skip locked` (si alguien
la está editando, se salta y queda para la noche siguiente), se vuelve a decidir con la fila en la mano, y
sube a un lote `es_limpieza` sin autor con hasta 200 (el tope de un lote de papelera; el resto queda en
`pendientes`). Deja la corrida (movidos, saltados por ancla, pendientes) y una fila en `actividad` sin
autor. `p_origenes` hace la corrida «parcial»: no espera la hora ni tapa la de verdad (es lo que usan las
pruebas, sobre sus propios orígenes). `_vehiculo_a_lote()` es el movimiento que comparten la papelera manual
y la limpieza: la manual lo llama ahora, con el mismo comportamiento que ya cubría el humo.
**Consecuencia:** desde el lote sigue el camino que ya existía (`papelera_dias`, purga, `storage-gc`).
Quien edita un vehículo que el job movió recibe el PT409 de siempre («ya no existe o está en la papelera»),
que ya es legible. `papelera-purgar` sigue a las 03:30 UTC: alinearlo con la zona de la empresa es un
pendiente para la nube.

## 2026-10-14 — El lote de la limpieza lo ven y restauran quienes pueden vaciar la papelera

**Contexto:** un lote armado por el sistema no tiene autor, y la papelera muestra lo propio o, con
`vehiculos.papelera.purgar`, todo.
**Decisión:** nadie más lo ve. Quien creó el vehículo tuvo el aviso previo y «Conservar»; si se le fue,
se lo pide a quien administra. Se lee igual que un lote ajeno y se dice «Limpieza automática del dd/mm».
**Alternativas:** que cada persona vea sus vehículos dentro del lote (obliga a reescribir el listado y
la restauración de la papelera, que esta parte no toca).

## 2026-10-14 — El aviso: los próximos 3 días, y el interruptor apagado lo borra todo

**Decisión:** «Se limpiará pronto» son los vehículos con fecha de limpieza en los próximos 3 días, hoy
incluido (`VENTANA_DE_AVISO_DIAS`, el mismo número en el filtro, la insignia y el banner); los anclados no
aparecen porque su fecha es nula. El banner dice «Se limpiará el dd/mm» con «Conservar»; fuera de la
ventana, una línea con la fecha; conservado, «Se conserva · lo marcó X el dd/mm» con «Quitar». El
interruptor general nace encendido; apagado, no hay filtro, insignia, banner ni corrida (y encenderlo más
tarde el mismo día todavía limpia esa noche). La notificación llega en la Fase 7.

## 2026-10-14 — Los textos de uso diario dicen «subasta»; el proveedor se nombra donde se configura

**Contexto:** al cerrar la Fase 2 se revisó la interfaz: nada de voseo y ningún nombre de proveedor fuera
de lo que viene del dato. No había voseo en `src/`; el nombre del proveedor estaba escrito en unos veinte textos,
entre pantallas de uso diario (alta, ficha, fotos, errores) y pantallas que configuran la integración.
**Decisión:** el alta, la ficha, las fotos y los mensajes de error de la consulta dicen «la subasta»,
«la consulta de subastas» o «el servicio de subastas» (`mensajeDeApibara()`, `<AltaPorSubasta>`,
`<BloqueDeSubasta>`, `<SeccionDeFotos>`). El nombre de la plataforma sigue saliendo del dato
(`raw.platform` → `NOMBRE_DE_PLATAFORMA`). El proveedor se nombra sólo donde se lo configura:
Configuración › Integraciones («apibara», su dirección y su cuota), el campo de apibara de un campo del
layout, «Plataformas» al crear un origen y el paso «Activa apibara» de sus siguientes pasos.
**Consecuencia:** quedan los textos de configuración y las etiquetas del catálogo («Estado según apibara»,
«Actualizado en apibara»): son filas de `origenes_campos`, datos del origen que el dueño puede renombrar.
Los mensajes con voseo que quedan están en tres RPC de leads, flujos y cotizaciones que ninguna pantalla
llama todavía: se reescriben con su fase.

## 2026-10-14 — El motor de campos es de `shared`, y los leads lo usan

**Contexto:** cada empresa tiene que armar los campos de sus leads como arma los de un origen. El
motor vivía repartido entre `origenes` (editor, valor por defecto, impacto) y `vehiculos` (esquema,
control, filtro), con dos copias de `TipoDeCampo`; copiarlo a `leads` habría sido la tercera.
**Decisión:** lo que no depende de qué se configura pasa a `shared/lib/campos` (puro: tipos, orden
relativo, clave, valor por defecto, cambios, impacto con el sustantivo del módulo, piezas Zod) y
`shared/ui/campos` (el editor entero, con la configuración y las operaciones del módulo por props y un
hueco para lo propio). En la base, las mismas reglas son funciones `_campo_*`, `_campos_*` y
`_atributos_*` que no leen tablas (reciben lo que tienen que mirar); las `_origen_*` y el trigger de
vehículos delegan en ellas con los mismos mensajes. Cada módulo conserva su política: qué campos hay,
claves reservadas, permiso, banderas. El refactor fue su propio commit y no cambió a vehículos: sus e2e
quedaron en verde. Lo que sólo tiene un consumidor (el formulario por bloques, la ficha por grupos, el
traductor de filtros) se queda en `vehiculos` hasta que leads lo use.
**Alternativas:** un módulo `campos` (ningún `entities/` podría importarlo: habría que sacar la
validación de `entities`); que `leads` importe de `origenes` (dependencia falsa y otra copia de los
tipos); copiar el motor.
**Consecuencia:** un tipo de campo nuevo es una sola lista y sus `Record` por tipo; el mismo editor
sirve a un tercer módulo. `shared` sigue sin reglas de negocio: no sabe qué es un lead.

## 2026-10-14 — Los leads suman `correo` y `documento`, y nacen «solo la cartera»

**Decisión:** los tipos de un lead son los de un vehículo sin VIN ni lote, más `correo` y `documento`
(validación propia: correo con forma de correo; documento con letras, números y separadores, hasta 30).
No llevan valor por defecto y nacen «solo la cartera» si la persona no dice otra cosa. Cada layout
limita sus tipos con un `check` (`leads_campos` sin vin y lote; `origenes_campos` sin correo y
documento) y el editor ofrece sólo los suyos. Los teléfonos extra siguen en `leads_telefonos`.
**Alternativas:** un tipo `telefono` (duplicaría `leads_telefonos`); dejar los sensibles como texto (la
persona tendría que acordarse de marcarlos).
**Consecuencia:** el enum se amplió en su propia migración (un valor nuevo no se usa en la transacción
que lo crea) y un test compara la lista de TypeScript con el enum de la base.

## 2026-10-14 — Configuración › Leads reusa `leads.configurar`

**Contexto:** se pedía un permiso nuevo, pero `leads.configurar` ya existía (sembrado, tipado, en el
menú, sólo del dueño) y ya gobierna los orígenes de lead y los tipos de seguimiento: las otras pestañas
de la misma pantalla.
**Decisión:** un solo permiso para toda la configuración de leads, como `origenes.gestionar` cubre
campos y categorías. Se amplió su descripción y su `aplicado_en`. Sin él no se entra (no hay otro
permiso que necesite leer esta configuración: el layout lo leen las pantallas de leads por su cuenta).
**Alternativas:** `leads.campos.gestionar` (más fino: quien edita seguimientos no tocaría la privacidad
de los campos; exige insertar un permiso por migración, algo que ninguna ha hecho). Si hace falta
separar, es un permiso nuevo con su enforcement.
**Consecuencia:** la dominancia de la matriz sale sola del catálogo.

## 2026-10-14 — Las seis columnas de un lead pasan a atributos, sobre la base viva

**Contexto:** edad, ciudad, país, dirección, género y notas eran columnas fijas; ahora son campos de
fábrica de `leads_campos`. La base local tenía una cuenta real: nada de `db:reset`.
**Decisión:** una migración idempotente copia lo que haya a `leads.atributos` (género «sin especificar»
y un texto en blanco son «sin dato»), retira las columnas y el enum `genero_persona`, y recrea la vista
y `crear_lead`. La copia es una función interna (`_leads_columnas_a_atributos()`) para que el humo vuelva
a crear las columnas y la ejercite. Las migraciones antiguas dejaron de nombrar las seis columnas (una
vista se valida al crearse) y la definición actual de `leads_vista` es `_leads_vista_crear()`. Las claves
de fábrica son las de las columnas viejas, así que lo que ya está en `actividad` sigue la misma regla.
`crear_lead` conserva su firma: los datos propios van en `atributos` y una clave suelta se rechaza
diciendo dónde va. La base ya no pone el país por defecto: lo precarga el formulario, como en vehículos.
**Alternativas:** dejar las columnas y sumar atributos (dos lugares para la misma cosa); una tabla EAV.
**Consecuencia:** el campo «Edad» pierde el `between 1 and 120` de la columna: el motor no tiene topes
por campo. Si hace falta, es una regla del motor para todos los campos.

## 2026-10-14 — Los privados se recortan al leer, con la cartera de ese momento; filtrar es leer

**Contexto:** RLS no esconde columnas ni claves de un `jsonb`, y un filtro sobre un campo privado
revelaría su valor aunque la pantalla no lo muestre.
**Decisión:** `leads.atributos` no tiene grant: se lee por `leads_vista.atributos`, que sale de
`atributos_lead()` (definer, estable). La cartera recibe todo; quien sólo ve el lead recibe las claves
que el layout conoce como no privadas, **activas o no** (falla cerrada: desactivar un privado no lo
expone); quien no ve el lead, nada. PostgREST sólo filtra sobre la columna recortada, así que no hay
oráculo. Como se decide al leer, compartir, transferir y adoptar del limbo dan los privados y revocar
los quita sin mover datos. Un trigger valida el estado final contra el layout y no deja que quien está
fuera de la cartera cambie un privado ni le exige uno que no ve. `actividad` deja de entregar `antes` y
`despues` (la fila entera, con el teléfono): la pantalla de Actividad (Fase 9) leerá el diff por una
función que recorta según la cartera. Los conteos del aviso de impacto son agregados, nunca valores.
**Alternativas:** guardar los privados aparte (otra tabla por lead); recortar en la pantalla (el dato
viaja igual); una función de búsqueda definer (todavía no hace falta).
**Consecuencia:** filtrar por un campo evalúa `atributos_lead()` por fila y no usa índice (bajo RLS
tampoco lo usaría un GIN, como en vehículos): **no está medido**. Se mira con datos reales (Fase 9) y,
si pesa, el listado pasa a una función que recorta una vez por consulta. Un `select *` de `leads` o de
`actividad` desde la API falla a propósito.
**Lo que se encontró y no se cambió** (tocan el enmascarado, que esta parte deja fijo): `leads_telefonos`
no se enmascara a quien ve el lead sin la cartera; `telefono_lead(id)` no comprueba acceso; quien tiene
`leads.editar` «todos» puede compartirse un lead ajeno. Van con la parte de la cartera.

## 2026-10-14 — «La de la empresa» es una columna, no una referencia dentro del valor

**Contexto:** Ciudad trae por defecto la de la empresa (`docs/UX.md`, Flujo 1).
**Decisión:** `leads_campos.valor_defecto_empresa` (`ciudad` o `pais`), excluyente con un valor fijo y
sólo en un campo de texto. Se resuelve al leer el layout con los ajustes de la empresa, así que sigue a
la empresa si cambia de ciudad. Sin dato de la empresa, el alta sale vacía y el editor lo dice.
**Alternativas:** una referencia `{"empresa": "ciudad"}` dentro de `valor_defecto` (ensucia el motor,
sus lectores y la comparación de cambios con una noción de empresa); copiar la ciudad al campo al
sembrarlo (no sigue a la empresa).

## 2026-10-14 — «De fábrica» reemplaza a «de sistema» para los campos

**Decisión:** un campo que nació con la preconfiguración (de un origen o de los leads) se llama «de
fábrica»: insignia, motivo del panel y mensajes de la base. «Sistema» ya nombra otra cosa (el rol
dueño). La columna sigue siendo `es_sistema`. Un campo de fábrica se edita, se apaga y se renombra;
no se elimina ni cambia de tipo ni de clave.

## 2026-10-14 — El alta rápida pide los requeridos propios, y el panel lo dice

**Decisión:** el drawer de «Nuevo lead» lleva los cuatro fijos y los campos activos requeridos; el
resto va plegado en «Más datos», ya precargado, con un resumen en el encabezado. Volver requerido un
campo avisa dentro del panel, con el número, cuántos datos pedirá el alta; desde el cuarto, que la meta
de 25 segundos cuesta cumplirla. Sin un campo requerido, la base lo rechaza con el campo en el `hint`:
vale también para el cliente de servicio, así que los e2e que cargan leads completan los requeridos.
**Consecuencia:** el aviso es de la pantalla de configuración; el alta (parte siguiente) lo
materializa.

## 2026-10-14 — El alta rápida es una sola RPC: el lead, su seguimiento y el recordatorio entran juntos

**Contexto:** `crear_lead(jsonb)` devolvía sólo un `uuid`, no tenía forma de distinguir un reintento de un
duplicado y el seguimiento se escribía directo en la tabla: dos pasos, y un fallo en el segundo dejaba
un lead sin seguimiento.
**Decisión:** `crear_lead(p_id, p_lead, p_seguimiento, p_recordatorio)` escribe el lead (o lo adopta),
el seguimiento, el recordatorio y el último origen usado (`preferencias_usuario`) en una transacción.
El navegador genera `p_id` al abrir el drawer y lo conserva en cada reintento: si ya entró, devuelve lo
mismo con `repetido` (el patrón de `vehiculo_crear`; una adopción se reconoce por el `intento` de su
constancia en `actividad`). Un teléfono que ya existe, es de otra persona o está sin dueño sin tomar es
un **valor** (`existe`, `de_otro`, `limbo`), no una excepción: la pantalla lo dice junto al teléfono. Dos
personas que guardan el mismo teléfono a la vez terminan ahí: el `unique_violation` se atrapa y se
vuelve a verificar. `p_seguimiento` es opcional en la firma (la importación CSV, parte 7, no lo trae);
el drawer lo manda siempre y el resumen es obligatorio.
**Alternativas:** dos llamadas (si el seguimiento falla queda un lead a medias); una clave de
idempotencia en una tabla aparte (otra tabla para algo que `leads.id` ya resuelve).
**Consecuencia:** un rechazo no deja nada. El humo prueba la atomicidad, un fallo a mitad y el reintento;
el e2e, la carrera real. Los dos pendientes de la parte 4 (policies directas de `seguimientos` y
`recordatorios`) siguen: esta RPC es la única puerta del primer seguimiento, no la de los siguientes.

## 2026-10-14 — El teléfono lo normaliza la base y el código de país es de la empresa

**Decisión:** `normalizar_telefono(cc, tel)` entiende espacios, guiones, puntos y paréntesis; «+» o «00»
al inicio es internacional (el número ya trae su código); sin ellos es nacional (código de la empresa
y un 0 troncal menos); rechaza con el motivo letras, un «+» en medio y lo que no tiene entre 8 y 15
dígitos. `leads/entities/telefono.ts` es su espejo, para responder al tipear, y un test **ejecuta** la
función SQL en PGlite sobre la misma tabla de casos y exige el mismo número y el mismo motivo. El código
de país es `ajustes_empresa.telefono_cc` (Empresa › Región); `leads.telefono_cc` deja de tener default y
guarda el código sólo cuando el número es el de la empresa. Sin código de empresa, el alta pide el número
con «+» y lo dice. La migración conservó el `+591` que la instalación ya usaba como dato de la empresa.
**No se adivina:** un número que empieza con el código de la empresa pero se escribió sin «+» ni «00» se
toma como nacional. La pantalla dice cómo va a quedar guardado («Se guardará como +591 70011002») para
que se vea antes de guardar.
**Alternativas:** derivar el código del `locale` (una tabla más, y falla con un locale raro); espejo
sólo con regex sobre el SQL (no prueba que haga lo mismo).

## 2026-10-14 — Tomar un lead sin dueño exige aceptarlo, deja de dueño y no pisa

**Contexto:** `crear_lead` adoptaba solo, dejaba al adoptante como «adoptado» (sin dueño: «Lo tiene
null») y reemplazaba el nombre y los atributos del lead con lo que se tipeaba.
**Decisión:** el lead sin dueño se adopta sólo con `adoptar = true` («Tomar lead»); sin eso, el servidor
dice `limbo` y nada cambia (nadie adopta por una verificación que llegó tarde). Quien lo toma entra como
**dueño**, el nombre se conserva, el origen sólo se completa si estaba vacío y de los atributos entran
las claves que faltan (`_atributos_completar`). La fila de cartera que ya tenía (revocada) se reactiva.
El drawer lo dice antes de guardar. El valor `adoptado` del enum queda sin uso: quitar un valor de un
enum cuesta más que dejarlo.
**Consecuencia:** «Lo tiene …» siempre nombra a alguien. Un campo requerido que el lead no tiene lo
completa quien lo toma; uno que ya tenía no se toca.

## 2026-10-14 — Ctrl/Cmd+Enter avanza al seguimiento y se guarda al final

**Contexto:** `docs/UX.md` decía «guarda y abre el primer seguimiento»: dos escrituras. Con la RPC
atómica eso dejaría de ser una transacción.
**Decisión:** en el paso de los datos, `Ctrl/Cmd+Enter` valida y abre «Primer seguimiento» sin escribir
nada; el segundo `Ctrl/Cmd+Enter` guarda todo. Los dos pasos son un solo formulario en el mismo drawer
(el que no se ve queda oculto, no desmontado: lo escrito no se pierde al ir y volver); `Esc` del segundo
vuelve al primero. No hay «guardar sin seguimiento»: el resumen es obligatorio, así que no nace un lead
sin seguimiento. Los atajos de fecha van **antes** del campo de fecha: un `datetime-local` tiene una
parada de Tab por cada parte.
**Consecuencia:** 7 teclas de control desde `N` hasta el lead guardado con seguimiento y recordatorio.

## 2026-10-14 — `N` es de la pantalla; «Nuevo lead» siempre tiene botón

**Contexto:** `docs/UX.md` decía «en cualquier pantalla `N` abre Nuevo lead» y, más abajo, «`N` nuevo
(lead, vehículo o cotización según pantalla)».
**Decisión:** `N` abre lo propio de la pantalla (en vehículos, un vehículo). Donde la pantalla no tiene
un «nuevo» propio (Inicio, Configuración, Perfil) cae a «Nuevo lead». En vehículos `N` es siempre del
vehículo: si no se puede (origen desactivado, sin permiso, otro panel abierto) no hace nada, no cae a
lead. El botón «Nuevo lead» está siempre en la barra superior de quien tiene `leads.crear`, así que la
meta se mide también desde él. Sin `leads.crear` no se monta nada: ni botón, ni atajo, ni URL.
**Consecuencia:** la pila de `ProveedorAtajos` ya resolvía «el más adentro gana»; no hizo falta otro
mecanismo. La lista de atajos con `?` sigue sin dibujarse (pendiente).

## 2026-10-14 — El resumen de un seguimiento es un título corto y un detalle en texto plano

**Decisión:** hasta que llegue el editor enriquecido (parte 4), el primer seguimiento lleva `titulo`
(≤ 120) y `detalle_texto` (≤ 5000, texto plano); `detalle_html` queda nulo. Lo que se guarde hoy sigue
siendo válido: el editor mostrará `detalle_texto` cuando no haya HTML. El recordatorio usa el título del
seguimiento (no se pide otro).

## 2026-10-14 — El formulario por bloques y los controles por tipo son de `shared`

**Contexto:** `docs/ESTADO.md` lo anticipaba; el alta de leads necesita lo mismo que el de vehículos.
**Decisión:** `shared/lib/campos` suma `valor.ts` (el estado de un formulario de campos), `controles.ts`
(un `Control` por cada uno de los 14 tipos, la clave del dato la pone quien llama) y `esquema-de-valor.ts`
(el Zod de cada tipo; correo y documento espejan `_lead_atributos_formato()`); `shared/ui/campos` suma
`<CampoDeFormulario>` y `<BloqueDeCampos>`. Vehículos conserva sus datos comunes, sus bloques, la
conversión de apibara, el lector y el filtro por tipo (los usa el listado). Fue su propio commit, sin
cambios de comportamiento: los e2e de vehículos y orígenes siguieron en verde.

## 2026-10-14 — La guardia de los e2e: respaldo en disco, funciones servidas y teardown

_Reemplazada más abajo: «El e2e completo parte de un reset, la guardia sólo comprueba las funciones, y el atajo de la pantalla gana» (2026-10-15)._

**Contexto:** un e2e que falló a mitad dejó apagada la integración de apibara y la corrida siguiente
respaldó ese estado ya malo: el respaldo era una variable de cada spec, tomada de la base viva.
**Decisión:** `globalSetup`/`globalTeardown` de Playwright. Antes de empezar: si existe
`e2e/.estado/respaldo.json`, una corrida anterior no restauró: se **repone desde el archivo** antes de
tomar uno nuevo, y nunca se lo pisa con lo que hay en la base. Se respalda `integraciones` de apibara
(sin la clave: nunca va a disco). Se prueba con `OPTIONS` (no llama a apibara) que `apibara` y
`storage-gc` estén servidas y, si no, falla en segundos diciendo qué correr. Al terminar: restaura,
comprueba que la clave de Vault sigue y borra los leads `E2E …` que hayan quedado. Los `afterAll` de
empresa y de la limpieza restauran en `finally`.
**Costo:** los e2e exigen `npx supabase functions serve` siempre (`E2E_SIN_FUNCIONES=1` lo salta, y lo
avisa); unas 120 líneas. **No cubre** un `kill -9` en medio de una corrida: lo cubre la siguiente.
**Una base de pruebas aparte no hace falta todavía:** el riesgo era el estado compartido que se pisa,
no la base; si algún día los e2e tienen que correr en paralelo o contra datos reales sensibles, sí.

## 2026-10-14 — Cómo se mide la tarea de oro 1

**Decisión:** el e2e hace el recorrido entero con el teclado, sin un solo clic, y cuenta lo que se pulsa
(sin contar lo que se tipea). Lo que comprueba: ≤ 8 teclas de control, el reloj del robot bajo un tope
generoso y la estimación de una persona por KLM (0,28 s por tecla, 1,35 s por decisión) ≤ 25 s. El
reloj del robot **no** es la hora de una persona: tipea sin demora. La meta de 25 s se sostiene por la
cuenta de pulsaciones y por el KLM; la detección del duplicado se mide aparte (≈ 0,8 s después de
tipear: 400 ms de espera y un viaje).

## 2026-10-14 — El listado de leads: orden, «míos», búsqueda, privados y drawer

**Contexto:** `/leads` es la primera pantalla donde otra persona ve un lead que no es suyo, así que cada
decisión es también una decisión de qué se entrega y qué se deduce.
**Decisión:**

- **Orden `creado_en desc, id desc`**, con el cursor y el índice del inventario (`leads_listado_idx`, sólo
  vivos). «Actividad reciente» (`ultimo_seguimiento_en`) sirve más a un asesor, pero es nulo en todo lead
  sin seguimientos (el keyset necesita una rama `nulls last` y un cursor de tres partes), las filas
  cambian de página mientras se pagina, y cada seguimiento reescribe la fila. Entra como orden
  alternativo cuando la parte 5 deje esa columna estable.
- **«Míos» es `leads_vista.en_cartera`**, no `telefono_visible`: las dos son `en_cartera(id)` hoy, pero
  una dice «de mi cartera» y la otra «veo el teléfono»; atarlas por casualidad rompería el listado el día
  que el teléfono dependa de otra cosa. «Todos» no suma condición: lo que hay lo decide la RLS de `leads`.
  Con «ver como», `sesion.permisos` son los efectivos del rol: un rol con «propios» fuerza «míos» (y el
  drawer no muestra un lead ajeno). La RLS sigue con los permisos reales: es la UI, no la base, la que
  simula (como en vehículos, donde las filas de una pestaña no se acotan).
- **La búsqueda es por nombre y por número (`#124`), nunca por teléfono:** buscar dígitos sobre lo ajeno
  sería un oráculo para saber si un número ya está cargado (lo que `verificar_telefono` ya acota). El
  texto entra a `or()` por `citar(patronContiene())`; `%`, `_`, `*`, coma, paréntesis y comillas son
  texto.
- **Filtrar por un privado teniendo «todos» sólo encuentra lo propio, y se dice:** la ayuda bajo el filtro
  («Solo busca en tus leads…») y una línea sobre el resultado, sólo para quien ve «todos». En la tabla,
  la celda de un privado ajeno dice «Solo la cartera», no un guion que haría creer que no hay dato.
- **Un filtro de la URL que ya no vale se dice** (campo desactivado, no filtrable o inexistente) y se
  quita con «Entendido»; antes `leerFiltros()` lo tiraba en silencio y la vista parecía vieja sin
  explicación.
- **El drawer lee desde el navegador** (`leads_vista` con la sesión de quien mira) y relee al volver a la
  pestaña: no pide una página entera al servidor para cada vistazo y puede decir «ya no está
  disponible» si le quitaron el acceso mientras tanto, con el mismo texto para papelera, limbo y
  revocación. Se dibuja primero con la fila de la página. No tiene enlace a la ficha: llega con ella.
- **De `atributos` el listado sólo pide las claves `en_tabla`** (alias `a_<clave>`), validadas contra el
  formato de clave de la base antes de armar la consulta; el drawer pide todos los que le llegan.
- **El estado vacío por filtro usa el compartido** («Nada coincide con los filtros»), no un texto propio.
  **Costo:** una pantalla más que depende de `equipo` (vistas) y de la composición de `app/`; el drawer
  tiene una lectura propia en el navegador (`infra/lead-rapido.client.ts`).

## 2026-10-14 — `alcance_de()` y `atributos_lead()` más baratas: lo que midió el listado

**Contexto:** `DECISIONES` (2026-10-14, «filtrar es leer») dejaba sin medir el costo de filtrar por un
atributo, que pasa por `atributos_lead()` en cada fila. Con 2.000 leads sintéticos, en una transacción
revertida, tardaba **~850 ms** (0,43 ms por fila): la RLS ya era barata (InitPlan, 12 µs por fila); el
costo estaba en `alcance_de()`, que materializaba los ~75 permisos de una dueña en cada llamada
(`mis_permisos()`), dos veces por fila.
**Decisión:** `alcance_de()` lee `usuarios_roles ⨝ roles_permisos ⨝ perfiles` con la clave en el WHERE y
una pasada (8 veces más rápida) y `atributos_lead()` resuelve alcance, vida, limbo y cartera en una
llamada y una lectura. **Misma semántica**, y un caso de `humo.sql` compara `alcance_de()` con
`mis_permisos()` para cada permiso y origen y varias personas, porque la regla ahora está en dos
lugares. Resultado: página sin filtro ~30 ms, con un atributo ~180 ms, búsqueda por nombre ~30 ms,
«propios» con 50 de 2.000 ~10 ms (antes 47, 887, 45 y 64 ms).
**Costo y lo que sigue:** sigue siendo 0,08 ms por fila en cada filtro por atributo (lineal: ~0,8 s con 10 mil
leads «todos»). La medición con 5 a 10 mil queda para la Fase 9; si pesa, el listado pasa a una función
`definer` que recorta una vez por consulta. El plan no usa `leads_listado_idx` para la página sin
filtro con 2.000 filas (sort sobre un `Seq Scan`); sí lo usa por cursor. Con más filas hay que volver a
mirar. La medición consume 2 ids de la identidad de `actividad` por corrida (los inserts de usuarios):
huecos de numeración, sin filas.
**Una migración sobre la base viva:** con cuentas reales en la base local, los cambios van con
`supabase migration up` (aplica sólo lo pendiente), no con `db:reset`.

## 2026-10-14 — La guardia de los e2e no respalda la base, y un respaldo viejo puede pisar un cambio

_Reemplazada más abajo: «El e2e completo parte de un reset, la guardia sólo comprueba las funciones, y el atajo de la pantalla gana» (2026-10-15)._

**Contexto:** se revisó qué cubre exactamente la guardia (`e2e/soporte/guardia.ts`) antes de apoyarse en
ella con cuentas reales en la base local.
**Qué hace:** respalda **sólo** la fila de apibara de `integraciones` (`activa`, `config` y
`secreto_guardado_en`, nunca la clave) en `e2e/.estado/respaldo.json` (ignorado por git); al terminar la
repone, comprueba que la clave de Vault siga y borra los leads `E2E …`. No respalda leads, cuentas ni
campos: esos los limpian los propios specs.
**Tras un `kill -9`:** el archivo queda; la corrida siguiente lo repone **antes** de tomar uno nuevo y
avisa. Los leads `E2E …` que quedaron se borran recién al final de esa corrida. Qué hacer: volver a
correr `pnpm test:e2e` (o borrar `e2e/.estado/respaldo.json` si cambiaste apibara a mano y no querés
que se reponga).
**Riesgo anotado, sin construir nada:** **sí**, restaurar un respaldo viejo pisa un cambio hecho a mano
entre corridas. La reposición no mira `creadoEn` ni compara con lo que hay: si encendés apibara o
cambiás su configuración en Integraciones después de un `kill -9` y antes de la corrida siguiente, el
setup lo pisa con el estado viejo (sólo un `console.warn`); pasa igual con un cambio hecho _durante_ una
corrida, que el teardown deshace. `secreto_guardado_en` vuelve con la fecha vieja: si la clave se
cambió en el medio, la fila queda con una marca que ya no es la de Vault; si se borró, dice que hay una
que no hay. Mitigación posible (no hecha): comparar `actualizado_en` de la fila con `creadoEn` del
respaldo y, si es posterior, no pisar y avisar.

## 2026-10-14 — La versión de un lead la mueve lo que la ficha edita, y nada más

**Contexto:** `leads.actualizado_en` es la versión con la que se edita la ficha, y la movía cualquier
`update`, entre ellos el trigger de `seguimientos` que escribe `ultimo_seguimiento_en`: cada seguimiento
nuevo le habría dado un conflicto a quien editaba. La auditoría genérica además guardaba la fila entera
(con `telefono_principal`) y `_conflicto_de_edicion()` nombraba a quien hubiera dejado la última fila de
`actividad` del lead, fuera compartir, transferir o un seguimiento.
**Decisión:** `lead_version()` (BEFORE UPDATE) mueve la versión sólo si cambió nombre, tipo, origen,
atributos, teléfono (principal o su código) o la papelera (`eliminado_en`, `lote_papelera_id`); si no,
repone la anterior. **No la mueven:** `ultimo_seguimiento_en` (ni lo derivado que sume la parte 5), la
cartera (compartir, transferir, revocar, baja) ni `creado_por`. Adoptar del limbo la mueve sólo si
completa el origen o los atributos (entonces sí cambió la ficha). Se sella con
`greatest(clock_timestamp(), anterior + 1 µs)`: dos ediciones en una transacción tienen versiones
distintas. **Transferir mientras otra persona edita no le da conflicto:** no cambia nada de lo que edita;
si por eso quien edita pierde el lead, `lead_guardar()` lo dice al guardar («No encontramos este lead o
no tienes acceso.»); si entra a otra cartera, el trigger de privados decide qué puede cambiar.
`lead_auditar()` reemplaza a `auditar()` en `leads`: nunca guarda `telefono_principal` y sólo escribe
cuando la versión se movió (un seguimiento no deja fila). `_lead_conflicto()` nombra al actor de la última
`leads.update`: lo que cambió la versión, no cualquier cosa del lead.
**Alternativas:** una columna `version` aparte (otra cosa que mantener, y toda RPC existente ya habla
de `actualizado_en`); que el trigger de seguimientos restaure la versión después (dos escrituras).
**Consecuencia:** una columna derivada nueva se suma fuera de la lista de `lead_version()`. El humo
prueba que un seguimiento, compartir y transferir no la mueven, que la papelera sí y a quién nombra el
conflicto. `_leads_columnas_a_atributos()` (de una migración vieja) se recreó con los triggers nuevos.

## 2026-10-14 — `lead_guardar` es la única puerta, y los atributos viajan como parche

**Contexto:** `leads` tenía `grant update (nombre, tipo, origen_lead_id)` y una policy: un `.update()` del
navegador saltaba la versión. Mandar los atributos enteros, como hace vehículos, habría pisado los
privados de quien edita sin estar en la cartera (no los recibe).
**Decisión:** `lead_guardar(p_lead, p_actualizado_en_esperado, p_cambios)`; `leads` queda sin UPDATE
para la app. `p_cambios` lleva sólo `nombre`, `tipo`, `origen_lead_id` y `atributos`, que es un parche:
`{clave: valor}` pone o cambia y `{clave: null}` quita; lo que no se nombra no se toca. La versión es
obligatoria; lo que ya está guardado no es un conflicto (un reintento no choca consigo mismo).
`atributos` va siempre en el `SET`: el trigger del layout se dispara por columna nombrada, así que un
requerido que se sumó después falta aunque sólo cambie el tipo, que es lo que promete el aviso de
impacto de Configuración («no podrán guardarse hasta completarlo»). El origen sólo se valida si
cambia: uno apagado que el lead ya tiene se conserva; pasar a otro apagado se rechaza con el campo en el
`hint`. Un campo desactivado con dato se conserva y no se cambia (el parche no lo nombra y el trigger
acepta lo que no cambia). Inexistente, limbo, papelera y sin acceso responden el mismo mensaje y el mismo
código (`42501`); sólo quien ya ve el lead recibe «No tienes permiso para editar este lead.».
**Qué cubre y qué no:** el teléfono y los extras no pasan por acá (parte 4b), así que un requerido nuevo
no frena cambiar un teléfono; frena guardar la ficha.
**Alternativas:** mandar el estado entero de `atributos` (pisa lo que no se recibe); una RPC por campo.

## 2026-10-14 — Los teléfonos de un lead se leen por función, y `telefono_lead()` da nulo a quien no ve

**Contexto:** RLS no esconde columnas. `leads_telefonos` se leía directo con la policy de «ver el lead»,
sin enmascarar, y `telefono_lead(id)` daba el número enmascarado de cualquier id, también de leads que
la persona no ve.
**Decisión:** la tabla queda sin grant ni policy para la app (RLS encendida): se lee por
`lead_telefonos(p_lead)` (definer), que da el número completo a la cartera, enmascarado al resto y
nada a quien no ve el lead. Una función y no una vista: una vista `security_invoker` necesitaría el grant
sobre la tabla. `telefono_lead()` pasa a plpgsql con la forma de `atributos_lead()` (un `alcance_de` y una
lectura) y devuelve nulo si no se ve el lead (sin `leads.ver`, «propios» fuera de la cartera, limbo,
papelera o inexistente). La tabla suma `creado_en`, formato `^[0-9]{7,15}$`, etiqueta de 1 a 40 y
`unique (lead_id, telefono)`; no suma `creado_por` (una FK más sin índice; la constancia en `actividad`
lleva quién). Nadie leía la tabla: no hubo código que cambiar.
**Lo que cierra a la vez:** `leads_asesores` la lee entera quien ve el lead; ahora, quien no está en la
cartera sólo ve la fila del dueño («Lo tiene X»), no con quién está compartido.
**Medido** con 2.000 leads sintéticos en una transacción revertida: página sin filtro 13,5 ms (antes
~30), filtro por un atributo 119 ms (antes ~180), búsqueda por nombre 15 ms, «míos» 32 ms, `lead_ficha()`
5,9 ms.

## 2026-10-14 — Teléfonos extra y cambio del principal: las reglas (para la parte 4b)

**Decisión (los extras):** no se verifican contra otros leads: son alternos y no tienen unicidad. Hasta
10 por lead. Un duplicado dentro del mismo lead, o igual al principal, se rechaza junto al campo («Ese
número ya está en este lead»). La etiqueta es opcional: vacía se guarda nula y la ficha muestra sólo el
número. Agregar es idempotente por id; quitar lleva «Deshacer». Se normalizan con la función y el código
de país del alta.
**Decisión (el principal):** `cambiar_telefono_lead(p_lead, p_actualizado_en_esperado, p_cc, p_tel)`
reemplaza a la de tres parámetros (que no llevaba versión, pedía `leads.editar` sin mirar la cartera,
guardaba el código crudo, daba un duplicado como excepción y no dejaba constancia). Sólo la cartera. Un
número que ya existe (mío, de otro o en limbo) es un **valor**, dicho como en el alta, sin cambiar nada y
sin adoptar; el mismo número es «sin cambios» (también el reintento). El anterior queda como extra con
la etiqueta «Anterior» (si ya era extra no se duplica; si el nuevo era extra, sale de los extras).
Constancia `lead.telefono_cambiado` con los dos números enmascarados: la auditoría ya no deja el número en
un diff legible. La verificación al tipear es `verificar_telefono_de_lead(p_lead, p_cc, p_tel)`: exige la
cartera, se excluye a sí misma y reusa `_lead_verificar()`; el campo del alta se generaliza.

## 2026-10-14 — La ficha: tres lecturas, el código de país del lead y el tope de KB

**Decisión:** abrir la ficha son tres lecturas de datos, en paralelo y sin caché: `lead_ficha()` (la fila
de `leads_vista`, quién lo tiene y los extras, todo recortado según quien mira; nulo si no se ve), el
layout y los orígenes (también los apagados). No se lee `ajustes_empresa`: el número se parte con el
código que guardó el lead (`leads.telefono_cc`, sólo cuando es el de la empresa), así que un extra de
otro país se ve «+54…» sin partir, como en el listado. El layout **no** está cacheado (la lectura
necesita la sesión: `anon` no tiene grant sobre `leads_campos` y el cliente admin está prohibido fuera
de `conAdminDeAuth()`), y la ficha se dibuja por request: abrirla desde el drawer rápido no muestra
datos viejos. Al volver a la pestaña con el panel cerrado se vuelve a leer; con el panel abierto no, para
no reiniciar lo que se escribe. Un test cuenta las lecturas. Quien edita sin la cartera no recibe los
privados, así que el panel no los ofrece y lo dice; la base tampoco le deja cambiarlos.
**Medido (e2e, build de producción):** el documento de la ficha pesa ~104 KB, de los cuales ~29 KB son
de la ficha (el shell de otra pantalla pesa ~75 KB), y navegar desde el listado transfiere ~33 KB de
payload RSC (suma la precarga). El terreno tiene un campo de 60 opciones: un layout típico es más
liviano. El tope del e2e es 40 KB para cada número, y no el de 60 KB del documento entero que se supuso
antes de medir.

## 2026-10-14 — Tachados y claves de campo en la URL: no hay choque y no se reserva la clave

**Contexto:** el layout real de la base local ya tiene un campo propio con clave `tachado`, y la parte 5
trae el estado «tachado» de cada persona y su filtro de 3 estados.
**Revisado:** los campos van en la URL con el prefijo `a.` (`PREFIJO_DE_FILTRO`): el campo es
`a.tachado`, y el filtro de tachados será `?tachados=` (o como se llame), sin superponerse. En la vista,
la columna es `leads_vista.esta_tachado` y el alias de tabla de un campo es `a_tachado`.
**Decisión:** no reservar la clave en `CLAVES_RESERVADAS_DE_LEAD` (rompería un campo que ya existe) y
no prefijar más los filtros. El choque es de nombre en la pantalla: el campo privado «tachado» y el estado
por persona «tachado» se leerían igual. La parte 5 le pone al estado un nombre que no se pise (el del
glosario) y lo avisa; si hiciera falta, se renombra la **etiqueta** del campo, que es un dato de quien lo
creó. ESTADO lo ubica en la parte 5 (donde llegan los tachados); el pedido lo pensaba en la 6.

## 2026-10-14 — Teléfonos de la ficha: cómo se aterrizó la 4b

**Contexto:** las reglas ya estaban escritas («Teléfonos extra y cambio del principal»). Al
contrastarlas con la base apareció que `cambiar_telefono_lead(uuid, text, text)` pedía `leads.editar`
sin mirar la cartera: quien tiene «todos» podía cambiar el teléfono de un lead ajeno llamando a la RPC.
**Decisión (el principal):** `cambiar_telefono_lead(p_lead, p_actualizado_en_esperado, p_cc, p_tel)`
va en este orden: acceso, normalizar, igual al principal (`sin_cambios`, **antes** de mirar la versión,
porque el reintento tras una respuesta perdida llega con la de antes), un número que ya existe como valor,
versión (`PT409`), escribir. El «Anterior» siempre entra: **el tope de 10 lo aplica «agregar»**, no el
cambio (rechazar un cambio de teléfono porque hay 10 extras no tiene explicación para quien lo pide). El
código de país es el del lead (`leads.telefono_cc`); si es nulo —el número no era el de la empresa— **no se
adivina** y se pide el número con «+», así la ficha no lee los ajustes de la empresa.
**Decisión (los extras):** `lead_telefono_guardar` es un upsert por id (agrega, rotula y restituye) y
`lead_telefono_quitar` devuelve lo quitado. **No llevan versión** (excepción a la regla de versión
obligatoria): operan sobre una fila, son idempotentes por id y una versión sólo daría conflictos falsos
entre dos personas que agregan números distintos; la integridad (único por lead, tope) la dan el índice y
el bloqueo de la fila del lead, sin cambiarla. «Deshacer» restituye con el mismo id, etiqueta y
`creado_en` (la base lo acota a ahora); si entretanto ese número ya está, se rechaza como duplicado.
**Decisión (el aviso):** un número libre que es teléfono extra de otro lead avisa sin bloquear
(`_lead_verificar(p_tel, p_excluir)` → `alterno`, con la misma regla de qué se dice que el principal; un
lead en limbo no se nombra) y pide `leads_telefonos(telefono)`. La interfaz dice «teléfono extra», el
nombre del glosario, no «alterno».
**Decisión (la interfaz):** el cambio vive en `?panel=cambiar-telefono`, la misma clave que la edición:
no pueden estar abiertos a la vez, y aun así «Cambiar» se deshabilita con el motivo. No hace falta releer
la versión al abrir la edición: el cambio hace `revalidatePath` dentro de su action y la versión viaja en
la misma respuesta. Los extras no revalidan: la respuesta trae la lista (≤ 10 filas) y la pantalla la pone
en su lugar; el estado local se vuelve a sembrar sólo si cambian las props.
**Consecuencia:** una petición por acción. `puedeCambiarTelefonoDeLead()` (cartera y `leads.editar`) es
distinto de `puedeEditarLead()`. El humo prueba las cuatro RPC sin cartera, incluida la dueña con «todos»;
el e2e, la pantalla y la llamada a mano con su sesión.

## 2026-10-15 — El e2e completo parte de un reset, la guardia sólo comprueba las funciones, y el atajo de la pantalla gana

**Contexto:** la base local dejó de ser sagrada (decisión del dueño del proyecto: se pierden su cuenta,
sus leads de prueba, su layout y sus ajustes de Empresa, y los vuelve a crear) y no va a cargar una clave
real de apibara en desarrollo. Lo que la guardia de los e2e protegía (la clave y la fila de apibara, las
cuentas reales, los leads `E2E …`) ya no existe, y `empresa.spec` y cuatro pruebas del equipo vacío
quedaban fuera de lo que corría una persona con cuentas reales. **Reemplaza** a «La guardia de los e2e»
y a «La guardia de los e2e no respalda la base» (2026-10-14).
**Decisión (cómo se corre):** `pnpm test:e2e:completo` comprueba con `OPTIONS` que `apibara` y `storage-gc`
estén servidas, hace `db:reset` y corre todo con `E2E_COMPLETO=1`, que convierte en error las pruebas que
exigen el equipo vacío (antes se saltaban). Es lo que vale como «el e2e pasa». `pnpm test:e2e <spec>`
sigue corriendo un spec suelto sobre la base como esté, con datos.
**Decisión (la guardia):** queda una sola cosa: fallar en segundos, diciendo qué correr, si las funciones
edge no están servidas (`e2e/soporte/guardia.ts`, ~40 líneas en vez de ~120). Se retiran el respaldo en
disco de apibara, su reposición, el teardown que borraba los leads «E2E …» y el chequeo de la clave de
Vault; con el respaldo desaparece el riesgo de que uno viejo pisara un cambio hecho a mano. Los specs
siguen dejando limpio lo suyo (la empresa es una fila única y el spec que sigue la comparte).
**Decisión (apibara y credenciales):** la integración queda apagada y sin clave; todo lo de apibara se
prueba con `e2e/fixtures/apibara/` y la función interceptada. Ningún e2e lee ni guarda la clave real
(`empresa.spec` ya no pasa por `integracion_secreto`). Probarla con una clave real es un pendiente de
**antes de desplegar** (`docs/ESTADO.md`).
**Decisión (la intermitencia de móvil):** no era la transición de página ni se arregla con
`reducedMotion`: sin `ViewTransition` y con `reducedMotion: 'reduce'` seguía fallando. Un documento recién
pedido trae, unos 300 ms (el respiro con que React revela un Suspense), el contenido de cada frontera dos
veces: la copia visible y un `<div hidden id="S:n">`. Los locators de Playwright cuentan lo oculto y un
`getByText` estricto que cae en esa ventana falla sin reintentar. Para una persona no hay nada que ver, y
no hay código de la app que lo cause. La corrección es de las pruebas, una sola vez: `soporte/prueba.ts`
exporta el `test` con `goto` y `reload` que esperan a que no queden contenedores `S:` (los `<template
id="B:n">` no sirven: una frontera que se dibuja en el cliente deja el suyo para siempre). `retries`
sigue en 0.
**Decisión (un cambio de producto, el único):** esa espera dejó ver que, pasada la primera fracción de
segundo, la tecla `N` en el inventario abría «Nuevo lead» y no «Nuevo vehículo». `ProveedorAtajos`
responde el último registrado y el orden de registro es el de hidratación, no el del árbol: el alta de
leads del marco vive detrás de su propio Suspense y hidrata después de la pantalla. Antes los e2e
pulsaban demasiado pronto para verlo. `useAtajo` suma `{ respaldo }` (sólo responde si nadie más
registró el atajo) y el alta de leads registra así su `nuevo` mientras está cerrada. Commit propio.
**Costo de la opción elegida:** cada corrida completa borra los datos de desarrollo y la sesión de
`next dev`, y dura ~11 minutos (build, reset y 280 pruebas). **Una base de pruebas aparte** (un segundo
`supabase start` con otro `project_id` y otros puertos, y su `.env`) mantendría viva la de desarrollo a
cambio de ~1,8 GB más de RAM (medido: los 12 contenedores del stack actual suman 1.781 MiB, 575 sólo
`analytics`), unos seis puertos propios, ~1 minuto de arranque y una segunda configuración que mantener;
las imágenes se comparten. Conviene si la corrida completa pasa a ser diaria o si alguien más
desarrolla sobre la misma máquina. No hace falta todavía.

**Propuesta, sin aprobar — política de migraciones** (relaja «Migraciones sobre una base viva», 2026-10-14):
con `db:reset` disponible, una migración nueva **y sin commitear** se corrige en el archivo y se resetea;
ya no hace falta que sea idempotente (`if not exists`, bloques `do`) ni usar `supabase migration up` /
`migration repair`. **No cambia:** el esquema se edita en `supabase/schemas/`, se corre `pnpm db:base` y
se agrega una migración nueva; las ya commiteadas no se editan; `pnpm db:probar` prueba el camino desde
cero; un permiso o catálogo nuevo lleva su `insert … on conflict` en la misma migración (la nube no
vuelve a correr el seed); y el relleno de datos de una columna nueva sigue escrito para una base con
filas, porque la nube las tendrá. Desde el primer `db push` ninguna se corrige: se agrega otra.

**Aprobada (2026-10-15, en el pedido de la parte 5):** la política de migraciones de arriba queda vigente.

## 2026-10-15 — Seguimientos y recordatorios se escriben sólo por RPC, y actuar exige la cartera

**Contexto:** las policies directas tenían huecos que la ficha no decía. Con `leads.editar` «todos» se
anotaba en un lead ajeno sin estar en la cartera; el UPDATE de un seguimiento sólo pedía ser su autor,
así que dejaba moverlo a **cualquier** lead (también uno que no se ve), pasarlo a un tipo apagado o
«borrarlo» a mano. El de un recordatorio no miraba el lead y dejaba escribir `notificado_en`. El SELECT
de seguimientos dejaba a quien ve «todos» leer los privados de todos.
**Decisión:** las dos tablas quedan de sólo lectura para la app. Las escriben `seguimiento_crear|guardar|
eliminar|restaurar` y `recordatorio_crear|guardar|completar|eliminar|restaurar` (y `crear_lead`). Cada una
es idempotente por `p_id` generado en el cliente y la de edición pide `p_actualizado_en_esperado`. La
versión la sella la RPC con la hora del reloj (sin `trg_actualizado_en`). Actuar sobre un lead pasa por
`_lead_mio()`: `leads.ver`, `leads.editar` **y** la cartera. Cualquiera que falte, el limbo, la papelera o
un lead inexistente dan **el mismo** `42501` «No encontramos este lead o no tienes acceso.» (sin
oráculo). `_lead_de_cartera()` de la 4b no se reutilizó: su mensaje habla de teléfonos y distingue «lo ves
pero no es tuyo»; la parte 6 los unifica al auditar. Editar, eliminar y restaurar un seguimiento: sólo
su autor, y sólo con el lead en la cartera (si se la revocan, deja de poder corregirlo). Un recordatorio
es de su dueño: uno ajeno «no existe» (`No encontramos este recordatorio.`).
**Alternativas:** cerrar las policies con más condiciones (la lógica de tipo activo, fecha y cartera en
una `with check` no se lee ni se prueba bien); permitir editar a cualquiera de la cartera (un co-asesor
corrigiendo la nota de otro, sin rastro de quién dijo qué).
**Consecuencia:** el humo prueba las RPC sin cartera, con la dueña con «todos», en limbo, en la papelera e
inexistente, y que la escritura directa da `permission denied`; el e2e, la RPC llamada a mano con la sesión.

## 2026-10-15 — Privado es sólo de su autor; ni el co-asesor ni «todos» leen lo privado ajeno

**Decisión:** un seguimiento nace privado. Privado = sólo lo ve su autor; público («Visible para el
cliente», sin nombrar el portal) = lo ven quienes ven el lead y el portal. Se quitó el `or alcance =
'todos'` del SELECT: quien ve «todos» sin la cartera lee lo mismo que un co-asesor, como pasa con el
teléfono y los campos «solo la cartera». La pantalla no insinúa lo que no se ve: «Seguimientos» va sin
número, `lead_seguimientos()` no cuenta y la ficha no muestra «último seguimiento» (la fecha derivada
sigue en el lead, para la bandeja de «leads sin seguimiento»).
**Alternativas:** que «todos» lea los privados para supervisar (si hace falta, será un permiso propio y
explícito, no un efecto de `leads.ver`).

## 2026-10-15 — El detalle viaja como documento del editor, nunca como HTML

**Contexto:** una RPC es llamable sin pasar por la action: sanear sólo al escribir desde el servidor de
Next se evade. Postgres no tiene un parser de HTML (plv8 y plpython no están en Supabase) y un saneador
por expresiones regulares se esquiva (anidado, entidades, mutación del DOM).
**Decisión:** el editor (Tiptap) manda su documento (JSON de ProseMirror). La base lo valida contra una
lista blanca en plpgsql (`_seguimiento_detalle()`): nodos `doc`, `paragraph`, `text`, `hardBreak`,
`bulletList`, `orderedList` (sólo `start`) y `listItem`; marcas `bold`, `italic` y `link` (sólo `href`,
`http`, `https`, `mailto` o `tel`, sin espacios ni caracteres de control, ≤ 2000); profundidad ≤ 6 (dos
niveles de lista), ≤ 20 KB medido como lo escribe la base y ≤ 5000 caracteres de texto. Lo que no está
**se rechaza** (`22023`, hint `detalle`), no se recorta en silencio; un documento sin texto es «sin
detalle». La base deriva `detalle_texto` (búsqueda, portal y respaldo). La pantalla dibuja con la misma
lista y React (`DocumentoDeSeguimiento`), sin `innerHTML`; un enlace sale con `rel="noopener noreferrer
nofollow"` y `target="_blank"` sólo si es web; un nodo desconocido se dibuja como su texto, y un
documento que no pasa la lista cae al texto plano. `entities/documento.ts` es el espejo y un test corre
la función SQL en PGlite sobre la misma tabla de casos (`documento.casos.ts`). Se quitaron
`seguimientos.detalle_html`, `recordatorios.detalle_html` y la dependencia `sanitize-html`, que nadie
usaba; entró `seguimientos.detalle_doc`.
**Alternativas:** HTML saneado con `sanitize-html` en la action y otra vez al dibujar con DOMPurify (dos
saneadores que mantener y la RPC directa sin defensa); HTML más un `check` por regex en la base.
**Costo:** ~250 líneas de plpgsql, el espejo con su tabla de casos y el renderer. El alta sigue con su
textarea (no carga Tiptap ni cambia la tarea de oro): sus seguimientos se dibujan como texto y, al
editarlos, el editor arranca con un párrafo por línea.

## 2026-10-15 — El editor: carga diferida, atajos del marco y borrador en la pestaña

**Decisión:** Tiptap (`StarterKit` con encabezados, código, citas, tachado, subrayado y regla
apagados, y `Link` con la lista de protocolos) se pide con `next/dynamic` recién al abrir el redactor:
la ficha no lo paga para mostrar la línea de tiempo (medido: la ficha aporta 31,8 KB al documento, bajo el
tope de 40). El editor es un solo chunk de 388 KB (122 KB con gzip) que se pide al abrir el redactor:
**tope 130 KB con gzip**; si lo pasa, se cambia `StarterKit` por las extensiones sueltas. `Ctrl/Cmd+Enter` guarda (se le quitó a `hardBreak`; el salto es `Shift+Enter`) y `N` no se
dispara adentro (`ProveedorAtajos` ignora `isContentEditable`). El borrador va en `sessionStorage`
(`useBorradorDeEstado`), por lead al anotar y por seguimiento al editar: sobrevive a recargar y a
cambiar de pantalla, no a cerrar la pestaña, como el resto de los formularios; una nota privada no
queda en un equipo compartido. Con un borrador, el redactor arranca abierto (se mira una sola vez al
montar: releerlo mientras se repone lo cerraba). Anotar y editar son en línea, sin `?panel=` (como los
teléfonos extra): no chocan con el panel de edición de los datos.

## 2026-10-15 — Recordatorios: crear exige la cartera; si se pierde el lead, sigue sin él

**Decisión:** crear uno sobre un lead exige tenerlo en la cartera (`recordatorio_crear` acepta también
uno sin lead, personal, para la agenda de la Fase 7). Si después se pierde el acceso, el recordatorio
sigue siendo de su dueño y `recordatorios_vista` (invoker) lo entrega con el lead nulo; lo puede editar,
completar y eliminar igual. Completar es «poner» (`p_completado`): repetirlo es `sin_cambios`, `false`
lo reabre. Cambiar la hora exige que sea futura y le pone `notificado_en = null` para que vuelva a
avisar; cambiar sólo el título de uno que ya pasó no pide otra hora. Eliminar es lógico
(`recordatorios.eliminado_en`) con «Deshacer». La ficha lee los vencidos propios en `lead_ficha()`
(`recordatorios_vencidos`, sin otra lectura) y los avisa arriba. Un seguimiento puede llevar su
recordatorio en la misma transacción, como el alta.
**Fuera de esta parte:** el disparo a su hora (`recordatorios_notificar()` existe y nunca se programó) y el
push (Fase 7); que esa notificación no nombre un lead que su dueño ya no ve.

## 2026-10-15 — Un seguimiento no mueve la versión del lead; la actividad deja constancia sin contenido

**Decisión:** `ultimo_seguimiento_en` sigue fuera de `lead_version()`, y su trigger corre sólo si
cambian `ocurrido_en`, `eliminado_en` o `lead_id` (antes reescribía la fila del lead al corregir un
título). Es el máximo de los vivos: eliminar el último lo devuelve al anterior. Los seguimientos dejan
`lead.seguimiento_creado|editado|eliminado|restaurado` con `{seguimiento, tipo, visibilidad}`, sin título
ni detalle; pasar a «Visible para el cliente» queda en el `editado`. Recordatorios, favoritos, tachados y
etiquetas no dejan nada. `ocurrido_en` puede ser pasado, no futuro (5 minutos de margen por los relojes;
la pantalla no da margen). El humo y el e2e prueban que anotar con la edición abierta en otra pestaña
no da conflicto.

## 2026-10-15 — Parte 5 partida en 5a y 5b; el diseño de la 5b

**Decisión:** la 5a (seguimientos y recordatorios) se hizo en esta sesión; la 5b (favoritos, tachados
y etiquetas, con el listado y la medición) va en la siguiente, con lo ya decidido:

- **Dónde:** cabecera de la ficha y un menú «⋯» por fila (en el celular la tarjeta separa la zona que
  abre el drawer del botón del menú). El drawer muestra el estado, sin acciones.
- **Filtros:** `DefFiltro` suma una `seccion` («Tus marcas», con «Solo las ves tú», arriba; «Datos del
  lead» debajo, donde queda el campo propio `a.tachado` con su etiqueta) y un tipo `eleccion` con valor
  por defecto que no se escribe en la URL: `?tachados=` `ocultar` (por defecto) · `incluir` · `solo`;
  `?favoritos=si`; `?etiqueta=<id>,<id>` («cualquiera de»). Entran solos en las vistas guardadas; «ver
  como» no los toca (son de quien mira de verdad).
- **Orden:** ni favoritos ni tachados reordenan (el keyset `(creado_en, id)` no cambia); «el tachado va
  al final» se reemplaza por «oculto por defecto».
- **Etiquetas:** nombre 1 a 30, hasta 50 por persona y 20 por lead, `unique (usuario_id,
lower(nombre))`, color de una paleta cerrada guardado como clave, `actualizado_en`, y borrar una con
  leads pide confirmar diciendo a cuántos toca.
- **RPC:** `poner(valor)`, no alternar; exigen **ver** el lead (no la cartera), y lo que no se ve
  responde como inexistente.
- **Medición:** `supabase/tests/medir-listado.sql` committeado, con 2.000 leads sintéticos.

## 2026-10-15 — Un corte del runtime local de funciones se vuelve a pedir, con una sola regla

**Contexto:** en una corrida completa, `vehiculos-apibara-funcion.spec.ts` falló en móvil porque la
segunda de dos llamadas volvió con `data: null`. El registro del runtime dijo `connection aborted` a los
35 ms y el gateway contestó 503 sin cuerpo: la función nunca respondió. La guardia ya toleraba ese
corte con su propio bucle; el spec no.
**Decisión:** `e2e/soporte/funciones.ts` (`pedirAFuncion`) es la única definición de «sin respuesta» (el
pedido no llegó, o el gateway contestó 502, 503 o 504 **sin cuerpo**) y de la espera entre intentos (0,5
s). La usan la guardia y el spec. Hasta 3 intentos (la guardia, 4), nunca ante una respuesta de la
función (las nuestras contestan siempre con un cuerpo), una línea `[funciones] reintento: …` por cada
reintento en la salida, y «la función no respondió» si se agotan. El spec llama con `fetch` y el token de
la sesión en vez de `functions.invoke`, que escondía el corte como `data: null`.
**Consecuencia:** la guardia ya no insiste ante un 404 (la función no está servida): falla al primero.

## 2026-10-15 — Las marcas se escriben sólo por RPC, y marcar exige ver el lead (no la cartera)

**Contexto:** favoritos, tachados y etiquetas se escribían directo con RLS: el UPDATE de `etiquetas` dejaba
cualquier nombre o color (un hex libre), sin tope, sin versión y con un `unique (usuario_id, nombre)`
que distinguía mayúsculas.
**Decisión:** las cuatro tablas quedan de sólo lectura (cada quien las suyas) y las escriben seis RPC
(`…20261015000200_marcas_de_leads.sql`). `lead_favorito_poner`, `lead_tachado_poner` y
`lead_etiquetas_poner` son **«poner(valor)»**: repetir da `sin_cambios`, así un doble clic o un reintento
no deja la marca al revés. Exigen **ver** el lead (`_lead_visible()`: `puede_lead(…, 'leads.ver')`), no la
cartera ni `leads.editar`: una marca es una nota para uno mismo, no un cambio del lead, y quien ve
«todos» también organiza lo ajeno. Lo que no se ve da el mismo `42501` que un lead inexistente,
**también al quitar** (la marca sigue en la tabla, es suya, y el lead no aparece). Las marcas no llevan
versión (operan por fila, como los teléfonos extra: una versión sólo daría conflictos falsos) y no
tocan `leads` (ni versión, ni auditoría, ni `actividad`). Las etiquetas sí llevan versión al
renombrar, recolorear y eliminar (`PT409` «Cambiaste esta etiqueta … desde otra ventana»); crear es
idempotente por id (así «Deshacer» de un borrado la recrea con el mismo id) y eliminar una que ya no
está responde `sin_cambios` (la otra pestaña no falla y lo ajeno no se distingue de lo borrado). Una
etiqueta ajena o inexistente se rechaza igual: nunca se dice que existe. `lead_etiquetas_poner` pone o
quita **esas**, nunca reemplaza el conjunto: dos pestañas no se pisan.
**Topes:** 50 por persona y 20 suyas por lead, con un candado de transacción **por persona**
(`pg_advisory_xact_lock(hashtextextended('etiquetas:' || uid, 0))`) que toman crear, eliminar y poner:
no compite con nadie más. Bloquear `perfiles` frenaría la edición del perfil y bloquear el lead, a los
otros asesores. La carrera la prueba un e2e (dos RPC a la vez a una del tope: entra exactamente una),
porque PGlite no tiene concurrencia.
**Índices:** no faltaba ninguno: el bucle de `…000900_indices.sql` ya había creado los de `usuario_id` y
`etiqueta_id` (ESTADO decía lo contrario). Un `(usuario_id, lead_id)` compuesto se midió y no mejora.

## 2026-10-15 — El listado lee las marcas como columnas de `leads_vista`; lo que midió

**Contexto:** el listado necesita, por fila, si quien mira lo marcó, y filtrar por eso, sin degradarse.
**Decisión:** columnas en la vista: `es_favorito` y `esta_tachado` ya existían (un `exists` por fila) y se
suma `etiquetas uuid[]` (las de quien mira). Los filtros son condiciones sobre ellas (`eq`, y
`overlaps` para «cualquiera de»). El plan las resuelve como _hashed SubPlan_: una lectura de las
marcas de la persona por consulta, no una por fila. Los nombres y colores de las etiquetas no viajan
por fila: la página lee una vez las de la persona (≤ 50).
**Alternativas medidas:** la semiunión explícita (`id in (select lead_id …)`) dio 20,4 ms contra 19,2 de la
columna y PostgREST no la expresa sobre la vista; una consulta aparte con los ids de la página sirve
para dibujar pero no para filtrar (ocultar los tachados tiene que ser en la base); una función que
recorte una vez por consulta es el cambio de la Fase 9, y estos números no lo piden.
**Números** (`pnpm db:medir`, 2.000 leads, mediana de 5; «antes» sin marcas, «hoy» como lo pide el listado):

| Consulta                                        | Antes  | Hoy         |
| ----------------------------------------------- | ------ | ----------- |
| Página sin filtro (hoy, tachados fuera)         | 19 ms  | 20 ms       |
| Un atributo                                     | 126 ms | 127 ms      |
| Búsqueda por nombre                             | 21 ms  | 22 ms       |
| Página 2 por cursor                             | 31 ms  | 33 ms       |
| Asesor «propios» (50 de 2.000)                  | 7 ms   | 8 ms        |
| Etiqueta «cualquiera de» 2                      | —      | 14 ms       |
| Conteo de ocultos sin filtros / con un atributo | —      | 12 / 119 ms |

En una de tres corridas el planificador eligió recorrer `leads_listado_idx` en orden y cortar en 51 (8 ms
la página, 22 ms con un atributo): depende de sus estimaciones y no se fuerza. La medición queda en
`supabase/tests/medir-listado.sql`, en una transacción revertida (deja huecos en la numeración).

## 2026-10-15 — Los tachados se ocultan, salvo mientras se busca; el aviso cuenta con los mismos filtros

**Decisión:** `?tachados=` es una «elección» con `ocultar` por defecto (no se escribe en la URL), `incluir` y
`solo`. **Con texto de búsqueda (nombre o `#número`) `ocultar` no se aplica:** buscar algo que sabes
que existe y no encontrarlo es peor que verlo, y sale con la insignia «Tachado» y el nombre atenuado;
`solo` explícito sí se respeta. Un aviso discreto cuenta los tachados **que cumplen los filtros
activos** y que quien mira ve (la RLS), así «Mostrarlos» trae exactamente esa cantidad; contar sin
filtros mentiría. Corre en paralelo con la página: sin un atributo suma 12 ms de trabajo y nada de
espera; con uno, la base hace el doble de trabajo pero la espera es la misma. Si la página queda vacía
sólo por los tachados, el vacío lo dice («Lo que coincide está tachado») en vez de «Nada coincide».
**Vistas y URL:** los filtros de marcas entran solos en las vistas guardadas (`parametrosDeFiltros()`),
que son personales (las cuatro policies de `vistas_guardadas` son `usuario_id = (select auth.uid())`):
una etiqueta ajena en una vista no puede pasar, y aunque pasara no filtraría nada (la columna sólo
trae las propias). Un id de `?etiqueta=` que ya no es de quien mira (borrado, ajeno o mal escrito) se
quita y lo dice el aviso de filtros que ya no valen, con «Entendido», que deja las que sí valen. Un
valor raro en `?tachados=` o `?favoritos=` vuelve al valor por defecto **sin decir nada**, como tipo y
origen. «Ver como» no los toca: son de quien mira de verdad.

## 2026-10-15 — Paleta de ocho claves en tokens; selector con cmdk; confirmar en la fila; sin atajo

- **Paleta:** `gris`, `rojo`, `naranja`, `ambar`, `verde`, `turquesa`, `azul`, `violeta`, guardadas como clave
  (check en la tabla, `_etiquetas_paleta()` y `CLAVES_DE_COLOR`: un test compara los tres). Cada una
  tiene `--etiqueta-<clave>` (el punto), `-soft` (el fondo) e `-ink` (el texto) en `design/tokens.css`,
  redefinidos en `.dark`; un test exige ≥ 4,5:1 de `-ink` sobre `-soft` en los dos temas. El nombre se ve
  siempre: nunca sólo el color. Ocho se distinguen sin depender del color; más no aportan. Sin elegir,
  toca la menos usada (la base lo decide, `colorSugerido()` es su espejo).
- **Dónde:** el selector (Popover con cmdk: buscar, marcar y crear con Enter; las coincidencias primero y
  «Crear «X»» al final, así Enter sobre lo que existe la marca y sobre algo nuevo la crea) está en la
  cabecera de la ficha y lo abre «Etiquetas…» del «⋯» de cada fila, anclado al mismo botón
  (`PopoverContent anchor`). «Gestionar etiquetas» es un diálogo con URL (`?panel=etiquetas`) que se abre
  desde el selector y desde la sección «Tus marcas» del panel; en el celular reemplaza la hoja de
  filtros (comparten `?panel=`). Eliminar una etiqueta con leads **confirma en la misma fila** diciendo a
  cuántos toca: un `<Confirmar>` sería un modal sobre otro. Sin leads se elimina y se ofrece «Deshacer».
- **Accesibilidad:** «Favorito» y «Tachado» son interruptores con `aria-pressed` y nombre fijo; el «⋯» es
  el menú de base-ui (Enter, flechas, Esc), 44 px en el celular, y en la tarjeta es hermano de la zona
  que abre el drawer. **Sin atajo para favorito:** no habría dónde descubrirlo (la lista `?` no se
  dibuja) y la estrella está a un Tab; se reconsidera con esa lista. Nada roba la `N`.
- **Filtros con secciones:** `DefFiltro` suma `seccion` y el tipo `eleccion` (con `porDefecto`, que no va a
  la URL, no es chip ni cuenta); sin secciones el panel sigue plano, así vehículos no cambió.
- **El listado se relee al volver a la pestaña** (como la ficha): lo marcado en otra pestaña aparece sin
  recargar a mano.

## 2026-10-15 — Parte 6a: toda RPC que recibe un lead cae en una de tres clases

**Contexto:** la 4b y la 5a cerraron el hueco «actuar sobre un lead ajeno con `leads.editar` “todos” sin la
cartera» sólo en las RPC que tocaban esas partes; el resto seguía con `puede_lead(…, 'leads.editar')`, que
con «todos» no pide cartera, y `leads.compartir` ni siquiera tenía alcance. Esta parte lee la definición
**vigente** de cada función (`pg_get_functiondef`), cada policy y cada grant, y los clasifica.
**Decisión:** tres clases, y toda RPC de leads cae en una (más dos que no mueven nada):

1. **Contenido y datos privados** (editar, teléfonos, seguimientos, recordatorios con lead, portal, vínculo a
   vehículos, interesados): exige la **cartera y** el permiso, con cualquier alcance. «Todos» ve y no actúa.
2. **Quién lo tiene** (compartir, transferir, quitar acceso, salir): lo hace el dueño; con el permiso en
   «todos», también quien lo ve (la supervisión). **Nadie se concede acceso a sí mismo** a un lead que no tiene:
   ni como destino de transferir, ni de compartir. El destino es una persona activa, no bloqueada y con
   `leads.ver`. Un compartido puede salirse y no más; al dueño no se le quita, se transfiere; nadie deja un
   lead sin ninguna persona. Compartir y quitar son idempotentes; transferir lleva `p_dueno_esperado`.
3. **Papelera** (enviar, restaurar, purgar): vale el permiso con su alcance y no abre datos privados.

- **L, lecturas:** ver alcanza y la base recorta (privados, teléfono). **M, lo de quien mira:** marcas y
  recordatorios propios; ver alcanza (5b).
- **X, excepciones con nombre:** `crear_lead` con `adoptar` (la única autoconcesión válida: exige aceptarla
  y deja de dueño), `web_confirmar_contacto` (sólo anota a qué lead corresponde una solicitud: ver alcanza),
  `cotizacion_marcar_final` (Fase 4), y lo de administración o configuración que sólo cuenta
  (`equipo_dar_de_baja`, `equipo_vista_previa_baja`, `lead_campo_impacto`, `empresa_con_datos_cargados`).

**Una sola puerta por clase.** `puede_lead()` queda como estaba y sólo para **leer** (`leads.ver`: es lo
que usan las policies de lectura). Para actuar: `puede_actuar_lead(p_lead, p_clave)` (lo ve, está en la
cartera y la persona tiene el permiso con cualquier alcance) y `_lead_mio(p_lead, p_clave, p_bloquear)`
(levanta el `42501` de siempre), que **reemplaza** a `_lead_de_cartera()` (4b) y a `_lead_mio(uuid)` (5a):
un solo mensaje —«No encontramos este lead o no tienes acceso.»— para lo que no se ve, el limbo, la papelera,
lo inexistente, lo ajeno y «lo veo pero no es mío». La clase 2 va por `_lead_para_mover()` (visible,
`for update`, sin mover la versión).

### La auditoría

Leída contra la base viva, no contra los archivos. «Antes» es lo que exigía; «Ahora», lo que exige.

| Objeto                                                                                                                                                                                                                                         | Clase   | Antes                                                                                                                         | Ahora                                                                                                       | ¿Cambió?             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------- |
| `lead_guardar`                                                                                                                                                                                                                                 | 1       | ver + `editar` con alcance: «todos» sin cartera editaba lo no privado                                                         | cartera + `editar`                                                                                          | **sí**               |
| `cambiar_telefono_lead`, `lead_telefono_guardar`, `lead_telefono_quitar`, `verificar_telefono_de_lead`                                                                                                                                         | 1       | cartera + `editar` (mensaje propio: «Sólo quien tiene este lead en su cartera…»)                                              | cartera + `editar`, mensaje de siempre                                                                      | mensaje              |
| `seguimiento_crear                                                                                                                                                                                                                             | guardar | eliminar                                                                                                                      | restaurar`, `recordatorio_crear`(+`_seguimiento_mio`, `_lead_mio`)                                          | 1                    | `_lead_mio(uuid)` / `puede_lead` + `en_cartera`                                                                                                                                                                                                                   | `_lead_mio(…)` / `puede_actuar_lead`                                                                | no (misma regla, una puerta) |
| `otorgar_portal`, `revocar_portal`                                                                                                                                                                                                             | 1       | `puede_lead(portal.gestionar)`: «todos» sin cartera; «Sin acceso al lead.»                                                    | cartera + `portal.gestionar`; mensaje de siempre; revocar lo que no está vigente no deja constancia         | **sí**               |
| `vehiculo_vincular`                                                                                                                                                                                                                            | 1       | `vehiculos.editar` + `puede_lead(editar)`                                                                                     | + cartera del lead; desvincular sigue siendo del vehículo                                                   | **sí**               |
| `vehiculo_interesado_marcar`                                                                                                                                                                                                                   | 1       | ver el vehículo + `puede_lead(editar)`                                                                                        | ver el vehículo + cartera + `editar`                                                                        | **sí**               |
| `vehiculo_interesado_quitar`                                                                                                                                                                                                                   | 1       | `puede_lead(editar)`, ni miraba el vehículo                                                                                   | ver el vehículo + cartera + `editar`                                                                        | **sí**               |
| `oportunidades` INSERT / UPDATE                                                                                                                                                                                                                | 1       | INSERT con `puede_lead(editar)`; UPDATE con `usuario_id = uid` **sin mirar el lead** (a cualquier lead)                       | sin grant: la parte 7 trae sus RPC                                                                          | **sí**               |
| `compartir_lead` → `lead_compartir`                                                                                                                                                                                                            | 2       | `leads.compartir` (sin alcance) + cartera o `editar` «todos»; destino sin mirar; lead inexistente = `23503`; sacaba del limbo | dueño, o «todos»; destino válido; nunca a sí mismo; `sin_cambios`; sin oráculo                              | **sí** (firma nueva) |
| `transferir_lead` → `lead_transferir`                                                                                                                                                                                                          | 2       | dueño o «todos»; sin mirar existencia, limbo, papelera ni el destino; adoptaba del limbo sin «Tomar lead»                     | dueño, o «todos»; `p_dueno_esperado` (`PT409`); nunca a sí mismo; saliente compartido                       | **sí** (firma nueva) |
| `revocar_acceso_lead` → `lead_revocar_acceso`                                                                                                                                                                                                  | 2       | sólo `leads.compartir`: **cualquier asesor quitaba el acceso de cualquiera a cualquier lead**; sin constancia                 | dueño, o «todos»; al dueño no; no deja el lead sin nadie; constancia                                        | **sí** (firma nueva) |
| `lead_salir`                                                                                                                                                                                                                                   | 2       | no existía                                                                                                                    | un compartido se quita a sí mismo                                                                           | nueva                |
| `lead_cartera`, `lead_cartera_candidatos`                                                                                                                                                                                                      | L       | no existían (`leads_asesores` sólo mostraba al dueño a la supervisión)                                                        | nombres y tipo de acceso, sin contacto; candidatos sin quien mira                                           | nuevas               |
| `leads_papelera_enviar                                                                                                                                                                                                                         | listar  | restaurar                                                                                                                     | purgar`                                                                                                     | 3                    | las genéricas `papelera_*('leads')`: sin versión, el uuid en el mensaje, restaurar con el teléfono tomado daba `23505` y abortaba el lote, enviar no revocaba el portal, purgar prestado de `vehiculos.papelera.purgar`, **los leads no se purgaban nunca solos** | propias; todo o nada; lote del cliente; versión del lote; `leads.papelera.purgar`; el job las purga | **sí**                       |
| `papelera_enviar                                                                                                                                                                                                                               | listar  | restaurar                                                                                                                     | purgar`                                                                                                     | 3                    | vehículos, leads y cotizaciones                                                                                                                                                                                                                                   | sólo cotizaciones (rechazan `leads` y `vehiculos`)                                                  | **sí**                       |
| `papelera_purgar_vencidos`                                                                                                                                                                                                                     | 3       | sólo vehículos                                                                                                                | vehículos y leads, la misma función que la manual                                                           | **sí**               |
| policy `lotes_papelera: leer`                                                                                                                                                                                                                  | 3       | el creador o `vehiculos.papelera.purgar`                                                                                      | el creador o el permiso de su tipo (`leads.papelera.purgar` para leads)                                     | **sí**               |
| `lead_ficha`, `lead_telefonos`, `telefono_lead`, `atributos_lead`, `lead_seguimientos`, `leads_vista`, `en_cartera`, `lead_en_limbo`, `puede_lead`, `mis_leads`, `vehiculo_vinculos`, `vehiculo_interesados`                                   | L       | ver; la base recorta                                                                                                          | igual (`lead_seguimientos` pregunta `editar` sólo para decir si «puede»; el cinturón lo tiene en una lista) | no                   |
| `lead_favorito                                                                                                                                                                                                                                 | tachado | etiquetas_poner`, `etiqueta_*`, `recordatorio_guardar                                                                         | completar                                                                                                   | eliminar             | restaurar`                                                                                                                                                                                                                                                        | M                                                                                                   | ver / ser su dueño           | igual | no  |
| `web_confirmar_contacto`                                                                                                                                                                                                                       | X       | `puede_lead(ver)`, «Sin acceso al lead.»                                                                                      | igual                                                                                                       | no                   |
| `cotizacion_marcar_final`                                                                                                                                                                                                                      | X       | no mira el lead ni la papelera                                                                                                | igual (Fase 4)                                                                                              | no                   |
| `crear_lead`                                                                                                                                                                                                                                   | X       | adopta del limbo con `adoptar: true`                                                                                          | igual                                                                                                       | no                   |
| policy `accesos_portal: leer`                                                                                                                                                                                                                  | 1       | `puede_lead(portal.gestionar)`: «todos» leía el **código** de cualquiera (las columnas sí tenían grant)                       | `puede_actuar_lead(portal.gestionar)`                                                                       | **sí**               |
| `cotizaciones` INSERT                                                                                                                                                                                                                          | ✗       | `lead_id` de cualquier lead                                                                                                   | `lead_id` nulo o un lead que se ve                                                                          | **sí**               |
| `cotizaciones` UPDATE de `lead_id`                                                                                                                                                                                                             | ✗       | de cualquier lead: la cotización le aparecía a su cartera                                                                     | sin grant de columna: sólo al crearla; después, la RPC de la Fase 4                                         | **sí**               |
| funciones de trigger de las tablas de leads (`lead_crear_dueno`, `lead_validar_atributos`, `lead_version`, `oportunidad_historial`, `seguimiento_actualizar_lead`, `vehiculo_vinculo_historial`, `auditar`, `set_actualizado_en`…)             | —       | `execute` para `authenticated` (por omisión)                                                                                  | sin `execute`                                                                                               | **sí**               |
| `leads`, `leads_asesores`, `leads_telefonos`, `leads_favoritos`, `leads_tachados`, `etiquetas`, `leads_etiquetas`, `seguimientos`, `recordatorios`, `vehiculos_interesados`, `vehiculos_vinculos`, `lotes_papelera`, `oportunidades_historial` | —       | sólo SELECT para `authenticated`                                                                                              | igual                                                                                                       | no                   |
| `web.portal_*`                                                                                                                                                                                                                                 | —       | sólo `service_role`                                                                                                           | igual (parte 7)                                                                                             | no                   |

**Lo que resultó falso o más grave de lo que se creía:**

- Los mensajes de `revocar_acceso_lead` ya no hablaban de vos (la migración de la 3 los había reemplazado).
- `leads.compartir` **no tiene alcance** y el Asesor lo trae: el hueco no era «“todos” sin cartera» sino «cualquier
  asesor». Por eso ahora lo tiene («propios» = los leads de los que soy dueño; «todos» = supervisión), y la
  migración baja a «propios» a quien no ve «todos».
- Un lead sin dueño y con un compartido (tras una baja) no se rescataba: lo transfiere la supervisión con
  `p_dueno_esperado` nulo. `equipo_dar_de_baja` no cambia: el limbo sólo nace de una baja.
- `mis_leads()` no filtra la papelera: un lead enviado con un vehículo vinculado le seguía dando el vehículo a su
  cartera. Por eso un vehículo vinculado **impide** enviar el lead.
- La policy `accesos_portal: leer` no estaba muerta: tenía grants de columnas.

### Decisiones concretas y su porqué

- **`leads.papelera.purgar`, propio.** `vehiculos.papelera.purgar` gobernaba también la papelera de leads: quien
  vaciaba la de vehículos veía los nombres de todos los leads. La migración se lo da a quien ya tenía el otro,
  y el dueño lo trae por el seed.
- **Editar pide la cartera** (clase 1): la dueña con «todos» **deja de editar** el nombre, el tipo y el origen de
  un lead ajeno. Es lo que se decidió para el contenido en 4b y 5a, ahora para todo. «Editar» desaparece para
  ella, y con él el aviso «Los datos “solo la cartera” no se muestran…».
- **Desvincular un vehículo no pide el lead** (`vehiculo_vincular(…, null)`): es una acción sobre el vehículo y no
  entrega nada del lead; pedirle cartera dejaría a la supervisión de inventario sin poder corregir un vínculo
  equivocado. Vincular sí lo pide: es darle el vehículo a esa cartera.
- **`oportunidades` sin escritura directa y `cotizaciones.lead_id` sin UPDATE** en vez de endurecer policies: la
  lógica de lead visible + cartera + tipo en un `with check` no se lee ni se prueba bien, y ninguna pantalla las
  usa todavía; las RPC de la 7 y la Fase 4 las traen.
- **Nombres:** `lead_compartir`, `lead_transferir`, `lead_revocar_acceso`, `lead_salir`, `lead_cartera`,
  `lead_cartera_candidatos` (la convención desde la 4a). Las firmas viejas se `drop`ean: una que sobrevive con
  otros parámetros sigue llamable como sobrecarga, y el cinturón la detecta.
- **«Quién lo tiene» sale de `lead_cartera()` y no de abrir la policy de `leads_asesores`:** la policy sigue
  siendo la red para lo demás, y la función entrega nombres y tipo de acceso y nada de contacto.

### El cinturón y la matriz

- **`supabase/tests/auditoria-leads.sql`** (corre en `pnpm db:probar`, después del humo y de la matriz) lee el
  catálogo: toda función `security definer` que `authenticated` puede llamar y que recibe un lead (`p_lead`,
  `p_leads`, `lead_id`… o de tipo `leads`) **o** que nombra una tabla de leads en su cuerpo, tiene que estar en
  su lista con su clase. Falla además si: una de la lista no existe o tiene sobrecargas; una de clase 1, 2 o 3
  con `p_lead` no pasó por la matriz; una función o policy pregunta `puede_lead()` con un permiso que no es
  `leads.ver`; `authenticated` puede escribir una tabla de leads; una función de trigger de esas tablas, o una
  función de leads, la llama `anon`; o una `security definer` no fija `search_path`.
- **`supabase/tests/matriz-leads.sql`:** cada RPC × siete personas (dueño, compartido, supervisión sin cartera,
  asesor ajeno, sólo ve, dada de baja, bloqueado) × cinco leads (propio, ajeno, limbo, papelera, inexistente),
  805 celdas, cada una en su subtransacción. Prueba que lo que no se ve da el mismo mensaje.
- **Se probó que atrapan:** con `otorgar_portal` vuelto a `puede_lead(…, 'leads.portal.gestionar')` la matriz
  falló en 32 celdas; con una RPC `lead_dummy(p_lead)` el cinturón falló nombrándola.

**Alternativas:** forzar las excepciones a una de las tres clases (cambiaba reglas ya decididas, como «marcar
exige ver»); cambiar el significado de `puede_lead()` (lo usan las policies de lectura y el listado, medidos);
un `db:lint` a mano de cada RPC nueva (no escala: una RPC que se olvida se vuelve a abrir).
**Consecuencia:** una RPC de leads nueva rompe `db:probar` hasta que se audita y entra a la lista (y a la matriz).

## 2026-10-15 — La papelera de leads: todo o nada, el lote lo genera el cliente, y lo vinculado no entra

**Contexto:** `papelera_*('leads')` copiaba la de cotizaciones: sin versión, sin motivos legibles, restaurar
con el teléfono ya tomado abortaba con `23505` crudo, enviar no tocaba el portal y la purga automática sólo
miraba vehículos (un lead en la papelera guardaba su teléfono y sus privados para siempre).
**Decisión:**

- **Enviar** (`leads_papelera_enviar(p_lote, p_leads)`): de 1 a 200, **todo o nada** (un lead que no se ve o no
  se puede deja todo como estaba y no deja lote huérfano; el mensaje no dice cuál falló: sería un oráculo),
  **idempotente por `p_lote`**, que genera el cliente y conserva hasta que el envío termina. Sin versión por lead:
  no pisa nada y la versión de cada uno rechazaría un lote entero porque alguien anotó un dato (vehículos sí la
  lleva, por elemento: allí el resultado es parcial). Mueve la versión del lead (ya estaba decidido).
- **Portal y oportunidades:** se revoca el portal vigente al enviar y se dice; las oportunidades quedan (son de
  la 7). Restaurar **no** reabre el portal.
- **Un vehículo vinculado impide enviar** (y purgar): con el lead en la papelera, `mis_leads()` seguiría dándole el
  vehículo a su cartera. Hasta la 6b no hay botón para desvincular desde el lead; el rechazo lo dice y la
  pantalla no lo adelanta (el patrón de la papelera es «hacer y deshacer», sin diálogo previo).
- **Restaurar** (por lote o por lead, con la versión del lote): lo que choca con un teléfono vivo **queda
  adentro con el motivo**, que usa la regla de `_lead_verificar` (a quien ve el otro lead, cuál es; a quien no,
  de quién) y no ofrece cambiar el teléfono desde la papelera: sería editar un lead que nadie ve.
- **Purgar** (`leads.papelera.purgar`): no se lleva un lead con vehículo vinculado, pagos o el portal vigente
  (dinero y vínculo, como en vehículos); el resto se limpia por cascada (teléfonos, cartera, marcas,
  seguimientos, recordatorios, oportunidades, interesados y el historial de vínculos). `actividad` queda, sin
  datos. El job `papelera_purgar_vencidos()` llama a la misma `_papelera_purgar_leads()` a los `papelera_dias`.
- **Quién la ve:** quien envió el lote, o quien tiene `leads.papelera.purgar`. El nombre y el número del lead sólo
  salen por `leads_papelera_listar()` y sólo a esas personas; nunca teléfono ni privados.
- **`leads.eliminar` «propios» es el dueño**, no cualquiera de la cartera: un compartido no debería poder tirar
  el lead de otro; puede salir.
  **Consecuencia:** la papelera de un lead con un vehículo vinculado pide desvincular antes (6b).

## 2026-10-15 — El documento de la ficha pasa de 40 a 48 KB

**Contexto:** el e2e que mide la ficha (`leads-ficha.spec.ts`) fijó en 40 KB lo que el documento suma al shell
cuando la ficha pesaba ~29 KB. Con las marcas, los seguimientos, «Quién lo tiene» (con sus dos paneles y el
diálogo de salir) y el «⋯» de la papelera, aporta ~42 KB.
**Decisión:** el tope del documento pasa a 48 KB; el de lo que viaja al navegar desde el listado sigue en 40 KB
(33 KB hoy). No se recortó nada: el crecimiento es de funciones nuevas, y el aporte de cada una es pequeño
(el menú ~0,7 KB). Si vuelve a pasar, lo que cabe es sacar los paneles a una carga diferida (`next/dynamic`).

## 2026-10-15 — Lo que dejó la revisión de la 6a: carreras, `lead_id` en otras tablas y un cinturón más ancho

**Contexto:** una revisión adversarial de la parte (sin editar) encontró tres cosas que valía corregir.
**Decisión:**

- **Autorizar, bloquear y volver a autorizar.** `_lead_mio()`, `_lead_para_mover()` y `leads_papelera_enviar()`
  miraban el permiso antes de tomar el `for update` y no volvían a mirar: quien esperaba el lock mientras le
  quitaban la cartera (o le transferían el lead) escribía igual al despertar. Ahora, con el lead bloqueado, se
  vuelve a preguntar `puede_actuar_lead()` / el dueño sobre lo confirmado (cada sentencia nueva ve el commit).
  En `_lead_mio` la primera pregunta se conserva: no se regala un lock a quien no ve el lead. PGlite no tiene
  concurrencia: lo cubre la lectura y el cinturón no puede probarlo; un e2e con dos sesiones queda como deuda.
- **Un reintento con el mismo lote y otros leads se rechaza** (antes devolvía «repetido» sin enviar nada).
- **`lead_id` en `pagos`, `tareas`, `eventos`, `mensajes`, `repuestos_proyectos` y `web_testimonios`** se
  escribía con el de cualquier lead, lo viera o no: le impedía purgarse al lead (los pagos bloquean) y el error de
  la FK decía si existía. Un trigger común (`lead_visible_al_escribir`) exige ver el lead, con el mensaje de
  siempre, antes de la FK y de la RLS; sin sesión (job, servicio, web pública) no mira. Se eligió el trigger y
  no una policy por tabla: son seis tablas de fases que todavía no tienen pantalla y una regla única se prueba
  una vez. El cinturón exige que toda tabla con FK a `leads` que la app escribe lo tenga.
- **El cinturón mira más:** también las funciones de invocador que reciben un lead, las tablas de pagos,
  tareas, eventos, mensajes y cotizaciones en el cuerpo de una «definer», los permisos de acción de leads
  preguntados con `alcance_de()` o `tiene_permiso()` en una policy, y la escritura directa sobre `leads`.
- **Documentado, sin cambio:** purgar un lead desprende (`on delete set null`) sus cotizaciones, agenda, chat,
  logística, repuestos y solicitudes web: quedan sin lead. Un lead en limbo no se envía a la papelera ni con
  `leads.eliminar` «todos» (no se ve: se reasigna o se adopta primero). `leads_papelera_listar()` recorre todos
  los lotes visibles; con miles, medirlo en la Fase 9 (`pnpm db:medir`).
- **Rechazado de la revisión:** que `infra/cartera.client.ts` sea una excepción sin registrar. Leer desde el
  navegador con la sesión de quien mira ya es el patrón de `lead-rapido.client.ts` y `etiquetas.client.ts`:
  `*.client.ts` es para lecturas de navegador, no sólo para realtime.

## 2026-10-15 — Parte 6b: vincular desde el lead, sin oráculo y con el lead bloqueado

**Contexto:** leída la definición vigente, `vehiculo_vincular` distinguía un vehículo que no se ve de uno
inexistente (`42501` «No tienes permiso…» contra `PT409` «ya no existe o está en la papelera»), tomaba el
`for update` del vehículo antes de mirar el permiso, decía «ya está» antes de mirar la cartera y **no
bloqueaba el lead**: si la papelera bloqueaba primero, vincular esperaba sólo el `KEY SHARE` de la FK y al
despertar escribía igual, y el lead quedaba en la papelera con un vehículo vinculado (lo que la 6a prohibió).
Marcar interés con otra nota la ignoraba en silencio, y marcar y quitar no decían qué pasó.
**Decisión:**

- **Vincular** mira primero sin bloquear (lo que no se ve, la papelera y lo inexistente dan «Ese vehículo no
  existe o no tienes acceso.»; lo que se ve sin poder editarlo, «No tienes permiso para editar este
  vehículo.»), después bloquea **el lead** (`_lead_mio(…, true)`, que vuelve a mirar) y **después el
  vehículo** (y vuelve a mirar). Orden de los locks: lead → vehículo; desvincular sólo toma el vehículo y la
  papelera sólo el lead, así que no hay ciclo. `cotizacion_marcar_final` actualiza `lead_id` con el vehículo
  tomado (vehículo → `KEY SHARE` del lead): un deadlock posible con vincular, que se revisa en la Fase 4.
- **Reemplazar** el lead de un vehículo exige tener también el actual en la cartera: quien se lo quita a una
  cartera tiene que poder nombrarla, y la confirmación nombra a los dos leads. Si no, `23514` «Este vehículo ya
  está vinculado a otro lead. Para cambiarlo, desvincúlalo desde la ficha del vehículo.», sin decir cuál. El
  historial ya lo cuenta el trigger (cierra el anterior y abre el nuevo en la misma transacción).
- **Marcar es «poner»:** la misma nota es `sin_cambios`, otra la reemplaza (`nota_cambiada`), sin versión (una
  nota corta, la última escritura gana). Quitar devuelve la nota para que «Deshacer» la reponga. Las dos
  bloquean el lead como el resto de la clase 1.
- **Desvincular** sigue sin pedir el lead. En la pantalla se hace y ofrece «Deshacer» cuando quien desvincula
  podría volver a vincularlo (tiene el lead); si no (la supervisión de inventario), pide confirmar, porque para
  esa persona no hay vuelta atrás. Devuelve `limpieza_el`: desvincular le quita el ancla a un vehículo de
  subasta que nadie compró, y el aviso dice cuándo se lo llevaría la limpieza.
- Desvincular un vehículo con una cotización final no se frena todavía: ninguna pantalla crea una final; se
  decide en la Fase 4 (la ficha de `vehiculos` decía «Fase 3»).

**Matriz:** un bloque nuevo cruza las cuatro RPC de vínculo con seis personas (dueño, compartido, supervisión
sin cartera, asesor ajeno, sin rol, de baja) y seis estados del vehículo (propio, ajeno con «propios», que
sólo se ve, en la papelera, de un origen sin permiso e inexistente): 144 celdas. Con `vehiculo_vincular`
vuelto al orden y a los mensajes viejos, caen **50 de 144**; con `puede_lead(…,'leads.editar')`, caen 2 celdas
de la matriz por lead y el cinturón. `matriz_cubiertas` se creaba sólo en el primer bloque: si fallaba, los
siguientes no corrían; ahora cada bloque la crea si falta.

## 2026-10-15 — La sección «Vehículos» vive en `vehiculos`, y lo que no se ve no se cuenta

**Decisión:**

- La sección (y su selector, y el panel «Agregar vehículo») viven en `vehiculos` y las compone `app/`:
  `leads` no importa `vehiculos` (lo decidido en la Fase 2). Se lee con `lead_vehiculos()` y se busca con
  `vehiculos_para_lead()`, las dos de invocador: lo que la RLS del vehículo no deja ver no llega ni se cuenta.
  La pestaña sólo aparece con `vehiculos.ver` en algún origen (sin eso estaría siempre vacía).
- **Lo que ve cada quien:** un compartido con «propios» ve los vinculados (se los da el vínculo) y sólo los
  interesados que su propio alcance le deja ver; transferir no toca los vínculos.
- **Asimetría a propósito:** la ficha del vehículo dice que _hay_ un vínculo con un lead que no se ve («Un lead
  que no está en tu cartera»), porque `lead_id` es un dato del propio vehículo; la ficha del lead no cuenta los
  vehículos que no se ven, porque son otras entidades. El historial del lead no nombra personas (el del
  vehículo nombra a quien vinculó).
- **Lo que la ficha adelanta, sin oráculo:** `lead_ficha()` suma `vehiculos_vinculados` (los que quien mira ve).
  Con alguno, «Enviar a la papelera» se ve apagado con el motivo y lleva a «Vehículos»; compartir y transferir
  avisan que el vínculo le da los vehículos a quien recibe el lead. Si no ve ninguno no se dice nada: insinuar
  los otros sería decir algo que no ve. Si lo que frena la papelera es uno que no ve, la base lo dice al
  intentar («…que no ves: quien lo gestiona tiene que desvincularlo antes.»): que existe ya lo decía.
- La ficha del vehículo suma «Desvincular» para quien lo edita (con confirmación): es la salida del rechazo de
  reemplazar. El botón lo arma la página y el bloque lo recibe como hueco.

## 2026-10-15 — `vehiculo_id` en seguimientos y recordatorios: uno que se ve, y si deja de verse sigue

**Decisión:** las RPC lo reciben (`seguimiento_crear|guardar` en el json, `recordatorio_crear(…, p_vehiculo)`,
`recordatorio_guardar` en los cambios) y sólo lo validan cuando cambia: editar el título de una nota cuyo
vehículo ya no se ve lo conserva. La base sólo exige que se vea; la pantalla ofrece los vehículos del lead
(vinculados e interesados) que la página lee desde `vehiculos` y la sección provee por contexto: así no hace
falta una búsqueda global ni un ciclo entre módulos. Al leer, el vehículo se nombra sólo si se ve; a su autor
se le dice que había uno («un vehículo que ya no ves», el valor `oculto` del selector), al resto nada. El
recordatorio que nace con un seguimiento hereda su vehículo. **`recordatorios.vehiculo_id` pasó a
`on delete set null`** (era `cascade`): purgar un vehículo borraba el recordatorio de otra persona. Lo
«Visible para el cliente» con vehículo lo resuelve el portal de la parte 7.

## 2026-10-15 — Las carreras se prueban con dos conexiones reales (`pnpm db:carreras`)

**Contexto:** PGlite (el de `db:probar`) no tiene concurrencia: las carreras de la 6a quedaron sin prueba.
**Decisión:** `scripts/carreras.mjs` abre dos conexiones con `pg` a la base local y un orquestador. A abre una
transacción y actúa (retiene el lock), B lanza su llamada, el orquestador espera en `pg_stat_activity` a que B
figure esperando un lock (sin `sleep`) y recién ahí A confirma. Si B no llega a esperar, la carrera no se probó
y falla: no se reintenta. Doce carreras en los dos órdenes: dos transferencias, quitar el acceso mientras el
compartido edita, anota, corrige su seguimiento o agenda, la papelera mientras otro comparte, el mismo vehículo
a dos leads, y vincular mientras se envía el lead a la papelera (contra la RPC vieja, **roja**). Terreno propio
con prefijo «Carreras», escrito como `postgres`, borrado al terminar y al empezar; con el equipo vacío crea
primero una cuenta que nace dueña (sin alguien que gestione el equipo, el guardián no deja tocar a nadie).
Dura menos de un segundo. No entra en `db:probar` (es el pre-commit y exigiría Supabase arriba): corre con
`pnpm db:carreras` y dentro de `pnpm test:e2e:completo`, después del reset.
**Lo que encontró:** un compartido al que le quitaban el acceso **mientras** anotaba dejaba su seguimiento
igual: `seguimiento_crear` y `recordatorio_crear` llamaban a `_lead_mio(p_lead)` sin bloquear y
`_seguimiento_mio` no miraba el lead con lock. `_lead_mio` bloquea ahora por omisión y `_seguimiento_mio`
bloquea el lead y vuelve a mirar (`…20261015000700`).

## 2026-10-15 — El tope del documento de la ficha vuelve a 44 KB; diferir los paneles no ahorra documento

**Contexto:** la 6a subió el tope a 48 KB y anotó que, si hacía falta, se sacaran los paneles a una carga
diferida. **Medido** (el e2e ahora dice de qué está hecho lo que aporta la ficha): 42,0 KB sobre el shell =
25,8 de payload RSC (las props) + 16,1 de HTML de «Datos»; los scripts no suman. Los paneles cerrados (base-ui)
no dibujan nada, así que diferir los de la cartera ahorró **0,0 KB** del documento (sí, su código del primer
pedido). Con la sección «Vehículos» y lo que suma a la ficha, «Datos» aporta **43,0 KB** (26,7 de RSC); en el
terreno del e2e de vehículos, «Datos» 37,3 KB y «Vehículos» 31,4 KB.
**Decisión:** tope de 44 KB para «Datos» y para «Vehículos». Si se pasa, lo que pesa son las props: mandar a
`FichaDeLead` sólo los campos activos y los que el lead tiene con dato, y los orígenes activos más el del lead
(las opciones completas, al abrir «Editar»).

## 2026-10-16 — Parte 7 partida en 7a y 7b; las quince preguntas se resolvieron con la recomendación

**Contexto:** la parte 7 juntaba embudos, oportunidades, transferir, el acceso del cliente del lado del
equipo y el endurecimiento de `web.portal_*`. El plan se aprobó sin respuestas una por una: se tomó la
recomendación de cada pregunta.
**Decisión:** 7a = embudos, oportunidades (kanban y sección de la ficha) y transferir; 7b = acceso del
cliente y `web.portal_*`, con su verificación completa por separado. Permisos: `leads.editar` para crear,
editar, mover y cerrar; `leads.ver` para ver las propias; sin permisos nuevos (el seed ya describía así
`leads.editar`). Motivo de pérdida: texto libre hasta 200. Moneda: la de la empresa, guardada en cada
oportunidad, sin conversión. Eliminar una oportunidad: lógico, con «Deshacer». Crear desde el kanban: no
(pide el `<SelectorLead>` de la Fase 7).

## 2026-10-16 — Los embudos son personales y se escriben sólo por RPC; las etapas se guardan como conjunto

**Contexto:** leído contra la base viva, `embudos` y `embudos_etapas` tenían INSERT/UPDATE/DELETE para
`authenticated` (con RLS de la dueña): nada garantizaba una sola etapa inicial, una ganada y una perdida,
ni topes. El color era un hex libre, los nombres únicos distinguían mayúsculas, nada exigía que la etapa
fuera del embudo ni que el embudo fuera de la dueña de la oportunidad, y el embudo no tenía versión.
**Decisión:**

- **Sólo por RPC** (`embudo_por_defecto`, `embudo_crear`, `embudo_guardar`, `embudo_eliminar`,
  `embudo_etapas_guardar`), como las marcas: se leen las tablas (RLS de la dueña). Son de quien mira:
  clase **M** en el cinturón, sin lead.
- **Las etapas se guardan como conjunto**, de una vez y en su orden: nunca hay un estado intermedio
  inválido (dos iniciales mientras se cambia cuál es). Exactamente una inicial, al menos una ganada y una
  perdida, la inicial no es final, nombres sin repetir sin importar mayúsculas, la paleta cerrada de las
  etiquetas (guardada como clave) y de 3 a 12. Una etapa con oportunidades vivas no se quita: `23514` que
  la nombra; las eliminadas de esa etapa se van con ella. La versión es `embudos.actualizado_en`: dos
  pestañas que reordenan dan `PT409`.
- **El de por defecto** lo crea `embudo_por_defecto()` (idempotente, con un candado por persona) la primera
  vez que hace falta: «Ventas» con Nuevo, Contactado, Cotizado, Negociación, Ganado y Perdido. Si la persona
  ya tiene embudos, el más viejo pasa a ser el de por defecto. No se elimina; se renombra. Hasta 10.
- **FK compuestas**: `(usuario_id, embudo_id) → embudos (usuario_id, id)` y `(embudo_id, etapa_id) →
embudos_etapas (embudo_id, id)`. La base garantiza que la etapa es del embudo y el embudo de la dueña.
- Una plantilla de etapas por empresa queda pendiente.

## 2026-10-16 — Una oportunidad es de su dueña, con la cartera del lead; nadie más la ve

**Decisión:**

- Crear, editar, mover, eliminar y restaurar son **clase 1**: ser la dueña, la cartera del lead y
  `leads.editar`. `_oportunidad_mia()` mira sin bloquear, bloquea el lead, comparte el embudo y bloquea la
  oportunidad, y vuelve a mirar (orden de candados lead → embudo → oportunidad, el mismo que guardar las
  etapas: embudo → oportunidades). Lo ajeno, lo inexistente y un lead que ya no se tiene dan el mismo
  `42501`.
- **La policy de lectura cambió**: antes quien tenía `leads.ver` «todos» leía las de todo el equipo (y su
  historial). Ahora: la propia, viva, con `leads.ver` y sobre un lead vivo de su cartera
  (`_mis_leads_vivos()`, un arreglo que se calcula una vez por consulta: InitPlan, comprobado con EXPLAIN).
  Perder la cartera la oculta sin borrarla; recuperarla la devuelve. El tablero de equipo de la Fase 9
  necesitará una función con `tablero.metricas.ver`.
- **Mover** recibe la etapa que la persona cree que tiene: otra es `PT409` con el nombre de la actual; la
  misma es `sin_cambios` (un reintento no choca). Una etapa de otro embudo o de otra persona: «Esa etapa no es
  de este embudo.». El **estado lo deriva un trigger BEFORE** de la etapa (antes era un segundo UPDATE de la
  fila en un AFTER) y otro AFTER escribe el historial. `cancelada` sólo la pone la baja.
- Editar lleva versión (lo ya guardado no choca). El vehículo, como en las notas: uno que se ve, y si deja
  de verse, se conserva al editar lo demás. Ninguna toca `leads` ni mueve su versión. `actividad` deja
  `oportunidad.creada|ganada|perdida|transferida` sin montos ni notas.
- **Una cuenta que se borra se lleva sus oportunidades** (y sus embudos); el historial queda sin autor. La
  limpieza de los e2e lo encontró: la FK a `perfiles` no decía qué hacer. La baja (lo normal) no borra: cancela.

## 2026-10-16 — Transferir lleva las abiertas al embudo del destino; la baja sigue cancelando

**Decisión:** `lead_transferir` pasa las abiertas y vivas del saliente al embudo por defecto del destino
(creado si no tiene), a la etapa **abierta** del mismo nombre sin importar mayúsculas o, si no hay, a su
inicial (nunca a una final por coincidir el nombre), con fila de historial (quien transfiere) y constancia;
devuelve cuántas. Las cerradas y las eliminadas se quedan con quien las tenía. El saliente queda compartido y
deja de ver las que pasaron. Revocar, salirse y la papelera las ocultan (RLS); restaurar el lead las
devuelve. **La baja sigue poniendo `cancelada`**, como ya decía la pantalla de la baja: la persona no vuelve
y una «abierta» eterna inflaría el pipeline abierto.
**Efecto en la Fase 9:** las ganadas cuentan para quien las tiene al cerrarlas; el historial guarda quién
creó y quién movió, así que «creadas por» se mide aparte; las métricas por etapa son dentro de cada embudo.

## 2026-10-16 — El kanban: 50 por columna, «Ver más», pestañas en el celular, y la sección de la ficha

**Decisión:**

- `/leads?vista=embudo&embudo=<id>`: una columna por etapa con hasta 50 tarjetas (las movidas más
  recientemente) y «Ver más (N)» por keyset desde el navegador. En el celular, las etapas son pestañas
  (`?etapa=`); el cambio de forma lo decide el CSS, no una media query en JS (que pintaría primero la del
  celular). «Mover a…» es un menú (teclado y dedo); a una perdida pregunta el motivo. Un embudo vacío
  muestra sus columnas y el aviso. Los filtros de la lista no aplican y la pantalla lo dice.
- **Medido** (`pnpm db:medir`, 2.000 leads y 5.000 oportunidades propias en 6 etapas, más 5.000 de otra
  persona): el tablero de 6 columnas de 50 en 44 ms, «Ver más» 16 ms, las de un lead 3,4 ms, la policy sola
  3,3 ms. La medición encontró que `_tarjeta_json` recibía la fila entera de `leads` (con grants por
  columna, `permission denied`): ahora recibe sólo nombre y número.
- **La sección «Oportunidades» de la ficha** se mide aparte: con tres, 42,2 KB (cada tarjeta con dos botones
  de shadcn pesaba ~5 KB; «Editar» y «Eliminar» pasaron al «⋯» y quedó en ~2,5 KB). «Datos» pasó de 43,0 a
  43,3 KB por la pestaña nueva. El tope de 44 KB no se tocó.

## 2026-10-16 — La auditoría ampliada de la 7a, y lo que encontraron las pruebas

| Objeto                                                                                             | Clase | Antes                                                                | Ahora                                                                                 |
| -------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `embudos`, `embudos_etapas` INSERT/UPDATE/DELETE                                                   | M     | directo, con RLS de la dueña: sin invariantes ni topes               | sin grant: `embudo_*` (M)                                                             |
| `oportunidad_crear`                                                                                | 1     | no existía (la 6a sacó la escritura directa)                         | cartera + `leads.editar`; matriz principal                                            |
| `oportunidad_guardar\|mover\|eliminar\|restaurar`                                                  | 1     | no existían                                                          | dueña + cartera + `leads.editar`; bloque propio de la matriz (8 personas × 5 estados) |
| policy `oportunidades: leer`, `oportunidades_historial: leer`                                      | L     | las propias **o** las de todos con `leads.ver` «todos»               | las propias, vivas, sobre leads vivos de la cartera                                   |
| `lead_oportunidades`, `embudo_tablero`, `embudo_etapa_pagina`, `_tarjeta_json`, `_mis_leads_vivos` | L     | no existían                                                          | invocador (o un arreglo para la policy): la RLS decide                                |
| `lead_transferir`                                                                                  | 2     | pasaba las abiertas cambiando sólo `usuario_id`                      | al embudo por defecto del destino, por nombre o a la inicial; cerradas se quedan      |
| trigger `oportunidad_historial`                                                                    | —     | AFTER que escribía el historial y hacía un segundo UPDATE del estado | `oportunidad_estado` (BEFORE) + `oportunidad_historial` (AFTER)                       |

- **El cinturón** suma una regla: toda función «definer» llamable `oportunidad_*` o `embudo_*` pasa por su
  bloque de la matriz (reciben su id, no el lead).
- **Roto a propósito:** `_oportunidad_mia` con `puede_lead(…,'leads.editar')` lo atrapa el cinturón y un caso
  (la supervisión compartida que pierde la cartera edita la suya); la policy con el «todos» de antes no la
  atrapaba nada —la condición de la cartera la tapaba— hasta que un caso miró a la supervisión **con** el lead
  compartido. Los dos casos quedaron.
- **Encontrado al probar:** `embudo_por_defecto()` devolvía el embudo nulo la primera vez (una función STABLE
  lee con la foto de la sentencia que la llama: el insert y la lectura iban en la misma); mis casos
  comparaban contra nulos y no lo veían: ahora toda llamada que debe salir bien pasa por `pg_temp.bien()`.
- **Carreras** (`pnpm db:carreras`, 7 nuevas, todas en verde al primer intento): quitar el acceso mientras el
  compartido mueve (dos órdenes), quitar una etapa mientras se mueve a ella (dos órdenes), transferir mientras
  la dueña mueve (dos órdenes) y dos guardados de etapas a la vez.

## 2026-10-16 — Parte 7b: las dieciséis preguntas se resolvieron con la recomendación

**Contexto:** el plan de la 7b dejó dieciséis preguntas numeradas (ocho del pedido y ocho que salieron al leer
la base viva) y se aprobó sin responderlas una por una. Como en la 7a, se tomó la recomendación de cada una.
**Decisión:** (1) las firmas de abajo son el contrato; (2) «Generar» lo hace Postgres y
`logging.serverFunctions` se apaga; (3) la plantilla de WhatsApp vive en el código y se suma
`ajustes_web.direccion_publica` sin pantalla; (4) «Portal» aparece con la cartera y el permiso, nunca vacía, y
se mide aparte con su propio tope de 44 KB; (5) desbloquear no le avisa al cliente; (6) transferir no toca el
acceso y el panel lo avisa; (7) la baja no toca el acceso y nombra a quien lo otorgó «(ya no está en el
equipo)»; (8) cupo en una sesión; (9) el código tecleado lee 0→O y 1→I; (10) revocar se confirma, sin
«Deshacer»; (11) las novedades llevan título y texto plano, también las de un vehículo no vinculado (sin
nombrarlo), hasta 30; (12) bcrypt de costo 10 y la clave de 8 a 64 caracteres, ≤ 72 bytes, sin controles;
(13) la sección vuelve a mostrar el código, nunca la clave; (14) fuera `trg_auditar` de `accesos_portal`;
(15) la tabla no la lee la app; (16) cambiar la clave no corta la sesión.

## 2026-10-16 — El acceso del cliente: clase 1, sólo por RPC, con la versión del acceso

**Contexto:** leído contra la base viva: `otorgar_portal` reemplazaba sin versión, la policy
`accesos_portal: leer` dejaba leer la tabla (con el **código**) a la cartera con el permiso —la 6a la acotó,
no la cerró—, y `trg_auditar` escribía en `actividad` cada login del cliente (con `registro_id` nulo: la
tabla no tiene `id`). Borrar una cuenta que había otorgado un acceso fallaba (FK sin `on delete`).
**Decisión:**

- **Cuatro RPC de clase 1** (cartera + `leads.portal.gestionar`, por `_lead_mio`): `portal_estado` (sin
  bloquear; el estado, el código, quién y cuándo; nunca la clave ni el hash), `otorgar_portal(p_lead,
p_clave, p_otorgado_en_esperado)`, `revocar_portal` (idempotente) y `portal_desbloquear` (idempotente). Lo
  ajeno, el limbo, la papelera y lo inexistente dan el mismo `42501`.
- **La versión es `otorgado_en`**, truncado a milisegundos y siempre mayor que el anterior (sobrevive a un
  `Date` de JS en la cookie). `p_otorgado_en_esperado` nulo significa «creo que no hay acceso»: es la
  excepción a `_exigir_version()`, como crear, porque el primer otorgamiento no tiene fila. Otro valor da
  `PT409` «Ya lo otorgó Rosa hace 1 min.» (o «Ya lo otorgaste … desde otra ventana»). Revocar no mueve la
  versión: volver a otorgar desde «revocado» no choca.
- **Código nuevo siempre** al volver a otorgar; colisión: se comprueba y además se atrapa `unique_violation`,
  hasta 20 intentos. Un índice único sobre el código sin guion.
- **Sólo por RPC:** sin grant ni policy para `authenticated`; sin `trg_auditar`. `actividad` deja
  `portal.otorgado|reotorgado|revocado|desbloqueado` con el código (y el anterior), nunca la clave; revocar o
  desbloquear lo que no cambia no deja constancia. Los ingresos del cliente no van a `actividad`
  (`ultimo_ingreso_en` alcanza).
- **El código se vuelve a ver** en la sección: sin la clave no abre nada y sirve cuando el cliente lo pierde.
  La clave se ve una vez.
- **Revocar se confirma** (nombra el código): un «Deshacer» reabriría un código revocado. **Desbloquear** se
  hace en el lugar y no le avisa al cliente: lo hace la persona por WhatsApp.
- **Transferir y la baja no tocan el acceso** (es del lead). El panel de transferir lee `portal_estado` al
  abrirse —sólo para quien lo gestiona: no suma bytes a «Datos»— y avisa que el cliente verá al nuevo dueño.
  Con la baja, la sección dice «Rosa Mamani (ya no está en el equipo)»; si la cuenta se borra, la FK queda
  en nulo (`on delete set null`) y dice «alguien que ya no está en el equipo».
- **La sección «Portal»** (`?seccion=portal`) aparece con la cartera y el permiso (`puedeGestionarPortal()`),
  nunca vacía (sin acceso: la explicación y «Dar acceso»). Medida aparte: 33,7 KB; «Datos», 42,9 KB en su
  terreno (tope de 44 KB, sin tocar).
  **Alternativas:** «Deshacer» al revocar (otra RPC con otra semántica); leer el estado en `lead_ficha` (suma
  bytes a «Datos» para todos).

## 2026-10-16 — La clave del cliente nunca queda en claro

**Contexto:** la clave temporal es un secreto que la persona dicta. Al leer el runtime de Next 16 apareció que
el servidor de desarrollo imprime cada Server Action **con sus argumentos** (`logging.serverFunctions`, activo
por omisión).
**Decisión:**

- **«Generar» lo hace la base** (`codigo_dictable(10)`: 50 bits, sin I, O, 0 ni 1). Así la clave no viaja
  como argumento, sólo en la respuesta. La escrita viaja como parámetro (PostgREST nunca la pone en el texto
  de la consulta; `log_parameter_max_length_on_error = 0`), y ningún mensaje de error la repite.
- **`logging: { serverFunctions: false }`** en `next.config.ts`, para todo el proyecto: no hay forma de
  silenciar una sola action. Se pierde ese registro en desarrollo para todas.
- **En el navegador** vive sólo en el estado del diálogo: nada en la URL (el panel es `?panel=otorgar-portal`
  y nada más), en `console` ni en el almacenamiento. Se olvida al cerrar y cuando Next esconde la pantalla
  (`<Activity>`: el efecto se limpia). Un test lo comprueba con un `<Activity mode="hidden">` real y falla si
  se quita la limpieza. El campo va sin autocompletar ni corrector (el corrector mejorado de Chrome manda el
  texto a un servicio).
- **En la base:** bcrypt de costo 10 (antes `gen_salt('bf')`, costo 6). La regla: de 8 a 64 caracteres, hasta
  72 bytes (bcrypt ignora lo que sigue: dos claves con los mismos 72 bytes valdrían lo mismo) y sin
  caracteres de control; distingue mayúsculas y no se recorta. `codigo_dictable` pasa a `gen_random_bytes`
  (`random()` no es criptográfico) y ya no la llama la app.

## 2026-10-16 — El texto para WhatsApp: la plantilla en el código, la dirección en `ajustes_web`

**Contexto:** no había ninguna dirección pública de la web: `ajustes_web` no tenía columna y
`WEB_PUBLICA_REVALIDAR_URL` es el endpoint de revalidación, no el sitio.
**Decisión:** la plantilla vive en `entities/portal-mensaje.ts` (español neutro, el nombre de
`ajustes_empresa.nombre`, el código, la clave y que se le pedirá cambiarla). `ajustes_web.direccion_publica`
(nula, `check ^https://`) sin pantalla hasta Configuración › Sitio web (Fase 8); sin ella el texto dice «la
web de <empresa>» y la sección lo avisa a quien otorga. `leads` no importa `empresa` ni `web`: la página
compone `getAjustes()` y `leerDireccionPublica()` (lo primero que exporta `web`). La plantilla editable por
empresa queda pendiente.
**Alternativas:** una variable de entorno (no se puede probar por e2e con y sin dirección); nada hasta la Fase 8.

## 2026-10-16 — Contrato del portal para la Fase 8

**Contexto:** las `web.portal_*` no tenían consumidores; la 7b las endureció y fija lo que la Fase 8 construye
encima (route handlers `api/portal/*`, la cookie y las pantallas). Todas son sólo de `service_role` (el cinturón
falla si una función de `web` que recibe un lead la puede llamar `anon` o `authenticated`).
**Las firmas:**

| Función                                                                                         | Devuelve                                                  | Contrato                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web.portal_login(p_codigo text, p_clave text)`                                                 | `table(lead_id, nombre, debe_cambiar_clave, otorgado_en)` | Normaliza el código (mayúsculas, sin espacios ni signos, 0→O, 1→I). **Una sola respuesta, vacía,** para código inexistente, revocado, bloqueado, lead en la papelera o clave errónea, siempre con un `crypt` del mismo costo (un hash falso si no hay fila). Cinco fallos: 15 min de bloqueo, que no se alarga. |
| `web.portal_snapshot(p_lead uuid, p_otorgado_en timestamptz)`                                   | `jsonb` o `null`                                          | `null` si la sesión no vale (revocado, vuelto a otorgar, otra versión, lead en la papelera). Claves: `cliente` (sólo `nombre`), `asesor`, `vehiculos`, `novedades`.                                                                                                                                             |
| `web.portal_documento_ruta(p_lead uuid, p_otorgado_en timestamptz, p_documento uuid)`           | `text` o `null`                                           | La ruta privada de un documento visible: el handler la firma (URL corta) o la sirve; **nunca** la manda al navegador.                                                                                                                                                                                           |
| `web.portal_cambiar_clave(p_lead uuid, p_otorgado_en timestamptz, p_actual text, p_nueva text)` | `boolean`                                                 | `false` si la sesión no vale, si está bloqueado o si la actual no es (cuenta como un fallo del login). La nueva sigue la regla de la clave (`22023` con el motivo). No corta la sesión.                                                                                                                         |

- **La cookie:** firmada (HMAC con un secreto del servidor), `httpOnly`, `Secure`, `SameSite=Lax`, con
  `lead_id` y `otorgado_en` **tal cual los devolvió el login**. Toda lectura los pasa; un `null` o `false`
  borra la cookie y vuelve al ingreso. Así revocar, volver a otorgar o enviar el lead a la papelera cortan una
  sesión abierta en la siguiente lectura.
- **Límite por IP** en `api/portal/login` y en `cambiar-clave` (el bloqueo es por código: sin el límite, un
  atacante prueba una clave común contra muchos códigos). El prefijo es de la empresa y la parte al azar tiene
  32⁵ ≈ 33 millones de combinaciones.
- **El mismo mensaje** para cualquier fallo de ingreso («El código o la clave no son correctos.»), sin decir
  si el código existe o está bloqueado.
- **Lo que el cliente nunca ve:** costos, proveedores, rutas de buckets privados, el VIN completo (sale
  `vin_parcial`: 3 + 4), seguimientos privados ni eliminados, el documento del editor (sólo `detalle_texto`),
  los campos del lead, oportunidades, etiquetas, marcas ni teléfonos. Las rutas que salen (fotos, avatar)
  son de buckets públicos. Las **novedades** son lo «Visible para el cliente» sin vehículo o de un vehículo
  que no está vinculado a ese lead (sin nombrarlo), las 30 más nuevas; lo de un vehículo vinculado sale con él.
- Cambiar la clave no cambia `otorgado_en`: el corte de todas las sesiones es «Volver a otorgar».

## 2026-10-16 — La auditoría ampliada de la 7b, y lo que encontraron las pruebas

| Objeto                                                | Clase | Antes                                                                                  | Ahora                                                                                   |
| ----------------------------------------------------- | ----- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `otorgar_portal`                                      | 1     | `(p_lead, p_clave) → text`, reemplazaba sin versión, bcrypt costo 6, sin tope de largo | `(p_lead, p_clave, p_otorgado_en_esperado) → jsonb`; genera la clave; versión y `PT409` |
| `revocar_portal`                                      | 1     | igual                                                                                  | constancia con el código                                                                |
| `portal_estado`, `portal_desbloquear`                 | 1     | no existían                                                                            | matriz principal (7 personas × 5 leads) y un caso de la cartera sin el permiso          |
| policy `accesos_portal: leer` y su grant por columnas | —     | la cartera con el permiso leía la tabla, código incluido                               | sin policy ni grant: sólo `portal_estado`                                               |
| `trg_auditar` en `accesos_portal`                     | —     | una fila de `actividad` por cada login del cliente                                     | quitado                                                                                 |
| `codigo_dictable`                                     | —     | `random()`; la llamaban `anon` y `authenticated`                                       | `gen_random_bytes`; sólo las «definer»                                                  |
| `web.portal_login`                                    | web   | el bloqueo lanzaba `42501`; lo inexistente no pagaba el hash; el bloqueo se alargaba   | una respuesta, siempre un `crypt`, `for update`, sin alargar                            |
| `web.portal_snapshot`, `portal_documento_ruta`        | web   | sólo `p_lead`: revocar no cortaba; con el lead en la papelera daba los vehículos       | con `p_otorgado_en`; `null` si no vale; novedades                                       |
| `web.portal_cambiar_clave`                            | web   | sin contar intentos ni mirar el bloqueo                                                | con `p_otorgado_en`, cuenta y bloquea como el login                                     |

- **El cinturón** suma una regla: toda función del esquema `web` que recibe un lead (o, «definer», nombra una
  tabla de leads) y que `anon` o `authenticated` pueden llamar hace fallar; además, que existan las cuatro
  firmas del contrato con `service_role`, que la app no lea `accesos_portal` y que no llame a `_portal_*` ni a
  `codigo_dictable`.
- **Roto a propósito:** `otorgar_portal` con `puede_lead(…, 'leads.portal.gestionar')`: la matriz falló en 12
  celdas (la supervisión sin cartera otorgaba en propio y ajeno; la baja y el bloqueado perdían su mensaje) y
  el cinturón también.
- **Carreras** (`pnpm db:carreras`, 7 nuevas y 3 comprobaciones de bcrypt, todas verdes al primer intento):
  dos otorgan a la vez (los dos órdenes), revocar con el cliente entrando (los dos órdenes), desbloquear
  mientras caen fallos (los dos órdenes) y seis fallos en paralelo bloquean justo al quinto; bcrypt real:
  costo 10, la clave generada entra y el código anterior no, y el mismo tiempo para la clave errónea, el
  código inexistente, el bloqueado y el revocado (~42 ms cada uno).
- **Encontrado al probar:** el caso de «dos mil códigos sin repetir» tardaba ~50 s con `crear_lead` (el resto
  de `db:probar`, ~6 s): los leads se escriben directo y los accesos por la RPC (3 s). En el caso del código
  de colisión, un `$$` dentro de una función creada en el bloque cerraba el `do $$` (va con `$do$`).
- **Encontrado por el e2e completo (celular):** «Recargar» tras un conflicto borraba el aviso al pulsarlo,
  antes de que el refresh trajera la versión nueva; otorgar en ese instante mandaba la vieja y volvía a
  chocar. No era una intermitencia del test sino una carrera de la pantalla: el conflicto se va cuando llega
  la versión (`useOtorgarPortal` la compara en el render) y, mientras, los dos botones de otorgar están
  apagados. El e2e lo afirma («Dar acceso» apagado hasta la versión nueva) y un caso unitario también. La
  segunda corrida completa mostró **la misma carrera en el cambio del teléfono principal (parte 4b)**, que
  hasta ahora pasaba por tiempo: mismo arreglo (`useConflictoHastaLaVersionNueva`, con la versión o el
  principal). El redactor de seguimientos ya esperaba el refresh (`useTransition`); oportunidades y etapas
  recargan la página entera. La tercera corrida mostró otra del mismo formulario: si la conexión volvía antes
  de que la página procesara el envío fallido, el reintento automático salía con `isPending` todavía
  encendido y se descartaba. «Un cambio a la vez» pasó a una marca propia (`useCambioUnaVez`), y el e2e
  espera el aviso del envío pendiente, no el de «sin conexión» que ya estaba antes del clic. Era el único
  formulario con ese guardia.

## 2026-10-17 — CSV de leads (Fase 3, parte 8a): exportar la cartera e importar con las reglas del alta

**Qué se decidió, y por qué**

- **`leads.exportar` sin «todos» y la cartera forzada en la consulta.** El permiso no distingue alcance
  (`con_alcance = false`): lo que sale lo decide `en_cartera = true`, que la consulta pone siempre. Así no hay
  camino para un privado ajeno por el CSV ni para «probarlo» filtrando antes de exportar (filtrar sobre lo
  ajeno ya no encuentra nada). «Ver como» sólo esconde el botón; la base manda con los permisos reales.
- **El archivo se arma dentro del pedido, no en un flujo.** Un `ReadableStream` que lee páginas después de
  responder pierde la sesión (`cookies()` fuera del ámbito del request) y no puede cambiar el estado HTTP si
  falla a la mitad. Con 5.000 filas como tope pesa unos MB; una página que falla da un error, nunca un CSV
  cortado. La constancia (y el cupo) se escriben **después** de armar el archivo: una exportación que falló no
  gasta una de las cinco.
- **Límite por hora contado en `actividad`, con un índice nuevo.** Sin tabla aparte. `registrar_actividad()`
  la puede llamar cualquiera, pero falsear filas sólo bloquea a quien las falsea y nadie las borra. Un
  `pg_advisory_xact_lock` por persona evita que dos exportaciones a la vez pasen por debajo del tope.
- **Un solo `POST` con `Origin` comprobado.** Un `GET` se podría disparar desde otra página y gastaría el cupo.
- **El teléfono sale nacional si es el de la empresa y con «+» si no.** El «+» dispara la regla de fórmulas
  (apóstrofo); el nacional no, y vuelve a entrar igual. Un nacional que empezaría con 0 sale internacional
  (el 0 se tomaría por el troncal). La importación quita **un** apóstrofo delante de un carácter de fórmula.
- **Se parsea en el navegador, no en el servidor.** Las filas tienen que estar en el navegador para mandar
  lotes con ids y reanudar; parsear en una action exigiría subir `bodySizeLimit` para **todas** las actions y
  mandaría el archivo tres veces. La base vuelve a validar todo. Los encabezados nunca son claves de objeto y
  `papaparse` (que sólo hace falta ahí) se pide al elegir el archivo.
- **Cada fila pasa por `validarAlta()`.** El archivo no tiene reglas propias: nombre, teléfono, tipo y origen
  más los requeridos activos, con los mismos motivos. El origen se busca por nombre entre los **activos** (uno
  desconocido es un error de esa fila; no se crea uno al vuelo).
- **Una RPC de lote y `_lead_crear`.** `crear_lead` hacía por fila un Seq Scan sobre `actividad` (la
  búsqueda del intento de adopción) y escribía el «último origen»; el cuerpo pasó a `_lead_crear(…,
p_recordar_origen)` (sin grant) y `crear_lead` es su envoltorio. El lote procesa cada fila en su propia
  subtransacción (una mala no tumba a las demás), ordenado por teléfono (dos lotes que se cruzan toman los
  candados en el mismo orden) y devuelve `creado` (con `repetido` en un reintento), `ya_existe` o `error`. En
  masa **no se nombra a nadie** y **nada se adopta del limbo**.
- **Lotes de 50 filas (no 100), y además por peso.** Medido: un lote de 50 tarda ~49 ms con los índices y
  ~170 ms sin ellos; 500 filas, ~0,5 s de base (el tope es 8 s por consulta). 100 también cabría: queda como
  la constante `FILAS_POR_LOTE` y el tope de la RPC. El lote se parte además a ~600 KB: el cuerpo de una
  Server Action admite 1 MB y un rechazo por tamaño se tomaría por «sin red» y se reintentaría para siempre.
- **«Sin red» y «el servidor no contesta» no se tratan igual.** Sólo la pausa que empezó sin conexión se
  reanuda sola al volver la red; con la red presente, «Reintentar». Un servidor caído no se martilla.
- **Excepción razonada a `.claude/rules/acciones.md`.** «Nada de trabajo largo en una action»: los lotes son
  cortos (~50 ms) y los orquesta el navegador, como apibara; `importar-csv` (edge function) sigue siendo de la
  Fase 9 para el «todo» del dueño.
- **`importaciones` se reutiliza para leads** (`archivo_ruta` nulo sólo con `entidad = 'leads'`) con
  `importaciones_leads` (id del lead y fila): es lo que la 8b usará para deshacer y lo que `datos` leerá.

**Contrato para `datos` (Fase 9):** `shared/lib/csv` (escribir, leer, descargar), `_lead_crear` /
`leads_importar_lote` para leads, `importaciones` con su constancia (`leads.importado`), y la regla de que el
«ya existe» en masa no nombra a nadie.

**Lo que encontraron las pruebas**

- Probado y roto a propósito: sin la fila de `leads_importar_lote` en el cinturón, `db:probar` falla.
- **Regresión mía, encontrada por el e2e en el celular:** el botón «CSV» desbordaba la fila de acciones del
  listado; la página se ensanchaba y la hoja de filtros quedaba descolocada («Ver resultados» tapado). Las
  acciones del `FilterShell` ahora envuelven. Pasó en las dos specs del listado sólo con el menú visible.
- **Carreras** (`db:carreras`, 7 comprobaciones nuevas): dos personas importan el mismo teléfono (una lo crea,
  la otra recibe «ya existe»), el mismo lote desde dos pestañas (todo `repetido`, sin duplicar) y cinco rondas
  de dos lotes de 20 teléfonos en orden contrario, sin interbloqueo.
- **Pendiente de 8b:** deshacer durante 24 horas con una RPC propia (la papelera exige `leads.eliminar` y es
  todo o nada: no sirve para quien sólo importa).

## 2026-10-17 — El reintento al volver la conexión sólo sale al volver: la causa del fallo de `leads-alta-casos`

**Contexto:** en la primera corrida completa de la 8a, «la respuesta se perdió pero el lead entró…» no vio el aviso
«No pudimos llegar al servidor» en 5 s, y Playwright borró los artefactos. La hipótesis del plan (que `route.fetch()`
esperara el re-render de `/` bajo carga) resultó **falsa**: medido, `route.fetch()` tarda ~40 ms.
**Causa:** `useReintentoAlVolver` reenviaba en cuanto aparecía algo pendiente con la red presente, no sólo al volver
la conexión (lo contrario de lo que decía `shared/CLAUDE.md`). Que saliera dependía de una carrera con `isPending` de
`useAction`: si ya se había apagado cuando corría el efecto, el alta se reenviaba sola, la base devolvía `repetido`
y el formulario se limpiaba antes de que se viera el aviso (la captura lo mostró: el paso de datos, vacío). Se
reprodujo **3 de 15** sin carga.
**Decisión:** el hook sale sólo en la transición sin conexión → con conexión. Si el envío falló con la red presente,
la pantalla ofrece «Reintentar» (un servidor caído no se martilla, como ya decidió la 8a para la importación).
`use-importacion` deja de distinguir la pausa sin conexión a mano (`sinConexion`): lo hace el hook para todos.
Después del arreglo: 40 de 40 sin carga y 270 de 270 (el spec entero, ambos proyectos, ×15) con las 8 CPU ocupadas.
**Instrumentación:** `video` y `screenshot` en los fallos (la traza ya estaba) y `test:e2e:completo` copia
`test-results/` y el reporte a `e2e-fallos/<fecha>/` (ignorada por git, los cinco últimos) cuando algo falla.
**Alternativas:** alargar el timeout (sin causa, escondía el bug: también pasaba en la ficha, el redactor y el alta de
vehículos, que usan el mismo hook); esperar `isPending` dentro del hook (seguía siendo un reenvío que nadie pidió).

## 2026-10-17 — Deshacer una importación (Fase 3, parte 8b): clase X, sólo lo intacto, 24 horas

**Contexto:** la 8a dejó `importaciones_leads` para esto. El plan se aprobó sin responder las once preguntas por
número: se tomó la recomendación de cada una.
**Decisión:**

- **`leads_importacion_deshacer(p_importacion)` es de clase X**, no de clase 3: no la autoriza el permiso de la
  papelera sino **haber hecho la importación**, y sólo alcanza a lo que sigue siendo exclusivamente suyo y sin tocar.
  Por eso no pide `leads.crear` ni `leads.eliminar`, sólo estar activa; la supervisión tampoco puede. Ajena,
  inexistente o de otro tipo dan el mismo `42501` «No encontramos esta importación.». Entra al cinturón con su fila
  (probado: sin ella `db:probar` falla nombrándola) y tiene su bloque en la matriz («casos de deshacer»).
  `leads_importaciones_recientes()` también es X: sólo lo propio, con números.
- **«Intacto»** (`_lead_motivo_para_deshacer`, con el lead bloqueado): sigue fuera de la papelera; su única fila en
  `leads_asesores` es la de dueña de quien importó (cualquier otra, **aunque esté revocada**, cuenta: alguien lo tuvo);
  `actualizado_en = creado_en` (la versión de `lead_version()`); y ninguna fila en seguimientos (también eliminados),
  recordatorios, teléfonos extra, vehículos (vinculado, interesado o su historial), oportunidades, portal (también
  revocado), cotizaciones, pagos, eventos, tareas, mensajes, repuestos, testimonios ni solicitudes web. El motivo es el
  primero en ese orden: un lead cuenta una vez. **Las marcas no cuentan, de nadie**, y no se borran: viajan con el lead
  a la papelera (como en la papelera manual) — «descartarlas» habría sido borrar algo para siempre.
- **El futuro no se escapa:** el cinturón fija la lista de toda FK a `leads(id)` (cuenta / marca / vínculo) y exige que
  cada tabla que cuenta aparezca en el cuerpo de la función; fija también las columnas de `leads` y cuáles mueve
  `lead_version()`. Una tabla o columna nueva rompe `db:probar` hasta decidir (probado: sin mirar `pagos`, falla).
- **Plazo:** 24 h desde `terminada_en`, o desde su último lote si quedó abierta (la pestaña se cerró a medias): se
  deshace desde la lista y queda cerrada (un lote tardío recibe «Esta importación ya terminó.»). Fuera de plazo:
  `22023` sin tocar nada; ya deshecha, devuelve lo mismo aunque haya vencido.
- **Una transacción, todo o nada por lead:** candado de la importación (el mismo que toma cada lote: deshacer espera
  al lote en curso y se lleva lo que entró en él), después los leads por id (el orden de la papelera manual) y, con
  todo bloqueado, se vuelve a mirar cada uno. Un solo lote de papelera, de quien importó, que así lo puede restaurar.
  Idempotente: el resultado (conteos, motivos y números de fila) queda en `importaciones.deshecha_resultado`.
- **El tope de 200 no se toca:** el deshacer no pasa por `leads_papelera_enviar`; su tope es el de la importación
  (500). Medido (`pnpm db:medir`): deshacer 500, 102 ms; recientes con 500 intactos, 83 ms; la papelera con ese lote,
  30 ms; restaurarlo entero, 144 ms.
- **Los vínculos se borran 7 días después del plazo** (o de deshacerla) con `importaciones_vinculos_purgar()` en su
  propio cron (`importaciones-vinculos-purgar`, 03:35 UTC): sólo sirven para deshacer. La fila de `importaciones`
  queda, con números. No hizo falta el índice de `importaciones_leads (creado_en)` que decía el plan: la purga
  elige por importación.
- **`authenticated` ya no escribe `importaciones` directo** (se borraron las policies «crear» y «borrar»): con un
  INSERT se fabricaba un `terminada_en` futuro (una ventana sin fin) o se borraba la propia con sus vínculos.
- **Datos:** la respuesta, `leads.importacion_deshecha` (`movidos`, `quedaron`, `por_motivo`, `purgados`) y la lista
  llevan sólo números, claves de motivo y números de fila. El trigger `lead_auditar` sigue dejando en `actividad`,
  por cada lead que va a la papelera, el antes/después con nombre y atributos (sin teléfono), como en la papelera
  manual: cambiarlo es de la fase de Actividad, que ya tiene pendiente leer el diff recortado.
- **Reimportar lo deshecho:** sin cambios. `_lead_verificar` y el índice único ignoran la papelera, así que el mismo
  archivo vuelve a entrar como leads nuevos; si después se restaura el lote, esos quedan adentro con «ya tiene este
  teléfono», la regla de siempre.
- **Interfaz:** el botón en el resultado del asistente (con «Quedan N h») y «Tus importaciones recientes» en
  `/leads/importar`, que se ve aunque ya no se tenga `leads.crear`. La confirmación del asistente cuenta lo que entró
  (la pantalla no sabe qué cambió después); el resultado dice lo que decidió la base. La importación recién hecha
  aparece en los dos lugares: los dos botones son el mismo pedido idempotente.
- **No estaba en el plan:** `/leads/papelera` sólo abría con `leads.eliminar` o `leads.papelera.purgar`, así que quien
  importa sin ellos no podía restaurar su lote desde la pantalla. Ahora abre también con `leads.crear`; la base sigue
  mostrando sólo los lotes propios.
  **Alternativas:** reutilizar `leads_papelera_enviar` (todo o nada y con `leads.eliminar`: no servía); borrar en vez
  de mandar a la papelera (irreversible); un trigger por tabla que marque «tocado» (más superficie que mirar al
  deshacer, y escribiría en cada operación de leads).

## 2026-10-17 — El país del teléfono: una tabla estática en el cliente, y «País» sigue al número

**Contexto:** quien tipeaba «+54 9 11…» no veía de qué país era el número; «País» sólo traía el de la empresa; la
ficha partía únicamente los números de la empresa y un extra de otro país se veía «+5491155550000»; la importación
dejaba «País» vacío (ni el CSV ni la base aplican `valor_defecto_empresa`: eso era sólo del formulario del alta).
**Decisión:**

- **Tabla propia, no librería.** 242 países y territorios con código de llamada propio (plan E.164): `nombres.ts`
  (ISO → nombre en español, el de ICU salvo «Islas Åland» y «Costa de Marfil») y `prefijos.ts` (dígitos → ISO). El
  chunk compilado pesa 6,3 KB (3,4 KB comprimido) y sólo se pide con `import()`. `libphonenumber-js` (no está en el
  proyecto) pesa varias veces más, no trae los nombres en español y valida mucho más de lo que hace falta. La prueba
  compara cada ISO y cada nombre con `Intl.DisplayNames('es')`, exige prefijos sin 0 y sin choques entre códigos.
- **Sin SQL ni migración:** el país es texto dentro de `atributos.pais`; no hay nada que la base tenga que saber.
  `normalizar_telefono()` no cambia (el espejo `telefono.ts` tampoco).
- **Lo que no se adivina:** +1 (Estados Unidos y Canadá comparten plan y sus áreas se superponen y cambian) y +590
  (Guadalupe, San Bartolomé y San Martín) dicen «Estados Unidos o Canadá» y, con «País» activo, ofrecen un botón por
  país. El Caribe del +1 **sí** se sabe, por su área (809/829/849 → República Dominicana, 787/939 → Puerto Rico, 876
  y 658 → Jamaica, 242 → Bahamas…: 27 áreas). +7 es Rusia salvo 76 y 77 (Kazajistán). Sub-prefijos deterministas:
  +262 (Mayotte), +599 (Curazao y Caribe neerlandés), +358 18 (Åland), +39 06 698 (Vaticano), +47 79 (Svalbard),
  +61 8916 (Christmas y Cocos) y +212 5288/5289 (Sáhara Occidental). Guernsey, Jersey y Man quedan como Reino Unido:
  comparten el +44 y sus móviles no se distinguen. Un prefijo sin país dice «Código de país desconocido».
- **Qué se guarda:** el nombre como **texto**, igual que hoy. Si el número cae en la **misma regla** que el código
  de la empresa (o no trae «+» ni «00»), se guarda **el texto de la empresa**: no hay dos grafías de «Bolivia».
  Con +1 la regla es la misma para toda la zona: una empresa de Estados Unidos que escribe un número +1 416 queda
  con su texto («Estados Unidos»); con 809 es otra regla y queda República Dominicana. **Pendiente de revisar si
  molesta en una empresa en +1:** es la única parte que adivina, y lo hace a favor de la empresa.
- **«País» sigue al número** mientras esté vacío o tenga algo que puso el sistema: el de la empresa con el que nació
  el alta, el último sugerido, el que se eligió con un botón o el país del número que había antes (así un borrador
  repuesto sigue). Lo que la persona escribe no se pisa; si lo borra, vuelve a seguir **al próximo cambio del
  número** (no se vuelve a llenar solo en el momento: no se le puede impedir dejarlo vacío). Un número a medio tipear
  no toca nada. Sin tabla (todavía no llegó o falló la red), nada se llena.
- **Se busca por clave:** `clave === 'pais'` y activo (es de fábrica: no cambia de clave ni de tipo), así que
  renombrarlo («País de residencia») sigue andando y el aviso usa su etiqueta de hoy. Apagado: la línea con el país
  se dice igual, pero no se llena nada ni se ofrecen botones.
- **La línea sale al tipear**, no tras la verificación: es una cuenta local. Se esconde cuando la verificación dice
  «existe», «de otro» o «limbo» (manda el aviso y no se muestra nada del otro lead). Va en la `ayuda` del campo
  (enlazada por `aria-describedby`) y el cambio de país se anuncia aparte, una vez, en una región `sr-only`.
- **Un lead que ya existe nunca cambia de país por cambiar un teléfono:** el cambio del principal y los extras de la
  ficha sólo dicen el país del número, no tocan `atributos`. El lead del limbo que se toma completa «País» sólo si no
  lo tenía (la regla de siempre, `_atributos_completar`).
- **La ficha** pide la tabla ya hidratada: el documento (RSC y HTML) no cambia y el presupuesto de «Datos» no se
  toca. Parte cada número por su código y dice el país; el enmascarado («•••») no lleva país: con tres dígitos no es
  seguro (+1 809 queda «180») y no se revela más de lo que ya se ve. Como la ficha no lee `ajustes_empresa`, usa el
  nombre de la tabla, no el texto de la empresa.
- **El CSV** completa «País» en `prepararFilas()` con el mismo cálculo: sólo donde la celda viene vacía o el archivo
  no trae la columna. La vista previa lo dice en esa fila y el archivo de errores conserva las celdas originales.
  **Alternativas:** `libphonenumber-js` (peso y nombres); guardar el ISO en `atributos.pais` (el campo es de texto
  libre y hoy guarda «Bolivia»: habría dos formas en la cartera); preguntar el país al servidor (una petición más por
  dígito, y la tabla es estática); adivinar +1 (un lead de Canadá marcado como de Estados Unidos).
  **Consecuencia:** la tabla vive en `leads/entities/paises/` con su prueba; un import estático de ella en el shell
  rompe el e2e «la tabla de países no viaja con /leads».
  **Medido:** el JS cliente total creció 5,6 KB con gzip (788,5 → 794,1) contra la parte 8b: 3,4 KB son el chunk de la tabla y
  2,2 KB el pegamento que entra en el shell (el alta está en todas las rutas): `resolver`, `pais-del-telefono`, el estado del
  alta y los hooks. Es más de lo previsto; se acepta porque la tabla, que es lo grande, no viaja. «Datos» 43,4 de 44 KB.

## 2026-10-18 — El primer seguimiento del alta, opcional y enriquecido (Fase 3, parte 9b)

**Contexto.** «Nuevo lead» obligaba a escribir un resumen para guardar (~30 altas al día, muchas sin nada que anotar), el
detalle era un `Textarea` plano que `_lead_crear` guardaba sólo como `detalle_texto`, y «Recordatorio (opcional)» abierto
siempre empujaba a agendar incluso al anotar algo que ya pasó.

**Decidido**

- **El paso 2 es opcional y la pantalla lo dice sin bloquear** (nada de diálogo de confirmación). `Ctrl/Cmd+Enter` sigue
  avanzando (memoria muscular, y el e2e de los 25 s no cambia de forma); «Guardar lead» y `Ctrl/Cmd+S` guardan desde
  cualquier paso. Una sola regla: **se guarda lo escrito y lo vacío no**; por eso «Guardar lead» desde el paso 1 nunca
  tira lo que se escribió en el 2. El aviso va en el pie, unido por `aria-describedby` al botón: «Se creará sin primer
  seguimiento. Podrás anotarlo después desde la ficha.» (o «Se guardará con el primer seguimiento que escribiste.»).
- **`Ctrl/Cmd+S` en «Nuevo lead» guarda y deja el drawer listo para el siguiente; no lo cierra.** La regla global sólo
  dice «guardar»; lo de «guardar y cerrar» es de vehículos. El drawer es una herramienta de ráfaga y el toast ya lleva a
  la ficha.
- **Qué cuenta como «escrito»:** el resumen, un detalle con texto, una fecha elegida y un próximo contacto. Cambiar sólo el
  tipo, o abrir «Otra fecha» sin elegir, no cuenta. **Con un detalle o un próximo contacto sin resumen se exige el
  resumen, no se deriva del detalle:** es lo que se lee en la línea de tiempo y el título del recordatorio, un recorte de
  un documento con formato daría títulos rotos, y la ficha y la base ya lo exigen.
- **El toast sin seguimiento** dice «Lead #124 creado sin seguimiento» (o «tomado …») y su «Abrir ficha» va a
  `?seccion=seguimientos`, donde ya está «Anotar seguimiento»: cero componentes nuevos.
- **Un solo conjunto de campos** (`CamposDelSeguimiento`) para la ficha y el alta, sin `<form>`, pie ni foco propio: los
  modales de la 9c y la 9d lo montan tal cual. La ficha pone «Visible para el cliente» y el vehículo; el alta no
  (**«Visible para el cliente» no entra al alta**: la base rechaza `visibilidad` y `vehiculo_id` en `p_seguimiento`).
- **«Próximo contacto»** es el recordatorio que nace con un seguimiento, dicho por lo que hace: plegado detrás de
  «Programar próximo contacto», con la línea «Un recordatorio para ti: cuándo volver a contactar a este lead.» y sus
  atajos. En el código y en la base sigue siendo `recordatorio` (no hay entidad nueva). No promete un aviso: el disparo
  es de la Fase 7.
- **`ocurrido_en` pasado sí, futuro no** (`_seguimiento_fecha`: 5 minutos de margen por los relojes; la pantalla, ninguno).
- **La base reusa las reglas, no las copia:** `_lead_crear` valida el resumen, el detalle y la fecha con
  `_seguimiento_titulo`, `_seguimiento_detalle` y `_seguimiento_fecha` y vuelve a lanzar el mismo mensaje con el campo del
  alta en el `hint` (`seguimiento.detalle`, `seguimiento.ocurrido_en`). `p_seguimiento.detalle` es un documento o nulo; un
  texto se rechaza («formato que no se admite»). La forma de `crear_lead` (jsonb) no cambia, y la importación sigue sin
  seguimiento. Sin cambio de schema: `db:base` no hace falta y `db:types` sale igual.
- **Borrador:** uno solo (`lead-nuevo`), con los datos del lead y, bajo la clave `seguimiento`, los mismos valores que usa
  el redactor de la ficha (el documento como JSON; al reponerlo pasa otra vez por `documentoLimpio()`). Un solo
  «Recuperamos lo que habías escrito». **Sin tope de peso:** un documento válido pesa ≤ 20 000 octetos y uno que se pasa se
  conserva para recortarlo (perder lo tipeado es el error que no puede pasar); si `sessionStorage` no alcanza, el
  borrador ya lo calla. Los borradores viejos con `seguimiento.*` se ignoran solos.
- **Sin tipos de seguimiento activos** no hay paso 2: «Guardar lead» es el principal y el pie lo dice. No se bloquea.
- **La barra del editor tiene una sola parada de Tab** (patrón _toolbar_ de WAI-ARIA: flechas, Inicio y Fin). Antes eran
  cinco paradas antes del texto, también en la ficha; con el próximo contacto plegado, llegar a él con el teclado es Tab ×3.
- **La tarea de oro mide el seguimiento, no el próximo contacto:** `n`, Tab, `Ctrl+Enter`, resumen, `Ctrl+Enter`. El tope
  de 8 teclas de control, el KLM ≤ 25 s y el robot < 15 s siguen; el próximo contacto con teclado tiene su propio e2e.

**Un hallazgo de la verificación contra la base viva (arreglado en la misma migración).** Dos envíos del mismo intento
sobre un lead sin dueño pasaban los dos la búsqueda del intento en `actividad` (aún sin confirmar); el segundo esperaba el
`for update` y, al soltarse, **adoptaba otra vez e insertaba un segundo seguimiento y otro recordatorio**. Ahora vuelve a
mirar el intento tras el candado. Lo prueba `pnpm db:carreras` (`scripts/carreras/alta.mjs`: falla con la función
anterior, pasa con la nueva). Sigue abierto, y no es de esta parte, lo que pasa si _otra persona_ con _otro intento_
adopta el mismo lead entre la verificación y el candado.

**Alternativas.** Aceptar `detalle` como texto plano en `crear_lead` (compatibilidad que nadie usa: dos reglas para un
mismo campo). Derivar el resumen del detalle. Un botón «Guardar lead sin seguimiento» y otro «con»: el botón no sabe qué
se escribió. Tres botones con un diálogo de confirmación: son decenas de altas al día.

**Consecuencia.** `entities/primer-seguimiento.ts` (el validador del documento y las fechas) se pide con `import()` al
guardar con algo escrito, y los campos del paso 2 y Tiptap no viajan con el drawer (un e2e lo vigila: ningún chunk con
ProseMirror hasta abrir el paso 2). **Medido:** la carga en frío de `/leads` creció 0,7 KB con gzip (570,8 → 571,5 KB en
escritorio) contra el presupuesto de 1 KB del shell; el editor sigue siendo su chunk aparte. Lo que entra al shell es el estado del alta y `documento-limpio` (el borrador lo necesita para reponer el detalle por la lista blanca): moverlo a un `import()` ahorraría unos bytes pero, sin red, un borrador no se repondría y el siguiente `useEffect` lo borraría, y perder lo tipeado es el error que no puede pasar. Si el paso 2 no llega (sin red y sin caché) el drawer lo dice con «Recargar» en lugar de tumbar la pantalla; lo escrito queda en el borrador.

## 2026-10-18 — Guardar en Empresa: el formulario espera a lo guardado, y el borrador mide contra lo que mandó el servidor

**Contexto.** En la suite completa, «sin conexión, el formulario avisa y conserva lo tipeado» falló una vez: tras guardar,
el NIT tipeado y la recarga no repusieron nada. La traza lo explica. `guardarAjustes` hace `revalidatePath('/', 'layout')`:
la respuesta de la action trae el resultado y el árbol nuevo. `useGuardarAjustes` muestra «guardados» y llama a `limpiar()`
apenas se resuelve la promesa, pero `enCurso` (el `isPending` de la transición de next-safe-action) sigue activo hasta que React
dibuja el árbol, y ahí `key={huellaDelFormulario()}` reemplaza el formulario. En esa ventana (~130 ms con las 8 CPU ocupadas,
más en un celular) el campo con foco sale del DOM y lo que se teclea cae en ningún campo (Playwright parte `fill` en
`select()+focus()` y un `insertText` por CDP que no se vuelve a comprobar; una persona pierde cada tecla que cae después del
reemplazo). Se descartó que `activo` o `campos` cambiaran en Empresa (son constantes) y que el aviso no se viera (el NIT quedó vacío).

**Decisión.**

- **Bloquear hasta el remontaje, y por qué con `enCurso`.** El `<fieldset>` de Empresa se deshabilita con `!puedeEditar || enCurso`.
  `enCurso` es `subiendo || isPending` y `isPending` es el de la transición: no termina cuando llega la respuesta sino cuando se
  dibuja, que es justo el intervalo que hay que cubrir (una bandera propia, apagada al resolver la promesa, lo dejaría abierto).
  Si no cambió nada, la huella no cambia, no hay remontaje y la transición igual termina y desbloquea. Se deshabilita el
  formulario entero, no el botón: es el único lugar donde la persona puede estar tecleando.
- **La base del borrador es lo que mandó el servidor.** `useBorrador` ya no lee «lo guardado» del DOM al enganchar el efecto:
  usa `valoresGuardadosDe()` (junto a `valoresDe()` en `shared/lib/formularios.ts`): el `defaultValue` de cada campo y la opción
  marcada de un `<select>`, normalizados como los muestra el navegador (una entrada nueva, no un `cloneNode`: clonar copia lo
  escrito) y con lo deshabilitado vacío, igual que `FormData`. Así lo tipeado antes de enganchar (antes de hidratar, o entre el
  commit y el efecto pasivo) cuenta como cambio; al enganchar se guarda en el acto y no lo pisa un borrador viejo.
- **`controlado: true` para los formularios de React.** React sincroniza el atributo `value` de un `<input>` controlado pero no
  marca `defaultSelected` en un `<select>` controlado: sin `defaultValue` que leer, el valor inicial se vería como un cambio
  y saldría un «Recuperamos» falso en cada carga (lo cazó la prueba de carga limpia del formulario de campo de leads). Esos
  formularios (`FormularioDeCampo`) lo declaran y miden contra lo que se ve al enganchar, como antes. No hay forma de detectarlo
  desde el DOM sin mirar internos de React.
- **`campos` se compara por contenido.** `FormularioDeCampo` arma la lista en cada render; el efecto se reenganchaba en cada
  tecla y tomaba lo ya tipeado como guardado: escribir en un segundo campo borraba del borrador lo del primero (la hipótesis 1
  del diagnóstico era cierta, pero en el formulario de campo, no en Empresa).
- **`enfocarPrimerError` insiste** hasta 30 cuadros hasta que el campo con error exista y acepte el foco: los `aria-invalid` se
  pintan cuando React dibuja la respuesta y un fieldset deshabilitado no deja enfocar. Ya fallaba sin el bloqueo: 6 de 40 con la CPU ocupada.
- **`FormularioDeCampo` llama a `limpiar()`** al guardar o crear (lo ignoraba y el borrador sobrevivía).

**Alternativas.** Dejar el `key=huella` y no remontar tras el guardado propio (revierte la decisión que hace que el guardado de
otra persona reinicie el formulario). Sólo esperar «Guardar» habilitado en la prueba (esconde el defecto y deja la brecha
commit → efecto). `defaultValue`/`defaultSelected` por llamador (`guardado` por props, como `useBorradorDeEstado`): cada formulario
armaría strings que tienen que coincidir con lo que pinta el input.

**Consecuencia.** Quien guarda Empresa no puede teclear en el formulario hasta que se dibuja lo guardado (decenas de ms; un
celular lento, más): se ve «Guardando…» y los campos apagados. Un formulario con un `<select>` controlado que use `useBorrador`
tiene que pasar `controlado`; la prueba de carga limpia es la barandilla (falla si no). `useBorradorDeEstado` no tiene este problema:
mide contra `guardado` por props. **Barandillas:** `use-borrador.test.tsx`, la carga limpia de los 17 campos de Empresa y de los formularios de
campo de leads y de orígenes, y `e2e/empresa-guardado.spec.ts` (no se teclea mientras guarda; guardar con la CPU frenada, sólo escritorio:
con el freno solo la prueba pasa también sin el arreglo, así que la determinista es la que cuenta).

## 2026-10-18 — Los avisos no reciben el puntero; el freno de CPU se borra; lo del borrador no se reproduce

**Contexto.** «edita un tipo de cambio» (`empresa.spec.ts:158`) se colgaba a veces 30 s en el clic de «Cerrar» (1 de 40 y 2 de 40
con las 8 CPU ocupadas). Quedaban también el e2e del freno de CPU, que pasaba sin el arreglo del borrador, y un borrador que
había reaparecido tras `limpiar()`.

**Causa del toast (confirmada, no supuesta).** Tres medidas, la última aislada del test:

1. El registro de Playwright: 52 reintentos con `<li class="cn-toast" data-front="true">` interceptando el clic. «Cerrar» es el
   botón del **pie** (`.first()`: la ✕ de `SheetContent` va después de los hijos en el DOM).
2. La captura del fallo: el aviso (arriba en y≈643) cubre el pie y el centro de «Cerrar» está en y≈648, 5 px dentro. Por eso el
   fallo es de a ratos: depende de la fase de la animación de entrada. Con un aviso asentado en cualquier momento el centro
   queda tapado: la prueba determinista nueva falló **40 de 40** sin el arreglo, siempre en el `elementFromPoint` de «Cerrar»
   (escritorio y móvil).
3. La pausa: sonner 2.0.8 marca la pila expandida con `onMouseEnter`/`onMouseMove` del `<ol>` y `expanded` pausa el
   temporizador. Medido: sin puntero, el aviso se va antes de 6,5 s; con el puntero encima (aviso asentado) sigue a los 6,5 s con
   `data-expanded=true` y se va al sacar el puntero. Playwright mueve el puntero al punto del clic antes de comprobar el blanco: queda
   sobre el aviso, lo pausa y el clic no entra nunca.
   Es de producto, no del test: una persona que acaba de guardar tiene el pie del panel tapado ~4 s, y más si deja el puntero ahí.

**Decisión.** En `src/shared/ui/sonner.tsx`, `toast: 'cn-toast pointer-events-none [&_button]:pointer-events-auto'`: el aviso deja
pasar el puntero y sólo sus botones lo reciben («Descartar», «Deshacer», «Recargar», «Ingresar» y la ✕). Sin puntero encima no hay
pausa. **Alternativas:** mover el Toaster (arriba tapa la ✕ del panel y la barra superior; a la izquierda, la navegación; en móvil el
aviso ocupa todo el ancho de todas formas); subir el `offset` (hay que adivinar la altura del pie); cerrar el aviso o mover el puntero
en el test (taparía el fallo real; `descartarAviso()` de `e2e/soporte/inventario.ts` es ese parche y queda: sigue valiendo).
**Consecuencia.** Se pierde el deslizar para descartar en táctil y el hover que expande la pila: el aviso se va solo y su ✕ queda. Un
aviso con otro tipo de control tiene que ganarse su `pointer-events-auto`. La prueba (`empresa-guardado.spec.ts`) cubre dos avisos
apilados, escritorio y móvil, Escape con avisos abiertos y un aviso con acción («Descartar»).

**El freno de CPU se borra.** `guardar con la pantalla lenta…` (`Emulation.setCPUThrottlingRate`, rate 20) agrandaba la ventana
entre el aviso y el remontaje pero no fija el orden de los eventos: pasó sobre el código viejo 0 de 33 veces (y 0 de 40 sobre el nuevo).
Una prueba que pasa con y sin el arreglo no guarda nada. La barandilla es «mientras guarda no se puede teclear» (roja 33 de 33 sin el
arreglo, con la respuesta de la action retenida por `page.route`).

**Hallazgo de la medición (no se arregla acá).** El panel de un tipo de cambio tiene la misma ventana que Empresa: el aviso sale
antes de que el panel se dibuje con lo guardado, y lo que se teclea ahí se pierde (el formulario se reemplaza). Apareció una vez en 40
en mi prueba (el segundo valor tecleado desapareció del DOM y no hubo segundo guardado); la prueba ahora espera al historial. Otros
formularios con `key` por versión pueden tenerla; la barandilla de Empresa es «sin teclear mientras `enCurso`».

**Borrador tras `limpiar()`: no reproducido.** En el experimento con la respuesta retenida (Empresa, tecleando mientras guardaba) el
borrador seguía en `sessionStorage` tras el guardado, con `{razonSocial, nit}` y la base vieja. Experimento de esta parte: prueba
unitaria con `limpiar()`, desmontar y montar de nuevo con lo guardado ya cambiado → **no reproduce** (sin borrador y sin aviso;
pasa sin tocar el hook), y la prueba se descartó por pasar sobre el código actual. **No explicado.** Hipótesis, **no verificada**: el
formulario viejo salió del DOM con un campo enfocado, el navegador disparó `change` y el oyente viejo (todavía enganchado: su
limpieza corre después) volvió a escribir con la base vieja. Con el formulario deshabilitado mientras guarda ya no se puede teclear en esa
ventana; si reaparece un «Recuperamos» tras un guardado exitoso, esta es la pista (ignorar `change` tras `limpiar()` hasta el
próximo `input`) y lo que falta es un e2e que lo provoque.

## 2026-10-18 — Los e2e reusan la sesión de cada cuenta dentro del proceso, y sólo eso

**Decisión.** `entrar` (`e2e/soporte/alta.ts` e `inventario.ts`) llama a `entrarConSesion` (`e2e/soporte/pasos.ts`): la primera vez que
se entra con una cuenta es por la pantalla de ingreso; las siguientes, en el mismo proceso de Playwright, se inyectan las cookies de esa
sesión en el contexto nuevo del test y se pide `/`. Si `/` manda al ingreso (la sesión caducó, la cuenta se borró o se bloqueó), se
descarta la sesión y se entra por interfaz: nunca se sigue con una sesión rota. La caché vale 30 minutos (el token de acceso dura una hora).

**Por qué.** Era el único candidato que superaba el umbral: el ingreso eran 125 s de 577 s en escritorio, ~19 % del completo, y el
completo bajó de 22,1 a 20,5 min (la mitad de lo esperado: pedir `/` con la sesión puesta también cuesta). Los permisos se leen de la base en
cada pedido, no del token (no hay hook de JWT en `config.toml`), así que una sesión guardada no deja permisos viejos; y ningún e2e cierra sesión.

**Qué sigue cubriendo el ingreso real.** `acceso.spec.ts` ingresa sin caché (contraseña mala, ruta protegida que vuelve a donde iba,
la primera persona nace dueña); los specs de equipo, empresa, orígenes y configuración de leads tienen su propio `entrar` por interfaz
(bloquean a alguien, cambian de rol, abren el registro); y el primer `entrar` de cada cuenta de cada spec sigue siendo por interfaz.
Rompiendo `ingresar` a propósito, fallaron `acceso.spec` y el primer `entrar` de `leads-vehiculos-acceso`. Un test que cambie a la
persona o su acceso a mitad de camino pide `{ fresco: true }`.

**Lo que no se hizo, con su número.** «Solo escritorio»: los tests sin `page` son 5 (~12 s de móvil, 0,9 %) y el resto navega por interfaz,
así que no hay lista que aprobar. Reusar `.next-e2e` por una huella del código: el build son 8 s por `test:e2e` (3 s de TypeScript), bajo el
umbral; si algún día pesa, la huella debe incluir HEAD, el diff, `next.config.ts`, el lockfile y las `NEXT_PUBLIC_*` que se hornean en el
build (un `.next-e2e` viejo con código nuevo es peor que reconstruir). `tsc` ya era incremental. Video y traza (`retain-on-failure`) no
cuestan nada medible (A/B ×3: 77,3 s con ellos, 76,9 s sin ellos) y fueron los que permitieron diagnosticar el intermitente de Empresa.

## 2026-10-18 — Parte 9c: los formularios que aparecen al pulsar algo van en un modal con su URL

**Contexto.** «Agregar teléfono» y «Agendar / Editar recordatorio» se abrían dentro de la página, con estado local: recargar los
perdía, no tenían borrador ni «Recargar», y un Esc los cerraba sin preguntar. El diálogo «Dar acceso al portal» tenía tres
acciones en el pie, se salía de la pantalla en el celular y en 1280 (los tres botones empujaban el contenido fuera del borde), y la
clave podía reaparecer al reabrirlo.

**El patrón «modal por URL».** Un formulario que aparece al pulsar algo (y no es parte natural de la pantalla, como un campo en su
fila) es un `<Modal>` con su `?panel=` (y el id en otra clave: `?panel=editar-recordatorio&recordatorio=<id>`). Abrir suma al
historial («atrás» lo cierra) y recargar lo reabre. Sin permiso, la URL escrita a mano no abre nada. **Un id que no está** (ajeno,
eliminado, inventado o mal escrito: la lista sólo trae lo propio) o un estado que no se edita (completado) se revisa **una vez, al
abrir**: no se abre, lo dice un aviso y la URL se limpia. Si deja de estar **con el modal abierto**, el modal no se cierra: dice por
qué ya no se guarda y lo escrito queda a la vista. Quien monta el modal le da una `key` por apertura (`useApertura`): cada apertura
empieza de cero (un id de intento nuevo) sin cortar la animación de cierre. Se cargan con `next/dynamic` + `useAbiertoAlgunaVez`
(no cambia el documento —«Datos» sigue en 43,4 KB—: sólo el JS que se pide al abrir). `hayPanel` de la ficha pasa a ser «hay
un `?panel=`»: la lista de paneles se quedaba atrás (las oportunidades nunca estuvieron) y la ficha se releía con un modal abierto.
**Alternativa:** Drawer, sólo para lo que no cabe en una pantalla de celular (el redactor de seguimientos, a decidir en la 9d).

**Cerrar con cambios pregunta en el mismo modal, no en otro.** `Confirmar` es un `<Modal>`: abrirlo encima rompería «un modal
nunca abre otro modal». `useCierreConCambios` + `ConfirmarDescarte` cambian el pie a «Tienes cambios sin guardar.» con «Seguir
editando» (con el foco: un Enter de más no tira nada) y «Descartar». Esc durante la pregunta vuelve al formulario. Sin cambios, cierra
directo. «Atrás» del navegador no se puede interceptar y cierra sin preguntar: el recordatorio no pierde nada (su borrador lo repone
al reabrir); el teléfono extra (dos campos) sí, aceptado.

**Mientras guarda, el formulario no se toca y el modal no se cierra.** La regla de Empresa (2026-10-18: `<fieldset disabled>` con
`enCurso`) vale para todo formulario que se redibuja con la respuesta. El modal suma `bloqueado`: Esc, la ✕ y el clic afuera no lo
cierran mientras el pedido está en vuelo, porque la respuesta llegaría con el modal cerrado (en el portal, con la clave). Un envío a
la vez con una marca propia (`useRef`), no con `isPending`: el reintento al volver la conexión puede llegar mientras el anterior
termina (lo mismo que encontró la 7b en el cambio del teléfono).

**Esc tiene una sola fuente, y es Base UI.** El plan suponía que Esc llamaba dos veces a `alCerrar` (Base UI y el atajo «cerrar»).
Medido en un test: Base UI atiende Esc en el `document` y **detiene el evento**, así que el atajo de `window` nunca lo veía con un
diálogo abierto. El Modal deja de registrar el atajo (era código muerto). Para abrir un Modal desde un Drawer (9d), se dibuja dentro
de los hijos del Drawer: Base UI lo anida y Esc cierra sólo el de arriba.

**El portal: un solo botón principal.** El texto dice lo que hará con lo que hay en el campo: vacío, «Generar clave y dar acceso»;
con algo escrito, «Dar acceso con esta clave». Nunca queda deshabilitado sin motivo (sólo mientras otorga, o tras un conflicto, que
se explica adentro) y nunca tira en silencio una clave escrita (antes, «Generar» la ignoraba). **Alternativa:** «Generar una clave»
como enlace bajo el campo y «Dar acceso» como principal: dos caminos que hay que explicar. La clave se olvida **cuando el diálogo
termina de cerrarse** (`alTerminarDeCerrar`, el `onOpenChangeComplete` de Base UI) y no al cerrar: si se borraba al cerrar, el diálogo
volvía al formulario mientras se desvanecía. También se olvida al reabrir y al esconderse la pantalla; una respuesta que llega
después de olvidar (se cerró con «atrás» mientras otorgaba) se descarta por generación. En el celular el Modal va arriba, desplaza
su cuerpo y deja el pie a la vista, con botones de 44 px; el portal usa `ancho="amplio"` (512 px) por el texto de WhatsApp.

**Los campos del recordatorio son los del alta.** El «Próximo contacto» del alta y del redactor y el modal del recordatorio ya usaban
el mismo `CampoCuando` (con `atajosDeFecha()`) y el mismo `CampoVehiculo`: no había nada duplicado. `CamposDelRecordatorio` (sin
`<form>` ni pie) es lo que monta el modal. El teléfono extra reutiliza `CampoTelefono` con un estado sin verificación: un extra no es
único entre leads y no se pregunta a la base al tipear.

**Lo que encontró la revisión adversarial (corregido en commits propios).** El modal cerrado sigue montado (`useAbiertoAlgunaVez`):
un guardado que esperaba la red salía solo al volver aunque la persona lo hubiera descartado, y el borrador del recordatorio se
volvía a escribir con lo descartado si llegaba otra versión. Ahora `abierto` frena el reintento y el borrador (`activo`). La `key`
del modal de recordatorios lleva el destino (`agendar` o el id): pasar de uno a otro con el historial no mezcla lo escrito. Tras
«Recargar», lo que la persona no tocó toma la versión nueva (`conVersionNueva()`): antes se reenviaba entero y pisaba con lo viejo
un campo que había cambiado la otra ventana. `Ctrl/Cmd+S` no guarda mientras el pie pregunta por descartar. En el portal, un pedido
a la vez (un doble Enter otorgaba dos veces), otra generación también al reabrir, y si la clave llega con el diálogo ya cerrado se
avisa que el acceso cambió («Vuelve a otorgarlo para dictarle una nueva»). **Queda aceptado:** «atrás» durante un guardado cierra el
modal; si ese guardado falla, el motivo queda en el modal cerrado (al reabrir empieza de cero).

## 2026-10-18 — Parte 9d: un solo modal de seguimiento, la pestaña del drawer y las acciones de la fila

**Contexto.** Anotar y editar un seguimiento eran un redactor dentro de la ficha (sin URL; se abría solo si había un borrador;
Esc lo plegaba; el conflicto se borraba al pulsar «Recargar»). El drawer del lead era de sólo lectura y el «⋯» de la fila sólo
tenía marcas. La 9d los lleva al patrón «modal por URL» de la 9c.

**Un solo contrato, en una pieza de `shared`.** El modal del recordatorio (9c) y el del seguimiento repetían casi todo: avisos,
`<fieldset>` y `bloqueado` mientras guarda, el descarte en el mismo pie, atajos, la revisión al abrir, un envío a la vez y el
conflicto que espera la versión nueva. Todo salía **genérico y sin banderas** (lo que cambia son datos: el título, el texto del
conflicto, la etiqueta del botón), así que es `ModalDeFormulario` con tres hooks (`useUnEnvioALaVez`,
`useConflictoHastaLaVersion`, `useRevisionAlAbrir`), archivos nuevos de `shared/ui` con un solo test de contrato. El recordatorio,
el teléfono extra y el seguimiento son modales delgados encima. **Alternativa:** dos modales con el test de contrato copiado: la
próxima diferencia entre ellos sería un defecto. El foco va al primer motivo **tras un intento que no guardó**, no cada vez que
cambian los motivos: con dos campos con motivo, escribir en uno llevaba el foco al otro.

**El borrador no abre el modal solo.** Con el modal, abrirse al cargar la sección sería un modal que aparece sin pedirlo. En su
lugar, «Tienes un seguimiento sin guardar» con «Continuar» (las mismas claves de borrador que el redactor: lo viejo vuelve igual).

**«Recargar» vuelve a leer lo cargado, no la página.** `router.refresh()` volvía a sembrar sólo la primera página: un seguimiento de
«Ver más» desaparecía de la lista (y el conflicto, borrado al pulsar, volvía a chocar). `useSeguimientos.releer()` lee desde el
principio tantas páginas como había, con la misma RPC; sirve igual a la ficha y al drawer (que lee en el navegador). Un
`?seguimiento=<id>` que no está entre lo cargado se busca hasta 5 páginas antes de decir que no está. **Con el modal abierto, un lead
que deja de verse no recarga la pantalla:** el modal lo dice y lo escrito queda (en el drawer y en la tabla, volver a
leer no traería nada mejor).

**El drawer, con pestañas y sin RPC nueva.** «Resumen» (lo de antes) y «Seguimientos» (`?pestana=`), que lee al elegirla, desde el
navegador, las mismas tres consultas de la ficha (`lead_seguimientos`, `tipos_seguimiento`, `recordatorios_vista`). Cambiar de
pestaña no suma al historial: «atrás» cierra el drawer. Los modales de la pestaña se dibujan dentro del drawer (Base UI los anida).
**Con un `?panel=` abierto, el drawer no vuelve a leer al volver a la pestaña:** un «no disponible» reemplazaría el contenido y
desmontaría el modal con lo escrito. Las pestañas son propias (`role="tablist"`, flechas, Inicio y Fin, como las del embudo): las
de Base UI sumaban 4,3 KB con gzip a la carga del listado. El vehículo no se ofrece fuera de la ficha: `leads` no lee vehículos
(la página se los pasa a la sección), y pasarlos al drawer o a la tabla sería un ciclo con `vehiculos` o una prop más en el
listado; editar uno que ya tiene vehículo lo conserva.

**La regla `para=`.** Anotar o agendar desde el «⋯» de una fila no abre el drawer, así que el lead no puede ir en `?lead=`: va en
`?para=<id>`, con el mismo `?panel=` de la ficha. Los paneles de la ficha y del drawer no responden si hay `para`; los del listado
no responden si hay `lead` (nunca un modal del listado sobre el drawer). `para` tiene que ser una fila de la página, de la cartera de
quien mira, con `leads.editar`; si no, no abre y dice lo mismo que un lead que no existe. Ya abierto, el lead queda fijo (volver a
leer la lista no lo cierra), y el listado no se relee al volver a la pestaña con un panel abierto. El modal se monta una vez en el
listado y se pide al abrirse; los tipos se leen la primera vez. El listado suma una sola prop, `puedeAnotar` (un booleano):
una lista de ids como `eliminables` pesaría hasta 2 KB para decir lo mismo. Al guardar, un aviso de éxito: la fila no muestra nada
de seguimientos ni de recordatorios (privacidad), así que no hay nada que actualizar. El «⋯» pasa a llamarse «Más acciones de …».

**Medido.** «Datos» 43,3–43,4 KB (sin cambio). `/leads`: el documento 65,9 → 66,0 KB sobre `/perfil`; el JS en frío 505,0 →
508,9 KB con gzip (de 22 a 25 chunks): el código del menú, las acciones y el drawer, y un chunk compartido de entidades de leads
que ahora trae también la línea de tiempo (Turbopack la agrupa con lo que el listado ya usaba). Con las pestañas de Base UI eran
512,8. El presupuesto de `/leads` se fija en el cierre de la fase.

**Lo que encontró la revisión adversarial (corregido en commits propios).** `buscar()` salía en silencio con otra lectura en vuelo
(o si fallaba) y eso se leía como «no está»: ahora dice si buscó, espera a la lectura en vuelo y una falla no rechaza la URL. «Ver
más» y buscar reinstalaban la foto de cuando se pidió (un seguimiento eliminado mientras tanto volvía): suman sólo lo nuevo sobre la
lista de ahora. Lo que ya se abrió no se vuelve a decidir: perder el permiso o que el editado deje de estar no cierra el modal. El
drawer pausaba la relectura con cualquier `?panel=` (también uno huérfano) y una lectura ya lanzada podía desmontar el modal; con otro
lead en la URL mostraba las pestañas del anterior. Enter en un campo enviaba con un conflicto o lo editado ya no disponible, y un
segundo Enter tras guardar volvía a avisar: lo frena `ModalDeFormulario`. Un alta que salió sin red guarda su id de intento en la
pestaña hasta guardar o descartar: reabrir con el borrador no duplica. **Queda aceptado:** si ese primer envío había llegado y la
persona cambió lo escrito antes del reintento, la base devuelve el que llegó (`repetido`) y lo nuevo no se guarda; el modal de la
fila cambia de diálogo al llegar los tipos (un parpadeo); los tipos leídos quedan para la sesión del listado (uno que se apaga después
lo rechaza la base junto al campo); el «Descartar» del aviso de borrador repuesto apunta al modal en que apareció (como en la 9c).

## 2026-10-16 — Parte 9d-2: el drawer con tres pestañas y las listas de un lead a escala

**Contexto.** «Tus recordatorios» estaba debajo de la línea de tiempo del drawer, así que para agendar había que pasar por
todos los seguimientos. Las dos listas hijas de un lead no aguantaban volumen. «Recargar» releía todo lo cargado: con 1.000
seguimientos eran 51 pedidos. Lo dibujado crecía sin tope con cada «Ver más». Los recordatorios se leían con
`order by recordar_en limit 100`: los 100 más viejos, completados incluidos, así que con 3.000 completados no se veía ningún
pendiente. El aviso de vencidos contaba con `count(*)`. La regla que queda es `.claude/rules/escala.md`.

**Tres pestañas, cada una con su `import()` y su lectura.** «Resumen», «Seguimientos» y «Recordatorios» (`?pestana=`), con la
lista de pestañas propia de la 9d. «Tus recordatorios» es el mismo bloque en la ficha y en el drawer. En los dos casos se lee
desde el navegador al abrirse. La ficha ya no lo lee en el servidor: así hay una sola ruta de datos y su código no viaja con la
ficha. Las listas tienen `key={leadId}` y descartan la respuesta de otro lead.

**El tope y «Ir a una fecha».** Cada lista carga y dibuja hasta 500 (`TOPE_DE_LO_CARGADO`, de a `TAMANO_DE_PAGINA` = 20, en un
solo punto de `shared/lib/paginacion.ts`; la 9g los hará configurables). Al llegar se dice «Mostrando los 500 más recientes» y
«Ver más» desaparece. A lo antiguo se llega con «Ir a una fecha», que siembra el cursor de «Ver más» con el inicio del día
siguiente (en la zona de la empresa) y el id más alto: no hace falta una RPC nueva. Está disponible siempre que haya más, no
sólo en el tope: a una fecha de hace un año no se llega con 25 clics. **No va a la URL:** es una posición, como «Ver más».
Lo cargado es una «ventana» (`entities/pagina-de-seguimientos.ts`), y lo que vuelve de una RPC se pone sólo si cae dentro de
ella: ponerlo fuera correría el cursor y «Ver más» saltearía filas. Fuera de la vista, cada ítem no se dibuja
(`content-visibility: auto`). **Alternativas:** una lista virtual pesaba más que el problema que resuelve; sumar para siempre
crece con el uso.

**«Recargar» de costo fijo.** Tras un conflicto se relee sólo la primera página de la ventana. Si el seguimiento en conflicto
no vino en ella, se trae por su id con `lead_seguimiento(p_lead, p_id)`: invoker, la misma forma que una fila de la página,
clase L. Como mucho son dos pedidos. Lo traído queda en `sueltos`: lo ve el modal, la lista no. Lo cargado más allá de la
primera página vuelve a «Ver más». Se conserva la regla de la 9d: lo anotado, editado o eliminado mientras se esperaba se
vuelve a aplicar sobre lo que llega (`conLoPuestoMientras()`). Un recordatorio se recarga sólo él, por su id
(`recordatorios_vista` por la clave primaria): un pedido. `buscar` sigue acotado a 5 páginas; un recordatorio de la URL que no
está cargado se lee por su id.

**Los recordatorios, por RPC y no por la vista.** Con PostgREST el cursor sólo se escribe como `or()`, y un `or()` no es
condición de índice. Por eso es `lead_recordatorios()` (clase L, en `v_lecturas_con_accion` por `puedo_agendar`), sobre la
tabla: la vista unía `leads` y el planificador tomaba el índice por persona y filtraba el lead. Medido con plan genérico, en
plpgsql también rompen el índice `p_x is null or (…)` y `coalesce` en el cursor. Por eso con cursor y sin cursor son dos
consultas, y la fila se arma con su tipo (`select r from …`), sin avisos de `db:lint`. «Completados» va sin número (contarlos
crece con el total). Se muestra sólo si hay alguno, cosa que dice un `exists`, y se lee recién al abrirse.

**`lead_seguimientos` en dos ramas.** Quien ve el lead sin ser autor (la co-asesora, la dueña con «todos») recorría todos los
privados ajenos para no encontrar ninguno: la policy era un filtro sobre `(lead_id, ocurrido_en)`. Con 20.000 privados
ajenos, descartaba 20.000 filas en 4,6 ms. Ahora la página es la unión de los míos y los públicos, cada rama con su índice:
0,1 ms. La página 501 cuesta lo mismo que la 1.

**El aviso de vencidos cuenta hasta 21** («más de 20», `TOPE_DE_VENCIDOS`). La subconsulta lleva `order by recordar_en`: sin
él, el planificador tomaba el índice de la FK y recorría los completados del lead. Los demás conteos que se muestran
(`contarLeads()`, `vehiculos_vinculados`) quedan para la 9e.

**Los tipos de seguimiento no cuentan como pedido de la lista.** Abrir «Seguimientos» pide la página (uno) y los tipos activos,
que son una lista fija de configuración y no crecen con el lead. El e2e cuenta los pedidos de la lista.

**El JS en frío de `/leads` no sube: 509,6 KB, 25 chunks.** Medido sin cambios, el código nuevo sumaba 5,1 KB a **todas** las
pantallas. El layout `(app)` importa `@/modules/leads` y el `index.ts` reexporta la sección de la ficha: todo componente de
cliente alcanzable por ahí viaja en el shell (por eso `/perfil` pesa lo mismo que `/leads`). Sin tocar esa arquitectura
(queda para la 9e), el bloque de recordatorios de la ficha y lo de una línea larga («Ir a una fecha», «Desde el …», el aviso
del tope) van con `import()` diferido.

## 2026-10-16 — Parte 9d-3: el recorrido de la IA con dos cuentas

**Contexto.** Nadie prueba a mano: el recorrido lo hace la IA, con la app compilada, la dueña y una asesora, en
escritorio y celular, mirando cada captura. Dos preguntas quedaron abiertas en la 9d-2 y el cierre: qué pasa con un
clic en un aviso con un panel abierto (D) y cómo distinguir la red caída al paginar (E).

**La asesora es la de la semilla, no un rol «E2E …».** Los e2e de antes armaban asesoras con permisos a medida (tres
secciones en la ficha). Con el rol `asesor` de `seed.sql` la ficha tiene cinco y en el celular se salía de la pantalla.
Un recorrido se hace con lo que tiene una persona de verdad.

**Lo que se afirma y lo que se mira.** Al spec va lo determinista: quién recibe el clic (`elementFromPoint`), cajas
dentro de la pantalla (medidas cuando el panel terminó de animar), sin scroll horizontal, 44 px en el celular, foco,
URL y pedidos. Lo que sólo se juzga mirando (solapamientos, redacción, idioma) va a la bitácora, sin comparar píxeles.
Las capturas salen sólo con `E2E_CAPTURAS`: el spec permanente no deja archivos.

**D: el botón de un aviso recibe el clic con un modal abierto, y lo que sale de la pantalla pregunta.** El clic no
cierra el modal (el `outsidePress` de Base UI sólo cierra con el velo) y «Deshacer» actúa en el lugar. Lo que dejaba
la pantalla («Abrir ficha», «Recargar») se iba con el modal sucio. **Elegida (a):** un registro en `shared`
(`salida-con-cambios.ts`) donde se anota todo formulario abierto con algo escrito; las acciones con `sale: true` y
«Recargar» pasan por `salirSinPerder()`, que pregunta en el pie del de más arriba. Al descartar **no se cierra** el
modal: cerrar escribe la URL (sin `?panel=`) un instante después y pisaba la navegación; irse lo desmonta igual.
«Seguir editando» recibe el foco un cuadro después, porque sonner devuelve el foco al campo cuando el foco sale de los
avisos. **Alternativas:** (b) no mostrar acciones de navegación con un panel abierto (esconde la salida); (c) dejarlo
(el borrador repone lo escrito, pero se iba sin avisar).

**E: un fallo de transporte se dice como conexión, en un solo punto.** supabase-js no lanza cuando el `fetch` falla:
devuelve un error sin código con el texto del navegador. `errorDePostgrest()` lo reconoce por ese texto y, en el
navegador, dice «No hay conexión…» o «No pudimos llegar al servidor…» según `navigator.onLine`; en el servidor, lo
segundo (Node también tiene `navigator`, sin `onLine`). El código sigue siendo `inesperado`: nadie decide distinto por
él. **Sin arreglar, a la lista del cierre:** paginar el listado sin red (el `<Link>` cae a la navegación completa del
navegador) y abrir sin red un modal diferido que nunca se pidió (el `import()` falla y sube al `error.tsx`): son nueve
`diferidos.tsx` y hay que decidir qué hace el panel cuando su código no llega.

## 2026-10-17 — Parte 9e: la escala de toda la app, medida y con guardas

**Contexto.** La regla `.claude/rules/escala.md` (9d-2) sólo se había cumplido y medido en las listas de un lead. La 9e
midió **toda** la app con 50.000 leads (la dueña con «todos» y Ana, la asesora de la semilla, como `authenticated`: la RLS
cuenta), 10.000 vehículos, 200.000 seguimientos y 100.000 filas por purgar en cada job, y dejó guardas que hacen fallar la
próxima lista sin tope. Los números y el inventario: `docs/RENDIMIENTO.md`.

**Un número que se muestra nunca es un total exacto.** Una forma única: la consulta pide `tope + 1` (o cuenta sobre un
subselect con `limit tope + 1`), `conteoAcotado()` lo vuelve `{ n, hayMas }`, y se escribe «más de N» o «N+». Dos topes: el de
lo que se dibuja (500, el de las listas) y 1.000 para los de configuración. El conteo previo de la exportación pasó de exacto (815 ms)
a hasta 5.001 ids: no cabe en un pedido porque PostgREST corta en 1.000 (`max_rows`), así que `contarLeadsHasta` lee ids de a
1.000 por cursor (seis pedidos como mucho). Se probó quitarlo y leer las páginas de a 500 hasta ver si hay otra, y es peor: el
rechazo de un archivo de más de 5.000 tardaba más de lo que espera el diálogo. Lo que queda con `count(` sin tope en SQL son
validaciones puntuales, topes de la base (50 etiquetas, 10 teléfonos, 200 por lote) y acciones de administración: cada una
figura en `supabase/tests/escala.sql` con su motivo y su tope.

**El filtro de la dueña no era un problema de índice sino de costo.** Filtrar 50.000 leads por un atributo que coincide con
un cuarto tardaba 3,8 s; «sólo favoritos», 321 ms; una etiqueta, 667 ms. `atributos_lead()` (plpgsql `security definer`,
~75 µs por llamada) llevaba el `COST` por defecto (100 = 0,25 unidades): Postgres la tomaba por barata, leía los 50.000
leads, la calculaba en cada uno y ordenaba, en vez de caminar `leads_listado_idx` y cortar en 51. Con `COST 20000` camina el
índice: 3,8 s → 25 ms, 321 → 45 ms, 667 → 95 ms. **Descartado:** reescribir `leads_vista` con `left join` a favoritos y
tachados (la página 1 pasaba de 9 a 0,8 ms y «sólo favoritos» a 50 ms) y parametrizar `atributos_lead(p_lead, p_alcance,
p_publicas)` para recortar una vez por consulta. La unión hace que un filtro de selectividad mal estimada elija un
`Nested Loop` con un `Seq Scan` por fila (12 M comparaciones, 7 s), y el recorte por parámetro **no puede ser una
función que `authenticated` ejecute**: quien la llamara a mano con `p_alcance = 'todos'` leería los atributos públicos de
cualquier lead. Lo que no se evita, y queda **anotado como límite aceptado**: un filtro sobre un atributo que no coincide
con nadie y una búsqueda por nombre recorren la cartera visible (~80 µs por lead bajo RLS: ~4 s para la dueña con 50.000, 30
ms para una asesora con 2.000), y una página profunda del listado cuesta lo mismo que la primera cuando hay filtros (la
política de `leads` llama dos funciones `security definer` por fila; ~270 ms con 50.000). El paso siguiente, si la cartera
de «todos» pasa de unos 100.000 leads, es una columna con los atributos públicos mantenida por trigger (y la búsqueda por
`pg_trgm` a través de una función `definer` con el predicado de visibilidad repetido); queda en `docs/PLAN.md`.

**El shell importa una tercera entrada.** El layout `(app)` importaba `@/modules/leads`, `equipo` y `empresa`, y todo
componente de cliente que reexportan sus `index.ts` viajaba en el JS de todas las pantallas. Cada módulo suma `shell.ts`
(y `equipo`, `shell.client.ts` para `_shell/`) con lo que dibuja el marco; `eslint.config.mjs` las permite sólo desde el
layout y `_shell/`, y `mapa.sh` las lista. «Nuevo lead» es ahora un botón y la tecla `N`; el drawer (`alta-cargada.tsx`)
llega con `diferido()` la primera vez que se abre. **Resultado** (JS en frío con gzip, lo que el documento nombra): `/perfil`
547,5 → 434,9 KB (lo que pesaba sin leads en el shell: 434,8), `/vehiculos` 598,7 → 504,9, `/leads` 547,5 → 543,7. Medir
«lo que se pide hasta el `networkidle`» no sirve: Next prefetchea las otras rutas y las tres pantallas daban lo mismo; el
método nuevo cuenta los `.js` que el documento nombra y queda commiteado (`e2e/presupuesto-js.spec.ts`). **Queda:** una
pantalla paga todo lo que reexporta el `index.ts` del módulo que importa (`/perfil`, 25 KB por `ListaEquipo` y
`MatrizDeRoles`); partirlo por pantalla o hacerlo `diferido()` con SSR queda en `docs/PLAN.md`.

**`diferido()`: un solo lugar para el código que se pide al usarse.** Sin red, un `import()` que nunca se pidió falla al
abrirlo y la pantalla entera caía a `error.tsx` (9d-3). El ayudante reintenta una vez y, si no llega, dice «Sin conexión» en
su lugar con «Reintentar» y deja lo demás en pie. Los 9 `diferidos.tsx` y los dos `next/dynamic` sueltos pasan por él; el
lint prohíbe `next/dynamic`. Dos cosas que se aprendieron: una instancia que ya pasó por el `lazy` **no cambia de camino**
al terminar de cargar (cambiarlo desmontaba el modal y se perdía su estado: el resultado de «Dar acceso» volvía al
formulario), y no dibuja en el servidor (igual que `ssr: false`).

**Los jobs, con tope por lote y por corrida.** Medido con 100.000 filas por purgar: `papelera-purgar` 29 s en una corrida
y `limpieza-automatica` 24 s revisando 100.800 candidatos para contarlos. Ahora la papelera purga a lo sumo 50 lotes por
corrida (≈3 s) y **corre cada hora** (50 por hora son 240.000 leads por día), la limpieza revisa 1.000 más tras llenar el lote
(0,4 s) con `vehiculos_limpieza_orden_idx`, y las purgas de consultas de apibara y de vínculos de importación van de a 10.000
(hasta 10 por corrida). `storage-gc` encola a lo sumo 2.000 huérfanos por pasada. Lo que no entra queda para la siguiente.

**Las papeleras se leen de a 5 lotes por cursor.** Un lote ya está acotado (de 1 a 200); lo que crece es la cantidad de
lotes (60 lotes de 200 leads tardaban 597 ms y dibujaban 12.000 filas). `lotes_papelera_tipo_idx` sostiene el cursor.

**Las migraciones comprometidas no se editaron:** `20261019000100` a `…000500` son nuevas (la vista, el kanban, las
papeleras, los números acotados y los jobs).

## 2026-10-16 — Parte 9f-1: el origen del lead es configurable, y se escribe sólo por RPC

**Contexto:** `origenes_lead` (de dónde llegó un lead; no es el origen de los vehículos) sólo existía en `seed.sql`: sin pantalla, sin orden elegible, sin versión, con la RLS dejando que quien tenía `leads.configurar` escribiera directo, y la validación del origen en `_lead_crear` y `lead_guardar` con un `exists … activo` sin candado: una desactivación que llegaba a la vez que un alta podía dejar guardado un origen apagado.
**Decisión:**

- **Pantalla:** una pestaña «Orígenes del lead» en `/configuracion/leads?seccion=origenes`, sin shell nuevo. Un origen es nombre, activo y orden. **Sin icono** (el modelo no lo tenía y el repo no tiene un catálogo de iconos: el de `tipos_seguimiento` se guarda y nunca se dibuja) y **sin «por defecto»** (lo que hay es el último origen que usó cada persona, y sigue igual). Ambos quedan en `docs/PLAN.md` como candidatos junto con la pantalla de tipos de seguimiento.
- **Sólo por RPC, con el permiso que ya existía:** `origen_lead_crear|guardar|mover|eliminar` con `leads.configurar` (no hay permiso nuevo, y separar `leads.campos.gestionar` sigue por decidir), versión y `PT409`. `authenticated` ya no tiene insert, update ni delete sobre la tabla. Cada escritura devuelve la lista entera (≤ 100 filas) con las versiones nuevas: la pantalla no vuelve a leer.
- **Un lead no guarda un origen apagado, ni con una carrera:** un trigger de `leads` (`lead_origen_vigente`) mira el origen con `for share` al entrar o cambiar. La FK sólo toma `for key share`, que **no** choca con el `update` de desactivar; `for share` sí. O la desactivación espera a que el alta termine, o el alta ve el origen ya apagado y falla con «Ese origen del lead se desactivó: elige otro.» y el campo en el `hint`. Se eligió un trigger y no reescribir `_lead_crear` y `lead_guardar` (dos funciones enormes, ya auditadas y con su matriz): cubre también la importación, que pasa por `_lead_crear`. Lo que un lead ya tiene (un origen que se apagó después) no se toca: sólo cuenta cuando el origen entra o cambia.
- **Borrar sólo sin leads, la papelera incluida** (la FK es `restrict`): `exists … limit 1` sobre `leads_origen_lead_id_idx`, nunca un conteo; la lista trae `con_leads` de `origenes_lead_con_uso()` y la interfaz lo dice antes de intentarlo. Un alta que gana la carrera cae en `foreign_key_violation` y recibe el mismo mensaje. **Tope de 100** (activos e inactivos), dicho al llegar; la lista no se pagina.
- **Orden: botones, sin arrastrar, relativo («después de X») y bajo `lock table … share row exclusive`:** dos personas que reordenan a la vez van en fila y nadie comparte lugar. **Reordenar no mueve la versión** (`origen_lead_version()` sólo la mueve un cambio de nombre o de estado): así dos reordenamientos seguidos no se pisan y un nombre en pantalla no queda viejo porque otra persona movió el lugar. Cada escritura toma primero el candado de la tabla y después la fila, siempre en ese orden (si no, `guardar` y `mover` se interbloquean).
- **La clave** sale del nombre en la base (sin acentos, minúsculas, guion bajo; con sufijo si choca) y no cambia; la importación acepta nombre o clave. El nombre se normaliza (espacios) y es único sin importar mayúsculas (`origenes_lead_nombre_unico`).
- **El CSV nunca crea un origen por una errata:** una celda con un origen que no existe o está desactivado rechaza esa fila con «…no existe o está desactivado. Los activos: A, B…» (hasta 10 nombres y «y N más»; sin ninguno activo, «deja la celda vacía»).
- **El filtro por origen no tiene índice nuevo, a propósito.** Se midió con 50.000 leads: un origen con un quinto de la cartera cuesta ~100 ms (dueña) y ~20 (Ana), y uno sin leads 0,1 ms, por `leads_origen_lead_id_idx` (bitmap y top-N). Un índice compuesto `(origen_lead_id, creado_en desc, id desc) where eliminado_en is null` entrega la página en 3 ms si se fuerza el plan, pero el planificador no lo elige (estima que la policy de `leads` deja pasar ~24 de 8.000 filas): se probó, no se dejó. Es el mismo límite que el filtro sin resultados (9h).
  **Alternativas:** reescribir `_lead_crear` y `lead_guardar` con una función `_origen_lead_exigir` (más cambio sobre lo auditado, el mismo resultado); un permiso nuevo `leads.origenes.gestionar` (nada lo pedía); `advisory lock` para el alta (el `for share` ya es el candado de esa fila); un «por defecto» por empresa (no existe el concepto y el último usado por persona ya cubre el caso).
  **Consecuencia:** `humo.sql` prueba permiso, versión, nombres, tope, papelera y el trigger; `scripts/carreras/origenes.mjs`, las carreras (desactivar contra crear, contra editar, dos reordenamientos, eliminar contra crear, el 100 contra el 101); las demás carreras dejaron de pedir la clave `'web'` y toman el primer origen activo. La base sigue sin congelar (`docs/DECISIONES.md`, 2026-10-11): las columnas nuevas entran por `schemas/` y por la migración con `if not exists`.

## 2026-10-17 — Parte 9f-2: los dos números de un lead, y el global sólo con un permiso

**Contexto:** cada lead tenía un solo número, `leads.numero` (el consecutivo de toda la empresa), y cualquier persona que veía un lead lo veía: una asesora podía leer cuántos leads tiene la empresa y cuánto crece. Se pidió que cada lead lleve además un **número propio** (el consecutivo de quien lo creó, que cada quien cuenta desde 1) y que el **número global** sólo llegue a quien tiene un permiso, por ninguna ruta. Términos nuevos en `docs/GLOSARIO.md`: «número propio» y «número global».

**Decisión:**

- **El permiso es `leads.numero_global.ver`**, sin origen ni alcance, y nace con su punto de enforcement en la misma migración (`…20261019000900`): la policy de las dos copias. Por defecto lo tiene el dueño; la migración también se lo da a todo rol que ya veía «todos» los leads, para no quitarle a nadie lo que ya veía. Sin él se ve sólo el número propio, y sólo de los leads que uno creó; con él, el global y el propio de cualquiera (con el nombre de quien lo creó).
- **Enmascarar por filas, con tablas de lectura.** Una columna no puede ser legible según quién mira (un grant de columna no mira la fila) y la RLS no esconde columnas. Por eso los números se leen de `leads_numeros_globales` y `leads_numeros_propios`, copias cuya policy **es** la regla (`(select tiene_permiso(…))` como InitPlan, más `exists` sobre un lead que se ve), y `authenticated` ya no puede leer `leads.numero` (`revoke select (numero)`); `numero_propio` nunca tuvo grant. Enmascararlo sólo en `leads_vista` dejaba abierto `/rest/v1/leads?select=numero`. Lo que lee `leads` con los derechos de la base (la papelera, el alta, la importación, verificar un teléfono) calcula el permiso una vez por consulta y se lo pasa a `_lead_numeros()`. Donde había `numero` ahora hay `numero` (el global o nulo), `numero_propio` (el que se ve o nulo) y `numero_visible` (ya resuelto).
  - **Alternativas:** una columna calculada o una vista `security definer` (otro camino con la regla repetida y sin RLS); enmascarar sólo en la vista (deja abierta la API); quitar el global a todos (no se pidió: el permiso lo deja a quien lo necesite).
  - **Medido (50.000 leads):** una unión con las copias se evaluaba por cada fila recorrida y una página profunda costaba ~1.090 ms; como subconsulta escalar en la lista de columnas (se evalúa después del `limit`) bajó a ~330 ms, lo mismo que sin pedir los números (la página 100 por cursor, 12 ms). El permiso se calcula 3 veces por consulta de la dueña y 4 las de Ana (`pg_stat_xact_user_functions`), no por fila. `_lead_verificar` lo calcula perezoso: calcularlo al declarar subía la papelera de 62 a 364 ms.
- **El número propio lo asigna un trigger `before insert` de `leads`**, por cualquier camino (alta, importación, semilla, lo que venga), con una tabla de contadores de un renglón por creador (`leads_contadores`, upsert): el candado del renglón ordena a quienes crean a la vez y un rollback —también el de la subtransacción de una fila de la importación que falla— deshace el incremento y no deja un hueco. Una sequence no sirve: no vuelve atrás. Un lead sin creador vivo no lleva número propio; el que ya tenía se conserva si su creador desaparece. Los números **nunca se reasignan ni se reutilizan**: restaurar los conserva y purgar no baja el contador. `leads_numero_propio_unico` es `unique (creado_por, numero_propio) deferrable`, y el número propio es inmutable (`lead_numeros_inmutables`).
- **La importación renumera por fila.** Un archivo de 500 filas entra en lotes de 50 y cada fila vale por sí misma; el número propio se reparte en el orden de las filas del archivo, sin huecos y sin gastar con un reintento. Es la única excepción a la inmutabilidad: lo hace con `importadora.numerar_lote = 'si'`, sólo dentro de su transacción, y por eso la restricción es diferible. La columna «N.º» de un archivo no se importa (el número lo pone el sistema) y el asistente lo dice.
- **Buscar `#n` encuentra por el número que la persona ve primero** (`numeroQueSeBusca`): con el permiso, el global; sin él, el propio. Nunca el global de quien no lo tiene: buscar `#<global>` sería un oráculo que revela el número de un lead que se ve y no se creó. Se resuelve el número a su lead por la copia (`leads_numeros_globales_numero_key` o `leads_numeros_propios_creador_idx`, 0,7 y 2,7 ms con 50.000 leads) y la búsqueda entra como `id.in.(…)`.
- **La interfaz no decide qué número mostrar.** Los componentes dibujan `numero` y `numero_propio` tal como llegan, con la misma regla de `numero_visible` (el global si llegó; si no, el propio) en `escribirNumeros()`; ninguno pregunta por un rol o un permiso, y nadie lee `leads.numero` directo. Los textos: «N.º 1.234», «Tu n.º 12» y «N.º 12 · Berta» (el propio de otra persona, que sólo ve quien tiene el permiso). El listado lo dice **bajo el nombre, como hoy**, sin columna nueva. **La papelera muestra sólo el principal:** su RPC no trae quién creó el lead, y con el permiso un propio ajeno se habría leído como «Tu n.º»; el kanban y el vínculo de un vehículo también dicen sólo el principal. `numero_visible` existe en la vista y en las RPC pero la interfaz no lo lee (deriva el mismo valor de los dos campos): no es una decisión de acceso.
- **El CSV exportado** lleva «N.º» (sólo con el permiso) y «N.º propio» antes del nombre. Las constancias (`actividad`) no guardan ningún número: `actividad.antes/despues` excluyen `numero` y `numero_propio`, y la matriz de `db:probar` lo busca con un patrón.
- **Realtime no los publica, y una prueba lo cuida.** `supabase_realtime` no tiene ninguna tabla hoy: `select pubname, tablename from pg_publication_tables where tablename in ('leads', 'leads_numeros_globales', 'leads_numeros_propios')` da cero filas (Realtime reparte las filas que cambian y ninguna policy de columna cubriría ese canal). `numero-global.sql` falla si una migración las publica.
- **El relleno de la migración `…000900` apaga los triggers de `leads`** (`alter table public.leads disable trigger user`, transaccional): con 62.000 leads baja de ~12 s a ~3,5 s. Sirve para una base vacía o chica; **repetido sobre una base viva grande necesita lotes**, porque el `alter` toma un candado que bloquea las escrituras de `leads` mientras corre. Numera sólo lo que no tiene número, a continuación del mayor de cada creador (también cuentan los de la papelera).

**Consecuencia:** migraciones nuevas `…20261019000800` a `…001100` (las comprometidas no se editaron; el esquema base sólo por `pnpm db:base`). `db:probar` suma `numeracion.sql` y `numero-global.sql`: sondas de cada ruta que puede devolver un número (la persona sin el permiso no recibe uno con el patrón `9182xxxxx` en nada), un inventario por `pg_proc` que obliga a que una función nueva que pueda devolverlo esté cubierta, los privilegios (`information_schema.column_privileges` y `has_*_privilege`: falla si `authenticated`, `anon` o PUBLIC leen `leads.numero` o `numero_propio`, o tienen `select` de tabla sobre `leads`), la publicación de Realtime y el oráculo; cada una se probó con una fuga a propósito (un grant de tabla, de columna y a PUBLIC, una publicación y una policy abierta). e2e: `leads-numeros-recorrido.spec.ts` (la dueña, Ana, conceder y quitar el permiso con la sesión abierta, la importación, el rechazo `42501` de `/rest/v1/leads?select=numero` y el oráculo con un lead compartido) y `leads-numeros-pantallas.spec.ts` (kanban, papelera, vehículo, búsqueda y archivo exportado).

## 2026-10-17 — Parte 9g: ítems por página configurables, y la base acota toda página

**Contexto:** cada lista fijaba su tamaño en un lugar distinto: `TAMANO_DE_PAGINA_DE_LEADS` en `leads`, un `TAMANO_DE_PAGINA` local en la página de vehículos que tapaba al de `shared`, el 20 de «Ver más», el 50 del kanban, el 5 de las papeleras; y en SQL cada RPC acotaba con su `least(greatest(…))` y su literal (50, 51, 100, 1.000). El listado y el inventario, además, son lecturas de PostgREST sin otro tope que `max_rows`.

**Decisión:**

- **Una preferencia global de la persona, «Ítems por página» (10, 25, 50, 100), con un máximo por lista.** Se muestra el menor de lo pedido y el máximo de la lista, y el selector ofrece hasta ahí. Una por lista habría sido más control para casi nadie; la global sigue a la persona y el máximo protege a cada lista.
- **Va en `preferencias_usuario` (clave `listas.por_pagina`), no en una tabla ni una columna nuevas.** Es lo que `mi_sesion()` ya entrega en cada request (cacheado): la página la lee de `sesion.preferencias` sin ninguna consulta más. La base la valida con un `check` en `schemas/` (sólo 10, 25, 50 o 100 como número; ni 7, ni «50», ni 1000). **Sin versión, a propósito:** es una preferencia de una sola persona, la última escritura gana y no pisa trabajo de nadie (igual que densidad y tema).
- **`?por=` sólo puede pedir uno de los cuatro tamaños** (entero, sin ceros ni signos) y se acota al máximo de la lista; lo demás se ignora y manda la preferencia. Elegirlo en el selector pone `?por=` y lo guarda, no al revés: la primera lectura del servidor trae el tamaño nuevo sin esperar al guardado. «Ver como» no cambia nada: la sesión es la de quien mira.
- **Guardar y navegar van en ese orden, no a la vez.** Se probó a la vez y fallaba: la respuesta de la acción que guarda trae la página de la URL de antes y, si llegaba después de la navegación, la pisaba (la URL decía 25 y la lista seguía en 100). Cuesta una ida y vuelta (~50 ms) antes de que cambie la lista, con el selector mostrando ya lo elegido.
- **Sin red, el cambio se muestra y espera:** no navega ni guarda, y sale solo, una vez, al volver la conexión (como paginar). Si guardar falla con la red presente, la página igual cambia y se ofrece «Reintentar». Con el teclado las flechas recorren sin ir al servidor y Enter confirma (Esc cancela).
- **Las listas con selector son las dos que tienen Anterior y Siguiente con filtros:** el listado de leads y el inventario de vehículos. **Se quedan fijas, y por qué:** «Ver más» de seguimientos y recordatorios (20, hasta 500: más ítems por clic empeora el DOM sin acortar el camino a lo antiguo, que es «Ir a una fecha»); la columna del kanban (50, su propia unidad); las papeleras (5 lotes: **un lote ya trae hasta 200 filas**, así que 10 ya son hasta 2.000; entran cuando un lote muestre sólo los primeros 20, pendiente del cierre); «importaciones recientes» (20 de las últimas 24 h, sin páginas); el equipo (decenas, sin páginas); la vista previa de la importación (páginas en memoria de ≤ 500 filas).
- **El máximo del listado de leads es 50, no 100.** Se midió con 62.000 leads: la página 1 de la dueña («todos») cuesta 13 ms a 50 filas, 18 ms a 75 y **518 ms a 100**, porque con 101 filas el planificador deja de caminar `leads_listado_idx` y lee los 50.000 leads para ordenarlos (Ana, «propios», descarta 47.603 filas). Es la misma estimación de la política de `leads` que limita la cartera de «todos» (9h). El inventario sí cabe con 100 (0,6 ms con 10.000 vehículos, 57 KB comprimidos, 7.900 nodos también en el celular). Cuando la 9h arregle la estimación, `MAXIMO_DE_PAGINA_DE_LEADS` sube a 100 y `db:medir:volumen` lo asserta.
- **La base acota todo con un solo ayudante.** `_acotar_pagina(pedido, por_defecto, máximo)` (nulo da el valor por defecto; el resultado queda entre 1 y el máximo) reemplaza los seis `least(greatest(…))` de `lead_seguimientos`, `lead_recordatorios`, las dos papeleras y el kanban (misma firma y mismos errores), y el listado y el inventario, que no son RPC, quedan acotados por `max_rows` (1.000). La guarda de `pnpm test` (`scripts/guardas/paginas.test.ts`) lee la **última** definición de cada RPC registrada y exige que acote con el ayudante y que su máximo no sea menor que lo que pide el código; la de `pnpm db:probar` (`escala.sql`) recorre `pg_proc` y falla con toda función que un cliente pueda llamar con un tamaño y no lo acote. Las funciones de los jobs (`storage_gc_reclamar`, `web_expirar_solicitudes`) no las puede ejecutar `authenticated` ni `anon`: no entran.
- **El tamaño sale de `shared/lib/paginacion.ts`.** `TAMANO_DE_PAGINA` se renombró `TAMANO_DE_VER_MAS` (ya no decía de qué) y `TAMANO_DE_COLUMNA` y `LOTES_POR_PAGINA` se mudaron ahí; `scripts/medir-listado.mjs` lee los tamaños del código y se los pasa al SQL de la medición, que ya no escribe ninguno.

**Alternativas:** un valor por lista (más pantallas y más casos para casi nadie); guardarlo en el perfil como columna (otra lectura o otra columna en `mi_sesion`, y una migración de la tabla más caliente); una cookie (no viaja entre dispositivos, que era lo pedido); navegar y guardar a la vez (la carrera de arriba); un `select` de Base UI para confirmar con Enter (nadie lo usaba y sumaba JS a `/leads`: se usó el nativo y se difiere el cambio del teclado a mano); subir el máximo de leads y arreglar el plan aquí (es la 9h, que se decidió aparte); un RPC para el listado y el inventario (para acotarlos con el ayudante: cambiaba cómo se leen y filtran las dos pantallas más usadas).

**Consecuencia:** migración `…20261019001300_paginas_acotadas.sql` (más `…001200`, el nombre del creador del número propio, que sale con esta parte: ver BITACORA) y el `check` en `schemas/02_equipo` con `pnpm db:base`. `escala.md` dice el tamaño y la regla de la base; `RENDIMIENTO.md` suma «Selector» y «Máximo» a su inventario. **Pendiente:** el máximo de leads a 100 con la 9h; las papeleras al selector con «mostrar los primeros 20 de un lote» (cierre).

## 2026-10-17 — Parte 9h: la cartera de «todos» a escala, con la regla escrita una vez y estimable

**Contexto:** con 50.000 leads, para la dueña («todos»), un filtro sin resultados costaba ~4,4 s, una etiqueta 717 ms, los tachados 104 ms, un origen ~100 ms y la página 1 a 100 filas 518 ms (13 a 50): por eso el máximo de leads por página quedó en 50 en la 9g. La 9e propuso una columna de atributos públicos y `pg_trgm` por una `definer`; la 9f-1 probó un índice compuesto por origen que el planificador no eligió. Se midió primero (`EXPLAIN (ANALYZE, BUFFERS)` por cláusula, la dueña, Ana, Berta y una asesora con 3 leads, plan genérico y personalizado, 50.000 y 200.000 leads).

**La causa, medida:**

- **La estimación de la policy de `leads`.** `(select alcance_de('leads.ver')) = 'todos'` sola es un One-Time Filter, pero dentro del `OR` con la rama «propios» es un `Param = const` sin estadísticas: vale `DEFAULT_EQ_SEL` (0,005). La rama «propios» suma 0,0025 y el `OR` queda en 0,0075. `not (select lead_en_limbo(id))` es un SubPlan por fila: 0,5. Junta, 188 filas estimadas de 50.183 (152 en el plan real); pasan 50.000 para la dueña y 2.400 para Ana. En la vista, `en_cartera(l.id)` (SQL `definer`, no se inlinea) vale 1/3 y un filtro sobre `atributos_lead()` 0,005. Con `limit 101` y ~150 estimadas, «leer toda la cartera y ordenar» le parece tan barato como caminar `leads_listado_idx`: el plan cambiaba entre 51 y 101 filas, y con 200.000 leads volvía a cambiar (707 estimadas > 101). Plan genérico y personalizado dan lo mismo: el error está en los InitPlan, que no se conocen al planificar.
- **El costo por fila.** Leída la cartera entera, cada fila pagaba el SubPlan del limbo (4 buffers), las uniones de tachados y favoritos (~10 µs) y, al filtrar por un atributo, `atributos_lead()` (~75 µs).
- **Un hallazgo que no estaba en el inventario:** «míos», lo que la dueña ve por defecto, costaba 870 ms con 50.000 leads.

**Decisión:**

- **La cartera y los atributos públicos en la fila.** `leads.cartera` (los `usuario_id` vigentes de `leads_asesores`, ordenados; vacía = limbo) la recalculan tres triggers por sentencia de `leads_asesores`; cubre todo camino (transferir, compartir, revocar, salir, tomar del limbo, la baja de una persona —el lead queda sin dueño y con sus compartidos—, el alta, importar, deshacer). Eliminar y restaurar no la tocan: la policy mira `eliminado_en`. El trigger **bloquea los leads en orden de id antes de recalcular**, en otra sentencia: en READ COMMITTED esa sentencia ve lo que otra transacción confirmó mientras esperaba (sin el candado, `db:carreras` atrapa la baja contra compartir). `leads.atributos_publicos` (sin las claves que el layout no conoce como públicas, falla cerrada) la calcula un trigger `before` de `leads`, que toma `for share` los campos que lee. **Las dos las lee `authenticated`** (la vista es `security_invoker`): la cartera no da nada que `leads_asesores` no dé ya de un lead que se ve, y la copia es lo que ya recibe quien ve el lead sin la cartera. `atributos`, el teléfono y los números siguen sin grant.
- **La regla, una vez:** `_lead_visible_para(eliminado_en, cartera, alcance, yo)`, SQL inmutable y sin `set` (se inlinea), la usan la policy, `puede_lead()` y `atributos_lead()`, que antes la repetían cada una a su manera. **Se escribe `nullif(case alcance when 'todos' then true when 'propios' then yo = any(cartera) end, false) is not null` a propósito:** un `is not null` sin estadísticas vale 0,995, lo cierto para «todos», y para «propios» deja al planificador del lado seguro (caminar el índice y cortar). Con el `case` a secas valía 0,5 y un filtro opaco volvía a dejar la estimación bajo el límite (etiqueta 218 ms, un atributo 65). La regla de siempre (`lead_en_limbo`, `mis_leads`, `en_cartera`, que leen `leads_asesores`) queda como fuente, y `derivados-leads.sql` compara: las copias con su fuente para **todos** los leads tras 300 cambios al azar y por cada RPC, y lo que cada persona ve por la policy con la regla de siempre. Rompiendo la regla a propósito (sin la condición del limbo) fallan humo, la matriz y esta prueba.
- **Un campo público se filtra por su copia** (`columnaParaFiltrar()`); uno privado, por lo recortado y con `en_cartera = true` (sólo la cartera lo tiene).
- **Cambiar la privacidad de un campo va por lotes.** Quitar una clave de la copia en 200.000 leads cuesta 9 a 21 s en una sentencia (10 s aun sin los triggers por fila) y el `statement_timeout` de `authenticated` es de 8 s; hacerlo de a poco con el campo ya privado dejaría la clave legible mientras tanto. `solo_cartera_pendiente` dice a dónde va: **a privado** el campo sigue público hasta que ningún lead tenga la clave en la copia (desde que empieza, ningún lead nuevo la lleva); **a público** es inmediato y la copia se completa. `lead_campo_guardar` corre el primer lote y el job `leads-campos-privacidad` sigue cada minuto. La pantalla muestra lo pedido, con «Pasando a privado» en la fila.
- **El relleno de una base viva**, por lotes y reanudable: `…001400` agrega las columnas nulas y los triggers; `_leads_derivados_rellenar(p_lote)` llena de a lotes con `skip locked` (212.000 leads: 43 lotes de 5.000, ~450 ms cada uno); `…001600` se niega si queda algo y recién entonces pone `not null` y cambia la policy.
- **El máximo de leads por página es 100.**

**Resultado (50.000 leads; la dueña / Ana):** página 1 a 100 filas 518 → 19 / 17 ms; una profunda 390 → 19 / 17 ms; «míos» 870 → 10 ms; un filtro sin resultados 4.365 → 21 / 16 ms; etiqueta 717 → 42 / 24 ms; tachados 104 → 12 / 10 ms; un origen 100 → 10 / 10 ms; búsqueda sin resultados 404 → 51 / 16 ms; exportar 210 → 5 / 16 ms. En el navegador, con 100 filas: 5.020 nodos en escritorio y 5.015 en el celular (presupuesto 9.000), 46,6 KB comprimidos. **Lo que cuesta escribir:** alta 1,9 → 2,3 ms; importar 500 filas en lotes de 50 809 → 1.017 ms (el lote más lento 89 → 110 ms); transferir 5.000 de a uno 6,3 → 8,6 s; la baja de Berta (7.000 leads) 113 → 510 ms.

**Límites aceptados, con su número:** un filtro por un campo **privado** sin resultados recorre la cartera de quien filtra con `atributos_lead()` (~66 µs por lead: ~1 s la dueña con 20.000; antes ~4 s sobre todo lo visible); la baja de alguien con 80.000 leads tarda 6,7 s (era 0,75: se reescribe la fila de cada lead; recalcular por conjunto, sin el candado previo o con `fillfactor` no bajó de 5,3 s); una asesora con 3 leads sobre 200.000 recorre el índice entero (~70 ms; antes 58).

**Alternativas descartadas:** (c) una función `definer` que recorte una vez por consulta (repite la regla y, como mostró la 9e, si `authenticated` la llama con el alcance como parámetro filtra datos); (d) estadísticas extendidas o un índice parcial (no ven un InitPlan, y no hicieron falta: el origen camina `leads_listado_idx` en 10 ms); sólo reescribir la policy con `case`, sin columnas (arreglaba la página y la profundidad, no el filtro sin resultados: 4 s); una tabla aparte para la cartera (con su RLS abierta dejaría contar todos los leads de la empresa); `pg_trgm` para la búsqueda (bajo RLS `ilike` no es `leakproof`: necesitaría una `definer` con la regla repetida; con la cartera en la fila la búsqueda bajó a 51 ms con 50.000 y 185 con 200.000); una `atributos_lead()` en SQL (18,8 s: una función SQL que no se inlinea se vuelve a planificar en cada llamada; por la misma razón `alcance_de()` se llama fuera de su consulta, 265 → 66 µs).

**Consecuencia:** migraciones `…20261019001400_leads_derivados.sql`, `…001500_campos_privacidad_por_lotes.sql` y `…001600_leads_visibilidad_estimable.sql`; `supabase/tests/derivados-leads.sql` (en `db:probar`), `scripts/carreras/cartera.mjs`, `medir-escala.sql` con las metas, «míos», Berta y la asesora de 3 leads, y `pnpm db:sembrar-volumen -- --leads N`.

## 2026-10-17 — Cierre 1 (A): la baja de una persona va en dos tiempos, y la regla ya sabe que hay una baja en curso

**Contexto:** la 9h dejó la baja de una persona reescribiendo la fila de cada uno de sus leads en una sola sentencia: 6,7 s con
80.000 y, medido hoy, 17,9 s con 200.000, que `authenticated` corta a los 8 s. Además, mientras dura, esa transacción retiene
todos esos leads.

**Decisión:**

- **Dos tiempos.** `equipo_dar_de_baja` hace lo instantáneo (la cuenta, la cola de la web), anota la baja en `equipo_bajas`
  (tabla nueva: persona, quién, cuándo empezó y terminó, cuántos leads al limbo y oportunidades canceladas) y corre el primer
  lote de 5.000 en la misma llamada: una cartera chica termina ahí, como antes. Devuelve `{ terminada, leads_al_limbo }`. El
  resto lo hace el job `equipo-bajas` (cada minuto), que corta cada corrida pasados 1,5 s.
- **El lote nunca espera y no se interbloquea.** Toma los ids de la persona por `leads_asesores_usuario_vigente_idx` y después
  bloquea esos leads por su clave con `skip locked` (el mismo orden que compartir y transferir: `leads` y después
  `leads_asesores`). Un lead que otra RPC tiene bloqueado lo toma la corrida siguiente. Lo pendiente lo dicen los datos (filas
  vigentes de la persona): una corrida cortada se revierte entera y la siguiente sigue, sin duplicar ni perder.
- **Lo que ven los demás mientras dura es el estado final.** `_bajas_en_curso()` (un InitPlan sobre una tabla casi siempre
  vacía) entra a `_lead_visible_para(…, fuera)`, que pasa de «cartera no vacía» a «alguien de la cartera que no está en baja»
  (`not (cartera <@ fuera)`), y a `lead_en_limbo`, «Quién lo tiene», el dueño, la verificación del teléfono y la vista previa.
  Un lead que sólo tenía esa persona ya es limbo para todos y se adopta al registrar el teléfono; uno compartido lo sigue
  viendo quien lo comparte, sin dueño. Las RPC que escriben la cartera aplican la baja al lead que bloquearon
  (`_lead_aplicar_bajas`) y deciden sobre el estado final: adoptar no choca con el dueño único, transferir con el dueño viejo
  dice que cambió de dueño, quitar acceso no deja crear un limbo. Compartir o transferir **a** quien se da de baja toma su
  perfil `for share`: espera y ve la cuenta apagada (antes nada lo impedía y la fila nueva quedaba vigente).
- **La vista previa cuenta hasta 1.001** («más de 1.000 leads irán al limbo»): era exacta y crecía con la cartera. El aviso del
  final sí es exacto: son las filas que la baja pasó.

**Alternativas:** una transacción larga en un job sin `statement_timeout` (no se reanuda, retiene 200.000 leads ~18 s);
recalcular la cartera por conjunto o con `fillfactor` (la 9h: no bajó de 5,3 s con 80.000); dejar la regla como estaba y aceptar
que los leads sin nadie se vean un rato como de quien se fue (es justo lo que el encargo descarta); un procedimiento con
`commit` entre lotes (pg_cron lo admite, pero no se puede llamar dentro de una transacción de prueba y los demás jobs son
funciones).

**Consecuencia:** migración `…20261019001700_bajas_por_lotes.sql` y `equipo_bajas` en `schemas/02_equipo`. `humo.sql` (la baja en
curso: quién ve qué, adoptar, transferir, compartir, quitar acceso y el job), `derivados-leads.sql` (bajas a medias entre los
cambios al azar), `scripts/carreras/cartera.mjs` (siete carreras: compartir con la persona en los dos órdenes, transferir durante
un lote y después, dos bajas con un lead común, un lote cortado) y `medir-bajas.sql`, que **no** va en una transacción que se
revierte: ahí nada de lo revocado se puede descartar entre lotes y la medición mentía (6 s un lote); confirma como la base viva
y borra lo que crea. Un hallazgo en el camino: empezar cada lote desde el principio recorría, dentro de la misma corrida, lo que
los anteriores ya habían revocado (5,6 s una corrida); cada lote sigue ahora desde el último lead del anterior.

## 2026-10-17 — Cierre 1 (B): una sola vista por lista, elegida en el servidor con el ancho de la petición

**Contexto:** el listado de leads, el inventario y el kanban dibujaban sus dos vistas (tabla y tarjetas; columnas y pestañas) y
el CSS escondía una. Con 100 filas el HTML del inventario pesaba 1,39 MB crudos y había 7.900 nodos también en el celular. El
kanban ya dejaba una sola al hidratar, pero el HTML traía las dos. Y en el celular el selector «Ítems por página» quedaba al pie
de ~40.000 px de tarjetas.

**Decisión:**

- **El servidor sabe el ancho.** El navegador deja su ancho en una cookie (`ancho`, en px) al hidratar y cada vez que cruza un
  corte (640, 768, 1024); sin cookie, el `user-agent` decide (un celular, 400; lo demás, 1280). El layout `(app)` lo lee
  (`anchoDeEstaPeticion()`) y lo reparte con `<ProveedorDeAncho>`; `useAlMenos(corte)` es un `useSyncExternalStore` cuyo snapshot
  del servidor es ese ancho: el HTML trae una sola vista y la hidratación no la cambia. Girar el celular (girado mide más de 768)
  o redimensionar cambia de vista en el cliente, con las mismas filas, sin red. La única vez que la vista cambia al hidratar es
  una primera visita con un ancho que el `user-agent` no anticipa (una ventana de escritorio angosta); desde ahí manda la cookie.
- **Un proveedor en el layout y no una prop por pantalla:** las tres listas y el `FilterShell` lo usan sin que cada página
  tenga que leer cookies; una navegación del cliente no hidrata y usa la pantalla de verdad.
- **El selector va una sola vez:** en la barra desde `md`; por debajo, arriba de la lista, a la derecha. Sin «volver arriba»:
  Anterior y Siguiente quedan al pie, donde se llega leyendo. El panel de filtros también usa el ancho de la petición (una
  pintura de escritorio ya no abre la hoja un instante).

**Medido (100 filas, con volumen):** listado de leads 704.768 → 465.393 B crudos en escritorio y 427.052 en el celular (46,5 →
37,6 / 37,3 KB comprimidos), 5.020 → 2.594 nodos y 5.015 → 2.781; inventario 1.387.796 → 919.569 / 740.210 B (57,2 → 47,3 / 45,2
KB), 7.894 → 4.916 y 7.888 → 3.295 nodos. Lo que queda crudo es el flujo de React con las filas (una vez, no dos).

**Alternativas:** una sola marca que el CSS acomoda como tabla o como tarjeta (rompe la semántica de la tabla para el lector y
todos los localizadores); las dos en el HTML y una al hidratar (lo que hacía el kanban: el HTML sigue doble); Client Hints
(`Sec-CH-Viewport-Width` no llega en la primera visita y sólo en Chromium); una cookie de vista («tabla»/«tarjetas») en vez del
ancho (cada lista tiene su corte: el kanban, 640).

## 2026-10-17 — Cierre 1 (G): «página N» se descarta; arriba se dice lo que sí es verdad

**Contexto:** la 9e anotó que en el listado no se sabe en qué página se está. Con paginación por cursor no hay un número
verdadero: saberlo exige contar las filas anteriores al cursor (un costo que crece con la profundidad, y la regla de escala no
admite un número que crece con la tabla). Un contador en la URL (`?p=`) mentiría al llegar por un enlace o una vista guardada, al
volver con «atrás» a un cursor y cuando entran leads nuevos (la página «3» deja de ser la tercera); y no se puede comprobar
contra la base.

**Decisión:** no se muestra «página N». Arriba de la lista (leads e inventario) va lo que sí se sabe: sin página anterior, «Los
más recientes»; con ella, «Creados hasta el 2 sep 2026» (la fecha de la primera fila que se ve: las dos listas van de la más
nueva a la más vieja) y «Volver al principio», que quita el cursor y conserva filtros, búsqueda y tamaño
(`ubicacionDeLaPagina()` en `shared/lib/paginacion.ts`, `<UbicacionDeLaPagina>` en `shared/ui/paginacion.tsx`).

**Alternativas:** un contador en la URL (miente, ver arriba); contar hasta un tope («página 3 de más de 20», que exige leer las
filas anteriores y sigue sin saber dónde se está pasado el tope); el rango «del 2 sep al 14 ago» (más largo, y la última fecha ya
se ve al pie).

## 2026-10-17 — Cierre 1 (C): un lote de la papelera muestra sus primeros 20, y la papelera no entra al selector

**Contexto:** una página de papelera son 5 lotes y un lote, hasta 200 filas: 1.000 filas, ~8.200 nodos, y para cada lead la
base calculaba si puede volver (verifica su teléfono). La 9g dejó pendiente decidir si las papeleras entran a «Ítems por página».

**Decisión:**

- `leads_papelera_listar` y `vehiculos_papelera_listar` reciben `p_primeros` (acotado con `_acotar_pagina(p_primeros, 20, 200)`,
  `PRIMEROS_DEL_LOTE` en `paginacion.ts` y al registro de la guarda) y devuelven de cada lote los primeros 20 por número y
  `en_papelera` (cuántos quedan, exacto: a lo sumo 200, contado sobre 201). «Mostrar los N» pide **ese lote entero** desde el
  navegador (`leads_papelera_lote`, `vehiculos_papelera_lote`: el mismo filtro que la lista; nulo si el lote ya no está).
- **Sin selector:** la unidad es el lote, y 5 lotes de 20 ya son 100 filas, el máximo de una página. 10, 25, 50 o 100 lotes
  multiplicarían el DOM sin acercar lo antiguo, que está en Anterior y Siguiente.
- Lo leído vale para la versión del lote: restaurar o purgar vuelve a leer la página y el lote vuelve a sus primeros 20 (no se
  vuelve a pedir solo: hacerlo desde un efecto choca con la regla de hooks y no se desactivan reglas). Purgar el lote entero
  dice cuántos son de verdad y nombra a los primeros cinco de los que se ven.

**Alternativas:** las papeleras al selector con lotes de 20 (lo que proponía la 9g: no acorta nada y suma un control); traer los
200 y dibujar 20 (los bytes y el costo de la base siguen); un «Ver más» de a 20 dentro del lote (más clics para lo mismo que
«Mostrar los N», con un tope de 200 por la base).

## 2026-10-17 — Cierre 1 (D): los topes se dicen, con un solo aviso y sin inventar un camino que no existe

**Contexto:** cuatro lecturas cortaban en silencio: los vínculos (50) y los interesados (100) de un vehículo, los tres bloques
de «Vehículos» del lead (100 / 100 / 50) y el selector «Agregar vehículo» (20), más el historial de un tipo de cambio (30).
Cada lista que sí avisaba tenía su propio párrafo.

**Decisión:** cada lectura pide uno de más (`limit tope + 1`, mismas firmas: `…20261019001900_topes_que_se_dicen.sql`; el
historial de tipos de cambio desde la app) y `cortarAlTope()` de `shared/lib/conteo` corta y dice si había más. El aviso es uno,
`<AvisoDeTope>` de `shared/ui`: al pie, `role="status"`, «Mostrando los N … más recientes.» (`textoDelTope()`). Donde hay un
camino a lo que no se ve, se nombra (el selector: «Escribe más para afinar la búsqueda.»); donde no lo hay (cien interesados
de un vehículo, treinta cambios de un tipo de cambio), el aviso dice lo que se ve y nada más: inventarle un «Ver más» a una
lista que nadie va a recorrer sería código sin uso. «Vehículo (opcional)» de una nota lo dice como ayuda bajo el campo (un
`<select>` no tiene pie). `oportunidades-del-lead` dejó su copia local y usa el compartido.

**Alternativas:** un «Ver más» en cada una (más código y pedidos para listas que en la práctica no llegan al tope); contar el
total (la regla no admite un número que crece con la tabla).

## 2026-10-17 — Cierre 1 (E): para llegar a lo antiguo de una columna del kanban, buscar

**Contexto:** una columna dibuja a lo sumo 500 tarjetas (las de actividad más reciente) y el aviso decía «Las demás siguen en la
ficha de cada lead»: con 8.000 en una etapa, una oportunidad vieja no tenía camino desde el tablero.

**Decisión:** «Buscar en el embudo» (`?q=`): el título de la oportunidad o el nombre del lead, desde 2 caracteres, en **todas**
las columnas; el conteo de cada una cuenta lo que coincide. `embudo_tablero` y `embudo_etapa_pagina` reciben `p_buscar`
(`…20261019002000_embudo_busqueda.sql`, `_embudo_patron()` escapa los comodines); siguen siendo de invocador. Camina
`oportunidades_tablero_idx` y filtra: sin resultados recorre la columna de la persona, medido con 8.000 en una etapa en 175 ms (el
tablero sin buscar, 147). El aviso del tope pasa a «Busca para llegar a las demás.» con un botón que lleva el foco a la búsqueda.
«Ver más» conserva la búsqueda; una página que llega después de cambiar la búsqueda o el embudo se descarta; sin red no navega,
lo dice y se aplica sola al volver. La búsqueda es de esta vista: «Lista | Embudo» no lleva parámetros de una a la otra (como
hasta ahora con los filtros del listado).

**Alternativas:** «Ir a una fecha» por columna (el orden del índice, sin recorrer; se dejó como plan B si buscar no cabía en su
presupuesto, y cupo con margen: no se dejan los dos); filtros por monto o vehículo (no los pidió nadie y la búsqueda ya llega);
trigramas (bajo RLS un `ilike` no usa el índice: no es `leakproof`).

## 2026-10-17 — Cierre 1 (F, d): el barrido de huérfanos de storage-gc sigue un cursor por bucket

**Contexto:** `storage_gc_encolar_huerfanos` hacía un anti-join sobre el bucket entero en cada pasada (hasta 5 por corrida):
con 301.000 objetos ya encolados tardaba 208 ms aunque no quedara nada por encolar, y crece con el bucket.

**Decisión:** una tabla `cola_gc_barrido` (bucket, último nombre examinado, desde cuándo corre la vuelta) y una ventana de
**10.000 objetos examinados** por pasada en orden de nombre (el índice único `bucketid_objname` de `storage.objects`): se encolan
los huérfanos de esa ventana, el cursor avanza y, cuando la ventana no se llena, la próxima pasada empieza otra vuelta. El tope
pasa a ser lo examinado y no lo encolado. Medido: 82–175 ms por pasada al principio o al final del bucket; una vuelta por
301.000 son 31 pasadas (con 5 por corrida cada hora, unas 6 horas): los huérfanos son basura y pueden esperar. La fila del
cursor se toma `for update`: dos corridas que se cruzan no examinan la misma ventana. Lo de menos de 24 h que la ventana pasa
lo encuentra la vuelta siguiente.

**Alternativas:** un `created_at` como cursor (un objeto viejo que queda huérfano después no se volvería a ver); ventanas más
chicas (más pasadas para la misma vuelta, sin bajar mucho el costo fijo de cada una); recorrer todo con un hash anti-join una vez
por corrida (sigue creciendo con el bucket).

## 2026-10-17 — Cierre 1 (F, c): el avatar chico, con el relleno en una edge function

**Contexto:** la lista del equipo dibujaba a 32 px el avatar de 512.

**Decisión:** `perfiles.avatar_miniatura_ruta` (96 px, WebP) y `avatar_miniatura_fallo_en`. Al subir, el navegador saca los dos
tamaños de una sola decodificación (`comprimirEnTamanos`) y el perfil guarda las dos rutas; la lista dibuja la miniatura (o el
avatar mientras falte). **La miniatura es siempre del avatar vigente:** un trigger la deja nula si cambia el avatar sin una
nueva, y la que se reemplaza o se quita va a `cola_gc_storage` (la borra `storage-gc` recontando: `storage_refcount` la
cuenta); una que vuelve a usarse se rescata. **El relleno de lo que existía** es la edge function `avatares-miniaturas`, con el
mismo mecanismo que `storage-gc` (cron cada hora, pase de un uso): de a 20, decodifica con `@jsquash` (wasm; WebP, JPEG y PNG,
versiones verificadas hoy y fijadas en su `deno.json`), guarda sólo si el avatar sigue siendo el mismo y marca la imagen que no
puede leer para no reintentarla cada hora; también la de alguien dado de baja (la lista lo muestra). `<Avatar>` cae a las
iniciales si la imagen no carga.

**Alternativas:** las transformaciones de imágenes de Storage (dependen del plan y en local del servicio `imgproxy`, que está
apagado: el relleno quedaría probado sólo en la nube); `sharp` en un route handler de Next (otra URL que el cron tiene que
conocer, y el cliente admin fuera de su único lugar); hacerla en el navegador de cada persona al entrar (quien se dio de baja
nunca entra).

**Corrección (revisión del cierre 1):** el relleno no mueve la versión del perfil. Escribir la miniatura o su fallo pasaba por
el trigger genérico y sellaba `perfiles.actualizado_en`: quien tenía el perfil abierto recibía «Tu perfil cambió» sin que
nadie lo hubiera editado. `perfil_avatar_coherente()` restituye la versión cuando lo único que cambió es la miniatura o su
fallo (`…20261019002300`). Se eligió eso y no un `set_config` en las dos funciones del relleno porque la regla queda en un solo
lugar y vale también para cualquier escritura futura de esas columnas.

## 2026-10-17 — Cierre 2 (0a): quien está en una baja en curso no figura como dueño para los demás

**Contexto:** el cierre 1 dijo «los demás ven el estado final» de una baja a medias. Medido con una baja en curso sin lotes (P en
baja, Q asesora con el lead compartido), no era cierto en tres puntos: `leads_vista.dueno_id` (Q leía el id de P), la cabecera de
`lead_ficha()` («Lo tiene Pía Baja», mientras «Quién lo tiene» ya la había quitado) y `web.portal_snapshot()` (nombraba como
asesor a P, con su WhatsApp). El kanban y «Quién lo tiene» ya estaban bien.

**Decisión:** la migración `…002500` filtra con `la.usuario_id <> all ((select public._bajas_en_curso())::uuid[])` en las tres
(`_leads_vista_crear()`, `lead_ficha()`, `web.portal_snapshot()`) y reescribe la policy `"leads_asesores: leer"` sobre `leads_asesores`
(sólo por rendimiento: una subconsulta a `leads` en lugar de `puede_lead()` y `en_cartera()` por fila). **Corrección (cierre 3, 0a):**
esta entrada decía que esa policy hacía que la fila de quien está en baja no se leyera por otro camino. **No lo hacía**, ni la de
`…001300` ni la de `…002500`: ninguna miraba `_bajas_en_curso()`, y con una baja a medias una asesora que comparte el lead leía en
`leads_asesores` (que `authenticated` puede leer por PostgREST) la fila de dueño vigente de quien se iba. Lo cerró la migración
`…002700` (ver «Cierre 3 (0a)»). El filtro es un InitPlan sobre una tabla casi vacía: el plan del listado no cambió
(`docs/RENDIMIENTO.md`). `humo.sql` afirma que, como Q, `dueno_id` es nulo y la ficha dice «lo tienes tú»,
y que para todo lead que ve la dueña `dueno_id` es igual a `_lead_dueno(id)`; un **inventario** falla si aparece una función o vista
de `public` o `web` que lee `leads_asesores … revocado_en is null` sin `_bajas_en_curso()` y no está en la lista cerrada de sus
motivos («desde quien llama», «aplica la baja antes de decidir», «interna de la baja»).

**Alternativas:** dejarlo como un hecho documentado (la ficha de Q se contradiría a sí misma); filtrar sólo `dueno_id` (deja la
cabecera y el portal).

## 2026-10-17 — Cierre 2 (0a): `_bajas_en_curso()` no le dice nada a una cuenta que no está activa

**Contexto:** el cierre 1 dio por hecho que `_bajas_en_curso()` devolvía un subconjunto de lo que `perfiles` entrega a quien
llama. Para una cuenta activa es cierto (la policy de `perfiles` entrega todas las filas). Para una cuenta **apagada o bloqueada
con su JWT todavía vigente** no: la función devolvía los ids y `perfiles`, 0 filas.

**Decisión:** `…002600` agrega `and ((select auth.uid()) is null or exists (select 1 from public.perfiles p where p.id = (select
auth.uid()) and p.activo and not p.bloqueado))`: los jobs y `service_role` (sin `auth.uid()`) siguen viendo todo; una cuenta
que no está activa recibe `{}`. `humo.sql` afirma, como asesora activa, `_bajas_en_curso() <@ array(select id from perfiles)`, y
`{}` para la apagada y la bloqueada.

**Alternativas:** aceptar que una cuenta apagada pueda saber, mientras viva su JWT, quién más está en baja (es un oráculo
chico, pero la prueba de subconjunto quedaba falsa).

## 2026-10-17 — Cierre 2 (0b): la carrera real de `…002400` es de dos corridas de la misma baja, no la del commit

**Contexto:** el commit de `…002400` describía un camino (otra transacción con `_lead_aplicar_bajas` entre leer los ids y
bloquear) que, verificado, no cuenta dos veces: quien llama a esa función deja al lead fuera del limbo (adoptar suma a quien
adopta) o se revierte (salir y quitar acceso rechazan dejarlo vacío).

**Decisión:** el doble conteo real es el de **dos lotes de la misma baja a la vez** (una corrida manual de
`equipo_bajas_continuar()` mientras corre la de `pg_cron`). `scripts/carreras/cartera.mjs` lo provoca sin `sleep`: A toma
`lock table public.leads in exclusive mode`, B llama a `equipo_bajas_continuar()` y espera el candado (se ve en
`pg_stat_activity`), A corre la suya y confirma, B sigue; se espera `leads_al_limbo = 1`. Con la versión de `_baja_lote_desde` de
`…001700` la carrera falla con `leads_al_limbo = 2` (salida mostrada en el informe del cierre); con la vigente pasa.

## 2026-10-17 — Cierre 2 (1): todo `<Confirmar>` tiene su URL, y una guarda lo exige

**Contexto:** «Mover a…» con motivo y seis `<Confirmar>` (salir, desvincular, purgar en las dos papeleras, deshacer importación,
eliminar embudo, y los dos de eliminar origen) no sobrevivían a «atrás» ni a recargar, y no tenían la misma defensa contra el
doble envío ni contra la falta de red.

**Decisión:** `<Confirmar>` es un `Modal` que no se cierra mientras actúa, ignora el segundo clic (un solo vuelo), dice sin
conexión por sí solo («No hay conexión. No se hizo nada: vuelve a intentar cuando vuelva.») y devuelve el foco a quien lo abrió.
Cada uno vive en su URL con `usePanelPorUrl()` (`?panel=`; dentro de un panel que ya ocupa `?panel=`, otra clave: `?eliminar=`)
y lo que la URL nombra se revisa una vez al abrir (`useRevisionAlAbrir()`). «Mover a…» con motivo es un `ModalDeFormulario` en
`?panel=mover-oportunidad&oportunidad=<id>&destino=<id>`, el mismo en el kanban y en la ficha; la clave es `destino` y no `etapa`
porque `?etapa=` es la pestaña del kanban en el celular (el choque se encontró con un e2e). Se monta una vez por pantalla. La
guarda `scripts/guardas/confirmar-con-url.test.ts` tiene el registro de los once con su abridor y su señal, y falla si aparece
uno sin registrar. Los orígenes (de vehículo y de lead) y «Purgar» de vehículos entraron aunque no estaban en la lista: con la
guarda, la regla vale para todos y no nace con excepciones. «Salir» no cierra tras el éxito (la persona ya no ve el lead).
`useUltimo` necesita un valor estable: un valor que cambia en cada render lo vuelve un bucle (React #301); `useUltima` compara
por firma, con su test.

**Alternativas:** una URL por cada Confirmar sin guarda (el siguiente la olvida); `window.confirm` (prohibido).

## 2026-10-17 — Cierre 2 (2, 4): «Mover a…» no se parte, y la tabla del listado se desplaza dentro de su tarjeta

**Decisión:** el botón de «Mover a…» lleva `shrink-0 whitespace-nowrap` y la fecha de la tarjeta puede partirse: la columna del
kanban sigue en 288 px. La tabla del listado pasa a `w-max min-w-full`; la columna del nombre queda pegada a la izquierda
(`sticky`, con fondo propio en reposo, hover y foco, y un borde que se ve al desplazar) con 16 rem como mínimo (unos 32
caracteres), el resto cortado con «…» y el nombre entero en `title`. El desplazamiento horizontal ocurre dentro de la tarjeta; la
página no tiene scroll horizontal (`min-w-0` en el contenedor que es hijo de una grilla: sin él se ensanchaba la página). Con 100
filas queda dentro de los 3.500 nodos. **Corrección (el e2e completo):** con la tabla más ancha que su tarjeta, el «⋯» de cada fila quedaba
fuera de la vista y el recorrido de la asesora no podía pulsarlo (`recibeElClic`); la columna de las marcas también queda pegada, a la
derecha. El e2e de la tabla ancha lo exige sin desplazar y desplazada.

**Alternativas:** que el nombre nunca se corte (un nombre de 80 caracteres ensancharía toda la tabla).

## 2026-10-17 — Cierre 2 (3): un formulario que se reemplaza al llegar lo guardado apaga sus campos hasta entonces

**Contexto:** la ventana de pérdida de lo tecleado en el panel de tipos de cambio tenía dos tiempos: durante el envío (lo que se
teclea mientras guarda se borra cuando llega la versión nueva) y, sobre todo, entre el aviso de éxito (sale al resolverse la
promesa) y el remontaje por `key={id-actualizadoEn}`: unos 130 ms con «Guardar» ya activo.

**Decisión:** los campos de `panel-tipo-cambio.tsx` y `panel-moneda.tsx` se apagan mientras `enCurso` (que de `useAction` dura hasta
que se dibuja la respuesta) y el `<fieldset>` no basta porque los campos de Base UI no lo obedecen: se apagan uno a uno. La regla
es de `.claude/rules/ui.md`. Prueba con la action retenida (`page.route`): falló antes del arreglo y pasa después.

## 2026-10-17 — Cierre 2 (5): los avisos con un modal abierto sí se anuncian; lo que faltaba era preguntar al salir

**Contexto:** la bitácora de la 9d-3 decía que un aviso nuevo con un modal abierto «no se oye» porque Base UI deja todo bajo
`aria-hidden`. Con el árbol de accesibilidad real (CDP `Accessibility.getFullAXTree`) no se reproduce: Base UI 1.9 deja fuera del
`aria-hidden` lo que lleva `[aria-live]` y la región de sonner lo lleva siempre. Queda como guarda (`avisos-con-panel.spec.ts`,
`vehiculos-aviso-con-panel.spec.ts`).

**Decisión:** el clic en un aviso que sale de la pantalla («Abrir ficha», `sale: true`) con algo escrito en un panel **pregunta en
el pie del panel** (`useCierreConCambios()` y `salida` de `<PieDelPanel>`); «Deshacer» actúa en el lugar. Se extendió a los dos
`Drawer` donde un aviso así coexiste con un borrador (el alta de lead y el panel de vehículo). **Limitación (resuelta en el cierre 3, ver «Cierre 3 (2)» y «Cierre 3 (3)»):** los demás `Drawer`
con formulario no estaban registrados; en el alta de lead, el aviso con «Abrir ficha» se dibujaba encima del pie del panel (lo vimos en
las capturas).

## 2026-10-17 — Cierre 2 (6, 7, 8): la barra que se desplaza lo dice, la barra superior cabe al 200 %, y los avisos y la insignia heredan la app

**Decisión:** (6a) la barra de secciones de la ficha y las pestañas de etapas del celular muestran un degradado donde sigue la
barra (`useDesborde()` y `<PistaDeDesborde>`, que lleva `data-desborde` y `data-visible` para los tests) y dejan a la vista la
sección activa. (6b) La barra superior del celular usa 44 px en `px` para los blancos táctiles (con `size-11` en rem se duplicaban
al 200 %: la fila sumaba unos 456 px contra 412) y el tipo de cambio se dibuja en la barra sólo si ésta mide 24 rem o más
(`@container`); si no, está también en el menú. (7) El `<Toaster>` fija `fontFamily: 'var(--font-sans)'` en línea: sonner inyecta
`[data-sonner-toaster]{font-family: ui-sans-serif…}` sin capa y pisaba a Geist. (8) «Deshecha» tenía un solo lugar y un solo
estilo; lo que se veía era la transición de `transition-all` de `<Badge>` entre dos estados (el texto nuevo con el color del
viejo). Ahora sólo se anima el anillo de foco (`transition-shadow`); la prueba compara el estilo calculado recién deshecho con el
de después de recargar.

**Hallazgo fuera del alcance (en `docs/PLAN.md`):** con el texto al 200 % las tarjetas del listado en el celular se salen de la
página (los «⋯»).

## 2026-10-17 — Cierre 3 (0a): la policy de `leads_asesores` no entrega la fila de quien está en una baja en curso

**Contexto:** `DECISIONES` (cierre 2, 0a) afirmaba que la policy de `leads_asesores` evitaba leer la fila de quien está en baja por otro
camino. Se comprobó con una consulta real (`begin … rollback`, P en baja en curso y Q asesora con el lead compartido): como Q,
`select usuario_id, tipo_acceso from leads_asesores where lead_id = …` devolvía a **P como dueña vigente**, mientras `leads_vista.dueno_id`
era nulo. `authenticated` tiene `SELECT` sobre la tabla (PostgREST la expone) y ninguna versión de la policy miraba `_bajas_en_curso()`.

**Decisión:** la migración `…002700_cartera_sin_la_baja_en_curso.sql` suma a la policy
`leads_asesores.usuario_id <> all ((select public._bajas_en_curso())::uuid[])`: un InitPlan, se evalúa una vez por sentencia. Medido con
62.000 leads (`db:medir:volumen`): la página 1 de la dueña 14,8 ms (14,0–14,2 antes), con el máximo de la lista 24,6 ms (24,1); ningún
plan cambió. Las funciones `definer` que leen la tabla (`lead_cartera`, `_lead_dueno`) ya filtraban. Se prefirió filtrar a «declararlo con su
número»: es una comparación contra una tabla casi vacía y deja a `DECISIONES` diciendo lo que hace el código.

**Lo que lo vigila:** el humo afirma que, como la asesora, la tabla no devuelve la fila de quien se va; el inventario de `humo.sql` suma
las **policies** de `pg_policies` que leen `leads_asesores` (sólo miraba funciones y vistas: por eso no vio ésta); y
`supabase/tests/cartera-policy.sql` compara, para la dueña, dos asesoras y una con «todos», la huella md5 de lo que la policy entrega como
`authenticated` con la regla escrita aparte desde `leads_asesores` y `equipo_bajas`, en siete casos (solo, compartido, papelera, ajeno,
limbo, baja en curso y sólo de quien se va), con filas concretas para que una huella igual por error no pase. Falla sin la migración.

## 2026-10-17 — Cierre 3 (0b): el comentario de `…002400` dice la carrera que existe

**Decisión:** el encabezado de `…002400` y un comentario dentro del cuerpo de `_baja_lote_desde` (que Postgres guarda en `prosrc`)
describían un camino que no existe; ahora dicen la carrera real, de dos corridas de la misma baja. Sólo comentarios: el `pg_dump -s`
del esquema tras `db:reset` difiere únicamente en esas dos líneas. (Aún no hubo primer `db push`: la migración se puede corregir.)

## 2026-10-17 — Cierre 3 (1): las tarjetas del listado no ensanchan la página con el texto al 200 %

**Contexto:** el hallazgo decía que podía ser una regresión del defecto 4 del cierre 2 (`w-max min-w-full`). Se reprodujo el mismo spec en
un worktree del commit de docs del cierre 1: **falla igual, ya estaba** (también el inventario de vehículos). Las tarjetas no comparten
contenedor con la tabla.

**Decisión:** la causa: `<ul class="grid gap-2">` sin `grid-cols`, cuya columna `auto` tomaba el ancho mínimo de la tarjeta (nombre sin
partir, número, tipo y un «⋯» de `size-11`: 88 px al 200 %). Lista y tarjeta miden lo que la pantalla (`grid-cols-[minmax(0,1fr)]`,
`min-w-0`), el «⋯» mide 44 px y no se achica, `Anterior`/`Siguiente` se parten (`flex-wrap`: también se salían), y con una tarjeta de menos
de 16 rem (container query, que cambia sólo con el texto grande) el tipo pasa debajo del nombre y éste se parte en líneas (al verlo en
las capturas quedaba en «E2E…»). En vehículos la miniatura (`w-20`, rem), el título y «Editar» no cabían en una fila: el encabezado se
apila. Un título largo se parte; la casilla de selección mide 44 px. `sinScrollHorizontal()` nombra al elemento que se sale y a sus
ancestros e ignora lo que recorta una barra que se desplaza.

## 2026-10-17 — Cierre 3 (2): todo `<Drawer>` pregunta al salir desde un aviso; el `<Drawer>` lo hace, el formulario sólo dice que tiene algo escrito

**Contexto:** de los `Drawer` con formulario sólo el alta de lead y el panel de vehículo preguntaban cuando un aviso `sale: true`
(«Abrir ficha») se pulsaba con algo escrito. Eran **doce** los demás, no siete: además de editar el lead, teléfono, etapas, oportunidad,
tipos de cambio, moneda y cartera, también «Nuevo tipo de cambio», categoría, nuevo origen, vitrina y campo.

**Decisión:** el `<Drawer>` abre un contexto (`cambios-del-panel.ts`), anota la pregunta con `useCierreConCambios()` y la dibuja en su
ranura `pie`; un pie dentro del cuerpo la toma si es `<PieDelPanel>` o el nuevo `<PieConSalida>`. Cada formulario sólo llama
`useCambiosSinGuardar(hayCambios, alDescartar?)`, o `<CambiosSinGuardar>` si su estado vive en el mismo componente que el `<Drawer>` (el
contexto llega sólo a lo de adentro), y `useHayCambiosEnFormulario()` mide los de campos sin estado (`defaultValue` contra lo que mandó el
servidor, como el borrador). Por qué así y no un hook en cada panel con su pie: son doce pies distintos (ranura, dentro del cuerpo,
propios) y la pregunta tenía que verse igual. `useCierreConCambios()` deja de preguntar si lo escrito se guarda o se deshace mientras
pregunta. El alta de lead y el panel de vehículo conservan su mecanismo.

**La guarda:** `scripts/guardas/drawers-con-salida.ts` registra **todo** `<Drawer>` (no sólo los que tienen un `<form>`: «cartera» no lo
tiene) con su formulario o con el motivo de no tenerlo, y su test falla si aparece uno sin registrar, si un registrado deja de serlo o si un
formulario no dice que tiene cambios. Se comprobó que muerde (quitar el hook de un panel y quitar un registro la rompen).

**Pruebas:** e2e con el aviso del alta de lead (el único `sale: true` cotidiano) y cuatro paneles reales, con las dos formas de pie
(dentro del cuerpo: editar el lead y teléfono; en la ranura: oportunidad y etapas), en escritorio y celular; falla sin el hook. Los demás
(tipos de cambio, moneda, categoría, nuevo origen, vitrina, campo, cartera): pruebas de componente. **Límite declarado:** «Agregar
vehículo» (`panel-agregar-vehiculo`) queda sin formulario registrado: lo único tipeado es la nota de un interés (≤ 500) de una acción de un
clic por candidato; con varias notas escritas a la vez el contexto (un solo «hay cambios» por panel) no las distinguiría. Y tres modales con
formulario fuera de `ModalDeFormulario` (nuevo embudo, nuevo rol, invitar persona) no preguntan al descartar: en `docs/PLAN.md`.

## 2026-10-17 — Cierre 3 (3): el aviso sube sobre el pie de un panel, y crece con el texto

**Contexto:** en el alta de lead el aviso con «Abrir ficha» se dibujaba encima de «Cancelar» y «Guardar lead» (abajo a la derecha, donde un
panel tiene sus botones).

**Decisión:** `<Toaster>` pasa `offset`/`mobileOffset` `var(--avisos-abajo, 24px|16px)` y `useAvisosSobreElPie()` mide los pies abiertos
(`sheet-footer`, `dialog-footer` y `data-pie-de-panel`: `<PieDelPanel>` y `<PieConSalida>`) con un `MutationObserver` y un
`ResizeObserver` y pone la variable en `<html>`. Sólo cuenta un pie que cae en la columna de los avisos y en la franja de abajo: un modal
centrado en escritorio, o a media altura en el celular, no los mueve (`avisosAbajo()` es el cálculo puro, con su test). Con el panel
cerrado vuelven a su lugar. Alternativa descartada: mover los avisos a la izquierda con un drawer abierto en escritorio (dos reglas).
Al mirar las capturas del alta al 200 % apareció otro defecto del aviso: el icono (`size-4`, rem: 32 px) desbordaba la caja de 16 px
fija de sonner y se comía la primera letra, y el texto del aviso y del botón (13 y 12 px) no crecía. El texto y el botón siguen a la raíz
(`style`, `actionButtonStyle`, `cancelButtonStyle` en línea: le ganan al CSS de sonner, que va sin capa) y los iconos miden 16 px.
`avisoNoTapaElPie()` comprueba que las cajas no se solapan y que cada botón recibe el clic.

## 2026-10-17 — Cierre 3 (4): las etiquetas de los botones sí crecían; lo que las hacía parecer quietas era `transition-all`

**Contexto:** el hallazgo decía que las etiquetas de «Nuevo lead», «Filtros», «Vistas», «Importar», «Papelera» y «Etapas» no crecían con el
texto al 200 %. Todo `--text-*` es rem y la densidad sólo toca `--fila`; con el CSS compilado la etiqueta pasa de 13 a 26 px, igual que
los campos. Pero medido en la app enseguida de cambiar la raíz daba 13,4 px: el botón base llevaba `transition-all`, que anima también
`font-size` y el alto. Las capturas del cierre 1 y del cierre 2 miraron el mismo botón en dos instantes de esa animación (15 px y 13 px).

**Decisión:** el botón y las pestañas usan `transition` (colores, sombra, opacidad, transformaciones), como la insignia desde el cierre 2.
La guarda `scripts/guardas/sin-transition-all.test.ts` impide que vuelva (sólo el interruptor la conserva: no lleva texto). El e2e lee el
tamaño en el mismo instante del cambio y falla con el botón anterior («Filtros: 13 px → 13 px»). **«Nuevo lead» de la barra superior en el
celular es sólo un icono por diseño** (`hidden sm:inline`: un media query no sigue a la raíz); su etiqueta es la del lector. El texto del
botón (13 px) contra el del cuerpo (15 px) no es un defecto: es `--text-sm` contra `--text-base`.

## 2026-10-17 — Cierre 4 (1): todo modal con algo escrito pregunta al descartar; un hook compartido y una guarda

**Contexto:** tres modales con formulario fuera de `ModalDeFormulario` (nuevo embudo, nuevo rol, invitar persona) no preguntaban al
descartar, y se cerraban con Esc a mitad de un guardado. Al buscarlos apareció un cuarto, «Etiquetas» (el nombre de la etiqueta nueva), y
un defecto vecino: `?panel=nuevo-rol` abría el modal a quien sólo veía la matriz (`abierto` no miraba `puedeGestionar`).

**Decisión:** los tres pasan a `ModalDeFormulario` (ganan `bloqueado`, `<fieldset disabled>`, Ctrl/Cmd+S, el foco al primer error y el
guardado sin red que sale solo al volver). Lo que comparten —validar, un pedido a la vez, el rechazo junto al campo o arriba, el pedido
que no llegó— está una vez en `useEnvioDeModal()` (`shared/ui`); cada modal sólo pone su validación, su pedido y qué rechazos van junto a
qué campo (`useFormularioDeRol`, `useFormularioDeInvitacion`, `useNuevoEmbudo`). «Invitar» deja el formulario y, hecha la invitación,
abre otro modal («Invitación creada») en vez de cambiar el contenido del mismo: el pie del contrato no tiene otro estado. «Etiquetas» no es
un formulario sino una lista que se administra: pregunta por su cuenta (`useCierreConCambios` sobre el nombre sin crear). Un nombre repetido
o sin letras se dice ahora junto al campo (antes, un aviso arriba o un `alert` bajo el campo). El correo se recorta antes de validar (con un
espacio al final el esquema decía «correo inválido»).
**La guarda:** `scripts/guardas/modales-con-salida.ts` registra todo `<Modal>` que no es `ModalDeFormulario`: o `propio` (pregunta él:
`useCierreConCambios()`, `<ConfirmarDescarte>` y `bloqueado`) o `sinFormulario` con su motivo, y prohíbe un `<form>` en el archivo y en lo
local que dibuja. Se comprobó que muerde (sin registrar, sin `bloqueado`, un `<form>` en un registrado). **No registra nada de los
`ModalDeFormulario`:** cumplen por construcción.
**Alternativa descartada:** ponerles sólo el hook de cambios: no daba `bloqueado` ni el guardado sin red, que tampoco tenían.
**Límite declarado:** crear un rol o invitar no es idempotente (no llevan id de intento): si un pedido que «no llegó» sí llegó, el reintento
dice que ya existe. Lo que el servidor rechaza con «duplicado» se dice junto al campo, que es lo cierto.

## 2026-10-17 — Cierre 4 (2): la nota de un interés sin mandar cuenta como «hay cambios» y no se pierde al cambiar de vehículo

**Contexto:** «Agregar vehículo» no registraba nada: descartar el panel perdía la nota tipeada sin preguntar. La decisión del cierre 3
(«un solo "hay cambios" por panel») suponía varias notas a la vez; en realidad cada vehículo elegido monta la suya (`key`) y cambiar de
candidato o de búsqueda la tiraba.
**Decisión:** las notas viven en el panel (`{ id → nota }`): cambiar de vehículo o de búsqueda no tira ninguna, «hay cambios» es que alguna
tenga texto, y el panel lo dice con `useCambiosSinGuardar(hay, descartar, { preguntaAlCerrar: true })`. A diferencia del resto de los
paneles (cerrar no pregunta: lo escrito queda en su borrador), una nota sin borrador se pierde al cerrar, así que con esa opción el
`<Drawer>` pasa Esc, la ✕ y el clic afuera por `intentarCerrar` y, si el panel no tiene `pie`, la pregunta ocupa el pie. Marcar el interés
o vincular cierra sin preguntar. **Alternativa descartada:** un borrador en `sessionStorage` por lead y vehículo: más piezas para una nota
de 500 caracteres.

## 2026-10-17 — Cierre 4 (3): el aviso con descripción crece con el texto; la letra ya crecía, el ancho no

**Contexto:** el pendiente decía que los avisos con `description` «siguen con el tamaño de sonner». Medido, la descripción **sí** hereda el
`fontSize` en línea del aviso (sonner no le fija tamaño); lo que seguía siendo de sonner era el **ancho**: 356 px fijos, así que al 200 %
el aviso quedaba en una columna angosta (el título en tres líneas, la descripción en siete). Un e2e con el aviso de «sesión vencida» (el
único con descripción, provocado perdiendo la sesión con el panel de «Etapas» abierto) pasaba a 100 % y a 200 % en claro y en oscuro con
todo lo que se le preguntó (letra, que no corte su contenido, que no pase de la pantalla, contraste AA, que no tape el pie): salvo el
ancho.
**Decisión:** `--width` del `<Toaster>` es `min(22.25rem, 100vw − 2rem)` (356 px al 100 %, crece con la raíz y no pasa de la pantalla) y
`avisosAbajo()` toma el ancho de la columna con el `rem` de la raíz. Vale para todos los avisos, no sólo los de descripción. El color de
la descripción (`#3f3f3f`/`#e8e8e8` de sonner) pasa AA en los dos temas: no se cambió. El alto que sonner mide al montarse tampoco
quedó cortado (el e2e lo asserta con `scrollHeight`).

## 2026-10-17 — Cierre 4 (4): una captura se toma con la pantalla quieta

**Contexto:** las dos lecturas equivocadas de los botones (cierres 1 y 2) fueron capturas tomadas a media transición. Al abrir las 115 del
cierre 3 con las hojas, unas 15 de las que muestran un panel, un modal o un aviso estaban a medias (el panel entrando, un aviso
translúcido, un modal con su fondo a medio desenfocar).
**Decisión:** `capturar()` pasa por `capturarEn()` (`e2e/soporte/capturas.ts`): dos cuadros (lo que arranca en el cuadro siguiente a
montarse, como la entrada de un aviso, no existe aún en `document.getAnimations()`), todas las animaciones y transiciones **con fin**
terminadas (con tope de 2 s que dice cuáles seguían) y `animations: 'disabled'` + `caret: 'hide'` de respaldo. **Las dos cosas:** sólo
`disabled` no adelanta una transición que todavía no empezó; sólo esperar se cuelga con un spinner (infinito) o un esqueleto. Probado sin
la app (`e2e/capturas-quietas.spec.ts`): una captura cruda ve la transición a medias (rojo 40+) y la del ayudante el estado final; con un
spinner no se cuelga; si algo no termina dentro del tope lo dice.

## 2026-10-17 — Cierre 4 (5): hojas de contacto, y mirar es abrir todas

`scripts/hoja-de-contacto.mjs <carpeta>` monta las capturas de cada proyecto en hojas rotuladas (escritorio 2×2, celular 3×1, ≤ 2.000 px de
lado y a tamaño real o al 60–77 %, con Playwright, sin dependencias nuevas) más `hojas/indice.txt`. Se comprobó abriendo la primera de cada
proyecto: el texto de 12–13 px se lee. Con 115 capturas son 34 hojas. La regla (`.claude/rules/e2e.md`): «mirar las capturas» es abrir
**todas** las hojas y el informe las lista; una captura suelta sólo amplía un detalle. No se probó con otra disposición: por cuenta, 3×2 en el
celular da una escala de 0,43 y las letras de 12 px quedarían en ~5 px (no se leerían).

## 2026-10-17 — Cierre 4 (6): `importaciones-vinculos-purgar` no es lento; la importación recién creada sí, por falta de estadísticas

**Contexto:** `importaciones-vinculos-purgar` tardó 6.365 ms en una corrida y 199 ms en la siguiente; el cierre 1 lo atribuyó a una pestaña
del navegador sin medir, y el comentario de `medir-bajas.sql` documenta que las primeras escrituras tras una carga pagan su imagen
completa en el WAL. Se reprodujo con `db:medir:volumen` en nueve condiciones, con la carga de la máquina (`/proc/pressure`, loadavg) y los
contadores de WAL y checkpoints antes y después de cada corrida:
recién cargado 223 ms · `CHECKPOINT` antes 322 · segunda seguida 187 y 503 (con el IDE al 90 % de CPU) · 33 checkpoints forzados encima 191
· 7 checkpoints después de la carga 615 · un autovacuum de `seguimientos` activo 233. **No se reprodujo el 6,4 s.** La hipótesis de las
imágenes completas se refuta con números: 11 MB de imágenes completas cuestan 212 ms contra 241 con ninguna, y forzar 33 checkpoints
(24 MB de imágenes completas en la papelera contra 3,5) deja la papelera en 4.030 ms contra 4.044. El único caso lento (storage-gc 4.254 ms
contra 160, la papelera 6,6 s contra 4,0) tuvo +13,3 s de `sync` del checkpointer contra +0,3 s en las corridas rápidas: un `fsync`
lento del disco, una vez, sin poder repetirlo.
**Decisión:** (1) el estado estable **no** es «`CHECKPOINT` antes de cronometrar»: no mueve nada y `postgres` ni puede hacerlo; los
presupuestos de los jobs quedan como estaban (10 a 30 veces lo típico: atrapan una regresión de orden de magnitud, no una vuelta de disco).
(2) El runner (`scripts/medir-listado.mjs`) dice, al final de cada medición y en voz alta si falla, qué pasaba: carga, presión de disco y de
CPU, megabytes de WAL, imágenes completas, checkpoints (con el tiempo de escribir y de `sync`) y autovacuums activos: el próximo valor
fuera de lugar se explica con eso o no se explica. (3) El título de cada medición dice si es la mediana de 5 corridas o **una** (los jobs,
la baja y la importación gastan lo que miden: decía «mediana de 5» de todo).

## 2026-10-17 — Cierre 4 (7): una base recién creada tarda 20 s en su primera importación; la semilla analiza

**Contexto:** midiendo lo de arriba apareció lo que de verdad era «recién cargado»: tras un `db:reset` la primera importación de 500 filas
tardaba **20 s** (lotes de 3,8 s con 50 filas y de 7,3 s con 100, contra el corte de 8 s de `authenticated`) y la segunda ~1 s, todas las
veces (20,4 · 20,4 · 20,2 · 19,9 s). Con sólo un `CHECKPOINT` tras el reset, 19,9 s; con un `analyze` de todo, 1,2 s: **la causa son las
estadísticas que faltan**, no el WAL. Una empresa nueva (un despliegue por empresa) paga lo mismo en su primera importación, y el autovacuum
tarda minutos en analizar.
**Decisión:** `seed.sql` termina con un `analyze` de las tablas de `public` y `web` (aunque estén casi vacías ya basta: 1,25 s la primera
importación tras el reset). `medir-importacion.sql` tiene tres pasadas: «tal como queda tras el reset» con presupuesto (lote más lento ≤ 2 s,
500 filas ≤ 8 s; hoy ~0,15 y ~1,2 s; sin el `analyze` de la semilla falla con 3,7 s, comprobado), y las dos estables (sin y con los índices de
`actividad`) tras un `analyze`. Sobre una base que ya tiene estadísticas, la primera mide lo mismo que las otras y pasa. El e2e completo,
que parte de un `db:reset`, también deja de pagar los 20 s.

## 2026-10-17 — Cierre 4 (8): el lote de la importación se queda en 50, y tiene su guarda

**Contexto:** «100 también cabría» (DECISIONES, 8a). Se midió importar 500 filas con 50 y con 100 (la RPC con el tope cambiado dentro de un
`begin … rollback`, tres corridas alternadas), con la regla de pasar a 100 sólo si se cumplían las tres: el lote más lento ≤ 500 ms con
50.000 leads, 500 filas ≥ 20 % más rápido y la carrera de lotes cruzados sin cambios.
**Números:** base de la semilla, 500 filas: 50 → 1.116 · 1.377 · 981 · 1.209 ms (lote más lento 106–404); 100 → 974 · 1.024 · 1.042 · 1.009
(203–223): **13 % de mejora, no 20**. Con 62.000 leads: 50 → 2.990–3.151 (lote más lento ~310 ms); 100 → 2.903–3.026 (**~610 ms**, el doble:
el costo es por fila, no por lote). Recién creada sin estadísticas: el lote de 100 llegó a 7,3 s, a 0,7 s del corte (el de 50, 3,8 s).
**Decisión:** queda en 50 (falla el criterio de tiempo, y el margen contra el corte se come con una base fría). La carrera con 100 no se
midió: la regla pedía las tres y las dos primeras fallan. **La guarda:** el 50 estaba en cuatro lugares que no podían importarlo (el tope y
el mensaje de la última migración de `leads_importar_lote`, la prueba de la matriz que manda 51, el motivo de `escala.sql` y la medición);
`scripts/guardas/lote-de-importacion.test.ts` los compara con `FILAS_POR_LOTE` (cambiarlo a 100 rompe tres de las cinco pruebas, comprobado)
y la medición recibe el lote del código como variable de psql, sin ningún tamaño escrito.

## 2026-10-17 — Cierre 4 (9): los `beforeAll`/`afterAll` son 1,15 s por spec y proyecto; las cuentas se crean y se borran a la vez

**Contexto:** «los 105 s de `beforeAll`/`afterAll`» salió de un reporter descartable sobre 518 tests; en la corrida completa del cierre 3
(874 tests, 170 bloques spec × proyecto) son **197 s**: 126,6 de `beforeAll` y 70,6 de `afterAll`, ~1,15 s por bloque, ninguno de más de
3,5 s (los diez peores, de 1,4 a 3,5 s, están en `docs/RENDIMIENTO.md`). Con `fetch` envuelto: `createUser` ≈ 80 ms cada uno (bcrypt) y
`deleteUser` ≈ 55 ms, **todos en fila**: 65–73 % del `beforeAll` y 80 % del `afterAll`.
**Decisión (una mejora por commit, la regla era ahorrar ≥ 20 s):** `borrarPersonasDePrueba()` borra a todas a la vez salvo la más vieja (la
dueña: el guardián no deja al equipo sin quien lo administre mientras haya más gente) y a ella después (`afterAll` 430 → 220–240 ms);
`prepararAlta()` crea a la dueña primero y a las demás a la vez (`beforeAll` 710 → 400–460 ms). ~0,45 s por bloque; medido en la corrida completa: 197 → 119,6 s de hooks. Lo que
no se tocó: crear las cuentas por SQL con un hash precalculado (ahorraría más y cambia lo que prueba cada spec).

## 2026-10-17 — Cierre 4 (10): al 200 % los campos de un modal caben en él

Al mirar las capturas del cierre 4 en el celular al 200 %: el `<select>` del rol de «Invitar» (una opción larga) ensanchaba la columna del
formulario y el campo se salía del modal; el campo de «Nueva etiqueta» se achicaba hasta 112 px. `<fieldset>` de `ModalDeFormulario` es una
columna `minmax(0, 1fr)`, el select va `w-full min-w-0` y el campo de la etiqueta pasa a una fila que se parte (`flex-wrap`, mínimo 8 rem).
Lo asserta `e2e/modales-con-salida.spec.ts` (falla sin el arreglo: «el campo no se achica hasta no leerse», «no se sale del modal por la derecha»).
Se mide **sin desplazar** el cuerpo: desplazarlo de costado acomoda el campo a la vista y el desborde desaparece de la medida.

## 2026-10-18 — Parte 9i: un patrón de lista para toda tabla, el resumen de vehículos y el «⋯» del lead desde una sola lista

**Contexto:** el listado de leads y el inventario de vehículos resolvían lo mismo de dos maneras (leads abría un resumen y tenía el nombre y el
«⋯» pegados; vehículos sólo navegaba desde el título y tenía un lápiz), y el «⋯» del lead existía en dos superficies con ítems escritos por
separado (en el kanban y en el resumen no existía). El pedido traía diez cosas sin decidir; se tomaron las recomendaciones del plan.
**Decisión:**

1. **Teclado en la fila:** la parada de Tab es el botón del nombre («Abrir Ana Rojas», `<AbrirResumen>`, sin `onClick`: su clic sube a la fila);
   Enter o Espacio abren; la fila toma el color de abierta con `has-[:focus-visible]`. Un `<tr>` con `tabIndex` daría dos paradas por fila y
   los lectores lo leen mal.
2. **Ir y volver entre resumen y edición:** el panel de edición se dibuja **como hijo** del drawer del resumen (Base UI anida los diálogos por el
   árbol de React: Esc, «Cancelar» y Guardar cierran sólo el de arriba) y el foco vuelve a «Editar». Leads: `?lead=<id>&panel=editar-lead`
   (`EdicionDelResumen`, `diferido()`, lee `lead_ficha` **al pulsar**: el resumen no paga la ficha antes); vehículos: `?vehiculo=<id>&editar=<id>`
   (el `<PanelDeVehiculo>` de siempre). Con cambios sin guardar pregunta como todo panel (`useCambiosSinGuardar`).
3. **«Editar»** es un botón a la vista en las cabeceras (resumen y ficha) y el primer ítem del «⋯» sólo en la fila y la tarjeta de vehículos,
   donde no hay cabecera; el lápiz de la fila desaparece (queda una sola columna pegada a la derecha).
4. **«Principal» del layout:** el layout no tiene esa bandera (las banderas son `en_tarjeta`, `filtrable`, `publico_web`, `clave_apibara`,
   `activo`). La identidad de un vehículo en el resumen es título, «#número» y los campos `en_tarjeta`, los mismos de la lista. Una bandera
   `principal` pide migración, RPC y pantalla: otra parte (candidato en `docs/PLAN.md`).
5. **Marcas en la ficha del lead:** Favorito, Tachado y Etiquetas pasan al «⋯» de la cabecera; ésta conserva las insignias y «Editar».
   «Una sola lista» no sería cierta con otra fila de botones con lo mismo.
6. **«⋯» del kanban:** la tarjeta no trae marcas ni dueño; al **abrir el menú** se lee ese lead (un pedido a `leads_vista`), sin tocar la base
   (`_tarjeta_json` no cambió). Mientras llega, «Cargando…»; si no se pudo o ya no se ve, lo dice el menú.
7. **«⋯» del vehículo:** Editar (sólo fila, tarjeta y resumen) · Publicar en la web… · ─ · Enviar a la papelera, de `entities/acciones-de-vehiculo.ts`
   (`BLOQUES_DEL_MENU_DE_VEHICULO`, `accionesDeVehiculo(ofertas)` con `oculta | apagada | habilitada`). En la fila y el resumen «Publicar» lleva a
   `/vehiculos/<id>?panel=vitrina` (el panel y su vista previa viven en la ficha: montarlos en el inventario sumaría JS y una lectura) y **sin
   el permiso no aparece**; en la ficha abre el panel y sin el permiso se ve apagado con el motivo, como estaba el botón. La papelera se apaga con
   su motivo en las tres superficies. El nombre accesible es «Más acciones de …» en todas.
8. **«⋯» del lead:** Agendar recordatorio… · Anotar seguimiento… · ─ · Etiquetas… · Favorito · Tachado · ─ · Enviar a la papelera, de
   `entities/acciones-de-lead.ts` (`BLOQUES_DEL_MENU_DE_LEAD`, `accionesDeLead({ actuar, enviar })`); lo que no se puede no aparece y los permisos
   no cambiaron (`puedeEditarLead`, `puedeEnviarLead`; el kanban suma `puedeEnviarConAlcance`).
9. **La guarda** (`scripts/guardas/listas-con-patron.ts`) mira todo archivo de `src/modules` que dibuja `<Table>` o usa `CORTE_DE_LA_TABLA`: o
   importa `@/shared/ui/lista` o figura con su motivo (la tabla, la fila y la matriz del equipo). Las listas de `<li>` (seguimientos,
   papeleras) no entran: decenas de registros y poco valor. Su regex confundía `<TableroDeEmbudo` con `<Table` y se ajustó.
10. **Pestañas del resumen de vehículos:** «Resumen» (los datos de la ficha, sin pedir nada más), «Fotos» e «Interesados» (sólo con `leads.ver`),
    cada una con su `import()` y su lectura al elegirse; `?pestana=` sin sumar al historial.

**Desviaciones del plan, con su razón:**

- El nombre del vehículo **conserva `max-w-72 truncate`** (18 rem) como el del lead, con el nombre completo en `title` (`<AbrirResumen>`): el
  plan lo quitaba por ir contra `ui.md`, pero la columna pegada lleva además la casilla y la miniatura y, sin tope, un título largo la
  ensancharía hasta ocupar la pantalla y lo pegado dejaría de ser una ayuda.
- **El resumen no relee tras editar:** al guardar, la página revalida y trae la fila nueva; `vistaDelResumen()` elige la más nueva entre la
  lectura del navegador y la de la página por `actualizadoEn`. Es un pedido menos de lo planeado. «Editar» sólo se ofrece con el vehículo en
  la página (`editables`): uno que sólo llegó por la URL (de otra página) se abre sin él.
- Un vehículo de **otro origen** que llega por `?vehiculo=` dice «no disponible» (no se mezcla con la pestaña abierta).
- `useLecturaAlMontar`, `foco-de-quien-abre.ts` y `<Drawer focoAlCerrar>` nacieron en `shared` (leer al elegir una pestaña; devolver el
  foco al botón del nombre al cerrar un resumen).
- **El kanban pasa su presupuesto de nodos**: una columna de 500 tarjetas, de 8.212 a 11.212 nodos (el «⋯» suma 6 por tarjeta: envoltorio, botón,
  icono y tres círculos = 3.000). No se pudo evitar sin dejar el icono (con un solo glifo de texto y sin envoltorio quedaba en ~8.700, pero el
  «⋯» de las otras cuatro superficies es un icono y el glifo depende de la fuente). Se subió de 9.000 a 11.800 (lo medido más un 5 %) y el spec
  anota cuántos nodos son del menú. A 100 filas: leads 2.597 nodos y 39,5 KB comprimidos (presupuestos 3.500 y 48), inventario 5.020 y 49,6 (6.000 y 60).
- **JS en frío:** `/leads` 562,1 KB, `/perfil` 443,4, `/vehiculos` 519,2 (presupuestos 570, 460, 530). Medido en `master` antes de empezar: 560,6 y
  515,5 en `/leads` y `/vehiculos` (ya habían subido desde los 543,7 y 504,9 documentados); la 9i suma 1,5 y 3,7 KB. Ningún presupuesto cambió.

**Defecto que vieron las capturas y se arregló:** el resumen del vehículo al 200 % en el celular se cortaba (la cabecera con portada, datos y
tres botones; las pestañas fuera del panel). La cabecera se apila con un `@container`, las pestañas se desplazan con su pista, y el «⋯» de una
cabecera lleva borde (se confundía con texto). `nadaSeSaleDelPanel()` (`e2e/soporte/panel.ts`) mide que ningún elemento pase del borde del panel;
se verificó que muerde (con la cabecera vieja, falla) y hubo que reescribirla una vez porque la primera versión no mordía.

**Lo que se aprendió de las pruebas:** `supabase-js` en el navegador reintenta sin red ~7,4 s antes de fallar, así que un e2e de «sin red» espera
hasta 20 s; `listas-por-pagina` (página 3) falló una vez en una corrida larga y 0 de 35 aislada: sin explicar, se vigila en el Nivel 2.

**Niveles de verificación** (ahora en `.claude/rules/e2e.md` y `docs/ESTADO.md`): **Nivel 1** (toda tarea): lint, typecheck, `pnpm test` y los e2e
dirigidos en los dos proyectos; **Nivel 2** (si toca `shared`): `pnpm test:e2e:completo --project=escritorio` con `npx supabase functions serve`;
**Nivel 3** (un cierre): el completo con los dos proyectos.

**Alternativas:** el `<tr>` enfocable (dos paradas por fila); cambiar el contenido del mismo drawer en vez de apilar el panel (obligaba a
meter un panel que pregunta por su cuenta dentro de otro drawer); sumar las marcas al JSON de `embudo_tablero` (migración, medir 8.000 tarjetas,
y la lectura al abrir cuesta un pedido que casi nadie paga); una bandera `principal` (otra parte).
**Consecuencia:** una lista nueva sale con clic, teclado, nombre y «⋯» pegados sólo con importar el patrón, y la guarda lo exige; el «⋯» de un
módulo se cambia en un solo archivo. Cuesta: 3.000 nodos en una columna llena del kanban, ~6 por fila en las listas, y que un resumen sin su
fila en la página no ofrezca «Editar».

## 2026-10-18 — Parte 9j (0a): `listas-por-pagina` en la página 3 no se reprodujo; qué se probó y qué quedó instrumentado

**Contexto:** en la 9i falló una vez `listas-por-pagina` («la preferencia elegida vale en la página 3»): `toHaveCount(25)` recibió 10 durante 5 s, con el selector en
25 y la lista en 10. Fue la prueba n.º 2 de una corrida dirigida (`pnpm test:e2e`, 128 pruebas), con el servidor recién levantado, y no quedó ningún artefacto:
sólo `test:e2e:completo` copiaba a `e2e-fallos/`. Repetir hasta que pase no es un método.
**Qué se probó (con evidencia):**

- **E1, la condición real:** 20 invocaciones separadas de `playwright test e2e/listas-por-pagina.spec.ts --project=escritorio -g "sin haber elegido|página 3"`, cada
  una con su servidor frío y la prueba de la página 3 corriendo segunda: 20 de 20 en verde (~7 s cada una).
- **E1b, con la máquina cargada:** lo mismo con diez procesos ocupando los núcleos: 20 de 20 en verde (13 a 16 s cada una).
- **E2, el orden forzado con `page.route`** (dos pruebas nuevas, `e2e/listas-por-pagina.spec.ts`): el guardado de la preferencia demorado 1 s y 6 s, y la lectura de
  la página nueva (RSC de `?por=25`) demorada 5 s. En los tres casos la lista termina con 25 filas, la URL dice `por=25`, la cuenta guardó 25 y **el guardado va antes
  que la navegación** (la navegación sólo sale cuando la acción respondió). Con eso, las hipótesis de un cruce (H2: la respuesta de la acción, con el árbol viejo, pisa la
  navegación; H3: la navegación de nuqs se pierde) **no tienen dónde ocurrir con el orden actual**, y ninguna de las demoras las produjo.
  La de 6 s sí reproduce la firma del fallo con el `expect` de 5 s: **lo que pasó fue un guardado que tardó más de 5 s**, no un cruce.
- Estado compartido (H4) descartado por la evidencia: la prueba fija su preferencia, los contextos son nuevos y las cuentas llevan una marca por archivo.

**Decisión:** no hay un defecto de la app que reproducir (no hay prueba roja que volver verde) y no se alargó el `expect`: un guardado de más de 5 s es un hecho
que se quiere ver, no esconder. Quedó **instrumentado**: un reporter de Playwright (`e2e/soporte/reporter-de-fallos.ts`) copia `test-results/` y el reporte a
`e2e-fallos/<fecha>/` en **toda** corrida que falla (también la de un spec suelto; quedan los cinco últimos), y `listas-por-pagina` adjunta la línea de tiempo de red
(cada POST de la acción y cada pedido RSC con su URL, cuándo empezó y cuándo terminó) cuando falla. **No se explicó por qué ese guardado tardó más de 5 s**: la
próxima vez dejará la línea de tiempo y se mide con ella (`.claude/rules/e2e.md`).
**Consecuencia:** si vuelve a aparecer, hay traza, video, captura y la línea de tiempo del guardado; si el guardado resulta lento sin carga, el defecto es del guardado
(`listas.por_pagina` por RPC) y no de la navegación.

## 2026-10-18 — Parte 9j (0b): el «⋯» cuesta 3 nodos con un símbolo SVG compartido

**Contexto:** el «⋯» de la 9i costaba 6 nodos por fila o tarjeta (envoltorio, botón, `<svg>` y tres círculos) y subió el presupuesto del kanban de 9.000 a 11.800.
**Decisión:** un sprite en línea. `<SimbolosDeLista>` monta una vez en el layout `(app)` un `<svg>` oculto con `<defs><g id="…">` y el botón lleva
`<svg><use href="#…"/></svg>` sin envoltorio: el botón, el `<svg>` y el `<use>`, **3 nodos**. Con `currentColor` sigue al tema, a los colores forzados de Windows y al 200 %, y
el nombre accesible no cambia («Más acciones de …»). El presupuesto del kanban vuelve a lo medido más 5 %: 9.718 nodos → **10.250** (la prueba exige además 3 por tarjeta).
**Alternativas:** una máscara CSS (2 nodos): en colores forzados el fondo se reemplaza y el icono desaparece. `<symbol>` en vez de `<g>`: su viewport propio hizo que la
comparación de píxeles diera 117 de 255 en el celular (posiciones fraccionarias); con `<g>` dentro de `<defs>` y las copias de la prueba a múltiplos de 8 px sobre fondo plano
la diferencia es de 8 como mucho (`e2e/mas-acciones-icono.spec.ts`).
**Consecuencia:** el «⋯» no se dibuja si los símbolos no están montados (un test mira que el `use` apunte a un `id` que existe); un «⋯» fuera del layout `(app)` tendría que montarlos.

## 2026-10-18 — Parte 9j: los tipos de lead son una tabla con una clase fija, y el sistema razona por la clase

**Contexto:** el tipo de un lead era el enum `tipo_lead` ('prospecto' | 'cliente') y sus nombres estaban escritos en `entities/alta.ts` y `entities/listado.ts`. La empresa tiene que
poder configurarlos como los orígenes (crear, renombrar, ordenar, desactivar), sin que el sistema pierda lo que necesita saber de ellos: si un lead ya compró o no.
**Decisión:**

1. **`tipos_lead`** (id, clave inmutable, nombre único sin importar mayúsculas, **clase** `clase_tipo_lead` — «prospecto» o «cliente» —, activo, orden) y `leads.tipo_lead_id` con FK
   `on delete restrict`. La clase se elige al crear y no cambia. **El sistema razona por la clase, nunca por el nombre ni la clave** (la cotización final pasa al lead a la clase
   cliente; las métricas de conversión cuentan por clase: `docs/PLAN.md`, Fases 4 y 9). Los dos nombres de las clases son los únicos textos fijos.
2. **Siempre queda un tipo activo de cada clase, y lo impone la base** para quien sea que escriba: `tipo_lead_clase_vigente()` (before update or delete) toma un `pg_advisory_xact_lock` por clase
   antes de mirar si queda otro; las RPC toman además `lock table … in share row exclusive mode`. Dos personas que apagan a la vez los dos últimos terminan con un solo apagado y el mensaje
   «Es el único tipo activo de la clase …» (`scripts/carreras/tipos.mjs`, sin `sleep`). La pantalla lo dice antes: el interruptor y «Eliminar» del último de su clase salen apagados con el motivo.
3. **Un lead no guarda un tipo apagado, aunque la desactivación llegue a la vez que el alta:** `lead_tipo_vigente()` mira el tipo con `for share` (que choca con el `update` de desactivar). Un lead
   que llega sin tipo recibe `_tipo_lead_por_defecto()`: **el primer activo de la clase prospecto por orden** (lo propone también el alta); para cambiarlo basta ordenar la lista.
4. **Se escribe sólo por RPC** (`tipo_lead_crear|guardar|mover|eliminar`, con `leads.configurar`, versión y PT409); uno con leads (la papelera cuenta) no se elimina, se desactiva. El **tope de 100 vive en la base**
   (`_tipos_lead_tope()`), `tipos_lead_con_uso()` lo devuelve y el TypeScript no lo escribe.
5. **Una sola lectura para los nombres:** `leads_catalogos()` devuelve `{ origenes, tipos }` y reemplaza a la de orígenes en el listado, la ficha y la exportación; el alta y la importación los reciben en
   `lead_alta_contexto()`. Ni el listado ni el kanban suman pedidos por los nombres. El kanban no muestra el tipo.
6. **El filtro de la URL lleva la clave** (`?tipo=prospecto`): las URL, las vistas guardadas y los e2e anteriores siguen valiendo; la base filtra por `tipo_lead_id`. El CSV acepta el nombre o la clave de un tipo **activo**; uno que
   no existe o está apagado rechaza la fila y lista los activos (nunca crea uno).
7. **Cómo se fue el enum sin editar migraciones comprometidas** (aún no hubo `db push`): `schemas/` describe sólo el estado final; `20261011000050_tipo_lead_legado.sql` recrea el enum y la columna con una fecha anterior a
   todas las que los nombran, y `…20261019003000_tipo_lead_sin_enum.sql` los quita al final (junto con `leads_vista.tipo` y la versión del lead, que miraba las dos columnas).
8. **Los tipos de campo de un lead pasaron a `TipoDeCampoDeLead`/`TIPOS_DE_CAMPO_DE_LEAD`** (`refactor(shared)`) para que «tipo de lead» sea un solo concepto, como pide el glosario.

**Alternativas:** reusar la columna `tipo` como uuid y el enum como clase (sin deriva de nombres, pero los nombres mentirían y se rompería la convención `_id`); dos listas agrupadas por clase (se prefirió una sola, porque ese orden es el
del select del alta y el del filtro); el último tipo que usó la persona, o una marca «por defecto», para proponer en el alta (candidato en `docs/PLAN.md`); el tipo dentro de `mi_sesion()` (es de `equipo` y corre en cada pantalla:
un concepto de leads viviría en otro módulo); un índice compuesto `(tipo_lead_id, creado_en desc, id desc)` (ver abajo).
**Medido (`docs/RENDIMIENTO.md`):** filtrar por tipo cuesta 20 a 27 ms para la dueña, Ana y Berta, con 50.000 y con 212.000 leads; uno sin leads, 0,2 ms por `leads_tipo_lead_id_idx`; uno raro también la usa. Lo que se descarta
es la visibilidad (a Ana con el 14 %, ~19.100 filas, igual con 50.000 que con 212.000; con el raro, 7.551 con 212.000) y un índice por tipo no lo evita: no se agregó. `db:medir:volumen` con 212.000 leads **falla en dos presupuestos que no
son de tipos** y son de los 50.000: la búsqueda por nombre (234 ms contra 200) y la persona «chica» (descarta 200.040 contra 70.000); no se tocaron.
**Lo que el pedido suponía y el repo no tenía:** el kanban no lee ni muestra el tipo; el portal tampoco (el `cliente` de `web.portal_snapshot` es el nombre del lead); «200.000 leads» eran seguimientos (la siembra trae 50.000 leads: la medición con 212.000 se hizo una vez con
`-- --leads 200000`); `leads` no tenía índice sobre el tipo.
**Consecuencia:** agregar un tipo es un dato; el alta, la ficha, el filtro y el CSV no se tocan. Quien escriba una regla de negocio por tipo tiene que preguntar por `clase`. La migración legado se puede borrar el día que se haga el primer
`db push` y se aplane la historia.

## 2026-10-18 — Cierre 5a: medir antes de arreglar (la búsqueda, la persona con pocos leads, la importación y la suite)

**Contexto:** la 9j dejó `db:medir:volumen` con 212.000 leads fallando en dos presupuestos «que son de los 50.000» (búsqueda por nombre 234 ms contra 200; la persona «chica» descarta 200.040 contra 70.000), la importación de 500 filas en ~3 s con 62.000 leads contra ~1,1 s en la semilla, y un Nivel 3 de ~35 min. El pedido era medir cada uno con números y **no arreglar nada** (sin tocar `src/` ni migraciones). Números y planes en `docs/RENDIMIENTO.md` › «Cierre 5a»; pendientes con su assert en `docs/PLAN.md` (5a-1 a 5a-4).
**Lo que el pedido suponía y el repo no tenía:**

- «50.000» y «212.000» son el parámetro de la siembra: los totales son **62.000** y **212.000** leads.
- «Dos presupuestos» eran **diez aserciones de dos familias** (la búsqueda de la dueña, 2; la «chica», 8: descartes y tiempo): `escala()` cortaba en la primera. La guarda ahora las junta y las dice todas al final, con su N.
- El «~3 s con 62.000 leads» **no era de `leads` sino de `actividad`**: `medir-importacion.sql` inserta 22.000 filas de `actividad`; con `actividad` chica, 500 filas cuestan ~1,0–1,1 s con 0, 62.000 y 212.000 leads. Una consulta de `_lead_crear` cambia de plan cuando `leads` es grande y recorre `actividad` entera (3,4 ms por fila con 23.000 filas, 18,3 con 123.000; por PostgREST 500 filas: 1,2 s → 3,0 s → 10,5 s).
- **Una transacción para todo lo que escribe mide otra cosa:** la medición de la importación es de una transacción; la app corre una por lote (el diagnóstico nuevo lo hace así, y deja datos: después, `db:reset`).
- Los dos presupuestos **crecen con N** (el costo por lead es el mismo con 62.000 y 212.000 con la caché grande: búsqueda de la dueña 0,95 → 1,01 µs, la «chica» 0,30 → 0,30); con los 128 MB de `shared_buffers` locales la tabla de 207 MB deja de caber y se suma 9 a 40 %. No es calibración: es la forma de la consulta (`Seq Scan` con `ilike`; el índice del listado caminado entero para una persona con menos de una página).
  **Decisión:**

1. **Las guardas dejan de decir un número calibrado a un volumen y dicen la forma:** búsqueda `max(200, 3,2 µs × N)` ms; «chica» descartes ≤ 1,1 × N y página 1 ≤ `max(30, 0,48 µs × N)` ms. El 200 y el 30 siguen siendo los de 62.000; con 212.000 dan 683 y 102 ms contra 231 y 63 medidos (~3 veces, como el resto del archivo). Probado en las dos direcciones: verde con 62.000 y con 212.000, y con N falseado a 62.000 sobre la base de 212.000 la guarda dice las 12 aserciones. **Es el techo mientras el arreglo no llegue, no una aceptación:** el arreglo y su assert definitivo (flat en N) están en `PLAN` 5a-1 y 5a-2.
2. **No se tocó** ningún otro presupuesto, aunque cuatro están a ≥ 84 % con 212.000 (etiqueta de Ana 91/100 ms, atributo sin resultados de la dueña 90/100, campo privado de la dueña 5.363/6.000, kanban 69–104/100): pasan, crecen igual, y se arreglan con 5a-fix-1 con su fórmula por N.
3. **La importación y la suite quedan sin guarda nueva** (diagnóstico y números): `supabase/tests/medir-importacion-etapas.sql` no está en `MEDICIONES` ni asserta, para que quien arregle mida antes y después con el mismo método; la guarda va con el arreglo (`PLAN` 5a-3).
4. **La suite no se movió ni se recortó:** bajar pruebas a Vitest o `db:probar` libera ~5 %; la palanca es el celular de 65 specs (12,9 min de 19,3), una decisión de cobertura que es de la persona (`PLAN` 5a-4).
   **Alternativas:** subir el 200 y el 70.000 a lo que dan 212.000 (dejaría a los 300.000 como el siguiente fallo y diría «ok»); marcar las dos aserciones como «a vigilar» (lo que el pedido prohíbe); medir la importación con la semilla de siempre (no ve la causa: sin `leads` grande la consulta usa su índice).
   **Qué se midió y cómo:** `EXPLAIN (ANALYZE, BUFFERS)` de las consultas exactas de `medir-escala.sql` (un `escala()` desechable que no asserta) como dueña, Ana, Berta y «chica», con 62.000 y 212.000, y con `shared_buffers = 1GB` (cambio temporal con `supabase_admin`, revertido y comprobado); caminos candidatos probados en transacciones que se revierten (trigram 8,8 MB y 0,9 s, GIN de `cartera` 320 kB y 82 ms, `leads_asesores` sin índice nuevo); la importación por etapa (Node para el CSV y la validación, una transacción por lote para las funciones, `EXPLAIN ANALYZE` de 50 altas para los triggers, PostgREST con el ingreso de la dueña); la suite con una corrida de Playwright con JSON (`E2E_COMPLETO=1`, `db:reset` y `db:carreras` antes): 39,1 min, 1.009 pasan, 29 saltos, 0 fallos. No se capturó ninguna imagen.
   **Consecuencia:** la próxima tarea que toque el listado parte de 5a-fix-1; el Nivel 3 (5c) va **después** de 5a-fix-3, no antes. Quien agregue una consulta que recorre la cartera de quien mira (un filtro, una búsqueda) tiene que decir cómo crece con N y medir con 212.000, no con 62.000.

## 2026-10-18 — Cierre 5a-fix-2: importar en volumen no depende de `actividad` (la adopción del intento sólo se busca con `adoptar`)

**Contexto:** el cierre 5a midió (`docs/RENDIMIENTO.md` › «Cierre 5a», B) que importar 500 filas cuesta 1,0–1,1 s con `actividad` chica y 3,0 s con 25.000 filas y 10,5 s con 126.000: una consulta de `_lead_crear` («¿este intento ya entró por una adopción?», `actividad ⋈ leads`) se resolvía con `Index Scan Backward using actividad_pkey` y tres filtros en vez de `actividad_intento_adopcion_idx`. Objetivo: 500 filas ≤ 2 s con ~126.000 filas de `actividad` y 62.000 leads, y el tiempo por fila igual con 23.000 que con 123.000 (±20 %).
**Decisión:**

1. **A: la consulta sólo corre cuando el alta trae `adoptar`.** Migración `…20261019003100_alta_sin_adopcion_sin_buscar_intento.sql`: `create or replace` de `_lead_crear` (copia de la de `…002900`, grants intactos) con la primera consulta de adopción dentro de `if (p_lead ->> 'adoptar') = 'true'`. La de la rama del limbo (tras el candado, sólo alcanzable con `adoptar`) no se toca. Sin cambios en `schemas/`: `db:base` y `db:types` salen sin diff.
2. **Por qué se puede:** sólo la rama `v_estado = 'limbo'` de `_lead_crear` escribe `lead.adoptado_del_limbo` con un `intento`, y esa rama sólo se alcanza con `adoptar` (sin él, un teléfono en limbo devuelve `limbo` antes de escribir); las escrituras viejas de esa acción (`…000400`, `…000900`) no llevan `intento` y la consulta compara `detalle ->> 'intento' = p_id::text`; `leads_importar_lote` rechaza la clave `adoptar`. Sin `adoptar` la consulta no puede devolver filas.
3. **Por qué no B (`materialized`, `registro_id::uuid`):** se midió. El plan de la consulta depende de la estadística de `actividad`, no sólo del tamaño: con una sola persona de actor (la dueña) y adopciones presentes elige `actividad_pkey` (10 % de adopciones: 18,6 ms con 23.000 filas y 31,2 con 123.000; 25 %: 17,5 y 55,6); con 0 % de adopciones o con otros actores usa el índice parcial (0,03–0,06 ms). La forma B arregla casi todos esos casos (0,02–0,03 ms) **pero con 25 % de adopciones y 123.000 filas vuelve a `actividad_pkey` (316 ms con plan personalizado, 28,9 genérico)**: es la misma dependencia de la estimación que ya falló. A saca la consulta del 100 % de las altas normales y de la importación; no hay plan que vigilar.
4. **Lo único que cambia de conducta:** reintentar el mismo `p_id` tras una adopción **sin** `adoptar` pasaba de «adoptado, repetido» a la verificación normal del teléfono (`existe`, porque el lead ya es de quien lo pide). No es el doble envío (ese manda el mismo cuerpo con `adoptar: true` y sigue idempotente: `db:carreras` «Tomar lead dos veces a la vez»). No duplica nada; lo guarda un caso de `humo.sql`.
5. **La consulta que queda** (rama del limbo, una adopción por persona a ritmo humano; `actividad` se purga a los 14 días) conserva su costo, medido: 15–56 ms con 23.000–123.000 filas y adopciones presentes. No se reescribe: mezclaría dos arreglos y B no es estable.
6. **La medición vive en `db:medir:volumen`** (`supabase/tests/medir-importacion-volumen.sql`): una transacción por lote como la app, relleno de `actividad` con una de cada cuatro filas una adopción (si no las hay el plan es otro y la medición no ve nada: una primera versión con un relleno sin adopciones salió «verde» con el código viejo), 500 filas ≤ 2.000 ms con ≈ 124.000 filas y la **mediana de los lotes** de ≈ 124.000 entre 0,8 y 1,2 veces la de ≈ 23.000 (la suma de los lotes oscilaba 0,88–1,39 por un lote que cae en un checkpoint). Espera al autovacuum, y borra lo suyo aunque falle. `medir-importacion.sql` (la semilla, 8 s) y el diagnóstico por etapas no se tocan; el lote sigue en 50.
   **Alternativas:** B sola; B más A; un índice nuevo sobre `actividad (registro_id)` o un `COST`/`ANALYZE` por tabla (dejan el plan en manos de la estadística); quitar la consulta y confiar sólo en la clave única de `leads` (la adopción no crea fila: no hay a qué chocar).
   **Qué se midió y cómo:** `db:reset` y `db:sembrar-volumen` (62.000 leads); la medición nueva contra el código anterior (rojo) y contra el nuevo (verde), con 62.000 y con 212.000 leads (`-- --leads 200000`); `EXPLAIN (ANALYZE)` de la consulta aislada con relleno de 0, 10 y 25 % de adopciones, del actor de la dueña o de otros, 23.000 y 123.000 filas, en plan personalizado y genérico, en su forma actual y en B (números en `docs/RENDIMIENTO.md`).
   **Consecuencia:** quien agregue una consulta a `actividad` por algo que no sea su `actor_id`+`accion`+`creado_en` o su `id` tiene que decir cómo crece con las filas de `actividad` y medir con 124.000, no con la semilla.

## 2026-10-18 — Cierre 5a-fix-1a: «míos» de quien tiene «propios» se lee por su cartera (la persona con pocos leads no recorre el índice entero)

**Contexto:** el cierre 5a midió (`docs/RENDIMIENTO.md` › «Cierre 5a», A2) que una asesora con 3 leads descartaba 50.026 filas con 62.000 leads y 200.026 con 212.000 (18,5 → 62,8 ms): la policy de `leads` decide en ejecución si se ve «todos» o «propios» (`alcance_de()` y `auth.uid()` son InitPlans) y el plan genérico camina `leads_listado_idx` entero para devolver 3. Objetivo: que el costo de una lectura del listado dependa de cuántos leads ve quien mira y no de cuántos hay en la tabla, sin una segunda copia de la regla de visibilidad (`_lead_visible_para()`) y sin que nadie vea una fila de más ni de menos.

**Lo que el pedido suponía y el repo no tenía:**

- **La guarda medía consultas que la app no manda.** Para toda persona la app traduce «míos» en `en_cartera = true`, y quien tiene «propios» siempre está en «míos»; `medir-escala.sql` medía a la «chica», Ana y Berta sobre `leads_vista` **sin** esa condición, y le exigía a la «chica» `leads_listado_idx`. Se reescribió para medir lo que manda la app.
- **El cinturón de `db:probar` tiene seis clases** (1, 2, 3, L, M, X), no tres; no se agregó ninguna RPC, así que no hubo clase nueva: la vista nueva es `security_invoker` y la regla sigue en la policy de `leads`.
- **La revisión del diseño (un agente) afirmó que una vista anidada `security_invoker` dentro de una con derechos del dueño evalúa la RLS como el dueño.** No se cumple en PG 17: una versión con derechos del dueño devolvió 3 filas (las vivas) a la asesora con 500 en la papelera, igual que la `security_invoker`. Se dejó `security_invoker` igual (la policy de `leads_asesores` también aplica) y la mutación de la prueba se hizo sobre algo que sí viola la visibilidad.
- El «0,03 ms sin leads» de `RENDIMIENTO` pasa por `leads_asesores_usuario_id_idx`, no por el parcial `…usuario_vigente_idx` que nombraba el pedido; existen los dos.

**Decisión:**

1. **Una copia de la fecha en la fila de la cartera.** `leads_asesores.lead_creado_en` (de `leads.creado_en`): la llena `trg_leads_asesores_creado_en` al insertar, **siempre desde el lead** (aunque quien inserta mande otra) y con el lead `for no key update`; la sigue `trg_leads_creado_en_seguir` si el lead cambia de fecha; `trg_leads_asesores_creado_en_guarda` impide cambiarla (o el `lead_id`) a mano salvo desde otro trigger (`pg_trigger_depth() > 1`). Existen aunque nada cambie `creado_en` hoy (sólo un ayudante de e2e): la copia es correcta por construcción.
2. **Un índice por persona en el orden del listado.** `leads_asesores_listado_idx (usuario_id, lead_creado_en desc, lead_id desc) include (tipo_acceso, revocado_en) where revocado_en is null`. El `include` no es un adorno: la policy de `leads_asesores` lee esas dos columnas, y sin ellas el recorrido ordenado iba a la tabla por cada fila y el planificador, con una cartera grande, prefería `Bitmap Heap Scan` y ordenar todo el rango (Berta 20,6 → 40,3 ms; la dueña en cursor ascendente 20,7 → 79,9).
3. **`leads_cartera_vista`** (`security_invoker`): las mismas columnas y el mismo orden que `leads_vista`, unidas **por `id`** a las filas vigentes de quien mira; `id` y `creado_en` salen de la fila de la cartera y `en_cartera` y `telefono_visible` son `true` (lo son por construcción; con la expresión original el planificador estimaba que el filtro `en_cartera = true` descartaba filas y elegía ordenar). Unir por `creado_en` se descartó: la estimación de la unión colapsa a ~1 fila y el cursor no cruza de una columna a la otra. La lista de columnas sale del catálogo, de `leads_vista`: se escribe una vez, en `_leads_vista_crear()`, que ahora borra y recrea las dos.
4. **La ruta la decide el alcance.** `fuenteDelListado(condiciones)`: `leads_cartera_vista` sólo si la condición `en_cartera` trae `desdeLaCartera`, que `condicionesDeLeads` pone cuando quien mira tiene `leads.ver` «propios» (listado y exportación); quien ve «todos» sigue en `leads_vista`. **No se enruta a la dueña** porque su cartera es el 40 % de los leads y el plan por la cartera cuesta ahí: con 212.000, su campo privado sin resultados 5.318 → 5.871 ms (98 % de un techo de 6.000), su etiqueta sin resultados 370 → 611 y su búsqueda por nombre 125 → 207; la persona de «todos» con pocos leads propios (una supervisora, 78,9 ms) queda como estaba. El criterio es el alcance y no el tamaño porque el plan genérico no sabe de cuántos leads es la cartera.
5. **La guarda** (`medir-escala.sql`) mide «míos» de las personas con «propios» (Ana, Berta, la «chica», una asesora con 3 vivos y 500 en la papelera) por la vista nueva con los **mismos presupuestos que la dueña** (página 1 a 30 ms, una profunda a 150, ≤ 3.000 descartes) y sin fórmula por N; la dueña en «míos» conserva exactamente las tres filas que ya tenía. Se borran las dos fórmulas de la «chica» (`1,1 × N` descartes y `max(30, 0,48 µs × N)` ms). La búsqueda por nombre no se tocó (es de 5a-1).

**Alternativas descartadas, con su número (62.000 / 212.000; `docs/RENDIMIENTO.md`):** (B1, B2) reescribir la policy con un `OR` por alcance o con `cartera @>` y `gin`: peores para todos (la dueña, página 1: 20,9 → 133 y 142 ms con 212.000; la «chica» sin mejora, 219.093 descartes), porque un plan genérico no cambia de camino al ejecutarse; (C2) `leads_vista` como `UNION ALL` con compuertas: `Sort` sobre todo el `Append` con las columnas caras calculadas en todo (la dueña 34,8 s, Ana 1,46 s con 212.000); (C3) una relación angosta con derechos del dueño y `security_barrier`: el planificador no la aplana y la «chica» vuelve a recorrer `leads` (63.796 descartes); (C1') la misma vista sin el `include`: regresa a Ana, Berta y la dueña en las páginas por cursor; (C6) esconder `atributos_publicos` tras una función de `COST` alto para que un filtro sin resultados vaya por la cartera: la «chica» baja de 10,7 a 1,1 ms y Berta y la dueña suben 2,4 y 4,8 veces; (A) una RPC `security definer` que ramifica con el uid literal y `gin (cartera)`: el mejor plan (la «chica» 0,0 ms; un filtro sin resultados de Ana 27,6 → 3,3 ms con 212.000) pero obliga a reescribir en SQL todo el DSL de filtros y abre una clase nueva en el cinturón; queda para 5a-1, que necesita la misma función (la búsqueda por nombre).

**Límites aceptados, con su número:** la supervisora («todos», 3 propios) y un filtro sin resultados sobre una columna común (`atributos_publicos @>`, 56,2 ms para la «chica» con 212.000, presupuesto 100) siguen creciendo con N; los leads de la papelera de una persona siguen en su cartera (su fila vigente) y el índice nuevo no puede ser parcial por `eliminado_en`: una persona con 500 en la papelera descarta 530 filas en su página 1 (4,9 ms); Ana y Berta pagan ~1 ms más en la página 1 (12 → 13 ms; la causa probable es la lectura extra de `leads` que hace la policy de `leads_asesores`, no se aisló); una etiqueta o un campo privado sin resultados cuesta ~6 µs por lead de la cartera por la vista nueva (Berta, etiqueta de otra persona: 138 → 173 ms con 212.000).

**La carrera:** si la fecha de un lead cambia a la vez que otra transacción inserta una fila de su cartera, la copia quedaba con la vieja (`for share` se descartó: dos inserciones del mismo lead que suben después a `for update` se interbloquean; `for no key update` conflicta con el `update` y no se interbloquea). Dos escenarios nuevos en `db:carreras` (la fecha primero y la fila primero); con el trigger sin candado el primero falla (`iguales: false`).

**Qué se midió y cómo:** un arnés en transacciones que se revierten, como `authenticated`, con `plan_cache_mode = force_generic_plan` y `EXPLAIN (ANALYZE, BUFFERS)`, mediana de 5 corridas, siete personas (más una variante con 34), con 62.000 y 212.000 leads y `shared_buffers` 128 MB; después `db:medir:volumen` con la guarda nueva con los dos volúmenes. Las pruebas de visibilidad (`listado-cartera.sql`, la huella md5 de las filas enteras contra `leads_vista` donde `en_cartera`, por persona, dentro de los 300 cambios al azar de `derivados-leads.sql`) fallan nombrando la causa si se quita el filtro por quien mira (al menos seis bloques); quitar `revocado_en is null` o la `security_invoker` no viola la visibilidad (la policy de `leads` ya esconde esas filas) y lo vigila la guarda de rendimiento, no estas.

**Consecuencia:** migración `…20261019003200_listado_por_cartera.sql` (y `schemas/05_leads`); `fuente-del-listado.ts`; `listado-cartera.sql`, el inventario de `humo.sql` (la vista figura con su motivo) y la sonda de `numero-global.sql`; la guarda de `medir-escala.sql`; la siembra y `medir-bajas.sql` copian `lead_creado_en` a mano (con los triggers apagados). Quien agregue una lectura de leads para una persona con «propios» la apoya en `leads_cartera_vista` y dice cómo crece (con la cartera o con N); quien una `leads_vista` a la cartera lo hace por `id`, nunca por `creado_en`.
