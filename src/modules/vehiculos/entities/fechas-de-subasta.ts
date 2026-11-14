// Editar las fechas de la subasta de un vehículo (A4b): la persona escribe la hora en su zona (`datetime-local`, sin zona) y se guarda el
// instante en UTC (`instanteDeLocal`). Vacío borra la fecha. La base vuelve a validar todo (`vehiculo_guardar`, `_vehiculo_instante`).
import { abreviaturaDeZona, instanteDeLocal, localDeInstante } from '@/shared/lib/fechas'

export type BorradorDeFechas = { inicio: string; cierre: string }
export type FechasDeSubasta = { subastaEn: string | null; subastaFinEn: string | null }

export function borradorDeFechas(fechas: FechasDeSubasta, zona: string): BorradorDeFechas {
  return {
    inicio: fechas.subastaEn ? localDeInstante(fechas.subastaEn, { zona }) : '',
    cierre: fechas.subastaFinEn ? localDeInstante(fechas.subastaFinEn, { zona }) : '',
  }
}

const INCOMPLETA = 'Escribe la fecha y la hora completas.'

export type ValidacionDeFechas =
  | { ok: true; datos: FechasDeSubasta }
  | { ok: false; errores: Partial<Record<keyof BorradorDeFechas, string>> }

export function validarFechas(borrador: BorradorDeFechas, zona: string): ValidacionDeFechas {
  const errores: Partial<Record<keyof BorradorDeFechas, string>> = {}
  const leer = (texto: string, campo: keyof BorradorDeFechas): string | null => {
    if (texto.trim() === '') return null
    const instante = instanteDeLocal(texto.trim(), { zona })
    if (instante === null) errores[campo] = INCOMPLETA
    return instante
  }
  const subastaEn = leer(borrador.inicio, 'inicio')
  const subastaFinEn = leer(borrador.cierre, 'cierre')
  if (subastaEn && subastaFinEn && Date.parse(subastaFinEn) < Date.parse(subastaEn)) {
    errores.cierre = 'El cierre no puede ser antes del inicio.'
  }
  return Object.keys(errores).length > 0
    ? { ok: false, errores }
    : { ok: true, datos: { subastaEn, subastaFinEn } }
}

// Sólo lo que cambió, con los nombres de la base; null = nada que guardar.
export function cambiosDeFechas(
  original: FechasDeSubasta,
  nuevas: FechasDeSubasta,
): { subasta_en?: string | null; subasta_fin_en?: string | null } | null {
  const mismo = (a: string | null, b: string | null) =>
    a === b || (a !== null && b !== null && Date.parse(a) === Date.parse(b))
  const cambios: { subasta_en?: string | null; subasta_fin_en?: string | null } = {}
  if (!mismo(original.subastaEn, nuevas.subastaEn)) cambios.subasta_en = nuevas.subastaEn
  if (!mismo(original.subastaFinEn, nuevas.subastaFinEn))
    cambios.subasta_fin_en = nuevas.subastaFinEn
  return Object.keys(cambios).length > 0 ? cambios : null
}

// «Se escribe en hora de America/La_Paz (GMT-4)»: la abreviatura del momento escrito (o de ahora), así el cambio de horario se ve.
export function ayudaDeZona(zona: string, iso: string | null, ahora: string): string {
  return `Se escribe en hora de ${zona} (${abreviaturaDeZona(iso ?? ahora, { zona })}).`
}
