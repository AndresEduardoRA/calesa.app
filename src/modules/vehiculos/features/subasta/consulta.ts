// Consultar las líneas pegadas, sin React: las dependencias (la edge function y la búsqueda de
// repetidos) entran por parámetro. El hook sólo las conecta con la pantalla.
import type { Resultado } from '@/shared/lib/errores'
import type { FichaDeApibara, ResultadoDeApibara } from '../../entities/apibara'
import type { ClaveDeBusqueda, RepetidoEncontrado } from '../../entities/repositorios'
import { datosDesdeSubasta, type CampoConRuta } from '../../entities/subasta'
import { enTandas } from '../fotos/tandas'
import { cortaLaCola, falloDeLinea, type EstadoDeLinea, type Linea } from './lineas'

// Cada consulta es un pedido a la API y gasta cuota: de a dos alcanza para que veinte líneas no
// tarden minutos, sin disparar veinte a la vez.
export const CONSULTAS_A_LA_VEZ = 2

export type Finales = Map<string, EstadoDeLinea>

export type Dependencias = {
  campos: readonly CampoConRuta[]
  consultarFicha: (entrada: string) => Promise<ResultadoDeApibara<FichaDeApibara>>
  buscarRepetidos: (claves: readonly ClaveDeBusqueda[]) => Promise<Resultado<RepetidoEncontrado[]>>
  // Cada vez que una línea cambia de estado (para dibujarla).
  alCambiar: (clave: string, estado: EstadoDeLinea) => void
}

// Las que quedaron listas y tienen con qué buscarse en el inventario (VIN o lote).
function clavesDeBusqueda(finales: Finales) {
  return [...finales.entries()].flatMap(([clave, estado]) => {
    if (estado.tipo !== 'lista') {
      return []
    }
    const { vin, lote, plataforma } = estado.datos.columnas
    const busqueda: ClaveDeBusqueda = {
      ...(vin ? { vin } : {}),
      ...(lote ? { lote } : {}),
      ...(plataforma ? { plataforma } : {}),
    }
    return Object.keys(busqueda).length > 0 ? [{ clave, busqueda, ficha: estado.ficha }] : []
  })
}

// Marca las que ya están en el inventario. Si no se pudo averiguar, siguen listas: la base frena
// el duplicado al guardar.
async function marcarRepetidas(finales: Finales, dependencias: Dependencias): Promise<void> {
  const pedidas = clavesDeBusqueda(finales)
  if (pedidas.length === 0) {
    return
  }
  const respuesta = await dependencias.buscarRepetidos(pedidas.map((una) => una.busqueda))
  if (!respuesta.ok) {
    return
  }
  for (const { posicion, vehiculoId } of respuesta.data) {
    const pedida = pedidas[posicion]
    if (pedida) {
      const estado: EstadoDeLinea = { tipo: 'repetida', ficha: pedida.ficha, vehiculoId }
      finales.set(pedida.clave, estado)
      dependencias.alCambiar(pedida.clave, estado)
    }
  }
}

// Consulta las líneas dadas, de a dos, y devuelve el estado en que quedó cada una. Con la cuota
// agotada o la clave rechazada deja de consultar: la línea siguiente fallaría igual y gastaría
// otra consulta.
export async function consultarLineas(
  aConsultar: readonly Linea[],
  dependencias: Dependencias,
): Promise<Finales> {
  const finales: Finales = new Map()
  const fijar = (clave: string, estado: EstadoDeLinea) => {
    finales.set(clave, estado)
    dependencias.alCambiar(clave, estado)
  }
  let corte: Parameters<typeof falloDeLinea>[0] | null = null
  await enTandas(aConsultar, CONSULTAS_A_LA_VEZ, async (linea) => {
    if (!linea.entrada) {
      return
    }
    if (corte !== null) {
      fijar(linea.clave, falloDeLinea(corte))
      return
    }
    fijar(linea.clave, { tipo: 'consultando' })
    const respuesta = await dependencias.consultarFicha(linea.entrada.valor)
    if (!respuesta.ok) {
      const { codigo } = respuesta.error
      corte = cortaLaCola(codigo) ? codigo : null
      fijar(linea.clave, falloDeLinea(codigo))
      return
    }
    const url = respuesta.data.url ?? (linea.entrada.tipo === 'enlace' ? linea.entrada.valor : null)
    fijar(linea.clave, {
      tipo: 'lista',
      ficha: respuesta.data,
      datos: datosDesdeSubasta(respuesta.data.data, dependencias.campos, url),
    })
  })
  await marcarRepetidas(finales, dependencias)
  return finales
}
