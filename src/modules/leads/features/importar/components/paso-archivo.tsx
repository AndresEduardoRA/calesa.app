'use client'

import { DownloadIcon } from 'lucide-react'
import { useState } from 'react'
import { descargarCsv } from '@/shared/lib/csv/descargar'
import { BOM_UTF8, lineasDeCsv } from '@/shared/lib/csv/escribir'
import { formatearNumero } from '@/shared/lib/formato'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { ZonaDeArchivos } from '@/shared/ui/zona-de-archivos'
import type { ContextoDeAlta } from '../../../entities/alta'
import type { CampoDeLead } from '../../../entities/campo'
import { LIMITES_DE_IMPORTACION } from '../../../entities/importacion/limites'
import {
  NOMBRE_DE_LA_PLANTILLA,
  plantillaDeImportacion,
} from '../../../entities/importacion/plantilla'
import type { ArchivoCargado } from '../hooks/use-asistente-de-importacion'

type Props = {
  campos: readonly CampoDeLead[]
  contexto: ContextoDeAlta
  zona: string
  alCargar: (archivo: Omit<ArchivoCargado, 'ids'>) => void
}

// Leer el archivo es lo único que usa `papaparse`: se pide recién ahora, no al abrir la pantalla.
async function leerArchivo(archivo: File): Promise<Omit<ArchivoCargado, 'ids'> | string> {
  const { leerCsv, mensajeDeLectura, textoDeBytes } = await import('@/shared/lib/csv/leer')
  if (archivo.size > LIMITES_DE_IMPORTACION.bytes) {
    return mensajeDeLectura({ tipo: 'grande' }, LIMITES_DE_IMPORTACION)
  }
  const texto = textoDeBytes(await archivo.arrayBuffer(), LIMITES_DE_IMPORTACION)
  if (!texto.ok) {
    return mensajeDeLectura(texto.error, LIMITES_DE_IMPORTACION)
  }
  const lectura = leerCsv(texto.texto, LIMITES_DE_IMPORTACION)
  if (!lectura.ok) {
    return mensajeDeLectura(lectura.error, LIMITES_DE_IMPORTACION)
  }
  return { nombre: archivo.name, encabezados: lectura.encabezados, filas: lectura.filas }
}

// El primer paso: elegir el archivo, o bajar el de ejemplo con las columnas del layout de hoy.
export function PasoArchivo({ campos, contexto, zona, alCargar }: Props) {
  const { locale } = useRegional()
  const [leyendo, setLeyendo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function elegir(archivos: File[]) {
    const archivo = archivos[0]
    if (!archivo) {
      return
    }
    setLeyendo(true)
    setError(null)
    try {
      const leido = await leerArchivo(archivo)
      if (typeof leido === 'string') {
        setError(leido)
      } else {
        alCargar(leido)
      }
    } catch {
      setError('No pudimos leer el archivo. Vuelve a intentarlo.')
    } finally {
      setLeyendo(false)
    }
  }

  function bajarEjemplo() {
    const { encabezados, muestra } = plantillaDeImportacion(
      campos,
      contexto,
      new Date().toISOString(),
      zona,
    )
    descargarCsv(BOM_UTF8 + lineasDeCsv([encabezados, muestra], ';'), NOMBRE_DE_LA_PLANTILLA)
  }

  const filas = formatearNumero(LIMITES_DE_IMPORTACION.filas, { locale })
  return (
    <div className="grid gap-4">
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        Sube un archivo CSV en UTF-8 con hasta {filas} filas y 2 MB. La primera fila lleva los
        encabezados. Los leads quedan en tu cartera.
      </p>
      <ZonaDeArchivos
        aceptar=".csv,text/csv,text/plain"
        alElegir={(archivos) => void elegir(archivos)}
        etiquetaDeElegir={leyendo ? 'Leyendo el archivo…' : 'Elegir archivo CSV'}
        deshabilitada={leyendo}
        ayuda="O suéltalo acá."
      />
      {error ? <Aviso tono="peligro">{error}</Aviso> : null}
      <div>
        <Button type="button" variant="outline" className="h-11 md:h-9" onClick={bajarEjemplo}>
          <DownloadIcon aria-hidden />
          Descargar archivo de ejemplo
        </Button>
      </div>
    </div>
  )
}
