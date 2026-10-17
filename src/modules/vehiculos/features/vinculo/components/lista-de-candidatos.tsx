'use client'

import { useId } from 'react'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Skeleton } from '@/shared/ui/skeleton'
import { TOPE_DE_CANDIDATOS, type CandidatoDeVinculo } from '../../../entities/vehiculos-del-lead'
import { Miniatura } from '../../listado/components/miniatura'
import type { Busqueda } from '../hooks/use-candidatos'

type Props = {
  texto: string
  alBuscar: (texto: string) => void
  busqueda: Busqueda
  alReintentar: () => void
  elegidoId: string | null
  alElegir: (id: string) => void
}

function EstadoDelCandidato({ candidato }: { candidato: CandidatoDeVinculo }) {
  return (
    <span className="flex flex-wrap gap-1">
      {candidato.vinculadoAqui ? <Badge>Vinculado a este lead</Badge> : null}
      {candidato.vinculadoAOtro ? <Badge variant="secondary">Vinculado a otro lead</Badge> : null}
      {candidato.interesado ? <Badge variant="secondary">Interesado</Badge> : null}
    </span>
  )
}

// Los vehículos encontrados, para elegir uno; con «Mostrando los primeros 20» si la búsqueda trajo más (cierre 1).
function Candidatos(props: {
  candidatos: readonly CandidatoDeVinculo[]
  hayMas: boolean
  elegidoId: string | null
  alElegir: (id: string) => void
}) {
  const { candidatos, hayMas, elegidoId, alElegir } = props
  return (
    <fieldset className="grid gap-1">
      <legend className="sr-only">Vehículos</legend>
      {candidatos.map((candidato) => (
        <label
          key={candidato.id}
          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-(--radius-md) px-2 py-1.5 hover:bg-(--color-surface-3) has-checked:bg-(--color-surface-3)"
        >
          <input
            type="radio"
            name="vehiculo"
            value={candidato.id}
            checked={elegidoId === candidato.id}
            onChange={() => {
              alElegir(candidato.id)
            }}
            className="size-4 accent-(--color-primario)"
          />
          <Miniatura ruta={candidato.portada} className="w-12" />
          <span className="grid min-w-0 gap-0.5">
            <span className="font-medium break-words">{candidato.titulo}</span>
            <span className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
              #{candidato.numero}
              {candidato.origenNombre ? ` · ${candidato.origenNombre}` : null}
            </span>
            <EstadoDelCandidato candidato={candidato} />
          </span>
        </label>
      ))}
      {hayMas ? (
        <AvisoDeTope
          texto={`Mostrando los primeros ${String(TOPE_DE_CANDIDATOS)}.`}
          camino="Escribe más para afinar la búsqueda."
        />
      ) : null}
    </fieldset>
  )
}

// La búsqueda y la lista de vehículos que quien mira ve (se elige uno). Sin texto, los más nuevos.
export function ListaDeCandidatos({
  texto,
  alBuscar,
  busqueda,
  alReintentar,
  elegidoId,
  alElegir,
}: Props) {
  const idBusqueda = useId()
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={idBusqueda}>Buscar por título, VIN, lote o número</Label>
        <Input
          id={idBusqueda}
          value={texto}
          autoComplete="off"
          className="h-11 md:h-9"
          onChange={(evento) => {
            alBuscar(evento.target.value)
          }}
        />
      </div>
      {busqueda.estado === 'cargando' ? (
        <div aria-hidden className="grid gap-2">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : busqueda.estado === 'error' ? (
        <div role="alert" className="grid gap-2 text-(length:--text-sm)">
          <p>No pudimos buscar los vehículos. {busqueda.error.mensaje}</p>
          <Button variant="outline" className="h-11 w-fit md:h-9" onClick={alReintentar}>
            Reintentar
          </Button>
        </div>
      ) : busqueda.candidatos.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {texto.trim()
            ? 'Ningún vehículo que puedas ver coincide con lo que escribiste.'
            : 'No ves ningún vehículo todavía.'}
        </p>
      ) : (
        <Candidatos
          candidatos={busqueda.candidatos}
          hayMas={busqueda.hayMas}
          elegidoId={elegidoId}
          alElegir={alElegir}
        />
      )}
    </div>
  )
}
