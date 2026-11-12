'use client'

import { formatearHora } from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import {
  EXPORTACIONES_POR_HORA,
  TEXTOS_DE_ERROR,
  type EstadoDeDescarga,
} from '../../../entities/descarga'

// Lo que pasó con el último «Descargar» de una tarjeta. Lo que informa va en `status`; lo que falla, en `alert` y con «Reintentar».
export function AvisoDeDescarga({
  estado,
  alReintentar,
}: {
  estado: EstadoDeDescarga
  alReintentar: () => void
}) {
  const { locale, zonaHoraria } = useRegional()
  if (estado.tipo === 'error') {
    return (
      <div role="alert" className="grid justify-items-start gap-2">
        <p className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {estado.mensaje ?? TEXTOS_DE_ERROR[estado.motivo]}
        </p>
        <Button type="button" variant="outline" onClick={alReintentar}>
          Reintentar
        </Button>
      </div>
    )
  }
  const texto = textoDelEstado(estado, locale, zonaHoraria)
  return (
    <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft) empty:hidden">
      {texto}
    </p>
  )
}

function textoDelEstado(estado: EstadoDeDescarga, locale: string, zona: string): string {
  switch (estado.tipo) {
    case 'listo':
      return `Descargado: ${estado.nombre}.`
    case 'vacia':
      return 'No hay nada para exportar en ese rango.'
    case 'demasiadas':
      return `Son más de ${formatearNumero(estado.tope, { locale })} filas. Elige un rango de fechas más corto.`
    case 'limite':
      return `Ya exportaste ${EXPORTACIONES_POR_HORA} veces en la última hora. Podrás de nuevo a las ${formatearHora(estado.libreEn, { zona })}.`
    case 'sin_permiso':
      return 'No tienes permiso para exportar todo.'
    case 'reposo':
    case 'preparando':
    case 'error':
      return ''
  }
}
