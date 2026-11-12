import { puede, type Permisos } from '@/shared/lib/permisos'

export const MOTIVO_SIN_PERMISO_DE_REGLAS = 'No puedes configurar las reglas de este flujo.'

// Quién cambia las reglas y la oferta de un flujo: quien lo configura (`flujos.configurar`, o `repuestos.configurar` para el de repuestos). Es
// comodidad de la pantalla y primera llave de la action: el permiso por origen lo decide la base. `origenId` nulo = «cualquier flujo».
export function motivoSinPermisoDeReglas(
  permisos: Permisos,
  ambito: 'vehiculos' | 'repuestos' | null,
  origenId: string | null,
): string | null {
  if (ambito === 'repuestos') {
    return puede(permisos, 'repuestos.configurar') ? null : MOTIVO_SIN_PERMISO_DE_REGLAS
  }
  if (ambito === 'vehiculos') {
    return puede(permisos, 'flujos.configurar', origenId) ? null : MOTIVO_SIN_PERMISO_DE_REGLAS
  }
  return puede(permisos, 'flujos.configurar') || puede(permisos, 'repuestos.configurar')
    ? null
    : MOTIVO_SIN_PERMISO_DE_REGLAS
}
