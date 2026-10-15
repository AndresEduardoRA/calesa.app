import { connection } from 'next/server'
import { datosO } from '@/shared/lib/errores'
import { leerSeguimientosDeLead } from '../lecturas'
import { SeguimientosDelLead } from './seguimientos-del-lead'

// La sección «Seguimientos», leída en el servidor con la sesión de quien mira. Va detrás de
// `<Suspense>`: la cabecera de la ficha no espera a la línea de tiempo. Un error de lectura sube al
// `error.tsx` de la ruta.
export async function SeccionSeguimientos({ leadId }: { leadId: string }) {
  await connection()
  const datos = datosO(await leerSeguimientosDeLead(leadId))
  return (
    <SeguimientosDelLead
      leadId={leadId}
      inicial={datos.pagina}
      tipos={datos.tipos}
      recordatorios={datos.recordatorios}
    />
  )
}
