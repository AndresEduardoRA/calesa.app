'use client'

import { useState } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import { motivoParaNoImportar } from '../../../entities/permiso-de-importar'
import type { ContextoDeLaSeccion } from '../contexto-de-la-seccion'
import { useAsistenteTotal } from '../hooks/use-asistente-total'
import { useLanzarImportacion } from '../hooks/use-lanzar-importacion'
import { PasoArchivo } from './paso-archivo'
import { PasoColumnas } from './paso-columnas'
import { PasoImportando } from './paso-importando'
import { PasoVistaPrevia } from './paso-vista-previa'

type Paso = 'archivo' | 'columnas' | 'previa' | 'importando'

const TITULO_DE_PASO: Record<Paso, string> = {
  archivo: 'Archivo',
  columnas: 'Columnas',
  previa: 'Vista previa',
  importando: 'Importando',
}
const ORDEN: readonly Paso[] = ['archivo', 'columnas', 'previa', 'importando']

function Pasos({ actual }: { actual: Paso }) {
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-1 text-(length:--text-sm)" aria-label="Pasos">
      {ORDEN.map((paso, i) => (
        <li
          key={paso}
          aria-current={paso === actual ? 'step' : undefined}
          className={paso === actual ? 'font-semibold' : 'text-(--color-ink-faint)'}
        >
          {i + 1}. {TITULO_DE_PASO[paso]}
        </li>
      ))}
    </ol>
  )
}

type Props = {
  yo: string
  permisos: Permisos
  seccion: ContextoDeLaSeccion
  // «Yo» es `null`.
  asignarA: string | null
  alImportarOtro: () => void
}

// Archivo → Columnas → Vista previa → Importando. Todo lo del archivo vive sólo en la memoria de este asistente: quien lo dibuja le cambia
// la `key` al cambiar de entidad, origen o destino, al salir de la pantalla y con «Importar otro archivo».
export function AsistenteTotal({ yo, permisos, seccion, asignarA, alImportarOtro }: Props) {
  const asistente = useAsistenteTotal(seccion)
  const lanzar = useLanzarImportacion(yo)
  const [paso, setPaso] = useState<Paso>('archivo')
  const origenId = seccion.entidad === 'vehiculos' ? seccion.origen.id : null
  const motivoParaNo = motivoParaNoImportar(permisos, yo, {
    entidad: seccion.entidad,
    asignarA,
    origenId,
  })

  function importar() {
    const tramo = asistente.nuevoTramo()
    if (!tramo || !asistente.archivo) {
      return
    }
    setPaso('importando')
    lanzar.importar({
      entidad: seccion.entidad,
      tramo,
      total: asistente.archivo.filas.length,
      encabezados: asistente.archivo.encabezados,
      destinos: asistente.destinos,
      etiquetaDe: asistente.etiquetaDe,
      asignarA,
      origenId,
    })
  }

  return (
    <div className="grid max-w-3xl gap-5">
      <Pasos actual={paso} />
      {paso === 'archivo' ? (
        <PasoArchivo
          alCargar={(archivo) => {
            asistente.cargar(archivo)
            setPaso('columnas')
          }}
        />
      ) : null}
      {paso === 'columnas' && asistente.archivo ? (
        <PasoColumnas
          asistente={{ ...asistente, archivo: asistente.archivo }}
          contexto={seccion.entidad === 'leads' ? seccion.contexto : null}
          alVolver={() => {
            asistente.olvidarArchivo()
            setPaso('archivo')
          }}
          alContinuar={() => {
            setPaso('previa')
          }}
        />
      ) : null}
      {paso === 'previa' && asistente.archivo ? (
        <PasoVistaPrevia
          previa={asistente.previa}
          filas={asistente.archivo.filas}
          motivoParaNo={motivoParaNo}
          alVolver={() => {
            setPaso('columnas')
          }}
          alImportar={importar}
        />
      ) : null}
      {paso === 'importando' ? (
        <PasoImportando
          lanzar={lanzar}
          alVolverALaPrevia={() => {
            setPaso('previa')
          }}
          alImportarOtro={alImportarOtro}
        />
      ) : null}
    </div>
  )
}
