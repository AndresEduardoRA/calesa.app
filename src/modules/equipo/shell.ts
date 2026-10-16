// La entrada del SHELL del módulo `equipo`: lo que el layout `(app)` necesita para dibujar el marco
// de toda pantalla (la sesión y sus permisos, la perspectiva, las preferencias, el banner y cerrar
// sesión). Existe aparte de `index.ts` porque ese barril reexporta los componentes de cada pantalla
// (la lista del equipo, la matriz de roles, los formularios de acceso…) y todo lo que el layout
// importe viaja en el JS de **todas** las pantallas. Sólo la importan `src/app/(app)/layout.tsx` y
// `src/app/(app)/_shell/` (lo cuida el lint). Agregar acá algo que no pinta el marco es un error.
export { requerirSesion } from './features/auth/sesion'
export { nombreVisible } from './entities/sesion'
export { puede } from '@/shared/lib/permisos'
export { cerrarSesion } from './features/auth/actions/cerrar-sesion'
export { ProveedorPreferencias } from './features/perfil/components/proveedor-preferencias'
export { BannerPerspectiva } from './features/perspectiva/components/banner-perspectiva'
export { ProveedorPerspectiva } from './features/perspectiva/components/proveedor-perspectiva'
