import { alcanceDe, type Permisos } from '@/shared/lib/permisos'

// De dónde se lee una página del inventario (4.16-2b, cierra 4-23). Quien ve «propios» y casi nada es suyo recorría el origen entero
// por la tabla (la «chica», con 3 propios y 250.000 vehículos: 32,3 ms); la función `vehiculos_inventario()` lee sus rutas por índice
// (el origen, lo creado por quien mira y su cartera de leads) y baja a 2,5 ms. Quien ve «todos» sigue por la tabla: su ruta es el
// origen y ahí la tabla ya es la más barata. Las dos traen las mismas filas, con la misma RLS (`e2e/vehiculos-inventario-postgrest.spec.ts`).
export type FuenteDelInventario = 'vehiculos' | 'vehiculos_inventario'

// Es un camino, no un permiso: lo que cada quien ve lo sigue decidiendo la RLS, y la función responde bien a cualquiera. Una fuente mal
// elegida sólo cuesta tiempo. Bajo «Ver como», `permisos` puede ser el rol simulado; la base elige la ruta con los permisos reales.
export function fuenteDelInventario(permisos: Permisos, origenId: string): FuenteDelInventario {
  return alcanceDe(permisos, 'vehiculos.ver', origenId) === 'propios'
    ? 'vehiculos_inventario'
    : 'vehiculos'
}
