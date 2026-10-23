// La entrada del motor (docs/COTIZADOR.md › «El motor»): lo tipeado, las banderas, los tipos de cambio por clave,
// los campos del vehículo, las tablas vivas, la variante elegida y los overrides. `esquemaEntrada` es para quien la
// recibe desde afuera; `evaluar` confía en el tipo y la lee siempre por `Map`, nunca indexando un objeto.
import { z } from 'zod'
import { esquemaFila, type FilaDeTabla } from './formula'
import { buscar, mapaDe, recorrer, type Medidor } from './medidor'
import { ErrorDelMotor } from './motor-errores'
import { esquemaCampo, esquemaId, type Nodo, type TipoDeNodo } from './nodos'

export const esquemaEntrada = z.strictObject({
  // Lo tipeado, por id de nodo `input`. Lo que no está vale 0 (la celda vacía del Excel).
  inputs: z.record(esquemaId, z.number()),
  // Por id de nodo `bandera`. Lo que no está, apagada.
  banderas: z.record(esquemaId, z.boolean()),
  // Por clave (oficial, paralelo…): la forma de `cotizaciones.tipos_cambio`.
  tipos_cambio: z.record(esquemaId, z.number().positive()),
  // Por campo, tal cual lo escribe la fórmula (`anio`, `atributos.cilindrada`).
  vehiculo: z.record(esquemaCampo, z.union([z.number(), z.string().max(200), z.null()])),
  // Las tablas vivas, por clave. La congelada de `params.tablas` manda (D5).
  tablas: z.record(esquemaId, z.array(esquemaFila)),
  // La clave elegida del nodo `opcion`. Sin clave vale su `por_defecto` (docs/COTIZADOR.md › «La variante»).
  variante: esquemaId.optional(),
  // Por id de nodo: lo que la persona escribió sobre un default o un sugerido (un tipo de cambio también: el de la
  // empresa viene en `tipos_cambio`). El que no se aplica no es un error: se devuelve con su motivo.
  overrides: z.record(esquemaId, z.number()),
})

export type Entrada = z.infer<typeof esquemaEntrada>

export type MapasDeEntrada = {
  inputs: ReadonlyMap<string, number>
  banderas: ReadonlyMap<string, boolean>
  tipos_cambio: ReadonlyMap<string, number>
  vehiculo: ReadonlyMap<string, number | string | null>
  tablas: ReadonlyMap<string, readonly FilaDeTabla[]>
  overrides: ReadonlyMap<string, number>
}

export function mapasDe(entrada: Entrada, m: Medidor): MapasDeEntrada {
  return {
    inputs: mapaDe(entrada.inputs, m),
    banderas: mapaDe(entrada.banderas, m),
    tipos_cambio: mapaDe(entrada.tipos_cambio, m),
    vehiculo: mapaDe(entrada.vehiculo, m),
    tablas: mapaDe(entrada.tablas, m),
    overrides: mapaDe(entrada.overrides, m),
  }
}

// Lo tipeado sólo nombra inputs, y las banderas sólo banderas: otra cosa es un error del código que llama.
export function revisarEntrada(
  nodos: ReadonlyMap<string, Nodo>,
  entrada: Pick<MapasDeEntrada, 'inputs' | 'banderas'>,
  m: Medidor,
): void {
  exigirTipo(nodos, entrada.inputs, 'input', m)
  exigirTipo(nodos, entrada.banderas, 'bandera', m)
}

function exigirTipo(
  nodos: ReadonlyMap<string, Nodo>,
  claves: ReadonlyMap<string, unknown>,
  tipo: TipoDeNodo,
  m: Medidor,
): void {
  for (const [id] of recorrer(claves, m)) {
    if (buscar(nodos, id, m)?.tipo !== tipo) {
      throw new ErrorDelMotor(
        'entrada_invalida',
        `La entrada nombra «${id}», que no es un ${tipo} de la fórmula.`,
        id,
      )
    }
  }
}
