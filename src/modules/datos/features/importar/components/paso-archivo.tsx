'use client'

import { useState } from 'react'
import { formatearNumero } from '@/shared/lib/formato'
import { Aviso } from '@/shared/ui/aviso'
import { useRegional } from '@/shared/ui/regional'
import { ZonaDeArchivos } from '@/shared/ui/zona-de-archivos'
import { LIMITES_DE_LECTURA_TOTAL } from '../../../entities/archivo-de-importacion'
import type { ArchivoLeido } from '../hooks/use-asistente-total'

// Leer el archivo es lo único que usa `papaparse`: se pide recién ahora, no al abrir la sección.
async function leerArchivo(archivo: File): Promise<ArchivoLeido | string> {
  const { leerCsv, mensajeDeLectura, textoDeBytes } = await import('@/shared/lib/csv/leer')
  if (archivo.size > LIMITES_DE_LECTURA_TOTAL.bytes) {
    return mensajeDeLectura({ tipo: 'grande' }, LIMITES_DE_LECTURA_TOTAL)
  }
  const texto = textoDeBytes(await archivo.arrayBuffer(), LIMITES_DE_LECTURA_TOTAL)
  if (!texto.ok) {
    return mensajeDeLectura(texto.error, LIMITES_DE_LECTURA_TOTAL)
  }
  const lectura = leerCsv(texto.texto, LIMITES_DE_LECTURA_TOTAL)
  if (!lectura.ok) {
    return mensajeDeLectura(lectura.error, LIMITES_DE_LECTURA_TOTAL)
  }
  return { nombre: archivo.name, encabezados: lectura.encabezados, filas: lectura.filas }
}

// El primer paso: elegir el archivo. Sirve el de «Exportar» de lo mismo: sus encabezados se emparejan solos.
export function PasoArchivo({ alCargar }: { alCargar: (archivo: ArchivoLeido) => void }) {
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

  const filas = formatearNumero(LIMITES_DE_LECTURA_TOTAL.filas, { locale })
  return (
    <div className="grid gap-4">
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        Sube un archivo CSV en UTF-8 con hasta {filas} filas y 10 MB; si es más grande, pártelo. La
        primera fila lleva los encabezados. Sirve el archivo de Exportar.
      </p>
      <ZonaDeArchivos
        aceptar=".csv,text/csv,text/plain"
        alElegir={(archivos) => void elegir(archivos)}
        etiquetaDeElegir={leyendo ? 'Leyendo el archivo…' : 'Elegir archivo CSV'}
        deshabilitada={leyendo}
        ayuda="O suéltalo acá."
      />
      {error ? <Aviso tono="peligro">{error}</Aviso> : null}
    </div>
  )
}
