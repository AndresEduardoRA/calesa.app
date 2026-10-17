import { connection } from 'next/server'
import { datosO } from '@/shared/lib/errores'
import {
  SIN_VEHICULOS_PARA_NOTAS,
  type VehiculosParaNotas,
} from '../../../entities/vehiculo-de-nota'
import { leerSeguimientosDeLead } from '../lecturas'
import { SeguimientosDelLead } from './seguimientos-del-lead'
import { ProveedorDeVehiculos } from './vehiculos-de-las-notas'

type Props = {
  leadId: string
  // Los vehículos del lead que quien mira ve, para elegir uno en un seguimiento o un recordatorio. Los
  // lee la página (este módulo no lee vehículos); sin el permiso, ninguno.
  vehiculos?: Promise<VehiculosParaNotas>
}

// La sección «Seguimientos», leída en el servidor con la sesión de quien mira. Va detrás de
// `<Suspense>`: la cabecera de la ficha no espera a la línea de tiempo. Un error de lectura sube al
// `error.tsx` de la ruta.
export async function SeccionSeguimientos({ leadId, vehiculos }: Props) {
  await connection()
  const [leido, opciones] = await Promise.all([
    leerSeguimientosDeLead(leadId),
    vehiculos ?? SIN_VEHICULOS_PARA_NOTAS,
  ])
  const datos = datosO(leido)
  return (
    <ProveedorDeVehiculos vehiculos={opciones.opciones} recortado={opciones.recortado}>
      <SeguimientosDelLead leadId={leadId} inicial={datos.pagina} tipos={datos.tipos} />
    </ProveedorDeVehiculos>
  )
}
