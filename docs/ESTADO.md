# Estado

> La fuente de verdad de «en qué vamos». **60 líneas como máximo**: lo que deja de ser actual se mueve a `docs/BITACORA.md`. Qué existe
> en el código lo dice `docs/MAPA.md`; los abiertos con su paso, `docs/PLAN.md`. Las versiones anteriores: `git log -p docs/ESTADO.md`.

**Última actualización:** 2026-11-12
**Fase actual:** **Fases 6 a 9, partidas y abiertas a la vez** (69 pasos en `docs/plan.yaml`; sus filas, en `docs/PLAN.md`). La Fase 4 cerró el
2026-11-08 con el 4.28 y la **Fase 5** el 2026-11-12 con el 5.13. Los carriles corren desde el 2026-11-11; cuánto va: `coordinador.mjs tablero`.

## Cómo se trabaja

- **Tres carriles en paralelo** (`docs/ORCA.md`): A, el núcleo y los cierres; B y C, las áreas y módulos que les da `plan.yaml` (`dueno_de`). Cada uno
  con su bucle (`docs/PILOTO.md`), un servicio `systemd --user` con vigía y un PR por paso o parte. Las cinco fases corren a la vez: un paso
  empieza cuando sus dependencias están en `main` (`docs/PLAN.md` › «Carriles de las fases 5 a 9»).
- **El coordinador** asigna, integra con el CI en verde y devuelve lo rojo. Un carril sin paso propio listo toma prestado uno de otro; lo que
  necesita del núcleo lo hace en su PR; los choques de `docs/` y de lo generado con main se resuelven solos y los de código, la sesión.
- **De corrido, sin compuertas** (`docs/PILOTO.md` › «De corrido»): toda compuerta se contesta sola con la recomendada; un paso que no cierra se
  **aparca** y el carril sigue con otro (`node scripts/coordinador/coordinador.mjs tablero`); el límite de uso y la red caída se esperan.

## Funcionando

- **Fases 0 a 3** (equipo, empresa, orígenes, vehículos y leads) y **Fase 4** entera: la fórmula con versiones, publicar, historial, revertir y el
  ⚙; el editor de la fórmula como el Excel, el del diseño y el de la plantilla; las tablas de referencia con versión; la hoja de cotizar con sus
  paneles de vehículo (enlace de subasta, inventario) y de cliente; la guardada con revisiones y «Cotizar encima»; el listado; la tarjeta, el PDF y
  «Copiar texto»; la papelera propia; marcar final; comprobantes sin huecos; comentarios, adjuntos, favoritos, reportes y moderar; los ajustes
  de vigencia y vehículo obligatorio. Detalle: `docs/BITACORA.md`; la tabla de criterios, `docs/PLAN.md` › «Fase 4» › «Tabla de criterios».
- **Fase 5** entera: `/configuracion/flujos` arma el flujo de cada origen y el de repuestos por RPC con la versión del flujo —fases, salidas y quién
  mueve, requisitos de los tres tipos con su impacto y «fuera de regla», reglas y oferta, tipos de documento y «Revisar». Tabla: `docs/PLAN.md` › «Fase 5».
- **La tarea de oro 2 entera** (del listado al PDF, sólo con el teclado; `e2e/cotizar-tarea-de-oro-recorrido.spec.ts`): la asesora con un enlace
  de Copart, 56 teclas y KLM 56,7 s; la dueña con un vehículo del inventario, 52 teclas y KLM 41,1 s (escritorio; en el celular, 3 teclas menos).
- **Verdes:** lint, typecheck, test, `db:probar`, `db:lint`, `db:carreras` y `mapa.sh`. **Último e2e completo: el del 5.13-1 (Nivel 3)**:
  escritorio 1.107 en verde, 16 saltadas, 2 caídas (una arreglada, una inestable), 43,5 min; celular, sobre el arreglo del borrado, 791 en verde, 27 saltadas, 0 caídas, 31,0 min. CI: `nivel-1` siempre, `carriles` en cada PR, `base`
  si cambia código, e2e dirigidos; el completo de escritorio cada noche.
- **Presupuestos al borde:** la hoja, 491 nodos de 500; JS de `/cotizaciones/nuevo` 439,5 de 460 KB (medido en el 4.19-4). Con la regla del 5 %, se sube el tope.

## Siguiente

- **En marcha** (lanzado el 2026-11-11): lo integrado, lo abierto y lo aparcado están en el tablero, no aquí. Parar:
  `bash scripts/maquina/lanzar.sh --parar`. El coordinador integra todo lo que está en verde, también guardas y ramas `fix/`.
- **Queda para la persona:** producción (variables, secretos, `db push`) y un paso aparcado (`coordinador.mjs reanudar <paso>`).
- **Para la persona**, con números: **5a-4b**: la suite completa con los dos proyectos tarda 76,6 min de reloj (escritorio 44,6; celular
  32,0; 5.13-1), lejos de los 25 min del assert; decidir si vale la segunda pila local o seguir con los shards del CI. Abiertos que decide
  (`docs/PLAN.md` › «Abiertos de la Fase 4» › «Los decide la persona»): 4-39, 4-43, 4-46, 4-52, 4-54, 4-56, 4-64, 4-66, 4-67, 4-71, 4-72,
  4-79, 4-88, 4-94, 4-95, 4-103, 5a-39, 5a-40, 5a-42 y 5a-43.
- **Para mover al archivo:** la «Partición» de las fases 4 y 5 y los «Cerrados en la Fase 4» siguen en `docs/PLAN.md` (esta sesión no lee
  `docs/archivo/`) hasta que una sesión con permiso los pase a `docs/archivo/PLAN.md`.

## Pendientes que se arrastran

- **Ficha del lead:** «Datos» 39,2 de 43 KB y «Oportunidades» 61,2 de 66. **Portal:** su texto por empresa; `api/portal/*` en la Fase 8. **Lead sin
  dueño** tras una baja: lo rescata la supervisión (`p_dueno_esperado` nulo). **Fase 6:** publicar sin mover la versión de la ficha; la papelera manual
  no mira `documentos`; 6-4. **Fases 7 a 9:** notificar al compartir, transferir y limpiar; «Escribirle por chat»; `recordatorios_notificar()` sin cron; 7-2; 9-13.
- **Pulido para la Fase 9** (`docs/PLAN.md` › «Fase 9»): lo que salió en las fases 4 y 5, con 5a-33 (el conteo del rol tapado al 200 % en Roles).

## Deuda aceptada

- `registrar_actividad()` y `storage_refcount()` con `execute` para `authenticated`; `cambiar_fase` acepta `p_fase_esperada` nulo; `limpieza_el`
  corre con los derechos de la base; despublicar no revoca la URL de una foto; «Ver como» acota la interfaz, no las filas.
- `storage-gc` y `apibara` (Deno) fuera de lint y typecheck; falta probar fotos en iPhone. `db:lint`: 48 avisos cosméticos (`_formula_*`, `_atributos_*` y otras). Permisos sin enforcement en la base (motivo en `supabase/tests/permisos-enforcement.sql`): `tablero.metricas.ver`, `datos.exportar.todo`,
  `notificaciones.push`, `logistica.pagos.confirmar`. Sin interfaz: `demora_dias_default`, `lead_dormido_meses`, el logo oscuro, `push_web`.
