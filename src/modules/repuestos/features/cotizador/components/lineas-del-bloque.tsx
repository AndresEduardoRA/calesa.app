'use client'

import { formatearNumero } from '@/shared/lib/formato'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { FaltaEnLaHoja, LineaDeLectura } from '../../../entities/cotizador/hoja-de-lectura'

type Props = { id: string; titulo: string; lineas: readonly LineaDeLectura[]; moneda: string }

// La usa también la hoja editable (8.12-4).
export const MOTIVO: Readonly<Record<Exclude<FaltaEnLaHoja, 'desconocida'>, string>> = {
  costo: 'Falta el costo',
  logistica: 'Falta la logística',
  caja: 'Falta la caja',
  no_cabe: 'No cabe',
}

function MontoONada({ valor, moneda }: { valor: string | null; moneda: string }) {
  return valor === null ? <span>—</span> : <Monto valor={Number(valor)} moneda={moneda} />
}

function Dato({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-(length:--text-xs) text-(--color-ink-faint)">{nombre}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

function TotalDeLaLinea({ linea, moneda }: { linea: LineaDeLectura; moneda: string }) {
  if (linea.total !== null) return <Monto valor={Number(linea.total)} moneda={moneda} />
  const motivo = linea.falta && linea.falta !== 'desconocida' ? MOTIVO[linea.falta] : null
  return <span className="text-(--color-ink-soft)">Sin total{motivo ? ` · ${motivo}` : ''}</span>
}

// Un bloque de la hoja en sólo lectura (8.12-3, C13): una lista, no una tabla (cada línea es una tarjeta que se apila en el celular). Cada monto es el que
// guardó la base (D36), con `<Monto>` o «—» si es nulo; la logística sugerida lo dice; una caja 0 es «Sin caja».
export function LineasDelBloque({ id, titulo, lineas, moneda }: Props) {
  const { locale } = useRegional()
  return (
    <section aria-labelledby={id} className="grid gap-2">
      <h2 id={id} className="text-(length:--text-lg) font-semibold">
        {titulo}
      </h2>
      {lineas.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Sin líneas en este bloque.
        </p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2" aria-label={`Líneas de ${titulo}`}>
          {lineas.map((l) => (
            <li
              key={l.id}
              className="grid min-w-0 gap-2 rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
            >
              <p className="min-w-0 font-medium break-words">{l.descripcion}</p>
              <dl className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-x-4 gap-y-2 text-(length:--text-sm)">
                <Dato nombre="Cantidad">
                  {formatearNumero(l.cantidad, { locale, decimales: 0 })}
                </Dato>
                <Dato nombre="Costo">
                  <MontoONada valor={l.costo} moneda={moneda} />
                </Dato>
                <Dato nombre="Logística">
                  <MontoONada valor={l.logistica} moneda={moneda} />
                  {l.esSugerida ? (
                    <span className="text-(--color-ink-faint)"> · sugerida</span>
                  ) : null}
                </Dato>
                <Dato nombre="Caja">
                  {l.caja !== null && Number(l.caja) === 0 ? (
                    <span>Sin caja</span>
                  ) : (
                    <MontoONada valor={l.caja} moneda={moneda} />
                  )}
                </Dato>
                <Dato nombre="Total">
                  <TotalDeLaLinea linea={l} moneda={moneda} />
                </Dato>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
