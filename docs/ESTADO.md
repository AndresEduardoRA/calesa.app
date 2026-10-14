# Estado

> Este archivo es la fuente de verdad de "en qué vamos". Claude Code lo actualiza al cerrar cada
> tarea; la skill `piloto-prompts` lo lee para saber qué pedir después. Si está desactualizado,
> el siguiente prompt va a asumir cosas falsas. Máximo 80 líneas: lo que ya no es actual se mueve
> a `docs/BITACORA.md`. Qué existe en el código no va aquí: eso lo dice `docs/MAPA.md`.

**Última actualización:** 2026-10-14
**Fase actual:** 3 — Leads, **parte 1 de 7 hecha** (campos configurables). Sigue la 2: el alta.

## Funcionando

- Verdes: lint, typecheck, test, `db:probar`, `scripts/mapa.sh --check`, build y `test:e2e`
  (números en `docs/BITACORA.md`). Fases 0, 1 y 2 completas, y la parte 1 de la Fase 3.
- **Campos de los leads** (Configuración › Leads › Campos, `leads.configurar`): crear, apagar,
  renombrar, ordenar, agrupar, requerido, filtrable, «en la tabla», valor por defecto (fijo o el de la
  empresa) y «solo la cartera». Edad, ciudad, país, dirección, género y notas son campos de fábrica (ya
  no columnas); nombre, teléfono, tipo y origen siguen fijos. Un layout por despliegue.
- **Privacidad en la base:** un privado lo recibe sólo la cartera, por la vista y al filtrar;
  `leads.atributos` y `actividad.antes/despues` no son legibles. Compartir, transferir y adoptar los
  dan; revocar los quita. El motor es común (`shared/…/campos`, `_campo_*`); vehículos no cambió.
- **Orígenes y vehículos:** listado con filtros en la URL y vistas, ficha, alta y edición, fotos,
  vitrina, papelera por lotes con purga y `storage-gc`; vínculo e interesados (de sólo lectura hasta
  que haya ficha de lead); apibara (alta por enlace, VIN o lote, «Refrescar») y la limpieza automática.

## Siguiente: Fase 3 — Leads (`docs/PLAN.md`), lo que falta

Una por sesión: **2)** alta rápida y primer seguimiento (tarea de oro 1; extrae a `shared` el formulario
por bloques y los `Record` por tipo). **3)** listado con filtros del layout y ficha con edición
(`lead_guardar`). **4)** seguimientos, recordatorios, favoritos, tachados y etiquetas. **5)** cartera y
vínculo e interesados. **6)** embudos y portal. **7)** CSV con las columnas del layout y orígenes de lead.

## Pendientes que se arrastran

- **Parte 5 (cartera):** `leads_telefonos` no se enmascara a quien ve el lead sin la cartera;
  `telefono_lead(id)` no comprueba acceso; quien tiene `leads.editar` «todos» puede compartirse un lead
  ajeno y no se mira si el destino está activo (`docs/DECISIONES.md`, 2026-10-14).
- **Fase 4:** la cotización final como ancla de la limpieza (`_limpieza_ancla()`); si se puede desvincular
  un vehículo con cotización final; campos del lead en la tarjeta o el PDF.
- **Fase 6:** mover de fase y publicar sin mover la versión de la ficha; la papelera manual no mira `documentos`.
- **Fases 7 y 8:** la notificación de la limpieza; el buscador por texto de leads, sin los privados; la
  web llenando campos del lead al pedir asesor.
- **Fase 9:** medir con 5 a 10 mil registros (listado y filtros de vehículos y de leads, papelera);
  métricas por campo de opciones; Actividad lee el diff por una función que recorta según la cartera.
- **Remoto de git y CI:** no hay remoto; `.github/` existe y todavía no corrió.

## Lista para la nube (una persona)

- Proyecto y `supabase link`; primer `db push --include-seed`; plantillas de correo; `Site URL`; SMTP;
  Google; `supabase functions deploy storage-gc` y `apibara`, y `select public.storage_gc_programar(
'https://<ref>.supabase.co/functions/v1/storage-gc');` (sin eso la purga deja los archivos).
- **Jobs** (`limpieza-automatica`, `apibara-consultas-purgar`, `papelera-purgar`): comprobar en `cron.job`
  que quedaron (`pg_cron` corre en UTC) y que el runtime inyecta `SUPABASE_SERVICE_ROLE_KEY` y `SUPABASE_ANON_KEY`.
- **Permisos:** un permiso nuevo en una base viva necesita su `insert … on conflict` y la concesión
  al dueño en la misma migración (ninguna lo ha hecho todavía).

## Pendiente de decidir

- **Dominancia sobre la persona**, **vencimiento de la invitación** (`otp_expiry`), **fotos de una
  subasta en segundo plano** (hoy en el navegador) y el **rango de un campo numérico** (la edad ya no
  tiene 1–120); y si separar `leads.campos.gestionar`.

## Deuda aceptada

- `registrar_actividad()` y `storage_refcount()` tienen `execute` para `authenticated`; `marca` y
  `avatares` borran con `quitarSiHuerfano()`. `cambiar_fase` acepta `p_fase_esperada` nulo.
- `vehiculos.papelera.purgar` es global y gobierna también la papelera de leads y cotizaciones, que
  siguen sin versión ni purga automática. `web.solicitar_asesor` no valida el vehículo y
  `cotizacion_marcar_final` vincula sin mirar la papelera (fases 8 y 4).
- `limpieza_el` corre con los derechos de la base: un nulo revela que algo retiene al vehículo.
  Despublicar no revoca la URL de una foto que alguien ya tenga (bucket público).
- `storage-gc` y `apibara` (Deno) no entran en lint ni typecheck: las cubren sus e2e y un test en Node.
- Con cuentas reales en la base local, «la primera persona nace dueña» y el guardián se saltan (corren en
  CI). Vitrina, papelera y apibara necesitan `npx supabase functions serve`. Falta probar fotos en iPhone.
- Un e2e que falla a mitad puede dejar apibara apagada (pasó el 2026-10-14): se enciende en Integraciones.
- Dos mensajes de RPC hablan de vos: `cambiar_fase` y la fórmula (con su fase).
- Sin interfaz: `demora_dias_default`, `lead_dormido_meses`, el logo oscuro, `push_web`, `web_publica`,
  `ajustes_web.origenes_visibles`, `fases.publica_web`, el `icono` y el orden de los orígenes. Sin
  enforcement: `equipo.usuarios.ver`, `equipo.roles.ver`, `tablero.metricas.ver`, `datos.exportar.todo`,
  `notificaciones.push`, `logistica.pagos.confirmar`.
