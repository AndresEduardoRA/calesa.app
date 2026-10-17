// Emparejar las columnas de un archivo con lo que un lead lleva: los cuatro datos fijos y los campos
// activos del layout. Se compara por etiqueta o clave, sin mayúsculas ni tildes; lo que no se empareja
// se ignora y se dice. Sin I/O.
//
// Los encabezados del archivo **nunca** son claves de un objeto: todo va en arreglos y `Map`s, y lo que
// viaja a la base son los ids de los objetivos, que salen del layout y no del archivo (`__proto__` es
// sólo un texto que no se empareja).
import { CLAVE_DEL_ALTA, claveDeAtributoDeAlta } from '../alta'
import type { CampoDeLead } from '../campo'
import { esEncabezadoDeNumero } from '../numero'
import { comparable } from './texto'

export type ObjetivoDeImportacion = {
  // La clave del formulario del alta (`nombre`, `telefono_principal`, `atributos.<clave>`…): es la misma
  // con la que la base y `validarAlta()` nombran el dato.
  id: string
  etiqueta: string
  // Los fijos que el alta exige siempre; un campo del layout exige lo que dice su `requerido`.
  requerido: boolean
  fijo: boolean
  // Los nombres con los que se reconoce (ya comparables).
  nombres: readonly string[]
}

const FIJOS: readonly ObjetivoDeImportacion[] = [
  {
    id: CLAVE_DEL_ALTA.nombre,
    etiqueta: 'Nombre',
    requerido: true,
    fijo: true,
    nombres: ['nombre', 'nombre y apellido', 'nombre completo'],
  },
  {
    id: CLAVE_DEL_ALTA.telefono,
    etiqueta: 'Teléfono',
    requerido: true,
    fijo: true,
    nombres: ['telefono', 'telefono principal', 'celular', 'movil', 'whatsapp'],
  },
  {
    id: CLAVE_DEL_ALTA.tipo,
    etiqueta: 'Tipo',
    requerido: false,
    fijo: true,
    nombres: ['tipo', 'tipo de lead'],
  },
  {
    id: CLAVE_DEL_ALTA.origen,
    etiqueta: 'Origen',
    requerido: false,
    fijo: true,
    nombres: ['origen', 'origen del lead'],
  },
]

// Los fijos y después los campos activos del layout, en su orden.
export function objetivosDeImportacion(campos: readonly CampoDeLead[]): ObjetivoDeImportacion[] {
  const delLayout = campos
    .filter((campo) => campo.activo)
    .map((campo) => ({
      id: claveDeAtributoDeAlta(campo.clave),
      etiqueta: campo.etiqueta,
      requerido: campo.requerido,
      fijo: false,
      nombres: [comparable(campo.etiqueta), comparable(campo.clave)],
    }))
  return [...FIJOS, ...delLayout]
}

export type Emparejamiento = {
  // Por columna del archivo: el id del objetivo, o `null` si se ignora.
  destinos: readonly (string | null)[]
  // Qué pasó con lo que no se emparejó, dicho para la persona.
  avisos: readonly string[]
}

export function emparejarColumnas(
  encabezados: readonly string[],
  objetivos: readonly ObjetivoDeImportacion[],
): Emparejamiento {
  const porNombre = new Map<string, string>()
  for (const objetivo of objetivos) {
    for (const nombre of objetivo.nombres) {
      if (nombre !== '' && !porNombre.has(nombre)) {
        porNombre.set(nombre, objetivo.id)
      }
    }
  }
  const usados = new Map<string, string>()
  const avisos: string[] = []
  const destinos = encabezados.map((encabezado) => {
    if (encabezado.trim() === '') {
      return null
    }
    const id = porNombre.get(comparable(encabezado))
    if (id === undefined) {
      // Los números de un lead (el global y el propio) los pone el sistema: no se pueden fijar desde un archivo.
      avisos.push(
        esEncabezadoDeNumero(encabezado)
          ? `La columna «${encabezado}» no se importa: el número de un lead lo pone el sistema.`
          : `La columna «${encabezado}» no corresponde a ningún dato: se ignora.`,
      )
      return null
    }
    const primera = usados.get(id)
    if (primera !== undefined) {
      avisos.push(`La columna «${encabezado}» repite «${primera}»: se ignora.`)
      return null
    }
    usados.set(id, encabezado)
    return id
  })
  return { destinos, avisos }
}

// Elegir a mano a qué dato va una columna. Un dato lo lleva una sola columna: si otra ya lo tenía,
// esa se ignora.
export function conDestino(
  destinos: readonly (string | null)[],
  columna: number,
  objetivo: string | null,
): (string | null)[] {
  return destinos.map((actual, i) => {
    if (i === columna) {
      return objetivo
    }
    return objetivo !== null && actual === objetivo ? null : actual
  })
}

// Lo que falta para poder seguir: los datos que se exigen y ninguna columna lleva.
export function objetivosSinColumna(
  destinos: readonly (string | null)[],
  objetivos: readonly ObjetivoDeImportacion[],
): ObjetivoDeImportacion[] {
  const llevados = new Set(destinos)
  return objetivos.filter((objetivo) => objetivo.requerido && !llevados.has(objetivo.id))
}
