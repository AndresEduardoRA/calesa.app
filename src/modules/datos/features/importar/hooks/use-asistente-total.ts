'use client'

import { useCallback, useMemo, useState } from 'react'
import {
  conDestino,
  emparejarColumnas,
  objetivosSinColumna,
  origenInicial,
  usePaises,
  type ContextoDeImportacion,
  type EleccionParaTodoElArchivo,
} from '@/modules/leads/client'
import { camposActivos, camposComunes, type Fuentes } from '@/modules/vehiculos/client'
import { useRegional } from '@/shared/ui/regional'
import {
  FILAS_DE_VISTA_PREVIA,
  normalizarFila,
  type EtiquetaDe,
} from '../../../entities/archivo-de-importacion'
import type { FilaNormalizada } from '../../../entities/plantillas'
import type { ContextoDeLaSeccion } from '../contexto-de-la-seccion'
import { etiquetaDeLeads, objetivosDeLeads } from '../convertir-leads'
import { tramoDeLeads, tramoDeVehiculos, type Tramo } from '../convertir-por-tramos'
import { etiquetaDeVehiculos, objetivosDeVehiculos } from '../convertir-vehiculos'

// El archivo ya leído: sólo vive acá, en memoria, hasta «Importar otro archivo» o salir de la pantalla.
export type ArchivoLeido = { nombre: string; encabezados: string[]; filas: string[][] }

function eleccionInicial(contexto: ContextoDeImportacion): EleccionParaTodoElArchivo {
  return {
    origenId: origenInicial(contexto),
    // El que propone el alta (el primero activo de la clase prospecto: lo calcula la base).
    tipoLeadId: contexto.tipoPorDefectoId ?? contexto.tipos[0]?.id ?? '',
  }
}

function useFuentes(seccion: ContextoDeLaSeccion): Fuentes | null {
  const { zonaHoraria, locale } = useRegional()
  return useMemo(
    () =>
      seccion.entidad === 'vehiculos'
        ? {
            comunes: camposComunes(seccion.origen.tipo),
            campos: camposActivos(seccion.campos),
            categorias: seccion.categorias,
            zona: zonaHoraria,
            locale,
          }
        : null,
    [seccion, zonaHoraria, locale],
  )
}

// A qué datos puede ir una columna y cómo se llama cada uno para la persona.
function useObjetivos(seccion: ContextoDeLaSeccion, fuentes: Fuentes | null) {
  const objetivos = useMemo(
    () =>
      seccion.entidad === 'leads'
        ? objetivosDeLeads(seccion.campos)
        : fuentes
          ? objetivosDeVehiculos(fuentes)
          : [],
    [seccion, fuentes],
  )
  const etiquetaDe = useMemo<EtiquetaDe>(
    () =>
      seccion.entidad === 'leads'
        ? etiquetaDeLeads(objetivos)
        : fuentes
          ? etiquetaDeVehiculos(fuentes)
          : () => undefined,
    [seccion.entidad, objetivos, fuentes],
  )
  return { objetivos, etiquetaDe }
}

// El estado del asistente hasta lanzar: el archivo, a qué dato va cada columna, lo que se elige para todo el archivo (en leads) y la vista
// previa. `nuevoTramo` arma la conversión completa con **la misma entrada** que la vista previa (D47).
export function useAsistenteTotal(seccion: ContextoDeLaSeccion) {
  const { zonaHoraria, locale } = useRegional()
  const fuentes = useFuentes(seccion)
  const [archivo, setArchivo] = useState<ArchivoLeido | null>(null)
  const [destinos, setDestinos] = useState<(string | null)[]>([])
  const [avisos, setAvisos] = useState<readonly string[]>([])
  const [eleccion, setEleccion] = useState<EleccionParaTodoElArchivo | null>(() =>
    seccion.entidad === 'leads' ? eleccionInicial(seccion.contexto) : null,
  )
  const paises = usePaises(seccion.entidad === 'leads' && archivo !== null)

  const { objetivos, etiquetaDe } = useObjetivos(seccion, fuentes)
  const faltan = useMemo(() => objetivosSinColumna(destinos, objetivos), [destinos, objetivos])

  const nuevoTramo = useCallback((): Tramo | null => {
    if (!archivo) {
      return null
    }
    if (seccion.entidad === 'leads') {
      return eleccion
        ? tramoDeLeads({
            filas: archivo.filas,
            destinos,
            objetivos,
            campos: seccion.campos,
            contexto: seccion.contexto,
            zona: zonaHoraria,
            locale,
            eleccion,
            paises,
            nuevoId: () => crypto.randomUUID(),
          })
        : null
    }
    return fuentes ? tramoDeVehiculos({ filas: archivo.filas, destinos, objetivos, fuentes }) : null
  }, [archivo, seccion, destinos, objetivos, zonaHoraria, locale, eleccion, paises, fuentes])

  // Las primeras 500, cada una por la guarda de `plantillas.ts` (D34): muestra lo mismo que se va a escribir.
  const previa = useMemo<FilaNormalizada[]>(() => {
    const tramo = nuevoTramo()
    if (!tramo || !archivo) {
      return []
    }
    return tramo(0, Math.min(FILAS_DE_VISTA_PREVIA, archivo.filas.length)).map((fila) =>
      normalizarFila(seccion.entidad, fila, etiquetaDe),
    )
  }, [nuevoTramo, archivo, seccion.entidad, etiquetaDe])

  function cargar(nuevo: ArchivoLeido) {
    const numeroDe = seccion.entidad === 'vehiculos' ? 'un vehículo' : undefined
    const emparejado = emparejarColumnas(nuevo.encabezados, objetivos, numeroDe)
    setArchivo(nuevo)
    setDestinos([...emparejado.destinos])
    setAvisos(emparejado.avisos)
  }

  function olvidarArchivo() {
    setArchivo(null)
    setDestinos([])
    setAvisos([])
  }

  return {
    archivo,
    objetivos,
    destinos,
    avisos,
    faltan,
    eleccion,
    etiquetaDe,
    previa,
    nuevoTramo,
    cargar,
    olvidarArchivo,
    elegirDestino: (columna: number, objetivo: string | null) => {
      setDestinos((actuales) => conDestino(actuales, columna, objetivo))
    },
    elegirOrigen: (origenId: string | null) => {
      setEleccion((actual) => (actual ? { ...actual, origenId } : actual))
    },
    elegirTipo: (tipoLeadId: string) => {
      setEleccion((actual) => (actual ? { ...actual, tipoLeadId } : actual))
    },
  }
}

export type AsistenteTotal = ReturnType<typeof useAsistenteTotal>
