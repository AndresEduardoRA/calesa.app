// La entrada del SHELL del módulo `leads`: lo que el layout `(app)` necesita para «Nuevo lead» (el
// botón de la barra, la tecla `N` y el drawer, desde cualquier pantalla). Existe aparte de `index.ts`
// porque ese barril reexporta la ficha, el listado, el kanban, la papelera y el importador, y todo lo
// que el layout importe viaja en el JS de **todas** las pantallas (`docs/RENDIMIENTO.md`). Sólo la
// importan `src/app/(app)/layout.tsx` y `src/app/(app)/_shell/` (lo cuida el lint). «Nuevo lead» no recibe nada del servidor: lee lo que
// necesita desde el navegador al abrirse (`infra/contexto-de-alta.client.ts`).
export { AltaDeLead } from './features/alta/components/alta-de-lead'
// «Escribirle por chat» del aviso «Lo tiene …» (7.11-2): un booleano del layout (`chat.participar`), porque `leads` no importa `chat`.
export { ProveedorDeEscribirPorChat } from './features/chat/components/proveedor-de-escribir-por-chat'
