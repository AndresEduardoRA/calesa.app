'use client'

import { useRef } from 'react'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { focoDeQuienAbrio } from '@/shared/ui/foco-de-quien-abre'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import {
  CLAVE_DE_DESTINO_DEL_LOTE,
  CLAVES_DEL_LOTE,
  PANEL_DEL_LOTE,
} from '../../../entities/mover/claves-del-lote'
import { useSeleccionDeLaCadena } from '../../nucleo/seleccion/use-seleccion-de-la-cadena'
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

// El drawer del lote (`?panel=lote`, 6.04-3): mover varias unidades de una fase a otra con una nota común. Lo que se mueve sale de la selección de la cadena (en memoria: recargar con el panel
// abierto dice «No elegiste ninguna unidad.», D31). Al cerrar con un resultado a la vista, la selección se vacía: lo elegido ya se movió o ya se dijo por qué no.
export function DrawerDelLote({ origenId }: { origenId: string }) {
  const panel = usePanelPorUrl(PANEL_DEL_LOTE, CLAVES_DEL_LOTE)
  const seleccion = useSeleccionDeLaCadena()
  const huboResultado = useRef(false)
  const cerrar = () => {
    if (huboResultado.current) seleccion?.vaciar()
    huboResultado.current = false
    panel.cerrar()
  }
  const fase = seleccion?.estado.fase ?? null
  const unidades = seleccion
    ? [...seleccion.estado.elegidos].map(([id, { nombre }]) => ({ id, nombre }))
    : []
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
        fase && unidades.length > 0 ? (
          <CuerpoDelLote
            origenId={origenId}
            fase={fase}
            unidades={unidades}
            destinoInicial={panel.valor(CLAVE_DE_DESTINO_DEL_LOTE)}
            alHaberResultado={() => {
              huboResultado.current = true
            }}
            alCerrar={cerrar}
          />
        ) : (
          <SinUnidades alCerrar={cerrar} />
        )
      ) : null}
    </Drawer>
  )
}
