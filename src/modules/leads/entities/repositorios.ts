// Lo que los casos de uso de `features/` necesitan de afuera, dicho como interfaces. La
// implementación (Supabase) vive en `infra/` y se la entrega `composicion.ts`.
import type { OpcionDeCampo, TipoDeLead, ValorDefecto } from '@/shared/lib/campos'
import type { ErrorApp, Resultado } from '@/shared/lib/errores'
import type { Cursor, Pagina } from '@/shared/lib/paginacion'
import type { ContextoDeAlta, DatosDeAlta, TipoDeSeguimiento } from './alta'
import type { CambiosDeCampoDeLead } from './cambios-de-campo'
import type { CampoDeLead, DatoDeLaEmpresa } from './campo'
import type { CondicionDeLead } from './filtros'
import type { CambiosDeLead } from './edicion'
import type { LeadDeFicha, OrigenConEstado } from './ficha'
import type { ImpactoDeCampo } from './impacto'
import type { FilaDeLead } from './listado'
import type { Documento } from './documento'
import type { ColorDeEtiqueta, Etiqueta, EtiquetaConUso } from './etiqueta'
import type { ResultadoDeMarca } from './marcas'
import type { Recordatorio } from './recordatorios'
import type {
  CambiosDeSeguimiento,
  PaginaDeSeguimientos,
  Seguimiento,
  Visibilidad,
} from './seguimiento'
import type { CambioDeExtras, CambioDeTelefono } from './telefonos'
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

// --- Los teléfonos de la ficha ------------------------------------------------------------------------

export type FalloDeTelefono = { ok: false; error: ErrorApp; campo?: string }

export type RepositorioDeTelefonos = {
  // `codigoDePais`: el del lead; sin él la base usa el de la empresa. `telefono` como se escribió.
  verificar: (pedido: {
    id: string
    codigoDePais: string | null
    telefono: string
  }) => Promise<Resultado<Verificacion>>
  cambiar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    codigoDePais: string | null
    telefono: string
  }) => Promise<{ ok: true; data: CambioDeTelefono } | FalloDeTelefono>
  // Agregar, rotular y restituir son lo mismo, por id (idempotente).
  guardarExtra: (pedido: {
    leadId: string
    id: string
    codigoDePais: string | null
    telefono: string
    etiqueta: string | null
    creadoEn: string | null
  }) => Promise<{ ok: true; data: CambioDeExtras } | FalloDeTelefono>
  quitarExtra: (pedido: {
    leadId: string
    id: string
  }) => Promise<{ ok: true; data: CambioDeExtras } | FalloDeTelefono>
}

// --- Los seguimientos de la ficha ---------------------------------------------------------------------

// Un rechazo con el campo del redactor que lo causó (`titulo`, `tipoId`, `detalle`, `ocurridoEn`).
export type FalloDeSeguimiento = { ok: false; error: ErrorApp; campo?: string }

// `repetido`: el mismo intento ya había entrado (un reintento o un doble clic); `sin_cambios`: ya
// estaba así. En los dos casos viene el seguimiento como quedó.
export type ResultadoDeSeguimiento = {
  resultado: 'creado' | 'repetido' | 'guardado' | 'eliminado' | 'restaurado' | 'sin_cambios'
  seguimiento: Seguimiento
  // El que entró al anotar, si se pidió.
  recordatorio?: Recordatorio | null
}

export type RepositorioDeSeguimientos = {
  crear: (pedido: {
    // El del intento: lo genera el navegador al abrir el redactor y lo conserva en cada reintento.
    id: string
    leadId: string
    tipoId: string
    titulo: string
    detalle: Documento | null
    visibilidad: Visibilidad
    // Nulo = ahora.
    ocurridoEn: string | null
    // Entra junto con el seguimiento, o nada entra.
    recordatorio: { recordarEn: string } | null
  }) => Promise<{ ok: true; data: ResultadoDeSeguimiento } | FalloDeSeguimiento>
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    cambios: CambiosDeSeguimiento
  }) => Promise<{ ok: true; data: ResultadoDeSeguimiento } | FalloDeSeguimiento>
  eliminar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<{ ok: true; data: ResultadoDeSeguimiento } | FalloDeSeguimiento>
  restaurar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<{ ok: true; data: ResultadoDeSeguimiento } | FalloDeSeguimiento>
}

// Una página de los seguimientos que quien mira ve de un lead (la RLS decide), desde el cursor.
// Un lead que no ve: una página vacía.
export type LectorDeSeguimientos = (pedido: {
  leadId: string
  antes: { antesEn: string; antesId: string } | null
}) => Promise<Resultado<PaginaDeSeguimientos>>

// Los tipos de seguimiento activos, en su orden: lo que ofrece el redactor.
export type LectorDeTiposDeSeguimiento = () => Promise<Resultado<TipoDeSeguimiento[]>>

// --- Los recordatorios de la ficha ------------------------------------------------------------------

export type FalloDeRecordatorio = { ok: false; error: ErrorApp; campo?: string }

export type ResultadoDeRecordatorio = {
  resultado:
    | 'creado'
    | 'repetido'
    | 'guardado'
    | 'completado'
    | 'reabierto'
    | 'eliminado'
    | 'restaurado'
    | 'sin_cambios'
  recordatorio: Recordatorio & { eliminado: boolean }
}

type RespuestaDeRecordatorio = Promise<
  { ok: true; data: ResultadoDeRecordatorio } | FalloDeRecordatorio
>

export type RepositorioDeRecordatorios = {
  // Con lead, exige tenerlo en la cartera. El intento lleva su id.
  crear: (pedido: {
    id: string
    leadId: string | null
    titulo: string
    recordarEn: string
  }) => RespuestaDeRecordatorio
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    cambios: Partial<{ titulo: string; recordarEn: string }>
  }) => RespuestaDeRecordatorio
  // Poner, no alternar: `true` completa y `false` reabre.
  completar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    completado: boolean
  }) => RespuestaDeRecordatorio
  eliminar: (pedido: { id: string; actualizadoEnEsperado: string }) => RespuestaDeRecordatorio
  restaurar: (pedido: { id: string; actualizadoEnEsperado: string }) => RespuestaDeRecordatorio
}

// Los recordatorios de quien mira sobre un lead (vivos; también los completados). Un lead que ya no
// ve: ninguno.
export type LectorDeRecordatoriosDelLead = (leadId: string) => Promise<Resultado<Recordatorio[]>>

// --- Las marcas de quien mira (parte 5b) -------------------------------------------------------------

// Un rechazo con el campo del formulario que lo causó (el `hint` de la base), si lo hay.
export type FalloDeMarca = { ok: false; error: ErrorApp; campo?: string }

type RespuestaDeMarca<T> = Promise<{ ok: true; data: T } | FalloDeMarca>

// Poner, no alternar: el valor que se pide. Exigen ver el lead; lo que no se ve, «no existe».
export type RepositorioDeMarcas = {
  favorito: (pedido: {
    leadId: string
    valor: boolean
  }) => RespuestaDeMarca<{ resultado: ResultadoDeMarca; valor: boolean }>
  tachado: (pedido: {
    leadId: string
    valor: boolean
  }) => RespuestaDeMarca<{ resultado: ResultadoDeMarca; valor: boolean }>
  // Pone o quita ESAS etiquetas (nunca reemplaza el conjunto); devuelve cómo quedaron las suyas.
  etiquetas: (pedido: {
    leadId: string
    etiquetas: string[]
    valor: boolean
  }) => RespuestaDeMarca<{ resultado: ResultadoDeMarca; etiquetas: string[] }>
}

export type ResultadoDeEtiqueta = {
  resultado: 'creada' | 'repetido' | 'guardada' | 'eliminada' | 'sin_cambios'
  // Nula al eliminar una que ya no estaba.
  etiqueta: Etiqueta | null
  // Al eliminar: a cuántos de los leads que quien mira ve estaba puesta.
  leads: number
}

export type RepositorioDeEtiquetas = {
  // El intento lleva su id: un reintento (o «Deshacer» de un borrado) devuelve `repetido` o la recrea.
  crear: (pedido: {
    id: string
    nombre: string
    color: ColorDeEtiqueta | null
  }) => RespuestaDeMarca<ResultadoDeEtiqueta>
  // Renombrar o recolorear: lo que no viene no cambia.
  guardar: (pedido: {
    id: string
    actualizadoEnEsperado: string
    nombre?: string | undefined
    color?: ColorDeEtiqueta | undefined
  }) => RespuestaDeMarca<ResultadoDeEtiqueta>
  eliminar: (pedido: {
    id: string
    actualizadoEnEsperado: string
  }) => RespuestaDeMarca<ResultadoDeEtiqueta>
}

// Las etiquetas de quien mira (la RLS da sólo las propias).
export type LectorDeEtiquetas = () => Promise<Resultado<Etiqueta[]>>

// Con a cuántos de los leads que ve está puesta cada una («Gestionar»).
export type LectorDeEtiquetasConUso = () => Promise<Resultado<EtiquetaConUso[]>>
