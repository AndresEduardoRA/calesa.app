'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDelFlujo } from '../../../areas/flujo/composicion'
import type { EsperasDelVehiculo } from '../../../entities/flujo/esperas'
import { esquemaDeLeerEsperas } from '../schemas/cadena'

// Los repuestos que espera un vehículo, para su hueco del panel de `logistica` (8.13-3, D7): `esperasQueDestraban` es de servidor y el hueco, de cliente. La RLS y la RPC deciden qué se ve:
// sin `repuestos.ver` la base devuelve cero filas, y sin `logistica.ver` oculta los nombres de fase.
export const leerEsperasDelVehiculo = actionClient
  .inputSchema(esquemaDeLeerEsperas)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<EsperasDelVehiculo>> => {
    return repositorioDelFlujo.esperas(parsedInput.vehiculo)
  })
