import { connection } from 'next/server'
import { datosO } from '@/shared/lib/errores'
import {
  SIN_VEHICULOS_PARA_NOTAS,
  type VehiculosParaNotas,
} from '../../../entities/vehiculo-de-nota'
import { ProveedorDeVehiculos } from '../../seguimientos/components/vehiculos-de-las-notas'
import { oportunidadesParaMostrar } from '../../../entities/oportunidad'
import { leerOportunidadesDeLead } from '../lecturas'
import { OportunidadesDelLead } from './oportunidades-del-lead'

type Props = {
  leadId: string
  // Los vehículos del lead que quien mira ve, para elegir uno (los lee la página: este módulo no lee
  // vehículos). Sin el permiso, ninguno.
  vehiculos?: Promise<VehiculosParaNotas>
  // «Ver todas» (`?todas=1`): las que trae la lectura, hasta 100. Sin él, las 10 más recientes.
  todas?: boolean
}

// La sección «Oportunidades», leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`:
// sólo las suyas sobre este lead (la base decide). Un error de lectura sube al `error.tsx` de la ruta.
export async function SeccionOportunidades({ leadId, vehiculos, todas = false }: Props) {
  await connection()
  const [leido, opciones] = await Promise.all([
    leerOportunidadesDeLead(leadId),
    vehiculos ?? SIN_VEHICULOS_PARA_NOTAS,
  ])
  const datos = datosO(leido)
  const { visibles, recortada } = oportunidadesParaMostrar(datos.oportunidades, todas)
  return (
    <ProveedorDeVehiculos vehiculos={opciones.opciones} recortado={opciones.recortado}>
      <OportunidadesDelLead
        leadId={leadId}
        inicial={visibles}
        embudos={datos.embudos}
        puedoCrear={datos.puedoCrear}
        hayMas={datos.hayMas}
        recortada={recortada}
        todas={todas}
      />
    </ProveedorDeVehiculos>
  )
}
