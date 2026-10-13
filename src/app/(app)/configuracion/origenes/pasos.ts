import type { ClaveDePaso, PasoConDestino, PasoSiguiente } from '@/modules/origenes'
import { puede, type ClavePermiso, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'

type Destino = {
  // null = la pantalla todavía no existe: el paso se dice, sin enlace. `pasos.test.ts` comprueba
  // que cada ruta declarada tiene su `page.tsx`.
  ruta: string | null
  permiso: ClavePermiso
  motivo: string
}

// A dónde lleva cada paso. El flujo (fase 5) y la fórmula (fase 4) todavía no tienen pantalla.
export const DESTINOS_DE_PASO: Record<ClaveDePaso, Destino> = {
  flujo: {
    ruta: null,
    permiso: 'flujos.configurar',
    motivo: 'Lo configura quien tiene el permiso «Configurar el flujo».',
  },
  formula: {
    ruta: null,
    permiso: 'cotizaciones.configurar',
    motivo: 'La publica quien tiene el permiso «Configurar el cotizador».',
  },
  permisos: {
    ruta: RUTAS.roles,
    permiso: 'equipo.roles.gestionar',
    motivo: 'Los reparte quien tiene el permiso «Gestionar roles».',
  },
  apibara: {
    ruta: `${RUTAS.empresa}?seccion=integraciones`,
    permiso: 'empresa.ajustes.gestionar',
    motivo: 'La activa quien tiene el permiso «Ajustes de la empresa».',
  },
}

export function conDestino(pasos: readonly PasoSiguiente[], permisos: Permisos): PasoConDestino[] {
  return pasos.map((paso) => {
    const destino = DESTINOS_DE_PASO[paso.clave]
    const sinPermiso = !puede(permisos, destino.permiso)
    return {
      ...paso,
      ruta: destino.ruta,
      // Lo que no tiene pantalla se dice igual para todos; sin el permiso, el motivo.
      motivoDeshabilitado: destino.ruta !== null && sinPermiso ? destino.motivo : null,
    }
  })
}
