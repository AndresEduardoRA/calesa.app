// Lo que dice «Guardar el borrador» del diseño (4.22-2): qué dejó el último intento y su texto, y por qué el botón espera. Los textos son propios; sólo el PT409 trae
// el de la base (nombra a una persona y cuándo).

// Lo que dejó el último «Guardar el borrador»: entró; un PT409 con el texto de la base; o un error con su texto propio.
export type EstadoDelGuardadoDelDiseno =
  | { tipo: 'quieto' }
  | { tipo: 'entro' }
  | { tipo: 'conflicto'; mensaje: string }
  | { tipo: 'regla' }
  | { tipo: 'sin_permiso' }
  | { tipo: 'sin_respuesta' }
  | { tipo: 'error' }

export const SIN_CAMBIOS = 'No hay cambios por guardar.'
export const SE_GUARDO = 'Se guardó el borrador.'
export const GUARDANDO = 'Guardando…'
export const AVISO_DE_RECARGA =
  'Recargar trae el borrador como quedó; lo que cambiaste y no guardaste se pierde.'
export const MENSAJE_DE_VALIDACION =
  'No pudimos guardar: el diseño no tiene la forma que se espera.'

export const motivoParaNoGuardarElDiseno = (hayCambios: boolean): string | null =>
  hayCambios ? null : SIN_CAMBIOS

// El texto de lo que dejó el último intento; nulo si no hay nada que decir. `origen` es el nombre del origen abierto.
export function textoDelGuardado(
  estado: EstadoDelGuardadoDelDiseno,
  origen: string,
): string | null {
  switch (estado.tipo) {
    case 'quieto':
      return null
    case 'entro':
      return SE_GUARDO
    case 'conflicto':
      return `${estado.mensaje} ${AVISO_DE_RECARGA}`
    case 'regla':
      return 'La base no aceptó el diseño por una regla que el editor no revisó: no se guardó.'
    case 'sin_permiso':
      return `Ya no configuras ${origen}: no se puede guardar.`
    case 'sin_respuesta':
      return 'No sabemos si se guardó: recarga para verlo.'
    case 'error':
      return 'No pudimos guardar el borrador. Vuelve a intentar en un momento.'
  }
}
