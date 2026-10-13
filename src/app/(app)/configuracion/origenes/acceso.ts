import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'

// Quién abre Configuración › Orígenes. `origenes.gestionar` los edita; quien configura lo que
// cuelga de un origen (su flujo, su fórmula) necesita ver cómo está armado, y lo ve todo
// deshabilitado, con el motivo. La lectura de los orígenes es de todas las cuentas: no hay un
// permiso de «ver» porque no tendría nada que proteger.
export const PERMISOS_DE_ORIGENES = [
  'origenes.gestionar',
  'flujos.configurar',
  'cotizaciones.configurar',
] as const satisfies readonly ClavePermiso[]

export function puedeAbrirOrigenes(permisos: Permisos): boolean {
  return PERMISOS_DE_ORIGENES.some((clave) => puede(permisos, clave))
}
