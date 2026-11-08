// Los grupos de la fórmula en el editor (4.21-3c; docs/UX.md › «Cotización: fórmula»): editar uno de los que hay (etiqueta, plazo, tono, el bucket que le da su tipo de cambio
// y qué filas suman a él), sin sumar ni quitar grupos (P2: la plantilla de la tarjeta nombra exactamente los grupos de la fórmula). Puro y nunca lanza: lo que no sirve es un
// error por campo. Lo que vale la fórmula entera lo dice después `validarFormula()` (un grupo vacío, el doble conteo), como tras el «Aplicar» de una fila.
import type { Formula, Grupo } from '../formula'
import { daMonto, esMonto, type Nodo } from '../nodos'
import { filasDe } from './filas'

// El catálogo de tonos no pasa de 24: el tope de `_tonos_tope()` en la base, el mismo `TOPE_DE_TONOS` del área `plantilla` (un área no importa otra).
export const TOPE_DE_TONOS_DEL_EDITOR = 24

const MAXIMO_DE_ETIQUETA = 60
const MAXIMO_DE_PLAZO = 40

export type CambiosDelGrupo = {
  etiqueta: string
  // Vacío quita el plazo.
  plazo: string
  tono: string
  bucket: string
  // Los ids de las filas que quedan en el grupo; las demás que estaban salen sin grupo.
  miembros: readonly string[]
}

export type CampoDelGrupo = 'grupo' | 'etiqueta' | 'plazo' | 'tono' | 'bucket' | 'miembros'
export type ErrorDelGrupo = { campo: CampoDelGrupo; mensaje: string }

// Lo que el «Aplicar» movió: la fila que entró (y la etiqueta del grupo de donde vino, o nula si no tenía) y la que quedó sin grupo.
export type FilaQueEntro = { id: string; etiqueta: string; desde: string | null }
export type FilaQuitada = { id: string; etiqueta: string }

export type ResultadoDelGrupo =
  | { ok: true; formula: Formula; entraron: FilaQueEntro[]; quitadas: FilaQuitada[] }
  | { ok: false; errores: ErrorDelGrupo[] }

export const MENSAJE_FILA_QUE_NO_SUMA =
  'Esa fila no puede sumar a un grupo: tiene que ser un monto y no una salida.'

// Lo que `validarFormula()` exige de un miembro (`miembro_no_es_monto`, `miembro_con_salida`).
export const puedeSumarAlGrupo = (n: Nodo): boolean =>
  daMonto(n) && esMonto(n) && n.salida === undefined

// Las filas (raíces, nunca una auxiliar) que pueden sumar a un grupo, en el orden de la fórmula.
export const filasQuePuedenSumar = (formula: Formula): Nodo[] =>
  filasDe(formula.definicion)
    .map((f) => f.nodo)
    .filter(puedeSumarAlGrupo)

export const miembrosDe = (formula: Formula, grupoId: string): Nodo[] =>
  formula.definicion.nodos.filter((n) => n.grupo === grupoId)

// Cada bucket con el tipo de cambio que lo convierte, para el selector «Tipo de cambio».
export type OpcionDeBucket = { bucket: string; etiqueta: string; clave: string | null }
export function opcionesDeBucket(formula: Formula): OpcionDeBucket[] {
  const nodos = new Map(formula.definicion.nodos.map((n) => [n.id, n]))
  return Object.entries(formula.definicion.buckets ?? {}).map(([bucket, id]) => {
    const n = nodos.get(id)
    return {
      bucket,
      etiqueta: n?.etiqueta ?? id,
      clave: n?.tipo === 'tipo_cambio' ? n.clave : null,
    }
  })
}

// El grupo de un rechazo de `validarFormula()` (`grupo_vacio`, `bucket_inexistente`…): `donde` es el id de un grupo. Se pregunta después de que no nombró una fila.
export function grupoDelRechazo(
  rechazo: { donde?: string | undefined },
  grupos: readonly Grupo[],
): string | null {
  const { donde } = rechazo
  if (donde === undefined) return null
  return grupos.some((g) => g.id === donde) ? donde : null
}

function erroresDeLosCampos(
  formula: Formula,
  cambios: CambiosDelGrupo,
  tonos: ReadonlySet<string>,
): ErrorDelGrupo[] {
  const errores: ErrorDelGrupo[] = []
  const etiqueta = cambios.etiqueta.trim()
  if (etiqueta === '')
    errores.push({ campo: 'etiqueta', mensaje: 'Escribe cómo se llama el grupo.' })
  else if (etiqueta.length > MAXIMO_DE_ETIQUETA)
    errores.push({ campo: 'etiqueta', mensaje: 'La etiqueta pasa de 60 caracteres.' })
  if (cambios.plazo.trim().length > MAXIMO_DE_PLAZO)
    errores.push({ campo: 'plazo', mensaje: 'El plazo pasa de 40 caracteres.' })
  if (!tonos.has(cambios.tono))
    errores.push({ campo: 'tono', mensaje: 'Elige un tono de la lista.' })
  if (!Object.hasOwn(formula.definicion.buckets ?? {}, cambios.bucket))
    errores.push({ campo: 'bucket', mensaje: 'Elige un tipo de cambio de la lista.' })
  const pueden = new Set(filasQuePuedenSumar(formula).map((n) => n.id))
  if (cambios.miembros.some((id) => !pueden.has(id)))
    errores.push({ campo: 'miembros', mensaje: MENSAJE_FILA_QUE_NO_SUMA })
  return errores
}

function grupoNuevo(grupo: Grupo, cambios: CambiosDelGrupo): Grupo {
  const plazo = cambios.plazo.trim()
  return {
    id: grupo.id,
    etiqueta: cambios.etiqueta.trim(),
    ...(plazo === '' ? {} : { plazo }),
    tono: cambios.tono,
    bucket: cambios.bucket,
  }
}

// Sólo cambia `grupo` del nodo raíz de cada fila movida: su texto, sus auxiliares y su lugar quedan igual.
function nodoConGrupo(n: Nodo, grupo: string | null): Nodo {
  if (grupo !== null) return { ...n, grupo }
  const { grupo: _quitado, ...resto } = n
  return resto as Nodo
}

export function aplicarGrupo(
  formula: Formula,
  grupoId: string,
  cambios: CambiosDelGrupo,
  tonos: ReadonlySet<string>,
): ResultadoDelGrupo {
  const grupos = formula.definicion.grupos ?? []
  const grupo = grupos.find((g) => g.id === grupoId)
  if (grupo === undefined) {
    return {
      ok: false,
      errores: [{ campo: 'grupo', mensaje: 'Ese grupo ya no está en la fórmula.' }],
    }
  }
  const errores = erroresDeLosCampos(formula, cambios, tonos)
  if (errores.length > 0) return { ok: false, errores }

  const etiquetas = new Map(grupos.map((g) => [g.id, g.etiqueta]))
  const quedan = new Set(cambios.miembros)
  const entraron: FilaQueEntro[] = []
  const quitadas: FilaQuitada[] = []
  const nodos = formula.definicion.nodos.map((n) => {
    if (quedan.has(n.id) && n.grupo !== grupoId) {
      entraron.push({
        id: n.id,
        etiqueta: n.etiqueta,
        desde: n.grupo === undefined ? null : (etiquetas.get(n.grupo) ?? n.grupo),
      })
      return nodoConGrupo(n, grupoId)
    }
    if (!quedan.has(n.id) && n.grupo === grupoId) {
      quitadas.push({ id: n.id, etiqueta: n.etiqueta })
      return nodoConGrupo(n, null)
    }
    return n
  })
  return {
    ok: true,
    formula: {
      ...formula,
      definicion: {
        ...formula.definicion,
        nodos,
        grupos: grupos.map((g) => (g.id === grupoId ? grupoNuevo(g, cambios) : g)),
      },
    },
    entraron,
    quitadas,
  }
}
