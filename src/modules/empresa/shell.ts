// La entrada del SHELL del módulo `empresa`: lo que el layout `(app)` necesita para dibujar el marco
// de toda pantalla (los ajustes mínimos y los tipos de cambio vigentes de la barra superior). Existe
// aparte de `index.ts` porque ese barril reexporta los formularios de Configuración › Empresa, y todo
// lo que el layout importe viaja en el JS de **todas** las pantallas. Sólo la importan
// `src/app/(app)/layout.tsx` y `src/app/(app)/_shell/` (lo cuida el lint).
export { getAjustes, getTiposCambio } from './composicion'
export { TiposCambioVigentes } from './features/tipos-cambio/components/tipos-cambio-vigentes'
