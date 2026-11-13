// Las secciones de `/datos` (`?seccion=`): «Exportar» y, desde el 9.06-4b, «Importar». Las dos se ven siempre: sin permiso para importar
// nada, «Importar» sale apagada con su motivo (lo que no se puede no se esconde, `docs/UX.md`) y pedirla abre «Exportar» (D42). Sin I/O.
import type { Permisos } from '@/shared/lib/permisos'
import { puedeImportarAlgo } from './opciones-de-importar'

export const SECCIONES_DE_DATOS = [
  { clave: 'exportar', titulo: 'Exportar' },
  { clave: 'importar', titulo: 'Importar' },
] as const

export type SeccionDeDatos = (typeof SECCIONES_DE_DATOS)[number]['clave']

export const MOTIVO_SIN_IMPORTAR = 'Tu rol no importa datos.'

export type PestanaDeDatos = { clave: SeccionDeDatos; titulo: string; motivo?: string }

export function seccionesDeDatos(permisos: Permisos): PestanaDeDatos[] {
  const importa = puedeImportarAlgo(permisos)
  return SECCIONES_DE_DATOS.map((seccion) =>
    seccion.clave === 'importar' && !importa
      ? { ...seccion, motivo: MOTIVO_SIN_IMPORTAR }
      : { ...seccion },
  )
}

// «Importar» sólo si se pidió y se puede; cualquier otra cosa abre «Exportar».
export function seccionDeDatos(valor: string | undefined, permisos: Permisos): SeccionDeDatos {
  return valor === 'importar' && puedeImportarAlgo(permisos) ? 'importar' : 'exportar'
}
