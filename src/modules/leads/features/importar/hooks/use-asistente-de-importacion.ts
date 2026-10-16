'use client'

import { useMemo, useState } from 'react'
import type { ContextoDeAlta } from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'
import {
  conDestino,
  emparejarColumnas,
  objetivosDeImportacion,
  objetivosSinColumna,
  type ObjetivoDeImportacion,
} from '../../../entities/importacion/emparejar'
import {
  prepararFilas,
  type EleccionParaTodoElArchivo,
  type FilaPreparada,
} from '../../../entities/importacion/filas'
import { usePaises } from '../../telefono/hooks/use-paises'

// El archivo ya leído: sólo vive acá, en memoria. Cada fila trae su id de intento desde el principio:
// reintentar un lote manda los mismos ids y la base no duplica.
export type ArchivoCargado = {
  nombre: string
  encabezados: string[]
  filas: string[][]
  ids: string[]
}

type Entrada = { campos: readonly CampoDeLead[]; contexto: ContextoDeAlta; zona: string }

function eleccionInicial(contexto: ContextoDeAlta): EleccionParaTodoElArchivo {
  return {
    origenId: contexto.ultimoOrigenId ?? contexto.origenes[0]?.id ?? null,
    tipo: 'prospecto',
  }
}

// El estado del asistente hasta antes de importar: el archivo, a qué dato va cada columna, lo que se
// elige para todo el archivo y lo que sale de validar cada fila con las reglas del alta.
export function useAsistenteDeImportacion({ campos, contexto, zona }: Entrada) {
  const objetivos = useMemo<ObjetivoDeImportacion[]>(() => objetivosDeImportacion(campos), [campos])
  const [archivo, setArchivo] = useState<ArchivoCargado | null>(null)
  const [destinos, setDestinos] = useState<(string | null)[]>([])
  const [avisos, setAvisos] = useState<readonly string[]>([])
  const [eleccion, setEleccion] = useState(() => eleccionInicial(contexto))
  const [ahora] = useState(() => new Date().toISOString())
  // La tabla de países se pide al elegir el archivo, igual que papaparse: completa «País» con el del
  // teléfono donde la celda viene vacía.
  const paises = usePaises(archivo !== null)

  const preparadas = useMemo<FilaPreparada[]>(() => {
    if (!archivo) {
      return []
    }
    let siguiente = 0
    return prepararFilas({
      filas: archivo.filas,
      destinos,
      campos,
      contexto,
      zona,
      ahora,
      eleccion,
      paises,
      nuevoId: () => {
        const id = archivo.ids[siguiente] ?? crypto.randomUUID()
        siguiente += 1
        return id
      },
    })
  }, [archivo, destinos, campos, contexto, zona, ahora, eleccion, paises])

  const faltan = useMemo(() => objetivosSinColumna(destinos, objetivos), [destinos, objetivos])

  function cargar(nuevo: Omit<ArchivoCargado, 'ids'>) {
    const emparejado = emparejarColumnas(nuevo.encabezados, objetivos)
    setArchivo({ ...nuevo, ids: nuevo.filas.map(() => crypto.randomUUID()) })
    setDestinos([...emparejado.destinos])
    setAvisos(emparejado.avisos)
    setEleccion(eleccionInicial(contexto))
  }

  function reiniciar() {
    setArchivo(null)
    setDestinos([])
    setAvisos([])
    setEleccion(eleccionInicial(contexto))
  }

  return {
    objetivos,
    archivo,
    destinos,
    avisos,
    eleccion,
    preparadas,
    faltan,
    cargar,
    reiniciar,
    elegirDestino: (columna: number, objetivo: string | null) => {
      setDestinos((actuales) => conDestino(actuales, columna, objetivo))
    },
    elegirOrigen: (origenId: string | null) => {
      setEleccion((actual) => ({ ...actual, origenId }))
    },
    elegirTipo: (tipo: EleccionParaTodoElArchivo['tipo']) => {
      setEleccion((actual) => ({ ...actual, tipo }))
    },
  }
}
