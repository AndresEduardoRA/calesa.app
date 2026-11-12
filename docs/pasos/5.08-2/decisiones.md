## 2026-11-11 — Paso 5.08: «Requisitos para entrar» (decisiones de la parte 2)

- **D1 · Una sola action `crearRequisito` con unión discriminada por `tipo`** (reemplaza `crearRequisitoDeDato`): tres actions iguales serían tres archivos con el mismo
  permiso y el mismo `revalidatePath`. El repositorio pasa a `crear({ id, faseId, actualizadoEnEsperado, tipo, datos })`.
- **D2 · El selector de la forma es en línea**, no un menú desplegable: se alcanza con teclado igual y no abre un segundo menú dentro del drawer.
- **D3 · La edición se abre en el lugar del botón de agregar**, no dentro de la fila: la lista conserva su orden y alto, y el foco vuelve al «⋯» de su fila al cerrar.
- **D4 · La espera ofrece las fases activas del otro flujo**, todas las que se leen (hasta 100 flujos y 1.000 fases; un tope lo dice con `<AvisoDeTope>`); sin filtrar por permiso
  de origen (la base no lo pide: `fases: leer` es de cualquier cuenta con sesión).
- **D5 · El ámbito del flujo viaja a la lectura de opciones** (`{ flujoId, ambito }`): evita releer el encabezado y la caché por flujo sigue igual.
- **D6 · Mínimo y máximo son enteros ≥ 1** (como la base): «Escribe un número entero.» si no lo es; «Pide al menos 1 archivo.» si es menor que 1.
- **D7 · «Sin cambios» se dice en el formulario** («No hay nada que guardar.»), no con un toast, y no llama a la base.
- **D8 · Las formas no guardan borrador en `sessionStorage`:** ninguna pasa de 6 campos (`ui.md`).
- **D9 · La URL del selector es `?agregar=nuevo&forma=…`** (no `?agregar=<forma>`): `usePanelPorUrl` lleva una sola pareja clave-valor por panel y la guarda de la vuelta del
  foco espera una sola entrada por clave; una forma desconocida cae en el selector. El e2e de la parte 1 se ajustó a esa URL.
- **D10 · `TipoParaRequisito` gana `delFlujo`:** con tipos de la empresa y del flujo a la vez, el selector marca los del flujo con « · de este flujo» (el nombre puede repetirse entre grupos).
- **D11 · Un tipo de documento que no se pudo leer** no deja enviar el formulario de documento (sólo «Cancelar») y la edición de un documento sin su tipo no toca los formatos.
