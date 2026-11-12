import { formatearNumero } from '@/shared/lib/formato'

// El peso de un archivo para leerlo: «850 KB», «12,4 MB». Base 1024, una cifra decimal sólo desde los MB.
export function formatearBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${formatearNumero(bytes, { decimales: 0 })} B`
  }
  if (bytes < 1024 * 1024) {
    return `${formatearNumero(Math.round(bytes / 1024), { decimales: 0 })} KB`
  }
  return `${formatearNumero(bytes / (1024 * 1024), { decimales: 1 })} MB`
}
