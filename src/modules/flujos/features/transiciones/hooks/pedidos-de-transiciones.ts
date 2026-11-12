import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { AmbitoDeFlujo } from '../../../entities/flujo'
import type { DatosDeSalida } from '../../../entities/transiciones/formulario-de-salida'
import type { VersionDeTransicion } from '../../../entities/transiciones/respuestas'
import type { CambiosDeSalida } from '../../../entities/transiciones/formulario-de-salida'
import { crearTransicion } from '../actions/crear-transicion'
import { eliminarTransicion } from '../actions/eliminar-transicion'
import { guardarTransicion } from '../actions/guardar-transicion'
import { ponerRolesDeFase } from '../actions/poner-roles-de-fase'
import { ponerRolesDeTransicion } from '../actions/poner-roles-de-transicion'

const MENSAJE_DE_VALIDACION = 'Revisa los datos de la salida.'

// Las Server Actions de las salidas, como funciones que devuelven el envío (el resultado, o `sinRed` si no llegó al servidor). Cada una manda el ámbito del
// flujo (la action exige su permiso) y la versión del flujo que se tenía en pantalla.
export function pedidosDeTransiciones(ambito: AmbitoDeFlujo, flujoId: string, version: string) {
  return {
    crear: (id: string, deFaseId: string, datos: DatosDeSalida) =>
      enviarAccion<VersionDeTransicion>(
        crearTransicion({
          id,
          ambito,
          flujoId,
          actualizadoEnEsperado: version,
          deFaseId,
          aFaseId: datos.aFaseId,
          accion: datos.accion,
          notaObligatoria: datos.notaObligatoria,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    quitar: (id: string) =>
      enviarAccion<VersionDeTransicion>(
        eliminarTransicion({ id, ambito, actualizadoEnEsperado: version }),
        MENSAJE_DE_VALIDACION,
      ),
    guardar: (id: string, cambios: CambiosDeSalida) =>
      enviarAccion<VersionDeTransicion>(
        guardarTransicion({ id, ambito, actualizadoEnEsperado: version, cambios }),
        MENSAJE_DE_VALIDACION,
      ),
    rolesDeFase: (faseId: string, roles: readonly string[]) =>
      enviarAccion<VersionDeTransicion>(
        ponerRolesDeFase({ faseId, ambito, actualizadoEnEsperado: version, roles: [...roles] }),
        MENSAJE_DE_VALIDACION,
      ),
    rolesDeSalida: (id: string, roles: readonly string[]) =>
      enviarAccion<VersionDeTransicion>(
        ponerRolesDeTransicion({ id, ambito, actualizadoEnEsperado: version, roles: [...roles] }),
        MENSAJE_DE_VALIDACION,
      ),
  }
}
