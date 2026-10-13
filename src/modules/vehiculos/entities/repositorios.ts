// Lo que los casos de uso de `features/` necesitan de afuera, dicho como interfaces. La
// implementación (Supabase) vive en `infra/` y se la entrega `composicion.ts`.
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { Cursor, Pagina } from '@/shared/lib/paginacion'
import type { DatosDeVehiculo } from './esquema'
import type { Condicion } from './filtros'
import type { FotoEliminada, FotoSubida, Galeria } from './foto'
import type { Vehiculo } from './vehiculo'
import type { Relaciones } from './vinculo'

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
  }) => Promise<
    { ok: true; data: { id: string; numero: number; actualizadoEn: string } } | FalloAlGuardar
  >
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    datos: DatosDeVehiculo
  }) => Promise<{ ok: true; data: { actualizadoEn: string } } | FalloAlGuardar>
}

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
    fotos: readonly (FotoSubida & Partial<Pick<FotoEliminada, 'orden' | 'esPortada'>>)[]
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
