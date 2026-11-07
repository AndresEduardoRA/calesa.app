## 2026-11-07 — Pedido del carril persona (estabilizar-1): cinco e2e inestables

- **Hecho:** tres arreglos en `e2e/` (sólo pruebas, sin código de `src/`), dos commits. Cada prueba se reprodujo con `--repeat-each` en `escritorio`
  (y las tres que no caían solas, con la CPU del navegador frenada con `Emulation.setCPUThrottlingRate`, un parche temporal de `e2e/soporte/prueba.ts`
  que no se commitea). Salidas en `.piloto/salidas/pedido-1/` (`repro-1` a `repro-9`).
  - **4-99** `leads-recorrido-cierre-2.spec.ts:213`: causa medida. El botón «Salir de este lead» ya está en el HTML antes de hidratar y un clic de esa
    ventana se pierde: con 8 procesos que queman CPU cae **6 de 6** (`repro-3.log`), sin carga 0 de 16 (`repro-1`, `repro-2`). Ahora repite el clic hasta que
    abre, sin volver a pulsar si la URL ya pide el panel.
  - **4-97** `paneles-foco-al-volver-configuracion.spec.ts` (el `:148` de ahora es `:156`): causa medida en la traza de dos caídas con el navegador 8 veces más
    lento (`repro-6`, `repro-7`). El primer clic en «Editar» ya escribió `?panel=editar-tipo`, pero el modal tardó más del 1 s del `toPass`; cada reintento
    volvió a abrir el «⋯» y a pulsar «Editar» (4 veces) y sumó otra entrada igual al historial, así que «atrás» cayó en una entrada que todavía tenía el
    panel y el modal siguió abierto (la caída de «atrás»), o el reintento pulsó con el modal ya tapando el «⋯» y el clic esperó los 30 s. Ahora `hastaAbrir`
    no pulsa si la URL ya tiene `panel` y los clics tienen tope de 3 s. Es la regla que ya cumplía `abrirConN` de `soporte/alta.ts`.
  - **4-80** `leads-etiquetas.spec.ts:216`: escribe el nombre y pulsa Enter sin esperar que la opción esté resaltada. Ahora espera a que la etiqueta que ya
    existe sea la opción `aria-selected` y a que no haya «Crear «…»». **No se reprodujo** (0 de 8 escritorio, 0 de 8 movil, 0 de 6 con CPU cargada, 0 de 12 con
    el navegador 8×): el arreglo cierra la carrera que describe 4-80, sin caída medida antes.
  - **4-92** `leads-alta-casos.spec.ts:302` y **4-93** `vehiculos.spec.ts:106`: **no se dejaron reproducir y no se tocaron**. 4-92: 0 de 8 (escritorio), 0 de 8
    (movil), 0 de 6 y 0 de 12 con CPU cargada (20 procesos), 0 de 40 sin carga, 0 de 10 con el navegador 8× y 0 de 8 a 16×. 4-93: lo mismo, mas 0 de 40 sin carga.
    Sin traza de la caída (la de `e2e-fallos/2026-11-06_07-35/` ya no existe) no hay causa que arreglar; siguen abiertos con lo medido.
  - Verde final del código nuevo: `repro-8.log` (144 en verde, navegador 8×: 4-80, 4-97, 4-99) y `repro-9.log` (104 en verde a 16×, los cinco), y
    `movil-final.log` (24 en verde en movil). `scripts/guardas/sin-celular.test.ts` en verde. Antes del arreglo, 4-97 cayó 1 de 109 y 1 de 132 a 8×.
    e2e completo: no (pedido-1, sólo `e2e/`: lo dirigido en escritorio y movil)
- **Abiertos:** 4-92 y 4-93 siguen sin causa. Para quien consolida `docs/PLAN.md`: 4-80, 4-97 y 4-99 pasan a cerrados con lo de arriba; 4-92 y 4-93 anotan
  «0 de 100+ con carga y con el navegador frenado». El mismo patrón (`toPass` que repite un clic aunque la URL ya pide el panel) lo tiene
  `paneles-foco-al-volver-ficha.spec.ts:55` (`hastaAbrir`) y varios `abrir…` de `e2e/soporte/`; no se cambiaron.
