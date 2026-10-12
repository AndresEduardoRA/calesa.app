// Guardar los ajustes cuando el logo cambió, paso a paso. Es sólo el orden de las cosas (commit
// diferido, .claude/rules/datos.md): lo que sube, guarda y borra llega por puertos, así se prueba
// con dobles.
import { ok, type Resultado } from '@/shared/lib/errores'

export type CambioDeLogo<Logo> =
  { tipo: 'igual' } | { tipo: 'nuevo'; logo: Logo } | { tipo: 'quitar' }

type Puertos<Logo> = {
  subir: (logo: Logo) => Promise<Resultado<{ ruta: string }>>
  // `undefined` = no tocar el logo; `null` = quitarlo; una ruta = el recién subido.
  guardar: (logoRuta: string | null | undefined) => Promise<Resultado<{ actualizadoEn: string }>>
  descartar: (ruta: string) => Promise<void>
}

type Pedido<Logo> = {
  cambio: CambioDeLogo<Logo>
  // El logo que está guardado hoy, si hay.
  rutaGuardada: string | null
}

// 1. El logo nuevo se sube recién acá, al confirmar. Si no sube, no se guarda nada.
// 2. Se guardan los ajustes. Si fallan, el logo recién subido se descarta: no queda huérfano.
// 3. Si guardaron y el logo cambió, se descarta el anterior (sólo si ya nadie lo referencia).
export async function guardarConLogo<Logo>(
  puertos: Puertos<Logo>,
  pedido: Pedido<Logo>,
): Promise<Resultado<{ actualizadoEn: string; logoRuta: string | null }>> {
  const { cambio, rutaGuardada } = pedido
  let ruta: string | null | undefined = cambio.tipo === 'quitar' ? null : undefined
  if (cambio.tipo === 'nuevo') {
    const subida = await puertos.subir(cambio.logo)
    if (!subida.ok) {
      return subida
    }
    ruta = subida.data.ruta
  }

  const guardado = await puertos.guardar(ruta)
  if (!guardado.ok) {
    if (ruta && ruta !== rutaGuardada) {
      await puertos.descartar(ruta)
    }
    return guardado
  }

  if (ruta !== undefined && rutaGuardada && rutaGuardada !== ruta) {
    await puertos.descartar(rutaGuardada)
  }
  return ok({
    actualizadoEn: guardado.data.actualizadoEn,
    logoRuta: ruta === undefined ? rutaGuardada : ruta,
  })
}
