'use client'

// Instalar la app: guarda el `beforeinstallprompt` del navegador y lo ofrece cuando la persona lo
// pide. El oyente se pone al evaluarse el módulo y no en un efecto del menú: el menú se monta
// tarde y el navegador no repite el evento.
import { useCallback, useSyncExternalStore } from 'react'
import { esIos, estaInstalada, ofrecerInstalacion, type Oferta } from '../lib/instalacion'

// Lo que el navegador agrega al evento (no está en lib.dom).
type EventoDeInstalacion = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Estado = { evento: EventoDeInstalacion | null; instalada: boolean; ios: boolean }

const SERVIDOR: Estado = { evento: null, instalada: false, ios: false }
const STANDALONE = '(display-mode: standalone)'

let estado: Estado = SERVIDOR
const oyentes = new Set<() => void>()

function cambiar(parche: Partial<Estado>): void {
  estado = { ...estado, ...parche }
  oyentes.forEach((alCambiar) => alCambiar())
}

function leerInstalada(): boolean {
  const navegador = navigator as Navigator & { standalone?: boolean }
  return estaInstalada(window.matchMedia(STANDALONE).matches, navegador.standalone === true)
}

if (typeof window !== 'undefined') {
  estado = {
    evento: null,
    instalada: leerInstalada(),
    ios: esIos(navigator.userAgent, navigator.platform, navigator.maxTouchPoints),
  }
  window.addEventListener('beforeinstallprompt', (evento) => {
    // Sin esto el navegador muestra su propia mini barra: la oferta es la entrada del menú.
    evento.preventDefault()
    cambiar({ evento: evento as EventoDeInstalacion })
  })
  window.addEventListener('appinstalled', () => cambiar({ evento: null, instalada: true }))
  window
    .matchMedia(STANDALONE)
    .addEventListener('change', () => cambiar({ instalada: leerInstalada() }))
}

function suscribirse(alCambiar: () => void): () => void {
  oyentes.add(alCambiar)
  return () => {
    oyentes.delete(alCambiar)
  }
}

const leer = () => estado
const leerEnServidor = () => SERVIDOR

export function useInstalacion(): { oferta: Oferta; instalar: () => Promise<void> } {
  const actual = useSyncExternalStore(suscribirse, leer, leerEnServidor)
  const oferta = ofrecerInstalacion({
    instalada: actual.instalada,
    ios: actual.ios,
    hayEvento: actual.evento !== null,
  })

  const instalar = useCallback(async () => {
    const evento = estado.evento
    if (!evento) return
    // Un evento sirve una sola vez, acepte o rechace la persona.
    cambiar({ evento: null })
    await evento.prompt()
    await evento.userChoice
  }, [])

  return { oferta, instalar }
}
