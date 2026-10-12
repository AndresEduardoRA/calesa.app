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
