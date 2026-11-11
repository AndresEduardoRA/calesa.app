## 7.02-1 · la base de la campana: tipos, destino, canal y lectura (2026-11-11)

Primera de tres partes del 7.02 («La campana y `/notificaciones`»; plan en `.piloto/planes/7.02.md`). Sin interfaz todavía:

- `entities/`: catálogo de tipos (`tipos.ts`, con `tipoDe` y `accionaAlAbrir`), `destino.ts` (`destinoDe`: enlace, sin pantalla o ninguno; nunca una ruta externa, con esquema, `//`, `\` ni controles), `notificacion.ts` (la fila validada con Zod, cursor `(creado_en, id)`, `?ver=`) y las interfaces de `repositorios.ts`.
- `src/shared/lib/supabase/canal.client.ts`: Realtime como señal (sólo los eventos pedidos, aviso al reconectar o al volver la pestaña, `desuscribir`).
- `infra/`: `consultas.ts` (página por cursor, contador acotado a «9+», lo de la campana), envueltas para el servidor (`queries/notificaciones.ts`) y el navegador (`notificaciones.client.ts`); `notificaciones.ts` escribe `leida_en`/`accionada_en` bajo la RLS.
- `features/lista/actions/`: `abrirNotificacion` (idempotente) y `marcarTodasLeidas` (lotes de 200, hasta 5 por clic); `composicion.ts` las une.
- Pruebas: `destino.test.ts`, `tipos.test.ts` y `canal.client.test.ts` en verde; `scripts/guardas` en verde (escala, barriles, capas).
- Quedan para 7.02-2 (campana y huecos del marco) y 7.02-3 (`/notificaciones`, ficha del módulo).
- e2e completo: no (7.02-1, sin interfaz: Vitest, lint y typecheck; lo prueba el CI del PR)

## 7.02-2 · la campana en la barra (2026-11-11)

Segunda de tres partes. La campana ya está en el marco de toda pantalla:

- `features/campana/`: `<Campana>` (botón de 44 px en el celular, insignia «9+», nombre «Notificaciones, 3 sin leer»), el popover con su contenido diferido (las que piden acción primero, tope 10, «Ver todas»), `<FilaDeNotificacion>` (una sola fila para la campana y, en la parte 3, para la lista), `<SuscripcionDeLaCampana>` (diferida: el contador y Realtime) y los hooks. `shell.client.ts` y `composicion.client.ts`.
- `src/app/(app)/_shell/`: `Marco` suma `campana`, `buscador` y `flotante`; `huecos/{campana,buscador,chat}.tsx` y `acciones-de-notificaciones.ts` (el registro por tipo, hoy vacío); `layout.tsx` los llena con las rutas con pantalla (`NAVEGACION` disponible + `/notificaciones`).
- `destinoDe`: `/` (Inicio) sólo es ella misma (como prefijo volvía disponible toda ruta); `RUTAS.notificaciones`; `<EstadoError compacto>`.
- Arreglo en `canal.client.ts`: el canal se une tras `realtime.setAuth()` (ver D8).
- Pruebas: `e2e/notificaciones-campana.spec.ts` (3 × escritorio y celular: la fila insertada por SQL aparece sin recargar; abrirla lleva a su ruta y la deja leída y accionada; una ruta sin pantalla no es enlace). `canal.client.test.ts` (8) y `destino.test.ts` en verde; `barra-superior-celular`, `presupuesto-js` y `acceso` en verde.
- e2e completo: no (7.02-2, sólo specs dirigidos: lo prueba el CI del PR)
