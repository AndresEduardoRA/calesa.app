// Lo que dice el texto del buscador del panel del vehículo de la hoja de cotizar: qué se busca en el inventario, qué se puede traer de la
// subasta y qué avisar. Puro; si se puede traer lo decide el panel (origen, permiso, apibara).
import { cumpleElMinimo, LARGO_MAXIMO_DE_TEXTO, type MinimoDeBusqueda } from '@/shared/lib/filtros'
import { interpretarLinea, type EntradaDeApibara } from './apibara'

// Como el nombre de un lead: con menos de 3 letras o números seguidos no hay qué buscar en un trigrama y la base recorrería el origen.
export const MINIMO_DEL_PANEL: MinimoDeBusqueda = {
  letras: 3,
  numerosLibres: false,
  aviso: 'Escribe al menos 3 letras o números.',
}

export type TextoDelPanel = {
  // Lo que se busca en el título, el VIN y el lote; null = no se busca.
  busqueda: string | null
  // Lo que se puede traer de la subasta; null = nada.
  traer: EntradaDeApibara | null
  aviso: string | null
}

export function leerTextoDelPanel(texto: string): TextoDelPanel {
  const limpio = texto.trim().slice(0, LARGO_MAXIMO_DE_TEXTO)
  if (limpio === '') {
    return { busqueda: null, traer: null, aviso: null }
  }
  const linea = interpretarLinea(limpio)
  if (linea.ok) {
    // Un enlace no está en un título: sólo se trae. Un VIN o un lote se buscan antes de traerlos (puede que ya estén).
    return linea.entrada.tipo === 'enlace'
      ? { busqueda: null, traer: linea.entrada, aviso: null }
      : { busqueda: limpio, traer: linea.entrada, aviso: null }
  }
  if (/^https?:\/\//i.test(limpio)) {
    return { busqueda: null, traer: null, aviso: linea.motivo }
  }
  return cumpleElMinimo(limpio, MINIMO_DEL_PANEL)
    ? { busqueda: limpio, traer: null, aviso: null }
    : { busqueda: null, traer: null, aviso: MINIMO_DEL_PANEL.aviso }
}
