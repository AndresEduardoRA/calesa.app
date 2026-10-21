// Toda lista de un módulo (una tabla de registros, o la que elige entre tabla y tarjetas por el ancho) usa el patrón de lista de
// `@/shared/ui/lista` (`.claude/rules/ui.md`, 9i): una sola vista elegida en el servidor, el nombre y el «⋯» pegados, un clic en
// cualquier parte de la fila abre su resumen y con el teclado se alcanza el nombre. `scripts/guardas/listas-con-patron.test.ts` falla
// si un archivo de `src/modules` dibuja una tabla (`<Table…>`, `<table>`) o usa `CORTE_DE_LA_TABLA` sin importar el patrón y sin figurar
// acá con su motivo. Un archivo que ya lo usa no puede figurar: la excepción se saca cuando deja de serlo.
export const LISTAS_SIN_PATRON: Record<string, string> = {
  'src/modules/equipo/features/equipo/components/tabla-equipo.tsx':
    'la lista del equipo todavía no tiene resumen: cada persona se gestiona desde su menú («⋯»). Entra al patrón cuando lo tenga (candidato en docs/PLAN.md)',
  'src/modules/equipo/features/equipo/components/fila-persona.tsx':
    'es la fila de tabla-equipo.tsx: sigue su suerte',
  'src/modules/equipo/features/roles/components/matriz-de-roles.tsx':
    'es una matriz de permisos (roles contra permisos), no una lista de registros: no tiene resumen ni «⋯» por fila',
  'src/modules/equipo/features/roles/components/grupo-matriz.tsx':
    'es un grupo de la matriz de roles: sigue la suerte de matriz-de-roles.tsx',
  'src/modules/equipo/features/roles/components/tabla-de-roles.tsx':
    'es la tabla de la matriz de roles desde 768 px (por debajo, lista-del-rol.tsx apila cada permiso con su control, 5a-16): sigue la suerte de matriz-de-roles.tsx',
}
