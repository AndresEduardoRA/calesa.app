import type { ErrorApp, Resultado } from './errores'

// Ningún formulario pierde lo tipeado: si el envío falla, los valores quedan y el foco va al
// primer campo con error (.claude/rules/ui.md).

export function enfocarPrimerError(formulario: HTMLFormElement | null): void {
  // Un cuadro después: los `aria-invalid` de este intento todavía no están pintados.
  requestAnimationFrame(() => {
    formulario?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  })
}

// Lee los campos de texto de un formulario por nombre. Lo que no es texto (un archivo) se ignora.
export function valoresDe<Clave extends string>(
  formulario: HTMLFormElement,
  claves: readonly Clave[],
): Record<Clave, string> {
  const datos = new FormData(formulario)
  const valores = {} as Record<Clave, string>
  for (const clave of claves) {
    const valor = datos.get(clave)
    valores[clave] = typeof valor === 'string' ? valor : ''
  }
  return valores
}

// Lo que devuelve una action de next-safe-action, visto desde el formulario: o falló antes de
// ejecutar (`serverError`: sin sesión, algo inesperado) o ejecutó y devolvió un `Resultado`.
type ResultadoDeAccion = { serverError?: ErrorApp; data?: Resultado<unknown> }

export function errorDeAccion(resultado: ResultadoDeAccion): ErrorApp | null {
  if (resultado.serverError) {
    return resultado.serverError
  }
  return resultado.data && !resultado.data.ok ? resultado.data.error : null
}

// El primer mensaje de un campo entre los errores de validación de una action (los que
// next-safe-action devuelve «planos»: `fieldErrors`).
export function errorDeCampo<Campo extends string>(
  errores: Partial<Record<Campo, string[]>> | undefined,
  campo: Campo,
): string | undefined {
  const mensajes: string[] | undefined = errores?.[campo]
  return mensajes?.[0]
}
