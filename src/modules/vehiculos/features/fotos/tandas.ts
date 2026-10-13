// Corre una tarea por elemento, con un tope de cuántas a la vez, y devuelve los resultados en el
// orden de los elementos. Subir 24 fotos de a 24 ahoga una conexión de celular; de a una, tarda.
export async function enTandas<Elemento, Resultado>(
  elementos: readonly Elemento[],
  aLaVez: number,
  tarea: (elemento: Elemento) => Promise<Resultado>,
): Promise<Resultado[]> {
  const resultados = new Array<Resultado>(elementos.length)
  let siguiente = 0
  async function trabajar(): Promise<void> {
    while (siguiente < elementos.length) {
      const indice = siguiente
      siguiente += 1
      const elemento = elementos[indice]
      if (elemento !== undefined) {
        resultados[indice] = await tarea(elemento)
      }
    }
  }
  const trabajadores = Math.max(1, Math.min(aLaVez, elementos.length))
  await Promise.all(Array.from({ length: trabajadores }, trabajar))
  return resultados
}
