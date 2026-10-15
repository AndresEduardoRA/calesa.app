// Entregar un archivo al navegador como una descarga, sin dejar la URL del blob viva. Sólo en el
// navegador.
export function descargarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  enlace.rel = 'noopener'
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}

// Un texto CSV (ya con su BOM, si lo lleva) como archivo.
export function descargarCsv(texto: string, nombre: string): void {
  descargarArchivo(new Blob([texto], { type: 'text/csv;charset=utf-8' }), nombre)
}
