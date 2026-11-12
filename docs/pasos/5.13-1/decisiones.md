# Paso 5.13-1 — El cierre de la Fase 5 (parte 1 de 2): el recorrido y el Nivel 3

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/5.13-1.md`.

- **D1** El 5.13 se parte en 5.13-1 (el recorrido y el Nivel 3) y 5.13-2 (los docs de cierre: tabla de criterios, «Partición» marcada, DECISIONES de la
  fase, fichas, abiertos para la Fase 6 y pulido). El Nivel 3 solo son ≈ 70 min de reloj y la lectura de los 20 docs de paso de la Fase 5 no cabe con margen
  en la misma sesión.
- **D2** Los docs de esta parte van en `docs/pasos/5.13-1/` (no en `5.13/`), como 5.12-1 y 5.12-2: cada parte se consolida una vez.
- **D3** La regla «Esperas» del flujo de repuestos de la semilla se enciende por SQL en `beforeAll` y se devuelve como estaba en `afterAll`: es el flujo de
  la semilla, no el que arma la dueña. El flujo que arma la dueña no lleva nada de SQL.
- **D4** El vehículo nace por la pantalla de alta y se mueve y se previsualiza por SQL **como la dueña** (sus claims y `set local role authenticated`,
  `e2e/soporte/flujos-recorrido.ts` › `comoPersona`), no como `postgres`: pasa por el mismo permiso que usará la pantalla de mover de la Fase 6.
- **D5** Un solo vehículo: el contraste es la misma previsualización antes (`ok`) y después de jubilar («La fase destino está jubilada.», comparado como
  elemento de `motivos`); la insignia de `/vehiculos` y la ficha la nombran porque la unidad sigue en esa fase. El diálogo de jubilar lo dice: «1 unidad
  sigue en ella y deja de ser destino».
- **D6** «Los abiertos de la sección C» de la fila 5.13 no tienen una sección C en la Fase 5: el 5.13-2 los toma como los huecos que la Fase 5 deja a la 6 y
  los escribe como `6-x` en «Riesgos y huecos» de la Fase 6.
- **D7** El completo se corre por proyecto, cada uno desde su `db:reset` (lo hace `pnpm test:e2e:completo`), como en el 4.28: da los minutos por proyecto
  que pide el 5a-4b.
- **D8** Una caída del completo que pasa 3 de 3 sola es inestable y se anota sin arreglar (`.claude/rules/e2e.md` › «Inestables»); una que cae siempre es un
  rojo real y se arregla en el paso con su propio `fix` (no se cierra una fase con rojos).
