'use client'

import { ChevronDownIcon, CircleCheckIcon, CircleXIcon, TriangleAlertIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from 'cn'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import { resumenDeAvisos, type ResumenDeAvisos } from '../../../entities/revisar/avisos'
import { useAvisosDeRevisar } from '../hooks/use-avisos-de-revisar'
import { FalloDeRevisar } from './fallo-de-revisar'
import { ListaDeAvisos } from './lista-de-avisos'

const POR_RESUMEN: Record<ResumenDeAvisos['nivel'], { clases: string; Icono: typeof CircleXIcon }> =
  {
    error: { clases: 'bg-(--color-peligro-soft) text-(--color-peligro-ink)', Icono: CircleXIcon },
    aviso: { clases: 'bg-(--color-aviso-soft) text-(--color-aviso-ink)', Icono: TriangleAlertIcon },
    ok: {
      clases: 'bg-(--color-positivo-soft) text-(--color-positivo-ink)',
      Icono: CircleCheckIcon,
    },
  }

const NOMBRE = 'Revisar el flujo'
const CAJA = 'rounded-(--radius-md) px-3 py-2 text-(length:--text-sm)'

type Props = { flujo: FlujoParaConfigurar }

// La franja de «Revisar» sobre el selector (hueco `franjaDeRevisar`, 5.12): cerrada, el resumen; abierta, la lista por nivel. Nace cerrada siempre. Se relee
// tras cada guardado (la versión del flujo cambia) sin volver al esqueleto. Sólo avisa y abre: nunca impide guardar. Cambiar de flujo la vuelve a cerrar.
export function FranjaDeRevisar({ flujo }: Props) {
  return <Franja key={flujo.id} flujo={flujo} />
}

function Franja({ flujo }: Props) {
  const lectura = useAvisosDeRevisar(flujo)
  const [abierta, setAbierta] = useState(false)
  const idDeLaLista = useId()

  if (lectura.estado === 'leyendo') {
    return (
      <section
        aria-label={NOMBRE}
        aria-busy
        className={cn(CAJA, 'bg-(--color-surface-2) text-(--color-ink-soft)')}
      >
        Revisando el flujo…
      </section>
    )
  }
  if (lectura.estado === 'fallo') {
    return (
      <section
        aria-label={NOMBRE}
        className={cn(CAJA, 'bg-(--color-peligro-soft) text-(--color-peligro-ink)')}
      >
        <FalloDeRevisar alReintentar={lectura.reintentar} />
      </section>
    )
  }

  const resumen = resumenDeAvisos(lectura.avisos, lectura.hayMas)
  const { clases, Icono } = POR_RESUMEN[resumen.nivel]
  const hayFilas = lectura.avisos.length > 0
  const texto = (
    <>
      <Icono aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0">Revisar: {resumen.texto}</span>
    </>
  )
  return (
    <section
      aria-label={NOMBRE}
      aria-busy={lectura.releyendo || undefined}
      className={cn(CAJA, 'grid min-w-0 gap-2', clases)}
    >
      {hayFilas ? (
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={idDeLaLista}
          onClick={() => {
            setAbierta((a) => !a)
          }}
          className="flex min-w-0 items-center gap-2 text-left font-medium"
        >
          {texto}
          <ChevronDownIcon
            aria-hidden
            className={cn('ml-auto size-4 shrink-0 transition', abierta && 'rotate-180')}
          />
        </button>
      ) : (
        <p className="flex min-w-0 items-center gap-2 font-medium">{texto}</p>
      )}
      {lectura.error !== null ? <FalloDeRevisar alReintentar={lectura.reintentar} /> : null}
      {hayFilas ? (
        <ListaDeAvisos
          id={idDeLaLista}
          abierta={abierta}
          flujo={flujo}
          avisos={lectura.avisos}
          hayMas={lectura.hayMas}
        />
      ) : null}
    </section>
  )
}
