import type { ErrorApp } from '@/shared/lib/errores'

// Lo que devuelve dar de alta un lead. Además del error, qué dato lo causó (por su clave en el
// formulario) para escribir el motivo junto a él.
export type ResultadoDelAlta<Dato> =
  { ok: true; data: Dato } | { ok: false; error: ErrorApp; porCampo?: Record<string, string> }

export const MENSAJE_DE_VALIDACION = 'Revisa los campos marcados.'
