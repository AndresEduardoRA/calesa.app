import { connection } from 'next/server'
import { puede, requerirSesion } from '@/modules/equipo'
import { leerResumenDeVehiculo } from '@/modules/repuestos'
import { ResumenRepuestos } from '@/modules/repuestos/pantallas/proyectos-vehiculo'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Repuestos» (8.09-4): el proyecto de repuestos del vehículo y sus ítems por fase, leídos recién al abrirla (la ficha de quien no la abre no paga nada). Un error de lectura sube
// al `error.tsx` de la ruta con «Reintentar». «Crear proyecto de repuestos» sólo se ofrece con `repuestos.editar`.
export async function SeccionRepuestos({ vehiculoId }: { vehiculoId: string }) {
  await connection()
  const sesion = await requerirSesion()
  const lectura = datosO(await leerResumenDeVehiculo(vehiculoId))
  return (
    <ResumenRepuestos
      key={vehiculoId}
      vehiculoId={vehiculoId}
      lectura={lectura}
      puedeCrear={puede(sesion.permisos, 'repuestos.editar')}
    />
  )
}
