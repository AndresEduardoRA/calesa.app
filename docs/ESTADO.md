# Estado

> La fuente de verdad de «en qué vamos». **60 líneas como máximo**: lo que deja de ser actual se mueve a `docs/BITACORA.md`. Qué existe
> en el código lo dice `docs/MAPA.md`; los abiertos con su paso, `docs/PLAN.md`. Las versiones anteriores: `git log -p docs/ESTADO.md`.

**Última actualización:** 2026-11-12
**Fase actual:** **Fases 7 a 9, partidas y abiertas a la vez** (sus pasos en `docs/plan.yaml`; sus filas, en `docs/PLAN.md`). La Fase 4 cerró el
2026-11-08 con el 4.28, la **Fase 5** el 2026-11-12 con el 5.13 y la **Fase 6** el 2026-11-12 con el 6.14. Cuánto va: `coordinador.mjs tablero`.

## Cómo se trabaja

- **Tres carriles en paralelo** (`docs/ORCA.md`): A, el núcleo y los cierres; B y C, las áreas y módulos que les da `plan.yaml` (`dueno_de`). Cada uno
  con su bucle (`docs/PILOTO.md`), un servicio `systemd --user` con vigía y un PR por paso o parte. Las cinco fases corren a la vez: un paso
  empieza cuando sus dependencias están en `main` (`docs/PLAN.md` › «Carriles de las fases 5 a 9»).
- **El coordinador** asigna, integra con el CI en verde y devuelve lo rojo. Un carril sin paso propio listo toma prestado uno de otro; lo que
  necesita del núcleo lo hace en su PR; los choques de `docs/` y de lo generado con main se resuelven solos y los de código, la sesión.
- **De corrido, sin compuertas** (`docs/PILOTO.md` › «De corrido»): toda compuerta se contesta sola con la recomendada; un paso que no cierra se
  **aparca** y el carril sigue con otro (`node scripts/coordinador/coordinador.mjs tablero`); el límite de uso y la red caída se esperan.

## Funcionando

- **Fases 0 a 5** enteras: equipo, empresa, orígenes, vehículos, leads, cotizaciones (la fórmula con versiones, la hoja, lo guardado, el PDF) y la
  configuración de los flujos por RPC. Detalle: `docs/BITACORA.md`; tablas de criterios: `docs/PLAN.md` › «Fase 4» y «Fase 5».
- **Fase 6** entera: `/logistica` con la cadena por fase (demora, filtros en la URL, «dónde está»), el panel con «qué falta», mover con nota y conflicto
  con nombre, el lote con vista previa y resultado parcial; documentos, transporte y embarques, aduana, gastos, pagos y margen; la bandeja de logística en
  Inicio y las alertas por cron. Tabla: `docs/PLAN.md` › «Fase 6».
- **Tareas de oro 2 y 3**, con dos cuentas: cotizar del listado al PDF sólo con el teclado (`e2e/cotizar-tarea-de-oro-recorrido.spec.ts`: la asesora 56
  teclas y KLM 56,7 s; la dueña 52 y 41,1 s) y mover (`e2e/logistica-tarea-de-oro.spec.ts`, los dos proyectos: mover 1, KLM 11,3 s de 15; el contenedor
  de 8 con la vista previa, KLM 14,6 s de 60).
- **Verdes:** lint, typecheck, test, `db:probar`, `db:lint`, `db:carreras` y `mapa.sh`. **Último e2e completo: el del 6.14-2 (Nivel 3)**:
  escritorio 1.191 en verde, 16 saltadas, 0 caídas, 49,1 min; celular 834 en verde, 27 saltadas, 0 caídas, 38,1 min (los dos sobre `225b1c99`). CI: `nivel-1` siempre, `carriles` en cada PR, `base`
  si cambia código, e2e dirigidos; el completo de escritorio cada noche.
- **Presupuestos al borde:** la hoja, 491 nodos de 500; JS de `/cotizaciones/nuevo` 439,5 de 460 KB (medido en el 4.19-4). Con la regla del 5 %, se sube el tope.

## Siguiente

- **En marcha** (lanzado el 2026-11-11): lo integrado, lo abierto y lo aparcado están en el tablero, no aquí. Parar:
  `bash scripts/maquina/lanzar.sh --parar`. El coordinador integra todo lo que está en verde, también guardas y ramas `fix/`.
- **Queda para la persona:** producción (variables, secretos, `db push`) y un paso aparcado (`coordinador.mjs reanudar <paso>`).
- **Para la persona**, con números: **5a-4b**: la suite completa con los dos proyectos tarda 90,3 min de reloj (escritorio 51,1; celular
  39,2; 6.14-2), lejos de los 25 min del assert; decidir si vale la segunda pila local o seguir con los shards del CI. Abiertos que decide
  (`docs/PLAN.md` › «Abiertos de la Fase 4» › «Los decide la persona»): 4-39, 4-43, 4-46, 4-52, 4-54, 4-56, 4-64, 4-66, 4-67, 4-71, 4-72,
  4-79, 4-88, 4-94, 4-95, 4-103, 5a-39, 5a-40, 5a-42 y 5a-43; de la Fase 6 (`docs/PLAN.md` › «Fase 6» › «Los decide la persona»), 6-2 y 6-4 a 6-7.
- **Para mover al archivo:** la «Partición» de las fases 4, 5 y 6 y los «Cerrados en la Fase 4» siguen en `docs/PLAN.md` (esta sesión no lee
  `docs/archivo/`) hasta que una sesión con permiso los pase a `docs/archivo/PLAN.md`.

## Pendientes que se arrastran

- **Ficha del lead:** «Datos» 39,2 de 43 KB y «Oportunidades» 61,2 de 66. **Portal:** su texto por empresa; `api/portal/*` en la Fase 8. **Lead sin
  dueño** tras una baja: lo rescata la supervisión (`p_dueno_esperado` nulo). **Fase 6:** 6-2 y 6-4 a 6-7 (los
  decide la persona). **Fases 7 a 9:** notificar al compartir, transferir y limpiar; «Escribirle por chat»; `recordatorios_notificar()` sin cron; 7-2; 9-13.
- **Pulido para la Fase 9** (`docs/PLAN.md` › «Fase 9»): lo que salió en las fases 4 y 5, con 5a-33 (el conteo del rol tapado al 200 % en Roles).

## Deuda aceptada

- `registrar_actividad()` y `storage_refcount()` con `execute` para `authenticated`; `cambiar_fase` acepta `p_fase_esperada` nulo; `limpieza_el`
  corre con los derechos de la base; despublicar no revoca la URL de una foto; «Ver como» acota la interfaz, no las filas.
- `storage-gc` y `apibara` (Deno) fuera de lint y typecheck; falta probar fotos en iPhone. `db:lint`: 48 avisos cosméticos (`_formula_*`, `_atributos_*` y otras). Permisos sin enforcement en la base (motivo en `supabase/tests/permisos-enforcement.sql`):
  `datos.exportar.todo`. Sin interfaz: `demora_dias_default`, `lead_dormido_meses`, el logo oscuro, `push_web`.
