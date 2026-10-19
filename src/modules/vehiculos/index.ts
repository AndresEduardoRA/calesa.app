// API pública del módulo `vehiculos` para el servidor: lecturas, reglas y tipos. Con `client.ts`, lo único que
// `app/` u otro módulo puede importar. No exporta componentes (una pantalla paga en JS todo lo que reexporta lo
// que importa): los de cada pantalla salen por `pantallas/<pantalla>.ts` (sólo `src/app`) y los de otros módulos
// por `client.ts`. Un Client Component de afuera importa `@/modules/vehiculos/client`.

// El inventario: leer una página de un origen y un vehículo
export {
  buscarVehiculos,
  leerGaleria,
  leerRelaciones,
  leerSubasta,
  leerVehiculo,
} from './composicion'
export { MAXIMO_DE_PAGINA_DE_VEHICULOS } from './entities/vehiculo'
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

// Alta y edición: la clave de su URL (el panel y el botón son de `pantallas/ficha`)
export { CLAVE_DE_EDICION } from './features/alta/claves'
export { SIN_APIBARA, type DisponibilidadDeApibara } from './entities/apibara'

// El vínculo a un lead y los interesados: lo que lee el bloque de la ficha del vehículo y la sección «Vehículos»
// de la ficha del lead (vive acá y la compone `app/`: `leads` no importa `vehiculos`; sus componentes salen
// por `pantallas/ficha` y `pantallas/vehiculos-del-lead`)
export type { Relaciones } from './entities/vinculo'
export { leerVehiculosDelLead } from './composicion'
export type { VehiculosDelLead } from './entities/vehiculos-del-lead'
export { opcionesDeVehiculoDelLead, type OpcionDeVehiculo } from './features/vinculo/lecturas'

// La subasta de un vehículo de subasta: su fecha, su estado y cuándo se consultó (`<BloqueDeSubasta>`: `pantallas/ficha`).
export { fotosPorTraerDe, type SubastaDeVehiculo } from './entities/subasta-vehiculo'
