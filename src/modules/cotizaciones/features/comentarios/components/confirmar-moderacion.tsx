'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import type { ErrorApp } from '@/shared/lib/errores'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import { avisar, avisarExito } from '@/shared/ui/toasts'
import { useApertura } from '@/shared/ui/use-apertura'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { ESTADO_DE_LA_ACCION } from '../../../entities/comentarios/moderacion-lectura'
import type { AccionDeModerar } from '../../../entities/comentarios/moderacion'
import { moderar } from '../actions/moderar'
import { ListaDeReportes } from './lista-de-reportes'

type Props = {
  // Lo que se modera; nulo = cerrado. Sale de la URL (`useModeracionPorUrl`).
  accion: AccionDeModerar | null
  alCerrar: () => void
  cotizacionId: string
  numero: number
  actualizadoEn: string
}

const NO_SE_MODERO = 'No se pudo moderar la cotización.'

const SE_DESCARTA = 'Lo que no guardaste en la hoja se descarta.'

const TEXTOS: Record<
  AccionDeModerar,
  { titulo: (n: string) => string; descripcion: string; boton: string; hecho: string }
> = {
  invalidar: {
    titulo: (n) => `Invalidar la cotización n.º ${n}`,
    descripcion: `Deja de valer y no ancla al vehículo. Sus reportes se conservan. ${SE_DESCARTA}`,
    boton: 'Invalidar',
    hecho: 'Cotización invalidada.',
  },
  descartar: {
    titulo: (n) => `Descartar los reportes de la n.º ${n}`,
    descripcion: 'Se borran sus reportes y sigue activa.',
    boton: 'Descartar los reportes',
    hecho: 'Reportes descartados.',
  },
  reactivar: {
    titulo: (n) => `Reactivar la cotización n.º ${n}`,
    descripcion: `Vuelve a valer y se borran sus reportes. ${SE_DESCARTA}`,
    boton: 'Reactivar',
    hecho: 'Cotización reactivada.',
  },
}

// El Confirmar de moderar (`?panel=moderar&accion=…`, 4.27-4): invalidar, descartar los reportes o reactivar, con los motivos de los reportes adentro. Manda la
// versión de la página; si otra persona la cambió, lo dice adentro con «Recargar». Al entrar cierra, avisa y vuelve a leer la página.
export function ConfirmarModeracion({
  accion,
  alCerrar,
  cotizacionId,
  numero,
  actualizadoEn,
}: Props) {
  const router = useRouter()
  const mostrada = useUltimo(accion)
  const apertura = useApertura(accion !== null)
  const [error, setError] = useState<ErrorApp | null>(null)
  const [enCurso, setEnCurso] = useState(false)
  const textos = mostrada ? TEXTOS[mostrada] : null

  function cerrar() {
    setError(null)
    alCerrar()
  }

  async function confirmar() {
    if (!accion) {
      return
    }
    setError(null)
    setEnCurso(true)
    const resultado = await enviarAccion(
      moderar({ cotizacionId, actualizadoEn, estado: ESTADO_DE_LA_ACCION[accion] }),
      NO_SE_MODERO,
    )
    setEnCurso(false)
    if (!resultado.ok) {
      setError(resultado.error)
      return
    }
    cerrar()
    if (resultado.data.resultado === 'sin_cambios') {
      avisar('No había nada que cambiar.')
    } else {
      avisarExito(TEXTOS[accion].hecho)
    }
    router.refresh()
  }

  return (
    <Confirmar
      abierto={accion !== null}
      alCerrar={cerrar}
      alConfirmar={confirmar}
      titulo={textos ? textos.titulo(String(numero)) : ''}
      descripcion={textos?.descripcion ?? ''}
      etiquetaConfirmar={textos?.boton ?? ''}
      enCurso={enCurso}
    >
      <ListaDeReportes key={apertura} cotizacionId={cotizacionId} />
      {error ? (
        <Aviso tono="peligro">
          <p>{error.mensaje}</p>
          {error.codigo === 'conflicto' ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 min-h-11 md:min-h-8"
              onClick={() => {
                cerrar()
                router.refresh()
              }}
            >
              Recargar
            </Button>
          ) : null}
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
