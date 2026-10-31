// Lo que dice el texto del buscador del panel del vehículo de la hoja de cotizar: qué se busca en el inventario, qué se puede traer de la
// subasta y qué avisar. Puro; si se puede traer lo decide el panel (origen, permiso, apibara).
import { NOMBRE_DE_PLATAFORMA } from '@/shared/lib/apibara'
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

// Lo que decide si lo leído se puede traer de la subasta: dar de alta en el origen, que el origen sea de subasta y que apibara esté encendida.
export type ContextoDeTraer = { puedeCargar: boolean; esSubasta: boolean; apibaraActiva: boolean }

export type TraerDelTexto = {
  puede: boolean
  // El botón: «Traer el lote 58540656».
  etiqueta: string | null
  // Un enlace que no se puede traer dice por qué; un VIN o un lote que no se pueden traer sólo se buscan.
  aviso: string | null
}

const NADA: TraerDelTexto = { puede: false, etiqueta: null, aviso: null }

function etiquetaDe(entrada: EntradaDeApibara): string {
  switch (entrada.tipo) {
    case 'enlace':
      return `Traer el enlace de ${NOMBRE_DE_PLATAFORMA[entrada.plataforma]}`
    case 'vin':
      return `Traer el VIN ${entrada.valor}`
    case 'lote':
      return `Traer el lote ${entrada.valor}`
  }
}

export function queSePuedeTraer(
  traer: EntradaDeApibara | null,
  { puedeCargar, esSubasta, apibaraActiva }: ContextoDeTraer,
): TraerDelTexto {
  if (traer === null) {
    return NADA
  }
  if (puedeCargar && esSubasta && apibaraActiva) {
    return { puede: true, etiqueta: etiquetaDe(traer), aviso: null }
  }
  if (traer.tipo !== 'enlace') {
    return NADA
  }
  if (!puedeCargar) {
    return {
      ...NADA,
      aviso: 'No puedes dar de alta en este origen: busca el vehículo por nombre, VIN o lote.',
    }
  }
  return {
    ...NADA,
    aviso: esSubasta
      ? 'La consulta de subastas está apagada: carga el vehículo a mano.'
      : 'Este origen no trae vehículos de una subasta: búscalo por nombre o cárgalo a mano.',
  }
}
