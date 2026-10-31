// «Nuevo lead» abierto desde el panel del cliente de una pantalla (la hoja de cotizar): `?elegir=<clave>` dice en qué clave de la URL escribir el lead
// creado, y la pantalla lo elige. Este módulo no conoce la clave (es de la pantalla); sólo valida que sea un nombre que nombra una clave de la URL.

export const CLAVE_DE_ELEGIR = 'elegir'

// Las claves que usa la propia URL del alta: elegir una de ellas rompería el panel que se está cerrando.
const CLAVES_DEL_ALTA: readonly string[] = ['panel', CLAVE_DE_ELEGIR]

const NOMBRE_DE_CLAVE = /^[a-z]{1,20}$/

// La clave de la URL donde escribir el lead creado, o null si el valor no es un nombre de 1 a 20 letras minúsculas o es una clave del alta.
// Viene de la URL: sólo nombra una clave de la misma página y nunca llega a una consulta.
export function claveParaElegir(valor: string | null): string | null {
  if (valor === null || !NOMBRE_DE_CLAVE.test(valor) || CLAVES_DEL_ALTA.includes(valor)) {
    return null
  }
  return valor
}
