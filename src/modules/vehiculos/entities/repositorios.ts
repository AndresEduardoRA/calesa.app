// Lo que los casos de uso de `features/` necesitan de afuera, dicho como interfaces. La
// implementación (Supabase) vive en `infra/` y se la entrega `composicion.ts`.
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { Cursor, Pagina } from '@/shared/lib/paginacion'
import type { DatosDeVehiculo } from './esquema'
import type { Condicion } from './filtros'
import type { FotoEliminada, FotoSubida, Galeria } from './foto'
import type {
  LimpiezaPendiente,
  LoteDePapelera,
  ResultadoDeEnvio,
  ResultadoDePurgar,
  ResultadoDeRestaurar,
} from './papelera'
import type { LimpiezaDeVehiculo, UltimaLimpieza } from './limpieza'
import type { PermisoConAlcance } from './permisos'
import type { SubastaDeVehiculo } from './subasta-vehiculo'
import type { ColumnasDeSubasta, ValorDeAtributo } from './subasta'
import type { Vehiculo } from './vehiculo'
import type {
  CandidatoDeVinculo,
  RespuestaDeInteres,
  RespuestaDeVinculo,
  VehiculosDelLead,
} from './vehiculos-del-lead'
import type { Relaciones } from './vinculo'
import type { DatosDeVitrina, VistaPreviaDeVitrina, VitrinaDelOrigen } from './vitrina'

// Una página del inventario de un origen, de lo más nuevo a lo más viejo. La RLS decide qué ve
// quien llama: acá no se filtra por permiso.
export type BuscadorDeVehiculos = (pedido: {
  origenId: string
  condiciones: readonly Condicion[]
  cursor: Cursor | null
  tamano: number
}) => Promise<Resultado<Pagina<Vehiculo>>>

// null = no existe, está en la papelera o quien llama no lo ve: no se distinguen.
export type LectorDeVehiculo = (id: string) => Promise<Resultado<Vehiculo | null>>

// Un guardado que no salió puede decir qué campo lo frenó (la clave del formulario): el motivo se
// escribe al lado, no en un aviso suelto.
export type FalloAlGuardar = { ok: false; error: ErrorApp; campo?: string }

// La ficha se escribe sólo por RPC. El `id` del alta lo trae quien llama: reintentar no duplica.
export type RepositorioVehiculos = {
  crear: (pedido: {
    id: string
    origenId: string
    datos: DatosDeVehiculo
    // La consulta a apibara, si el alta vino de ahí: la base copia de ella el bruto, deriva la
    // fecha y el estado de la subasta y marca el vehículo como importado.
    consulta?: string
  }) => Promise<
    { ok: true; data: { id: string; numero: number; actualizadoEn: string } } | FalloAlGuardar
  >
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    datos: DatosDeVehiculo
  }) => Promise<{ ok: true; data: { actualizadoEn: string } } | FalloAlGuardar>
  // Vuelve a escribir la subasta de un vehículo: la consulta nueva (la base copia el bruto y deriva
  // de él fecha y estado) y lo que se decidió actualizar de la ficha, con la versión que tenía
  // quien pide.
  refrescarSubasta: (pedido: {
    id: string
    actualizadoEnEsperado: string
    consulta: string
    columnas: ColumnasDeSubasta
    atributos: Record<string, ValorDeAtributo>
  }) => Promise<
    | {
        ok: true
        data: { actualizadoEn: string; estado: string | null; subastaEn: string | null }
      }
    | FalloAlGuardar
  >
  // Qué de lo que se va a dar de alta ya está en el inventario (por VIN en cualquier origen y por
  // lote en éste). `vehiculoId` null = existe, pero quien pregunta no lo ve.
  repetidos: (pedido: {
    origenId: string
    claves: readonly ClaveDeBusqueda[]
  }) => Promise<Resultado<RepetidoEncontrado[]>>
}

export type ClaveDeBusqueda = { vin?: string; lote?: string; plataforma?: string }

// `posicion` es el índice de la clave en la lista que se mandó (desde 0).
export type RepetidoEncontrado = { posicion: number; vehiculoId: string | null }

// La subasta de un vehículo: lo que dice la base y lo que trajo apibara. null = no se ve o no existe.
export type LectorDeSubasta = (vehiculoId: string) => Promise<Resultado<SubastaDeVehiculo | null>>

// Lo que dice la base de la limpieza automática de un vehículo. null = no existe, está en la
// papelera o quien llama no lo ve.
export type LectorDeLimpiezaAutomatica = (
  vehiculoId: string,
) => Promise<Resultado<LimpiezaDeVehiculo | null>>

// La última noche de la limpieza, para quien puede vaciar la papelera. null = no hay, o no puede.
export type LectorDeUltimaLimpieza = () => Promise<Resultado<UltimaLimpieza | null>>

// «Conservar» se escribe sólo por RPC. Manda el estado deseado (no alterna): repetirlo no cambia
// nada, así que no lleva la versión de la ficha ni la mueve.
export type RepositorioDeLimpieza = {
  conservar: (pedido: {
    vehiculoId: string
    conservar: boolean
  }) => Promise<Resultado<{ conservado: boolean }>>
}

// El bruto de una consulta a apibara de quien pregunta (de las últimas 24 h): con él el servidor
// compara el refresco con lo guardado. Viene de la base, no del navegador.
export type LectorDeConsultaDeApibara = (
  consulta: string,
) => Promise<Resultado<Record<string, unknown>>>

// Las fotos de un vehículo y su versión. Lo que ve cada quien lo decide la RLS.
export type LectorDeGaleria = (vehiculoId: string) => Promise<Resultado<Galeria>>

// Qué pasó con cada foto que se pidió agregar, por su hash: las que ya estaban vuelven en
// `repetidas` (reintentar es inocuo) y las que no entraron por el tope, en `sinLugar`.
export type FotosAgregadas = {
  actualizadoEn: string | null
  agregadas: string[]
  repetidas: string[]
  sinLugar: string[]
}

// Las fotos se escriben sólo por RPC. Agregar no lleva versión (sumar no pisa a nadie); mover,
// fijar portada y eliminar mandan la de las fotos, que es otra que la de la ficha.
export type RepositorioFotos = {
  agregar: (pedido: {
    vehiculoId: string
    // Con `orden` y `esPortada` cuando es deshacer un eliminar: la foto vuelve a su lugar.
    // `origenUrl`: de dónde se bajó, cuando vino de apibara (con eso se sabe cuáles faltan).
    fotos: readonly (FotoSubida &
      Partial<Pick<FotoEliminada, 'orden' | 'esPortada'>> & { origenUrl?: string })[]
  }) => Promise<Resultado<FotosAgregadas>>
  mover: (pedido: {
    vehiculoId: string
    actualizadoEnEsperado: string
    fotoId: string
    // «Después de» esta foto; null = primera.
    despuesDe: string | null
  }) => Promise<Resultado<{ actualizadoEn: string }>>
  fijarPortada: (pedido: {
    vehiculoId: string
    actualizadoEnEsperado: string
    fotoId: string
  }) => Promise<Resultado<{ actualizadoEn: string }>>
  // `foto` es la que se eliminó, tal como estaba; null = ya no estaba.
  eliminar: (pedido: {
    vehiculoId: string
    actualizadoEnEsperado: string
    fotoId: string
  }) => Promise<Resultado<{ actualizadoEn: string | null; foto: FotoEliminada | null }>>
}

// El vínculo activo, su historial y los interesados, con el nombre de cada lead sólo si quien
// llama lo ve.
export type LectorDeRelaciones = (vehiculoId: string) => Promise<Resultado<Relaciones>>

// De estos ids, cuáles puede editar quien llama: lo responde la base.
export type ConsultaDeEditables = (ids: readonly string[]) => Promise<Resultado<string[]>>

// Publicar se escribe sólo por RPC, con la versión del vehículo y el estado entero de la vitrina.
export type RepositorioVitrina = {
  publicar: (
    pedido: { vehiculoId: string; actualizadoEnEsperado: string } & DatosDeVitrina,
  ) => Promise<{ ok: true; data: { actualizadoEn: string } } | FalloAlGuardar>
}

// Lo que vería un visitante y por qué no lo ve; null = quien llama no ve el vehículo.
export type LectorDeVistaPrevia = (
  vehiculoId: string,
) => Promise<Resultado<VistaPreviaDeVitrina | null>>

// Lo que hace falta para que algo de un origen se vea en la web.
export type LectorDeVitrinaDelOrigen = (origenId: string) => Promise<Resultado<VitrinaDelOrigen>>

// De estos ids, sobre cuáles tiene quien llama este permiso: lo responde la base.
export type ConsultaDePermiso = (
  ids: readonly string[],
  clave: PermisoConAlcance,
) => Promise<Resultado<string[]>>

// La papelera se escribe sólo por RPC, y las tres operaciones devuelven un resultado parcial.
// Enviar lleva la versión de cada vehículo; restaurar y purgar, la del lote, y sin `vehiculos` son
// el lote entero.
type SobreUnLote = {
  loteId: string
  actualizadoEnEsperado: string
  vehiculos?: readonly string[]
}
export type RepositorioPapelera = {
  enviar: (
    vehiculos: readonly { id: string; actualizadoEn: string }[],
  ) => Promise<Resultado<ResultadoDeEnvio>>
  restaurar: (pedido: SobreUnLote) => Promise<Resultado<ResultadoDeRestaurar>>
  purgar: (pedido: SobreUnLote) => Promise<Resultado<ResultadoDePurgar>>
}

// Los lotes abiertos: los propios o, con `vehiculos.papelera.purgar`, todos.
export type LectorDePapelera = () => Promise<Resultado<LoteDePapelera[]>>

// Lo que la limpieza de Storage tiene atrasado; null = nada, o no le corresponde saberlo.
export type LectorDeLimpiezaPendiente = () => Promise<Resultado<LimpiezaPendiente | null>>

// Los vehículos de un lead que quien mira ve (vinculados, interesados, historial). Un lead que no
// ve da las listas vacías: la página ya decidió antes si lo muestra.
export type LectorDeVehiculosDelLead = (leadId: string) => Promise<Resultado<VehiculosDelLead>>

// Buscar entre los vehículos que quien mira ve, con su estado frente a un lead.
export type BuscadorDeCandidatos = (pedido: {
  leadId: string
  texto: string
}) => Promise<Resultado<CandidatoDeVinculo[]>>

// El vínculo y el interés se escriben sólo por RPC. Un rechazo con `hint` dice el campo (`nota`).
export type FalloDeVinculo = { ok: false; error: ErrorApp; campo?: string }
export type RepositorioDeVinculo = {
  // `leadId` nulo desvincula (una acción sobre el vehículo: no pide el lead).
  vincular: (pedido: {
    vehiculoId: string
    actualizadoEnEsperado: string
    leadId: string | null
  }) => Promise<{ ok: true; data: RespuestaDeVinculo } | FalloDeVinculo>
  marcarInteres: (pedido: {
    vehiculoId: string
    leadId: string
    nota: string | null
  }) => Promise<{ ok: true; data: RespuestaDeInteres } | FalloDeVinculo>
  quitarInteres: (pedido: {
    vehiculoId: string
    leadId: string
  }) => Promise<{ ok: true; data: RespuestaDeInteres } | FalloDeVinculo>
}
