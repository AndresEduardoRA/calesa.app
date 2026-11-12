'use client'

import { useRef } from 'react'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  CLAVE_DE_BOOKING_DEL_LOTE,
  CLAVE_DE_CONTENEDOR_DEL_LOTE,
  CLAVE_DE_DESTINO_DEL_LOTE,
  CLAVES_DEL_LOTE,
  PANEL_DEL_LOTE,
} from '../../../entities/mover/claves-del-lote'
import { useSeleccionDeLaCadena } from '../../nucleo/seleccion/use-seleccion-de-la-cadena'
import { CuerpoDelGrupo } from './cuerpo-del-grupo'
import { CuerpoDelLote } from './cuerpo-del-lote'

function SinUnidades({ alCerrar }: { alCerrar: () => void }) {
  return (
    <div className="grid gap-3">
      <p className="text-(length:--text-sm) text-(--color-ink)">No elegiste ninguna unidad.</p>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Elige unidades de una columna de la cadena y vuelve a abrir «Mover a…».
      </p>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 justify-self-start md:min-h-9"
        onClick={alCerrar}
      >
        Cerrar
      </Button>
    </div>
  )
}

type Fuente = {
  origenId: string
  grupo: { tipo: 'contenedor' | 'booking'; valor: string } | null
  destinoInicial: string | null
  alHaberResultado: () => void
  alCerrar: () => void
}

// De dónde salen las unidades: del grupo de la URL (`?contenedor=` o `?booking=`, que manda, D31) o de la selección de la cadena. Sin ninguna, «No elegiste ninguna unidad.».
function ContenidoDelLote({ origenId, grupo, destinoInicial, alHaberResultado, alCerrar }: Fuente) {
  const seleccion = useSeleccionDeLaCadena()
  if (grupo) {
    return (
      <CuerpoDelGrupo
        origenId={origenId}
        tipo={grupo.tipo}
        valor={grupo.valor}
        destinoInicial={destinoInicial}
        alHaberResultado={() => undefined}
        alCerrar={alCerrar}
      />
    )
  }
  const fase = seleccion?.estado.fase ?? null
  const unidades = seleccion
    ? [...seleccion.estado.elegidos].map(([id, { nombre }]) => ({ id, nombre }))
    : []
  if (!fase || unidades.length === 0) return <SinUnidades alCerrar={alCerrar} />
  return (
    <CuerpoDelLote
      origenId={origenId}
      fase={fase}
      unidades={unidades}
      destinoInicial={destinoInicial}
      alHaberResultado={alHaberResultado}
      alCerrar={alCerrar}
    />
  )
}

// El drawer del lote (`?panel=lote`, 6.04-3): mover varias unidades de una fase a otra con una nota común. Lo que se mueve sale de la selección de la cadena (en memoria: recargar con el panel
// abierto dice «No elegiste ninguna unidad.», D31) o de un grupo. Al cerrar con un resultado a la vista, la selección se vacía: lo elegido ya se movió o ya se dijo por qué no.
export function DrawerDelLote({ origenId }: { origenId: string }) {
  const panel = usePanelPorUrl(PANEL_DEL_LOTE, CLAVES_DEL_LOTE)
  const seleccion = useSeleccionDeLaCadena()
  const huboResultado = useRef(false)
  const cerrar = () => {
    if (huboResultado.current) seleccion?.vaciar()
    huboResultado.current = false
    panel.cerrar()
  }
  const contenedor = panel.valor(CLAVE_DE_CONTENEDOR_DEL_LOTE)
  const booking = panel.valor(CLAVE_DE_BOOKING_DEL_LOTE)
  const grupo =
    contenedor !== null
      ? ({ tipo: 'contenedor', valor: contenedor } as const)
      : booking !== null
        ? ({ tipo: 'booking', valor: booking } as const)
        : null
  return (
    <Drawer
      abierto={panel.abierto}
      alCerrar={cerrar}
      titulo="Mover varias unidades"
      descripcion="Cada unidad se revisa por su cuenta: las que no puedan entrar se quedan donde están y se dice por qué."
      ancho="amplio"
      focoAlCerrar={focoDeQuienAbrio}
    >
      {panel.abierto ? (
        <ContenidoDelLote
          origenId={origenId}
          grupo={grupo}
          destinoInicial={panel.valor(CLAVE_DE_DESTINO_DEL_LOTE)}
          alHaberResultado={() => {
            huboResultado.current = true
          }}
          alCerrar={cerrar}
        />
      ) : null}
    </Drawer>
  )
}
