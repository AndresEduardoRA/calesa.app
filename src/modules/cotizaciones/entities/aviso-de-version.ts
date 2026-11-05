import type { HojaDeUnaGuardada } from './hoja-de-una-guardada'

// El aviso de una cotización guardada que no está al día (4.15-3b, P7): usa otra versión de la fórmula que la publicada hoy, o ya venció. Una línea por cosa; sin ninguna, no se
// dibuja nada. Lo ve todo el que abre la página: dice algo de la cotización, no de quien mira. Sin versión publicada hoy no hay una «otra versión» que decir.
export function avisoDeVersion(
  hoja: Pick<HojaDeUnaGuardada, 'publicada' | 'vencida' | 'diseno'>,
): string[] {
  const { publicada, vencida, diseno } = hoja
  return [
    ...(publicada !== null && publicada.id !== diseno.formula.id
      ? [
          `Esta cotización usa la versión ${String(diseno.formula.version)}; la de hoy es la ${String(publicada.version)}.`,
        ]
      : []),
    ...(vencida ? ['Esta cotización está vencida.'] : []),
  ]
}
