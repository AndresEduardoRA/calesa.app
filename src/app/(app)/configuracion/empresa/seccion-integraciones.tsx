import { Integraciones, leerIntegraciones } from '@/modules/empresa'
import { datosO } from '@/shared/lib/errores'
import { EstadoVacio } from '@/shared/ui/estados'

// La pestaña «Integraciones». Si están activas lo lee cualquiera; editarlas y cargar su clave,
// quien tiene `empresa.ajustes.gestionar`.
export async function SeccionIntegraciones({ puedeEditar }: { puedeEditar: boolean }) {
  const integraciones = datosO(await leerIntegraciones())
  const apibara = integraciones.find((una) => una.clave === 'apibara')
  if (!apibara) {
    return (
      <EstadoVacio
        titulo="Todavía no hay integraciones"
        descripcion="Se cargan al instalar el sistema. Avisa a quien lo administra."
      />
    )
  }
  return <Integraciones apibara={apibara} puedeEditar={puedeEditar} />
}
