import { vi } from 'vitest'

// Sólo de las pruebas de contrato de los adaptadores: un `fetch` que registra lo que se pidió y devuelve lo que se le dio.
export type PedidoRegistrado = {
  url: string
  metodo: string | undefined
  cabeceras: Record<string, string>
  cuerpo: unknown
}

export function pedidoSimulado(respuesta: Response | Error) {
  const llamadas: PedidoRegistrado[] = []
  const pedir = vi.fn((url: string | URL | Request, init?: RequestInit) => {
    llamadas.push({
      url: String(url),
      metodo: init?.method,
      cabeceras: init?.headers as Record<string, string>,
      cuerpo: JSON.parse(String(init?.body)) as unknown,
    })
    return respuesta instanceof Error ? Promise.reject(respuesta) : Promise.resolve(respuesta)
  }) as unknown as typeof fetch
  return { pedir, llamadas }
}
