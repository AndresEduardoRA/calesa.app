import { avisarError } from '@/shared/ui/toasts'
import { urlDelComprobante } from '../../../areas/compras/composicion.client'

// «Ver comprobante» de una compra (8.11-3, C9): pide una URL firmada de 60 s y la abre en otra pestaña. Ver la pide `repuestos.costos.ver`, el de la pestaña.
export async function verComprobante(ruta: string): Promise<void> {
  const resultado = await urlDelComprobante(ruta).catch(() => null)
  if (resultado?.ok) {
    window.open(resultado.data, '_blank', 'noopener,noreferrer')
  } else {
    avisarError(
      resultado?.ok === false
        ? resultado.error
        : { codigo: 'inesperado', mensaje: 'No se pudo abrir el comprobante. Prueba de nuevo.' },
    )
  }
}
