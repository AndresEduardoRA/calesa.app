import { leerIntegraciones, leerVehiculosQueCambian } from '@/modules/empresa'
import { Integraciones } from '@/modules/empresa/pantallas/configuracion-empresa'
import { entornoPublico } from '@/shared/config/entorno'
import { datosO } from '@/shared/lib/errores'
import { EstadoVacio } from '@/shared/ui/estados'

// La pestaña «Integraciones». Si están activas lo lee cualquiera; editarlas y cargar su clave,
// quien tiene `empresa.ajustes.gestionar`. El conteo de la web pública lo pide sólo quien puede
// editar (la RPC exige el permiso); si falla, la tarjeta da la ayuda general.
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
  const webPublica = integraciones.find((una) => una.clave === 'web_publica')
  const pushWeb = integraciones.find((una) => una.clave === 'push_web')
  const conteo = webPublica && puedeEditar ? await leerVehiculosQueCambian() : null
  return (
    <Integraciones
      apibara={apibara}
      webPublica={webPublica}
      pushWeb={pushWeb}
      sinClavePublica={!entornoPublico().NEXT_PUBLIC_VAPID_PUBLIC_KEY}
      vehiculosQueCambian={conteo?.ok ? conteo.data : null}
      puedeEditar={puedeEditar}
    />
  )
}
