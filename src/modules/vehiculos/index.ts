// API pública del módulo `vehiculos` para el servidor. Con `client.ts`, lo único que `app/` u
// otro módulo puede importar. Mezcla lecturas de servidor con componentes de cliente: lo importan
// los Server Components. Un Client Component de afuera importa `@/modules/vehiculos/client`.

// El inventario: leer una página de un origen y un vehículo
export {
  buscarVehiculos,
  leerGaleria,
  leerRelaciones,
  leerSubasta,
  leerVehiculo,
} from './composicion'
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
export { editablesDe, eliminablesDe } from './features/permisos/editables'

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

// La limpieza automática de los vehículos de subasta que nadie compró: lo que dice la base de cada
// vehículo (cuándo se va, si se conserva), la ventana del aviso y la última noche. La regla es de
// la base; acá sólo se lee y se dice. Las lecturas no tumban la pantalla.
export { limpiezaDe, ultimaLimpieza } from './features/limpieza/lecturas'
export {
  hoyEnZona,
  limiteDeAviso,
  resumenDeUltimaLimpieza,
  seLimpiaPronto,
  VENTANA_DE_AVISO_DIAS,
  type LimpiezaDeVehiculo,
  type UltimaLimpieza,
} from './entities/limpieza'
export { AvisoDeLimpieza } from './features/limpieza/components/aviso-de-limpieza'

// La papelera: enviar (desde la ficha y, en lote, desde el listado), restaurar y purgar
export { leerPapelera } from './composicion'
export { limpiezaPendiente } from './features/papelera/lecturas'
export {
  motivoParaNoEnviar,
  permisoDePapelera,
  puedeAbrirLaPapelera,
  puedePurgar,
  type LimpiezaPendiente,
  type LoteDePapelera,
  type PermisoDePapelera,
} from './entities/papelera'
export { MenuDeVehiculo } from './features/papelera/components/menu-de-vehiculo'
export { PapeleraDeVehiculos } from './features/papelera/components/papelera-de-vehiculos'

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
export { SIN_APIBARA, type DisponibilidadDeApibara } from './entities/apibara'

// El vínculo a un lead y los interesados, de sólo lectura (se escriben desde la ficha del lead)
export { VinculoEInteresados } from './features/vinculo/components/vinculo-e-interesados'
export type { Relaciones } from './entities/vinculo'

// La subasta de un vehículo de subasta: su fecha, su estado, cuándo se consultó y refrescarla.
export { BloqueDeSubasta } from './features/subasta/components/bloque-de-subasta'
export { fotosPorTraerDe, type SubastaDeVehiculo } from './entities/subasta-vehiculo'
