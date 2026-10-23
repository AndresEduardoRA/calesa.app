// Grupos, buckets y el total (docs/COTIZADOR.md › «Grupos, buckets y el total»). Con grupos: USD del grupo = Σ de
// sus miembros en el orden de la lista; Bs = USD × tc(su bucket); el total en Bs, Σ de los grupos en el orden de
// `grupos`; el total en USD, Bs ÷ tc(`total_en`). Sin grupos, el total se reparte por bucket. Un grupo sin miembros en
// la variante no se dibuja y un término del reparto fuera de ella no cuenta: ninguno lee su tipo de cambio.
import type { Grupo, ModoDeCambio } from './formula'
import { buscar, esta, recorrer } from './medidor'
import { asentar, leer, sinValidar, type Evaluacion, type Valor } from './motor-contexto'
import { ErrorDelMotor, type CodigoDeErrorDelMotor } from './motor-errores'
import { bucketDe } from './nodos'

export type TotalesDelMotor = {
  // Por grupo, en el orden de `grupos`; vacío sin grupos. `se_dibuja` es falso si todos sus miembros están fuera de
  // la variante (una condición apagada no lo oculta: la fila se dibuja deshabilitada).
  grupos: Record<string, { usd: Valor; bs: Valor; se_dibuja: boolean }>
  bs: Valor
  // El «TOTAL DÓLARES»: Bs ÷ tc(`total_en`). Sin `total_en` (y sin modo), la suma de los dólares.
  usd: Valor
  // El valor del nodo `salida: total`: la suma de los dólares (N22 en el Excel).
  suma_usd: Valor
}

// Un término del reparto sin grupos: el total con su bucket, o cada término directo de un total `suma`.
type Termino = { id: string; bucket: string }

// El cambio que se usa: bucket → id del nodo `tipo_cambio`, el que divide el total y el reparto sin grupos.
export type Cambio = {
  buckets: ReadonlyMap<string, string>
  total_en: string | undefined
  reparto: readonly Termino[]
}

// El modo, si llega, reemplaza `buckets` y `total_en` completos. Tiene que nombrar tipos de cambio de la fórmula y
// cubrir cada bucket que se usa; si no, es un error de llamada. Un bucket de más se ignora.
export function cambioDe(ev: Evaluacion, modo?: ModoDeCambio): Cambio {
  const def = ev.formula.definicion
  const fuente = modo ?? { buckets: def.buckets ?? {}, total_en: def.total_en }
  const codigo = modo === undefined ? 'formula_sin_validar' : 'modo_invalido'
  const buckets = new Map<string, string>()
  for (const [bucket, id] of recorrer(Object.entries(fuente.buckets), ev.m)) {
    exigirTipoDeCambio(ev, id, `buckets.${bucket}`, codigo)
    buckets.set(bucket, id)
  }
  if (fuente.total_en !== undefined) exigirTipoDeCambio(ev, fuente.total_en, 'total_en', codigo)
  const grupos = def.grupos ?? []
  const reparto = grupos.length > 0 ? [] : terminosDelReparto(ev)
  const usados = grupos.length > 0 ? grupos : reparto
  for (const { bucket } of recorrer(usados, ev.m)) {
    if (buscar(buckets, bucket, ev.m) === undefined) {
      throw fallaDeCambio(codigo, `no dice qué tipo de cambio usa el bucket «${bucket}»`, bucket)
    }
  }
  return { buckets, total_en: fuente.total_en, reparto }
}

// Suma el valor de un miembro al USD de su grupo, en el orden de la lista.
export function acumular(ev: Evaluacion, grupo: string, v: Valor): void {
  const antes = buscar(ev.subtotales, grupo, ev.m)
  ev.subtotales.set(grupo, antes === undefined ? v : sumarDos(antes, v))
}

export function totalesDe(ev: Evaluacion, cambio: Cambio): TotalesDelMotor {
  const sumaUsd = leer(ev, ev.total.id, ev.total.id)
  const grupos = ev.formula.definicion.grupos ?? []
  const { porGrupo, bs } =
    grupos.length > 0 ? conGrupos(ev, grupos, cambio) : { porGrupo: {}, bs: repartir(ev, cambio) }
  const usd = cambio.total_en === undefined ? sumaUsd : enDolares(ev, bs, cambio.total_en)
  return { grupos: porGrupo, bs, usd, suma_usd: sumaUsd }
}

function conGrupos(ev: Evaluacion, grupos: readonly Grupo[], cambio: Cambio) {
  const porGrupo: TotalesDelMotor['grupos'] = {}
  let bs: Valor = 0
  for (const g of recorrer(grupos, ev.m)) {
    const usd = asentar(ev, buscar(ev.subtotales, g.id, ev.m) ?? 0, g.id)
    const seDibuja = esta(ev.dibujados, g.id, ev.m)
    // Un grupo que no se dibuja vale 0 y no lee su tipo de cambio: EE. UU.–Chile no necesita el oficial.
    const enBs = seDibuja ? asentar(ev, porDos(usd, tipoDeCambioDe(ev, cambio, g.bucket)), g.id) : 0
    porGrupo[g.id] = { usd, bs: enBs, se_dibuja: seDibuja }
    bs = sumarDos(bs, enBs)
  }
  return { porGrupo, bs: asentar(ev, bs, 'total') }
}

// Sin grupos: Bs = Σ término × tc(su bucket), en el orden de `total.de` (o el total por el tc de su bucket).
function repartir(ev: Evaluacion, cambio: Cambio): Valor {
  let bs: Valor = 0
  for (const t of recorrer(cambio.reparto, ev.m)) {
    // Fuera de la variante aporta 0 sin leer su tipo de cambio; apagado aporta 0 × tc.
    if (buscar(ev.estados, t.id, ev.m) === 'fuera_de_variante') continue
    bs = sumarDos(bs, porDos(leer(ev, t.id, ev.total.id), tipoDeCambioDe(ev, cambio, t.bucket)))
  }
  return asentar(ev, bs, 'total')
}

function terminosDelReparto(ev: Evaluacion): Termino[] {
  const t = ev.total
  const b = bucketDe(t)
  if (b !== undefined) return [{ id: t.id, bucket: b }]
  if (t.tipo !== 'calculo' || t.op !== 'suma') {
    throw sinValidar('sin grupos, el total no tiene bucket ni es una suma', t.id)
  }
  const terminos: Termino[] = []
  for (const id of recorrer(t.de, ev.m)) {
    const termino = buscar(ev.nodos, id, ev.m)
    const bucket = termino === undefined ? undefined : bucketDe(termino)
    if (bucket === undefined) throw sinValidar(`sin grupos, «${id}» suma al total sin bucket`, t.id)
    terminos.push({ id, bucket })
  }
  return terminos
}

function enDolares(ev: Evaluacion, bs: Valor, totalEn: string): Valor {
  const tc = leer(ev, totalEn, 'total_en')
  return bs === null || tc === null ? null : asentar(ev, bs / tc, 'total')
}

function tipoDeCambioDe(ev: Evaluacion, cambio: Cambio, bucket: string): Valor {
  const id = buscar(cambio.buckets, bucket, ev.m)
  if (id === undefined) throw sinValidar(`el bucket «${bucket}» no tiene tipo de cambio`, bucket)
  return leer(ev, id, bucket)
}

function exigirTipoDeCambio(
  ev: Evaluacion,
  id: string,
  donde: string,
  codigo: CodigoDeErrorDelMotor,
) {
  if (buscar(ev.nodos, id, ev.m)?.tipo !== 'tipo_cambio') {
    throw fallaDeCambio(
      codigo,
      `${donde} nombra «${id}», que no es un tipo de cambio de la fórmula`,
      donde,
    )
  }
}

const fallaDeCambio = (codigo: CodigoDeErrorDelMotor, detalle: string, donde: string) =>
  codigo === 'modo_invalido'
    ? new ErrorDelMotor(codigo, `El modo no corresponde a la fórmula: ${detalle}.`, donde)
    : sinValidar(detalle, donde)

const sumarDos = (a: Valor, b: Valor): Valor => (a === null || b === null ? null : a + b)
const porDos = (a: Valor, b: Valor): Valor => (a === null || b === null ? null : a * b)
