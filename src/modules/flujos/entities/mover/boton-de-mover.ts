// El botón de mover a un destino (6.04): su texto y, si está apagado, el motivo escrito. Un botón apagado nunca calla por qué: el motivo va debajo, no sólo en un `title`. Puro: la
// base es la que decide (`cambiar_fase`), esto sólo anticipa lo que la vista previa ya dice.
import { motivoLegible } from './motivos'
import { LARGO_MAXIMO_DE_LA_NOTA, MOTIVO_SIN_PERMISO_DE_MOVER } from './para-mover'
import type { VistaPrevia } from './vista-previa'

export const MOTIVO_DE_NOTA_OBLIGATORIA = 'Esta fase pide una nota interna.'
export const MOTIVO_DE_NOTA_LARGA = `La nota admite hasta ${String(LARGO_MAXIMO_DE_LA_NOTA)} caracteres.`
export const MOTIVO_SIN_VISTA = 'No pudimos revisar lo que falta. Reintenta en un momento.'

/** El texto del botón: la acción de la transición, o «Mover a «<fase>»» (y, sin fase, «Mover a la fase inicial «<fase>»»). */
export function textoDelBoton(
  destino: { nombre: string; accion: string | null },
  unidadSinFase: boolean,
): string {
  const accion = destino.accion?.trim()
  if (accion) return accion
  return unidadSinFase
    ? `Mover a la fase inicial «${destino.nombre}»`
    : `Mover a «${destino.nombre}»`
}

// Lo primero que cierra el paso, en orden: sin transición no hay destino; el rol; los requisitos.
const ORDEN_DE_RECHAZOS = ['acceso', 'transicion', 'rol', 'requisitos']

function primerRechazo(vista: VistaPrevia): string | null {
  for (const codigo of ORDEN_DE_RECHAZOS) {
    const i = vista.codigos.indexOf(codigo)
    if (i >= 0)
      return motivoLegible({ codigo, motivo: vista.motivos[i] ?? null }, { faltan: vista.faltan })
  }
  const otro = vista.motivos[0]
  return vista.ok || otro === undefined
    ? null
    : motivoLegible({ codigo: vista.codigos[0] ?? null, motivo: otro })
}

export type EstadoDelBoton =
  { habilitado: true; motivo: null } | { habilitado: false; motivo: string }

/** ¿Se puede enviar? Si no, el motivo en una frase: sin permiso, vista que falló, rechazo de la base, nota sin escribir o demasiado larga. */
export function estadoDelBoton(entrada: {
  puedeMover: boolean
  vista: VistaPrevia | null
  nota: string
}): EstadoDelBoton {
  const { puedeMover, vista, nota } = entrada
  if (!puedeMover) return { habilitado: false, motivo: MOTIVO_SIN_PERMISO_DE_MOVER }
  if (vista === null) return { habilitado: false, motivo: MOTIVO_SIN_VISTA }
  const rechazo = primerRechazo(vista)
  if (rechazo !== null) return { habilitado: false, motivo: rechazo }
  const texto = nota.trim()
  if (vista.notaObligatoria && texto === '')
    return { habilitado: false, motivo: MOTIVO_DE_NOTA_OBLIGATORIA }
  if (texto.length > LARGO_MAXIMO_DE_LA_NOTA)
    return { habilitado: false, motivo: MOTIVO_DE_NOTA_LARGA }
  return { habilitado: true, motivo: null }
}
