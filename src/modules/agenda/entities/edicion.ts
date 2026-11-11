// Lo que se escribe en el formulario de un evento o de una tarea y lo que la base valida (7.07-2). Puro: arma los valores iniciales, los valida con los
// mismos límites y mensajes que `evento_*` y `tarea_*` (7.06-1) y dice qué claves de `p_datos` cambiaron. La base vuelve a validar todo: esto sólo
// ahorra el viaje y pone el motivo junto a su campo. Las fechas se escriben en la hora de la empresa (`aaaa-mm-ddThh:mm`, un `datetime-local`) y
// cruzan como ISO UTC con `instanteDeLocal()`. Los campos del error son los `hint` de la base.
import { instanteDeLocal, localDeInstante, sumarDias } from '@/shared/lib/fechas'
import { TOPE_DE_DESTINATARIOS, type Visibilidad } from './visibilidad'

export const LARGO_MAXIMO_DE_TITULO = 120
export const LARGO_MAXIMO_DE_DESCRIPCION = 2000
export const LARGO_MAXIMO_DE_LUGAR = 200

// Hora a la que empieza un evento nuevo y a la que vence una tarea nueva (D6).
const HORA_DE_INICIO = '09:00'
const HORA_DE_VENCIMIENTO = '18:00'

export type PersonaElegida = { id: string; nombre: string }

export type ValoresDeEvento = {
  titulo: string
  descripcion: string
  lugar: string
  iniciaEn: string
  terminaEn: string
  visibilidad: Visibilidad
  destinatarios: PersonaElegida[]
}

export type ValoresDeTarea = {
  titulo: string
  descripcion: string
  venceEn: string
  responsable: PersonaElegida | null
}

// Lo guardado, tal como lo da la base (instantes en ISO).
export type OriginalDeEvento = {
  titulo: string
  descripcion: string | null
  lugar: string | null
  iniciaEn: string
  terminaEn: string | null
  visibilidad: Visibilidad
  // Nulo cuando quien mira no es el creador (no se le enseña la lista).
  destinatarios: PersonaElegida[] | null
}

export type OriginalDeTarea = {
  titulo: string
  descripcion: string | null
  venceEn: string | null
  responsable: PersonaElegida | null
}

export type CampoDeEvento =
  'titulo' | 'descripcion' | 'lugar' | 'inicia_en' | 'termina_en' | 'visibilidad' | 'destinatarios'
export type CampoDeTarea = 'titulo' | 'descripcion' | 'vence_en' | 'responsable_id'
export type ErroresDeEvento = Partial<Record<CampoDeEvento, string>>
export type ErroresDeTarea = Partial<Record<CampoDeTarea, string>>

// Las claves que `evento_crear` y `evento_guardar` reciben en `p_datos` (una clave presente es un cambio; `null`, quitar).
export type DatosDeEvento = {
  titulo?: string
  descripcion?: string | null
  lugar?: string | null
  inicia_en?: string
  termina_en?: string | null
  visibilidad?: Visibilidad
}
export type DatosDeTarea = {
  titulo?: string
  descripcion?: string | null
  vence_en?: string | null
  responsable_id?: string
}

// `char_length` de la base cuenta caracteres, no unidades UTF-16.
const largo = (texto: string) => [...texto].length

const MENSAJE_DE_TITULO = `Escribe un título de hasta ${LARGO_MAXIMO_DE_TITULO} caracteres.`
const MENSAJE_DE_DESCRIPCION = 'La descripción admite hasta 2.000 caracteres.'

function tituloValido(titulo: string): boolean {
  const largoDelTitulo = largo(titulo.trim())
  return largoDelTitulo >= 1 && largoDelTitulo <= LARGO_MAXIMO_DE_TITULO
}

// Valores de un evento nuevo: el día de la vista (hoy si ya pasó) a las 09:00, privado y sin fin.
export function valoresInicialesDeEvento(fecha: string, hoy: string): ValoresDeEvento {
  const dia = fecha < hoy ? hoy : fecha
  return {
    titulo: '',
    descripcion: '',
    lugar: '',
    iniciaEn: `${dia}T${HORA_DE_INICIO}`,
    terminaEn: '',
    visibilidad: 'privado',
    destinatarios: [],
  }
}

// Valores de una tarea nueva: el día de la vista a las 18:00; si esa hora ya pasó (la base rechaza un vencimiento pasado), mañana.
export function valoresInicialesDeTarea(
  fecha: string,
  hoy: string,
  zona: string,
  ahoraIso: string,
): ValoresDeTarea {
  let dia = fecha < hoy ? hoy : fecha
  const propuesto = instanteDeLocal(`${dia}T${HORA_DE_VENCIMIENTO}`, { zona })
  if (propuesto === null || Date.parse(propuesto) <= Date.parse(ahoraIso)) {
    dia = sumarDias(dia, 1)
  }
  return {
    titulo: '',
    descripcion: '',
    venceEn: `${dia}T${HORA_DE_VENCIMIENTO}`,
    responsable: null,
  }
}

export function valoresDeEvento(original: OriginalDeEvento, zona: string): ValoresDeEvento {
  return {
    titulo: original.titulo,
    descripcion: original.descripcion ?? '',
    lugar: original.lugar ?? '',
    iniciaEn: localDeInstante(original.iniciaEn, { zona }),
    terminaEn: original.terminaEn ? localDeInstante(original.terminaEn, { zona }) : '',
    visibilidad: original.visibilidad,
    destinatarios: original.destinatarios ?? [],
  }
}

export function valoresDeTarea(original: OriginalDeTarea, zona: string): ValoresDeTarea {
  return {
    titulo: original.titulo,
    descripcion: original.descripcion ?? '',
    venceEn: original.venceEn ? localDeInstante(original.venceEn, { zona }) : '',
    responsable: original.responsable,
  }
}

export function validarEvento(valores: ValoresDeEvento, zona: string): ErroresDeEvento {
  const errores: ErroresDeEvento = {}
  if (!tituloValido(valores.titulo)) {
    errores.titulo = MENSAJE_DE_TITULO
  }
  if (largo(valores.descripcion.trim()) > LARGO_MAXIMO_DE_DESCRIPCION) {
    errores.descripcion = MENSAJE_DE_DESCRIPCION
  }
  if (largo(valores.lugar.trim()) > LARGO_MAXIMO_DE_LUGAR) {
    errores.lugar = 'El lugar admite hasta 200 caracteres.'
  }
  const inicio = instanteDeLocal(valores.iniciaEn, { zona })
  if (inicio === null) {
    errores.inicia_en = 'Elige cuándo empieza.'
  }
  if (valores.terminaEn !== '') {
    const fin = instanteDeLocal(valores.terminaEn, { zona })
    if (fin === null) {
      errores.termina_en = 'Esa fecha no es válida.'
    } else if (inicio !== null && Date.parse(fin) < Date.parse(inicio)) {
      errores.termina_en = 'El evento no puede terminar antes de empezar.'
    }
  }
  if (valores.visibilidad === 'seleccionados') {
    if (valores.destinatarios.length === 0) {
      errores.destinatarios = 'Elige al menos una persona.'
    } else if (valores.destinatarios.length > TOPE_DE_DESTINATARIOS) {
      errores.destinatarios = `Puedes elegir hasta ${TOPE_DE_DESTINATARIOS} personas.`
    }
  }
  return errores
}

// `vencimientoGuardado` (ISO) es el de la tarea que se edita: la base sólo rechaza un vencimiento pasado si cambió.
export function validarTarea(
  valores: ValoresDeTarea,
  zona: string,
  ahoraIso: string,
  vencimientoGuardado: string | null = null,
): ErroresDeTarea {
  const errores: ErroresDeTarea = {}
  if (!tituloValido(valores.titulo)) {
    errores.titulo = MENSAJE_DE_TITULO
  }
  if (largo(valores.descripcion.trim()) > LARGO_MAXIMO_DE_DESCRIPCION) {
    errores.descripcion = MENSAJE_DE_DESCRIPCION
  }
  const vence = instanteDeLocal(valores.venceEn, { zona })
  if (vence === null) {
    errores.vence_en = 'Elige cuándo vence.'
  } else {
    const cambio =
      vencimientoGuardado === null || Date.parse(vence) !== Date.parse(vencimientoGuardado)
    if (cambio && Date.parse(vence) < Date.parse(ahoraIso)) {
      errores.vence_en = 'El vencimiento no puede quedar en el pasado.'
    }
  }
  return errores
}

// Texto opcional: vacío (tras recortar) es «sin valor».
const opcional = (texto: string): string | null => texto.trim() || null

// Un evento nuevo: sólo las claves con valor; el título y el inicio siempre van. Se llama después de `validarEvento` sin errores.
export function datosDeEventoNuevo(
  valores: ValoresDeEvento,
  zona: string,
): DatosDeEvento & { titulo: string; inicia_en: string } {
  const inicio = instanteDeLocal(valores.iniciaEn, { zona })
  const fin = valores.terminaEn === '' ? null : instanteDeLocal(valores.terminaEn, { zona })
  const descripcion = opcional(valores.descripcion)
  const lugar = opcional(valores.lugar)
  return {
    titulo: valores.titulo.trim(),
    ...(descripcion ? { descripcion } : {}),
    ...(lugar ? { lugar } : {}),
    // Validado antes: si no fuera una fecha, la base lo rechazaría con su motivo.
    inicia_en: inicio ?? valores.iniciaEn,
    ...(fin ? { termina_en: fin } : {}),
    visibilidad: valores.visibilidad,
  }
}

export function datosDeTareaNueva(
  valores: ValoresDeTarea,
  zona: string,
): DatosDeTarea & { titulo: string } {
  const vence = instanteDeLocal(valores.venceEn, { zona })
  const descripcion = opcional(valores.descripcion)
  return {
    titulo: valores.titulo.trim(),
    ...(descripcion ? { descripcion } : {}),
    ...(vence ? { vence_en: vence } : {}),
    ...(valores.responsable ? { responsable_id: valores.responsable.id } : {}),
  }
}

// A quiénes se manda el evento: sólo un evento «seleccionados» lleva destinatarios (la base lo exige); el resto, la lista vacía.
export function destinatariosDeEvento(valores: ValoresDeEvento): string[] {
  return valores.visibilidad === 'seleccionados' ? valores.destinatarios.map((p) => p.id) : []
}

function mismosIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join()
}

export type CambiosDeEvento = {
  // Las claves de `p_datos` que cambiaron.
  datos: DatosDeEvento
  // Siempre la lista completa de `p_destinatarios` (la base la compara con la actual).
  destinatarios: string[]
  hayCambios: boolean
}

export function cambiosDeEvento(
  original: OriginalDeEvento,
  valores: ValoresDeEvento,
  zona: string,
): CambiosDeEvento {
  const antes = valoresDeEvento(original, zona)
  const datos: DatosDeEvento = {}
  if (valores.titulo.trim() !== original.titulo) {
    datos.titulo = valores.titulo.trim()
  }
  if (opcional(valores.descripcion) !== original.descripcion) {
    datos.descripcion = opcional(valores.descripcion)
  }
  if (opcional(valores.lugar) !== original.lugar) {
    datos.lugar = opcional(valores.lugar)
  }
  if (valores.iniciaEn !== antes.iniciaEn) {
    const inicio = instanteDeLocal(valores.iniciaEn, { zona })
    if (inicio) {
      datos.inicia_en = inicio
    }
  }
  if (valores.terminaEn !== antes.terminaEn) {
    datos.termina_en =
      valores.terminaEn === '' ? null : instanteDeLocal(valores.terminaEn, { zona })
  }
  if (valores.visibilidad !== original.visibilidad) {
    datos.visibilidad = valores.visibilidad
  }
  const destinatarios = destinatariosDeEvento(valores)
  const eranDestinatarios = destinatariosDeEvento(antes)
  return {
    datos,
    destinatarios,
    hayCambios: Object.keys(datos).length > 0 || !mismosIds(destinatarios, eranDestinatarios),
  }
}

// Una tarea nunca manda `responsable_id` al guardar: la base lo rechaza (cambia por `reasignar_tarea`, 7.07-3).
export function cambiosDeTarea(
  original: OriginalDeTarea,
  valores: ValoresDeTarea,
  zona: string,
): DatosDeTarea {
  const antes = valoresDeTarea(original, zona)
  const datos: DatosDeTarea = {}
  if (valores.titulo.trim() !== original.titulo) {
    datos.titulo = valores.titulo.trim()
  }
  if (opcional(valores.descripcion) !== original.descripcion) {
    datos.descripcion = opcional(valores.descripcion)
  }
  if (valores.venceEn !== antes.venceEn) {
    datos.vence_en = valores.venceEn === '' ? null : instanteDeLocal(valores.venceEn, { zona })
  }
  return datos
}
