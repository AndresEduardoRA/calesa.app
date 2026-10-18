'use client'

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from 'cn'
import { useAtajo } from './atajos'
import { ContextoDeCambios } from './cambios-del-panel'
import { ConfirmarDescarte } from './confirmar-descarte'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from './sheet'
import { useCierreConCambios } from './use-cierre-con-cambios'

type Props = {
  // Controlado siempre: quién lo abre guarda el estado en la URL (`?panel=`, `?id=`), para que
  // el panel sobreviva a recargar y a compartir el enlace.
  abierto: boolean
  alCerrar: () => void
  titulo: string
  descripcion?: string
  // En móvil conviene 'bottom' (hoja inferior).
  lado?: 'right' | 'left' | 'bottom'
  // Un formulario con muchos campos pide más lugar que una ficha corta.
  ancho?: 'normal' | 'amplio'
  pie?: ReactNode
  children: ReactNode
}

// Panel lateral: el segundo nivel de cualquier pantalla (crear, editar, ver una ficha sin salir
// de la lista). Un modal nunca abre otro modal; un drawer sí puede abrirse desde uno.
// Cerrarlo no pregunta (lo escrito queda en el borrador del formulario). Lo que sí pregunta es la acción de un aviso que sale de la
// pantalla («Abrir ficha», `sale: true`) con algo escrito: el formulario de adentro lo dice con `useCambiosSinGuardar()` y la pregunta
// va en el pie (`pie`) o, si el pie va dentro del cuerpo, en `<PieDelPanel>`. Lo escrito que no tiene borrador (la nota de «Agregar
// vehículo») pide `preguntaAlCerrar`: ahí cerrar también pregunta, y sin `pie` la pregunta ocupa el pie.
export function Drawer({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  lado = 'right',
  ancho = 'normal',
  pie,
  children,
}: Props) {
  const [hayCambios, setHayCambios] = useState(false)
  const [preguntaAlCerrar, setPreguntaAlCerrar] = useState(false)
  const alDescartar = useRef<(() => void) | undefined>(undefined)
  const anotar = useCallback((hay: boolean, descartar?: () => void, pregunta = false) => {
    setHayCambios(hay)
    setPreguntaAlCerrar(hay && pregunta)
    if (descartar) {
      alDescartar.current = descartar
    }
  }, [])
  const cierre = useCierreConCambios({
    hayCambios,
    alCerrar,
    abierto,
    alDescartar: () => {
      alDescartar.current?.()
    },
  })
  // Cerrar el panel (Esc, la ✕, el clic afuera) pregunta sólo si lo escrito no tiene borrador; si no, cierra y queda el borrador.
  const pedirCierre = preguntaAlCerrar ? cierre.intentarCerrar : alCerrar
  useAtajo('cerrar', pedirCierre, abierto)
  const { confirmando, seguir, descartar } = cierre
  const registro = useMemo(
    () => ({ anotar, salida: { confirmando, seguir, descartar } }),
    [anotar, confirmando, seguir, descartar],
  )
  const pieAMostrar =
    confirmando && (pie || preguntaAlCerrar) ? (
      <ConfirmarDescarte alSeguir={seguir} alDescartar={descartar} />
    ) : (
      pie
    )

  return (
    <ContextoDeCambios value={registro}>
      <Sheet
        open={abierto}
        onOpenChange={(sigueAbierto) => {
          if (!sigueAbierto) {
            pedirCierre()
          }
        }}
      >
        <SheetContent
          side={lado}
          // La hoja inferior no pasa del alto de la pantalla: lo de adentro se desplaza.
          className={cn(
            'gap-0',
            lado === 'bottom'
              ? 'max-h-[85dvh] rounded-t-(--radius-card)'
              : ancho === 'amplio'
                ? 'data-[side=left]:w-full data-[side=right]:w-full sm:max-w-xl data-[side=left]:sm:max-w-xl data-[side=right]:sm:max-w-xl'
                : 'sm:max-w-md',
          )}
        >
          <SheetHeader className="border-b border-(--color-line)">
            <SheetTitle>{titulo}</SheetTitle>
            {descripcion ? <SheetDescription>{descripcion}</SheetDescription> : null}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
          {pieAMostrar ? (
            <SheetFooter className="border-t border-(--color-line)">{pieAMostrar}</SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    </ContextoDeCambios>
  )
}
