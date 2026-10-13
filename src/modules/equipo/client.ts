// La entrada de CLIENTE del módulo `equipo`: lo que puede importar un Client Component de `app/`
// o de otro módulo (`@/modules/equipo/client`). Sólo hooks, componentes de cliente o puros, y
// tipos de `entities/`. Nada de servidor: para eso está `index.ts`.
export { RoleBadge } from './features/roles/components/role-badge'
export { usePerspectiva } from './features/perspectiva/hooks/use-perspectiva'
export type { Perspectiva, RolParaVerComo } from './entities/perspectiva'

// Vistas guardadas de un listado: el menú que las aplica, las guarda y las elimina.
export { MenuDeVistas } from './features/vistas/components/menu-de-vistas'
export type { ParamsDeVista, VistaGuardada } from './entities/vista'
