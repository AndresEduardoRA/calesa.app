import type { PestanaDeFlujos } from '../pestanas'

// Las pestañas del área `reglas` de `flujos` (5.11): «Reglas», las reglas del flujo y la oferta de transporte. La ve quien configura un flujo
// (`flujos.configurar` o `repuestos.configurar`); la base vuelve a decidir cada escritura.
export const PESTANAS_DE_REGLAS: readonly PestanaDeFlujos[] = [
  {
    clave: 'reglas',
    titulo: 'Reglas',
    permisos: ['flujos.configurar', 'repuestos.configurar'],
  },
]
