'use client'

import { useState } from 'react'
import { textoDelBoton, type DestinoDeMover } from '@/modules/flujos/client'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useCambiosSinGuardar } from '@/shared/ui/cambios-del-panel'
import { Skeleton } from '@/shared/ui/skeleton'
import { useDestinosDelLote } from '../hooks/use-destinos-del-lote'
import { useLote, type UnidadDelLote } from '../hooks/use-lote'
import { resumenDeLaVista, type FaseDelLote } from '../lote/vista-del-lote'
import { FormularioDelLote } from './formulario-del-lote'
import { ListaDelLote } from './lista-del-lote'
import { ResultadoDelLote } from './resultado-del-lote'

type Props = {
  origenId: string
  fase: FaseDelLote
  unidades: readonly UnidadDelLote[]
  // El `destino` de la URL, si venía; sólo vale si es una de las salidas de la fase.
  destinoInicial: string | null
  // Algo que decir antes de la lista («Se eligieron 7 de 8; …»).
  frase?: string | null
  alHaberResultado: () => void
  alCerrar: () => void
}

function Cargando({ etiqueta }: { etiqueta: string }) {
  return (
    <div aria-busy="true" aria-label={etiqueta} className="grid gap-2">
      <Skeleton className="h-9" />
      <Skeleton className="h-9" />
      <Skeleton className="h-9" />
    </div>
  )
}

function ConError({ mensaje, alReintentar }: { mensaje: string; alReintentar: () => void }) {
  return (
    <div className="grid gap-3">
      <Aviso tono="peligro">
        <p>{mensaje}</p>
      </Aviso>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        onClick={alReintentar}
      >
        Reintentar
      </Button>
    </div>
  )
}

function ElegirElDestino({
  destinos,
  alElegir,
}: {
  destinos: readonly DestinoDeMover[]
  alElegir: (id: string) => void
}) {
  return (
    <div className="grid gap-2">
      <p className="text-(length:--text-sm) font-medium text-(--color-ink)">Elige a dónde mover.</p>
      {destinos.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Desde esta fase no hay a dónde mover.
        </p>
      ) : (
        destinos.map((destino) => (
          <Button
            key={destino.faseId}
            type="button"
            variant="outline"
            className="min-h-11 justify-start md:min-h-9"
            onClick={() => {
              alElegir(destino.faseId)
            }}
          >
            {textoDelBoton(destino, false)}
          </Button>
        ))
      )}
    </div>
  )
}

type Lote = ReturnType<typeof useLote>

// La vista previa de cada unidad y, debajo, la nota y el botón. Mientras se revisa, un esqueleto; si falla, el motivo con «Reintentar».
function VistaYFormulario({ lote, fase }: { lote: Lote; fase: FaseDelLote }) {
  const { lectura } = lote
  if (lectura.tipo === 'cargando') return <Cargando etiqueta="Revisando las unidades" />
  if (lectura.tipo === 'error') {
    return <ConError mensaje={lectura.error.mensaje} alReintentar={lote.releer} />
  }
  if (lectura.tipo !== 'listo') return null
  return (
    <>
      <p role="status" className="text-(length:--text-sm) font-medium text-(--color-ink)">
        {resumenDeLaVista(lote.vistas, fase.id)}
      </p>
      <ListaDelLote vistas={lote.vistas} nombres={lote.nombres} fase={fase} />
      <FormularioDelLote
        nota={lote.nota}
        pideNota={lote.pideNota}
        escribirNota={lote.escribirNota}
        cuantas={lote.pueden.length}
        motivo={lote.motivo}
        enCurso={lote.enCurso}
        fallo={lote.fallo}
        alEnviar={() => {
          void lote.enviar()
        }}
      />
    </>
  )
}

// Con un destino elegido: el resultado si ya se movió, o la vista previa con su formulario; y «Elegir otro destino».
function ConDestino({
  lote,
  fase,
  alCambiarDestino,
  alCerrar,
}: {
  lote: Lote
  fase: FaseDelLote
  alCambiarDestino: () => void
  alCerrar: () => void
}) {
  if (lote.resultado) {
    return (
      <ResultadoDelLote
        resumen={lote.resultado}
        alReintentar={lote.reintentar}
        alCerrar={alCerrar}
      />
    )
  }
  return (
    <>
      <VistaYFormulario lote={lote} fase={fase} />
      <Button
        type="button"
        variant="ghost"
        className="min-h-11 justify-self-start md:min-h-9"
        disabled={lote.enCurso}
        onClick={alCambiarDestino}
      >
        Elegir otro destino
      </Button>
    </>
  )
}

// Mientras no hay destino elegido: el esqueleto de la lectura, su error con «Reintentar» o la lista de salidas para elegir.
function PasoDelDestino({
  destinos,
  elegido,
  alElegir,
}: {
  destinos: ReturnType<typeof useDestinosDelLote>
  elegido: boolean
  alElegir: (id: string) => void
}) {
  const { lectura } = destinos
  if (lectura.tipo === 'cargando') return <Cargando etiqueta="Cargando los destinos" />
  if (lectura.tipo === 'error') {
    return <ConError mensaje={lectura.error.mensaje} alReintentar={destinos.reintentar} />
  }
  return elegido ? null : <ElegirElDestino destinos={lectura.destinos} alElegir={alElegir} />
}

// Lo de adentro del drawer del lote (6.04-3): a dónde mover (las salidas de la fase, una sola lectura), la vista previa por unidad, la nota común y el botón «Mover los N que pueden». Se
// monta al abrir el drawer, así nada de una apertura se arrastra a la siguiente. Con el resultado a la vista, «Reintentar» vuelve a la vista previa con las que fallaron.
export function CuerpoDelLote({
  origenId,
  fase,
  unidades,
  destinoInicial,
  frase = null,
  alHaberResultado,
  alCerrar,
}: Props) {
  const [snapshot] = useState(unidades)
  const [destinoId, setDestinoId] = useState<string | null>(destinoInicial)
  const destinos = useDestinosDelLote(origenId, fase.id)
  const lista = destinos.lectura.tipo === 'listo' ? destinos.lectura.destinos : []
  const destino = lista.find((d) => d.faseId === destinoId) ?? null
  const lote = useLote({
    origenId,
    fase,
    unidades: snapshot,
    destinoId: destino?.faseId ?? null,
    alHaberResultado,
  })
  useCambiosSinGuardar(lote.nota.trim() !== '' && lote.resultado === null, undefined, {
    preguntaAlCerrar: true,
  })
  return (
    <div className="grid gap-4" data-lote>
      {frase ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{frase}</p> : null}
      <p className="text-(length:--text-sm) text-(--color-ink)">
        {`${String(snapshot.length)} ${snapshot.length === 1 ? 'unidad' : 'unidades'} en «${fase.nombre}»`}
        {destino ? (
          <>
            {' → '}
            <strong>{destino.nombre}</strong>
          </>
        ) : null}
      </p>
      <PasoDelDestino destinos={destinos} elegido={destino !== null} alElegir={setDestinoId} />
      {destino ? (
        <ConDestino
          lote={lote}
          fase={fase}
          alCambiarDestino={() => {
            setDestinoId(null)
          }}
          alCerrar={alCerrar}
        />
      ) : null}
    </div>
  )
}
