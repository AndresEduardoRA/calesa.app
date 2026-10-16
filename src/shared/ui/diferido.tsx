'use client'

import {
  Component,
  Suspense,
  createElement,
  lazy,
  useMemo,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react'
import { Aviso } from './aviso'
import { Button } from './button'

// El código de un panel, un modal o una pestaña que se pide al usarse (`import()`), no al dibujar la
// pantalla (`.claude/rules/escala.md`). **Es el único lugar que carga código diferido**: ningún
// archivo importa `next/dynamic` (lo cuida el lint), porque sin red un `import()` que nunca se pidió
// falla al abrirlo, y sin este ayudante esa falla tumbaba la pantalla entera al `error.tsx`.
//
// Carga con un reintento. Si igual falla, dice «Sin conexión» *ahí*, con «Reintentar» (que vuelve a pedir
// el código), y deja el resto de la pantalla en pie: nada de lo escrito afuera se pierde. Una vez
// cargado, el componente queda guardado: volver a montarlo no suspende.
//
// Uso: `export const ModalDeX = diferido(() => import('./modal-de-x').then((m) => m.ModalDeX))`, y se
// monta con `useAbiertoAlgunaVez(abierto)` cuando es un modal. Sólo corre en el navegador: en el
// servidor dibuja nada (igual que `ssr: false`).

type Cargador<P> = () => Promise<ComponentType<P> | { default: ComponentType<P> }>

type Opciones = {
  // Lo que se ve mientras llega el código (por defecto, nada).
  esqueleto?: ReactNode
  // Dónde se avisa si no llegó: `aqui`, en el lugar del componente; `pantalla`, en una barra fija abajo
  // (para los modales y paneles, que no tienen lugar propio hasta que abren).
  aviso?: 'aqui' | 'pantalla'
}

export const ESPERA_DEL_REINTENTO_MS = 400
export const MENSAJE_SIN_CONEXION = 'Sin conexión. No se pudo abrir esto.'

const esperar = (ms: number) => new Promise<void>((listo) => setTimeout(listo, ms))

function comoComponente<P>(modulo: ComponentType<P> | { default: ComponentType<P> }) {
  return typeof modulo === 'function' ? modulo : modulo.default
}

// Pide el código y, si falla (un corte de red), lo vuelve a pedir una vez.
async function cargarConReintento<P>(cargar: Cargador<P>): Promise<ComponentType<P>> {
  try {
    return comoComponente(await cargar())
  } catch {
    await esperar(ESPERA_DEL_REINTENTO_MS)
    return comoComponente(await cargar())
  }
}

type PropsDelLimite = {
  aviso: 'aqui' | 'pantalla'
  alReintentar: () => void
  children: ReactNode
}

class LimiteDeCarga extends Component<PropsDelLimite, { fallo: boolean }> {
  override state = { fallo: false }

  static getDerivedStateFromError() {
    return { fallo: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('No se pudo cargar el código diferido', error.message, info.componentStack)
  }

  override render() {
    if (!this.state.fallo) {
      return this.props.children
    }
    const aviso = (
      <Aviso tono="peligro" className="items-center">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {MENSAJE_SIN_CONEXION}
          <Button type="button" size="sm" variant="outline" onClick={this.props.alReintentar}>
            Reintentar
          </Button>
        </span>
      </Aviso>
    )
    return this.props.aviso === 'pantalla' ? (
      <div className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-md">{aviso}</div>
    ) : (
      aviso
    )
  }
}

const SIN_SUSCRIPCION = () => () => {}

export function diferido<P extends object>(
  cargar: Cargador<P>,
  { esqueleto = null, aviso = 'pantalla' }: Opciones = {},
): ComponentType<P> {
  let resuelto: ComponentType<P> | undefined

  const pedir = async () => {
    resuelto = await cargarConReintento(cargar)
    return { default: resuelto }
  }

  function Diferido(props: P) {
    // Falso en el servidor y en la hidratación, verdadero después: sin `ssr` y sin saltos.
    const enElNavegador = useSyncExternalStore(
      SIN_SUSCRIPCION,
      () => true,
      () => false,
    )
    const [intento, setIntento] = useState(0)
    // Si el código ya estaba cargado al montarse, se dibuja directo. Si no, pasa por el `lazy` y **sigue
    // pasando por él** mientras viva esta instancia: cambiar de camino cuando termina de cargar
    // desmontaría el componente y perdería su estado (lo escrito, el resultado de una acción).
    const [yaCargado] = useState(() => resuelto !== undefined)
    // Un intento nuevo, un `lazy` nuevo: el anterior guarda su rechazo para siempre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const Perezoso = useMemo(() => lazy(pedir), [intento])
    if (!enElNavegador) {
      return null
    }
    if (yaCargado && resuelto) {
      return createElement(resuelto, props)
    }
    return (
      <LimiteDeCarga
        key={intento}
        aviso={aviso}
        alReintentar={() => {
          setIntento((n) => n + 1)
        }}
      >
        <Suspense fallback={esqueleto}>{createElement(Perezoso, props)}</Suspense>
      </LimiteDeCarga>
    )
  }
  Diferido.displayName = 'Diferido'
  return Diferido
}
