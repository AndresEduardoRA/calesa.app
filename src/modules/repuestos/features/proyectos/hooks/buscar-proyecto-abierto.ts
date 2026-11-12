import { enviarAccion } from '@/shared/lib/enviar-accion'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { cumpleElMinimo } from '@/shared/lib/filtros'
import { MINIMO_DE_BUSQUEDA_DE_PROYECTOS } from '../../../entities/proyectos/listado'
import {
  buscarProyectosAbiertos,
  type OpcionDeProyecto,
} from '../actions/buscar-proyectos-abiertos'

// El buscador de proyecto destino del stock (8.10-3, C5), sin estado: lo compone `src/app` sobre `BuscadorConLista`, así el área `stock` no importa `proyectos`.

/** El texto recortado si alcanza para buscar (3 letras o un número); si no, nulo. */
export function interpretarBusquedaDeProyecto(texto: string): string | null {
  const recortado = texto.trim()
  return cumpleElMinimo(recortado, MINIMO_DE_BUSQUEDA_DE_PROYECTOS) ? recortado : null
}

/** Los proyectos abiertos para ese texto, sin `excluir` (el de origen). Nunca lanza. */
export async function buscarProyectoAbierto(
  texto: string,
  signal: AbortSignal,
  excluir: string,
): Promise<Resultado<OpcionDeProyecto[]>> {
  const respuesta = await enviarAccion(
    buscarProyectosAbiertos({ texto, excluir }),
    'No se pudo buscar.',
  )
  if (signal.aborted || !respuesta.ok) {
    return fallo('inesperado', 'No se pudo buscar.')
  }
  return ok(respuesta.data)
}
