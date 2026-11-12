import { enviarAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import {
  MENSAJE_DE_SUBIDA_FALLIDA,
  subirDocumento,
} from '../../../areas/documentos/composicion.client'
import { camposDeFechasDelTipo, nombreParaGuardar } from '../../../entities/documentos/admision'
import type { TipoDeDocumento } from '../../../entities/documentos/documento'
import type { Unidad } from '../../../entities/nucleo/unidad'
import { registrarDocumentos } from '../actions/registrar-documentos'
import type { EntradaDeLaBandeja, ValoresDeLaBandeja } from './use-bandeja'

const MENSAJE_DE_VALIDACION = 'Revisa los datos del documento.'

const fechaONulo = (valor: string, pide: boolean): string | null =>
  pide && valor !== '' ? valor : null

export type ResultadoDeSubir =
  | { ok: true }
  // `parar`: sin red o con un campo rechazado los demás fallarían igual y no se insiste. `porCampo`: lo que la base rechazó, por campo del formulario.
  | { ok: false; mensaje: string; parar: boolean; porCampo: Record<string, string> | null }

// Un archivo de la bandeja: primero el objeto al bucket y recién entonces `documento_registrar` por su Server Action (commit diferido). `intento` es el id de este archivo: con el mismo,
// reintentar devuelve las mismas filas.
type Pedido = {
  unidad: Unidad
  entrada: EntradaDeLaBandeja
  valores: ValoresDeLaBandeja
  tipo: TipoDeDocumento | null
  intento: string
}

export async function subirYRegistrar(pedido: Pedido): Promise<ResultadoDeSubir> {
  const { unidad, entrada, valores, tipo, intento } = pedido
  const { archivo, datos } = entrada
  const fechas = camposDeFechasDelTipo(tipo)
  const subida = await subirDocumento(unidad.id, archivo, datos.hash).catch(() =>
    fallo('inesperado', MENSAJE_DE_SUBIDA_FALLIDA),
  )
  if (!subida.ok) {
    return { ok: false, mensaje: subida.error.mensaje, parar: false, porCampo: null }
  }
  const envio = await enviarAccion(
    registrarDocumentos({
      id: intento,
      vehiculos: unidad.tipo === 'vehiculo' ? [unidad.id] : [],
      repuestoId: unidad.tipo === 'repuesto' ? unidad.id : null,
      tipoId: valores.tipoId,
      ruta: subida.data,
      nombre: nombreParaGuardar(archivo.name),
      mime: archivo.type,
      bytes: archivo.size,
      emitidoEl: fechaONulo(valores.emitidoEl, fechas.emitido),
      venceEl: fechaONulo(valores.venceEl, fechas.vence !== 'oculto'),
      nota: valores.nota.trim() === '' ? null : valores.nota.trim(),
    }),
    MENSAJE_DE_VALIDACION,
  )
  if (envio.ok) {
    return { ok: true }
  }
  const porCampo = 'porCampo' in envio && envio.porCampo ? envio.porCampo : null
  return {
    ok: false,
    mensaje: envio.error.mensaje,
    parar: 'sinRed' in envio || porCampo !== null,
    porCampo,
  }
}
