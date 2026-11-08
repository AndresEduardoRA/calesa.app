# Estado

> La fuente de verdad de «en qué vamos». **60 líneas como máximo**: lo que deja de ser actual se mueve a `docs/BITACORA.md`. Qué existe
> en el código lo dice `docs/MAPA.md`; los abiertos con su paso, `docs/PLAN.md`. Las versiones anteriores: `git log -p docs/ESTADO.md`.

**Última actualización:** 2026-11-08
**Fase actual:** 4 — Cotizaciones (abierta el 2026-10-22). **12 de 22 pasos del plan de carriles integrados** (`docs/plan.yaml`; el tablero vivo,
`node scripts/coordinador/coordinador.mjs tablero`). Hito 4-A cerrado con el 4.18. Después de la Fase 4, el plan lo decide la persona.

## Cómo se trabaja

- **Tres carriles en paralelo** (`docs/ORCA.md`): A, el núcleo, el listado, la tarjeta, la plantilla y el cierre; B, la fórmula, el diseño y las tablas;
  C, la papelera, marcar final y comprobantes. Cada uno con su bucle (`docs/PILOTO.md`), un servicio `systemd --user` con vigía y un PR por paso o parte.
- **El coordinador** asigna, integra con el CI en verde (también los rojos) y devuelve lo rojo. Desde el 2026-11-08: un carril sin paso propio listo
  toma prestado uno de otro carril ocupado; lo que un carril necesita del núcleo lo hace en su PR (no espera al A); los choques de `docs/` con main
  se unen solos y los de código los resuelve la sesión; reiniciar la máquina ya no deja los carriles parados.
- **Pruebas sólo en lo clave** (`.claude/rules/e2e.md`): dinero, fórmula, permisos, RLS, carreras donde hay candados y un e2e por pantalla. El
  auditor, una ronda y sólo en datos o dinero; hasta 6 commits de código por parte.
- **Compuertas:** producto, datos, guardas y el primer atasco se contestan solas con la recomendada (`.piloto/decisiones-automaticas.md`); a la
  persona van el tope de gasto, un paso que falla, el segundo atasco, `afuera` y `dependencia`.

## Funcionando

- **Fases 0 a 3 completas** (equipo, empresa, orígenes, vehículos y leads). **Fase 4, 4.01 a 4.18:** fórmula, motor, niveles, la hoja que guarda, la
  guardada (`/cotizaciones/[id]`, revisiones, «Cotizar encima»), el listado `/cotizaciones`, las secciones de las fichas del lead y del vehículo, la
  tarjeta, «Vista previa», el PDF y «Copiar texto». `cotizaciones` partido en 10 áreas y un núcleo (4.15-4) con sus huecos (4.15-6). Detalle: `docs/BITACORA.md`.
- **B, 4.20:** versiones de la fórmula, publicar con nota, historial, revertir y el ⚙; Configuración › Cotización. **C, 4.24:** la papelera propia
  de cotizaciones (clave, versión, purga por lotes, «Enviar a la papelera» con «Deshacer»).
- **Verdes:** lint, typecheck, test, `db:probar`, `db:lint`, `db:carreras` y `mapa.sh`. Último e2e completo: el del 4.18-3b, 980 en verde, 16 saltados.
  CI: `nivel-1` siempre, `carriles` en cada PR, `base` si cambia código, e2e dirigidos; el completo de escritorio cada noche.
- **Presupuestos al borde:** JS de `/cotizaciones/nuevo` 459,0 de 460 KB y la hoja, 491 nodos de 500 (con la regla del 5 %, se sube el tope).

## Siguiente

- **En curso.** A, **4.20-4** (vigencia y vehículo obligatorio) hecho: el -4a (la RPC, la lectura y la action) y el -4b (la pestaña «Ajustes» de
  Configuración › Cotización). B, **4.21**
  (el editor de la fórmula como el Excel): hechos el -1, -2, -3a y -3b-1 (guardar el borrador, PR #68), siguen el -3b-2 y el -3c. C, **4.25**
  (marcar final): hecho el -1 (candados en el orden de vincular, la final como ancla, desvincular con final), sigue el -2.
- **Lo que falta para cerrar la Fase 4:** B, 4.22 (el
  editor del diseño) y 4.23 (las tablas de referencia con versión, rojo), independientes. C, 4.26 (comprobantes sin huecos, rojo). 4.27 (comentarios,
  adjuntos, favoritos, reportes y moderar; rojo): lo toma el primer carril libre (el C posee sus áreas). Y 4.28, el cierre (A, Nivel 3).
- **Para la persona:** la credencial sin escritorio (`gh auth login --insecure-storage`, `gh auth setup-git` y el remoto por HTTPS: sin eso, tras un
  reinicio y antes de iniciar sesión, los carriles no traen main ni abren PR); `decidir.sh --prueba-tandas`. Abiertos que decide: 4-67, 4-79, 4-94,
  4-95, 5a-39, 5a-40, 5a-42 y 4-39. Los demás, con su paso, en `docs/PLAN.md` › «Abiertos de la Fase 4»; las inestables que pasan al reintentar en CI
  (4-80, 4-81, 4-86, 4-90, 4-92, 4-93, 4-97, 4-99) ya no son abiertos salvo que caigan dos noches seguidas.

## Pendientes que se arrastran

- **Ficha del lead:** «Datos» 39,2 de 43 KB y «Oportunidades» 61,2 de 66. **Portal:** su texto por empresa; `api/portal/*` en la Fase 8. **Lead sin
  dueño** tras una baja: lo rescata la supervisión (`p_dueno_esperado` nulo). **Fase 6:** publicar sin mover la versión de la ficha; la papelera manual
  no mira `documentos`. **Fases 7 a 9:** notificar al compartir, transferir y limpiar; «Escribirle por chat»; `recordatorios_notificar()` sin cron.

## Deuda aceptada

- `registrar_actividad()` y `storage_refcount()` con `execute` para `authenticated`; `cambiar_fase` acepta `p_fase_esperada` nulo; `limpieza_el`
  corre con los derechos de la base; despublicar no revoca la URL de una foto; «Ver como» acota la interfaz, no las filas.
- `storage-gc` y `apibara` (Deno) fuera de lint y typecheck; falta probar fotos en iPhone. `db:lint`: 47 avisos cosméticos en `_formula_*`. Permisos sin enforcement en la base (motivo en `supabase/tests/permisos-enforcement.sql`): `tablero.metricas.ver`, `datos.exportar.todo`,
  `notificaciones.push`, `logistica.pagos.confirmar`. Sin interfaz: `demora_dias_default`, `lead_dormido_meses`, el logo oscuro, `push_web`.
