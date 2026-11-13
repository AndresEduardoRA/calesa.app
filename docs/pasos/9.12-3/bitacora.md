## Paso 9.12-3 · Auditoría AA, parte 3 de 5: Configuración y `shared/ui` (2026-11-13)

- **4-102, los botones de `<Confirmar>`** (`9f73afa2`): el arreglo (`min-h-11 md:min-h-9`) ya estaba en `confirmar.tsx`; los «42 px» eran la animación de
  apertura del diálogo (escala ≈ 0,96 de 44 px: 42,3 medidos a mitad de camino; el alto calculado era 44). E9 de
  `configuracion-cotizacion-tarjeta-descartar.spec.ts` espera el diálogo quieto (`quieto()`) y exige 44 px a «Cancelar» y «Descartar borrador» en el celular.
- **4-61 y 4-62, el foco tras recargar y «atrás»** (`292f8d4c`): anotar y agendar del «⋯» de la ficha llegan por `router.push`; ahora abren con
  `abrirConVuelta` y `alLlegarA(url)` (nuevo, en `vuelta-del-foco.ts`) cumple cuando la URL ya es la del panel, que es cuando la ficha puede guardarse con
  ella. Y la ficha guardada compara la URL sin `panel`, `eliminar` ni `pestana` (la sonda mostró que la de `lead` se guardaba con `?lead=` y tras recargar
  en `&pestana=seguimientos&panel=anotar-seguimiento` ya no coincidía). Asserts: `leads-menu-orden.spec.ts` (con y sin recargar, «⋯» enfocado) y
  `leads-rapido-seguimientos.spec.ts` (el segundo «atrás» devuelve el foco al nombre de la fila); dos casos en `vuelta-del-foco.guardada.test.ts` (se toma si
  sólo cambian esas claves, no si cambia el lead). Ficha de `shared` al día.
- **5a-29 y 5a-30, la ficha de un origen al 200 %** (`489066a8`): la clave interna lleva `min-w-0 break-all` (con una clave de 28 caracteres llegaba a 400 de 380,5 en
  412 px); el texto de un paso pide `min-w-[min(12rem,100%)]` y «Abrir» pasa debajo si no cabe. Un caso nuevo en `configuracion-200.spec.ts`.
- **5a-28, 5a-33 y 4-19** (`fb2f711b`): el `fieldset` de apibara con `grid-cols-[minmax(0,1fr)]` y el botón que parte su texto (`min-h-[44px]`, `h-auto`,
  `whitespace-normal`), con el assert en `configuracion-200.spec.ts` (nada del formulario pasa del relleno del cuerpo de su tarjeta; antes, 380 de 347).
  Roles: «Permiso» pasa de `min-w-52` a `min-w-44` y la tabla lleva `scroll-pl-44` (`<Table contenedor>`, prop nueva de `shared/ui/table.tsx`): con 13 rem la
  columna fija dejaba 270 px y la de un rol mide 320, así que ningún desplazamiento la dejaba entera; el assert de `roles-conteo-acotado.spec.ts` exige que el
  conteo de «más de 1.000 personas» y de «3 personas» empiece a la derecha de «Permiso» (antes 744 contra 961). Niveles: el «·» va pegado al estado con espacio
  duro; `lineasQueEmpiezanPorSeparador()` en `e2e/soporte/niveles-a-la-vista.ts` y su assert (cayó en el celular con 4 filas).
- **El anillo de foco** (`55feadc8`): `ring-ring/50` pasa a `ring-ring` en `shared/ui` y los dos editores, y `.dark` pone `--ring` en `primario-ink`.
  Sin prueba nueva (D7 del plan); lo cubre el barrido de `accesibilidad.spec.ts` (en verde en los dos proyectos).
- **4-20 queda abierto** (D1): `--ancho-del-aviso` a 22 rem pasa `avisos-con-descripcion` (≤ 6 líneas, 22 rem, foco no tapado; hubo que seguir con la columna
  de `avisos-sobre-el-pie.ts`) pero **tapa texto de la última fila de una lista** al 200 % en escritorio (`configuracion-cotizacion-niveles-200`, `quePisaElAviso`:
  el assert de 4-15). Se revirtió todo (13,5 rem, sin cambio) y el abierto sigue: elegir entre ancho de aviso y alto de lista es de la persona.
- **No entra, a la 9.12-5:** el R7 de Configuración (interruptores, pestañas, popovers de Roles, botón del marco, salto al contenido, casilla de `/vehiculos`).
- **Pruebas:** vitest related de lo tocado, 562 ✓ (vuelta del foco) y 107 ✓ (componentes); `scripts/guardas` 39 archivos, 1.154 ✓ (`.piloto/salidas/9.12-3/guardas.txt`);
  typecheck limpio; `mapa.sh --check` 0. e2e en `escritorio` y `movil` (`.piloto/salidas/9.12-3/`): C2 6 ✓, C3 y C4 67 ✓ + 30 ✓, C5–C6 54 ✓ + 14 ✓, C7–C9 67 ✓,
  anillo 35 ✓.
- **Partición (parte 3 de 5, `parcial: true`):** siguen 9.12-4 (esqueletos y transiciones) y 9.12-5 (fases 5 a 9 y cierre, más el R7 y 4-20).
- **Cómo se anota en `docs/PLAN.md`:** `9.12-3 ✓`; se cierran **4-19**, **4-61**, **4-62**, **4-102**, **5a-28**, **5a-29**, **5a-30** y **5a-33**. **4-20 NO se
  cierra**: queda con su medida (22 rem tapa texto de una lista al 200 %).
- e2e completo: no (9.12-3, Nivel 2: lo prueba el CI del PR; dirigidos: configuracion-cotizacion-tarjeta-descartar, leads-menu-orden, leads-rapido-seguimientos,
  leads-ficha-extras, leads-acciones-de-fila, leads-confirmar-por-url, leads-recordatorios-modal, leads-seguimientos, leads-seguimientos-modal, configuracion-200,
  interruptor-200, roles-conteo-acotado, roles-niveles, equipo, equipo-200, origenes, configuracion-flujos, configuracion-flujos-recorrido,
  configuracion-cotizacion-niveles-200, configuracion-cotizacion-niveles, accesibilidad y leads-alta, en escritorio y movil)
