// API pública del módulo `equipo` para el servidor: sesión y permisos, lecturas, actions, reglas y tipos. Con
// `client.ts`, lo único que `app/` u otro módulo puede importar. No exporta componentes (una pantalla paga en JS
// todo lo que reexporta lo que importa): los de cada pantalla salen por `pantallas/<pantalla>.ts` (sólo
// `src/app`), los del marco de toda pantalla por `shell.ts` y los de otros módulos por `client.ts`. Un Client
// Component de afuera no importa de acá (arrastraría `server-only` al navegador): importa
// `@/modules/equipo/client`.

// Sesión y permisos
export {
  cerrarSiInactiva,
  getPermisos,
  requerirSesion,
  requerirSesionDeEnlace,
} from './features/auth/sesion'
export { nombreVisible, sinRol, type Sesion } from './entities/sesion'
// `puede()` y el catálogo viven en `shared` para que `entities/` de cualquier módulo los use
// (docs/DECISIONES.md); se reexportan porque esta es su puerta natural.
export { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'

// Acceso: ingresar, registrarse, recuperar (los formularios: `pantallas/ingreso`, `registro`, `recuperar`, `nueva-contrasena`)
export { avisoDe, type Aviso } from './entities/avisos'
export { canjearAcceso } from './features/auth/canjear'
export { googleHabilitado } from './features/auth/proveedores'
export { cerrarSesion } from './features/auth/actions/cerrar-sesion'

// Roles y permisos (la matriz: `pantallas/roles`)
export { leerMatriz } from './composicion'
export { agruparPorModulo } from './entities/matriz'

// Las personas del equipo (la lista: `pantallas/equipo`)
export { leerEquipo, leerPersona, leerSoloYo, leerVistaPreviaDeBaja } from './composicion'
export { filtroDelEquipoDesde } from './entities/lista-equipo'
export { idDePersona } from './entities/persona'

// Vistas guardadas de un listado (`<MenuDeVistas>` sale por `client.ts`)
export { leerVistas } from './composicion'
export type { VistaGuardada } from './entities/vista'
