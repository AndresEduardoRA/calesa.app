// Toda lista de un módulo (una tabla de registros, o la que elige entre tabla y tarjetas por el ancho) usa el patrón de lista de
// `@/shared/ui/lista` (`.claude/rules/ui.md`, 9i): una sola vista elegida en el servidor, el nombre y el «⋯» pegados, un clic en
// cualquier parte de la fila abre su resumen y con el teclado se alcanza el nombre. `scripts/guardas/listas-con-patron.test.ts` falla
// si un archivo de `src/modules` dibuja una tabla (`<Table…>`, `<table>`) o usa `CORTE_DE_LA_TABLA` sin importar el patrón y sin figurar
// acá con su motivo. Un archivo que ya lo usa no puede figurar: la excepción se saca cuando deja de serlo.
export const LISTAS_SIN_PATRON: Record<string, string> = {
  'src/modules/equipo/features/roles/components/matriz-de-roles.tsx':
    'es una matriz de permisos (roles contra permisos), no una lista de registros: no tiene resumen ni «⋯» por fila',
  'src/modules/cotizaciones/features/hoja/components/tabla-de-la-ayuda.tsx':
    'es una tabla de referencia de sólo lectura en un panel, no una lista de registros: no tiene resumen ni «⋯» por fila',
}
