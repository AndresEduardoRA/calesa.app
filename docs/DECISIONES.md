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
