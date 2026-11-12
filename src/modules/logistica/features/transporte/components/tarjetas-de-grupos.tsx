'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { AbrirResumen, TarjetaDeLista } from '@/shared/ui/lista'
import { useRegional } from '@/shared/ui/regional'
import { textosDelGrupo, type GrupoDeTransporte } from '../../../entities/transporte/grupos'
import type { PropsDeLaFila } from './tipos-de-la-lista'
import { ValorDelGrupo } from './valor-del-grupo'

type Props = PropsDeLaFila & { grupos: readonly GrupoDeTransporte[] }

function Dato({ etiqueta, texto }: { etiqueta: string; texto: string | null }) {
  return (
    <div className="flex min-w-0 gap-1">
      <dt className="text-(--color-ink-soft)">{etiqueta}</dt>
      <dd className="[overflow-wrap:anywhere]">
        <ValorDelGrupo texto={texto} />
      </dd>
    </div>
  )
}

// Los grupos de la página en el celular: una tarjeta por grupo, con lo mismo que la fila de la tabla. Un toque abre el resumen.
export function TarjetasDeGrupos({ grupos, vista, catalogos, alAbrir, abierto }: Props) {
  const { zonaHoraria } = useRegional()
  const fecha = (iso: string) => formatearFecha(iso, { zona: zonaHoraria })
  const que = vista === 'contenedores' ? 'el contenedor' : 'el embarque'
  return (
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {grupos.map((grupo) => {
        const t = textosDelGrupo(grupo, catalogos, fecha)
        return (
          <TarjetaDeLista
            key={grupo.clave}
            abierta={abierto === grupo.clave}
            alAbrir={() => {
              alAbrir(grupo.clave)
            }}
          >
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <AbrirResumen
                nombre={`${que} ${grupo.clave}`}
                className="min-w-0 font-medium break-words text-(--color-ink)"
              >
                {grupo.clave}
              </AbrirResumen>
              <span className="text-(length:--text-sm) text-(--color-ink-soft)">{t.unidades}</span>
            </div>
            <dl className="grid gap-0.5 text-(length:--text-sm)">
              <Dato etiqueta="Naviera" texto={t.naviera} />
              <Dato etiqueta="Ruta" texto={t.ruta} />
              <Dato etiqueta="Zarpe" texto={t.zarpe} />
              <Dato etiqueta="ETA" texto={t.eta} />
              <Dato etiqueta="Arribo" texto={t.arribo} />
            </dl>
            {grupo.hayOcultas ? (
              <p className="text-(length:--text-xs) text-(--color-ink-soft)">
                Hay unidades que no ves.
              </p>
            ) : null}
          </TarjetaDeLista>
        )
      })}
    </ul>
  )
}
