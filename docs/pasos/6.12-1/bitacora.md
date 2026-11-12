## 2026-11-12 — Paso 6.12-1: alertas y bandeja de logística, la base (parte 1 de 2)

- **Hecho:** cuatro migraciones `alertas_*` (`supabase/migrations/2026111210372{1,2,3,4}_*.sql`):
  - el índice `notificaciones_referencia_idx` y el trigger `trg_alertas_cerrar_al_mover` en `historial_fases` (mover acciona los `demora_fase` abiertos de la unidad);
  - `alertas_demora()` reescrita por lotes (pares origen/fase, cursor de a 200, tope 2.000), con destinatarios por el menor alcance de `flujos.mover`, `logistica.ver` y
    `vehiculos.ver`, reapertura del mismo aviso pasado `alerta_cada_horas` y `notificar()`; job `alertas-demora` cada hora;
  - `documentos_vencimientos()` y su job diario: `documento_por_vencer` una vez por persona y documento desde su ventana de aviso;
  - `logistica_bandeja(p_tope)`: demoradas, trabados y por aprobar, `{ filas, hay_mas }` sin conteo, con el alcance por origen como la cadena.
  - Pruebas: `supabase/tests/areas/alertas/{demora,vencimientos,bandeja,jobs}.sql` (16). GLOSARIO: «Trabado», «Documento por vencer». RENDIMIENTO: «Alertas y bandeja de
    logística (6.12)». Fichas de `logistica` y `notificaciones`.
- **Falta (6.12-2):** `bandejaLogistica()`, los tres bloques de Inicio («Vehículos trabados», «Documentos por aprobar», «Alertas por demora»), el tipo `documento_por_vencer`
  en el catálogo de avisos, el registro de `logistica_bandeja` en la guarda de páginas y `e2e/inicio-bandeja-logistica.spec.ts`. Plan servido en
  `.piloto/planes/6.12.md` › «Partición».
- **Verificación** (`.piloto/salidas/6.12/`): `db:reset`, `db:types`, `db:probar` completo en verde (0 ✗), guardas de vitest (1096 ✓), `typecheck` y `mapa.sh --check`.
- e2e completo: no (6.12-1, Nivel 2 por el índice: lo corre el CI del PR; sin dirigidos)
