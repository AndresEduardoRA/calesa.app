import { useState } from 'react'

// El texto de un campo que también vive en la URL. Mientras la persona escribe manda lo que
// escribe (la URL va detrás, y puede descartar un valor a medio tipear); cuando la URL cambia por
// otro lado (se quitó el chip, se limpiaron los filtros) manda la URL.
export function useTextoDeUrl(deLaUrl: string, normalizar: (texto: string) => string) {
  const [texto, setTexto] = useState(deLaUrl)
  const [visto, setVisto] = useState(deLaUrl)
  if (deLaUrl !== visto) {
    setVisto(deLaUrl)
    if (normalizar(texto) !== deLaUrl) {
      setTexto(deLaUrl)
    }
  }
  return [texto, setTexto] as const
}
