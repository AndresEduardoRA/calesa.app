// API pública del módulo `equipo` para el servidor. Con `client.ts`, lo único que `app/` u otro
// módulo puede importar.
//
// Este archivo mezcla código de servidor (`requerirSesion`, las actions, las lecturas) con
// componentes de cliente: lo importan los Server Components. Un Client Component de afuera no
// importa de acá (arrastraría `server-only` al navegador): importa `@/modules/equipo/client`.

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

// Acceso: ingresar, registrarse, recuperar
export { avisoDe, type Aviso } from './entities/avisos'
export { canjearAcceso } from './features/auth/canjear'
export { googleHabilitado } from './features/auth/proveedores'
export { cerrarSesion } from './features/auth/actions/cerrar-sesion'
export { FormularioIngreso } from './features/auth/components/formulario-ingreso'
export { FormularioNuevaContrasena } from './features/auth/components/formulario-nueva-contrasena'
export { FormularioRecuperar } from './features/auth/components/formulario-recuperar'
export { FormularioRegistro } from './features/auth/components/formulario-registro'
export { RegistroCerrado } from './features/auth/components/registro-cerrado'

// Perfil propio y preferencias
export { FormularioPerfil } from './features/perfil/components/formulario-perfil'
export { PreferenciasPerfil } from './features/perfil/components/preferencias-perfil'
export { ProveedorPreferencias } from './features/perfil/components/proveedor-preferencias'

// Roles y permisos
export { leerMatriz } from './composicion'
export { agruparPorModulo } from './entities/matriz'
export { MatrizDeRoles } from './features/roles/components/matriz-de-roles'
export { RoleBadge } from './features/roles/components/role-badge'

// Las personas del equipo
export { leerEquipo, leerVistaPreviaDeBaja } from './composicion'
export { idDePersona } from './entities/persona'
export { ListaEquipo } from './features/equipo/components/lista-equipo'

// Vistas guardadas de un listado (`<MenuDeVistas>` sale por `client.ts`)
export { leerVistas } from './composicion'
export type { VistaGuardada } from './entities/vista'

// Perspectiva «ver como» (el hook `usePerspectiva()` sale por `client.ts`)
export { BannerPerspectiva } from './features/perspectiva/components/banner-perspectiva'
export { ProveedorPerspectiva } from './features/perspectiva/components/proveedor-perspectiva'
