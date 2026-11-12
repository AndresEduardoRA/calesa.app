import { avisarError } from '@/shared/ui/toasts'
import { urlDelDocumento } from '../../../areas/documentos/composicion.client'

// «Ver» y «Descargar»: piden una URL firmada de 60 s al tocar (nunca al listar). Ver la abre en otra pestaña; descargar la sigue con el nombre del archivo.
export async function abrirDocumento(
  ruta: string,
  nombre: string,
  modo: 'ver' | 'descargar',
): Promise<void> {
  const resultado = await urlDelDocumento(ruta, {
    descargar: modo === 'descargar' ? { nombre } : null,
  })
  if (!resultado.ok) {
    avisarError(resultado.error)
    return
  }
  if (modo === 'ver') {
    window.open(resultado.data, '_blank', 'noopener,noreferrer')
    return
  }
  const enlace = document.createElement('a')
  enlace.href = resultado.data
  enlace.download = nombre
  enlace.rel = 'noopener'
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
}
