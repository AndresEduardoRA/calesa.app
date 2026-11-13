// El motivo de anular un pago confirmado (6.10-2), aparte de `pago.ts` para que ese archivo no pase de 300 líneas (8.13-5).
export const MOTIVO_MAXIMO = 500

/** El motivo de anular un pago confirmado: recortado, de 1 a 500 letras (la base lo exige igual). */
export function validarMotivoDeAnulacion(
  texto: string,
): { ok: true; motivo: string } | { ok: false; error: string } {
  const motivo = texto.trim()
  if (motivo === '') {
    return { ok: false, error: 'Escribe por qué anulas el pago.' }
  }
  if (motivo.length > MOTIVO_MAXIMO) {
    return { ok: false, error: `El motivo admite hasta ${String(MOTIVO_MAXIMO)} letras.` }
  }
  return { ok: true, motivo }
}
