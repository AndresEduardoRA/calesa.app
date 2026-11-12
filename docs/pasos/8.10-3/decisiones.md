## 2026-11-12 · Decisiones del paso 8.10-3 (reasignar, la vista «Stock» y el e2e del assert)

- **D1** · **Sin SQL nuevo.** La base de 8.10-1 ya da `repuesto_stock_reasignar`, `repuesto_stock_mover` y `repuestos_stock_listar` con sus pruebas y la carrera (V1, V23); la parte es
  servidor de app y pantalla. Sin `db:*` ni `database.types.ts`.
- **D2** · **El buscador de destino vive en el área `proyectos` y lo compone `src/app`**: la lectura de proyectos es de esa área (`leerProyectosDelListado`, V16) y el área `stock` no la
  importa (V27). La vista recibe el campo por render prop desde un Client Component de `A:` (como `hoja-con-stock.tsx`, D4 de 8.10-2), que usa `BuscadorConLista` (V14).
- **D3** · **La vista es `?vista=stock`** con dos enlaces arriba, «Proyectos» y «Stock» (`aria-current`, como `?ver=` de logística, V12); «Proyectos» sigue siendo la de por defecto;
  un `?vista=` desconocido es «Proyectos»; cambiar de vista no conserva filtros ni cursor. «Nuevo proyecto» (botón, `N` y drawer) sólo en «Proyectos».
- **D4** · **«Stock» sin filtros, búsqueda ni selector de tamaño** (la fila no los pide; `.piloto/planes/8.10.md:82`): una página de `TAMANO_DE_PAGINA_POR_DEFECTO` por cursor
  `(en_stock_desde, id)` con «Siguiente» y, con cursor, «Volver al principio»; el camino a lo antiguo es «Siguiente».
- **D5** · **El clic en la fila** (y `<AbrirResumen>` con el teclado) abre el ítem en la hoja de su proyecto con su panel de stock, `/repuestos/<proyecto>?panel=stock&item=<id>`
  (8.10-2): allí están el historial y «Pasar a stock»; no se duplica un resumen.
- **D6** · **Las acciones de la fila van en «⋯»** (`<MasAcciones>`), sólo con `repuestos.editar`: «Reasignar a un proyecto», «Vender suelto», «Devolver al proveedor», en ese orden.
  Sin el permiso no se dibuja «⋯». «Ajuste» no se ofrece (D6 de 8.10-1). Valen con el proyecto de origen cerrado (D3 de 8.10-1).
- **D7** · **Cada acción es un `<Drawer>` con URL**: `?vista=stock&panel=reasignar-stock|vender-stock|devolver-stock&item=<id>`. El ítem se busca en la página vigente; si no está (ya
  salió del stock, o es de otra página) → `useRevisionAlAbrir` con «Ese ítem ya no está en stock.» y la URL se limpia, una vez (V20).
- **D8** · **Vender suelto y Devolver al proveedor** comparten un drawer con el motivo: «Cantidad» (entero desde 1 hasta lo que hay, `validarMovimiento` de salida) y «Nota» opcional
  (hasta 500); `moverStock` con `stockEsperado` = el stock de la fila (V5): si cambió, PT409 → toast con «Recargar». Vender suelto no pide precio (D1 de 8.10-1).
- **D9** · **Reasignar**: «Proyecto destino» (buscador: sólo abiertos, sin el proyecto de origen) y «Cantidad» (1 hasta lo que hay, `validarReasignacion` con `mismoProyecto` falso y
  `destinoCerrado` falso: el buscador ya los excluye, la base vuelve a mirar). El `id` del ítem nuevo sale de `crypto.randomUUID()` al abrir el drawer, se conserva en cada
  reintento y se renueva tras el éxito o al reabrir, atado a la `apertura` de `useApertura` (C10; el drawer no se remonta con `useAbiertoAlgunaVez`) (idempotencia de la
  RPC, D10 de 8.10-1). Sin stock esperado (D10 de 8.10-1).
- **D10** · **Tras el éxito** el drawer se cierra, un toast lo dice («Vendiste N.», «Devolviste N al proveedor.», «Reasignaste N al proyecto #M.» con la acción «Ver proyecto» que va a
  `/repuestos/<destino>`) y `router.refresh()` relee la página: la lista es del servidor. Sin `revalidatePath` (como D8 de 8.10-2). Una fila que llega a 0 sale de la lista.
- **D11** · `buscarProyectosAbiertos` pide `repuestos.editar` con `puede()` antes de leer (sólo la usa reasignar; no abre una lectura nueva a quien sólo ve) y lee bajo la RLS: con
  `estado: 'abiertos'`, `cursor: null`, `tamano: TAMANO_DE_VER_MAS` y el texto sólo si cumple `MINIMO_DE_BUSQUEDA_DE_PROYECTOS` (si no, lista vacía sin llamar a la base).
- **D12** · Las actions no llevan test de Vitest (D11 de 8.10-2): el permiso de reasignar lo prueba la base (`stock-reasignar.sql`) y la action mira `puede()` antes. Lo clave con
  test: el esquema (lo que cruza a la base) y la respuesta de reasignar.
- **D13** · La columna «Proyecto» dice `#N` y el vehículo (título, si no la etiqueta, si no «Externo»), y un `<Badge>` «Cerrado» si el proyecto está cerrado; «Desde» con
  `formatearFecha` (fecha sin hora, `fechas.ts`); «En stock» a la derecha con `tabular-nums` y `formato.ts`.
- **D14** · Estados de la vista: **cargando**, el `<EsqueletoListado>` del `<Suspense>` de la página (V9); **vacío por primera vez**, «No hay repuestos en stock.» con «Lo que sobra de un
  ítem se pasa a stock desde la hoja de su proyecto.»; **cursor fuera de rango**, `EstadoPaginaSinFilas`; **error**, el de `(app)` con «Reintentar» (`datosO`, como proyectos);
  **sin permiso**, el de la página. Sin «vacío por filtro» (no hay filtros).
- **D15** · El e2e **extiende** `repuestos-stock.spec.ts` con un segundo test del mismo `describe` serial (usa el proyecto y el stock del primero, V22); el proyecto destino se crea por
  la interfaz con la etiqueta `Destino stock e2e <proyecto>` (no empieza con «E2E», D12 de 8.10-2; no contiene la de origen, así la búsqueda no la confunde) y la limpieza borra
  las dos etiquetas. Al final, «Vender suelto» de lo que queda → la fila sale (cubre el otro drawer sin un test aparte). `escritorio` y `movil` (interfaz, D13 de 8.10-2).
- **D16** · El GLOSARIO suma «Devolver al proveedor» (V24): término nuevo en la interfaz.
- **D17** · Lo que sumó la auditoría del plan: `buscarProyectosAbiertos` lee por `repositorioDeProyectos.listar` (`features` no importa `infra`) y arma las opciones
  en el servidor (no viaja la fila entera); el `id` del ítem nuevo nace con el formulario, cuya `key` es la `apertura`, así reabrir da uno nuevo.
