## 2026-11-11 — Paso 7.01-1: notificaciones, la base (parte 1 de 2 del 7.01)

- **Hecho:** toda fila de `notificaciones` pasa por una puerta `before insert` (`notificaciones_puerta()`, `security definer`): a quien está de baja, bloqueado o
  sin perfil no le llega nada, sin error para quien avisa. Cubre a `notificar()` (sin tocarla) y a los inserts directos de `alertas_demora` y los turnos web.
  Índices `notificaciones_usuario_fecha_idx` y `notificaciones_por_accionar_idx`. La tabla entra en `supabase_realtime` (con su doble en PGlite).
  `recordatorios_notificar()` (misma firma) corre cada minuto por pg_cron (`recordatorios-notificar`): 200 en orden con `skip locked`, sella sin avisar el
  eliminado, la `ruta` nombra el lead sólo si su dueño todavía lo tiene vivo en la cartera (si no, `/agenda?recordatorio=<id>`) y cambiar la hora reemplaza
  el aviso abierto. `notificaciones_purgar()` con su job diario (`notificaciones-purgar`, 03:45 UTC): leídas o accionadas de más de 90 días y `visitados` de
  más de 30, por lotes. `actividad_purgar()` sigue sin programar (Fase 9). Cierra lo arrastrado «`recordatorios_notificar()` sin cron» (ESTADO); «notificar al
  compartir, transferir y limpiar» queda para la 7.01-2. Fichas de `notificaciones` y `leads` al día.
- **Commits:** `9342961b` (la publicación en el doble de PGlite), `4bdce92c` (la puerta), `e13a7f99` (índices), `4e09b140` (realtime), `1ce00742` (el job de
  recordatorios), `07d68a00` (la purga).
- **Verificación** (`.piloto/salidas/7.01/`): `db:probar` entero en verde (`db-probar.txt`, 778 ✓), con `supabase/tests/areas/notificaciones/puerta.sql` (P1–P5),
  `recordatorios-job.sql` (R1–R6) y `purgar.sql` (G1–G2); `scripts/guardas` entero, 33 archivos y 1.043 pruebas (`guardas.txt`); en el stack local, tras
  `db:reset`, la publicación, los dos jobs, el trigger y una corrida `succeeded` de `recordatorios-notificar` (`stack-local.txt`); `db:lint` sin avisos en las
  funciones nuevas (`db-lint.txt`); `nivel.mjs`: Nivel 2 por estructura (`nivel.txt`); e2e dirigido `e2e/leads-recordatorios.spec.ts` en escritorio
  (`e2e-dirigidos.txt`).
- **7.01 sigue:** falta la **7.01-2** (los avisos `lead_compartido`, `lead_transferido` y `limpieza_pronto`, con `avisos-de-cartera.sql`). Este PR no marca
  integrado el paso (`parcial: true`).
- e2e completo: no (7.01-1, Nivel 2 por estructura: lo corre el CI del PR; sin interfaz)
