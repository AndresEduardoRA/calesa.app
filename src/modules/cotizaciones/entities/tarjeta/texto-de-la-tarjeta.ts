import { formatearMonto } from '@/shared/lib/formato'
import type { GrupoDeTarjeta, ModeloDeTarjeta } from './modelo-de-la-tarjeta'

// La tarjeta de una cotización como texto (4.18-3b, C1): lo que copia «Copiar texto» para pegarlo en un chat. Dice lo mismo que el PDF y en su orden
// (`infra/tarjeta/pdf/documento-de-la-tarjeta.tsx`), del mismo modelo: el encabezado, cada grupo, el total y la nota, una cosa por línea y los bloques separados por una
// línea en blanco. Los montos son los de `formatearMonto()` (el texto de `<Monto>` y del PDF), siempre con cifras aunque Live esté encendido (P7 del 4.18-3), y «—» sin valor.

const SIN_DATO = '—'

const enUsd = (valor: number | null, locale: string) =>
  valor === null ? SIN_DATO : formatearMonto(valor, { moneda: 'USD', locale })

function encabezado(modelo: ModeloDeTarjeta): string[] {
  const e = modelo.encabezado
  const fecha = [
    e.fecha,
    e.numero === null ? null : `Cotización n.º ${String(e.numero)}`,
    e.vencida ? 'Vencida' : null,
  ]
    .filter((t) => t !== null)
    .join(' · ')
  return [
    e.titulo,
    fecha,
    e.asesor === null ? null : `Asesor: ${e.asesor}`,
    modelo.vehiculo,
  ].filter((t) => t !== null)
}

function grupo(g: GrupoDeTarjeta, locale: string): string[] {
  const columnas = [
    g.tipoDeCambio === null ? null : `Tipo de cambio: ${g.tipoDeCambio.valor ?? SIN_DATO}`,
    g.plazo === null ? null : `Plazo: ${g.plazo.valor ?? SIN_DATO}`,
  ].filter((t) => t !== null)
  return [
    g.etiqueta,
    ...(columnas.length === 0 ? [] : [columnas.join(' · ')]),
    ...g.filas.flatMap((f) => [
      `${f.etiqueta}: ${enUsd(f.usd, locale)}`,
      ...(f.leyenda === null ? [] : [f.leyenda]),
    ]),
  ]
}

function total(modelo: ModeloDeTarjeta, locale: string): string[] {
  const t = modelo.total
  return [
    `${t.etiqueta}: ${enUsd(t.usd, locale)}`,
    ...(t.leyenda === null ? [] : [t.leyenda]),
    ...(t.bs === null ? [] : [formatearMonto(t.bs.valor, { moneda: t.bs.moneda, locale })]),
    ...modelo.aparte.map((a) => `${a.etiqueta}: ${enUsd(a.usd, locale)}`),
  ]
}

// Sin espacios a los lados; los de adentro quedan (el monto separa la moneda con un espacio duro).
const limpia = (linea: string) => linea.trim()

export function textoDeLaTarjeta(modelo: ModeloDeTarjeta, { locale }: { locale: string }): string {
  const bloques = [
    encabezado(modelo),
    ...modelo.grupos.map((g) => grupo(g, locale)),
    total(modelo, locale),
    modelo.nota === null ? [] : modelo.nota.split('\n'),
  ]
    .map((lineas) => lineas.map(limpia).filter((l) => l !== ''))
    .filter((lineas) => lineas.length > 0)
  return bloques.map((lineas) => lineas.join('\n')).join('\n\n')
}
