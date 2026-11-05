'use client'

import { useAction } from 'next-safe-action/hooks'
import { useId, useState } from 'react'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoError } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import { avisarError } from '@/shared/ui/toasts'
import {
  marcadaDe,
  opcionesADibujar,
  TOPE_DE_OPCIONES,
  type DatoParaElegir,
  type LectorDeOpciones,
} from '../../../entities/dato-para-elegir'
import { respuestaDe } from '../../fotos/envio'
import { guardarDatoDelVehiculo } from '../actions/guardar-dato-del-vehiculo'
import { useOpcionesDelDato } from '../hooks/use-opciones-del-dato'

type Props = {
  vehiculoId: string
  // La versión del vehículo que se dibujó: se manda al guardar.
  version: string
  // Si quien mira puede editar el vehículo (lo decide la página con `editablesDe`).
  editable: boolean
  dato: DatoParaElegir
  leerOpciones: LectorDeOpciones
  // Guardado: el panel cierra como al elegir el vehículo y la hoja se vuelve a abrir con el dato nuevo.
  alGuardado: () => void
}

const SIN_FILAS =
  'La tabla no tiene filas para elegir. Pídele a quien configura el cotizador que las cargue.'

const avisoSinCoincidencia = (valor: string | null) =>
  valor === null
    ? 'El vehículo no tiene este dato: elige uno.'
    : `El vehículo dice «${valor}», que no está en la tabla: elige uno.`

// Quien no puede editar el vehículo ve su dato y si la tabla lo tiene, sin elegir.
function SoloLectura({
  titulo,
  valor,
  enLaTabla,
}: {
  titulo: string
  valor: string | null
  enLaTabla: boolean
}) {
  const texto = valor === null ? 'sin dato' : `${valor}${enLaTabla ? '' : ' (no está en la tabla)'}`
  return (
    <>
      <p className="text-(length:--text-sm) text-(--color-ink)">{`${titulo}: ${texto}`}</p>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Lo elige quien puede editar este vehículo.
      </p>
    </>
  )
}

// Un botón por opción (P4: un toque guarda), a lo sumo el tope; con más, «Buscar en las opciones» es el camino a las demás.
function BotonesDeOpciones(props: {
  opciones: readonly string[]
  valor: string | null
  marcada: string | null
  guardando: boolean
  alElegir: (opcion: string) => void
}) {
  const { opciones, valor, marcada, guardando, alElegir } = props
  const [busqueda, setBusqueda] = useState('')
  const { dibujadas, hayMasQueElTope } = opcionesADibujar(opciones, marcada, busqueda)
  return (
    <>
      {marcada === null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {avisoSinCoincidencia(valor)}
        </p>
      ) : null}
      {opciones.length > TOPE_DE_OPCIONES ? (
        <input
          type="search"
          aria-label="Buscar en las opciones"
          placeholder="Buscar en las opciones"
          value={busqueda}
          onChange={(evento) => {
            setBusqueda(evento.target.value)
          }}
          className="h-11 w-full min-w-0 rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 text-(length:--text-sm) md:h-9"
        />
      ) : null}
      <div className="flex min-w-0 flex-wrap gap-2">
        {dibujadas.map((opcion) => (
          <button
            key={opcion}
            type="button"
            aria-pressed={opcion === marcada}
            disabled={guardando}
            onClick={() => {
              alElegir(opcion)
            }}
            className="flex min-h-11 max-w-full items-center rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-3 text-left text-(length:--text-sm) break-all text-(--color-ink) transition hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70 aria-pressed:border-(--color-primario) aria-pressed:bg-(--color-primario-soft) aria-pressed:font-medium md:min-h-9"
          >
            {opcion}
          </button>
        ))}
      </div>
      {hayMasQueElTope ? (
        <AvisoDeTope texto={`Se muestran ${String(TOPE_DE_OPCIONES)}. Escribe para acotar.`} />
      ) : null}
    </>
  )
}

// Un dato del vehículo que casa con una tabla de la hoja (el tipo de vehículo del transporte), en «Elegido» del panel: sus opciones son las filas de la tabla, tal cual (P1 del
// 2c3), con la del vehículo marcada. Un toque guarda (P4); quien no puede editar el vehículo lo ve sin elegir.
export function DatoDelElegido({
  vehiculoId,
  version,
  editable,
  dato,
  leerOpciones,
  alGuardado,
}: Props) {
  const id = useId()
  const { lectura, reintentar } = useOpcionesDelDato(leerOpciones, dato.tablas)
  const { executeAsync, isPending } = useAction(guardarDatoDelVehiculo)
  const titulo = (lectura.tipo === 'lista' ? lectura.opciones.etiqueta : null) ?? dato.campo

  async function elegir(valor: string): Promise<void> {
    const hecho = await respuestaDe(
      executeAsync({ id: vehiculoId, actualizadoEnEsperado: version, campo: dato.campo, valor }),
    )
    if (hecho.ok) {
      alGuardado()
    } else {
      avisarError(hecho.error)
    }
  }

  const cuerpo = () => {
    if (lectura.tipo === 'leyendo') {
      return <Skeleton className="h-9 w-full" />
    }
    if (lectura.tipo === 'error') {
      return <EstadoError titulo="No pudimos leer las opciones." alReintentar={reintentar} />
    }
    const { opciones, hayMas } = lectura.opciones
    if (opciones.length === 0) {
      return <p className="text-(length:--text-sm) text-(--color-ink-soft)">{SIN_FILAS}</p>
    }
    const marcada = marcadaDe(dato.valor, opciones)
    return (
      <>
        {editable ? (
          <BotonesDeOpciones
            opciones={opciones}
            valor={dato.valor}
            marcada={marcada}
            guardando={isPending}
            alElegir={(opcion) => void elegir(opcion)}
          />
        ) : (
          <SoloLectura titulo={titulo} valor={dato.valor} enLaTabla={marcada !== null} />
        )}
        {hayMas ? (
          <AvisoDeTope texto="Se muestran las opciones de las primeras 1.000 filas." />
        ) : null}
      </>
    )
  }

  return (
    <div
      role="group"
      aria-labelledby={id}
      aria-busy={lectura.tipo === 'leyendo'}
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2"
    >
      <span id={id} className="text-(length:--text-sm) font-medium text-(--color-ink)">
        {titulo}
      </span>
      {cuerpo()}
    </div>
  )
}
