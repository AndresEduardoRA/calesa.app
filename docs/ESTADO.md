# Estado

> La fuente de verdad de «en qué vamos». **60 líneas como máximo**: lo que deja de ser actual se mueve a `docs/BITACORA.md`. Qué existe
> en el código lo dice `docs/MAPA.md`; los abiertos con su paso, `docs/PLAN.md`. La versión anterior completa: `docs/archivo/ESTADO.md`.

**Última actualización:** 2026-11-04
**Fase actual:** 4 — Cotizaciones (abierta el 2026-10-22). Hecho hasta el **4.15-3b**, que cierra el 4.15 (la base de editar con su versión, las revisiones con autor y cotizar encima, `/cotizaciones/[id]` que abre y guarda, y su panel de revisiones, su cadena y «Cotizar encima»; P1–P13 y las P1 y P2 del 3 y del 3b contestadas); sigue el **4.16** (el listado `/cotizaciones`).
La partición tiene 33 pasos, con el **hito 4-A** al cerrar 4.18 (`docs/PLAN.md` › «Partición»).
**Aparte:** la preparación para Orca, en la rama `preparar-orca` (`docs/PREPARACION.md`). No toca código de producto; la integra la persona.

## Funcionando

- Verdes: lint, typecheck, test, `db:probar`, `db:lint`, `db:carreras`, `db:medir:volumen` y `mapa.sh`; el e2e completo, con una caída. Último completo:
  el de escritorio del 4.15-2, 890 en verde, 16 saltados y ninguna caída, 33,9 min. Los niveles de verificación, en `.claude/rules/e2e.md`.
- **CI** (GitHub): `nivel-1` siempre y `carriles` en cada PR; `base` si cambia código; en un PR, los e2e dirigidos a lo tocado (el
  completo si toca un disparador del Nivel 2); el completo de escritorio cada noche y a mano (`escritorio|ambos`).
- **El piloto** (`docs/PILOTO.md`) es el carril A de Orca (`docs/ORCA.md`): avanza `docs/PLAN.md` un paso por sesión y publica su rama
  `a/…` por PR; sólo pregunta en las compuertas. Falta aceptar la confianza de la carpeta y `decidir.sh --prueba-tandas`.
- **Fases 0 a 3 completas** (equipo, empresa, orígenes, vehículos y leads). **Fase 4:** fórmula, motor, niveles, crear y guardar una
  cotización, y la hoja dibujada que guarda, con «Avanzado», la ayuda de texto, «Ver total Bs», los modos, el resumen fijo, la ayuda de una tabla, la tarea de oro 2 (tramo de la hoja) y el presupuesto de JS de la hoja, en la base y en la pantalla (4.01 a 4.13). La base del panel del vehículo: `vehiculos.cotizado_en` (cotizar no edita el vehículo), `cierre_subasta_en` (generada) y los índices de sus tres listas (4.14-1). El panel del vehículo: la barra sobre la hoja abre «Últ. cotización» y «Cierre subasta» por cursor, sin ir al servidor; el cursor sirve para cualquier columna (4.14-2a). Tras recargar con un panel por URL abierto, «atrás» devuelve el foco a quien lo abrió en `usePanelPorUrl()` y «Nuevo nivel» (4.14-2a2); desde un menú, al «⋯», y en la hoja de filtros y los paneles de vehículos, también con `shallow: false` (4.14-2a3); en los paneles propios del listado de leads, el embudo y el lead rápido (4.14-2a4), en la ficha del lead y las pestañas del rápido, con el segundo «atrás» del rápido (4.14-2a5), y en Configuración › Leads, con el guardián sin lista (4.14-2a6). El elegido de la hoja muestra su historial de cotizaciones (plegado, se lee al desplegarlo, «Ver más» hasta 500; sólo lo que quien mira ve), la barra dice «Cotizado (n)» (que no se mueve al guardar) y el resumen de un vehículo ofrece «Cotizar», sin lead (4.14-2b). El panel busca por nombre, VIN o lote, trae un enlace, un VIN o un lote y «+» carga a mano: «Crear y elegir» crea el vehículo y la hoja lo elige (el layout del alta se lee al abrirla; 4.14-2c1). La hoja sabe qué dato del vehículo casa con cada celda de tabla (`dato_del_vehiculo`; 4.14-2c2). El panel ofrece elegir ese dato entre las filas de la tabla y lo guarda en el vehículo; la tarea de oro 2 con un enlace de Copart, 32 teclas (4.14-2c3). La base de «míos» del panel del cliente: `leads_asesores.lead_reciente_en` (el último seguimiento del lead o su alta), con triggers, su índice y `reciente_en` en las dos vistas (4.14-3a). El panel del cliente: la barra bajo la del vehículo abre «míos» por lo más reciente, con pestañas «Todos», «Prospecto» y «Cliente» y la búsqueda por nombre o `#n`; elegir o quitar escribe el lead y conserva lo tipeado (4.14-3b); su «+» abre «Nuevo lead» (el del shell, con `?elegir=`) y la hoja elige al creado; «Cotizar» en la cabecera de la ficha abre la hoja con ese lead; «Guardar» sin cliente dice dónde elegirlo; la tarea de oro 2 suma su tramo del cliente: 29 teclas con uno que existe y 30 con uno nuevo (4.14-3c). Guardar una cotización pide ver y editar (`_cotizacion_puede_guardar()`, antes del candado: quien no la ve recibe lo de una inexistente), `puede_cotizacion()` mira el alcance una vez y la revisión guarda `totales` por clave sin delatar un grupo por lo que un nivel esconde (4.15-1). La hoja de una guardada (`cotizacion_hoja_guardada`): SU versión, lo editable sólo para quien la guarda (quien sólo ve, en sólo lectura), la vigencia (`vigencia_dias`, «vencida» por día) y la cadena; las revisiones nombran a su autor y lo que cambió; cotizar encima (`cotizacion_encima`) crea la N+1 en el acto, una viva por anterior, y se lleva también lo oculto (4.15-2). `/cotizaciones/[id]` abre la hoja de SU versión y guarda con la versión esperada (sólo lectura para quien no la guarda; si lo de hoy no es lo guardado, avisa y muestra «Total guardado»; no cambia el vehículo: 4-71) y se llega desde el historial del vehículo (4.15-3a). Su cabecera trae «Revisiones» (`?panel=revisiones`: quién guardó, qué cambió y el total antes y después, de a 20 por cursor hasta 500), la cadena («Versión V de la n.º N», «Hay una versión nueva») y, si usa otra versión de la fórmula que la de hoy o venció, un aviso con «Cotizar encima», que crea la versión nueva en el acto y espera si hay cambios sin guardar (4.15-3b).
- **La rueda de la web:** `habilitado` es de la persona (`cola_web_configurar`); el rol decide si puede estar (`web.cola.participar`). Sin
  pantalla todavía: el tablero de la cola y el interruptor de disponibilidad (Fase 8, 8-1).

## Siguiente

1. **Carril A: el 4.16, con el piloto** (`docs/PLAN.md` › 4.16: el listado `/cotizaciones`), y en orden hasta el 4.28, **un prompt a la vez, y se
   para a reportar**. Cuenta sin completo: **2 de 3** (el 4.15-3a y el 4.15-3b, de pantalla, no lo corrieron; el 4.15-2 sí). La hoja, 468 y 490 nodos contra 500; JS de `/cotizaciones/nuevo` 456,2 KB de 460 (4-73, atribuido: lo de la guardada va en un chunk que también carga), de `/cotizaciones/[id]` 442,3 de 448, de `/vehiculos` 476,3 de 500 y de `/perfil` 418 de 440; el panel del vehículo, 295 nodos y 4.681 B (topes 299 y 4.900) y el del cliente, 156 nodos y 5.030 B (topes 159 y 5.282); el historial, 4.972 B y 61 nodos (topes 5.250 y 65), sin camino a lo antiguo tras 500 hasta el 4.16 y el 4.17; el panel de revisiones, 241 nodos y 11.907 B (topes 254 y 12.503; el previo de 200 no alcanzó: ≈ 12 por fila), también hasta el 4.17 (4-75).
   Abiertos: 4-50 endurecido (P5: al 200 % el resumen fijo no cabe con la página arriba; con las dos barras, 227 px abajo en escritorio y 157,6 en el celular), 4-51, 4-52, 4-54 a 4-57, 4-60, 4-61 (anotar o agendar desde el «⋯» de la ficha, tras recargar), 4-62 (el segundo «atrás» desde una pestaña del rápido) 4-63 (un segundo «atrás» rápido) y 4-64 (archivos de más de 300 líneas) 4-66 (elegir desde «Nuevo lead» al lead que ya existe por su teléfono) 4-70 (restaurar una versión nueva cuando ya hay otra; 4.24), 4-71 a 4-74 (del 4.15-3a: cambiar el vehículo desde la página, quien no ve el vehículo, el JS de la hoja nueva y dos menores), 4-75 y 4-76 (del 4.15-3b: el camino a las revisiones de más de 500, 4.17, y cuatro menores) y 4-67 (el conteo de exportar tras `analyze`: 3,1 s la primera página, medido en SQL; lo decide la persona).
2. **Del 3c:** un número tipeado se lee con `leerNumeroTipeado(texto, locale)` y lo guardado se abre con `formatearParaEditar` y el locale (la importación CSV, más
   permisiva). **Para la persona:** las respuestas de la 1.ª tanda de P1–P6 del 4.13-3c (`.piloto/informes/4.13-3c.md` › «Para la persona»).
3. **Abiertos sin fase, los decide la persona:** 5a-39 («Dadas de baja» dice «Por ahora el equipo eres tú»), 5a-40 (`cartera` indexada:
   la baja de 200.000 sin updates HOT), 5a-42 (`medir-bajas.sql` cae con un `sync` de disco largo) y 4-39 (cuatro `entities/` de más de
   300 líneas). Los demás abiertos, con su paso, en `docs/PLAN.md` › «Abiertos de la Fase 4» y en cada fase.

## Pendientes que se arrastran

- **Ficha del lead:** «Datos» 39,2 de 43 KB, «Oportunidades» 38,4 y «Portal» 30,3 (con 100 orígenes y 100 tipos, «Datos» 40,1); si se
  pasa, se recortan las props. **Embudos:** plantilla de etapas por empresa; tablero de equipo (Fase 9). **Portal:** plantilla del texto
  por empresa; `ajustes_web.direccion_publica` sin pantalla; la Fase 8 hace `api/portal/*`, la cookie con `otorgado_en` y el límite por IP.
- **Lead sin dueño y con compartidos** (tras una baja): lo rescata la supervisión transfiriendo con `p_dueno_esperado` nulo.
- **Fase 4, en su paso:** la cotización final como ancla de la limpieza; desvincular con cotización final; `cotizacion_marcar_final`
  vincula el lead antes de tomar el vehículo (posible deadlock); campos del lead en la tarjeta o el PDF.
- **Fase 6:** mover de fase y publicar sin mover la versión de la ficha; la papelera manual no mira `documentos`.
- **Fases 7 y 8:** la notificación al compartir o transferir y la de la limpieza; el CTA «Escribirle por chat»; la agenda dibuja el número
  del lead con `<NumeroDeLead>`; el buscador de leads sin los privados; el atajo `?` sin lista; `recordatorios_notificar()` existe sin cron
  y su `ruta` nombra el lead aunque su dueño ya no lo vea. **Fase 9:** Actividad leerá el diff recortado.

## Deuda aceptada

- `registrar_actividad()` y `storage_refcount()` tienen `execute` para `authenticated`; `marca` y `avatares` borran con `quitarSiHuerfano()`.
  `cambiar_fase` acepta `p_fase_esperada` nulo y tiene un mensaje que habla de vos. `vehiculos.papelera.purgar` gobierna también la papelera
  de cotizaciones, sin versión ni purga automática. `web.solicitar_asesor` no valida el vehículo; `cotizacion_marcar_final` vincula sin mirar
  la papelera. `limpieza_el` corre con los derechos de la base. Despublicar no revoca la URL de una foto.
- «Ver como» acota la interfaz, no las filas que entrega la base. `storage-gc` y `apibara` (Deno) no entran en lint ni typecheck. Falta
  probar fotos en iPhone. `tipo_acceso = 'adoptado'` quedó sin uso.
- `db:lint` da 32 avisos cosméticos en `_formula_*` y 15 en `evaluar_formula`. Sin interfaz: `demora_dias_default`, `lead_dormido_meses`,
  el logo oscuro, `push_web`, `web_publica`, `ajustes_web.origenes_visibles`, `fases.publica_web`, el `icono` y el orden de los orígenes de
  vehículos. Permisos sin enforcement en la base, con su motivo en `supabase/tests/permisos-enforcement.sql`: `tablero.metricas.ver`,
  `datos.exportar.todo`, `notificaciones.push`, `logistica.pagos.confirmar`.
