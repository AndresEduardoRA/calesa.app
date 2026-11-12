// Las acciones de la paleta (7.13-2): «Nuevo lead», «Ir a Inventario», «Ver atajos»… Puro y sin permisos: la parte 3 las arma en el layout con `puede()` y las
// pasa ya filtradas, como datos simples (nunca `permisos` ni iconos). Un `destino` es un dato; quien lo ejecuta es el componente.

export type DestinoDeLaAccion =
  { tipo: 'ruta'; ruta: string } | { tipo: 'nuevo-lead' } | { tipo: 'atajos' }

export type AccionDeLaPaleta = {
  clave: string
  titulo: string
  grupo: 'crear' | 'ir' | 'ayuda'
  // Otras formas de pedirla («autos» para Inventario).
  palabras: readonly string[]
  destino: DestinoDeLaAccion
}

// El conjunto sin texto es cerrado y chico (el menú más las de «crear»): sólo se acota lo filtrado.
export const TOPE_DE_ACCIONES = 8

const plegar = (texto: string) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const palabrasDe = (texto: string) => plegar(texto).split(/\s+/).filter(Boolean)

// Cada palabra del texto es el comienzo de una palabra del título o de las de apoyo (o, si no, un fragmento del título). Las acciones locales valen sin
// base y sin red, así que aquí no rige el mínimo de 3 letras de la búsqueda.
function coincide(accion: AccionDeLaPaleta, buscadas: readonly string[]): boolean {
  const titulo = plegar(accion.titulo)
  const propias = [...palabrasDe(accion.titulo), ...accion.palabras.flatMap(palabrasDe)]
  return buscadas.every(
    (buscada) => propias.some((p) => p.startsWith(buscada)) || titulo.includes(buscada),
  )
}

export function filtrarAcciones(
  acciones: readonly AccionDeLaPaleta[],
  texto: string,
): AccionDeLaPaleta[] {
  const buscadas = palabrasDe(texto)
  const primera = buscadas[0]
  if (primera === undefined) {
    return [...acciones]
  }
  const queCoinciden = acciones.filter((accion) => coincide(accion, buscadas))
  const empieza = (accion: AccionDeLaPaleta) =>
    palabrasDe(accion.titulo).some((p) => p.startsWith(primera)) ? 0 : 1
  // `sort` es estable: en un empate queda el orden de la entrada.
  return queCoinciden.sort((a, b) => empieza(a) - empieza(b)).slice(0, TOPE_DE_ACCIONES)
}
