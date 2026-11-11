## 2026-11-11 — Paso 7.01-2: notificaciones, los avisos de cartera y de limpieza (parte 2 de 2 del 7.01)

- **Hecho:** compartir un lead avisa a quien lo recibe (`lead_compartido`) y transferirlo, al destino (`lead_transferido`), sólo si algo cambió; repetir
  reemplaza el aviso abierto. `lead_compartir` y `lead_transferir` son las de la base con 6 líneas más (misma firma y grants). Ningún título ni cuerpo lleva
  el teléfono, el número ni el nombre del lead. La limpieza avisa antes: `limpieza_avisar()` (job `limpieza-avisar`, 13:15 UTC) deja un `limpieza_pronto`,
  con acción, al creador del importado que entra en «Se limpiará pronto» (3 días, `_limpieza_ventana_de_aviso()` = `VENTANA_DE_AVISO_DIAS`), una vez por
  vehículo (marca en `limpieza_avisos`, RLS y sólo `service_role`), por `vehiculos_limpieza_orden_idx` con cota, 200 por corrida, nada con el interruptor
  apagado. Fichas de `leads` y `notificaciones`, GLOSARIO («Aviso de limpieza»).
- **Commits:** `a953c007` (compartir avisa), `b4ece80d` (transferir avisa), `56e24d54` (el aviso de limpieza), `114e17b6` (la prueba exige avisos sin dígitos, de la auditoría).
- **Verificación** (`.piloto/salidas/7.01/`): `db:probar` entero en verde (`db-probar-2.txt`, 787 ✓), con
  `supabase/tests/areas/notificaciones/avisos-de-cartera.sql` (A1–A5, L1–L4); `scripts/guardas` 1.044 ✓ (`guardas-2.txt`); stack local tras `db:reset`: el
  job, una corrida, RLS y ACL (`stack-local-2.txt`); `EXPLAIN` del recorrido por su índice (`explain-limpieza-avisar-2.txt`); `db:lint` sin avisos en lo
  tocado (`db-lint-2-resumen.txt`); `nivel.mjs`: Nivel 2 (`nivel-2.txt`); e2e dirigidos `leads-cartera`, `leads-oportunidades`, `leads-portal` en escritorio,
  19 ✓ (`e2e-dirigidos-2.txt`).
- **7.01 terminado:** cierra lo arrastrado de ESTADO «notificar al compartir, transferir y limpiar» (y, con la 7.01-1, «`recordatorios_notificar()` sin
  cron»).
- e2e completo: no (7.01-2, Nivel 2 por estructura: lo corre el CI del PR; sin interfaz)
