'use client'

import { Monto } from '@/shared/ui/monto'
import type { CampoDeVehiculo } from '../../../entities/campo'
import type { TarjetaPublica } from '../../../entities/vitrina'
import { Miniatura } from '../../listado/components/miniatura'
import { ValorDeCampo } from '../../listado/components/valor-de-campo'

type Props = {
  // Lo que respondió la base: la fila que tiene (o tendría) el vehículo en la web.
  tarjeta: TarjetaPublica
  // Lo que la persona está escribiendo, todavía sin guardar: se ve al instante.
  precio: { precio: number | null; precioHasta: number | null; nota: string | null }
  destacado: boolean
  // El layout del origen: de ahí sale la etiqueta de cada campo público.
  campos: readonly CampoDeVehiculo[]
}

function PrecioPublico({ precio, precioHasta, nota }: Props['precio']) {
  return (
    <div className="grid gap-0.5">
      <p className="text-(length:--text-lg) font-semibold text-(--color-ink)">
        {precio === null ? (
          'Consultar'
        ) : (
          <>
            <Monto valor={precio} />
            {precioHasta === null ? null : (
              <>
                {' – '}
                <Monto valor={precioHasta} />
              </>
            )}
          </>
        )}
      </p>
      {nota ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{nota}</p> : null}
    </div>
  )
}

// «Así lo verá el visitante»: la tarjeta pública de un vehículo, con lo único que sale a la web.
// La portada, la identidad, el precio público y los campos que el origen marcó como públicos.
export function VistaPreviaDeVitrina({ tarjeta, precio, destacado, campos }: Props) {
  const publicos = campos.filter((campo) => campo.clave in tarjeta.atributos)
  const subtitulo = [tarjeta.marca, tarjeta.modelo, tarjeta.anio].filter(Boolean).join(' · ')
  return (
    <section aria-label="Así lo verá el visitante" className="grid gap-2">
      <h3 className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Así lo verá el visitante
      </h3>
      <article className="overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)">
        <Miniatura ruta={tarjeta.miniatura} className="w-full rounded-none" />
        <div className="grid gap-3 p-3">
          <div className="grid gap-0.5">
            {destacado ? (
              <span className="w-fit rounded-(--radius-pill) bg-(--color-info-soft) px-2 text-(length:--text-xs) font-medium text-(--color-info-ink)">
                Destacado
              </span>
            ) : null}
            <p className="text-(length:--text-base) font-medium text-(--color-ink)">
              {tarjeta.titulo}
            </p>
            {subtitulo ? (
              <p className="text-(length:--text-sm) text-(--color-ink-soft)">{subtitulo}</p>
            ) : null}
            {tarjeta.categoria ? (
              <p className="text-(length:--text-sm) text-(--color-ink-soft)">{tarjeta.categoria}</p>
            ) : null}
          </div>
          <PrecioPublico {...precio} />
          {publicos.length > 0 ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-(--color-line) pt-3">
              {publicos.map((campo) => (
                <div key={campo.clave} className="grid min-w-0">
                  <dt className="truncate text-(length:--text-xs) text-(--color-ink-soft)">
                    {campo.etiqueta}
                  </dt>
                  <dd className="truncate text-(length:--text-sm) text-(--color-ink)">
                    <ValorDeCampo campo={campo} valor={tarjeta.atributos[campo.clave]} />
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </article>
      <p className="text-(length:--text-xs) text-(--color-ink-faint)">
        El visitante ve sólo esto. El resto de la ficha, las demás fotos y el VIN no se publican.
        {tarjeta.miniatura ? '' : ' Todavía no tiene una foto de portada.'}
      </p>
    </section>
  )
}
