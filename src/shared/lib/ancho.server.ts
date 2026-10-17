import 'server-only'
import { cookies, headers } from 'next/headers'
import { COOKIE_DE_ANCHO, anchoDeLaPeticion } from './ancho'

// El ancho de quien pide (cookie o `user-agent`): lo lee el layout `(app)` y lo reparte `<ProveedorDeAncho>`.
export async function anchoDeEstaPeticion(): Promise<number> {
  const [galletas, cabeceras] = await Promise.all([cookies(), headers()])
  return anchoDeLaPeticion({
    cookie: galletas.get(COOKIE_DE_ANCHO)?.value,
    agente: cabeceras.get('user-agent'),
  })
}
