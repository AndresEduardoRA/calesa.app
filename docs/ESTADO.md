# Estado

> La fuente de verdad de «en qué vamos». **60 líneas como máximo**: lo que deja de ser actual se mueve a `docs/BITACORA.md`. Qué existe
> en el código lo dice `docs/MAPA.md`; los abiertos con su paso, `docs/PLAN.md`. Las versiones anteriores: `git log -p docs/ESTADO.md`.

**Última actualización:** 2026-11-13
**Fase actual:** **las fases 0 a 9 cerradas: lista para desplegar.** La 9 cerró el 2026-11-13 con el 9.14; desplegar es de la persona
(`docs/DESPLIEGUE.md`). La Fase 4 cerró el 2026-11-08; la 5, la 6 y la 7 el 2026-11-12; la 8 y la 9 el 2026-11-13.

## Cómo se trabaja

- **Tres carriles en paralelo** (`docs/ORCA.md`): A, el núcleo y los cierres; B y C, las áreas y módulos que les da `plan.yaml` (`dueno_de`). Cada uno
  con su bucle (`docs/PILOTO.md`), un servicio `systemd --user` con vigía y un PR por paso o parte.
- **El coordinador** asigna, integra con el CI en verde y devuelve lo rojo; los choques de `docs/` y de lo generado con main se resuelven solos y los
  de código, la sesión. **De corrido, sin compuertas** (`docs/PILOTO.md` › «De corrido»): toda compuerta se contesta sola con la recomendada; un
  paso que no cierra se **aparca**.

## Funcionando

- **Fases 0 a 5** enteras: equipo, empresa, orígenes, vehículos, leads, cotizaciones (la fórmula con versiones, la hoja, lo guardado, el PDF) y la
  configuración de los flujos por RPC. **Fase 6:** `/logistica` (la cadena, «qué falta», mover y el lote, documentos, embarques, aduana, gastos,
  pagos y margen). **Fase 7:** agenda, chat, la campana y el push (sin claves VAPID), la paleta. **Fase 8:** la web pública por API, la cola con
  rueda, el turno en 2 toques, el portal por `api/portal/*` y repuestos. Tablas de criterios: `docs/PLAN.md`, cada fase.
- **Fase 9** entera: `/actividad` con el diff recortado por cartera y la purga diaria, Inicio con sus bloques, la dominancia sobre la persona,
  campos con rango y `leads.campos.gestionar`, las plantillas por empresa, `/datos` (exportar e importar todo con `importar-csv`), `/tablero`
  (conversión, cola web, margen del mes, widgets por persona), la PWA, la auditoría AA y el despliegue en seco. Tabla: `docs/PLAN.md` › «Fase 9».
- **Tareas de oro** (KLM, `escritorio` y `movil`, 9.14-1): 1, registrar 18,3 s de 25; 2, cotizar 58,1 s de 90; 3, mover 1 en 11,3 s de 15 y el
  contenedor de 8 en 14,6 de 60; 4, «Contacté» en 1 toque y el portal en 8,5 s de 30.
- **Despliegue:** el ensayo en seco en `listo` y la lista de la persona en `docs/DESPLIEGUE.md` (9.13; el 9.14 lo cierra como «lista para desplegar»).
- **Verdes:** lint, typecheck, test, `db:probar`, `db:lint`, `db:carreras` y `mapa.sh`. **Último e2e completo: el del 9.14-3 (Nivel 3)**:
  escritorio 1.291 en verde, 17 saltadas, 0 caídas, 54,1 min; celular 898 en verde, 31 saltadas, 0 caídas, 38,2 min (sobre `20815f1c`).
  CI: `nivel-1` siempre, `carriles` en cada PR, `base` si cambia código, e2e dirigidos; el completo de escritorio cada noche.
- **Presupuestos al borde:** la hoja, 491 nodos de 500; JS de `/cotizaciones/nuevo` 439,5 de 460 KB. Con la regla del 5 %, se sube el tope.

## Siguiente

- **Para la persona:** producción (variables, secretos, `db push`, la lista de `docs/DESPLIEGUE.md` › «Lo que sólo una persona comprueba»: 9-6,
  el dispatch de 9-11, 9-12, 5a-4b y las fotos en iPhone). **5a-4b**: el completo con los dos proyectos tarda 95,3 min de reloj (escritorio
  55,6; celular 39,7; 9.14-3), lejos de los 25 del assert: segunda pila local o los shards del CI.
- **Abiertos que decide la persona** (`docs/PLAN.md` › «Los decide la persona» de cada fase): de la Fase 4, 4-39, 4-43, 4-46, 4-52, 4-54, 4-56,
  4-64, 4-66, 4-67, 4-71, 4-72, 4-79, 4-88, 4-94, 4-95, 4-103, 5a-39, 5a-40, 5a-42 y 5a-43; de la 6, 6-2 y 6-4 a 6-7; de la 7, 7-3, 7-4 y la
  segunda mitad de 7-5; de la 8, 8-05a, 8-13a, 8-13c a 8-13f y 8-14a; de la 9, 9-6, 9-11 (el dispatch), 9-12, 4-20, el R7 de `shared/ui` y
  **9-14a** (una dueña no cierra la venta de un lead de su asesora sin tenerlo; recomendado dejarlo).
- **Para mover al archivo:** la «Partición» de las fases 4 a 9 y los «Cerrados en la Fase 4», a `docs/archivo/PLAN.md` (una sesión con permiso).

## Pendientes que se arrastran

- **Ficha del lead:** «Datos» 39,2 de 43 KB y «Oportunidades» 61,2 de 66. **Portal:** la IP real tras la reescritura del sitio (8.07-3). **Lead
  sin dueño** tras una baja: lo rescata la supervisión. **Fase 6:** publicar sin mover la versión de la ficha; la papelera manual no mira
  `documentos`. **Fase 8:** 8-13b (el transporte propio de un ítem sin vehículo). **9-13**, sin paso (`rbac_eliminar_rol` da el `23503` crudo).
- **Pulido sin paso** (`docs/PLAN.md` › «Fase 9» › «Pulido para la Fase 9», lo que no lleva «Cerrado»): las líneas del 6.14-1 y del 5.04-3, y la
  seguridad de 8.10-1 (D14) y de los pagos de repuestos.

## Deuda aceptada

- `registrar_actividad()` con `execute` para `authenticated`; `cambiar_fase` acepta `p_fase_esperada` nulo; despublicar no revoca la URL de una
  foto; «Ver como» acota la interfaz, no las filas. `storage_refcount()` y `limpieza_el` con su motivo en `supabase/tests/advisors-con-motivo.json`;
  `db:lint`: 133 avisos en 37 funciones, cada una con su motivo (`db_lint`).
- `storage-gc`, `apibara` e `importar-csv` (Deno) fuera de lint y typecheck; fotos en iPhone: en la lista de la persona. Sin interfaz:
  `demora_dias_default`, `lead_dormido_meses`.
