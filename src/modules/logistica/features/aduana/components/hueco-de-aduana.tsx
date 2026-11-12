'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { Badge } from '@/shared/ui/badge'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { textoDelCanal } from '../../../entities/aduana/declaracion'
import { vencimientoDe } from '../../../entities/aduana/estado'
import { CLAVE_DE_DECLARACION } from '../../../entities/aduana/paneles'
import type { Unidad } from '../../../entities/nucleo/unidad'
import type { AduanaDeLaUnidad } from '../../../areas/aduana/composicion.client'
import { useAduanaDeLaUnidad } from '../hooks/use-aduana-de-la-unidad'
import { useHoy } from '../hooks/use-hoy'
import { AtajoDeGastos } from './atajo-de-gastos'

// `Tributos pagados: sí|no`; nulo, el aviso de que no se puede decir desde acá (la unidad está más allá de las 200 que trae la declaración, D13).
function Tributos({ aduana }: { aduana: AduanaDeLaUnidad }) {
  if (aduana.tributo === null) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Abre la declaración para ver los tributos.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="text-(length:--text-sm)">
        Tributos pagados: <strong>{aduana.tributo ? 'sí' : 'no'}</strong>
      </p>
      {aduana.tributo ? null : <AtajoDeGastos />}
    </div>
  )
}

function Vigente({ aduana }: { aduana: AduanaDeLaUnidad }) {
  const hoy = useHoy()
  const vence = vencimientoDe(aduana.venceTributosEl, hoy, aduana.pagada)
  return (
    <div className="grid gap-3" data-hueco="aduana" data-estado="listo">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          href={`${RUTAS.aduana}?${CLAVE_DE_DECLARACION}=${aduana.declaracionId}` as Route}
          className="min-w-0 font-medium [overflow-wrap:anywhere] text-(--color-ink) underline-offset-2 hover:underline"
        >
          Declaración {aduana.numero}
        </Link>
        <Badge variant="secondary">{textoDelCanal(aduana.canal)}</Badge>
        {vence.tipo === 'vencida' ? (
          <Badge variant="destructive">{vence.texto}</Badge>
        ) : (
          <span className="text-(length:--text-sm) text-(--color-ink-soft)">{vence.texto}</span>
        )}
      </div>
      <Tributos aduana={aduana} />
    </div>
  )
}

// El hueco «Aduana» del panel de la unidad (6.09-1): la declaración vigente de la unidad con enlace a su resumen, su canal, el vencimiento de los tributos y «Tributos pagados: sí o no» con
// atajo al hueco de Gastos. Sin declaración, lo dice y lleva a la lista. Vuelve a leer cuando otro hueco avisa un cambio de la unidad.
export function HuecoDeAduana({ unidad }: { unidad: Unidad }) {
  const { lectura, reintentar } = useAduanaDeLaUnidad(unidad.id)
  if (lectura.tipo === 'cargando') {
    return (
      <div aria-busy="true" aria-label="Cargando la aduana" className="grid gap-2">
        <Skeleton className="h-6" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    )
  }
  if (lectura.tipo === 'error') {
    return (
      <div className="grid gap-2">
        <Aviso tono="peligro">
          <p>{lectura.error.mensaje}</p>
        </Aviso>
        <div>
          <Button variant="outline" onClick={reintentar}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }
  if (lectura.aduana === null) {
    return (
      <div className="grid gap-2" data-hueco="aduana" data-estado="vacio">
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Esta unidad no está en ninguna declaración.
        </p>
        <div>
          <Link
            href={RUTAS.aduana as Route}
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'min-h-11 md:min-h-7',
            })}
          >
            Ver declaraciones
          </Link>
        </div>
      </div>
    )
  }
  return <Vigente aduana={lectura.aduana} />
}
