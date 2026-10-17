'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import type { NumerosDeLead } from '@/shared/lib/numeros-de-lead'
import { Bloque } from '@/shared/ui/bloque'
import { NumeroDeLead } from '@/shared/ui/numero-de-lead'
import { useRegional } from '@/shared/ui/regional'
import type { ReactNode } from 'react'
import { nombreDeLead, type Relaciones, type Vinculo } from '../../../entities/vinculo'

type Props = {
  relaciones: Relaciones
  // «Desvincular» (`<BotonDesvincular>`), si quien mira puede editar el vehículo: lo arma la página.
  desvincular?: ReactNode
}

const SUBTITULO = 'text-(length:--text-xs) font-medium text-(--color-ink-soft)'
const DETALLE = 'text-(length:--text-xs) text-(--color-ink-soft)'

// «Ana Quispe · N.º 1.234» (o «· Tu n.º 12»): el número que quien mira ve, y nada si no ve ninguno.
function Lead({ nombre, numeros }: { nombre: string; numeros: NumerosDeLead }) {
  const hayNumero = numeros.numero !== null || numeros.numeroPropio !== null
  return (
    <span className="font-medium text-(--color-ink)">
      {nombre}
      {hayNumero ? (
        <span className="font-normal text-(--color-ink-soft) tabular-nums">
          {' · '}
          <NumeroDeLead numeros={numeros} className="" />
        </span>
      ) : null}
    </span>
  )
}

function Periodo({ vinculo, zona }: { vinculo: Vinculo; zona: string }) {
  const desde = formatearFecha(vinculo.desde, { zona })
  const cuando = vinculo.hasta
    ? `Del ${desde} al ${formatearFecha(vinculo.hasta, { zona })}`
    : `Desde el ${desde}`
  return (
    <span className={DETALLE}>
      {cuando}
      {vinculo.porNombre ? ` · lo vinculó ${vinculo.porNombre}` : null}
    </span>
  )
}

// A qué lead está vinculado un vehículo (con su historial) y qué leads mostraron interés. Se vincula y
// se marca interés desde la ficha del lead; acá, quien edita el vehículo puede desvincularlo. El nombre
// de un lead aparece únicamente si quien mira lo ve.
export function VinculoEInteresados({ relaciones, desvincular = null }: Props) {
  const { zonaHoraria: zona } = useRegional()
  const { vinculo, historial, interesados } = relaciones
  return (
    <Bloque titulo="Vínculo e interesados">
      <div className="grid gap-4 text-(length:--text-sm)">
        <section aria-label="Vínculo" className="grid gap-1.5">
          <h3 className={SUBTITULO}>Vínculo</h3>
          {vinculo ? (
            <p className="grid gap-0.5">
              <Lead nombre={nombreDeLead(vinculo)} numeros={vinculo.leadNumeros} />
              <Periodo vinculo={vinculo} zona={zona} />
            </p>
          ) : null}
          {vinculo ? desvincular : null}
          {vinculo ? null : (
            <p className="text-(--color-ink-soft)">
              Sin vínculo: ningún lead es dueño ni comprador de este vehículo.
            </p>
          )}
          {historial.length > 0 ? (
            <ul aria-label="Vínculos anteriores" className="grid gap-1.5 pt-1">
              {historial.map((anterior) => (
                <li key={`${anterior.leadId}-${anterior.desde}`} className="grid gap-0.5">
                  <Lead nombre={nombreDeLead(anterior)} numeros={anterior.leadNumeros} />
                  <Periodo vinculo={anterior} zona={zona} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        <section aria-label="Interesados" className="grid gap-1.5">
          <h3 className={SUBTITULO}>Interesados</h3>
          {interesados.length === 0 ? (
            <p className="text-(--color-ink-soft)">
              Ninguno de los leads que ves mostró interés en este vehículo.
            </p>
          ) : (
            <ul className="grid gap-2">
              {interesados.map((interesado) => (
                <li key={interesado.leadId} className="grid gap-0.5">
                  <Lead nombre={interesado.leadNombre} numeros={interesado.leadNumeros} />
                  {interesado.nota ? <span>{interesado.nota}</span> : null}
                  <span className={DETALLE}>
                    {formatearFecha(interesado.creadoEn, { zona })}
                    {interesado.porNombre ? ` · lo marcó ${interesado.porNombre}` : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Bloque>
  )
}
