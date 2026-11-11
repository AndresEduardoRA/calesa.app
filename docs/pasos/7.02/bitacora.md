## 7.02-1 · la base de la campana: tipos, destino, canal y lectura (2026-11-11)

Primera de tres partes del 7.02 («La campana y `/notificaciones`»; plan en `.piloto/planes/7.02.md`). Sin interfaz todavía:

- `entities/`: catálogo de tipos (`tipos.ts`, con `tipoDe` y `accionaAlAbrir`), `destino.ts` (`destinoDe`: enlace, sin pantalla o ninguno; nunca una ruta externa, con esquema, `//`, `\` ni controles), `notificacion.ts` (la fila validada con Zod, cursor `(creado_en, id)`, `?ver=`) y las interfaces de `repositorios.ts`.
- `src/shared/lib/supabase/canal.client.ts`: Realtime como señal (sólo los eventos pedidos, aviso al reconectar o al volver la pestaña, `desuscribir`).
- `infra/`: `consultas.ts` (página por cursor, contador acotado a «9+», lo de la campana), envueltas para el servidor (`queries/notificaciones.ts`) y el navegador (`notificaciones.client.ts`); `notificaciones.ts` escribe `leida_en`/`accionada_en` bajo la RLS.
- `features/lista/actions/`: `abrirNotificacion` (idempotente) y `marcarTodasLeidas` (lotes de 200, hasta 5 por clic); `composicion.ts` las une.
- Pruebas: `destino.test.ts`, `tipos.test.ts` y `canal.client.test.ts` en verde; `scripts/guardas` en verde (escala, barriles, capas).
- Quedan para 7.02-2 (campana y huecos del marco) y 7.02-3 (`/notificaciones`, ficha del módulo).
- e2e completo: no (7.02-1, sin interfaz: Vitest, lint y typecheck; lo prueba el CI del PR)
