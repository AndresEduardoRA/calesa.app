import type { PestanaDeEmpresa } from '../pestanas'

// Las pestañas que el área de comprobantes suma a Configuración › Empresa (4.26-3). «Comprobantes» pide `empresa.ajustes.gestionar`, la clave que
// ya abre Empresa (P1 a del 4.26, cierra 4-89): nadie nuevo entra a Empresa, y quien sólo emite comprobantes o sólo gestiona tipos de cambio no la ve. No lleva
// estado de URL propio.
export const PESTANAS_DE_COMPROBANTES: readonly PestanaDeEmpresa[] = [
  { clave: 'comprobantes', titulo: 'Comprobantes', permisos: ['empresa.ajustes.gestionar'] },
]
