import { connection } from 'next/server'
import { datosO } from '@/shared/lib/errores'
import { leerAccesoDelCliente } from '../../../composicion'
import { PortalDelLead } from './portal-del-lead'

type Props = {
  leadId: string
  leadNombre: string
  // Los compone la página (este módulo no depende de `empresa` ni de `web`): el nombre de la empresa y
  // la dirección pública de la web (nula si nadie la configuró), para el texto de WhatsApp.
  empresa: Promise<string>
  direccion: Promise<string | null>
}

// La sección «Portal», leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`. La
// página la monta sólo con la cartera y `leads.portal.gestionar`; la base lo vuelve a decidir. Un error
// de lectura sube al `error.tsx` de la ruta.
export async function SeccionPortal({ leadId, leadNombre, empresa, direccion }: Props) {
  await connection()
  const [acceso, nombreDeEmpresa, direccionPublica] = await Promise.all([
    leerAccesoDelCliente(leadId),
    empresa,
    direccion,
  ])
  return (
    <PortalDelLead
      leadId={leadId}
      leadNombre={leadNombre}
      acceso={datosO(acceso)}
      empresa={nombreDeEmpresa}
      direccion={direccionPublica}
    />
  )
}
