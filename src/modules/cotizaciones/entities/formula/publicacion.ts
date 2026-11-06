// Publicar el borrador de la fórmula de un origen desde Configuración › Cotización › «Fórmula» (4.20-2b): la nota, el panel de la URL y por qué no se abre o ya no se
// puede publicar. La regla de verdad (el permiso, la nota, la esperada, el borrador atrasado, la validación) es de `formula_publicar()`: esto sólo evita pedir lo que
// la base va a rechazar y dice por qué con el modal a la vista.
import { z } from 'zod'
import { borradorAtrasado, type EstadoDeLaFormula } from './versiones'

export const MENSAJE_DE_NOTA_VACIA = 'Publicar pide una nota.'
// La base no limita la nota; el tope es el de las notas de una oportunidad (`oportunidades_notas_largo`).
export const LARGO_MAXIMO_DE_NOTA = 2000
const MENSAJE_DE_NOTA_LARGA = 'La nota pasa de 2.000 caracteres.'

export const esquemaDeNota = z
  .string()
  .trim()
  .min(1, { error: MENSAJE_DE_NOTA_VACIA })
  .max(LARGO_MAXIMO_DE_NOTA, { error: MENSAJE_DE_NOTA_LARGA })

// El motivo junto al campo «Nota», o nulo si pasa.
export function motivoDeNota(nota: string): string | null {
  const leida = esquemaDeNota.safeParse(nota)
  return leida.success ? null : (leida.error.issues[0]?.message ?? MENSAJE_DE_NOTA_VACIA)
}

export const PANEL_PUBLICAR_FORMULA = 'publicar-formula'

export const MOTIVO_SIN_PERMISO_DE_FORMULA =
  'No tienes permiso para configurar la fórmula de este origen.'

// `?panel=publicar-formula` se revisa al llegar: sin borrador, o con uno atrasado (publicarlo daría PT409), no abre.
export function motivoParaNoAbrirPublicar(estado: EstadoDeLaFormula): string | null {
  if (!estado.borrador) {
    return 'No hay borrador para publicar.'
  }
  return borradorAtrasado(estado.borrador, estado.publicada)
    ? 'Ese borrador ya no se puede publicar: después de que empezó se publicó otra versión.'
    : null
}

// Con el modal abierto, tras «Recargar»: el borrador ya no está, o se publicó otra después de que empezó. El modal lo dice y no deja publicar.
export function noDisponibleAlPublicar(estado: EstadoDeLaFormula): string | null {
  const { borrador, publicada } = estado
  if (!borrador) {
    return 'El borrador ya no está: otra persona lo publicó o lo descartó.'
  }
  if (!borradorAtrasado(borrador, publicada)) {
    return null
  }
  return publicada
    ? `Después de que empezó este borrador se publicó la versión ${String(publicada.version)}: ya no se puede publicar.`
    : 'Después de que empezó este borrador la versión publicada cambió: ya no se puede publicar.'
}
