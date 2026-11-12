'use client'

import { useId } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Skeleton } from '@/shared/ui/skeleton'
import type { UnidadBuscada } from '../../../areas/aduana/composicion.client'
import { useBuscarUnidades } from '../hooks/use-buscar-unidades'

type Props = {
  // Las que ya están en la declaración o ya se eligieron: no se ofrecen otra vez.
  yaEstan: ReadonlySet<string>
  alAgregar: (unidad: UnidadBuscada) => void
}

function Resultados({
  unidades,
  hayMas,
  yaEstan,
  alAgregar,
}: Props & { unidades: readonly UnidadBuscada[]; hayMas: boolean }) {
  if (unidades.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Ninguno de tus vehículos coincide.
      </p>
    )
  }
  return (
    <div className="grid gap-2">
      <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {unidades.map((unidad) => (
          <li
            key={unidad.id}
            className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-(--radius-card) border border-(--color-line) px-3 py-2"
          >
            <span className="grid min-w-0 gap-0.5">
              <span className="font-medium [overflow-wrap:anywhere] text-(--color-ink)">
                {unidad.titulo}
              </span>
              <span className="text-(length:--text-xs) [overflow-wrap:anywhere] text-(--color-ink-soft)">
                {[unidad.vin, unidad.lote ? `Lote ${unidad.lote}` : null, unidad.fase]
                  .filter((parte) => parte !== null)
                  .join(' · ')}
              </span>
            </span>
            {yaEstan.has(unidad.id) ? (
              <Badge variant="outline">Ya está</Badge>
            ) : (
              <Button
                variant="outline"
                className="h-11 md:h-9"
                aria-label={`Agregar ${unidad.titulo}`}
                onClick={() => {
                  alAgregar(unidad)
                }}
              >
                Agregar
              </Button>
            )}
          </li>
        ))}
      </ul>
      {hayMas ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Hay más: escribe más para afinar.
        </p>
      ) : null}
    </div>
  )
}

// Buscar un vehículo por título, VIN o lote para sumarlo a la declaración (D4): mínimo 3 letras o números, hasta 10 resultados entre los que ves. Se busca al enviar (Enter o «Buscar»).
export function BuscadorDeUnidades({ yaEstan, alAgregar }: Props) {
  const idCampo = useId()
  const b = useBuscarUnidades()
  return (
    <div className="grid gap-2">
      <form
        role="search"
        className="grid gap-1.5"
        onSubmit={(evento) => {
          evento.preventDefault()
          void b.buscar()
        }}
      >
        <Label htmlFor={idCampo}>Buscar un vehículo para agregar</Label>
        <div className="flex gap-2">
          <Input
            id={idCampo}
            type="search"
            autoComplete="off"
            placeholder="Título, VIN o lote"
            className="h-11 min-w-0 flex-1 md:h-9"
            value={b.texto}
            aria-invalid={b.aviso ? true : undefined}
            onChange={(evento) => {
              b.escribir(evento.target.value)
            }}
          />
          <Button type="submit" variant="outline" className="h-11 md:h-9">
            Buscar
          </Button>
        </div>
        {b.aviso ? (
          <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{b.aviso}</p>
        ) : null}
      </form>
      {b.busqueda.tipo === 'cargando' ? (
        <div aria-busy="true" aria-label="Buscando" className="grid gap-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : null}
      {b.busqueda.tipo === 'error' ? (
        <Aviso tono="peligro">
          <p>{b.busqueda.error.mensaje}</p>
        </Aviso>
      ) : null}
      {b.busqueda.tipo === 'listo' ? (
        <Resultados
          unidades={b.busqueda.resultado.unidades}
          hayMas={b.busqueda.resultado.hayMas}
          yaEstan={yaEstan}
          alAgregar={alAgregar}
        />
      ) : null}
    </div>
  )
}
