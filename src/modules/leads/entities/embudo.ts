// Los embudos de una persona: personales (nadie más los ve, ni la supervisión), hasta 10, con entre
// 3 y 12 etapas. Cada embudo tiene exactamente una etapa inicial y al menos una ganada y una perdida;
// los nombres no se repiten sin importar mayúsculas y el color es una clave de la paleta de las
// etiquetas. Las reglas son el espejo de `embudo_*` (la base decide; esto deja decirlo antes de enviar).
import { z } from 'zod'
import { CLAVES_DE_COLOR, type ColorDeEtiqueta } from './etiqueta'

export const MAXIMO_DE_EMBUDOS = 10
export const MINIMO_DE_ETAPAS = 3
export const MAXIMO_DE_ETAPAS = 12
export const LARGO_MAXIMO_DE_EMBUDO = 40
export const LARGO_MAXIMO_DE_ETAPA = 30

// «Etapas» del embudo abierto, en la URL de la vista (`?panel=etapas`).
export const PANEL_ETAPAS = 'etapas'

export type Etapa = {
  // Una etapa nueva (todavía sin guardar) no tiene id: la base se lo pone.
  id: string | null
  nombre: string
  color: ColorDeEtiqueta
  esInicial: boolean
  esGanada: boolean
  esPerdida: boolean
}

export type EtapaGuardada = Etapa & { id: string }

export type Embudo = {
  id: string
  nombre: string
  esDefault: boolean
  // La versión de la estructura (nombre y etapas): guardar la manda.
  actualizadoEn: string
  etapas: EtapaGuardada[]
}

const color = z.enum(CLAVES_DE_COLOR).catch('gris')

export const esquemaEtapa = z.object({
  id: z.guid(),
  nombre: z.string().min(1),
  color,
  es_inicial: z.boolean(),
  es_ganada: z.boolean(),
  es_perdida: z.boolean(),
})

export function etapaDesde(fila: z.infer<typeof esquemaEtapa>): EtapaGuardada {
  return {
    id: fila.id,
    nombre: fila.nombre,
    color: fila.color,
    esInicial: fila.es_inicial,
    esGanada: fila.es_ganada,
    esPerdida: fila.es_perdida,
  }
}

const esquemaEmbudo = z.object({
  id: z.guid(),
  nombre: z.string().min(1),
  es_default: z.boolean(),
  actualizado_en: z.string().min(1),
  etapas: z.array(esquemaEtapa),
})

// Un embudo como lo entregan las RPC (`_embudo_json`) y la lectura de la tabla. Roto: `null`.
export function embudoDesde(crudo: unknown): Embudo | null {
  const leido = esquemaEmbudo.safeParse(crudo)
  if (!leido.success) {
    return null
  }
  const { id, nombre, es_default, actualizado_en, etapas } = leido.data
  return {
    id,
    nombre,
    esDefault: es_default,
    actualizadoEn: actualizado_en,
    etapas: etapas.map(etapaDesde),
  }
}

// Una lista: lo que no cumple la forma se descarta. El de por defecto primero, después por nombre.
export function embudosDesde(crudo: unknown): Embudo[] {
  const lista = Array.isArray(crudo)
    ? crudo.flatMap((uno) => {
        const leido = embudoDesde(uno)
        return leido ? [leido] : []
      })
    : []
  return lista.sort(
    (a, b) => Number(b.esDefault) - Number(a.esDefault) || a.nombre.localeCompare(b.nombre, 'es'),
  )
}

export function esFinal(etapa: Pick<Etapa, 'esGanada' | 'esPerdida'>): boolean {
  return etapa.esGanada || etapa.esPerdida
}

// El nombre de un embudo: el motivo si no pasa (1 a 40 y que no tenga otro con el mismo nombre).
export function validarNombreDeEmbudo(
  nombre: string,
  otros: readonly Pick<Embudo, 'id' | 'nombre'>[],
  propio: string | null,
): string | null {
  const limpio = nombre.trim()
  if (limpio.length < 1 || limpio.length > LARGO_MAXIMO_DE_EMBUDO) {
    return `El nombre de un embudo lleva entre 1 y ${String(LARGO_MAXIMO_DE_EMBUDO)} caracteres.`
  }
  const repetido = otros.find(
    (otro) =>
      otro.id !== propio && otro.nombre.toLocaleLowerCase('es') === limpio.toLocaleLowerCase('es'),
  )
  return repetido ? `Ya tienes un embudo «${repetido.nombre}».` : null
}

// Lo que se mira de cada etapa por separado: el nombre, que no se repita, y que las marcas no choquen.
function motivoDeLaEtapa(etapa: Etapa, vistos: Set<string>): string | null {
  const nombre = etapa.nombre.trim()
  if (nombre.length < 1 || nombre.length > LARGO_MAXIMO_DE_ETAPA) {
    return `El nombre de una etapa lleva entre 1 y ${String(LARGO_MAXIMO_DE_ETAPA)} caracteres.`
  }
  const clave = nombre.toLocaleLowerCase('es')
  if (vistos.has(clave)) {
    return `Hay dos etapas «${nombre}». Cámbiale el nombre a una.`
  }
  vistos.add(clave)
  if (etapa.esGanada && etapa.esPerdida) {
    return `«${nombre}» no puede ser ganada y perdida a la vez.`
  }
  if (etapa.esInicial && esFinal(etapa)) {
    return 'La etapa inicial no puede ser ganada ni perdida.'
  }
  return null
}

// Las etapas de un embudo, como las valida la base y con el mismo mensaje. `null` si pasan.
export function validarEtapas(etapas: readonly Etapa[]): string | null {
  if (etapas.length < MINIMO_DE_ETAPAS || etapas.length > MAXIMO_DE_ETAPAS) {
    return `Un embudo lleva entre ${String(MINIMO_DE_ETAPAS)} y ${String(MAXIMO_DE_ETAPAS)} etapas.`
  }
  const vistos = new Set<string>()
  for (const etapa of etapas) {
    const motivo = motivoDeLaEtapa(etapa, vistos)
    if (motivo) {
      return motivo
    }
  }
  if (etapas.filter((etapa) => etapa.esInicial).length !== 1) {
    return 'Marca una sola etapa como inicial.'
  }
  if (!etapas.some((etapa) => etapa.esGanada)) {
    return 'Hace falta al menos una etapa ganada.'
  }
  if (!etapas.some((etapa) => etapa.esPerdida)) {
    return 'Hace falta al menos una etapa perdida.'
  }
  return null
}

// Sube (−1) o baja (+1) una etapa. Fuera de los bordes no hace nada.
export function moverEtapa<T>(etapas: readonly T[], indice: number, paso: -1 | 1): T[] {
  const destino = indice + paso
  if (indice < 0 || indice >= etapas.length || destino < 0 || destino >= etapas.length) {
    return [...etapas]
  }
  const copia = [...etapas]
  const [movida] = copia.splice(indice, 1)
  if (movida !== undefined) {
    copia.splice(destino, 0, movida)
  }
  return copia
}

// La inicial es una sola: marcar una desmarca las demás (y deja de ser final).
export function conInicial(etapas: readonly Etapa[], indice: number): Etapa[] {
  return etapas.map((etapa, i) =>
    i === indice
      ? { ...etapa, esInicial: true, esGanada: false, esPerdida: false }
      : { ...etapa, esInicial: false },
  )
}

// Ganada y perdida se excluyen entre sí, y una final no es la inicial.
export function conFinal(
  etapas: readonly Etapa[],
  indice: number,
  cual: 'ganada' | 'perdida',
  valor: boolean,
): Etapa[] {
  return etapas.map((etapa, i) => {
    if (i !== indice) {
      return etapa
    }
    if (!valor) {
      return cual === 'ganada' ? { ...etapa, esGanada: false } : { ...etapa, esPerdida: false }
    }
    return {
      ...etapa,
      esInicial: false,
      esGanada: cual === 'ganada',
      esPerdida: cual === 'perdida',
    }
  })
}

// Una etapa nueva, abierta, al final, con un nombre que no choca con los que hay.
export function etapaNueva(etapas: readonly Etapa[]): Etapa {
  const nombres = new Set(etapas.map((etapa) => etapa.nombre.trim().toLocaleLowerCase('es')))
  let n = etapas.length + 1
  while (nombres.has(`etapa ${String(n)}`)) {
    n += 1
  }
  return {
    id: null,
    nombre: `Etapa ${String(n)}`,
    color: 'gris',
    esInicial: false,
    esGanada: false,
    esPerdida: false,
  }
}

// Lo que viaja a `embudo_etapas_guardar`: el conjunto entero, en su orden.
export function etapasParaGuardar(etapas: readonly Etapa[]) {
  return etapas.map((etapa) => ({
    ...(etapa.id ? { id: etapa.id } : {}),
    nombre: etapa.nombre.trim(),
    color: etapa.color,
    es_inicial: etapa.esInicial,
    es_ganada: etapa.esGanada,
    es_perdida: etapa.esPerdida,
  }))
}

// Sin cambios respecto de lo guardado (mismo orden, mismos datos): no hace falta guardar.
export function etapasIguales(a: readonly Etapa[], b: readonly Etapa[]): boolean {
  return JSON.stringify(etapasParaGuardar(a)) === JSON.stringify(etapasParaGuardar(b))
}
