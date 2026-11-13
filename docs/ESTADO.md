# Estado

> La fuente de verdad de «en qué vamos». **60 líneas como máximo**: lo que deja de ser actual se mueve a `docs/BITACORA.md`. Qué existe
> en el código lo dice `docs/MAPA.md`; los abiertos con su paso, `docs/PLAN.md`. Las versiones anteriores: `git log -p docs/ESTADO.md`.

**Última actualización:** 2026-11-13
**Fase actual:** **Fase 9, partida y abierta** (9.01 a 9.11 integrados; quedan 9.12, 9.13 y el cierre 9.14: `docs/plan.yaml`, `docs/PLAN.md`). La Fase 4
cerró el 2026-11-08; la 5, la 6 y la 7 el 2026-11-12; la **8** el 2026-11-13 con el 8.14. Cuánto va: `node scripts/coordinador/coordinador.mjs tablero`.

## Cómo se trabaja

- **Tres carriles en paralelo** (`docs/ORCA.md`): A, el núcleo y los cierres; B y C, las áreas y módulos que les da `plan.yaml` (`dueno_de`). Cada uno
  con su bucle (`docs/PILOTO.md`), un servicio `systemd --user` con vigía y un PR por paso o parte. Un paso empieza cuando sus dependencias están
  en `main` (`docs/PLAN.md` › «Carriles de las fases 5 a 9»).
- **El coordinador** asigna, integra con el CI en verde y devuelve lo rojo. Un carril sin paso propio listo toma prestado uno de otro; lo que
  necesita del núcleo lo hace en su PR; los choques de `docs/` y de lo generado con main se resuelven solos y los de código, la sesión.
- **De corrido, sin compuertas** (`docs/PILOTO.md` › «De corrido»): toda compuerta se contesta sola con la recomendada; un paso que no cierra se
  **aparca** y el carril sigue con otro; el límite de uso y la red caída se esperan.

## Funcionando

- **Fases 0 a 5** enteras: equipo, empresa, orígenes, vehículos, leads, cotizaciones (la fórmula con versiones, la hoja, lo guardado, el PDF) y la
  configuración de los flujos por RPC. Detalle: `docs/BITACORA.md`; tablas de criterios: `docs/PLAN.md` › «Fase 4» y «Fase 5».
- **Fase 6** entera: `/logistica` con la cadena por fase, el panel con «qué falta», mover con nota y el lote con vista previa; documentos, transporte,
  embarques, aduana, gastos, pagos y margen; la bandeja de logística y las alertas por cron. Tabla: `docs/PLAN.md` › «Fase 6».
- **Fase 7** entera: agenda, chat con `#`, `/tarea` y `/evento`, la campana y el push (sin claves VAPID), la paleta y `?`. Tabla: `docs/PLAN.md` › «Fase 7».
- **Fase 8** entera: la web pública por API (ajustes, guías con revalidar, FAQs, testimonios, la cola con rueda, pegajoso y respaldo, el turno en 2
  toques y la tasa en el tablero), el portal por `api/portal/*` y repuestos (proyectos, stock, compras con margen, cotizador, pagos y la espera del
  vehículo). Tabla: `docs/PLAN.md` › «Fase 8».
- **Tareas de oro 2 y 3:** cotizar al PDF con el teclado (KLM 56,7 s la asesora, 41,1 la dueña); mover 1, 11,3 s de 15; el contenedor de 8, 14,6 de 60.
- **Verdes:** lint, typecheck, test, `db:probar`, `db:lint`, `db:carreras` y `mapa.sh`. **Último e2e completo: el del 8.14-2 (Nivel 3)**:
  escritorio 1.265 en verde, 17 saltadas, 0 caídas, 52,7 min; celular 879 en verde, 31 saltadas, 1 caída inestable, 37,2 min (sobre `3179fc8e`).
  CI: `nivel-1` siempre, `carriles` en cada PR, `base` si cambia código, e2e dirigidos; el completo de escritorio cada noche.
- **Presupuestos al borde:** la hoja, 491 nodos de 500; JS de `/cotizaciones/nuevo` 439,5 de 460 KB (4.19-4). Con la regla del 5 %, se sube el tope.

## Siguiente

- **En marcha** (lanzado el 2026-11-11): lo integrado, lo abierto y lo aparcado están en el tablero, no aquí. Parar:
  `bash scripts/maquina/lanzar.sh --parar`. El coordinador integra todo lo que está en verde, también guardas y ramas `fix/`.
- **Queda para la persona:** producción (variables, secretos, `db push`) y un paso aparcado (`coordinador.mjs reanudar <paso>`).
- **Para la persona**, con números: **5a-4b**: la suite completa con los dos proyectos tarda 92,9 min de reloj (escritorio 54,3; celular
  38,6; 8.14-2), lejos de los 25 min del assert; decidir si vale la segunda pila local o seguir con los shards del CI. Abiertos que decide
  (`docs/PLAN.md` › «Abiertos de la Fase 4» › «Los decide la persona»): 4-39, 4-43, 4-46, 4-52, 4-54, 4-56, 4-64, 4-66, 4-67, 4-71, 4-72,
  4-79, 4-88, 4-94, 4-95, 4-103, 5a-39, 5a-40, 5a-42 y 5a-43; de la Fase 6, 6-2 y 6-4 a 6-7; de la Fase 7, 7-3, 7-4 y la segunda mitad de 7-5;
  de la Fase 8 (`docs/PLAN.md` › «Fase 8» › «Los decide la persona»), 8-05a, 8-13a, 8-13c a 8-13f y 8-14a.
- **Para mover al archivo:** la «Partición» de las fases 4 a 8 y los «Cerrados en la Fase 4», a `docs/archivo/PLAN.md` (una sesión con permiso).

## Pendientes que se arrastran

- **Ficha del lead:** «Datos» 39,2 de 43 KB y «Oportunidades» 61,2 de 66. **Portal:** su texto por empresa; la IP real tras la reescritura del sitio
  (8.07-3). **Lead sin dueño** tras una baja: lo rescata la supervisión (`p_dueno_esperado` nulo). **Fase 6:** publicar sin mover la versión de la
  ficha; la papelera manual no mira `documentos`. **Fase 8:** 8-13b (el transporte propio de un ítem sin vehículo). **Fase 9:** 9-13.
- **Pulido para la Fase 9** (`docs/PLAN.md` › «Fase 9»): lo de las fases 4 a 8, con 5a-33 y la seguridad de 8.10-1 (D14) y de los pagos de repuestos.

## Deuda aceptada

- `registrar_actividad()` y `storage_refcount()` con `execute` para `authenticated`; `cambiar_fase` acepta `p_fase_esperada` nulo; `limpieza_el`
  corre con los derechos de la base; despublicar no revoca la URL de una foto; «Ver como» acota la interfaz, no las filas.
- `storage-gc` y `apibara` (Deno) fuera de lint y typecheck; falta probar fotos en iPhone. `db:lint`: 59 avisos cosméticos (`_formula_*`,
  `_atributos_*` y otras). Sin interfaz: `demora_dias_default`, `lead_dormido_meses`.
