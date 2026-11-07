// Lo que el editor de la plantilla lleva al navegador (4.19-3b): del contexto de `validarPlantilla()` sólo lo que ese validador y el editor necesitan. La `definicion`
// entera de la fórmula pesa decenas de KB y no se dibuja; aquí quedan los nodos con lugar en la tarjeta (o que dan el tipo de cambio de un bucket), con su etiqueta,
// su grupo y su salida; los buckets; los grupos; del diseño los modos y los secundarios, y de la visibilidad sólo el `ver` de esos ids. Nunca el cuerpo de un nodo.
// Todo lo que se arma por id va por `Object.fromEntries`/`Map`: `__proto__` y `constructor` son ids legales.
import {
  lugaresDe,
  type DefinicionParaPlantilla,
  type DisenoParaPlantilla,
  type NodoParaPlantilla,
  type VisibilidadParaPlantilla,
} from './nodos-de-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'

export function contextoParaElNavegador(contexto: ContextoDePlantilla): ContextoDePlantilla {
  const { definicion, diseno, visibilidad } = contexto
  const { lugar } = lugaresDe(contexto)
  const buckets = definicion.buckets ?? {}
  const deLosModos = (diseno?.cabecera?.modos ?? []).map((m) => ({
    buckets: (m.buckets ?? []).map(({ bucket, nodo }) => ({ bucket, nodo })),
  }))
  // Los nodos que da el tipo de cambio de un bucket (el de omisión y los de cada modo): `tipoDeCambioRestringido()` los juzga por su visibilidad.
  const deTipoDeCambio = new Set([
    ...Object.values(buckets),
    ...deLosModos.flatMap((m) => m.buckets.map((b) => b.nodo)),
  ])
  const nodos: NodoParaPlantilla[] = (definicion.nodos ?? [])
    .filter((n) => lugar.has(n.id) || deTipoDeCambio.has(n.id))
    .map((n) => ({
      id: n.id,
      etiqueta: n.etiqueta ?? null,
      grupo: n.grupo ?? null,
      salida: n.salida ?? null,
    }))
  const reducida: DefinicionParaPlantilla = {
    nodos,
    buckets: Object.fromEntries(Object.entries(buckets)),
    grupos: (definicion.grupos ?? []).map((g) => ({
      id: g.id,
      etiqueta: g.etiqueta ?? null,
      tono: g.tono ?? null,
      bucket: g.bucket ?? null,
    })),
  }
  const disenoReducido: DisenoParaPlantilla | null =
    diseno === null
      ? null
      : {
          cabecera: { modos: deLosModos },
          tarjeta_total: { secundarios: [...(diseno.tarjeta_total?.secundarios ?? [])] },
        }
  return {
    definicion: reducida,
    diseno: disenoReducido,
    visibilidad: visibilidadReducida(visibilidad, [
      ...nodos.map((n) => n.id),
      ...deTipoDeCambio,
      ...lugar,
    ]),
    tonos: contexto.tonos,
  }
}

// Sólo `{ ver }` de cada id que se queda; un id que no figura sigue sin figurar (para `esDeTodos()` es restringido).
function visibilidadReducida(
  visibilidad: VisibilidadParaPlantilla | null,
  ids: readonly string[],
): VisibilidadParaPlantilla | null {
  if (visibilidad === null) return null
  const entradas = [...new Set(ids)].flatMap((id): [string, { ver?: unknown }][] => {
    if (!Object.hasOwn(visibilidad, id)) return []
    const v = visibilidad[id]
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return [[id, {}]]
    return [[id, Object.hasOwn(v, 'ver') ? { ver: (v as { ver?: unknown }).ver } : {}]]
  })
  return Object.fromEntries(entradas)
}
