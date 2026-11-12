// Qué archivo admite el comprobante de un gasto o de un pago (6.11-1): el del bucket `comprobantes` (privado, 10 MB; pdf, jpeg, png y webp). Sin I/O.
export const PESO_MAXIMO_DE_COMPROBANTE = 10 * 1024 * 1024

export const MENSAJE_DE_COMPROBANTE_INVALIDO = 'Sólo PDF o imagen de hasta 10 MB.'

const EXTENSIONES: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/** La extensión con que se guarda según el tipo del archivo; nula si el bucket no lo admite. */
export function extensionDelComprobante(tipo: string): string | null {
  return EXTENSIONES[tipo] ?? null
}

export const TIPOS_DE_COMPROBANTE = Object.keys(EXTENSIONES).join(',')
