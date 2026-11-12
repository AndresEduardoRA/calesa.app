## 5.13-1 · El cierre de la Fase 5: el recorrido y el Nivel 3 (2026-11-12)

Parte 1 de 2 (`parcial: true`): queda el **5.13-2**, los docs de cierre (tabla de criterios, «Partición» marcada, DECISIONES de la fase, fichas de `flujos`
y `logistica`, abiertos para la Fase 6 y pulido), que es el que cierra la fase.

- **Hecho:** `e2e/configuracion-flujos-recorrido.spec.ts` (escritorio; Configuración sin celular), tres pruebas en serie con los ayudantes en
  `e2e/soporte/flujos-recorrido.ts`. La dueña crea el origen «E2E 5.13 Recorrido» por pantalla y «Siguientes pasos» la lleva a su flujo, que nace con 0
  fases; arma Compra (inicial), Puerto, Tránsito, Llegada y Entrega (final) con «Nueva fase» y sus salidas desde el inspector, con Llegada sin salida a
  propósito. Pide un dato (VIN) y un documento (1 a 3, PDF) en Tránsito y una espera de Llegada a la primera fase de repuestos; desde el flujo de repuestos
  agrega la espera inversa. «Revisar» marca «no tiene salida» y «Esperas cruzadas» en Llegada; el aviso abre su inspector, ahí se le agrega la salida y el
  aviso se va; al quitar la espera inversa se va el otro. Un vehículo nuevo nace en Compra (alta por pantalla), `previsualizar_cambio_fase` a Puerto da
  `ok`, `cambiar_fase` lo mueve (por SQL **como la dueña**, con sus claims: mover no tiene pantalla hasta la Fase 6); al jubilar Puerto por pantalla (el
  diálogo dice «1 unidad sigue en ella y deja de ser destino») la previsualización responde `ok = false` con «La fase destino está jubilada.», y la fila de
  `/vehiculos` y la ficha siguen diciendo Puerto. Sólo va por SQL, fuera de mover, encender la regla «Esperas» del flujo de repuestos de la semilla y
  devolverla como estaba.
- **Dos rojos reales del completo, arreglados:** (1) `e2e/soporte/base.ts` › `borrarPersonasDePrueba` ordenaba `created_at` como texto; una dueña que
  nace justo en el segundo («…:23Z», sin fracción) pasaba por más nueva que otra cuenta del mismo segundo («…:23.078619Z»: «.» va antes que «Z»), se la
  borraba primero, el guardián del equipo lo frenaba (23514) y todo `beforeAll` siguiente caía: 105 caídas y 306 sin correr en el primer completo de
  celular. Ahora compara con `Date.parse`; sobre la base trabada, `equipo-200` en celular limpió todo. (2) `e2e/vehiculos-resumen-casos.spec.ts` › «sin red al
  abrir el resumen…» caía 2 de 3: la suscripción de la campana del marco (7.02) se pide al descansar y, si la prueba corta la red antes, el encabezado también
  dice «Sin conexión. No se pudo abrir esto.»; el aviso y «Reintentar» se buscan ahora en `#contenido` (3 de 3 en escritorio y 1 en celular).
- **Inestable, sin arreglar:** `e2e/configuracion-flujos-requisitos.spec.ts` › «la dueña agrega dos datos, sube uno y quita el otro» (lee el orden del DOM con
  `allInnerTexts` justo después de que la base ya cambió); sola pasó 3 de 3.
- **Para el 5.13-2 (abierto de la Fase 7):** la suscripción de la campana usa `diferido()` con el aviso `aqui`; si se pide sin red, deja «Sin conexión…» con
  «Reintentar» en el encabezado y el contador no se suscribe hasta que la persona reintenta o recarga.
- **Verificación** (`.piloto/salidas/5.13/`): el recorrido dos veces seguidas en verde en escritorio, 3 de 3 cada vez (`dirigido-6.txt`, `dirigido-7.txt`);
  guardas 35 archivos y 1.093 pruebas (`guardas.txt`). El Nivel 3 por proyecto, cada uno desde su `db:reset` y `db:carreras` («Todas las carreras en verde»,
  22,1 s y 17,2 s): **escritorio** sobre `649e6a8b`, 1.107 ✓, 16 saltadas, 2 caídas (las de arriba), 4 sin correr (el resto del spec serial de requisitos,
  que en el triaje pasó entero), 43,5 min (44,6 de reloj; `completo-escritorio.log`, triaje en `triaje-escritorio-{1,2,3}.txt`); **celular** sobre `83c0dada`,
  397 ✓ y 105 caídas por la cascada (`completo-movil-1.log`), y otra vez sobre `6df82b05` (con el arreglo del borrado), 791 ✓, 27 saltadas, 0 caídas, 31,0 min
  (32,0 de reloj; `completo-movil-2.log`). El escritorio no se repitió tras los dos arreglos (sólo tocan `e2e/`, ningún disparador del Nivel 2): lo dirigido y
  el CI del PR. Para el 5a-4b: 76,6 min de reloj los dos proyectos (escritorio 44,6, celular 32,0). `db:probar` en verde (1.168 ✓, `db-probar.txt`); `db:lint`
  sin errores, 48 avisos y 69 «extra» cosméticos en 29 funciones (`db-lint.txt`); `mapa.sh --check` en verde.
  e2e completo: sí (5.13-1, cierre, Nivel 3: escritorio 1.107 en verde, 16 saltadas, 2 caídas arregladas o inestables, 43,5 min; movil 791 en verde, 27 saltadas, 0 caídas, 31,0 min)
- **Commits:** `649e6a8b` el recorrido · `83c0dada` el aviso sin conexión del resumen acotado al contenido · `6df82b05` las cuentas de prueba por fecha al
  borrarlas · la consolidación de docs · esta parte.
