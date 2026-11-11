// El formulario de un tipo de documento: lo escrito, su validación y el pedido a la base. La validación es espejo de `_tipo_documento_validar()` y
// `_tipo_documento_de_jsonb()` (`…20261111195259_tipos_documento_crear.sql`): la base las vuelve a decir, con estos mismos textos y estos mismos
// campos en el `hint`, si algo llega de otro lado. Aquí sirve para mostrar el error junto al campo sin ir a la base.
import {
  DIAS_MAXIMOS,
  FORMATOS_DE_DOCUMENTO,
  LARGO_MAXIMO_DE_LA_DESCRIPCION,
  LARGO_MAXIMO_DEL_NOMBRE,
  MODOS_DE_VENCIMIENTO,
  type FormatoDeDocumento,
  type ModoDeVencimiento,
  type TipoDeDocumento,
} from './tipo-de-documento'

// Lo escrito en el formulario: los días son texto (un campo vacío es «sin días»).
export type BorradorDeTipo = {
  nombre: string
  descripcion: string
  formatos: readonly string[]
  modo: ModoDeVencimiento
  vigenciaDias: string
  avisoDias: string
  visiblePortal: boolean
  activo: boolean
}

// Lo que el formulario validó, listo para mandar.
export type DatosDeTipo = {
  nombre: string
  descripcion: string | null
  formatos: FormatoDeDocumento[]
  modo: ModoDeVencimiento
  vigenciaDias: number | null
  avisoDias: number | null
  visiblePortal: boolean
  activo: boolean
}

// Los campos del `hint` de la base: el error va junto a su campo.
export type CampoDeTipo =
  'nombre' | 'descripcion' | 'formatos' | 'modo_vencimiento' | 'vigencia_dias' | 'aviso_dias'
export const CAMPOS_DE_TIPO: readonly CampoDeTipo[] = [
  'nombre',
  'descripcion',
  'formatos',
  'modo_vencimiento',
  'vigencia_dias',
  'aviso_dias',
]

export function esCampoDeTipo(campo: string | undefined): campo is CampoDeTipo {
  return CAMPOS_DE_TIPO.some((c) => c === campo)
}

export const MENSAJES_DE_TIPO = {
  nombreVacio: 'Escribe el nombre del tipo de documento.',
  nombreLargo: `El nombre tiene hasta ${String(LARGO_MAXIMO_DEL_NOMBRE)} caracteres.`,
  descripcionLarga: `La descripción tiene hasta ${String(LARGO_MAXIMO_DE_LA_DESCRIPCION)} caracteres.`,
  sinFormatos: 'Elige al menos un formato.',
  modoDesconocido: 'El vencimiento es ninguno, solicitar o renovar.',
  vigenciaFalta: 'Con «renovar», di cada cuántos días vence.',
  vigenciaSobra: 'Sólo «renovar» lleva días de vigencia.',
  vigenciaFuera: `La vigencia es un número entero de días, de 1 a ${String(DIAS_MAXIMOS)}.`,
  avisoFuera: `El aviso es un número entero de días, de 0 a ${String(DIAS_MAXIMOS)}.`,
  avisoSinVencimiento: 'Sin vencimiento no hay aviso.',
  avisoMasLargo: 'El aviso no puede ser más largo que la vigencia.',
} as const

export const MENSAJE_NADA_QUE_GUARDAR = 'No hay nada que guardar.'

export function formatoNoAceptado(formato: string): string {
  return `El formato «${formato}» no se acepta.`
}

type Errores = Partial<Record<CampoDeTipo, string>>

function largo(texto: string): number {
  // La base cuenta caracteres (`char_length`), no unidades UTF-16.
  return Array.from(texto).length
}

type Dias = { ok: true; dias: number | null } | { ok: false }

// «» es sin días; un entero de 0 a 3650 es válido (la base mira el mínimo de la vigencia aparte); lo demás, no.
function diasDe(texto: string): Dias {
  const limpio = texto.trim()
  if (limpio === '') {
    return { ok: true, dias: null }
  }
  if (!/^\d{1,5}$/u.test(limpio)) {
    return { ok: false }
  }
  const dias = Number(limpio)
  return dias > DIAS_MAXIMOS ? { ok: false } : { ok: true, dias }
}

function errorDeNombre(nombre: string): string | null {
  if (nombre === '') {
    return MENSAJES_DE_TIPO.nombreVacio
  }
  return largo(nombre) > LARGO_MAXIMO_DEL_NOMBRE ? MENSAJES_DE_TIPO.nombreLargo : null
}

function errorDeFormatos(formatos: readonly string[]): string | null {
  if (formatos.length === 0) {
    return MENSAJES_DE_TIPO.sinFormatos
  }
  const ajeno = formatos.find((f) => !FORMATOS_DE_DOCUMENTO.some((valido) => valido === f))
  return ajeno === undefined ? null : formatoNoAceptado(ajeno)
}

// El orden es el de la base: la primera regla que falla es la que se dice.
function errorDeVigencia(modo: ModoDeVencimiento, dias: Dias): string | null {
  if (!dias.ok) {
    return MENSAJES_DE_TIPO.vigenciaFuera
  }
  if (modo === 'renovar' && dias.dias === null) {
    return MENSAJES_DE_TIPO.vigenciaFalta
  }
  if (modo !== 'renovar' && dias.dias !== null) {
    return MENSAJES_DE_TIPO.vigenciaSobra
  }
  return dias.dias !== null && dias.dias < 1 ? MENSAJES_DE_TIPO.vigenciaFuera : null
}

function errorDeAviso(
  modo: ModoDeVencimiento,
  aviso: Dias,
  vigencia: number | null,
): string | null {
  if (!aviso.ok) {
    return MENSAJES_DE_TIPO.avisoFuera
  }
  if (modo === 'ninguno' && aviso.dias !== null) {
    return MENSAJES_DE_TIPO.avisoSinVencimiento
  }
  const pasa =
    modo === 'renovar' && aviso.dias !== null && vigencia !== null && aviso.dias > vigencia
  return pasa ? MENSAJES_DE_TIPO.avisoMasLargo : null
}

export type ValidacionDeTipo = { ok: true; datos: DatosDeTipo } | { ok: false; errores: Errores }

export function validarTipo(borrador: BorradorDeTipo): ValidacionDeTipo {
  const nombre = borrador.nombre.trim()
  const texto = borrador.descripcion.trim()
  const descripcion = texto === '' ? null : texto
  const vigencia = diasDe(borrador.vigenciaDias)
  const aviso = diasDe(borrador.avisoDias)
  const vigenciaDias = vigencia.ok ? vigencia.dias : null
  const candidatos: [CampoDeTipo, string | null][] = [
    ['nombre', errorDeNombre(nombre)],
    [
      'descripcion',
      descripcion !== null && largo(descripcion) > LARGO_MAXIMO_DE_LA_DESCRIPCION
        ? MENSAJES_DE_TIPO.descripcionLarga
        : null,
    ],
    ['formatos', errorDeFormatos(borrador.formatos)],
    [
      'modo_vencimiento',
      MODOS_DE_VENCIMIENTO.includes(borrador.modo) ? null : MENSAJES_DE_TIPO.modoDesconocido,
    ],
    ['vigencia_dias', errorDeVigencia(borrador.modo, vigencia)],
    ['aviso_dias', errorDeAviso(borrador.modo, aviso, vigenciaDias)],
  ]
  const errores: Errores = {}
  for (const [campo, mensaje] of candidatos) {
    if (mensaje !== null) {
      errores[campo] = mensaje
    }
  }
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores }
  }
  return {
    ok: true,
    datos: {
      nombre,
      descripcion,
      formatos: FORMATOS_DE_DOCUMENTO.filter((f) => borrador.formatos.includes(f)),
      modo: borrador.modo,
      vigenciaDias,
      avisoDias: aviso.ok ? aviso.dias : null,
      visiblePortal: borrador.visiblePortal,
      activo: borrador.activo,
    },
  }
}

// Cambiar el modo vacía los días que el modo nuevo ya no usa (la base los rechaza): lo escrito no se queda en un campo que desaparece (D8).
export function borradorConModo(borrador: BorradorDeTipo, modo: ModoDeVencimiento): BorradorDeTipo {
  return {
    ...borrador,
    modo,
    vigenciaDias: modo === 'renovar' ? borrador.vigenciaDias : '',
    avisoDias: modo === 'ninguno' ? '' : borrador.avisoDias,
  }
}

export function borradorDeTipo(tipo: TipoDeDocumento): BorradorDeTipo {
  return {
    nombre: tipo.nombre,
    descripcion: tipo.descripcion ?? '',
    formatos: tipo.formatos,
    modo: tipo.modo,
    vigenciaDias: tipo.vigenciaDias === null ? '' : String(tipo.vigenciaDias),
    avisoDias: tipo.avisoDias === null ? '' : String(tipo.avisoDias),
    visiblePortal: tipo.visiblePortal,
    activo: tipo.activo,
  }
}

export const BORRADOR_DE_TIPO_NUEVO: BorradorDeTipo = {
  nombre: '',
  descripcion: '',
  formatos: FORMATOS_DE_DOCUMENTO,
  modo: 'ninguno',
  vigenciaDias: '',
  avisoDias: '',
  visiblePortal: false,
  activo: true,
}

// ─── El pedido a la base ────────────────────────────────────────────────────────────────────────

// Las claves de la base (`p_datos` y `p_cambios`): la lista cerrada de `_tipo_documento_de_jsonb()`. `activo` sólo al guardar.
export type CambiosDeTipo = {
  nombre?: string
  descripcion?: string | null
  formatos?: FormatoDeDocumento[]
  modo_vencimiento?: ModoDeVencimiento
  vigencia_dias?: number | null
  aviso_dias?: number | null
  visible_portal_permitido?: boolean
  activo?: boolean
}

// Los días que el modo usa: vigencia sólo con «renovar», aviso con «solicitar» o «renovar».
function diasDelModo(datos: DatosDeTipo) {
  return {
    vigencia: datos.modo === 'renovar' ? datos.vigenciaDias : null,
    aviso: datos.modo === 'ninguno' ? null : datos.avisoDias,
  }
}

// `p_datos` de `tipo_documento_crear`: la lista cerrada de claves de la base (sin `activo` ni `proposito`: nace activo y sin propósito).
export function datosParaCrear(datos: DatosDeTipo): Omit<CambiosDeTipo, 'activo'> {
  const { vigencia, aviso } = diasDelModo(datos)
  return {
    nombre: datos.nombre,
    descripcion: datos.descripcion,
    formatos: datos.formatos,
    modo_vencimiento: datos.modo,
    vigencia_dias: vigencia,
    aviso_dias: aviso,
    visible_portal_permitido: datos.visiblePortal,
  }
}

function mismosFormatos(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((f, i) => f === b[i])
}

// `p_cambios` de `tipo_documento_guardar`: sólo lo que cambió, nunca `proposito`, `orden` ni `flujo_id`. Nulo si no cambió nada.
export function cambiosParaGuardar(
  original: TipoDeDocumento,
  datos: DatosDeTipo,
): CambiosDeTipo | null {
  const { vigencia, aviso } = diasDelModo(datos)
  const pares: [string, unknown, boolean][] = [
    ['nombre', datos.nombre, datos.nombre !== original.nombre],
    ['descripcion', datos.descripcion, datos.descripcion !== original.descripcion],
    ['formatos', datos.formatos, !mismosFormatos(datos.formatos, original.formatos)],
    ['modo_vencimiento', datos.modo, datos.modo !== original.modo],
    ['vigencia_dias', vigencia, vigencia !== original.vigenciaDias],
    ['aviso_dias', aviso, aviso !== original.avisoDias],
    [
      'visible_portal_permitido',
      datos.visiblePortal,
      datos.visiblePortal !== original.visiblePortal,
    ],
    ['activo', datos.activo, datos.activo !== original.activo],
  ]
  const cambios: CambiosDeTipo = Object.fromEntries(
    pares.filter(([, , cambio]) => cambio).map(([k, v]) => [k, v]),
  )
  return Object.keys(cambios).length === 0 ? null : cambios
}
