import 'server-only'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { prepararSesion, registrarExportacion } from '../../composicion'
import {
  TOPE_DE_FILAS,
  filtrosDelPedido,
  nombreDelArchivo,
  rangoDelPedido,
  type Pedido,
  type SalidaDeExportacionTotal,
} from '../../entities/exportacion'
import { armarFlujo } from './flujo'
import { fuenteDeLeads } from './fuente-de-leads'

type Entrada = {
  pedido: Pedido
  // Los efectivos de la sesión: si no lo tiene, ni se cuenta. La autoridad es la base (el registrar da 42501 sin el permiso real).
  permisos: Permisos
  zona: string
  codigoDePais: string | null
  ahora?: () => number
}

const NO_SE_PUDO = 'No pudimos preparar la exportación. Vuelve a intentarlo.'

// Exportar todo (9.05-2, `datos.exportar.todo`). El orden es el contrato: el permiso, la sesión, el layout y los catálogos, el conteo hasta
// el tope (con más, o con ninguna, no se registra nada), **la constancia** (`datos_exportacion_registrar`: permiso real y 3 por hora) y recién
// después el flujo. Ningún byte del archivo sale antes de la constancia, nunca se registra dos veces y el archivo no pasa las filas registradas.
export async function exportarTodo(entrada: Entrada): Promise<SalidaDeExportacionTotal> {
  const { pedido, permisos, zona, codigoDePais, ahora = Date.now } = entrada
  if (!puede(permisos, 'datos.exportar.todo')) {
    return { tipo: 'sin_permiso' }
  }
  const sesion = await prepararSesion(ahora())
  if (!sesion.ok) {
    return { tipo: 'sesion' }
  }
  const { cliente, venceEn } = sesion.data
  const fuente = await fuenteDeLeads({
    cliente,
    zona,
    codigoDePais,
    conNumeroGlobal: puede(permisos, 'leads.numero_global.ver'),
  })
  if (!fuente.ok) {
    return { tipo: 'error', mensaje: NO_SE_PUDO }
  }
  const corte = new Date(ahora()).toISOString()
  const rango = rangoDelPedido(pedido, zona, corte)

  const contadas = await fuente.data.lector.contar(rango, TOPE_DE_FILAS)
  if (!contadas.ok) {
    return { tipo: 'error', mensaje: NO_SE_PUDO }
  }
  if (contadas.data.hayMas) {
    return { tipo: 'demasiadas' }
  }
  const filas = contadas.data.n
  if (filas === 0) {
    return { tipo: 'vacia' }
  }

  const registro = await registrarExportacion(cliente)(
    pedido.entidad,
    filas,
    filtrosDelPedido(pedido),
  )
  if (!registro.ok) {
    return registro.error.codigo === 'sin_permiso'
      ? { tipo: 'sin_permiso' }
      : { tipo: 'error', mensaje: NO_SE_PUDO }
  }
  if (!registro.data.ok) {
    return { tipo: 'limite', libreEn: registro.data.libreEn }
  }

  return {
    tipo: 'listo',
    nombre: nombreDelArchivo(pedido.entidad, corte, zona),
    filas,
    flujo: armarFlujo({
      ...fuente.data,
      rango,
      filas,
      delimitador: pedido.delimitador,
      venceEn,
      ahora,
    }),
  }
}
