// El navegador de los avisos push, simulado. Chromium no deja suscribirse a un push real en una prueba (pide un servicio de
// push y un service worker registrado, que `next dev` no tiene), así que `simularPush` reemplaza `navigator.serviceWorker` y
// `Notification` por un doble que se comporta como el real, con la suscripción guardada en `sessionStorage` (sobrevive a
// recargar). Lo demás —la acción, la RPC, la fila— es real.
import type { Page } from '@playwright/test'

// Una clave pública P-256 (65 bytes, base64url) generada sólo para la prueba: no hay privada, no es un secreto. El
// `playwright.config.ts` la pone en `NEXT_PUBLIC_VAPID_PUBLIC_KEY` del servidor de e2e.
export const CLAVE_PUBLICA_DE_PRUEBA =
  'BI0seIt-Xo4G-O8GxFh5ZNB-I9DV3B-RCcBhOxlEPecvGdNMxm_r8dRv2kpxh06N32ib3uQts5U5S9y6MLAsEvI'

export type PermisoDelNavegador = 'default' | 'granted' | 'denied'

// Se llama antes de `page.goto`: el script corre en cada documento nuevo de la página.
export async function simularPush(
  page: Page,
  { permiso }: { permiso: PermisoDelNavegador },
): Promise<void> {
  await page.addInitScript(
    ({ permisoInicial }) => {
      const LLAVE = 'e2e-push-suscripcion'
      let permisoActual: string = permisoInicial
      const base64url = (bytes: Uint8Array) =>
        btoa(String.fromCharCode(...bytes))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')
      const azar = (largo: number) => crypto.getRandomValues(new Uint8Array(largo))

      type Guardada = { endpoint: string; p256dh: string; auth: string }
      const leer = (): Guardada | null => {
        const crudo = sessionStorage.getItem(LLAVE)
        return crudo ? (JSON.parse(crudo) as Guardada) : null
      }
      const comoSuscripcion = (guardada: Guardada) => ({
        endpoint: guardada.endpoint,
        toJSON: () => ({
          endpoint: guardada.endpoint,
          keys: { p256dh: guardada.p256dh, auth: guardada.auth },
        }),
        unsubscribe: () => {
          sessionStorage.removeItem(LLAVE)
          return Promise.resolve(true)
        },
      })

      const pushManager = {
        subscribe: (opciones: { userVisibleOnly?: boolean; applicationServerKey?: Uint8Array }) => {
          // Lo que haría el navegador real: sin `userVisibleOnly` y sin una clave de 65 bytes, rechaza.
          if (!opciones.userVisibleOnly || opciones.applicationServerKey?.length !== 65) {
            return Promise.reject(new DOMException('Opciones inválidas', 'AbortError'))
          }
          const punto = azar(65)
          punto[0] = 4
          const guardada = {
            endpoint: `https://fcm.googleapis.com/fcm/send/e2e-${base64url(azar(12))}`,
            p256dh: base64url(punto),
            auth: base64url(azar(16)),
          }
          sessionStorage.setItem(LLAVE, JSON.stringify(guardada))
          return Promise.resolve(comoSuscripcion(guardada))
        },
        getSubscription: () => {
          const guardada = leer()
          return Promise.resolve(guardada ? comoSuscripcion(guardada) : null)
        },
      }
      const registro = { pushManager }
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          register: () => Promise.resolve(registro),
          getRegistration: () => Promise.resolve(registro),
          ready: Promise.resolve(registro),
        },
      })
      Object.defineProperty(Notification, 'permission', {
        configurable: true,
        get: () => permisoActual,
      })
      Object.defineProperty(Notification, 'requestPermission', {
        configurable: true,
        value: () => {
          // Un permiso ya decidido no se vuelve a preguntar; en «default» queda como el de la prueba.
          permisoActual = permisoInicial === 'default' ? 'granted' : permisoInicial
          return Promise.resolve(permisoActual)
        },
      })
    },
    { permisoInicial: permiso },
  )
}
