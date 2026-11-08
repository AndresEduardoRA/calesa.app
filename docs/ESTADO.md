# Estado

> La fuente de verdad de «en qué vamos». **60 líneas como máximo**: lo que deja de ser actual se mueve a `docs/BITACORA.md`. Qué existe
> en el código lo dice `docs/MAPA.md`; los abiertos con su paso, `docs/PLAN.md`. Las versiones anteriores: `git log -p docs/ESTADO.md`.

**Última actualización:** 2026-11-08
**Fase actual:** 4 — Cotizaciones (abierta el 2026-10-22). Hecho hasta el **4.18** (el inventario por rutas en la base, 2a, la pantalla que lo lee para quien ve «propios», 2b: cierra 4-23, la siembra de cotizaciones del volumen, 3, y la pantalla `/cotizaciones` con la navegación, «Nueva cotización» y el camino desde el historial del vehículo, 4a, y el resumen `?cotizacion=` de la fila y la tarjeta, 4b) la lectura de las oportunidades de un lead por cursor en la base (5a-12, 4.17-1) y su «Ver más» en la ficha (cierra 5a-12, 4.17-2) y la pestaña «Cotizaciones» de la ficha del vehículo (4.17-3) y el filtro por lead del listado en la base (4.17-4a) y la sección «Cotizaciones» de la ficha del lead con `?lead=` en `/cotizaciones` (4.17-4b) y las revisiones de una cotización desde una fecha en la base (`p_hasta` e índice, 4.17-5a) y `<IrAUnaFecha>` y `<DesdeUnaFecha>` en `src/shared/ui`, sin cambio visible (4.17-5b) y «Ir a una fecha» en «Revisiones» (4.17-5c: cierra 4-75) y la plantilla de la tarjeta validada y la lectura de la tarjeta en la base (4.18-1) y la tarjeta en pantalla, «Vista previa» (4.18-2) y el PDF de una guardada (4.18-3a) y «Copiar texto» y «Descargar PDF» (4.18-3b: cierra el 4.18 y el **hito 4-A**) `cotizaciones` partido por área (4.15-4), la guarda de carriles al día (4.15-5), los huecos de la hoja (4.15-6a), los de la guardada y el listado (4.15-6b) Configuración y Empresa (4.15-6c) y la clave de purgar de la papelera de cotizaciones (4.15-7) y la versión esperada de la plantilla de la tarjeta, en la base (4.19-1: guardar, publicar y descartar el borrador la piden, con un candado por origen) y `validarPlantilla()` de TS, espejo de la base, con el aviso del tono que ya no está (4.19-2, sin cambio visible) y lo que lee y escribe la plantilla en el servidor: la lectura del borrador, la publicada, la fórmula y los tonos, y las tres actions con la guarda del texto que la base no lee (4.19-3a, sin pantalla); la pestaña «Tarjeta» de Configuración › Cotización con el editor que guarda el borrador (con el PT409, el aviso del tono y «Buscar fila»; con 500 miembros, 147.484 B y 4.754 nodos) (4.19-3b); publicar la tarjeta con nota y descartar su borrador, con el PT409 que conserva la nota y los modales fuera de la `key` del editor (4.19-3c, 147.448 B y 4.756 nodos con 500 miembros): cierra el 4.19-3; el 4.19 se partió en cuatro: sigue el **4.19-4** (la vista previa en vivo).
La partición tiene 48 pasos, con el **hito 4-A** al cerrar 4.18 (`docs/PLAN.md` › «Partición»).
**Aparte:** la preparación para Orca, en la rama `preparar-orca` (`docs/PREPARACION.md`). No toca código de producto; la integra la persona.
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

1. **Carril A: el 4.19-4 (la vista previa en vivo), con el piloto**, y en orden hasta el 4.28, **un prompt a la vez, y se para a reportar**. Al empezar, **mirar el CI del PR
   del 4.18-3b**: confirma el hito 4-A (el completo local lo dio; un rojo sin explicar lo deja abierto). Cuenta sin completo: **3 de 3** (el 4.19-4, de pantalla, correría el completo: confirmarlo con `cuenta-e2e.mjs`) (`cuenta-e2e.mjs`: sólo la mueven los pasos de pantalla; el 4.19-1 y el 4.19-2, base y entities, la dejan como está). **Tras integrar el 4.15-4 en `main`**, `piloto-auto-carriles` abre B y C, que esperan: el 4.20 ya no espera al 4.15-6c y el 4.24 ya no espera al 4.15-7. Para sembrar el coordinador (`scripts/coordinador/coordinador.mjs`), cada vez que `siguiente a` dé un paso ya hecho (4.15-3, 4.15-4, 4.16) se marca `publicado <paso> <PR>` y `integrado <paso>`; lo demás que dé es el paso que sigue (el orden: 4.15-5, 4.16, 4.15-6a, 4.15-6b, 4.15-6c, 4.15-7, 4.17; ya hechos, del 4.15-5 al 4.15-7). La hoja, 469 y 491 nodos contra 500; JS de `/cotizaciones/nuevo` 459,0 KB de 460 (4-73: «Vista previa» sumó 1,6, el runtime asíncrono de react-pdf ≈ 0,45 en todas las rutas y el enlace del PDF 0,1; lo próximo atribuye y difiere primero), de `/cotizaciones/[id]` 438,0 de 448, de `/cotizaciones` 360,4 de 380, de `/vehiculos` 477,4 de 500 y de `/perfil` 418,5 de 440; el panel del vehículo, 295 nodos y 4.681 B (topes 299 y 4.900) y el del cliente, 156 nodos y 5.030 B (topes 159 y 5.282); el historial, 4.972 B y 61 nodos (topes 5.250 y 65), con camino a lo antiguo tras 500 (4.16-4a); el panel de revisiones, 241 nodos y 11.907 B (topes 254 y 12.503; el previo de 200 no alcanzó: ≈ 12 por fila).
   Abiertos: 4-102 (el pie de `<Confirmar>` mide 42 px en móvil), 4-51, 4-52, 4-54 a 4-57, 4-60, 4-61 (anotar o agendar desde el «⋯» de la ficha, tras recargar), 4-62 (el segundo «atrás» desde una pestaña del rápido) 4-63 (un segundo «atrás» rápido) y 4-64 (archivos de más de 300 líneas) 4-66 (elegir desde «Nuevo lead» al lead que ya existe por su teléfono) 4-70 (restaurar una versión nueva cuando ya hay otra; 4.24), 4-71 a 4-74 (del 4.15-3a: cambiar el vehículo desde la página, quien no ve el vehículo, el JS de la hoja nueva y dos menores), 4-76 (cuatro menores del 4.15-3b), 4-77 (del 4.16-1: ≈ 160–240 buffers fijos por lectura con la policy de cotizaciones; medido en el 4.16-2a, no crece con las concesiones: su causa sigue sin medir), 4-78 (las listas del panel del vehículo de quien ve «propios» recorren el origen), 4-79 (Configuración › Orígenes dibuja un total exacto de cotizaciones por origen; lo decide la persona) 4-80 (`leads-etiquetas.spec.ts:216` cayó una vez en el completo del 4.16-4a: escribe y pulsa Enter sin esperar la lista; 3 de 3 verdes sola), 4-81 (`cotizar-tarea-de-oro-cliente.spec.ts:116` cayó una vez en el completo del 4.17-1; 3 de 3 sola), 4-82 (`medir-vehiculos-inventario.sql` cayó una vez por su banda de tiempo) 4-83 (`auto-carriles.test.ts` no es hermético: con `.piloto/PARAR`, `pnpm test` cae 5), 4-91 (el registro de páginas de otras áreas; 4.27), 4-89 (las pestañas de área de Empresa, para el 4.26) y 4-88 (el job de la guarda lo define el `ci.yml` del PR), 4-85 (dos pruebas que esperan algo que ya se cumplía) y 4-86 (`cotizar-hoja-resumen.spec.ts:165` en móvil, una vez) 4-90 (`cotizar-guardada-guardar.spec.ts:142` pide seis dígitos de microsegundos y cae una de cada diez), 4-92 y 4-93 (dos e2e que cayeron una vez en el completo del 4.15-7; 3 de 3 solas), 4-94 («Cotizar» desde la ficha del vehículo; lo decide la persona), 4-95 (el id de una revisión puede crecer sin `creado_en`: los caminos sin versión; lo decide la persona) y 4-96 (`mapa.test.ts` T13 al borde de 5 s) y 4-97 (`paneles-foco-al-volver-configuracion.spec.ts:148`, una vez en el completo del 4.17-5b; 3 de 3 sola) y 4-98 (el PDF sin logo si es WebP o un SVG con estilos) y 4-99 (`leads-recorrido-cierre-2.spec.ts:213`, una vez en el completo del 4.18-3b; 3 de 3 sola) y 4-67 (el conteo de exportar tras `analyze`: 3,1 s la primera página, medido en SQL; lo decide la persona).
2. **Del 3c:** un número tipeado se lee con `leerNumeroTipeado(texto, locale)` y lo guardado se abre con `formatearParaEditar` y el locale (la importación CSV, más
   permisiva). **Para la persona:** las respuestas de la 1.ª tanda de P1–P6 del 4.13-3c (`.piloto/informes/4.13-3c.md` › «Para la persona»).
3. **Abiertos sin fase, los decide la persona:** 5a-39 («Dadas de baja» dice «Por ahora el equipo eres tú»), 5a-40 (`cartera` indexada:
   la baja de 200.000 sin updates HOT), 5a-42 (`medir-bajas.sql` cae con un `sync` de disco largo) y 4-39 (cuatro `entities/` de más de
   300 líneas). Los demás abiertos, con su paso, en `docs/PLAN.md` › «Abiertos de la Fase 4» y en cada fase.

- **En curso.** A, **4.19** (el editor de la plantilla): hechos el -1, -2, -3a y -3b (la pestaña «Tarjeta», PR #69), sigue el -3c. B, **4.21**
  (el editor de la fórmula como el Excel): hechos el -1, -2, -3a y -3b-1 (guardar el borrador, PR #68), siguen el -3b-2 y el -3c. C, **4.25**
  (marcar final): hecho el -1 (candados en el orden de vincular, la final como ancla, desvincular con final), sigue el -2.
- **Lo que falta para cerrar la Fase 4:** A, 4.20-4a (vigencia y vehículo obligatorio en la base, rojo) → 4.20-4b (su formulario). B, 4.22 (el
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
