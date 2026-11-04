'use client'

import { Fragment } from 'react'
import { fechaRelativa } from '@/shared/lib/fechas'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import { cambiosDeLaRevision } from '../../../entities/cambios-de-la-revision'
import { autorDeLaRevision, type RevisionDeLaCotizacion } from '../../../entities/revisiones'

type Props = {
  revision: RevisionDeLaCotizacion
  // Las etiquetas de los nodos que nombran los diffs leídos: sin etiqueta, el id.
  etiquetas: ReadonlyMap<string, string>
}

// Una revisión: quién y cuándo, qué cambió (las primeras tres cosas y «y N más») y, si el nivel de quien mira lo deja ver, el total antes y después.
export function Revision({ revision, etiquetas }: Props) {
  const { zonaHoraria } = useRegional()
  const cambios = cambiosDeLaRevision(revision.diff, etiquetas)
  return (
    <li className="grid min-w-0 gap-1 rounded-(--radius-md) border border-(--color-border) p-3 text-(length:--text-sm)">
      <p className="font-medium [overflow-wrap:anywhere] text-(--color-ink)">
        {autorDeLaRevision(revision)} · {fechaRelativa(revision.creadoEn, { zona: zonaHoraria })}
      </p>
      {cambios.sinCambios ? (
        <p className="text-(--color-ink-soft)">Sin cambios que puedas ver.</p>
      ) : (
        <>
          {cambios.vistos.length === 0 ? null : (
            <p className="[overflow-wrap:anywhere] text-(--color-ink-soft)">
              {cambios.vistos.map((texto, i) => (
                <Fragment key={texto}>
                  {i === 0 ? null : ' · '}
                  <span>{texto}</span>
                </Fragment>
              ))}
              {cambios.masN > 0 ? (
                <>
                  {' · '}
                  <span>y {cambios.masN} más</span>
                </>
              ) : null}
            </p>
          )}
          {cambios.total === null ? null : (
            <p className="text-(--color-ink)">
              Total: <Monto valor={cambios.total.de} moneda="USD" /> →{' '}
              <Monto valor={cambios.total.a} moneda="USD" />
            </p>
          )}
        </>
      )}
    </li>
  )
}
