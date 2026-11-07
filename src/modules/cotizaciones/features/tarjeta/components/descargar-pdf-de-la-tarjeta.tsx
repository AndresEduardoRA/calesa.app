'use client'

import { DownloadIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { CodigoError } from '@/shared/lib/errores'
import { useDescargaDelPdf } from '../hooks/use-descarga-del-pdf'

// Lo que el modal dice si el PDF no baja: textos propios, nunca el cuerpo de la respuesta.
function textoDelFallo(codigo: CodigoError): string {
  if (codigo === 'no_encontrado') {
    return 'Esta cotización ya no está disponible.'
  }
  if (codigo === 'no_autenticado') {
    return 'Tu sesión ya no vale: vuelve a entrar.'
  }
  return 'No se pudo armar el PDF.'
}

// «Descargar PDF» del pie de «Vista previa» de una guardada (4.18-3b, C4 y C5): baja el PDF de lo guardado sin salir de la página, aunque haya cambios sin guardar (el aviso
// de esos cambios ya lo dice). Lo ve quien ve la cotización; la ruta decide con su sesión.
export function DescargarPdfDeLaTarjeta({
  cotizacionId,
  numero,
}: {
  cotizacionId: string
  numero: number | null
}) {
  const { estado, descargar } = useDescargaDelPdf(cotizacionId, numero)
  return (
    <>
      {estado.tipo === 'fallo' ? (
        <p role="alert" className="self-center text-(length:--text-sm) text-(--color-ink-soft)">
          {textoDelFallo(estado.codigo)}
        </p>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={estado.tipo === 'bajando'}
        onClick={descargar}
      >
        <DownloadIcon aria-hidden />
        {estado.tipo === 'bajando'
          ? 'Descargando…'
          : estado.tipo === 'fallo'
            ? 'Reintentar'
            : 'Descargar PDF'}
      </Button>
    </>
  )
}
