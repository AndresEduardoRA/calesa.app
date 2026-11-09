# Estado

> La fuente de verdad de «en qué vamos». **60 líneas como máximo**: lo que deja de ser actual se mueve a `docs/BITACORA.md`. Qué existe
> en el código lo dice `docs/MAPA.md`; los abiertos con su paso, `docs/PLAN.md`. Las versiones anteriores: `git log -p docs/ESTADO.md`.

**Última actualización:** 2026-11-09
**Fase actual:** **Fases 5 a 9, partidas y abiertas a la vez** (69 pasos en `docs/plan.yaml`; sus filas, en `docs/PLAN.md`). La Fase 4
cerró el 2026-11-08 con el 4.28. Los carriles están en `PARAR` hasta la orden de la persona: `bash scripts/maquina/lanzar.sh --ya`.

## Cómo se trabaja

- **Tres carriles en paralelo** (`docs/ORCA.md`): A, el núcleo y los cierres; B y C, las áreas y módulos que les da `plan.yaml` (`dueno_de`). Cada uno
  con su bucle (`docs/PILOTO.md`), un servicio `systemd --user` con vigía y un PR por paso o parte. Las cinco fases corren a la vez: un paso
  empieza cuando sus dependencias están en `main` (`docs/PLAN.md` › «Carriles de las fases 5 a 9»).
- **El coordinador** asigna, integra con el CI en verde y devuelve lo rojo. Un carril sin paso propio listo toma prestado uno de otro; lo que
  necesita del núcleo lo hace en su PR; los choques de `docs/` y de lo generado con main se resuelven solos y los de código, la sesión.
- **Pruebas sólo en lo clave** (`.claude/rules/e2e.md`): dinero, fórmula, permisos, RLS, carreras donde hay candados y un e2e por pantalla.
- **De corrido, sin compuertas** (`docs/PILOTO.md` › «De corrido»): toda compuerta se contesta sola con la recomendada; un paso que no cierra se
  **aparca** y el carril sigue con otro (`node scripts/coordinador/coordinador.mjs tablero`); el límite de uso y la red caída se esperan.

## Funcionando

- **Fases 0 a 3** (equipo, empresa, orígenes, vehículos y leads) y **Fase 4** entera: la fórmula con versiones, publicar, historial, revertir y el
  ⚙; el editor de la fórmula como el Excel, el del diseño y el de la plantilla; las tablas de referencia con versión; la hoja de cotizar con sus
  paneles de vehículo (enlace de subasta, inventario) y de cliente; la guardada con revisiones y «Cotizar encima»; el listado; la tarjeta, el PDF y
  «Copiar texto»; la papelera propia; marcar final; comprobantes sin huecos; comentarios, adjuntos, favoritos, reportes y moderar; los ajustes
  de vigencia y vehículo obligatorio. Detalle: `docs/BITACORA.md`; la tabla de criterios, `docs/PLAN.md` › «Fase 4» › «Tabla de criterios».
- **La tarea de oro 2 entera** (del listado al PDF, sólo con el teclado; `e2e/cotizar-tarea-de-oro-recorrido.spec.ts`): la asesora con un enlace
  de Copart, 56 teclas y KLM 56,7 s; la dueña con un vehículo del inventario, 52 teclas y KLM 41,1 s (escritorio; en el celular, 3 teclas menos).
- **Verdes:** lint, typecheck, test, `db:probar`, `db:lint`, `db:carreras` y `mapa.sh`. **Último e2e completo: el del 4.28 (Nivel 3)**:
  escritorio 1.046 en verde, 16 saltadas, 0 caídas, 38,6 min; celular, sobre el arreglo del ingreso, 767 en verde, 21 saltadas, 0 caídas, 29,9 min. CI: `nivel-1` siempre, `carriles` en cada PR, `base`
  si cambia código, e2e dirigidos; el completo de escritorio cada noche.
- **Presupuestos al borde:** la hoja, 491 nodos de 500; JS de `/cotizaciones/nuevo` 439,5 de 460 KB (medido en el 4.19-4). Con la regla del 5 %, se sube el tope.

## Siguiente

- **Lanzar** (la persona da la orden): `bash scripts/maquina/lanzar.sh` revisa; `--ya` arranca los tres carriles. Los primeros pasos, sin
  dependencias: 5.01, 5.02, 5.03, 6.10, 6.13, 7.01, 7.05, 7.06, 7.12, 8.01, 8.06, 9.01, 9.02, 9.03, 9.05 y 9.07.
- **Queda para la persona:** integrar un PR que toca las guardas del piloto o `.github/workflows/` (el coordinador no lo integra solo);
  producción; un paso aparcado sin reintentos.
- **Para la persona**, con números: **5a-4b**: la suite completa con los dos proyectos tarda 70,4 min de reloj (escritorio 39,5; celular
  30,9), lejos de los 25 min del assert; decidir si vale la segunda pila local o seguir con los shards del CI. Abiertos que decide
  (`docs/PLAN.md` › «Abiertos de la Fase 4» › «Los decide la persona»): 4-39, 4-43, 4-46, 4-52, 4-54, 4-56, 4-64, 4-66, 4-67, 4-71, 4-72,
  4-79, 4-88, 4-94, 4-95, 4-103, 5a-39, 5a-40, 5a-42 y 5a-43.
- **Para mover al archivo:** el 4.28 no pudo pasar a `docs/archivo/PLAN.md` la «Partición» y los «Cerrados en la Fase 4» (esta sesión no lee el
  archivo); siguen en `docs/PLAN.md` hasta que una sesión con permiso lo haga.

## Pendientes que se arrastran

- **Ficha del lead:** «Datos» 39,2 de 43 KB y «Oportunidades» 61,2 de 66. **Portal:** su texto por empresa; `api/portal/*` en la Fase 8. **Lead sin
  dueño** tras una baja: lo rescata la supervisión (`p_dueno_esperado` nulo). **Fase 6:** publicar sin mover la versión de la ficha; la papelera manual
  no mira `documentos`. **Fases 7 a 9:** notificar al compartir, transferir y limpiar; «Escribirle por chat»; `recordatorios_notificar()` sin cron.
- **Pulido para la Fase 9** (`docs/PLAN.md` › «Fase 9»): lo que salió en la Fase 4, con 5a-33 (el conteo del rol tapado al 200 % en Roles).

## Deuda aceptada

- `registrar_actividad()` y `storage_refcount()` con `execute` para `authenticated`; `cambiar_fase` acepta `p_fase_esperada` nulo; `limpieza_el`
  corre con los derechos de la base; despublicar no revoca la URL de una foto; «Ver como» acota la interfaz, no las filas.
- `storage-gc` y `apibara` (Deno) fuera de lint y typecheck; falta probar fotos en iPhone. `db:lint`: 47 avisos cosméticos en `_formula_*`. Permisos sin enforcement en la base (motivo en `supabase/tests/permisos-enforcement.sql`): `tablero.metricas.ver`, `datos.exportar.todo`,
  `notificaciones.push`, `logistica.pagos.confirmar`. Sin interfaz: `demora_dias_default`, `lead_dormido_meses`, el logo oscuro, `push_web`.
