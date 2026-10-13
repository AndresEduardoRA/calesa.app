# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-13
**Fase actual:** 2 — Orígenes y vehículos, **abierta**. Hechas las partes 1 (orígenes), 2
(vehículos) y 3 (fotos, vínculo e interesados); siguen la 4 y la 5, cada una en sesión nueva.

## Funcionando

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm db:probar`, `bash scripts/mapa.sh --check`,
  `pnpm build` y `pnpm test:e2e` (los números de la última corrida están en `docs/BITACORA.md`).
- **Fase 1** completa. **Orígenes** y **vehículos** (listado con filtros en la URL y vistas
  guardadas, ficha por layout, alta y edición en panel con conflicto y reintento sin conexión).
- **Fotos** (`/vehiculos/[id]?seccion=fotos`): elegir (selector, soltar, cámara en el celular)
  arma una bandeja y no sube nada; al confirmar se suben los dos tamaños de cada foto y una action
  las registra. Hasta 24, sin repetir (por hash del archivo), una portada, orden con botones o
  `Alt+←/→`, eliminar con «Deshacer». Resultado parcial explícito y reintento de lo que faltó.
  La portada se ve en el listado y en la cabecera. Todo por RPC, con versión propia de las fotos.
- **Vínculo e interesados:** RPC de escritura y de lectura, y un bloque de sólo lectura bajo la
  ficha (para quien tiene `leads.ver`). «Editar» lo decide la base (`vehiculos_editables`).
- `vehiculos`, `vehiculos_imagenes` y `vehiculos_interesados` son de **sólo lectura** para la app.

## Siguiente: Fase 2, partes 4 y 5

- 4: vitrina por RPC con precio público, y papelera (enviar, listar, restaurar, purgar). Con ella:
  - **La edge function `storage-gc`** y su job (`pg_cron` + `pg_net` + un secreto). El protocolo
    ya está en SQL (`supabase/functions/README.md`). Hasta entonces **nada se borra de Storage**.
  - `web.vehiculos` publica `imagen` e `imagenes` con la ruta completa: sumarle la miniatura.
  - `papelera_purgar` encola sólo `ruta`: las miniaturas las junta el barrido de huérfanos.
  - `vehiculo_vitrina` no lleva versión (deuda).
- 5: apibara (alta por enlace, fotos por URL). Sin escritor todavía: `subasta_*`,
  `estado_subasta`, `apibara_*`. Las fotos que traiga pasan por `vehiculo_fotos_agregar`
  (el trigger exige que los dos objetos existan y sean `.webp` o `.jpg`).
- Fase 3 (leads): la interfaz que vincula y marca interesados se muestra en la ficha del lead pero
  **vive en `vehiculos`** (`leads` no puede importarlo). Decidir si desvincular un vehículo con
  cotización final se frena.

## Lo que el plan no había previsto (parte 3)

- **Fallo de permisos en `vehiculo_guardar` (parte 2), corregido:** con alcance «propios», quien
  tenía algún lead en su cartera editaba cualquier vehículo sin vínculo de ese origen (`if` sobre
  un `in (…)` que da nulo). Regla nueva en DECISIONES; el humo lo cubre.
- **Safari no codifica WebP en canvas:** devolvía PNG llamado `.webp` (también en avatar). Ahora
  cae a JPEG. **Falta probarlo a mano en un iPhone:** los e2e corren en Chromium.
- `anon` podía listar el bucket `vehiculos` entero; quien editaba podía borrar objetos. Cerrado.
- Las policies de storage nunca se habían probado: el `storage.objects` de PGlite no tenía RLS.
- Una tabla nueva necesita su `_rls()` en `…000200_rls_y_grants.sql` (ese archivo lo comprueba).
- Una foto de menos de 480 px es un solo objeto (completa = miniatura): es válido.
- Faltaban índices en `vehiculos.lead_id` y en las tablas hijas de vehículos.

## Pendiente de decidir

- **Dominancia sobre la persona:** quien tiene `equipo.usuarios.gestionar` puede bloquear o dar de
  baja a alguien con más permisos que él (el guardián sólo salva al último).
- **Vencimiento de la invitación:** es el `otp_expiry` de Auth (1 h en local; hasta 24 h en la nube).
- **En la nube (una persona):** proyecto y `supabase link`; primer `db push --include-seed`;
  plantillas de correo; `Site URL` y `…/auth/callback`; SMTP; Google. Rama: sigue `master`.

## Deuda aceptada

- `registrar_actividad()` y `storage_refcount()` tienen `execute` para `authenticated`: cualquiera
  escribe en `actividad` (de ahí sale el «quién» de un conflicto) o sondea si una ruta existe.
- `marca` y `avatares` siguen borrando con `quitarSiHuerfano()` (cuenta y después borra).
- `cambiar_fase` acepta `p_fase_esperada` nulo. Mover de fase mueve la versión del vehículo (quien
  edita la ficha en ese momento ve un conflicto). Los planes se midieron con las tablas casi vacías.
- Sin interfaz todavía: `demora_dias_default`, `lead_dormido_meses`, el logo oscuro, `push_web` y
  `web_publica`; el `icono` y el orden de los orígenes; vincular y marcar interesados.
- Los e2e (salvo los del inventario) exigen la base local sin personas ajenas (`pnpm db:reset`) y
  no corren en paralelo. Sin e2e de Google, recuperación, perfil ni «ver como». El de filtros en
  móvil (`vehiculos.spec.ts:57`) falló una vez con la máquina ocupada y no se repitió: vigilarlo.
- Las RPC de leads, flujos y cotizaciones siguen hablando de vos: se reescriben con su fase.
- Sin enforcement en la base: `equipo.usuarios.ver`, `equipo.roles.ver`, `tablero.metricas.ver`,
  `datos.exportar.todo`, `notificaciones.push`, `logistica.pagos.confirmar`.
- Un hook frena todo comando de Bash que nombre la secret key: para mirar la base local,
  `docker exec supabase_db_importadora psql …` o los helpers de `e2e/soporte`.
