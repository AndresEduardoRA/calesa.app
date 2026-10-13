// API pública del módulo `vehiculos` para el servidor. Con `client.ts`, lo único que `app/` u
// otro módulo puede importar. Mezcla lecturas de servidor con componentes de cliente: lo importan
// los Server Components. Un Client Component de afuera importa `@/modules/vehiculos/client`.

// El inventario: leer una página de un origen y un vehículo
export { buscarVehiculos, leerVehiculo } from './composicion'
export type { Vehiculo } from './entities/vehiculo'

// Qué ve y qué puede hacer la persona
export {
  origenElegido,
  origenesVisibles,
  permisoDeAlta,
  puedeEditar,
  type PermisoDeAlta,
} from './entities/permisos'

// Los filtros de un origen, desde su layout: el esquema que dibuja FilterShell y las condiciones
// que entiende `buscarVehiculos()`
export { condicionesDe, esquemaDeFiltros } from './entities/filtros'

// Pantallas
export { ListadoDeVehiculos } from './features/listado/components/listado-de-vehiculos'
export { TarjetaVehiculo } from './features/listado/components/tarjeta-vehiculo'
export { FichaDeVehiculo } from './features/ficha/components/ficha-de-vehiculo'

// Alta y edición: el panel (va una vez por pantalla) y el botón que abre la edición
export { PanelDeVehiculo } from './features/alta/components/panel-de-vehiculo'
export { BotonEditarVehiculo } from './features/alta/components/botones'
export { CLAVE_DE_EDICION } from './features/alta/claves'
