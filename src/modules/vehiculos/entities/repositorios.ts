// Lo que los casos de uso de `features/` necesitan de afuera, dicho como interfaces. La
// implementación (Supabase) vive en `infra/` y se la entrega `composicion.ts`.
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { Cursor, Pagina } from '@/shared/lib/paginacion'
import type { DatosDeVehiculo } from './esquema'
import type { Condicion } from './filtros'
import type { Vehiculo } from './vehiculo'

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
