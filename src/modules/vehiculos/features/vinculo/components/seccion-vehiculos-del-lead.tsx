import { connection } from 'next/server'
import { leerVehiculosDelLead } from '../../../composicion'
import { datosO } from '@/shared/lib/errores'
import { VehiculosDelLead } from './vehiculos-del-lead'

type Props = { leadId: string; leadNombre: string }

// La sección «Vehículos» de la ficha de un lead, leída en el servidor con la sesión de quien mira. Vive
// en este módulo y la compone `app/` (`leads` no importa `vehiculos`). Va detrás de `<Suspense>`; un
// error de lectura sube al `error.tsx` de la ruta.
export async function SeccionVehiculosDelLead({ leadId, leadNombre }: Props) {
  await connection()
  const datos = datosO(await leerVehiculosDelLead(leadId))
  return <VehiculosDelLead leadId={leadId} leadNombre={leadNombre} datos={datos} />
}
