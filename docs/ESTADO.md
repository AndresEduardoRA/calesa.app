# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-14
**Fase actual:** 3 — Leads, **parte 2 de 7 hecha** (alta rápida y primer seguimiento). Sigue la 3.

## Funcionando

- Verdes: lint, typecheck, test, `db:probar`, `mapa.sh --check`, build y `test:e2e` (números en
  `docs/BITACORA.md`). Fases 0, 1 y 2 completas, y las partes 1 y 2 de la Fase 3.
- **Alta rápida** («Nuevo lead»: botón de la barra superior o `N`, `?panel=nuevo-lead`; sólo con
  `leads.crear`): teléfono verificado al tipear (libre / existe / de otro / sin dueño → «Tomar lead»),
  requeridos del layout y «Más datos»; `Ctrl/Cmd+Enter` abre el seguimiento y guarda todo junto en una RPC,
  con reintento que no duplica. Código de país en Empresa › Región. Un lead aún no se ve: parte 3.
- **Campos de los leads** (Configuración › Leads › Campos, `leads.configurar`): crear, apagar, ordenar,
  requerido, filtrable, valor por defecto y «solo la cartera» (lo recibe sólo la cartera). Motor común con orígenes.
- **Orígenes y vehículos:** listado con filtros, ficha, alta y edición, fotos, vitrina, papelera por lotes,
  `storage-gc`, vínculo e interesados (de lectura), apibara y la limpieza automática.

## Siguiente: Fase 3 — Leads (`docs/PLAN.md`), lo que falta

Una por sesión: **3)** listado con filtros del layout y ficha con edición (`lead_guardar`), con «Abrir» y
«Abrir ficha» del alta y los dos pendientes de teléfono de abajo. **4)** seguimientos (Tiptap, RPC propias),
recordatorios, favoritos, tachados y etiquetas. **5)** cartera y vínculo e interesados. **6)** embudos y
portal. **7)** CSV con las columnas del layout y orígenes de lead.

## Pendientes que se arrastran

- **Parte 3 (antes de que la ficha muestre teléfonos):** `leads_telefonos` no se enmascara a quien ve el
  lead sin la cartera; `telefono_lead(id)` no comprueba acceso. Y «Abrir» y «Abrir ficha» (sin enlace hoy).
- **Parte 4:** las policies directas de `seguimientos` (no miran que el tipo esté activo) y de
  `recordatorios` (no miran el acceso al lead) se cierran con RPC; el editor muestra `detalle_texto`.
- **Parte 5 (antes de invitar a un asesor con leads reales):** quien tiene `leads.editar` «todos» puede
  compartirse un lead ajeno y no se mira si el destino está activo (`docs/DECISIONES.md`, 2026-10-14).
- **Fase 4:** la cotización final como ancla de la limpieza; desvincular un vehículo con cotización final;
  campos del lead en la tarjeta o el PDF. **Fase 6:** mover de fase y publicar sin mover la versión de la
  ficha; la papelera manual no mira `documentos`.
- **Fases 7 y 8:** el CTA «Escribirle por chat» de «Lo tiene …» (hoy sin acción); la notificación de la
  limpieza; el buscador de leads, sin los privados; la web llenando campos del lead al pedir asesor.
  **Atajo `?`:** está en el catálogo y nada dibuja la lista.
- **Fase 9:** medir con 5 a 10 mil registros (listados, filtros, papelera); Actividad lee el diff por una
  función que recorta según la cartera. **Remoto de git y CI:** no hay remoto; `.github/` no corrió.

## Lista para la nube (una persona)

- Proyecto y `supabase link`; primer `db push --include-seed`; plantillas de correo; `Site URL`; SMTP;
  Google; `supabase functions deploy storage-gc` y `apibara`, y `select public.storage_gc_programar(
'https://<ref>.supabase.co/functions/v1/storage-gc');` (sin eso la purga deja los archivos).
- **Jobs** (`limpieza-automatica`, `apibara-consultas-purgar`, `papelera-purgar`): comprobar en `cron.job`
  que quedaron (`pg_cron` corre en UTC) y que el runtime inyecta `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY`.
- **Siembra:** un permiso nuevo en una base viva necesita su `insert … on conflict` y la concesión al dueño
  en la misma migración; `origenes_lead` y `tipos_seguimiento` sólo están en `seed.sql`. Cargar el
  **código de país** en Empresa › Región (sin él, un teléfono se escribe con «+»).

## Pendiente de decidir

- Dominancia sobre la persona; vencimiento de la invitación (`otp_expiry`); fotos de una subasta en
  segundo plano (hoy en el navegador); rango de un campo numérico; si separar `leads.campos.gestionar`.

## Deuda aceptada

- `registrar_actividad()` y `storage_refcount()` tienen `execute` para `authenticated`; `marca` y
  `avatares` borran con `quitarSiHuerfano()`. `cambiar_fase` acepta `p_fase_esperada` nulo.
- `vehiculos.papelera.purgar` gobierna también la papelera de leads y cotizaciones, sin versión ni
  purga automática. `web.solicitar_asesor` no valida el vehículo; `cotizacion_marcar_final` vincula sin
  mirar la papelera. `limpieza_el` corre con los derechos de la base. Despublicar no revoca la URL de una foto.
- `storage-gc` y `apibara` (Deno) no entran en lint ni typecheck: las cubren sus e2e y un test en Node.
- Con cuentas reales en la base local, «la primera persona nace dueña» y el guardián se saltan (corren en
  CI). Los e2e exigen `npx supabase functions serve` (la guardia falla en segundos si no está). Falta
  probar fotos en iPhone. Apibara está apagada en la base local desde un e2e del 2026-10-14: se enciende
  en Integraciones (la guardia ya no deja que se repita). `tipo_acceso = 'adoptado'` quedó sin uso.
- Dos mensajes de RPC hablan de vos: `cambiar_fase` y la fórmula.
- Sin interfaz: `demora_dias_default`, `lead_dormido_meses`, el logo oscuro, `push_web`, `web_publica`,
  `ajustes_web.origenes_visibles`, `fases.publica_web`, el `icono` y el orden de los orígenes. Sin
  enforcement: `equipo.usuarios.ver`, `equipo.roles.ver`, `tablero.metricas.ver`, `datos.exportar.todo`,
  `notificaciones.push`, `logistica.pagos.confirmar`.
