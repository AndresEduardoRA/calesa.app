import { z } from 'zod'
import { CLAVE_DE_EDICION, leerVehiculo, puedeEditar, type Vehiculo } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'

type Parametros = Record<string, string | string[] | undefined>

// El vehículo de `?editar=`, si existe, es de ese origen y la persona lo puede editar. Cualquier
// otra cosa en la URL (un id inventado, uno ajeno) no abre nada.
export async function vehiculoEnEdicion(
  parametros: Parametros,
  quien: { permisos: Permisos; usuarioId: string },
  origenId?: string,
): Promise<Vehiculo | null> {
  const id = unParametro(parametros[CLAVE_DE_EDICION])
  if (!z.guid().safeParse(id).success || id === undefined) {
    return null
  }
  const vehiculo = datosO(await leerVehiculo(id))
  if (!vehiculo || (origenId !== undefined && vehiculo.origenId !== origenId)) {
    return null
  }
  return puedeEditar(quien.permisos, vehiculo, quien.usuarioId) ? vehiculo : null
}
