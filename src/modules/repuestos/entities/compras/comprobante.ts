// Qué archivo admite el comprobante de una compra (8.11-3, C4): el del bucket `comprobantes` (privado, 10 MB; pdf, jpeg, png y webp), el mismo de los gastos de
// logística (`repuestos` no importa `logistica`). Sin I/O.
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
