// El contador de visitas de los validadores: todo bucle y toda búsqueda pasan por acá, así un bucle
// anidado (lo cuadrático) se ve en el número y no en los milisegundos de la máquina.

export type Medidor = { visitas: number }

export function* recorrer<T>(lista: Iterable<T>, medidor: Medidor): Generator<T> {
  for (const x of lista) {
    medidor.visitas += 1
    yield x
  }
}

export function buscar<K, V>(mapa: ReadonlyMap<K, V>, clave: K, medidor: Medidor): V | undefined {
  medidor.visitas += 1
  return mapa.get(clave)
}

export function esta<K>(conjunto: ReadonlySet<K>, clave: K, medidor: Medidor): boolean {
  medidor.visitas += 1
  return conjunto.has(clave)
}

// Una clave propia de un objeto (nunca la del prototipo: un nodo o una columna pueden llamarse `constructor`).
export function propia<V>(
  objeto: Readonly<Record<string, V>>,
  clave: string,
  medidor: Medidor,
): V | undefined {
  medidor.visitas += 1
  return Object.hasOwn(objeto, clave) ? objeto[clave] : undefined
}

// Un `Map` con las claves propias de un objeto, en su orden: una visita por clave.
export function mapaDe<V>(objeto: Readonly<Record<string, V>>, medidor: Medidor): Map<string, V> {
  return new Map(recorrer(Object.entries(objeto), medidor))
}
