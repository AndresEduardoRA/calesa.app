## 2026-11-08 — Paso 4.22-1

- **Se parte en seis** (el 4.22 junta lo puro, la pantalla, la vista previa y una migración): **4.22-1** lo puro (hecho); **4.22-2** la pestaña con secciones y
  celdas, el aviso visible y guardar el borrador (`guardarBorrador` ya acepta `diseno`); **4.22-3** variantes, interruptores, atajos, subtotales, modos y tarjeta;
  **4.22-4** el catálogo de tonos (`tono_crear|guardar|eliminar` ya existen); **4.22-5** la vista previa a 412 y 1.280 px y al 200 %; **4.22-6** 4-30 (rojo, datos).
- **Preguntas que quedan para las partes que siguen** (la recomendada, primero; sin respuesta se toma ésta):
  - **P1 (producto/UX, 4.22-2) dónde vive el editor:** (a) pestaña nueva «Diseño» en Configuración › Cotización; (b) panel dentro de «Fórmula» (choca con `b/4.21`); (c) ruta propia.
  - **P2 (producto/UX, 4.22-5) cómo se ve 1.280 px en `max-w-3xl`:** (a) caja con scroll horizontal al ancho real; (b) escalada con `transform`; (c) sin el tope de ancho.
  - **P3 (producto, 4.22-5) de dónde sale la hoja de la vista previa:** (a) un armador puro en TS con cifras de prueba; (b) sólo la estructura (ya no sería «el mismo componente»).
  - **P4 (datos, 4.22-6) 4-30:** (a) `validar_diseno()` rechaza publicar un diseño de más de N ítems (regla nueva, espejo TS; N sale de medir); (b) sin tope, sólo aviso; (c) la hoja divide.
- **Lo no obvio:**
  - La visibilidad que da el diseño sigue siendo la que compila la base al publicar; `visibilidadDelDiseno()` es su espejo para mostrar y avisar, no la autoridad.
  - `docs/COTIZADOR.md` dice que lo no dibujado entra como `{todos, null}`; el SQL sólo lo hace con el total y lo `aparte`. Se sigue el SQL.
  - **Límites del aviso:** sólo la suma directa (`op: 'suma'`); no sigue cadenas (suma de sumas), ni `restar`, ni `porcentaje_de`. Si dos sumandos quedan sin ver, o uno sin
    dibujar además del restringido, no avisa (no se deduce con dos incógnitas). Es un aviso, no una garantía: la base nunca deja de enviar el total.
  - `ponerNiveles()`: «todos» se omite en una sección; en una celda se escribe si su sección está restringida (la celda gana a su sección: omitirlo la dejaría restringida).
- **Para el coordinador:** en la fila del 4.22 de `docs/PLAN.md`, tras «Prompts: 3.», sumar «Se parte en 4.22-1 (lo puro: visibilidad del diseño, aviso de deducción y
  par ver/editar), 4.22-2 (la pestaña: secciones y celdas; guarda el borrador), 4.22-3 (variantes, interruptores, atajos, modos y tarjeta), 4.22-4 (el catálogo de tonos),
  4.22-5 (la vista previa) y 4.22-6 (4-30, rojo de datos); cada parte menos la última sale con `parcial`.» `docs/ESTADO.md`: «4.22-1, lo puro del editor del diseño».
  **4-30 sigue abierto** hasta el 4.22-6. `docs/COTIZADOR.md` (el límite del aviso) dirá que cubre las sumas directas.
