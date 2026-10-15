// Lo que los casos de uso de `features/` necesitan de afuera, dicho como interfaces. La
// implementación (Supabase) vive en `infra/` y se la entrega `composicion.ts`.
import type { OpcionDeCampo, TipoDeLead, ValorDefecto } from '@/shared/lib/campos'
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { Cursor, Pagina } from '@/shared/lib/paginacion'
import type { ContextoDeAlta, DatosDeAlta } from './alta'
import type { CambiosDeCampoDeLead } from './cambios-de-campo'
import type { CampoDeLead, DatoDeLaEmpresa } from './campo'
import type { CondicionDeLead } from './filtros'
import type { CambiosDeLead } from './edicion'
import type { LeadDeFicha, OrigenConEstado } from './ficha'
import type { ImpactoDeCampo } from './impacto'
import type { FilaDeLead } from './listado'
import type { Verificacion } from './verificacion'

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

// --- El alta rápida ---------------------------------------------------------------------------------

export type PedidoDeAlta = {
  // El del intento: lo genera el navegador al abrir el drawer y lo conserva en cada reintento.
  id: string
  datos: DatosDeAlta
  // «Tomar lead»: la persona aceptó adoptar el lead sin dueño de ese teléfono.
  adoptar: boolean
}

// Lo que pasó. Un duplicado no es un error: es un valor (`existe`, `de_otro`, `limbo`) y no se
// creó nada. `repetido`: este mismo intento ya había entrado y se devuelve lo mismo.
export type ResultadoDeAlta =
  | { resultado: 'creado' | 'adoptado'; id: string; numero: number; repetido: boolean }
  | { resultado: 'existe' | 'de_otro' | 'limbo'; verificacion: Verificacion }

// Un error de la base con el dato que lo causó, si lo dice: la clave del formulario es el mismo
// `hint` (`telefono_principal`, `atributos.signo`, `seguimiento.titulo`).
export type FalloDeAlta = { ok: false; error: ErrorApp; campo?: string }

export type RepositorioDeAlta = {
  crear: (pedido: PedidoDeAlta) => Promise<{ ok: true; data: ResultadoDeAlta } | FalloDeAlta>
  // `telefono` como se escribió: la base lo normaliza con el código de país de la empresa.
  verificar: (telefono: string) => Promise<Resultado<Verificacion>>
}

// Lo que el drawer necesita de la base, en un viaje.
export type LectorDeContextoDeAlta = () => Promise<Resultado<ContextoDeAlta>>

// --- El listado -------------------------------------------------------------------------------------

export type PedidoDeListado = {
  condiciones: readonly CondicionDeLead[]
  cursor: Cursor | null
  tamano: number
  // Las claves de los campos «en tabla»: de `atributos` sólo se pide lo que se dibuja.
  clavesDeTabla: readonly string[]
}

// Una página de leads de `leads_vista`. Lo que hay lo decide la RLS: acá no se filtra por permiso.
export type BuscadorDeLeads = (pedido: PedidoDeListado) => Promise<Resultado<Pagina<FilaDeLead>>>

// Todos los orígenes de lead, también los desactivados: un lead con uno apagado se sigue nombrando.
export type LectorDeOrigenesDeLead = () => Promise<Resultado<OrigenConEstado[]>>

// En el navegador: un lead por su id para el drawer. `null` = no existe o no lo ve (la papelera, el
// limbo y lo ajeno son lo mismo para quien mira).
export type LectorDeLeadRapido = (id: string) => Promise<Resultado<FilaDeLead | null>>

// --- La ficha ---------------------------------------------------------------------------------------

// La ficha de un lead, en un viaje (`lead_ficha()`). `null` = no existe o no lo ve: la papelera, el
// limbo y lo ajeno son lo mismo para quien mira.
export type LectorDeFicha = (id: string) => Promise<Resultado<LeadDeFicha | null>>

export type PedidoDeGuardado = {
  id: string
  // La versión que tenía en pantalla quien edita.
  actualizadoEnEsperado: string
  // Sólo lo que cambió.
  cambios: CambiosDeLead
}

export type RepositorioDeFicha = {
  guardar: (
    pedido: PedidoDeGuardado,
  ) => Promise<{ ok: true; data: Editado } | { ok: false; error: ErrorApp; campo?: string }>
}
