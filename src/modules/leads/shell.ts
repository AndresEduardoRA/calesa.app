// La entrada del SHELL del módulo `leads`: lo que el layout `(app)` necesita para «Nuevo lead» (el
// botón de la barra, la tecla `N` y el drawer, desde cualquier pantalla). Existe aparte de `index.ts`
// porque ese barril reexporta la ficha, el listado, el kanban, la papelera y el importador, y todo lo
// que el layout importe viaja en el JS de **todas** las pantallas (`docs/RENDIMIENTO.md`). Sólo la
// importan `src/app/(app)/layout.tsx` y `src/app/(app)/_shell/` (lo cuida el lint).
export { leerContextoDeAlta, leerLayoutDeLeads } from './composicion'
export { AltaDeLead } from './features/alta/components/alta-de-lead'
