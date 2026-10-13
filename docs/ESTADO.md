# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-13
**Fase actual:** 2 — Orígenes y vehículos, **abierta**. Partes 1 (orígenes) y 2 (vehículos:
listado, ficha, alta y edición) hechas; sigue la parte 3 (fotos) en sesión nueva.

## Funcionando

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm db:probar`, `bash scripts/mapa.sh --check`,
  `pnpm build` y `pnpm test:e2e` (los números de la última corrida están en `docs/BITACORA.md`).
- **Fase 1** completa. **Orígenes** (`/configuracion/origenes`): alta, datos, activar y
  desactivar, layout de campos (ahora con **valor por defecto**) y categorías, por RPC con versión.
- **Vehículos** (`/vehiculos`, `/vehiculos/[id]`):
  - Una pestaña por origen donde la persona tiene `vehiculos.ver` (también los inactivos);
    `?origen=`. Tabla en escritorio y tarjetas en el celular, con el lugar de la foto reservado.
  - `FilterShell`: búsqueda, panel de filtros (al costado; hoja inferior en el celular), chips y
    «Limpiar». Los filtros salen de los campos `filtrable` del origen, más fase, categoría y año.
    Todo en la URL; lo que no corresponde se ignora. Vistas guardadas por persona. Keyset.
  - Ficha por el layout del origen, con la fase de sólo lectura. Sólo la pestaña «Ficha».
  - Alta y edición en un panel (`?panel=nuevo`, `?editar=`): bloques por grupo del layout, valores
    por defecto, `N`, `Ctrl/Cmd+S`, `Ctrl/Cmd+Enter`. Conflicto con quién y cuándo («Ver cómo
    quedó» / «Recargar»). Con la conexión caída conserva lo escrito y reintenta sin duplicar.
- `vehiculos` es de **sólo lectura** para la app: se escribe por `vehiculo_crear` y
  `vehiculo_guardar` (versión obligatoria). El vehículo nace en la fase inicial si hay una sola.

## Siguiente: Fase 2, partes 3 a 5

- 3: fotos (≤ 24, WebP, portada, hash + refcount; `comprimirImagen()` y `subirPorHash()` ya
  existen). El hueco está en `<Miniatura url>`; la pestaña se suma creando
  `vehiculos/[id]/seccion-fotos.tsx` y prendiendo `disponible` en `pestanas.ts`.
- 4: vitrina por RPC, papelera, interesados y vínculo. 5: apibara (alta por enlace).
- **Cada una trae su RPC de escritura:** al cerrar `vehiculos` quedaron sin escritor `lead_id`
  (parte 4) y `subasta_*`, `estado_subasta`, `apibara_*` (parte 5).
- Leads y cotizaciones reutilizan `FilterShell` (`src/shared/lib/filtros`, `ui/filtros`),
  `lib/paginacion.ts`, `<AvisoDeConflicto>`, `useBorradorDeEstado()` y `<MenuDeVistas>` (sumar la
  pantalla a `RUTA_DE_PANTALLA` en `equipo/entities/vista.ts`).

## Lo que el plan no había previsto (parte 2)

- **No había RPC de alta ni de edición**, y el `INSERT` directo dejaba poner `fase_id` y
  `publicado_web`: el grant por columna sólo cubría el `UPDATE`.
- **La policy de `vehiculos` no era de InitPlan:** `(select alcance_de('x', origen_id))` nombra la
  fila y corre por fila. Regla nueva en `.claude/rules/migraciones.md`.
- **Bajo RLS el GIN de `atributos` y los trigram no se usan** (`@>` e `ilike` no son `leakproof`).
  El listado se apoya en `vehiculos_origen_listado_idx`. Si un origen pasa de decenas de miles,
  la salida es una función `definer` de búsqueda (docs/DECISIONES.md).
- `origenes_campos` no tenía valor por defecto; un VIN repetido **bloquea** (único global); los
  campos `opcion` preconfigurados nacen sin opciones (no se ofrecen como filtro hasta tenerlas).
- `nuqs` a secas es `'use client'`, y una constante exportada desde un archivo de cliente llega al
  servidor como referencia: lo que también corre en el servidor lee la URL a mano.
- Un hook frena todo comando de Bash que nombre la secret key: para mirar la base local,
  `docker exec supabase_db_importadora psql …` o los helpers de `e2e/soporte`.

## Pendiente de decidir

- **Dominancia sobre la persona:** quien tiene `equipo.usuarios.gestionar` puede bloquear o dar de
  baja a alguien con más permisos que él (el guardián sólo salva al último).
- **Vencimiento de la invitación:** es el `otp_expiry` de Auth (1 h en local; hasta 24 h en la nube).
- **En la nube (una persona):** proyecto y `supabase link`; primer `db push --include-seed`;
  plantillas de correo; `Site URL` y `…/auth/callback`; SMTP; Google. Rama: sigue `master`.

## Deuda aceptada

- `puedeEditar()` sólo sabe «lo creé yo»: con alcance «propios», lo vinculado a un lead de la
  cartera lo edita la base pero la interfaz no ofrece el botón (se completa con el vínculo).
- `cambiar_fase` acepta `p_fase_esperada` nulo y `vehiculo_vitrina` no lleva versión; el bucket
  `vehiculos` deja hacer `remove` directo. Mover de fase mueve la versión del vehículo (quien edita
  la ficha en ese momento ve un conflicto). Los planes se midieron con la tabla vacía.
- Sin interfaz todavía: `demora_dias_default`, `lead_dormido_meses`, el logo oscuro, `push_web` y
  `web_publica`; el `icono` y el orden de los orígenes. Reordenar es con botones, sin arrastre.
- Los e2e (salvo los del inventario) exigen la base local sin personas ajenas (`pnpm db:reset`) y
  no corren en paralelo. Sin e2e de Google, recuperación, perfil ni «ver como».
- Las RPC de leads, flujos y cotizaciones siguen hablando de vos: se reescriben con su fase.
- Sin enforcement en la base: `equipo.usuarios.ver`, `equipo.roles.ver`, `tablero.metricas.ver`,
  `datos.exportar.todo`, `notificaciones.push`, `logistica.pagos.confirmar`.
