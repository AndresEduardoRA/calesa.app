import {
  bloquesVisibles,
  type BloqueDelCatalogo,
  type ClaveDeBloque,
} from '../../../entities/bandeja'
import type { Permisos } from '@/shared/lib/permisos'
import { CuerpoAlertasDemora } from './alertas-demora'
import { CuerpoDocumentosPorAprobar } from './documentos-por-aprobar'
import { CuerpoEquipoSinRol } from './equipo-sin-rol'
import { CuerpoEsperasRepuestos } from './esperas-repuestos'
import { CuerpoLeadsSinSeguimiento } from './leads-sin-seguimiento'
import { CuerpoRecordatorios } from './recordatorios'
import { CuerpoRepuestosPorMover } from './repuestos-por-mover'
import { CuerpoTareas } from './tareas'
import { CuerpoTurnosWeb } from './turnos-web'
import { CuerpoVehiculosTrabados } from './vehiculos-trabados'
import type { CuerpoDeBloque } from './tipos'

// Cada clave de `BLOQUES_BANDEJA` apunta a su archivo. El `Record` hace que el compilador pida las diez claves y rechace una de más;
// la fase que llena un bloque edita sólo su archivo, nunca este registro.
export const REGISTRO_DE_BLOQUES: Record<ClaveDeBloque, CuerpoDeBloque> = {
  recordatorios: CuerpoRecordatorios,
  'leads-sin-seguimiento': CuerpoLeadsSinSeguimiento,
  'turnos-web': CuerpoTurnosWeb,
  'vehiculos-trabados': CuerpoVehiculosTrabados,
  'documentos-por-aprobar': CuerpoDocumentosPorAprobar,
  'alertas-demora': CuerpoAlertasDemora,
  'repuestos-por-mover': CuerpoRepuestosPorMover,
  'esperas-repuestos': CuerpoEsperasRepuestos,
  tareas: CuerpoTareas,
  'equipo-sin-rol': CuerpoEquipoSinRol,
}

export type BloqueParaMontar = { bloque: BloqueDelCatalogo; cuerpo: CuerpoDeBloque }

// Los bloques que esta persona puede ver (por sus permisos, nunca por nombre de rol), cada uno con su cuerpo.
export function bloquesParaMontar(permisos: Permisos): BloqueParaMontar[] {
  return bloquesVisibles(permisos).map((bloque) => ({
    bloque,
    cuerpo: REGISTRO_DE_BLOQUES[bloque.clave],
  }))
}
