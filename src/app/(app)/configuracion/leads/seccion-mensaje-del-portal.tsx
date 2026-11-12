import { getAjustes } from '@/modules/empresa'
import { leerAjustesDeLeads } from '@/modules/leads'
import { MensajeDelPortal } from '@/modules/leads/pantallas/configuracion'
import { leerDireccionPublica } from '@/modules/web'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Mensaje del portal». La compone `src/app` (`leads` no importa `empresa` ni `web`): el nombre de la empresa y la dirección
// de la web van a la vista previa, como en la ficha. Si no se puede leer, el `error.tsx` con «Reintentar». La `key` es la versión: lo
// guardado, acá o por otra persona, vuelve a montar el formulario desde la base.
export async function SeccionMensajeDelPortal() {
  const [ajustes, empresa, direccion] = await Promise.all([
    leerAjustesDeLeads(),
    getAjustes(),
    leerDireccionPublica(),
  ])
  const { portal } = datosO(ajustes)
  return (
    <MensajeDelPortal
      key={portal.actualizadoEn}
      portal={portal}
      empresa={empresa.nombre}
      direccion={datosO(direccion)}
    />
  )
}
