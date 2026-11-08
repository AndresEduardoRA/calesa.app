// La lectura de la vista previa del editor (4.19-4): de la plantilla de trabajo y del contexto reducido, lo que la base tomaría al dibujar la tarjeta (los grupos en el orden
// de la plantilla, las filas en el de la fórmula, la etiqueta escrita o la del nodo, la leyenda sólo si está escrita, el tono elegido si sigue en el catálogo). Puro y plano.
// Corta cada grupo en `FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA` antes de mapear: lo que cuesta no crece con los miembros. Todo por id va por `Map` u `Object.hasOwn`.
import {
  FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA,
  type LecturaParaLaVistaPrevia,
} from '../vista-previa-de-la-plantilla'
import type { FilasDelEditor } from './filas-del-editor'
import { btrim } from './json-de-la-base'
import type { Plantilla } from './forma-de-plantilla'
import type { TonoDelCatalogo } from './lectura-de-la-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'

const escrito = (dic: Readonly<Record<string, string>> | undefined, id: string): string | null => {
  if (dic === undefined || !Object.hasOwn(dic, id)) return null
  const texto = dic[id]
  return texto !== undefined && btrim(texto) !== '' ? texto : null
}

export function lecturaParaLaVistaPrevia(entrada: {
  plantilla: Plantilla
  filas: FilasDelEditor
  contexto: ContextoDePlantilla
  tonos: readonly TonoDelCatalogo[]
}): LecturaParaLaVistaPrevia {
  const { plantilla, filas, contexto, tonos } = entrada
  const catalogo = new Map(tonos.map((t) => [t.clave, t]))
  const deLaFormula = new Map((contexto.definicion.grupos ?? []).map((g) => [g.id, g]))
  const nodos = new Map((contexto.definicion.nodos ?? []).map((n) => [n.id, n]))
  const buckets = contexto.definicion.buckets ?? {}
  const conLeyenda = plantilla.columnas.leyenda
  const delCatalogo = (clave: string | null | undefined) =>
    clave != null && catalogo.has(clave) ? clave : null

  const grupos = filas.grupos.map((g) => {
    const f = deLaFormula.get(g.id)
    const bucket = f?.bucket
    const nodoDelBucket =
      bucket != null && Object.hasOwn(buckets, bucket) ? buckets[bucket] : undefined
    const delNodo = nodoDelBucket === undefined ? undefined : nodos.get(nodoDelBucket)
    return {
      id: g.id,
      etiqueta: g.etiqueta,
      plazo: typeof f?.plazo === 'string' && f.plazo !== '' ? f.plazo : null,
      tono: delCatalogo(g.tono) ?? delCatalogo(g.tonoDelGrupo),
      tipoDeCambio: delNodo === undefined ? null : delNodo.etiqueta || delNodo.id,
      filas: g.miembros.slice(0, FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA).map((m) => ({
        nodo: m.id,
        etiqueta: escrito(plantilla.etiquetas, m.id) ?? m.etiqueta,
        leyenda: conLeyenda ? escrito(plantilla.leyendas, m.id) : null,
      })),
      filasDeMas: Math.max(0, g.miembros.length - FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA),
    }
  })
  const usados = new Set(grupos.flatMap((g) => (g.tono === null ? [] : [g.tono])))
  const leyendaDelTotal = btrim(plantilla.total.leyenda ?? '')
  const nota = btrim(plantilla.nota ?? '')
  return {
    logo: plantilla.logo,
    nota: nota === '' ? null : plantilla.nota!,
    columnas: {
      leyenda: conLeyenda,
      tipoDeCambio: plantilla.columnas.tipo_cambio,
      plazo: plantilla.columnas.plazo,
    },
    total: {
      etiqueta: btrim(plantilla.total.etiqueta) === '' ? 'Total' : plantilla.total.etiqueta,
      leyenda: conLeyenda && leyendaDelTotal !== '' ? plantilla.total.leyenda! : null,
    },
    grupos,
    aparte: filas.aparte.map((a) => ({
      nodo: a.id,
      etiqueta: escrito(plantilla.etiquetas, a.id) ?? a.etiqueta,
    })),
    tonos: tonos.flatMap((t) =>
      usados.has(t.clave) && t.claro !== undefined && t.oscuro !== undefined
        ? [{ clave: t.clave, claro: t.claro, oscuro: t.oscuro }]
        : [],
    ),
  }
}
