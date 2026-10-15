// De lo que dice una celda a lo que el formulario del alta espera de un campo (`ValorDeFormulario`),
// según su tipo. Después `validarAlta()` lo valida con las mismas reglas del alta: el archivo no tiene
// reglas propias. Sin I/O.
import { vacioDe, type ValorDeFormulario } from '@/shared/lib/campos'
import type { CampoDeLead } from '../campo'
import { comparable, sinApostrofoDeFormula } from './texto'

export type Conversion = { ok: true; valor: ValorDeFormulario } | { ok: false; motivo: string }

const SI = new Set(['si', 's', 'yes', 'y', 'true', 'verdadero', '1', 'x'])
const NO = new Set(['no', 'n', 'false', 'falso', '0'])

const MOTIVO_DE_FECHA = 'No es una fecha válida: usa AAAA-MM-DD o día/mes/año.'
const MOTIVO_DE_FECHA_HORA =
  'No es una fecha y hora válidas: usa AAAA-MM-DD HH:MM o día/mes/año HH:MM.'

const dosDigitos = (n: number) => String(n).padStart(2, '0')

function diaReal(anio: number, mes: number, dia: number): string | null {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  const valida =
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
  return valida ? `${String(anio).padStart(4, '0')}-${dosDigitos(mes)}-${dosDigitos(dia)}` : null
}

// ISO (`2026-03-04`) o día/mes/año (`4/3/2026`, `04-03-2026`, `4.3.2026`).
export function fechaIso(texto: string): string | null {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(texto)
  if (iso) {
    return diaReal(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  }
  const latina = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(texto)
  return latina ? diaReal(Number(latina[3]), Number(latina[2]), Number(latina[1])) : null
}

// `AAAA-MM-DDTHH:mm` (la hora de la empresa), desde cualquiera de las dos formas con hora.
export function fechaHoraLocal(texto: string): string | null {
  const partes = /^(.+?)[ T](\d{1,2}):(\d{2})$/.exec(texto)
  if (!partes) {
    return null
  }
  const dia = fechaIso((partes[1] ?? '').trim())
  const hora = Number(partes[2])
  const minuto = Number(partes[3])
  return dia && hora <= 23 && minuto <= 59
    ? `${dia}T${dosDigitos(hora)}:${dosDigitos(minuto)}`
    : null
}

// «1.234,5» y «1,234.5» se dicen como un número; lo demás lo lee el esquema del campo.
function numeroLimpio(texto: string): string {
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(texto)) {
    return texto.replaceAll('.', '')
  }
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(texto)) {
    return texto.replaceAll(',', '')
  }
  return texto
}

function claveDeOpcion(campo: CampoDeLead, texto: string): string | null {
  const buscado = comparable(texto)
  const opcion = campo.opciones.find(
    (otra) => comparable(otra.etiqueta) === buscado || comparable(otra.clave) === buscado,
  )
  return opcion?.clave ?? null
}

const motivoDeOpcion = (campo: CampoDeLead, texto: string) =>
  `«${texto}» no es una de las opciones de «${campo.etiqueta}».`

function convertirOpciones(campo: CampoDeLead, texto: string): Conversion {
  const claves: string[] = []
  for (const parte of texto.split('|')) {
    const una = parte.trim()
    if (una === '') {
      continue
    }
    const clave = claveDeOpcion(campo, una)
    if (clave === null) {
      return { ok: false, motivo: motivoDeOpcion(campo, una) }
    }
    claves.push(clave)
  }
  return { ok: true, valor: claves }
}

function convertirSiONo(texto: string): Conversion {
  const dicho = comparable(texto)
  if (SI.has(dicho)) {
    return { ok: true, valor: true }
  }
  return NO.has(dicho) ? { ok: true, valor: false } : { ok: false, motivo: 'Escribe «Sí» o «No».' }
}

function convertirConFormato(
  texto: string,
  leer: (texto: string) => string | null,
  motivo: string,
): Conversion {
  const leido = leer(texto)
  return leido === null ? { ok: false, motivo } : { ok: true, valor: leido }
}

type Convertidor = (campo: CampoDeLead, texto: string) => Conversion

const comoTexto: Convertidor = (_campo, texto) => ({ ok: true, valor: texto })

const POR_TIPO: Record<CampoDeLead['tipo'], Convertidor> = {
  booleano: (_campo, texto) => convertirSiONo(texto),
  opcion: (campo, texto) => {
    const clave = claveDeOpcion(campo, texto)
    return clave === null
      ? { ok: false, motivo: motivoDeOpcion(campo, texto) }
      : { ok: true, valor: clave }
  },
  multi_opcion: convertirOpciones,
  fecha: (_campo, texto) => convertirConFormato(texto, fechaIso, MOTIVO_DE_FECHA),
  fecha_hora: (_campo, texto) => convertirConFormato(texto, fechaHoraLocal, MOTIVO_DE_FECHA_HORA),
  numero: (_campo, texto) => ({ ok: true, valor: numeroLimpio(texto) }),
  moneda: (_campo, texto) => ({ ok: true, valor: numeroLimpio(texto) }),
  texto: comoTexto,
  texto_largo: comoTexto,
  url: comoTexto,
  correo: comoTexto,
  documento: comoTexto,
}

export function valorDeFormularioDesdeTexto(campo: CampoDeLead, crudo: string): Conversion {
  const texto = sinApostrofoDeFormula(crudo).trim()
  if (texto === '') {
    return { ok: true, valor: vacioDe(campo) }
  }
  return POR_TIPO[campo.tipo](campo, texto)
}
