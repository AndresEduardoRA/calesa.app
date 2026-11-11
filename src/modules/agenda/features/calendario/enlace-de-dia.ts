import { CLASES_DE_AGENDA, type ClaveDeClase } from '../../entities/agenda'

// El enlace a un día del calendario, conservando lo que la persona ya eligió (`?ver=`, `?de=`). `extra` llega de la página ya armado
// (`ver=tarea&de=todos` o vacío): así un enlace del servidor no depende de la URL del navegador.
export function enlaceDeDia(extra: string, dia: string): string {
  const base = extra ? `${extra}&` : ''
  return `/agenda?${base}vista=dia&fecha=${dia}`
}

// Lo que ya eligió la persona y un enlace a otro día debe conservar (`?ver=`, `?de=`); la vista y la fecha las pone el enlace.
export function extraDeEnlaces(clases: readonly ClaveDeClase[], deTodos: boolean): string {
  const partes: string[] = []
  if (clases.length < CLASES_DE_AGENDA.length) {
    partes.push(`ver=${clases.join(',')}`)
  }
  if (deTodos) {
    partes.push('de=todos')
  }
  return partes.join('&')
}
