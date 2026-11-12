# 8.08-1: decisiones (2026-11-12)

- **D1 · Un ítem que terminó sin llegar no frena al vehículo** (duda 1 de la fila; cierra la contradicción 3 de la Fase 8). `evaluar_requisitos` (rama
  `hijos`) cumple si todos los ítems vivos fuera de stock llegaron a la fase esperada o terminaron en otra final («Perdido»); el `detalle` suma
  `sin_llegar`. La regla vive en `_repuesto_ante_espera` (sólo `service_role`), que da `llego` también si el ítem está en la fase esperada aunque no tenga
  historial. Cambia una función de `flujos`, cuya ficha no está en los módulos del paso: el aviso va en la ficha de `repuestos` y la bitácora le pide al
  coordinador la línea en `src/modules/flujos/CLAUDE.md`.
- **D2 · Un proyecto sólo se elimina vacío** (duda 2): sin ítems vivos, compras, pagos ni cotizaciones; borrado suave, con «Deshacer» por
  `repuesto_proyecto_restaurar(p_proyecto, p_eliminado_en_esperado)`. Restaurar choca con el único proyecto vivo por vehículo: 23505.
- **D3 · `datos` (jsonb) de los catálogos no se dibuja** (duda 3; aplica en 8.08-3).
- **D4 · Eliminar un ítem o un proyecto lleva la versión esperada**, como `tarea_eliminar` y `evento_eliminar` (`migraciones.md` › «Forma»), aunque la fila
  escriba `repuesto_item_eliminar(p_item)`.
- **D5 · También se quita el INSERT directo de proyectos** y el UPDATE de tabla (queda UPDATE por columna de etiqueta, VIN, lead, cliente y notas). Sin eso,
  quien tiene `repuestos.editar` creaba un proyecto de un vehículo que no ve. Un `check` impide etiqueta o VIN propios en un proyecto con vehículo.
- **D6 · La lista no trae `lead_id` ni el teléfono del cliente**, y el título del vehículo sale sólo con `vehiculos.ver` de su origen. Los pendientes de un
  vehículo traen los nombres de sus fases sólo con `logistica.ver` del vehículo (auditoría del plan, hallazgo 3).
- **D7 · Búsqueda de la lista:** sólo dígitos (hasta 18) busca el número o el texto; si no, 3 caracteres o más, escapado, sobre etiqueta, VIN y cliente. No
  busca por el título del vehículo, que no todos ven.
- **D8 · Un proyecto cerrado no recibe ítems**, y cerrarlo no exige que los ítems hayan terminado.
- **D9 · «Borrar sólo sin uso» va con un trigger** `before delete` en la base, no con un control en la app: no tiene carrera y cubre los ítems eliminados y
  las líneas de cotización.
- **D10 · Sin carrera en esta parte.** El arnés `scripts/carreras.mjs` lo arma a mano el carril A y no está en los módulos del paso. «Eliminar un proyecto
  mientras se crea un ítem» lo resuelve el orden de candados (`for update` del proyecto al eliminar contra `for share` al crear el ítem, tomado antes de
  leer su estado). Se propone sumar esa carrera a `scripts/carreras/repuestos-stock.mjs` en el 8.10.
- **D11 · Docs:** una carpeta por parte (`docs/pasos/8.08-1/`), porque `consolidar-docs.mjs` consolida una vez por carpeta.
- **D12 · Estado del proyecto:** la base da las cuentas (`items`, `pendientes`, `en_stock`, `terminados`) y `entities` deriva la etiqueta (8.09).
- **D13 · Qué espera el vehículo:** las esperas de las fases a las que puede pasar desde la actual; sin fase, las de las iniciales activas de su flujo.
- **D14 · Validaciones del ítem:** descripción de 1 a 500 caracteres; cantidad entera desde 1; precio ≥ 0 y con moneda existente; cada catálogo, vivo y de
  su tipo.
- **D15 · Registro de páginas:** ninguna entrada en `paginas-en-la-base.ts` hasta que haya quien llame la RPC desde `src/` (la lista en 8.09, los pendientes
  en 8.13): la guarda rompe con una entrada sin llamador.
- **D16 · Toda RPC que escribe pide `repuestos.editar` antes del candado** (auditoría del plan, que bloqueó por `eliminar` y `restaurar` sin permiso
  explícito). R6 y B2 lo prueban con `repuestos.ver` sin `repuestos.editar`.
- **D17 · Abierto para 8.09 (auditoría del informe, hallazgo 3).** Dos `repuesto_item_crear` (o `repuesto_proyecto_crear`) a la vez con el mismo id caen
  en la PK con un 23505 sin mensaje humano, y la repetición idempotente de un ítem responde sin mirar si el proyecto sigue vivo. No rompe datos; 8.09 envuelve
  el `insert` en `exception when unique_violation` con «Ese identificador ya está en uso…».
- **D18 · Eliminar un ítem recién nacido de un proyecto cerrado se permite** (auditoría del informe, hallazgo 4): es borrado suave de un ítem sin historial
  ni uso, y deshacer una carga equivocada no debería exigir reabrir el proyecto. Crear sí lo rechaza.
