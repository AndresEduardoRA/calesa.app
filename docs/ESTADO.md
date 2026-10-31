# Estado

> La fuente de verdad de «en qué vamos». **60 líneas como máximo**: lo que deja de ser actual se mueve a `docs/BITACORA.md`. Qué existe
> en el código lo dice `docs/MAPA.md`; los abiertos con su paso, `docs/PLAN.md`. La versión anterior completa: `docs/archivo/ESTADO.md`.

**Última actualización:** 2026-10-30
**Fase actual:** 4 — Cotizaciones (abierta el 2026-10-22). Hecho hasta el **4.14-2c2** (la celda de tabla dice qué dato del vehículo casa con su tabla); sigue el **4.14-2c3** (el tipo en el panel, cierra 4-10).
La partición tiene 33 pasos, con el **hito 4-A** al cerrar 4.18 (`docs/PLAN.md` › «Partición»).
**Aparte:** la preparación para Orca, en la rama `preparar-orca` (`docs/PREPARACION.md`). No toca código de producto; la integra la persona.

## Funcionando

- Verdes: lint, typecheck, test, `db:probar`, `db:lint`, `db:carreras`, `db:medir:volumen` y `mapa.sh`; el e2e completo, con una caída. Último completo:
  el de escritorio del 4.14-2c2, 866 en verde, 16 saltados y ninguna caída, 32,7 min. Los niveles de verificación, en `.claude/rules/e2e.md`.
- **CI** (GitHub): `nivel-1` siempre y `carriles` en cada PR; `base` si cambia código; en un PR, los e2e dirigidos a lo tocado (el
  completo si toca un disparador del Nivel 2); el completo de escritorio cada noche y a mano (`escritorio|ambos`).
- **El piloto** (`docs/PILOTO.md`) es el carril A de Orca (`docs/ORCA.md`): avanza `docs/PLAN.md` un paso por sesión y publica su rama
  `a/…` por PR; sólo pregunta en las compuertas. Falta aceptar la confianza de la carpeta y `decidir.sh --prueba-tandas`.
- **Fases 0 a 3 completas** (equipo, empresa, orígenes, vehículos y leads). **Fase 4:** fórmula, motor, niveles, crear y guardar una
  cotización, y la hoja dibujada que guarda, con «Avanzado», la ayuda de texto, «Ver total Bs», los modos, el resumen fijo, la ayuda de una tabla, la tarea de oro 2 (tramo de la hoja) y el presupuesto de JS de la hoja, en la base y en la pantalla (4.01 a 4.13). La base del panel del vehículo: `vehiculos.cotizado_en` (cotizar no edita el vehículo), `cierre_subasta_en` (generada) y los índices de sus tres listas (4.14-1). El panel del vehículo: la barra sobre la hoja abre «Últ. cotización» y «Cierre subasta» por cursor, sin ir al servidor; el cursor sirve para cualquier columna (4.14-2a). Tras recargar con un panel por URL abierto, «atrás» devuelve el foco a quien lo abrió en `usePanelPorUrl()` y «Nuevo nivel» (4.14-2a2); desde un menú, al «⋯», y en la hoja de filtros y los paneles de vehículos, también con `shallow: false` (4.14-2a3); en los paneles propios del listado de leads, el embudo y el lead rápido (4.14-2a4), en la ficha del lead y las pestañas del rápido, con el segundo «atrás» del rápido (4.14-2a5), y en Configuración › Leads, con el guardián sin lista (4.14-2a6). El elegido de la hoja muestra su historial de cotizaciones (plegado, se lee al desplegarlo, «Ver más» hasta 500; sólo lo que quien mira ve), la barra dice «Cotizado (n)» (que no se mueve al guardar) y el resumen de un vehículo ofrece «Cotizar», sin lead (4.14-2b). El panel busca por nombre, VIN o lote, trae un enlace, un VIN o un lote y «+» carga a mano: «Crear y elegir» crea el vehículo y la hoja lo elige (el layout del alta se lee al abrirla; 4.14-2c1). La hoja sabe qué dato del vehículo casa con cada celda de tabla (`dato_del_vehiculo`; 4.14-2c2).
- **La rueda de la web:** `habilitado` es de la persona (`cola_web_configurar`); el rol decide si puede estar (`web.cola.participar`). Sin
  pantalla todavía: el tablero de la cola y el interruptor de disponibilidad (Fase 8, 8-1).

## Siguiente

1. **Carril A: el 4.14-2c3, con el piloto** (el tipo en el panel: opciones de las filas de `cotizacion_tabla`, P3 abierta; cierra 4-10), el 4.14-3
   (`docs/PLAN.md` › 4.14), y en orden hasta el 4.28, **un prompt a la vez, y se para a reportar**. Cuenta sin completo: **0 de 3** (el 2c2 corrió el completo). La hoja,
   468 y 490 nodos contra 500; JS de `/cotizaciones/nuevo` 443,9 KB de 460, de `/vehiculos` 476,3 de 500 y de `/perfil` 418 de 440; el panel, 295 nodos y 4.681 B (topes 299 y 4.900); el historial, 4.972 B y 61 nodos (topes 5.250 y 65), sin camino a lo antiguo tras 500 hasta el 4.16 y el 4.17.
   Abiertos: 4-50 endurecido (P5: al 200 % el resumen fijo no cabe con la página arriba), 4-51 a 4-57, 4-60, 4-61 (anotar o agendar desde el «⋯» de la ficha, tras recargar), 4-62 (el segundo «atrás» desde una pestaña del rápido) y 4-63 (un segundo «atrás» rápido).
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
