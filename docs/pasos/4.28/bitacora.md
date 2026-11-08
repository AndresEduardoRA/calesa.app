## 2026-11-08 — Paso 4.28: el cierre de la Fase 4

- **Hecho:** el recorrido de la IA con dos cuentas por la tarea de oro 2 entera (`e2e/cotizar-tarea-de-oro-recorrido.spec.ts`, con sus tramos en
  `e2e/soporte/cotizar-recorrido.ts`): desde `/cotizaciones`, sólo con el teclado, la asesora cotiza con un enlace de Copart (apibara simulado en la
  página) y la dueña con un vehículo del inventario, las dos hasta el PDF; la dueña abre después, desde el listado, la de la asesora. La tabla de criterios y
  el cierre en `docs/PLAN.md` › «Fase 4»; los abiertos reconciliados (cerrados, pulido a la Fase 9, «lo decide la persona», «sin fase»); 5a-33, pulido sin
  código; 5a-4b, medido por proyecto y a la persona. La consolidación de `docs/pasos/` de los carriles (4.22-1 a 4.22-7, 4.23-3, 4.26-1 a 4.26-3, y a mano
  las partes 4.25-1b y 4.25-2, que el script no pasaba: 4-104).
- **Un arreglo que salió del completo:** la caída de `equipo-busqueda-minima.spec.ts:98` en el celular (3 de 3 sola: inestable) mostró que el ingreso enviado
  antes de hidratar iba por GET con la contraseña en la URL. `method="post"` en los cuatro formularios de auth y su prueba en `acceso.spec.ts` (bloquea los
  chunks de JS); la prueba cae sin el arreglo (`["GET"]`) y pasa con él.
- **Verificación** (`.piloto/salidas/4.28/`): el recorrido, 3 ✓ en escritorio y 3 ✓ en celular (`recorrido-escritorio.txt`, `recorrido-movil.txt`): la
  asesora 56 teclas de control y KLM 56,7 s, la dueña 52 y 41,1 s (celular: 53 y 54,5 s, 49 y 37,5 s), robot ≤ 5,1 s; `acceso.spec.ts` 6 ✓ en escritorio y 3 ✓
  en celular (`acceso-*.txt`); la inestable sola, 5 ✓ tres veces (`busqueda-minima-movil-{1,2,3}.txt`). El Nivel 3 por proyecto, cada uno desde `db:reset` y
  `db:carreras`: escritorio sobre `d3852065`, 1.046 ✓, 16 saltadas, 0 caídas, 38,6 min (39,5 de reloj, `completo-escritorio.txt`); celular sobre `d3852065`,
  763 ✓, 21 saltadas, 2 sin correr, 1 caída, 29,9 min (30,9, `completo-movil.txt`); y otra vez el celular sobre `2bfef1ed` (el arreglo toca auth), 767 ✓, 21
  saltadas, 0 caídas, 29,9 min (`completo-movil-2.txt`). El escritorio no se repitió tras el arreglo: lo dirigido (`acceso.spec.ts`) y el CI del PR, que corre
  el completo porque toca auth.
  e2e completo: sí (4.28, cierre, Nivel 3: escritorio 1.046 en verde, 16 saltadas, 0 caídas, 38,6 min; movil 767 en verde, 21 saltadas, 0 caídas, 29,9 min)
- **Commits:** `d3852065` el recorrido de la tarea de oro 2 entera · `2bfef1ed` el ingreso por POST antes de hidratar · la consolidación de docs · el cierre.
