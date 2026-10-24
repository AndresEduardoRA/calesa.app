// El espejo TS de `validar_diseno()` (docs/COTIZADOR.md › «El diseño de la hoja»): primero la forma (el Zod de `diseno.ts`), después las
// reglas que cruzan el diseño con la fórmula, en pasadas lineales y en un orden fijo. Devuelve el primer rechazo, como el `raise` de la
// base. Los casos de cada regla están en `casos-de-diseno.json`.
//
// La definición llega ya validada por `validarFormula()` (el publicar llama a las dos, en ese orden): acá no se revisa de nuevo.
import type { z } from 'zod'
import { esquemaDiseno, type Diseno } from './diseno'
import type { Definicion } from './formula'
import type { Medidor } from './medidor'
import { fallo, type FalloDeDiseno } from './motivos-de-diseno'
import { estadoVacio, indexar, type ContextoDeDiseno } from './validar-diseno-contexto'
import { revisarAtajos, revisarCobertura, revisarTonos } from './validar-diseno-cobertura'
import { revisarModos } from './validar-diseno-modos'
import { revisarSecciones, revisarTarjeta } from './validar-diseno-secciones'

export type { ContextoDeDiseno } from './validar-diseno-contexto'
export type ResultadoDeValidacionDeDiseno = { ok: true; diseno: Diseno } | FalloDeDiseno

export function validarDiseno(
  definicion: Definicion,
  diseno: unknown,
  contexto: ContextoDeDiseno,
  medidor?: Medidor,
): ResultadoDeValidacionDeDiseno {
  const m = medidor ?? { visitas: 0 }
  const leido = esquemaDiseno.safeParse(diseno)
  if (!leido.success) return fallo('forma', datosDeForma(leido.error, diseno))
  const d = leido.data
  const ix = indexar(definicion, contexto, m)
  const e = estadoVacio()
  const rechazo =
    revisarModos(ix, d) ??
    revisarSecciones(ix, d, e) ??
    revisarTarjeta(ix, d) ??
    revisarAtajos(ix, e) ??
    revisarCobertura(ix, e) ??
    revisarTonos(ix)
  return rechazo ?? { ok: true, diseno: d }
}

// `donde` es el id (crudo, si es un texto) de la sección donde está el primer error de Zod; en la cabecera, la tarjeta o la raíz, nada.
// Zod da el primer error en el orden de las claves: cabecera, secciones (en orden) y tarjeta; la base lo copia.
function datosDeForma(error: z.ZodError, diseno: unknown) {
  const ruta = error.issues[0]?.path ?? []
  const campo = ['diseno', ...ruta.map(String)].join('.')
  const [raiz, i] = ruta
  if (raiz === 'secciones' && typeof i === 'number') {
    const donde = idCrudo(diseno, i)
    return donde === undefined ? { campo } : { campo, donde }
  }
  return { campo }
}

const campoDe = (x: unknown, clave: string): unknown =>
  typeof x === 'object' && x !== null ? (x as Record<string, unknown>)[clave] : undefined

function idCrudo(diseno: unknown, i: number): string | undefined {
  const secciones = campoDe(diseno, 'secciones')
  const id = campoDe(Array.isArray(secciones) ? (secciones[i] as unknown) : undefined, 'id')
  return typeof id === 'string' ? id : undefined
}
