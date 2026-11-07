'use client'

import { useRouter } from 'next/navigation'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { Button } from '@/shared/ui/button'
import { MostrarTodos } from '@/shared/ui/mostrar-todos'
import { useRegional } from '@/shared/ui/regional'
import { useLecturaAPedido } from '@/shared/ui/use-lectura-a-pedido'
import { leerLoteDePapeleraDeCotizaciones } from '../../../areas/papelera/composicion.client'
import { puedeRestaurarElLote } from '../../../entities/papelera/acceso'
import { faltanPorMostrar, type LoteDeCotizaciones as Lote } from '../../../entities/papelera/lotes'
import { diasParaLaPurga, textoDePurga } from '../../../entities/papelera/purga'
import type { Objetivo } from '../hooks/use-papelera'
import { CotizacionEnPapelera } from './cotizacion-en-papelera'

type Props = {
  lote: Lote
  // El instante en que el servidor armó la página: contra él se cuentan los días.
  ahora: string
  // Restaura quien envió el lote o quien puede vaciar la papelera.
  puedePurgar: boolean
  nombresDeOrigenes: ReadonlyMap<string, string>
  enCurso: boolean
  alRestaurar: (objetivo: Objetivo) => void
}

const BOTON = 'h-11 md:h-8'

// Qué lote es: cuántas se enviaron y cuántas quedan.
function tituloDe(lote: Lote): string {
  const quedan = lote.enPapelera < lote.enviados ? ` · quedan ${String(lote.enPapelera)}` : ''
  return lote.enviados <= 1 ? 'Envío de una' : `Lote de ${String(lote.enviados)}${quedan}`
}

// Un lote de la papelera: quién lo envió, cuándo y cuánto falta para que se purgue solo; y sus cotizaciones, cada una con «Restaurar». «Restaurar el lote» aparece cuando
// tiene más de una. Se ven las primeras (`PRIMEROS_DEL_LOTE`) y «Mostrar los N» trae el lote entero; si la página se vuelve a leer (restaurar), vuelve a las primeras.
export function LoteDePapelera(props: Props) {
  const { ahora, puedePurgar, nombresDeOrigenes, enCurso, alRestaurar } = props
  const router = useRouter()
  const { lectura, pedir } = useLecturaAPedido(
    () => leerLoteDePapeleraDeCotizaciones(props.lote.id),
    props.lote.actualizadoEn,
  )
  const lote = lectura.estado === 'leido' ? lectura.dato : props.lote
  const { zonaHoraria } = useRegional()
  const quien = lote.esMio ? 'ti' : (lote.creadoPorNombre ?? 'alguien que ya no está')
  const puedeRestaurar = puedeRestaurarElLote(lote, puedePurgar)
  return (
    <li className="min-w-0">
      <section
        aria-label={`Lote enviado por ${quien}`}
        className="overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)"
      >
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-(--color-line) px-3 py-2">
          <div className="grid min-w-0 gap-0.5">
            <p className="text-(length:--text-sm) font-medium text-(--color-ink)">
              {tituloDe(lote)}
            </p>
            <p className="text-(length:--text-xs) text-(--color-ink-soft)">
              Enviado por {quien} el {formatearFechaHora(lote.creadoEn, { zona: zonaHoraria })} ·{' '}
              {textoDePurga(diasParaLaPurga(lote.purgaEl, ahora))}
            </p>
          </div>
          {puedeRestaurar && lote.enPapelera > 1 ? (
            <Button
              variant="outline"
              className={BOTON}
              disabled={enCurso}
              onClick={() => {
                alRestaurar({ lote })
              }}
            >
              Restaurar el lote
            </Button>
          ) : null}
        </header>
        <ul className="divide-y divide-(--color-line)">
          {lote.cotizaciones.map((cotizacion) => (
            <CotizacionEnPapelera
              key={cotizacion.id}
              cotizacion={cotizacion}
              nombreDelOrigen={
                cotizacion.origenId ? (nombresDeOrigenes.get(cotizacion.origenId) ?? null) : null
              }
              zonaHoraria={zonaHoraria}
              acciones={
                puedeRestaurar ? (
                  <Button
                    variant="outline"
                    className={BOTON}
                    disabled={enCurso}
                    aria-label={`Restaurar ${cotizacion.titulo}`}
                    onClick={() => {
                      alRestaurar({ lote, cotizacionId: cotizacion.id })
                    }}
                  >
                    Restaurar
                  </Button>
                ) : null
              }
            />
          ))}
        </ul>
        <MostrarTodos
          total={lote.enPapelera}
          faltan={faltanPorMostrar(lote)}
          lectura={lectura}
          alPedir={() => void pedir()}
          alRecargar={() => {
            router.refresh()
          }}
        />
      </section>
    </li>
  )
}
