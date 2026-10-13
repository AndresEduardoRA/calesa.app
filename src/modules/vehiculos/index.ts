// API pública del módulo `vehiculos` para el servidor. Con `client.ts`, lo único que `app/` u
// otro módulo puede importar. Mezcla lecturas de servidor con componentes de cliente: lo importan
// los Server Components. Un Client Component de afuera importa `@/modules/vehiculos/client`.

// El inventario: leer una página de un origen y un vehículo
export { buscarVehiculos, leerGaleria, leerRelaciones, leerVehiculo } from './composicion'
export type { Vehiculo } from './entities/vehiculo'
export type { Galeria } from './entities/foto'

// Qué ve y qué puede hacer la persona
export {
  origenElegido,
  origenesVisibles,
  permisoDeAlta,
  type PermisoDeAlta,
} from './entities/permisos'
// De estos vehículos, cuáles puede editar: lo propio se sabe acá; lo vinculado a un lead de su
// cartera, se le pregunta a la base
export { editablesDe } from './features/permisos/editables'

// Los filtros de un origen, desde su layout: el esquema que dibuja FilterShell y las condiciones
// que entiende `buscarVehiculos()`
export { condicionesDe, esquemaDeFiltros } from './entities/filtros'

// La vitrina: qué se ve en la web pública y quién publica. Las dos lecturas no tumban la pantalla
export { vistaPreviaDe, vitrinaDelOrigen } from './features/vitrina/lecturas'
export {
  permisoDeVitrina,
  type PermisoDeVitrina,
  type VistaPreviaDeVitrina,
} from './entities/vitrina'
export { BotonDeVitrina } from './features/vitrina/components/boton-de-vitrina'
export { InsigniaDeVitrina } from './features/vitrina/components/insignia-de-vitrina'
export { PanelDeVitrina } from './features/vitrina/components/panel-de-vitrina'

// Pantallas
export { ListadoDeVehiculos } from './features/listado/components/listado-de-vehiculos'
export { TarjetaVehiculo } from './features/listado/components/tarjeta-vehiculo'
export { CabeceraDeVehiculo } from './features/ficha/components/cabecera-de-vehiculo'
export { FichaDeVehiculo } from './features/ficha/components/ficha-de-vehiculo'

// Las fotos: subir, portada, orden y eliminar
export { SeccionDeFotos } from './features/fotos/components/seccion-de-fotos'
export { EsqueletoDeFotos } from './features/fotos/components/esqueleto-de-fotos'

// Alta y edición: el panel (va una vez por pantalla) y el botón que abre la edición
export { PanelDeVehiculo } from './features/alta/components/panel-de-vehiculo'
export { BotonEditarVehiculo } from './features/alta/components/botones'
export { CLAVE_DE_EDICION } from './features/alta/claves'

// El vínculo a un lead y los interesados, de sólo lectura (se escriben desde la ficha del lead)
export { VinculoEInteresados } from './features/vinculo/components/vinculo-e-interesados'
export type { Relaciones } from './entities/vinculo'
