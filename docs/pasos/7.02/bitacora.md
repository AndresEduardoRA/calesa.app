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

## 7.02-3 · la pantalla `/notificaciones` (2026-11-11)

Tercera y última parte. El paso queda completo:

- `src/app/(app)/notificaciones/`: `page.tsx` (título, `?ver=por-accionar|todas` leído en el servidor tras `<Suspense>` y `await connection()`, primera página de `TAMANO_DE_VER_MAS`), `loading.tsx` y `esqueleto-de-notificaciones.tsx`, `lista-con-acciones.tsx` (une la lista con el registro de acciones por tipo). `_shell/rutas-con-pantalla.ts`: las rutas con pantalla, en un solo archivo para el layout y la página.
- `features/lista/`: `<ListaDeNotificaciones>` (pestañas Todas / Por accionar con `nuqs` y `shallow: false`; error de la primera lectura con «Reintentar»), `<CuerpoDeLaLista>` (se reinicia con `key={ver}`), `<VacioDeLaLista>`, `<PieDeLaLista>` («Ver más» por cursor, «Reintentar», «Sin conexión», `<AvisoDeTope>` al llegar a 500), `useListaDeNotificaciones` (Realtime como señal: relee la primera página y la funde por id) y `useMarcarTodas`. `<FilaDeNotificacion>`, `<IconoDeTipo>` y `useAbrirAviso` se movieron de `campana/` a `lista/`: una sola fila para los dos lugares.
- `entities/fundir.ts` (`fundirPagina`, `sumarPagina`), con su prueba: lo nuevo arriba, el estado fresco manda, lo que dejó de cumplir el filtro sale y lo de «Ver más» se conserva.
- `pantallas/notificaciones.ts` e `index.ts` (sólo `leerPaginaDeNotificaciones` y `filtroDeLista`: sin componentes). Ficha del módulo al día.
- Presupuesto del documento de `/perfil`: 91 KB (86.627 B medidos con la entrada de Logística de 6.01 y la campana de 7.02-2; lo medido más un 5 %).
- Pruebas: `e2e/notificaciones-campana.spec.ts`, 7 × escritorio y celular (25 avisos: «Ver todas» lista 20 y «Ver más» trae los 5 restantes sin repetir; `?ver=por-accionar` filtra y «Todas» vuelve; un aviso nuevo entra arriba sin recargar; «Marcar todas como leídas» las deja leídas sin accionar), `presupuesto-js` en verde. `fundir.test.ts` y `scripts/guardas` en verde; `lint`, `typecheck` y `mapa.sh --check` sin avisos.
- e2e completo: no (7.02-3, sólo specs dirigidos: lo prueba el CI del PR)

## 7.02 · arreglo del CI del PR #116 (2026-11-11)

Cuatro bloques de e2e en rojo (escritorio). Causas, medidas y reproducidas en local: (1) la campana pedía `notificaciones` al montar y los specs que cuentan pedidos a la base lo veían (`vehiculos-resumen`, `cotizaciones-listado-resumen`, `leads-escala`); (2) +1 parada de Tab (`cotizar-tarea-de-oro-recorrido`, `leads-portal-acceso`); (3) el JS del cliente de Supabase evaluado al hidratar retrasaba ≈ 320 ms el primer clic que vale (`leads-oportunidades-ver-todas`, `leads-confirmar-por-url`, `vehiculos-alta` y `cotizaciones-listado` con la tecla N); (4) un aviso insertado antes de que el canal se uniera se perdía (`notificaciones-campana`). Ver D13 a D15 en `decisiones.md`. Los 11 specs afectados, en verde en escritorio y celular (115 + 3 pruebas), `canal.client.test.ts` en verde.

- e2e completo: no (arreglo del 7.02, sólo specs dirigidos: lo prueba el CI del PR)
