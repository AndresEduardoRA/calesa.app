## 2026-11-12 · Paso 8.04-2: la lectura del tablero de la cola web y su pantalla de sólo lectura (parte 2 de 3)

### Hecho

- `entities/cola/`: el parseo de `cola_web_tablero` y `cola_web_solicitudes`, `agruparTablero` (en la rueda, sin rol, cuenta inactiva; una fila en un solo
  grupo), `ordenDeLaRueda` (espejo documentado del paso 5 de `web.solicitar_asesor`, con su test O1–O7), el cursor y el conteo acotado de «Sin asignar» y la
  política de la cola.
- `infra/cola/`: el tablero con `TOPE_DEL_EQUIPO`, la primera página de «Sin asignar» en el servidor y «Ver más» en el navegador, la política de
  `ajustes_web`; composición y entradas del área; los dos registros de `areas-b/paginas-en-la-base.ts`; una línea en `RENDIMIENTO.md`.
- `/configuracion/cola-web` (`web.cola.gestionar`): avisos de la política (cola apagada, sin WhatsApp de respaldo), «Sin asignar» destacado con «Ver más»,
  la rueda en el orden de la ruleta, los grupos «Habilitada, pero su rol no recibe turnos de la web» y «Cuenta bloqueada o inactiva», «Actualizar» y relectura
  al volver a la pestaña. Su tarjeta en el hub de Configuración. Ficha de `web` (las tres líneas de `cola`, de uniones, quedan en una) y glosario
  («Sin asignar»).
- `e2e/cola-web-tablero.spec.ts` con las dos primeras pruebas (sin celular).
- Sigue la 8.04-3: agregar a la rueda, el aviso al habilitar sin el permiso, quitar con «Deshacer», la política y la tercera prueba del e2e; cierra 8-1.

Commits: `a1103c5b`, `2716eb32`, `c4dcd527`, `61bc2407` y el de docs.

### Verificación

- Vitest de `entities/cola`: 10 de 10; guardas, `secciones.test.ts` y `entities/cola`: 39 archivos, 1140 pruebas (`.piloto/salidas/8.04-2/vitest-guardas.txt`).
- `pnpm typecheck` sin errores; lint en el hook de cada commit; `mapa.sh --check` exit 0.
- e2e dirigido `cola-web-tablero` en escritorio: 2 de 2. `configuracion-200` en los dos proyectos: 51 de 52 (la primera prueba se quedó en `/ingreso`
  con el servidor recién levantado); repetida sola, pasa.
- Sin base nueva: `db:reset` y `db:types` sin cambios en los tipos.
- e2e completo: no (8.04-2, Nivel 1: lo corre el CI del PR; dirigidos cola-web-tablero en escritorio y configuracion-200)
