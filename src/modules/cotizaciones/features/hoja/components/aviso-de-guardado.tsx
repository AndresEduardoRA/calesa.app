'use client'

import { RUTAS } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import type { EstadoDelGuardado } from '../hooks/use-guardado'

type Props = {
  estado: EstadoDelGuardado
  // El último guardado no se confirmó: «Guardar» lo vuelve a mandar tal como estaba (P3).
  hayPendiente: boolean
  enLinea: boolean
  alRecargar: () => void
  alReintentar: () => void
}

const CLASE_DEL_BOTON = 'min-h-11 md:min-h-8'

// Lo que dice el último guardado que no entró, con la salida que lo arregla (`textoDelRechazo`, `textoDelFallo`): «Recargar» reabre la hoja, «Reintentar» vuelve a guardar,
// «Ingresar» abre el ingreso en otra pestaña (lo escrito sigue acá). Sin salida, ningún botón: uno que no arregla nada no se ofrece. Va en la región viva del resumen.
export function AvisoDeGuardado({
  estado,
  hayPendiente,
  enLinea,
  alRecargar,
  alReintentar,
}: Props) {
  const aviso = estado.tipo === 'aviso' ? estado.aviso : null
  return (
    <>
      {aviso === null ? null : (
        <div data-aviso-de-guardado="" className="flex flex-wrap items-center gap-2">
          <p className="text-(length:--text-sm) font-medium text-(--color-peligro-ink)">
            {aviso.texto}
          </p>
          {aviso.salida === 'recargar' || aviso.salida === 'd2' ? (
            <Button variant="outline" className={CLASE_DEL_BOTON} onClick={alRecargar}>
              Recargar
            </Button>
          ) : null}
          {aviso.salida === 'reintentar' && enLinea ? (
            <Button variant="outline" className={CLASE_DEL_BOTON} onClick={alReintentar}>
              Reintentar
            </Button>
          ) : null}
          {aviso.salida === 'ingresar' ? (
            <Button
              variant="outline"
              className={CLASE_DEL_BOTON}
              onClick={() => {
                window.open(RUTAS.ingreso, '_blank', 'noopener')
              }}
            >
              Ingresar
            </Button>
          ) : null}
        </div>
      )}
      {hayPendiente && estado.tipo !== 'guardando' ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          El último guardado no se confirmó. «Guardar» lo vuelve a mandar tal como estaba.
        </p>
      ) : null}
    </>
  )
}
