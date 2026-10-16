// Salir de la pantalla desde afuera de un formulario abierto (la acción de un aviso: «Abrir ficha»,
// «Recargar») pregunta lo mismo que cerrarlo: «Tienes cambios sin guardar.», en el pie del formulario.
// Cada formulario abierto con algo escrito se anota acá mientras lo esté; si nadie está anotado, se
// sale directo. Al descartar, la salida sigue; con «Seguir editando», no pasa nada.
type Pregunta = (salir: () => void) => void

const anotados: Pregunta[] = []

// Devuelve cómo borrarse. El último anotado es el de más arriba: el que se ve.
export function anotarCambiosSinGuardar(pregunta: Pregunta): () => void {
  anotados.push(pregunta)
  return () => {
    const lugar = anotados.lastIndexOf(pregunta)
    if (lugar !== -1) {
      anotados.splice(lugar, 1)
    }
  }
}

export function salirSinPerder(salir: () => void): void {
  const arriba = anotados.at(-1)
  if (arriba) {
    arriba(salir)
    return
  }
  salir()
}
