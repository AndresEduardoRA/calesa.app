'use client'

import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import type { UnidadBuscada } from '../../../areas/aduana/composicion.client'
import type { DeclaracionLeida } from '../../../entities/aduana/declaracion'
import { useVehiculosDeLaDeclaracion } from '../hooks/use-vehiculos-de-la-declaracion'
import { BuscadorDeUnidadesDiferido } from './diferidos'

type Composicion = ReturnType<typeof useVehiculosDeLaDeclaracion>

const FILA =
  'flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-(--radius-card) border border-(--color-line) px-3 py-2'

function FilaDeVehiculo({
  vehiculo,
  fija,
  seQuita,
  composicion: c,
}: {
  vehiculo: DeclaracionLeida['vehiculos'][number]
  fija: boolean
  seQuita: boolean
  composicion: Composicion
}) {
  return (
    <li className={FILA}>
      <span className="min-w-0 font-medium [overflow-wrap:anywhere] text-(--color-ink)">
        {vehiculo.titulo}
      </span>
      <span className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)">
        {vehiculo.fase ? <span>{vehiculo.fase}</span> : null}
        {seQuita ? (
          <Badge variant="outline">Se quitará</Badge>
        ) : (
          <Badge variant={vehiculo.tributo ? 'secondary' : 'outline'}>
            {vehiculo.tributo ? 'Tiene el tributo' : 'Falta el tributo'}
          </Badge>
        )}
        <Button
          variant="ghost"
          className="h-11 md:h-9"
          disabled={fija || c.enCurso}
          aria-label={`${seQuita ? 'Deshacer el quitado de' : 'Quitar'} ${vehiculo.titulo}`}
          onClick={() => {
            if (seQuita) {
              c.deshacerQuitar(vehiculo.vehiculoId)
            } else {
              c.marcarParaQuitar(vehiculo.vehiculoId)
            }
          }}
        >
          {seQuita ? 'Deshacer' : 'Quitar'}
        </Button>
      </span>
    </li>
  )
}

function FilaPorAgregar({
  unidad,
  composicion: c,
}: {
  unidad: UnidadBuscada
  composicion: Composicion
}) {
  return (
    <li className={FILA}>
      <span className="min-w-0 font-medium [overflow-wrap:anywhere] text-(--color-ink)">
        {unidad.titulo}
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Por agregar</Badge>
        <Button
          variant="ghost"
          className="h-11 md:h-9"
          disabled={c.enCurso}
          aria-label={`No agregar ${unidad.titulo}`}
          onClick={() => {
            c.noSumar(unidad.id)
          }}
        >
          No agregar
        </Button>
      </span>
    </li>
  )
}

function AvisosDeLaLista({ declaracion }: { declaracion: DeclaracionLeida }) {
  return (
    <>
      {declaracion.hayMas ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Hay más vehículos de los que se muestran.
        </p>
      ) : null}
      {declaracion.hayOcultos && declaracion.vehiculos.length > 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">Hay vehículos que no ves.</p>
      ) : null}
    </>
  )
}

// Los vehículos de la declaración con lo que se puede cambiar (sólo con `logistica.aduana.gestionar`; la base lo vuelve a exigir): «Quitar» marca (se deshace antes de guardar), el
// buscador suma, y «Guardar vehículos» manda todo junto. Con canal asignado todo queda apagado: la composición quedó fija (D5).
export function VehiculosDeLaDeclaracion({ declaracion }: { declaracion: DeclaracionLeida }) {
  const c = useVehiculosDeLaDeclaracion(declaracion)
  const fija = declaracion.canal !== null
  const yaEstan = new Set([
    ...declaracion.vehiculos.map((v) => v.vehiculoId),
    ...c.agregar.map((u) => u.id),
  ])
  return (
    <section aria-labelledby="vehiculos-de-la-declaracion" className="grid min-w-0 gap-2">
      <h3
        id="vehiculos-de-la-declaracion"
        className="text-(length:--text-base) font-medium text-(--color-ink)"
      >
        Vehículos de la declaración
      </h3>
      {fija ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          La composición quedó fija al asignar el canal.
        </p>
      ) : null}
      {declaracion.vehiculos.length === 0 && c.agregar.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {declaracion.hayOcultos ? 'No ves ninguno de sus vehículos.' : 'Sin vehículos.'}
        </p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {declaracion.vehiculos.map((vehiculo) => (
            <FilaDeVehiculo
              key={vehiculo.vehiculoId}
              vehiculo={vehiculo}
              fija={fija}
              seQuita={c.quitar.includes(vehiculo.vehiculoId)}
              composicion={c}
            />
          ))}
          {c.agregar.map((unidad) => (
            <FilaPorAgregar key={unidad.id} unidad={unidad} composicion={c} />
          ))}
        </ul>
      )}
      <AvisosDeLaLista declaracion={declaracion} />
      {fija ? null : <BuscadorDeUnidadesDiferido yaEstan={yaEstan} alAgregar={c.sumar} />}
      {c.conflicto ? (
        <AvisoDeConflicto
          mensaje={c.conflicto}
          alRecargar={c.recargar}
          detalle="No se guardó nada. Recargar trae su estado y conserva lo que elegiste."
        />
      ) : null}
      {c.aviso ? (
        <Aviso tono="peligro">
          <p>{c.aviso}</p>
        </Aviso>
      ) : null}
      {fija ? null : (
        <div className="flex justify-end">
          <Button
            className="h-11 md:h-9"
            disabled={!c.hayCambios || c.enCurso || c.conflicto !== null}
            onClick={() => void c.enviar()}
          >
            {c.enCurso ? 'Guardando…' : 'Guardar vehículos'}
          </Button>
        </div>
      )}
    </section>
  )
}
