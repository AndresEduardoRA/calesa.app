// Lo que los casos de uso de `features/` necesitan de afuera, dicho como interfaces. La
// implementación (Supabase) vive en `infra/` y se la entrega `composicion.ts`.
import type { Resultado } from '@/shared/lib/errores'
import type { CambiosDeCampo, CampoDeLayout, OpcionDeCampo, TipoDeCampo } from './campo'
import type { Categoria } from './categoria'
import type { ImpactoDeCampo } from './impacto'
import type { Genero, OrigenConUso, TipoDeOrigen } from './origen'

// Toda edición manda la versión que tenía en pantalla quien edita; la base responde `conflicto`
// si otra persona lo cambió, y devuelve la versión nueva para seguir editando sin recargar.
type Editado = { actualizadoEn: string }
type Creado = { id: string; actualizadoEn: string }

export type RepositorioOrigenes = {
  crear: (nuevo: {
    clave: string
    nombre: string
    sustantivo: string
    genero: Genero
    tipo: TipoDeOrigen
    color?: string
    apibaraPlataformas?: string[]
  }) => Promise<Resultado<Creado>>
  // Lo que viene `undefined` no se toca. El tipo y la clave no se editan.
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    nombre?: string
    sustantivo?: string
    genero?: Genero
    color?: string
    activo?: boolean
    apibaraPlataformas?: string[]
  }) => Promise<Resultado<Editado>>
  eliminar: (pedido: { id: string; actualizadoEnEsperado: string }) => Promise<Resultado<null>>
}

export type RepositorioCampos = {
  crear: (nuevo: {
    origenId: string
    clave: string
    etiqueta: string
    tipo: TipoDeCampo
    opciones: OpcionDeCampo[]
    requerido: boolean
    grupo: string | null
    enTarjeta: boolean
    filtrable: boolean
    publicoWeb: boolean
    claveApibara: string | null
  }) => Promise<Resultado<Creado>>
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    cambios: CambiosDeCampo
  }) => Promise<Resultado<Editado>>
  // «Después de X»; null = primero.
  mover: (pedido: {
    id: string
    despuesDe: string | null
    actualizadoEnEsperado: string
  }) => Promise<Resultado<Editado>>
  eliminar: (pedido: { id: string; actualizadoEnEsperado: string }) => Promise<Resultado<null>>
  impacto: (id: string) => Promise<Resultado<ImpactoDeCampo>>
}

export type RepositorioCategorias = {
  crear: (nueva: {
    origenId: string
    nombre: string
    padreId: string | null
  }) => Promise<Resultado<Creado>>
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    nombre?: string
    activa?: boolean
  }) => Promise<Resultado<Editado>>
  mover: (pedido: {
    id: string
    despuesDe: string | null
    actualizadoEnEsperado: string
  }) => Promise<Resultado<Editado>>
  eliminar: (pedido: { id: string; actualizadoEnEsperado: string }) => Promise<Resultado<null>>
}

export type LayoutDeOrigen = { campos: CampoDeLayout[]; categorias: Categoria[] }

// Todos, también los inactivos: es lo que edita la pantalla.
export type LectorDeOrigenes = () => Promise<Resultado<OrigenConUso[]>>
// `conUso` pide contar vehículos por categoría: sólo quien gestiona orígenes puede.
export type LectorDeLayout = (
  origenId: string,
  opciones: { conUso: boolean },
) => Promise<Resultado<LayoutDeOrigen>>
