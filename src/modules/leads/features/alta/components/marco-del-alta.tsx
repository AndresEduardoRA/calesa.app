'use client'

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Drawer } from '@/shared/ui/drawer'
import { usePanelDeAlta } from '../hooks/use-panel-de-alta'

type Marco = {
  // Los dos lugares del drawer donde se dibuja lo de adentro: el cuerpo y el pie. Nulos mientras el drawer está cerrado.
  cuerpo: HTMLElement | null
  pie: HTMLElement | null
  describir: (descripcion: string) => void
  pedirPie: (conPie: boolean) => void
  registrarCierre: (alCerrar: (() => void) | null) => void
}

const ContextoDelMarco = createContext<Marco | null>(null)

const DESCRIPCION_INICIAL = 'Datos del lead'

// El único `<Drawer>` de «Nuevo lead» (`?panel=nuevo-lead`). Está montado siempre y cerrado, así que abrirlo lo desliza una vez; lo que
// va adentro (el esqueleto, el error con «Reintentar» y el formulario con su pie) cambia de cuerpo sin volver a montar ni a animar el
// drawer. El contenido del popup se va al cerrarse, pero el estado del alta no puede irse con él (lo escrito vive hasta guardar): por eso
// lo de adentro no es hijo del `<Drawer>` sino de este marco, y dibuja en sus dos ranuras con `<EnElMarco>`.
export function MarcoDelAlta({ children }: { children: ReactNode }) {
  const panel = usePanelDeAlta()
  const [cuerpo, setCuerpo] = useState<HTMLElement | null>(null)
  const [pie, setPie] = useState<HTMLElement | null>(null)
  const [conPie, setConPie] = useState(false)
  const [descripcion, setDescripcion] = useState(DESCRIPCION_INICIAL)
  const cierre = useRef<(() => void) | null>(null)

  const registrarCierre = useCallback((alCerrar: (() => void) | null) => {
    cierre.current = alCerrar
  }, [])
  const marco = useMemo<Marco>(
    () => ({
      cuerpo,
      pie,
      describir: setDescripcion,
      pedirPie: setConPie,
      registrarCierre,
    }),
    [cuerpo, pie, registrarCierre],
  )

  return (
    <ContextoDelMarco value={marco}>
      <Drawer
        abierto={panel.abierto}
        alCerrar={() => {
          // Quien tiene el formulario sabe qué cierra Esc: del seguimiento vuelve a los datos; de los datos, cierra.
          if (cierre.current) {
            cierre.current()
          } else {
            panel.cerrar()
          }
        }}
        titulo="Nuevo lead"
        descripcion={descripcion}
        ancho="amplio"
        pie={conPie ? <div ref={setPie} className="contents" /> : undefined}
      >
        <div ref={setCuerpo} className="contents" />
      </Drawer>
      {children}
    </ContextoDelMarco>
  )
}

// Dibuja `children` en el cuerpo o en el pie del drawer. Con el drawer cerrado no dibuja nada.
export function EnElMarco({ donde, children }: { donde: 'cuerpo' | 'pie'; children: ReactNode }) {
  const marco = use(ContextoDelMarco)
  const destino = donde === 'cuerpo' ? marco?.cuerpo : marco?.pie
  return destino ? createPortal(children, destino) : null
}

// Lo que el formulario le dice al marco: su descripción según el paso, que tiene pie y qué cierra Esc.
export function useAjustesDelMarco(descripcion: string, alCerrar: () => void) {
  const marco = use(ContextoDelMarco)
  const describir = marco?.describir
  const pedirPie = marco?.pedirPie
  const registrarCierre = marco?.registrarCierre
  useEffect(() => {
    describir?.(descripcion)
  }, [describir, descripcion])
  useLayoutEffect(() => {
    pedirPie?.(true)
    return () => {
      pedirPie?.(false)
      describir?.(DESCRIPCION_INICIAL)
    }
  }, [pedirPie, describir])
  useLayoutEffect(() => {
    registrarCierre?.(alCerrar)
  })
  useLayoutEffect(
    () => () => {
      registrarCierre?.(null)
    },
    [registrarCierre],
  )
}
