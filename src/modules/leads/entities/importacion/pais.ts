// El país de una fila del CSV: «País» se completa con el del teléfono sólo cuando la celda viene
// vacía (o el archivo no trae la columna). Lo que el archivo dice se respeta. Sin I/O: la tabla de
// países la recibe, porque se carga aparte (al elegir el archivo).
import type { ValoresDeFormulario } from '@/shared/lib/campos'
import { CLAVE_DEL_ALTA, claveDeAtributoDeAlta, type ContextoDeAlta } from '../alta'
import type { CampoDeLead } from '../campo'
import { CLAVE_DEL_PAIS, paisDelEscrito, paisParaGuardar } from '../pais-del-telefono'
import type { TablaDePaises } from '../paises/resolver'

export const OBJETIVO_PAIS = claveDeAtributoDeAlta(CLAVE_DEL_PAIS)

type Entrada = {
  valores: ValoresDeFormulario
  // Los motivos de lo que no se pudo leer (por objetivo): una celda con error no se completa.
  propios: ReadonlyMap<string, string>
  // Los campos activos por clave: si «País» está apagado no se llena nada.
  campos: ReadonlyMap<string, CampoDeLead>
  contexto: ContextoDeAlta
  // `null` hasta que la tabla llega (o si no pudo pedirse): la fila queda como estaba.
  tabla: TablaDePaises | null
}

const estaVacio = (valor: unknown) =>
  valor === undefined || valor === null || String(valor).trim() === ''

// Pone el país del número en `valores` y lo devuelve; `null` si no completó nada (la celda trae un
// dato, «País» está apagado, el número todavía no es un teléfono, o su prefijo es compartido o
// desconocido: no se adivina).
export function completarPaisDeLaFila({
  valores,
  propios,
  campos,
  contexto,
  tabla,
}: Entrada): string | null {
  if (
    !campos.has(CLAVE_DEL_PAIS) ||
    propios.has(OBJETIVO_PAIS) ||
    !estaVacio(valores[OBJETIVO_PAIS])
  ) {
    return null
  }
  const escrito = paisDelEscrito(tabla, String(valores[CLAVE_DEL_ALTA.telefono] ?? ''), {
    telefonoCc: contexto.telefonoCc,
    pais: contexto.empresa.pais,
  })
  const pais = escrito ? paisParaGuardar(escrito.resuelto) : null
  if (pais !== null) {
    valores[OBJETIVO_PAIS] = pais
  }
  return pais
}
