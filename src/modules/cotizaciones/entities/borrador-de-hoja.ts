import { z } from 'zod'
import type { Entradas, IndiceDeHoja } from './entradas'

// El borrador de la hoja (4-29): lo que la persona tipeó y no guardó, en la pestaña (`useBorradorDeEstado`), para que una recarga, «Recargar» o «Usar la versión nueva» lo
// repongan. **Sólo lo tipeado**: las seis claves de `Entradas`, en arreglos de pares (nunca un objeto con ids por clave: un id como «__proto__» es legal). Ni la respuesta
// de la base ni la hoja abierta.
export type BorradorDeHoja = {
  inputs: [string, number][]
  banderas: string[]
  overrides: [string, number][]
  variante: string | null
  modoTc: string | null
  atajos: [string, number][]
}

export function entradasComoBorrador(e: Entradas): BorradorDeHoja {
  return {
    inputs: [...e.inputs],
    banderas: [...e.banderas],
    overrides: [...e.overrides],
    variante: e.variante,
    modoTc: e.modoTc,
    atajos: [...e.atajos],
  }
}

const pares = z.array(z.tuple([z.string(), z.number()])).catch([])
const esquema = z.object({
  inputs: pares,
  banderas: z.array(z.string()).catch([]),
  overrides: pares,
  variante: z.string().nullable().catch(null),
  modoTc: z.string().nullable().catch(null),
  atajos: pares,
})

// Lo que vuelve contra la hoja de ahora: un nodo, una bandera, una opción o unos atajos que la hoja ya no tiene (otra versión, otro nivel) no vuelven; lo demás, sí. Lo que
// no se lee (otra versión de la pantalla, editado a mano) se ignora.
export function entradasDelBorrador(
  b: Readonly<Record<string, unknown>>,
  indice: IndiceDeHoja,
): Entradas {
  const leido = esquema.parse({
    inputs: [],
    banderas: [],
    overrides: [],
    variante: null,
    modoTc: null,
    atajos: [],
    ...b,
  })
  const deLaHoja = (lista: [string, number][]) =>
    new Map(lista.filter(([id]) => indice.lados.has(id)))
  return {
    inputs: deLaHoja(leido.inputs),
    banderas: new Set(leido.banderas.filter((nodo) => indice.interruptores.has(nodo))),
    overrides: deLaHoja(leido.overrides),
    variante:
      leido.variante !== null && indice.opciones.has(leido.variante) ? leido.variante : null,
    // Un modo que la hoja de ahora no declara (u otro borrador, sin la clave) vuelve como el inicial.
    modoTc:
      leido.modoTc !== null && indice.modos.has(leido.modoTc) ? leido.modoTc : indice.modoInicial,
    atajos: deLaHoja(leido.atajos),
  }
}

// `useBorradorDeEstado` llama a lo mismo al reponer y al «Descartar»: al reponer cada clave difiere de la hoja vacía (`cambiosDeEstado`); al descartar, todas son iguales.
export function esDescarte(
  cambios: Readonly<Record<string, unknown>>,
  vacio: BorradorDeHoja,
): boolean {
  const vacias: Readonly<Record<string, unknown>> = vacio
  return Object.entries(cambios).every(
    ([clave, valor]) => JSON.stringify(valor) === JSON.stringify(vacias[clave]),
  )
}
