## 2026-11-11 — Paso 6.01-2: el panel de la unidad y su ruta

- **D12 · Los días en la fase son de calendario** (`diasEnLaFase`, zona de la empresa) y el texto va por días aun pasados los 6 (`fechaRelativa` cae a la fecha absoluta): «Desde hace 3 días en esta fase».
- **D13 · `UnidadAbierta` junta los estados** (no disponible, sin permiso, panel) para la página y el drawer: la fila ilegible por RLS dice «ya no está disponible» antes de mirar `logistica.ver`, para no confirmar que existe.
- **D14 · Un error al leer el flujo del origen no tumba el panel:** deja apagados los huecos con regla y avisa en una línea; los errores de la unidad, las fases y los orígenes suben al `error.tsx`.
- **D15 · `<Bloque>` gana `onAbrir`** (aditivo) para montar el hueco al abrirlo; el contenido queda montado al cerrar.
- **D16 · El título de un origen en el panel sale de `getOrigenes`:** si el origen no figura se omite, sin texto fijo.
