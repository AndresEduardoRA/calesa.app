import { connection } from 'next/server'
import { datosO } from '@/shared/lib/errores'
import type { VehiculoDeNota } from '../../../entities/vehiculo-de-nota'
import { ProveedorDeVehiculos } from '../../seguimientos/components/vehiculos-de-las-notas'
import { leerOportunidadesDeLead } from '../lecturas'
import { OportunidadesDelLead } from './oportunidades-del-lead'

type Props = {
  leadId: string
  // Los vehículos del lead que quien mira ve, para elegir uno (los lee la página: este módulo no lee
  // vehículos). Sin el permiso, ninguno.
  vehiculos?: Promise<readonly VehiculoDeNota[]>
}

// La sección «Oportunidades», leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`:
// sólo las suyas sobre este lead (la base decide). Un error de lectura sube al `error.tsx` de la ruta.
export async function SeccionOportunidades({ leadId, vehiculos }: Props) {
  await connection()
  const [leido, opciones] = await Promise.all([leerOportunidadesDeLead(leadId), vehiculos ?? []])
  const datos = datosO(leido)
  return (
    <ProveedorDeVehiculos vehiculos={opciones}>
      <OportunidadesDelLead
        leadId={leadId}
        inicial={datos.oportunidades}
        embudos={datos.embudos}
        puedoCrear={datos.puedoCrear}
        hayMas={datos.hayMas}
      />
    </ProveedorDeVehiculos>
  )
}
