// Con qué nace el editor de la plantilla y cómo se alinea con la fórmula (4.19-3b). Reglas puras, sin I/O. Lo que la plantilla guardada dice y la fórmula de hoy ya no
// (un grupo que se quitó, una etiqueta de un nodo que ya no tiene lugar) se corrige aquí y se avisa; lo alineado no se guarda solo: es un cambio de quien edita.
import { btrim } from './json-de-la-base'
import type { Plantilla } from './forma-de-plantilla'
import type { VersionDePlantilla } from './lectura-de-la-plantilla'
import { lugaresDe } from './nodos-de-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'

export type DeDondeNace = 'borrador' | 'publicada' | 'omision'

const TOPE_DEL_TOTAL = 40

const etiquetaDelGrupo = (contexto: ContextoDePlantilla, id: string): string =>
  contexto.definicion.grupos?.find((g) => g.id === id)?.etiqueta || id
const etiquetaDelNodo = (contexto: ContextoDePlantilla, id: string): string =>
  contexto.definicion.nodos?.find((n) => n.id === id)?.etiqueta || id

function sinLasClavesSinLugar(
  d: Readonly<Record<string, string>> | undefined,
  lugar: ReadonlySet<string>,
  avisar: (id: string) => string,
  avisos: string[],
): Readonly<Record<string, string>> | undefined {
  if (d === undefined) return undefined
  const quedan = Object.entries(d).filter(([k]) => lugar.has(k))
  for (const [k] of Object.entries(d)) if (!lugar.has(k)) avisos.push(avisar(k))
  return quedan.length === 0 ? undefined : Object.fromEntries(quedan)
}

// Quita el grupo que la fórmula ya no tiene y el repetido (el segundo), suma al final y sin tono el que falta, y quita la etiqueta o la leyenda de un nodo que ya no tiene
// lugar en la tarjeta. No muta su entrada.
export function alinearConLaFormula(
  plantilla: Plantilla,
  contexto: ContextoDePlantilla,
): { plantilla: Plantilla; avisos: string[] } {
  const avisos: string[] = []
  const deLaFormula = (contexto.definicion.grupos ?? []).map((g) => g.id)
  const existentes = new Set(deLaFormula)
  const vistos = new Set<string>()
  const grupos = plantilla.grupos.filter((g) => {
    if (!existentes.has(g.grupo)) {
      avisos.push(`El grupo «${g.grupo}» ya no está en la fórmula: se quitó.`)
      return false
    }
    if (vistos.has(g.grupo)) {
      avisos.push(
        `El grupo «${etiquetaDelGrupo(contexto, g.grupo)}» estaba repetido: se quitó el segundo.`,
      )
      return false
    }
    vistos.add(g.grupo)
    return true
  })
  const nuevos = deLaFormula.filter((id) => !vistos.has(id))
  for (const id of nuevos) {
    avisos.push(
      `El grupo «${etiquetaDelGrupo(contexto, id)}» es nuevo en la fórmula: se sumó al final, sin tono.`,
    )
  }
  const { lugar } = lugaresDe(contexto)
  const sinLugar = (id: string, de: 'etiqueta' | 'leyenda') =>
    `La ${de} de «${etiquetaDelNodo(contexto, id)}» ya no tiene lugar en la tarjeta: se quitó.`
  const etiquetas = sinLasClavesSinLugar(
    plantilla.etiquetas,
    lugar,
    (id) => sinLugar(id, 'etiqueta'),
    avisos,
  )
  const leyendas = sinLasClavesSinLugar(
    plantilla.leyendas,
    lugar,
    (id) => sinLugar(id, 'leyenda'),
    avisos,
  )
  const { etiquetas: _e, leyendas: _l, ...resto } = plantilla
  return {
    plantilla: {
      ...resto,
      grupos: [...grupos, ...nuevos.map((grupo) => ({ grupo }))],
      ...(etiquetas === undefined ? {} : { etiquetas }),
      ...(leyendas === undefined ? {} : { leyendas }),
    },
    avisos,
  }
}

// La plantilla de un origen que no tiene ninguna: los grupos de la fórmula en su orden, sin tono, y el total con la etiqueta del nodo que lo da.
function omision(contexto: ContextoDePlantilla): Plantilla {
  const total = contexto.definicion.nodos?.find((n) => n.salida === 'total')?.etiqueta ?? ''
  const etiqueta = btrim(total) === '' ? 'Total' : [...total].slice(0, TOPE_DEL_TOTAL).join('')
  return {
    grupos: (contexto.definicion.grupos ?? []).map((g) => ({ grupo: g.id })),
    total: { etiqueta },
    logo: true,
    columnas: { leyenda: false, plazo: false, tipo_cambio: false },
  }
}

// El borrador si se pudo leer; si no, la copia de la publicada; si tampoco, la omisión. Un borrador o una publicada ilegibles no se editan a medias: se dice por qué
// y se parte de lo que sigue. Siempre pasa por `alinearConLaFormula()`.
export function plantillaParaEditar({
  borrador,
  publicada,
  contexto,
}: {
  borrador: VersionDePlantilla | null
  publicada: VersionDePlantilla | null
  contexto: ContextoDePlantilla
}): { plantilla: Plantilla; de: DeDondeNace; avisos: string[] } {
  const avisos: string[] = []
  let base: { plantilla: Plantilla; de: DeDondeNace } | null = null
  if (borrador?.plantilla) base = { plantilla: borrador.plantilla, de: 'borrador' }
  else {
    if (borrador) {
      avisos.push(
        `El borrador guardado no se pudo leer (${borrador.motivo ?? 'sin motivo'}): al guardar se reemplaza.`,
      )
    }
    if (publicada?.plantilla) base = { plantilla: publicada.plantilla, de: 'publicada' }
    else if (publicada) {
      avisos.push(
        `La versión ${publicada.version ?? ''} publicada no se pudo leer (${publicada.motivo ?? 'sin motivo'}): se parte de los grupos de la fórmula.`,
      )
    }
  }
  const nace = base ?? { plantilla: omision(contexto), de: 'omision' as const }
  const alineada = alinearConLaFormula(nace.plantilla, contexto)
  return { plantilla: alineada.plantilla, de: nace.de, avisos: [...avisos, ...alineada.avisos] }
}
