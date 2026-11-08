# Estado

> La fuente de verdad de «en qué vamos». **60 líneas como máximo**: lo que deja de ser actual se mueve a `docs/BITACORA.md`. Qué existe
> en el código lo dice `docs/MAPA.md`; los abiertos con su paso, `docs/PLAN.md`. Las versiones anteriores: `git log -p docs/ESTADO.md`.

**Última actualización:** 2026-11-08
**Fase actual:** **Fase 4 — Cotizaciones, cerrada el 2026-11-08** con el 4.28 (22 de 22 pasos del plan de carriles, `docs/plan.yaml`). La
Fase 5 la parte la persona en `docs/plan.yaml`; hasta entonces los carriles no tienen paso que tomar.

## Cómo se trabaja

- **Tres carriles en paralelo** (`docs/ORCA.md`): A, el núcleo y los cierres; B y C, los dominios que les da `plan.yaml` (`dueno_de`). Cada uno con
  su bucle (`docs/PILOTO.md`), un servicio `systemd --user` con vigía y un PR por paso o parte.
- **El coordinador** asigna, integra con el CI en verde (también los rojos) y devuelve lo rojo. Un carril sin paso propio listo toma prestado uno de
  otro; lo que necesita del núcleo lo hace en su PR; los choques de `docs/` con main se unen solos y los de código los resuelve la sesión.
- **Pruebas sólo en lo clave** (`.claude/rules/e2e.md`): dinero, fórmula, permisos, RLS, carreras donde hay candados y un e2e por pantalla. El
  auditor, una ronda y sólo en datos o dinero; hasta 6 commits de código por parte.
- **Compuertas:** producto, datos, guardas y el primer atasco se contestan solas con la recomendada (`.piloto/decisiones-automaticas.md`); a la
  persona van el tope de gasto, un paso que falla, el segundo atasco, `afuera` y `dependencia`.

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

- **La persona parte la Fase 5** (Flujos, configuración) en `docs/plan.yaml`: pasos, `dueno_de` por carril, riesgo y ruteo. Fases 5 a 9 en
  `docs/PLAN.md`.
- **Para la persona**, con números: **5a-4b**: la suite completa con los dos proyectos tarda 70,4 min de reloj (escritorio 39,5; celular
  30,9), lejos de los 25 min del assert; decidir si vale la segunda pila local o seguir con los shards del CI. Abiertos que decide
  (`docs/PLAN.md` › «Abiertos de la Fase 4» › «Los decide la persona»): 4-39, 4-43, 4-46, 4-52, 4-54, 4-56, 4-64, 4-66, 4-67, 4-71, 4-72,
  4-79, 4-88, 4-94, 4-95, 4-103, 5a-39, 5a-40, 5a-42 y 5a-43. La credencial sin escritorio (`gh auth login --insecure-storage`, `gh auth
setup-git` y el remoto por HTTPS); `decidir.sh --prueba-tandas`.
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
