'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import {
  ETIQUETA_DE_TIPO_DEL_LEAD,
  TIPOS_DEL_LEAD,
  type ContextoDeAlta,
} from '../../../entities/alta'
import type { ObjetivoDeImportacion } from '../../../entities/importacion/emparejar'
import type { EleccionParaTodoElArchivo } from '../../../entities/importacion/filas'
import type { ArchivoCargado } from '../hooks/use-asistente-de-importacion'

const IGNORAR = ''

type Props = {
  asistente: {
    archivo: ArchivoCargado
    objetivos: readonly ObjetivoDeImportacion[]
    destinos: readonly (string | null)[]
    avisos: readonly string[]
    faltan: readonly ObjetivoDeImportacion[]
    eleccion: EleccionParaTodoElArchivo
    elegirDestino: (columna: number, objetivo: string | null) => void
    elegirOrigen: (origenId: string | null) => void
    elegirTipo: (tipo: EleccionParaTodoElArchivo['tipo']) => void
  }
  contexto: ContextoDeAlta
  alVolver: () => void
  alContinuar: () => void
}

// Lo que se elige para todo el archivo: el origen y el tipo de las filas que no lo traen.
function SelectoresDelArchivo({ asistente, contexto }: Pick<Props, 'asistente' | 'contexto'>) {
  const { eleccion } = asistente
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {contexto.origenes.length > 0 ? (
        <CampoSeleccion
          nombre="origen-del-archivo"
          etiqueta="Origen para las filas sin origen"
          opciones={contexto.origenes.map((origen) => ({
            valor: origen.id,
            etiqueta: origen.nombre,
          }))}
          value={eleccion.origenId ?? ''}
          onChange={(evento) => {
            asistente.elegirOrigen(evento.target.value)
          }}
        />
      ) : null}
      <CampoSeleccion
        nombre="tipo-del-archivo"
        etiqueta="Tipo para las filas sin tipo"
        opciones={TIPOS_DEL_LEAD.map((tipo) => ({
          valor: tipo,
          etiqueta: ETIQUETA_DE_TIPO_DEL_LEAD[tipo],
        }))}
        value={eleccion.tipo}
        onChange={(evento) => {
          const tipo = TIPOS_DEL_LEAD.find((uno) => uno === evento.target.value)
          if (tipo) {
            asistente.elegirTipo(tipo)
          }
        }}
      />
    </div>
  )
}

// El segundo paso: a qué dato va cada columna. El emparejamiento automático ya está hecho; acá se
// corrige. Lo que queda sin pareja se ignora. El origen y el tipo se pueden fijar para todo el archivo.
export function PasoEmparejar({ asistente, contexto, alVolver, alContinuar }: Props) {
  const { archivo, objetivos, destinos, avisos, faltan } = asistente
  const opciones = [
    { valor: IGNORAR, etiqueta: 'Ignorar esta columna' },
    ...objetivos.map((objetivo) => ({ valor: objetivo.id, etiqueta: objetivo.etiqueta })),
  ]
  return (
    <div className="grid gap-4">
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        Revisa a qué dato va cada columna de «{archivo.nombre}». Lo que no emparejes no se importa.
      </p>
      {avisos.length > 0 ? (
        <Aviso tono="info">
          <ul className="grid gap-0.5">
            {avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </Aviso>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {archivo.encabezados.map((encabezado, columna) => (
          <CampoSeleccion
            key={`${String(columna)}-${encabezado}`}
            nombre={`columna-${String(columna)}`}
            etiqueta={
              encabezado === '' ? `Columna ${String(columna + 1)}` : `Columna «${encabezado}»`
            }
            opciones={opciones}
            value={destinos[columna] ?? IGNORAR}
            ayuda={ejemploDe(archivo, columna)}
            onChange={(evento) => {
              asistente.elegirDestino(
                columna,
                evento.target.value === IGNORAR ? null : evento.target.value,
              )
            }}
          />
        ))}
      </div>
      <SelectoresDelArchivo asistente={asistente} contexto={contexto} />
      {faltan.length > 0 ? (
        <Aviso tono="aviso">
          Falta una columna para: {faltan.map((objetivo) => objetivo.etiqueta).join(', ')}.
        </Aviso>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" className="h-11 md:h-9" onClick={alVolver}>
          Elegir otro archivo
        </Button>
        <Button
          type="button"
          className="h-11 md:h-9"
          disabled={faltan.length > 0}
          onClick={alContinuar}
        >
          Ver la vista previa
        </Button>
      </div>
    </div>
  )
}

// El primer dato de la columna, para reconocerla (en la pantalla; no va a ningún lado).
function ejemploDe(archivo: ArchivoCargado, columna: number): string | undefined {
  const primero = archivo.filas
    .map((fila) => fila[columna] ?? '')
    .find((celda) => celda.trim() !== '')
  if (primero === undefined) {
    return undefined
  }
  return `Ejemplo: ${primero.length > 40 ? `${primero.slice(0, 40)}…` : primero}`
}
