## 2026-11-12 — FLUJO-8: la puerta de fase mira el último veredicto, y el camino de un PR a `main` se acorta

Medido el 2026-11-12 a las 13:25, a 28,7 h de lanzar (49 de 69 pasos; 10 pasos en las 5 h desde FLUJO-7). De los 23 PR integrados
ese día, de abierto a integrado: mediana 38 min, p75 77, máximo 309 (el 9.04, cuatro CI rojos). Simulado con `plan.mjs` › `siguiente`
y las duraciones del día, lo que queda termina en serie (8.14 → 9.12 y 9.13 → 9.14) y cada PR de ese tramo y cada puerta suman
entero al reloj: con 40 min por PR, ≈ 14 h; con 75, ≈ 17.

- **La puerta de fase con carriles mira el último veredicto del workflow `ci` en `main`** (`scripts/piloto/ci.sh` › `ci_veredicto`,
  `bucle.sh` › `puerta_de_fase`), no su última corrida. En `main` cada integración cancela la corrida anterior (42 de 79 del 11 al
  12-11; 35 verdes, 2 rojas), así que «la última» casi siempre corría o estaba cancelada, y `gh run list` mezclaba el workflow `demo`:
  el 6.14 esperó 24 min con `main` sano y pasó por una corrida de `demo` de 38 s, que no prueba nada. Ahora: una corrida terminada, ni
  cancelada ni saltada, dice cómo está `main`; verde, la puerta abre sin esperar a la que corre; roja, espera a la más nueva en curso
  si la hay. Se descartó quitar la puerta en los cierres (el cierre corre su Nivel 3 igual): «no cerrar una fase con el CI en rojo»
  sigue siendo la regla, y con el último veredicto se cumple sin esperar.
- **Un rojo de `main` se vuelve a correr una vez antes del `ci-fix`** (`gh run rerun --failed`, anotado en `.piloto/puertas/rerun-<id>`):
  los rojos de `main` de esos dos días con un job caído a la vista fueron del runner (apt el 11, Docker Hub «toomanyrequests» el 12) y
  un `ci-fix` es una sesión de opus en el carril del camino crítico. Mientras esa corrida corre otra vez sigue siendo la del rojo: no
  vale el verde de antes. Y el rojo de la base (`rojo-base`) no entraba en ningún caso de la puerta: terminaba en «no encuentra un CI
  completo» y, tras seis esperas, aparcaba el cierre; ahora va al `ci-fix` como cualquier rojo.
- **Un check con veredicto está terminado, diga lo que diga su `status`** (`scripts/coordinador/pr.mjs` › `estadoDe`). GitHub dejó
  «Cambios · ¿base y e2e?» del #181 (6.14, parte 1) en `IN_PROGRESS` con conclusión `SUCCESS` y hora de fin: con todos los jobs en
  verde el PR quedó «pendiente» más de una hora y nada lo iba a integrar hasta el push siguiente.
- **Sólo «Carriles» en rojo y con migraciones atrasadas: renumera el coordinador** (`pr.mjs` › `soloElOrden`). Es lo que dice esa
  guarda cuando el CI corre después de que otra migración entró a `main`; como era un «rojo firme», el PR volvía a su carril y
  esperaba a que terminara la sesión en curso para un remiendo sin sesión (el 9.04: 33 min, y otro CI). Si «Carriles» caía además por
  otra cosa, lo dice el CI del commit renumerado, en 30 s.
- **`pnpm test` corre en 3 jobs** (`.github/workflows/ci.yml` › `pruebas`, `vitest --shard`). En un solo job eran 14 de los 15 a 18 min
  del «Nivel 1» (962 archivos, 10 052 pruebas, 844 s): el job más largo de un PR con e2e dirigidos (los cierres y las partes: el e2e
  terminaba a los 5 min y la base a los 8) y la causa de que el veredicto de `main` llegara tarde. Son dos jobs más por corrida; el
  repo es público y el promedio medido es de ≈ 2,4 corridas a la vez. No se tocaron los bloques del e2e (18 a 22 min con el completo):
  cada bloque comparte una base entre sus specs, y repartirlos de otro modo a esta altura puede destapar dependencias de orden.
- **`limpiar-ramas` ya no escribe en el registro** «fatal: Not a valid commit name» en cada vuelta (84 líneas en una mañana): la punta
  de un PR que empujó el propio coordinador no está en el repo local, y `git` lo decía por stderr.
- **Medido y no cambiado:** el reintento a ciegas de un CI rojo (de 10 de ese día, 3 terminaron en verde: sigue valiendo lo que
  cuesta). Los rojos de e2e de la tarde fueron casi todos del propio paso: la paleta (7.13) y el widget del chat (7.11) suman un pedido
  del marco y caen las pruebas que cuentan pedidos (`cotizar-guardada-guardar`, `cotizaciones-listado-resumen`, `vehiculos-resumen`);
  la sesión de arreglo los resuelve en ≈ 5 min, lo caro es la vuelta de CI. Y un carril que choca consigo mismo (8.02, 8.03 y 8.04 en
  `configuracion/web`): encadenar la rama del paso nuevo sobre la del PR propio sin integrar pide cambiar cómo se cortan las ramas con
  el piloto en marcha; queda anotado.
