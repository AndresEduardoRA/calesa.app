// Los dos números de un lead y cómo se escriben (los usan `leads` y `vehiculos`). La base ya resolvió cuál ve cada persona: el global
// (`leads.numero`) llega sólo a quien tiene `leads.numero_global.ver` y el propio (el consecutivo de quien
// creó el lead) llega a su creador y a quien tiene ese permiso. Acá no se decide quién ve qué: un número que
// llega nulo no se dibuja, y nada pregunta por un rol ni por un permiso.
import { z } from 'zod'
import { formatearNumero } from '@/shared/lib/formato'

export type NumerosDeLead = Readonly<{
  // El global: el consecutivo de toda la empresa. Nulo si quien mira no tiene el permiso.
  numero: number | null
  // El propio: el consecutivo de quien creó el lead. Nulo si no se ve (o el lead no tiene creador).
  numeroPropio: number | null
  // Quién lo creó, sólo cuando el propio que se ve no es de quien mira.
  creadorDelPropio: string | null
}>

export const SIN_NUMEROS: NumerosDeLead = {
  numero: null,
  numeroPropio: null,
  creadorDelPropio: null,
}

// Los campos que traen los dos números en una fila de `leads_vista` o en lo que devuelve una RPC. Para
// sumarlos a un `z.object({ …, ...CAMPOS_DE_NUMEROS })`.
export const CAMPOS_DE_NUMEROS = {
  numero: z.number().nullable().optional(),
  numero_propio: z.number().nullable().optional(),
  numero_propio_creador: z.string().nullable().optional(),
}

type CrudoDeNumeros = {
  numero?: number | null
  numero_propio?: number | null
  numero_propio_creador?: string | null
}

export function numerosDesde(crudo: CrudoDeNumeros): NumerosDeLead {
  return {
    numero: crudo.numero ?? null,
    numeroPropio: crudo.numero_propio ?? null,
    creadorDelPropio: crudo.numero_propio_creador ?? null,
  }
}

export type NumeroEscrito = Readonly<{
  // El que va primero: el global si se ve; si no, el propio. Nulo si no se ve ninguno.
  principal: string | null
  // El otro, cuando se ven los dos.
  secundario: string | null
}>

// «N.º 1.234» el global, «Tu n.º 12» el propio de quien mira, «N.º 12 · Berta» el propio de otra persona. El
// número se formatea con el locale de la empresa (`formatear`): nunca a mano.
export function escribirNumeros(
  numeros: NumerosDeLead,
  formatear: (valor: number) => string,
): NumeroEscrito {
  const global = numeros.numero === null ? null : `N.º ${formatear(numeros.numero)}`
  let propio: string | null = null
  if (numeros.numeroPropio !== null) {
    propio = numeros.creadorDelPropio
      ? `N.º ${formatear(numeros.numeroPropio)} · ${numeros.creadorDelPropio}`
      : `Tu n.º ${formatear(numeros.numeroPropio)}`
  }
  return global
    ? { principal: global, secundario: propio }
    : { principal: propio, secundario: null }
}

// El número principal en una frase («Ya existe: Ana (N.º 1.234)»): con el locale de fábrica, porque quien arma la
// frase no conoce el de la empresa. Nulo si no se ve ninguno.
export function numeroEnFrase(numeros: NumerosDeLead): string | null {
  return escribirNumeros(numeros, (valor) => formatearNumero(valor, { decimales: 0 })).principal
}
