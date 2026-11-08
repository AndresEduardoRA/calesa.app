## 2026-11-08 — Paso 4.28: el cierre de la Fase 4

- **El Nivel 3 en dos invocaciones, una por proyecto** (`pnpm test:e2e:completo --project=escritorio` y luego `--project=movil`, cada una desde `db:reset` y
  `db:carreras`), para que 5a-4b tenga el tiempo de cada proyecto: escritorio 38,6 min de Playwright (39,5 de reloj) con 1.062 pruebas; celular 29,9 (30,9)
  con 787. Los dos, 68,5 min (70,4 de reloj), lejos de los 25 del assert de 5a-4b, que sigue abierto y pasa a «lo decide la persona» con estos números: con una
  sola pila local la suite crece con cada paso (1.065 pruebas y 40,1 min el 2026-10-22; 1.849 hoy). La salida en CI siguen siendo los shards (CI-1).
- **La tarea de oro 2 entera, con dos cuentas** (`e2e/cotizar-tarea-de-oro-recorrido.spec.ts`): arranca en `/cotizaciones` del origen, no en la hoja con el lead
  en la URL. La dueña (R2) también tiene que cumplir los 90 s aunque vea los ⚙ y «costos»: la meta es de quien cotiza, configure o no. Las teclas de control son
  por proyecto (`Record`): en el celular el listado tiene 3 paradas menos antes de «Nueva cotización». Marcar final, comprobantes y comentarios quedan fuera del
  recorrido: tienen su e2e en sus pasos.
- **5a-33 queda pulido de la Fase 9, sin código**, aunque la fila del 4.28 lo nombre: la regla del 2026-10-30 (`docs/PLAN.md` › «Pulido para la Fase 9») dice que
  ningún paso lo recoge. El bloque de pulido pasa de la Fase 4 a la sección de la Fase 9, con el mismo título.
- **Los abiertos de la Fase 4, reconciliados** contra la BITACORA consolidada: los que su paso cerró (4-5, 4-6, 4-8, 4-17, 4-30, 4-68, 4-69, 4-70, 4-84,
  4-89, 4-91 y 5b-7) y las inestables (4-80, 4-92, 4-93, 4-99 y 4-100; regla del 2026-11-08) van a «Cerrados en la Fase 4»; los demás, a «Los decide la
  persona» o «Sin fase, con su disparador». **4-47 no se cierra**: el 4.23-3 cumplió la mitad del editor y el enlace desde la ayuda y el rótulo sin viva quedan.
- **No se movió nada a `docs/archivo/PLAN.md`**: esta sesión no puede leer el archivo (`Read(docs/archivo/**)` en `.claude/settings.json`) y no se escribe a
  ciegas en un doc que no se ve. La «Partición» y los cerrados quedan en `docs/PLAN.md` hasta que una sesión con permiso los pase.
- **Un defecto que destapó una inestable se arregla en el paso:** la caída de `equipo-busqueda-minima.spec.ts:98` en el celular (pasó 3 de 3 sola) mostró
  que el ingreso enviado antes de hidratar iba por GET, con la contraseña en la URL. No es pulido (es un dato que se filtra): `method="post"` en los cuatro
  formularios de auth (con `onSubmit` + `preventDefault` hidratado no cambia nada) y una prueba en `acceso.spec.ts` que bloquea los chunks de JS (sin
  JavaScript el streaming ni dibuja el formulario). La inestable en sí no se estabiliza.
- **La consolidación de `docs/pasos/` pierde partes:** `consolidar-docs.mjs` marca un paso entero con `<!-- paso:<id> -->` la primera vez, y las partes que su
  carpeta suma después (4.25-1b y 4.25-2) ya no pasan. Se copiaron a mano: en BITACORA al final (por el orden de fechas que exige `mapa.sh`), en DECISIONES tras el bloque del 4.25. El script queda como está (abierto 4-104).
