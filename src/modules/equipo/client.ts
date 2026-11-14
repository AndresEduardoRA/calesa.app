// La entrada de CLIENTE del módulo `equipo`: lo que puede importar un Client Component de `app/`
// o de otro módulo (`@/modules/equipo/client`). Sólo hooks, componentes de cliente o puros, y
// tipos de `entities/`. Nada de servidor: para eso está `index.ts`.
export { RoleBadge } from './features/roles/components/role-badge'
export { usePerspectiva } from './features/perspectiva/hooks/use-perspectiva'
export type { Perspectiva, RolParaVerComo } from './entities/perspectiva'

// Vistas guardadas de un listado: el menú que las aplica, las guarda y las elimina.
export { MenuDeVistas } from './features/vistas/components/menu-de-vistas'
export type { ParamsDeVista, VistaGuardada } from './entities/vista'

// Las preferencias de la persona que se guardan desde otra pantalla (`tablero.widgets`, `vehiculos.vista`): la acción valida con `esquemaPreferencia` y escribe sólo en la fila de quien
// actúa (la RLS lo repite); aquí sólo se reexporta, como `completarRecordatorio` en `leads/client.ts`.
export { guardarPreferencia } from './features/perfil/actions/guardar-preferencia'
export {
  CLAVE_DE_VISTA_DE_VEHICULOS,
  CLAVE_WIDGETS_DEL_TABLERO,
  type WidgetsDelTablero,
} from './entities/preferencias'
