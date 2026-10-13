# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-12
**Fase actual:** 2 — Orígenes y vehículos, **abierta**. Parte 1 de 5 (orígenes) hecha; sigue la
parte 2 (vehículos: listado, ficha y alta manual) en sesión nueva.

## Funcionando

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (504), `pnpm db:probar` (26 pruebas de humo),
  `bash scripts/mapa.sh --check`, `pnpm build` y `pnpm test:e2e` (46: 23 casos × escritorio y móvil).
- **Fase 1:** acceso y shell, equipo y roles (matriz con dominancia, «ver como»), empresa (marca,
  región, monedas y tipos de cambio, integraciones, íconos). Toda escritura de empresa y de roles va
  por RPC con versión **obligatoria**: un nulo se rechaza (regla en `.claude/rules/migraciones.md`).
- **Orígenes** (`/configuracion/origenes`, `/[id]?seccion=datos|campos|categorias`):
  - Lista con lo que ata a cada origen; alta (tipo, nombre, sustantivo, género, color,
    plataformas) con la vista previa de lo que nace. Nace en un INSERT: flujo, reglas y campos del
    tipo por trigger, o no nace nada. No nace una fórmula.
  - Datos: editar, activar y desactivar (reversible), eliminar sólo sin uso (tipeando el nombre).
  - Layout de campos: banderas que guardan solas, subir y bajar con botones, campo propio con
    opciones, grupo, `clave_apibara` (sólo subasta), desactivar y reactivar. El aviso de impacto
    cuenta vehículos antes de cambiar tipo, volver requerido o sacar una opción.
  - Categorías de un nivel con orden, activa y eliminar sin uso.
  - Siguientes pasos derivados de lo que hay; sin enlace a flujo ni fórmula (no tienen pantalla).
- Cada sección se ve por su permiso: `origenes.gestionar` edita; `flujos.configurar` o
  `cotizaciones.configurar` lo ven todo deshabilitado con el motivo.
- La matriz de roles lista los orígenes reales, también los inactivos (marcados).

## Siguiente: Fase 2, partes 2 a 5

- 2: listado de vehículos por origen con `FilterShell` (filtros desde `origenes_campos.filtrable`,
  estado en URL), ficha por layout, alta y edición en drawer. Lee `getLayout()`/`leerLayout()`.
- 3: fotos (≤ 24, WebP, portada, hash + refcount; `comprimirImagen()` y `subirPorHash()` ya
  existen). 4: vitrina por RPC y papelera. 5: apibara (`supabase/functions/apibara`, alta por enlace).
- `integracionActiva('apibara')` y `integracion_secreto('apibara')` (sólo `service_role`) ya están.
- Una pantalla nueva se suma a `configuracion/secciones.ts` y, si es de primer nivel, prende su
  `disponible` en `_shell/navegacion.ts`. Las del flujo (fase 5) y la fórmula (fase 4) ponen su
  ruta en `configuracion/origenes/pasos.ts`; su test la comprueba contra el disco.

## Lo que el plan no había previsto (parte 1)

- **La ficha decía que nacía una fórmula vacía y que un trigger rechazaba `clave_apibara` en
  manual: ninguna de las dos cosas existía.** La segunda existe ahora; «fórmula pendiente» es no
  tener fila `publicada`.
- `origenes.nombre` no era único y `categorias` no deduplicaba raíces (un nulo no choca): ahora sí.
  Campos y categorías ganaron su `actualizado_en`; un origen inactivo ya no recibe vehículos.
- `create or replace` no quita defaults y un parámetro sin default no puede ir tras uno con default:
  la versión y «después de X» se reordenaron en las RPC de roles y de mover.
- `PLATAFORMAS_APIBARA` pasó a `shared/lib/apibara.ts` (`origenes` no importa `empresa`).
- Next conserva la pestaña anterior oculta (un e2e cuenta sólo lo visible), y un `router.push`
  justo después de cerrar un panel con nuqs lo pisa la URL: sólo se navega.

## Pendiente de decidir

- **Dominancia sobre la persona:** quien tiene `equipo.usuarios.gestionar` puede bloquear o dar de
  baja a alguien con más permisos que él (el guardián sólo salva al último).
- **Vencimiento de la invitación:** es el `otp_expiry` de Auth (1 h en local; hasta 24 h en la nube).
- **En la nube (una persona):** proyecto y `supabase link`; el primer `db push` con
  `--include-seed`; plantillas de `supabase/templates/` en Auth › Emails; `Site URL` y
  `…/auth/callback`; SMTP; credenciales de Google; revisar que el log no registre los parámetros de
  `integracion_guardar_secreto`. Rama: sigue `master`.

## Deuda aceptada

- Sin interfaz todavía: `demora_dias_default`, `lead_dormido_meses`, el logo oscuro, `push_web` y
  `web_publica` (fases 7 y 8); el `icono` del origen y el orden de los orígenes entre sí.
- Reordenar con arrastre: sólo botones; sumarlo es una dependencia a verificar (la RPC ya lo admite).
  El esquema no tiene plural del sustantivo: `pluralDe()` es una regla.
- Título de la pestaña y `favicon.ico` neutros; iOS no cambia el ícono de una PWA instalada. Sin
  e2e de Google, recuperación, perfil ni «ver como».
- Los e2e exigen la base local sin personas ajenas (`pnpm db:reset`) y no corren en paralelo.
- Las RPC de leads, flujos y cotizaciones siguen hablando de vos: se reescriben con su fase.
- Sin enforcement en la base: `equipo.usuarios.ver`, `equipo.roles.ver`, `tablero.metricas.ver`,
  `datos.exportar.todo`, `notificaciones.push`, `logistica.pagos.confirmar`.
- No se renombra un rol ni se reactiva a quien se dio de baja. Un objeto de Storage puede quedar
  huérfano si se cierra la pestaña entre subir y guardar: lo juntará `storage-gc` (parte 3).
