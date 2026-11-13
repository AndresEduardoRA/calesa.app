# 9.12-3 · Auditoría AA, parte 3 de 5: Configuración y `shared/ui` (2026-11-13)

- **D1 · 4-20 queda abierto, con su medida:** `--ancho-del-aviso` a 22 rem en escritorio (la recomendada del PLAN) arregla la descripción (≤ 6 líneas al 100 %, el foco
  no queda tapado), pero el aviso, que sale abajo a la izquierda desde el borde de la ventana, cubre 232 px del contenido al 200 % y **tapa texto de la última fila de
  una lista** (`configuracion-cotizacion-niveles-200`, `quePisaElAviso`: el assert de 4-15). No se baja ese assert: se revirtió todo y el aviso sigue en
  `calc(var(--sidebar) - 2rem)`. La salida es de la persona (aviso ancho con lista tapada, aviso angosto con descripción de 9 líneas, o un aviso que se aparta de lo
  que tapa). Si 4-20 se reabre, la columna que calcula `avisosAbajo()` en `avisos-sobre-el-pie.ts` tiene que cambiar con el ancho.
- **D2 · 4-102 ya estaba arreglado:** `TACTIL` (`min-h-11 md:min-h-9`) estaba en los dos botones; lo que medía 42 px era el diálogo escalándose al abrirse. Se agregó el
  assert esperando el diálogo quieto, no un cambio de clases.
- **D3 · 4-61 se guarda al llegar la URL, no al devolver `router.push`:** `escribir()` de `abrirConVuelta` guarda la ficha con la URL del momento en que resuelve,
  y `router.push` vuelve antes de que cambie. `alLlegarA(url)` espera, cuadro a cuadro y con el tope de la vuelta (3 s), a que `location` sea la de destino; si no llega,
  falla y el panel no toma la ficha.
- **D4 · 4-62: la ficha guardada ignora `panel`, `eliminar` y `pestana`:** la sonda mostró que `guardada.donde` era el hash de `?lead=<id>` y que, tras recargar con anotar
  abierto desde la pestaña, la URL era otra. Lo que cuenta sigue siendo la ruta y lo demás (`lead`, `alcance`…): dos fichas de dos leads no se confunden (prueba de
  unidad). Efecto aceptado: dos paneles de la misma clave en la misma pantalla comparten ficha guardada; la marca de la entrada anterior decide si el foco vuelve.
- **D5 · «Permiso» de la matriz de roles baja de 13 rem a 11 (`min-w-44`) y la tabla lleva `scroll-pl-44`:** con 13 rem, la columna fija se comía 416 de 686 px al
  200 % y una de rol (320 px) no cabía al lado; con 11 rem sí. Cuesta 2 rem de ancho a los nombres de permiso al 100 % (se parten antes, `whitespace-normal`). `<Table>`
  de `shared/ui` recibe `contenedor` para las clases del que se desplaza.
- **D6 · El separador de «Estado · Uso» va con espacio duro (` ·`) dentro del primer `span`:** no hay corte posible entre el estado y el «·»; el uso queda en su
  propio `span` y la línea se parte antes que él. Un lector de pantalla no lo lee (`aria-hidden`), como hasta ahora.
- **D7 · El anillo de foco se sube sin prueba nueva** (token, no conducta): `ring-ring` y `--ring` en `.dark` = `primario-ink`. El barrido de `accesibilidad.spec.ts`
  corre en verde con él. Se revierte volviendo a `ring-ring/50` y quitando la línea de `.dark`.
- **D8 · El R7 de Configuración va a la 9.12-5 y no se unen los dos `useTrasElEnvio`** (D1 y D2 del plan): rediseños de `Switch`, `Tabs` y `Checkbox` sin assert en
  la fila; 40 líneas sin prueba que lo pida.

## Auditoría AA (9.12): lo de esta parte

| Abierto             | Estado              | Dónde                                                                                                    |
| ------------------- | ------------------- | -------------------------------------------------------------------------------------------------------- |
| 4-19                | cerrado             | `lista-de-niveles.tsx`, `configuracion-cotizacion-niveles-200.spec.ts`                                   |
| 4-20                | **abierto** (D1)    | PLAN, con la medida                                                                                      |
| 4-61                | cerrado             | `vuelta-del-foco.ts`, `acciones-de-la-ficha.tsx`, `leads-menu-orden.spec.ts`                             |
| 4-62                | cerrado             | `vuelta-del-foco.ts`, `leads-rapido-seguimientos.spec.ts`                                                |
| 4-102               | cerrado (ya estaba) | `configuracion-cotizacion-tarjeta-descartar.spec.ts`                                                     |
| 5a-28               | cerrado             | `config-apibara.tsx`, `configuracion-200.spec.ts`                                                        |
| 5a-29, 5a-30        | cerrados            | `datos-del-origen.tsx`, `siguientes-pasos.tsx`, `configuracion-200.spec.ts`                              |
| 5a-33               | cerrado             | `tabla-de-roles.tsx`, `grupo-matriz.tsx`, `roles-conteo-acotado.spec.ts`                                 |
| Anillo de foco      | cerrado             | `shared/ui`, `globals.css`                                                                               |
| R7 de Configuración | → 9.12-5            | interruptores, pestañas, popovers de Roles, botón del marco, salto al contenido, casilla de `/vehiculos` |
