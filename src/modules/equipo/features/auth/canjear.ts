import 'server-only'
import { servicioAcceso } from '../../composicion'
import { destinoDeFallo, destinoTrasCanje, leerCanje } from '../../entities/canje'
import { rechazarSiInactiva } from './sesion'

// El caso de uso detrás de `/auth/callback`: recibe la query tal cual llegó y devuelve a dónde
// redirigir. Nunca lanza por un enlace malo: un enlace vencido es un destino con su aviso.
export async function canjearAcceso(parametros: URLSearchParams): Promise<string> {
  const pedido = leerCanje(parametros)
  if (pedido.tipo === 'rechazo' || pedido.tipo === 'vacio') {
    return destinoDeFallo(pedido)
  }
  const canje = await servicioAcceso.canjear(pedido)
  if (!canje.ok) {
    return destinoDeFallo(pedido)
  }
  const rechazo = await rechazarSiInactiva(canje.data.estado)
  return rechazo?.destino ?? destinoTrasCanje(pedido, parametros.get('next'))
}
