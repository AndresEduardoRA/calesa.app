// Composición del área `tablas` de `cotizaciones` en el servidor (4.15-4; la llena el 4.23-2). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import type { RepositorioDeTablas } from '../../entities/tablas/repositorio'
import {
  getTablaParaEditar,
  getTablasDeReferencia,
  publicacionDeTablasSupabase,
} from '../../infra/tablas/servidor'

// Las tablas activas de un origen y las compartidas, con tope (`hayMas`).
export const leerTablasDeReferencia = getTablasDeReferencia
// Una tabla con todas sus filas para editarla, o por qué no se edita (no está, no se ve, pasa de 2.000 filas).
export const leerTablaParaEditar = getTablaParaEditar
// Publicar una tabla de referencia por `tabla_referencia_publicar()` (4.23-1). La action de `features/tablas/` lo usa.
export const repositorioDeTablas: RepositorioDeTablas = publicacionDeTablasSupabase
