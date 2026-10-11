// Atajos globales de teclado (docs/UX.md › Reglas transversales). Acá vive el catálogo y la
// lectura de un evento; quién escucha y a quién le toca responder es de `src/shared/ui/atajos`.

export const ATAJOS = {
  cerrar: { combinacion: 'escape', descripcion: 'Cerrar el panel abierto' },
  buscar: { combinacion: 'mod+k', descripcion: 'Buscar y ejecutar comandos' },
  nuevo: { combinacion: 'n', descripcion: 'Nuevo, según la pantalla' },
  guardar: { combinacion: 'mod+s', descripcion: 'Guardar' },
  guardarYSeguir: { combinacion: 'mod+enter', descripcion: 'Guardar y seguir' },
  ayuda: { combinacion: '?', descripcion: 'Ver la lista de atajos' },
} as const satisfies Record<string, { combinacion: string; descripcion: string }>

export type ClaveAtajo = keyof typeof ATAJOS

// Lo mínimo de un KeyboardEvent, para poder probarlo sin DOM.
export type Tecla = {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

// `mod` es Ctrl en Windows y Linux y Cmd en macOS: se aceptan los dos en cualquier sistema.
export function combinacionDe(tecla: Tecla): string {
  const key = tecla.key.toLowerCase()
  const mod = tecla.ctrlKey || tecla.metaKey
  return `${mod ? 'mod+' : ''}${tecla.altKey ? 'alt+' : ''}${key}`
}

export function atajoDe(tecla: Tecla): ClaveAtajo | null {
  const combinacion = combinacionDe(tecla)
  for (const clave of Object.keys(ATAJOS) as ClaveAtajo[]) {
    if (ATAJOS[clave].combinacion === combinacion) {
      return clave
    }
  }
  return null
}

// Los de una sola tecla (`N`, `?`) no se disparan mientras la persona escribe; los que llevan
// `mod` y `Esc` sí, que para eso existen.
export function valeMientrasSeEscribe(clave: ClaveAtajo): boolean {
  const { combinacion } = ATAJOS[clave]
  return combinacion.startsWith('mod+') || combinacion === 'escape'
}
