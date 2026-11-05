'use client'

import { useRef } from 'react'
import { cn } from 'cn'
import { textoDelTope } from '@/shared/lib/conteo'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Monto } from '@/shared/ui/monto'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useRegional } from '@/shared/ui/regional'
import { useDesborde } from '@/shared/ui/use-desborde'
import {
  celdaDeTabla,
  columnasDeLaTabla,
  type ColumnaDeTabla,
  type TablaDeAyuda,
} from '../../../entities/tabla-de-ayuda'

type Props = {
  tabla: TablaDeAyuda
  // Si la celda que abre la ayuda es dinero (P13): sus cifras pasan por `<Monto>` con la moneda de la celda (nula, la de la empresa) y el Modo Live las tapa. Nulo, a la vista.
  dinero: { moneda: string | undefined } | null
}

const esCifra = (columna: ColumnaDeTabla) => columna.tipo === 'numero'

// La tabla de referencia de una ayuda, de sólo lectura: un encabezado por columna (fijo arriba al desplazar), las filas en el orden que llegan. El texto se parte y una cifra no;
// lo que aún no entra se desplaza de costado dentro de su propio contenedor, nunca la página. Si la lectura llegó a su tope, lo dice al pie.
export function TablaDeLaAyuda({ tabla, dinero }: Props) {
  const { locale } = useRegional()
  const contenedor = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(contenedor)
  const columnas = columnasDeLaTabla(tabla)
  return (
    <div className="grid min-w-0 gap-3">
      <div className="relative min-w-0">
        <div
          ref={contenedor}
          role="region"
          aria-label={`Tabla ${tabla.nombre}`}
          tabIndex={0}
          className="max-h-[60dvh] min-w-0 overflow-auto rounded-md border border-(--color-line)"
        >
          <table className="w-full border-collapse text-(length:--text-sm) text-(--color-ink)">
            <thead>
              <tr>
                {columnas.map((columna) => (
                  <th
                    key={columna.clave}
                    scope="col"
                    className={cn(
                      'sticky top-0 border-b border-(--color-line) bg-(--color-surface) px-3 py-2 font-medium wrap-anywhere',
                      esCifra(columna) ? 'text-right' : 'text-left',
                    )}
                  >
                    {columna.etiqueta}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tabla.filas.map((fila, i) => (
                <tr key={i} className="border-b border-(--color-line) last:border-b-0">
                  {columnas.map((columna) => {
                    const celda = celdaDeTabla(fila[columna.clave], columna.tipo, locale)
                    return (
                      <td
                        key={columna.clave}
                        className={cn(
                          'px-3 py-2 align-top',
                          celda.tipo === 'cifra'
                            ? 'text-right whitespace-nowrap tabular-nums'
                            : 'wrap-anywhere',
                        )}
                      >
                        {celda.tipo === 'cifra' && dinero !== null ? (
                          <Monto valor={celda.valor} moneda={dinero.moneda} />
                        ) : (
                          celda.texto
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PistaDeDesborde {...desborde} />
      </div>
      {tabla.hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(tabla.filas.length, { articulo: 'las', orden: 'primeras filas' })}
        />
      ) : null}
    </div>
  )
}
