# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-12
**Fase actual:** 1 — Equipo, empresa y shell, **cerrada**. Sigue la fase 2 en sesión nueva.

## Funcionando

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (373), `pnpm db:probar` (20 pruebas de humo),
  `bash scripts/mapa.sh --check`, `pnpm build` y `pnpm test:e2e` (30: 15 casos × escritorio y móvil).
- **Acceso y shell:** registro, ingreso (contraseña y Google), recuperación, proxy con `returnTo`,
  marco por permisos, bandeja, perfil, densidad, tema, Modo Live.
- **Equipo y roles:** invitar con un rol, lista con estado, bloquear y dar de baja, matriz de
  roles × permisos por origen y alcance con dominancia, «ver como».
- **Empresa** (`/configuracion/empresa`, pestañas en `?seccion=`):
  - _Empresa:_ marca (nombre, color, logo), datos legales, región (país, formato regional, zona
    horaria, moneda base) y políticas (registro abierto, retención de papelera y de actividad) en
    un formulario con un «Guardar». «Regenerar íconos» desde el logo guardado.
  - _Monedas:_ tipos de cambio con un valor vigente por clave, uno por defecto entre dos monedas
    e historial; monedas. La barra superior muestra los vigentes.
  - _Integraciones:_ apibara con su interruptor, su configuración y su clave en Vault.
- El shell y el manifest usan lo guardado: nombre, logo, color (tokens en runtime), íconos y zona.
- Toda escritura de empresa va por RPC con versión (`PT409`); sus tablas son de sólo lectura.

## Siguiente: Fase 2 — Orígenes y vehículos

- CRUD de orígenes (subasta o manual), layout de campos, categorías; listado y ficha de vehículos,
  fotos, vitrina, papelera, y el alta por enlace con apibara (`docs/PLAN.md`).
- Lo que la fase 1 le deja listo: `integracionActiva('apibara')` y `integracion_secreto('apibara')`
  (sólo `service_role`, para la edge function); `comprimirImagen()` y `subirPorHash()`;
  `getTiposCambio()`; el patrón de pestañas, paneles con URL y `key` en lo que cada formulario edita.
- Al crear una pantalla: sumarla a `configuracion/secciones.ts` (el test exige que exista) y, si
  es de primer nivel, prender su `disponible` en `_shell/navegacion.ts`.
- Los e2e usan el origen `oficina` de `seed.sql`: con el CRUD de orígenes dejan de necesitarlo.

## Lo que el plan no había previsto (parte 3)

- **Secretos:** la decisión anterior decía variables de entorno; quedó Vault por RPC para lo que
  se edita en la interfaz. PGlite no trae Vault: `probar-schema.mjs` lo imita y los privilegios
  reales los prueba el e2e contra el Supabase local. La dirección de apibara: sólo `apibara.tech`.
- **«Retenciones»** no existía con ese nombre: son `papelera_dias` y `actividad_dias`.
- **Contraste «en claro y oscuro»:** el relleno es el mismo en los dos temas. Se rechaza el color
  sobre el que el texto de un botón no se lee ni en blanco ni en oscuro; el resto se deriva.
- **Íconos:** el fondo se elige; los `<link>` pasan por `/iconos/vigente/<tamaño>` (layout estático).
- **Registro abierto** no tenía interruptor: se sumó al bloque «Políticas».
- La base no impedía dos tipos de cambio por defecto ni cambiar la moneda base con datos: ahora sí.
- `executeAsync` de next-safe-action rechaza si la action no llega al servidor: lo cubre `conRed()`.
- De las partes 1 y 2, todavía vale: cambiar `supabase/config.toml` pide `supabase stop` y
  `start`; un commit que falla en el pre-commit no avisa si se filtra su salida (mirar `git log`).

## Pendiente de decidir

- **Dominancia sobre la persona:** quien tiene `equipo.usuarios.gestionar` puede bloquear o dar
  de baja a alguien con más permisos que él (el guardián sólo salva al último).
- **Vencimiento de la invitación:** es el `otp_expiry` de Auth (1 h en local; hasta 24 h en la nube).
- **En la nube (una persona):** proyecto y `supabase link`; el primer `db push` con
  `--include-seed`; las tres plantillas de `supabase/templates/` en Auth › Emails; `Site URL` y
  `…/auth/callback`; SMTP; credenciales de Google; y revisar que el log de sentencias no registre
  los parámetros de `integracion_guardar_secreto`. Rama: sigue `master`.

## Deuda aceptada

- Sin interfaz todavía: `demora_dias_default`, `lead_dormido_meses`, el logo para fondo oscuro,
  y las integraciones `push_web` y `web_publica` (fases 7 y 8).
- El título de la pestaña y `favicon.ico` siguen neutros. En iOS una PWA ya instalada no cambia
  de ícono hasta reinstalarla. El esqueleto del marco sale un instante con el color neutro.
- Sin e2e de Google, recuperación, perfil, conflicto en la matriz ni «ver como» (el conflicto y
  la perspectiva tienen prueba de humo). Los e2e exigen la base local sin personas ajenas.
- Las RPC de leads, flujos y cotizaciones siguen hablando de vos: se reescriben con su fase.
- `equipo.usuarios.ver` y `equipo.roles.ver` no tienen enforcement en la base (los comprueba la
  página); tampoco `tablero.metricas.ver`, `datos.exportar.todo`, `notificaciones.push` ni
  `logistica.pagos.confirmar`.
- No se puede renombrar un rol ni reactivar a alguien dado de baja; monedas y tipos de cambio no
  se borran, se desactivan.
- Un objeto de Storage puede quedar huérfano si se cierra la pestaña entre subir y guardar: lo
  juntará `storage-gc` (fase 2). Edge functions: sólo declaradas en `supabase/functions/README.md`.
