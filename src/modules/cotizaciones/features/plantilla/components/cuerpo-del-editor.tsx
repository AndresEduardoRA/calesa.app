'use client'

import {
  conColumna,
  conEtiqueta,
  conLeyenda,
  conLogo,
  conNota,
  conTonoDelGrupo,
  conTotal,
} from '../../../entities/plantilla/cambios-de-la-plantilla'
import type { Plantilla } from '../../../entities/plantilla/forma-de-plantilla'
import type { FilasDelEditor } from '../../../entities/plantilla/filas-del-editor'
import type { TonoDelCatalogo } from '../../../entities/plantilla/lectura-de-la-plantilla'
import { BloqueDeFilas } from './bloque-de-filas'
import { BloqueDeGrupos } from './bloque-de-grupos'
import { BloqueDePie } from './bloque-de-pie'
import { BloqueDelTotal } from './bloque-del-total'

type Props = {
  plantilla: Plantilla
  filas: FilasDelEditor
  tonos: readonly TonoDelCatalogo[]
  deshabilitado: boolean
  motivoDe: (donde: string) => string | undefined
  cambiar: (cambio: (antes: Plantilla) => Plantilla) => void
  // Escribir en un campo borra su motivo de la última respuesta y cambia la plantilla.
  campo: (donde: string, cambio: (antes: Plantilla) => Plantilla) => void
}

// Los cuatro bloques del editor, cada uno con el cambio puro que le toca (`cambios-de-la-plantilla.ts`).
export function CuerpoDelEditor({
  plantilla,
  filas,
  tonos,
  deshabilitado,
  motivoDe,
  cambiar,
  campo,
}: Props) {
  const comunes = { deshabilitado, motivoDe }
  return (
    <>
      <BloqueDeGrupos
        {...comunes}
        grupos={filas.grupos}
        tonos={tonos}
        alElegir={(grupo, tono) => {
          cambiar((p) => conTonoDelGrupo(p, grupo, tono))
        }}
      />
      <BloqueDelTotal
        {...comunes}
        total={plantilla.total}
        alCambiar={(c) => {
          campo(c.etiqueta !== undefined ? 'total.etiqueta' : 'total.leyenda', (p) =>
            conTotal(p, c),
          )
        }}
      />
      <BloqueDeFilas
        {...comunes}
        filas={filas}
        plantilla={plantilla}
        alCambiarEtiqueta={(id, texto) => {
          campo(`etiquetas.${id}`, (p) => conEtiqueta(p, id, texto))
        }}
        alCambiarLeyenda={(id, texto) => {
          campo(`leyendas.${id}`, (p) => conLeyenda(p, id, texto))
        }}
      />
      <BloqueDePie
        {...comunes}
        plantilla={plantilla}
        alCambiarNota={(texto) => {
          campo('nota', (p) => conNota(p, texto))
        }}
        alCambiarLogo={(valor) => {
          cambiar((p) => conLogo(p, valor))
        }}
        alCambiarColumna={(columna, valor) => {
          cambiar((p) => conColumna(p, columna, valor))
        }}
      />
    </>
  )
}
