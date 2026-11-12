# 8.09-1: decisiones (2026-11-12)

- **D36 · El filtro de estado tiene tres opciones:** Abiertos (por defecto), Cerrados y Todos. La fila pide «abiertos o cerrados» y un proyecto cerrado no debe
  desaparecer sin camino de vuelta. `todos` manda `p_estado` nulo. Reversible.
- **D37 · Sin «Anterior».** El cursor es el `numero` del último proyecto; la base sólo camina hacia adelante. Se reusa `<Paginacion siguiente anterior={null}>`
  (como `/logistica/gastos`): el plan creía que no servía, pero acepta cualquier texto de cursor. Con cursor, «Volver al principio».
- **D38 · El cliente de un proyecto de un vehículo no se pide:** la ficha del vehículo ya lo vincula. El cliente libre, el teléfono y el lead sólo existen en el
  proyecto externo (la base no los prohíbe; no se exponen juntos para no duplicar).
- **D39 · Tras crear, el drawer se cierra y se queda en el listado** (toast «Proyecto #N creado.»). El detalle llega en 8.09-2, que lo cambia a «ir al detalle».
- **D40 · Un `?vehiculo=` inválido o que no se ve abre el formulario como «Externo» con el aviso «No encontramos ese vehículo o no tienes acceso.»,** nunca un error.
  El servidor lo resuelve sólo con el panel abierto y con `repuestos.editar`; la URL puede cambiar después de cargar, así que el id resuelto se compara con el de la URL.
- **D41 · «Completo» no es «Cerrado»:** cerrar es una acción explícita (8.09-2). El estado derivado sale sólo de las cuentas de la base (≤ 201 ítems por proyecto);
  no hay un estado «Con problema».
- **D42 · El lead se pide sólo con `leads.ver`;** sin ella el bloque no se dibuja (la base lo vuelve a exigir con `trg_lead_visible`).
- **D43 · «200+» en vez de un total exacto:** las cuentas de ítems leen como mucho 201 por proyecto (`textoDeItems`).
- **D44 · El vacío de primera vez no sabe si hay proyectos cerrados:** con el filtro «Abiertos» dice «Todavía no hay proyectos de repuestos.» y aclara que los cerrados
  no se muestran (elige «Todos»). Evita una segunda lectura sólo para afinar el texto.
- **D45 · La guarda de páginas pide `TAMANO_DE_PAGINA_POR_DEFECTO` (50), no el máximo:** `paginas.test.ts` exige que lo registrado sea el valor por defecto de
  `_acotar_pagina(p_tamano, 50, 100)`; el máximo de la lista (100, `MAXIMO_DE_PAGINA_DE_REPUESTOS`) sale del selector «Ítems por página».
- **D46 · Esta parte es Nivel 1, no 2:** `navegacion.ts` (`_shell`, el disparador) no se toca hasta 8.09-2; `/repuestos/<id>` da 404 hasta entonces y el menú
  sigue sin llevar a `/repuestos`. Se entra por la URL.
- **D47 · Los buscadores de vehículo y de lead viven en `src/app/(app)/repuestos/`** y llegan al drawer como funciones de render: `repuestos` no importa `buscador`.
  Un número solo («#12») no busca vehículos (D10 del buscador); un vehículo se busca con texto.
