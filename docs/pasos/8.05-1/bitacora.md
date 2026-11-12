## 2026-11-12 · Paso 8.05-1: la tarjeta de turno, «Contacté», «Vincular a lead» y el bloque de Inicio (parte 1 de 2)

### Hecho

- `entities/turnos/`: `cuentaRegresiva(venceEn, ahora)` (horas y minutos, «menos de 1 min», «Vencido» con borde inclusivo y «Sin límite de tiempo» para el
  contacto directo), `ordenarTurnos` (vigentes por `vence_en`, las directas al final de las vigentes, luego las vencidas de la más reciente) y los nombres de
  la URL del panel; con sus tests (11 pruebas).
- `infra/turnos/mis-turnos.ts` (`leerMisTurnos`: dos lecturas `limit 6` filtradas por `usuario_id` con el id de `getClaims()`, más el título de `web.vehiculos`) y la
  action `confirmarContacto` sobre `web_confirmar_contacto(p_solicitud, p_lead)`, por `areas/turnos/{index,client,composicion}.ts`.
- `<TarjetaTurno>` (código, fuente, vehículo, cuenta regresiva viva cada 30 s, «Contacté» en un toque, «Vincular a lead» por URL) y `<ActualizarAlVolver>`.
- El bloque `turnos-web` de Inicio (mis turnos, tope 5 con `<AvisoDeTope>`, relee al volver a la pestaña). No hizo falta `_inicio/bloques.tsx` ni tocar `<Bandeja>`:
  el 9.02 dejó cada bloque como un Server Component en `tablero/features/bandeja/bloques/`.
- `leads/pantallas/turno.ts` y `features/vincular-turno/` (el panel «Vincular a un lead» con el buscador y la lista de `panel-para-cotizar`) y su montaje
  en `src/app/(app)/_inicio/vincular-turno.tsx`; «+» abre «Nuevo lead» y el alta devuelve `?vincular=<id>`. Registro en `drawers-con-salida.ts`.
- `e2e/web-turno.spec.ts` (escritorio y celular): «Contacté» en un toque, vincular a un lead y la dueña que gestiona la cola sin ver los turnos de otra persona.
- Fichas de `web`, `tablero` y `leads`; una línea en `docs/RENDIMIENTO.md`.
- Sigue la 8.05-2: en `/perfil`, el interruptor «Disponible para recibir turnos» y «Tu ficha en la web» (plan servido en `.piloto/planes/8.05.md`, «Servida: parte 2»).

Commits: `a36024fa`, `42208a7c`, `b39f132a`, `2abaa8bb`, `b9b4c435`, `04e27a59` y el de docs.

### Verificación

- Vitest de `entities/turnos`: 14 de 14 con `rueda.test.ts`; guardas completas (`scripts/guardas`): 36 archivos, 1125 pruebas, tras registrar el panel en `drawers-con-salida.ts`.
- `pnpm typecheck` sin errores; lint en el hook de cada commit; `mapa.sh` regenerado.
- e2e `web-turno`: 6 de 6 (escritorio y celular, `.piloto/salidas/8.05/e2e-web-turno.txt`). Dirigidos `rueda-por-rol`, `cola-web-tablero`, `inicio-bandeja`,
  `inicio-bandeja-logistica`, `presupuesto-js` y `acceso`: 33 en verde, 8 saltadas (las marcadas sin celular), 0 caídas (`.piloto/salidas/8.05/e2e-dirigidos.txt`).
- Sin base nueva: sin migración, policy ni tipos.
- e2e completo: no (8.05-1, Nivel 1: lo corre el CI del PR; dirigidos web-turno, rueda-por-rol, cola-web-tablero, inicio-bandeja, inicio-bandeja-logistica, presupuesto-js, acceso)
