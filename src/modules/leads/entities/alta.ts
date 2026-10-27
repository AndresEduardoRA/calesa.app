// El alta rápida de un lead (docs/UX.md › Flujo 1): qué se pide arriba, qué va plegado en «Más
// datos», con qué arranca cada dato, y cómo se valida lo escrito. Es lo mismo en el navegador (para
// avisar antes de enviar) y lo que la base vuelve a comprobar (`crear_lead()`): los mismos motivos
// con el campo en el mismo lugar. Nada de esto sabe de React ni de Supabase.
import { numeroEnFrase, type NumerosDeLead } from '@/shared/lib/numeros-de-lead'
import {
  campoDeFormulario,
  deAtributo,
  esquemaDeValor,
  requerir,
  vacioDe,
  type CampoDeFormulario,
  type Dato,
  type ValoresDeFormulario,
} from '@/shared/lib/campos'
import { valorDefectoVigente, type CampoDeLead } from './campo'
import type { Documento } from './documento'
import { hayAlgoEscrito } from './seguimiento-nuevo'
import type { ValoresDelSeguimiento } from './seguimiento'
import { normalizarTelefono } from './telefono'
import { origenInicial, type ContextoDeAlta } from './contexto-de-alta'

// El contexto vive en su archivo; sale también de acá porque es lo que el alta nombra.
export {
  contextoDeAltaDesde,
  origenInicial,
  type ContextoDeAlta,
  type OrigenDeLead,
  type OrigenDelAlta,
  type TipoDeLeadEnAlta,
  type TipoDeSeguimiento,
  type TopesDelAlta,
} from './contexto-de-alta'

// --- Las claves del formulario: las mismas que pone la base en el `hint` de un error ---------------

export const CLAVE_DEL_ALTA = {
  telefono: 'telefono_principal',
  nombre: 'nombre',
  origen: 'origen_lead_id',
  // El `hint` de la base y la clave del formulario: el id del tipo.
  tipo: 'tipo_lead_id',
} as const

export const claveDeAtributoDeAlta = (clave: string) => `atributos.${clave}`

// --- Qué va arriba y qué va en «Más datos» ----------------------------------------------------------

export const LARGO_MAXIMO_DEL_NOMBRE = 120

// Los campos activos que se piden de entrada (los requeridos, aunque sean propios) y los que quedan
// plegados, cada grupo en el orden del layout.
export function camposDelAlta(layout: readonly CampoDeLead[]): {
  principales: CampoDeLead[]
  masDatos: CampoDeLead[]
} {
  const activos = layout.filter((campo) => campo.activo)
  return {
    principales: activos.filter((campo) => campo.requerido),
    masDatos: activos.filter((campo) => !campo.requerido),
  }
}

// El control de un campo del layout. Un privado lo dice en la etiqueta: quien crea queda en la
// cartera y es quien lo puede llenar.
export function campoDelAlta(campo: CampoDeLead): CampoDeFormulario {
  return campoDeFormulario(
    {
      etiqueta: campo.soloCartera ? `${campo.etiqueta} (solo la cartera)` : campo.etiqueta,
      tipo: campo.tipo,
      opciones: campo.opciones,
      requerido: campo.requerido,
    },
    undefined,
    claveDeAtributoDeAlta(campo.clave),
  )
}

// Con qué arranca el formulario de los datos: el origen inicial (`origenInicial`), el tipo que propone la base (el primero
// activo de la clase prospecto) y el valor por defecto de cada campo activo (la ciudad de la empresa incluida). El primer seguimiento
// tiene sus propios valores (`valoresDeSeguimientoNuevo`).
export function valoresIniciales(
  contexto: ContextoDeAlta,
  layout: readonly CampoDeLead[],
  zona: string,
  locale: string,
): ValoresDeFormulario {
  const valores: ValoresDeFormulario = {
    [CLAVE_DEL_ALTA.telefono]: '',
    [CLAVE_DEL_ALTA.nombre]: '',
    [CLAVE_DEL_ALTA.origen]: origenInicial(contexto) ?? '',
    [CLAVE_DEL_ALTA.tipo]: contexto.tipoPorDefectoId ?? contexto.tipos[0]?.id ?? '',
  }
  for (const campo of layout) {
    if (campo.activo) {
      valores[claveDeAtributoDeAlta(campo.clave)] = deAtributo(
        campo,
        valorDefectoVigente(campo, contexto.empresa),
        zona,
        locale,
      )
    }
  }
  return valores
}

// Un valor del formulario como se lee: «Santa Cruz», «Sí», las etiquetas de las opciones.
function textoDeValor(campo: CampoDeLead, valor: ValoresDeFormulario[string] | undefined): string {
  if (valor === undefined || valor === null || valor === '') {
    return ''
  }
  if (typeof valor === 'boolean') {
    return valor ? 'Sí' : 'No'
  }
  const etiquetaDe = (clave: string) =>
    campo.opciones.find((opcion) => opcion.clave === clave)?.etiqueta ?? clave
  if (Array.isArray(valor)) {
    return valor.map(etiquetaDe).join(', ')
  }
  return campo.tipo === 'opcion' ? etiquetaDe(valor) : valor
}

const PRECARGADOS_A_LA_VISTA = 3

// El encabezado de «Más datos»: lo que ya viene cargado, para no tener que abrirlo. «Ciudad: Santa
// Cruz · País: Bolivia». Vacío si no hay nada.
export function resumenDePrecargados(
  masDatos: readonly CampoDeLead[],
  valores: ValoresDeFormulario,
): string {
  const cargados = masDatos
    .map((campo) => ({
      campo,
      texto: textoDeValor(campo, valores[claveDeAtributoDeAlta(campo.clave)]),
    }))
    .filter(({ texto }) => texto !== '')
  const visibles = cargados.slice(0, PRECARGADOS_A_LA_VISTA)
  const resto = cargados.length - visibles.length
  const partes = visibles.map(({ campo, texto }) => `${campo.etiqueta}: ${texto}`)
  const frase = partes.join(' · ')
  return resto > 0 ? `${frase} · y ${String(resto)} más` : frase
}

// --- Validar lo escrito ------------------------------------------------------------------------------

export type DatosDeAlta = {
  // Lo que se escribió, para que la base lo normalice con el código de país de la empresa.
  telefono: string
  nombre: string
  origenId: string | null
  // El tipo elegido, uno de los activos que ofreció la base.
  tipoLeadId: string
  // Sólo lo que tiene valor, ya convertido a lo que guarda la base.
  atributos: Record<string, Exclude<Dato, null>>
  // Lo arma `primerSeguimiento()` (otra pieza, que se carga al guardar): la validación de los datos
  // del lead no lo mira y lo deja en nulo.
  seguimiento: PrimerSeguimientoDeAlta | null
  // El instante, en UTC.
  recordatorio: { recordarEn: string } | null
}

export type PrimerSeguimientoDeAlta = {
  tipoId: string
  titulo: string
  // El documento del editor (la lista blanca de la ficha), nulo = sin detalle.
  detalle: Documento | null
  // El instante, en UTC; nulo = ahora.
  ocurridoEn: string | null
}

export type ValidacionDeAlta =
  | { ok: true; datos: DatosDeAlta }
  // El primer motivo de cada dato que no pasó, por su clave en el formulario.
  | { ok: false; porCampo: Record<string, string> }

type Entrada = {
  valores: ValoresDeFormulario
  // Todo el layout: acá sólo cuentan los activos.
  layout: readonly CampoDeLead[]
  contexto: ContextoDeAlta
  zona: string
}

type Motivos = Record<string, string>

const texto = (valor: ValoresDeFormulario[string] | undefined) =>
  typeof valor === 'string' ? valor.trim() : ''

// Cada pieza escribe su motivo en `motivos` (por la clave del formulario) y devuelve lo que pudo
// leer; con un motivo escrito, ese dato no viaja.

function validarFijos(
  { valores, contexto }: Pick<Entrada, 'valores' | 'contexto'>,
  motivos: Motivos,
): { telefono: string; nombre: string; origenId: string | null; tipoLeadId: string | null } {
  const telefono = texto(valores[CLAVE_DEL_ALTA.telefono])
  const normalizado = normalizarTelefono(contexto.telefonoCc, telefono)
  if (!normalizado.ok) {
    motivos[CLAVE_DEL_ALTA.telefono] = normalizado.motivo
  }
  const nombre = texto(valores[CLAVE_DEL_ALTA.nombre])
  if (nombre === '') {
    motivos[CLAVE_DEL_ALTA.nombre] = 'Escribe el nombre.'
  } else if (nombre.length > LARGO_MAXIMO_DEL_NOMBRE) {
    motivos[CLAVE_DEL_ALTA.nombre] =
      `El nombre admite hasta ${String(LARGO_MAXIMO_DEL_NOMBRE)} caracteres.`
  }
  const origen = texto(valores[CLAVE_DEL_ALTA.origen])
  const hayOrigenes = contexto.origenes.length > 0
  const origenValido = contexto.origenes.some((o) => o.id === origen)
  if (hayOrigenes && !origenValido) {
    motivos[CLAVE_DEL_ALTA.origen] = 'Elige de dónde viene el lead.'
  }
  const tipoEscrito = texto(valores[CLAVE_DEL_ALTA.tipo])
  const tipoLeadId = contexto.tipos.find((uno) => uno.id === tipoEscrito)?.id ?? null
  if (!tipoLeadId) {
    motivos[CLAVE_DEL_ALTA.tipo] = 'Elige el tipo de lead.'
  }
  return { telefono, nombre, origenId: hayOrigenes && origenValido ? origen : null, tipoLeadId }
}

function validarAtributos(
  { valores, layout, zona }: Pick<Entrada, 'valores' | 'layout' | 'zona'>,
  motivos: Motivos,
): DatosDeAlta['atributos'] {
  const atributos: DatosDeAlta['atributos'] = {}
  for (const campo of layout) {
    if (!campo.activo) {
      continue
    }
    const clave = claveDeAtributoDeAlta(campo.clave)
    const base = esquemaDeValor(campo, { zona })
    const leido = (campo.requerido ? requerir(base) : base).safeParse(
      valores[clave] ?? vacioDe(campo),
    )
    if (!leido.success) {
      motivos[clave] = leido.error.issues[0]?.message ?? 'Revisa este dato.'
    } else if (leido.data !== null) {
      atributos[campo.clave] = leido.data
    }
  }
  return atributos
}

export function validarAlta(entrada: Entrada): ValidacionDeAlta {
  const porCampo: Motivos = {}
  const fijos = validarFijos(entrada, porCampo)
  const atributos = validarAtributos(entrada, porCampo)
  if (Object.keys(porCampo).length > 0 || !fijos.tipoLeadId) {
    return { ok: false, porCampo }
  }
  const { telefono, nombre, origenId, tipoLeadId } = fijos
  return {
    ok: true,
    datos: {
      telefono,
      nombre,
      origenId,
      tipoLeadId,
      atributos,
      seguimiento: null,
      recordatorio: null,
    },
  }
}

// El orden en que se recorre el formulario, para llevar el foco al primer error.
export function primerCampoConError(
  porCampo: Record<string, string>,
  layout: readonly CampoDeLead[],
): string | null {
  const orden: string[] = [
    CLAVE_DEL_ALTA.telefono,
    CLAVE_DEL_ALTA.nombre,
    CLAVE_DEL_ALTA.origen,
    CLAVE_DEL_ALTA.tipo,
    ...layout.filter((c) => c.activo && c.requerido).map((c) => claveDeAtributoDeAlta(c.clave)),
    ...layout.filter((c) => c.activo && !c.requerido).map((c) => claveDeAtributoDeAlta(c.clave)),
  ]
  return orden.find((clave) => porCampo[clave] !== undefined) ?? null
}

// --- Lo que dice el pie del drawer y el aviso de un lead guardado ---------------------------------------

export const ID_DEL_SEGUIMIENTO_DEL_ALTA = 'alta-seguimiento'

export const AVISO_SIN_SEGUIMIENTO =
  'Se creará sin primer seguimiento. Podrás anotarlo después desde la ficha.'

// El primer seguimiento es opcional y la pantalla lo dice sin bloquear nada: ni un diálogo de
// confirmación (son decenas de altas al día) ni un botón que castigue no escribirlo.
export function avisoDelPieDelAlta(args: { hayTipos: boolean; hayAlgoEscrito: boolean }): string {
  if (!args.hayTipos) {
    return 'No hay tipos de seguimiento activos: se creará sin primer seguimiento. Podrás anotarlo después desde la ficha.'
  }
  return args.hayAlgoEscrito
    ? 'Se guardará con el primer seguimiento que escribiste.'
    : AVISO_SIN_SEGUIMIENTO
}

// «Lead creado · Tu n.º 12», «Lead tomado · N.º 1.234» y, sin primer seguimiento, «Lead creado sin seguimiento · …».
// El número es el que la persona ve; si no ve ninguno, la frase no lo nombra.
export function textoDeLeadGuardado(args: {
  numeros: NumerosDeLead
  adoptado: boolean
  conSeguimiento: boolean
}): string {
  const hecho = args.adoptado ? 'tomado' : 'creado'
  const numero = numeroEnFrase(args.numeros)
  return `Lead ${hecho}${args.conSeguimiento ? '' : ' sin seguimiento'}${numero === null ? '' : ` · ${numero}`}`
}

// Si el alta tiene algo escrito que se perdería al irse a otra pantalla (la acción «Abrir ficha» de un aviso): el teléfono, el
// nombre o algo del primer seguimiento. Lo demás (el origen, el tipo, un campo con su valor por defecto) lo trae el formulario
// solo, y escribir en un campo del layout sin teléfono ni nombre no es un lead a medio hacer.
export function hayAlgoEscritoEnElAlta(
  valores: ValoresDeFormulario,
  seguimiento: ValoresDelSeguimiento,
): boolean {
  const texto = (clave: string) => {
    const valor = valores[clave]
    return typeof valor === 'string' ? valor.trim() : ''
  }
  return (
    texto(CLAVE_DEL_ALTA.telefono) !== '' ||
    texto(CLAVE_DEL_ALTA.nombre) !== '' ||
    hayAlgoEscrito(seguimiento)
  )
}
