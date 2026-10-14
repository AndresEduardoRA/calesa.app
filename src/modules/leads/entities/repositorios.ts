// Lo que los casos de uso de `features/` necesitan de afuera, dicho como interfaces. La
// implementación (Supabase) vive en `infra/` y se la entrega `composicion.ts`.
import type { OpcionDeCampo, TipoDeLead, ValorDefecto } from '@/shared/lib/campos'
import type { Resultado } from '@/shared/lib/errores'
import type { CambiosDeCampoDeLead } from './cambios-de-campo'
import type { CampoDeLead, DatoDeLaEmpresa } from './campo'
import type { ImpactoDeCampo } from './impacto'

// Toda edición manda la versión que tenía en pantalla quien edita; la base responde `conflicto`
// si otra persona lo cambió, y devuelve la versión nueva para seguir editando sin recargar.
type Editado = { actualizadoEn: string }
type Creado = { id: string; actualizadoEn: string }

export type RepositorioCamposDeLead = {
  crear: (nuevo: {
    clave: string
    etiqueta: string
    tipo: TipoDeLead
    opciones: OpcionDeCampo[]
    requerido: boolean
    grupo: string | null
    enTabla: boolean
    filtrable: boolean
    soloCartera: boolean
    valorDefecto: ValorDefecto | null
    valorDefectoEmpresa: DatoDeLaEmpresa | null
  }) => Promise<Resultado<Creado>>
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    cambios: CambiosDeCampoDeLead
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

// Todos los campos, también los desactivados: quien consume filtra `activo`.
export type LectorDeLayoutDeLeads = () => Promise<Resultado<CampoDeLead[]>>
