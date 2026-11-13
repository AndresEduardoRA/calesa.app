// Guardar los ajustes cuando cambió el logo o el logo para el tema oscuro, paso a paso. Es sólo el
// orden de las cosas (commit diferido, .claude/rules/datos.md): lo que sube, guarda y borra llega
// por puertos, así se prueba con dobles.
import { ok, type Resultado } from '@/shared/lib/errores'

export type CambioDeLogo<Logo> =
  { tipo: 'igual' } | { tipo: 'nuevo'; logo: Logo } | { tipo: 'quitar' }

// Por cada logo: `undefined` = no tocarlo; `null` = quitarlo; una ruta = el recién subido.
export type RutasDeLogos = {
  logoRuta: string | null | undefined
  logoOscuroRuta: string | null | undefined
}

type Puertos<Logo> = {
  subir: (logo: Logo) => Promise<Resultado<{ ruta: string }>>
  guardar: (rutas: RutasDeLogos) => Promise<Resultado<{ actualizadoEn: string }>>
  descartar: (ruta: string) => Promise<void>
}

type Espacio<Logo> = {
  cambio: CambioDeLogo<Logo>
  // El logo que está guardado hoy en este espacio, si hay.
  rutaGuardada: string | null
}

type Pedido<Logo> = { claro: Espacio<Logo>; oscuro: Espacio<Logo> }

// 1. Los logos nuevos se suben recién acá, al confirmar (el normal y después el oscuro). Si uno no
//    sube, no se guarda nada.
// 2. Se guardan los ajustes una sola vez, con los dos (una sola versión). Si fallan, o si falló una
//    subida, se descartan los recién subidos que no son un logo guardado hoy: no quedan huérfanos.
// 3. Si guardaron, se descartan los anteriores que ya no son ninguno de los dos logos. Cada ruta una
//    sola vez; `descartar` además sólo borra lo que nadie referencia.
export async function guardarConLogos<Logo>(
  puertos: Puertos<Logo>,
  pedido: Pedido<Logo>,
): Promise<
  Resultado<{ actualizadoEn: string; logoRuta: string | null; logoOscuroRuta: string | null }>
> {
  const espacios = [pedido.claro, pedido.oscuro] as const
  const guardadas = espacios.map((espacio) => espacio.rutaGuardada)
  const subidas: string[] = []
  const descartarSubidas = () =>
    descartarUnaVez(
      puertos,
      subidas.filter((ruta) => !guardadas.includes(ruta)),
    )

  const rutas: (string | null | undefined)[] = []
  for (const { cambio } of espacios) {
    if (cambio.tipo !== 'nuevo') {
      rutas.push(cambio.tipo === 'quitar' ? null : undefined)
      continue
    }
    const subida = await puertos.subir(cambio.logo)
    if (!subida.ok) {
      await descartarSubidas()
      return subida
    }
    subidas.push(subida.data.ruta)
    rutas.push(subida.data.ruta)
  }
  const [logoRuta, logoOscuroRuta] = rutas

  const guardado = await puertos.guardar({ logoRuta, logoOscuroRuta })
  if (!guardado.ok) {
    await descartarSubidas()
    return guardado
  }

  const finales = espacios.map((espacio, i) =>
    rutas[i] === undefined ? espacio.rutaGuardada : (rutas[i] ?? null),
  )
  await descartarUnaVez(
    puertos,
    guardadas.filter((ruta): ruta is string => ruta !== null && !finales.includes(ruta)),
  )
  return ok({
    actualizadoEn: guardado.data.actualizadoEn,
    logoRuta: finales[0] ?? null,
    logoOscuroRuta: finales[1] ?? null,
  })
}

async function descartarUnaVez<Logo>(puertos: Puertos<Logo>, rutas: string[]) {
  for (const ruta of new Set(rutas)) {
    await puertos.descartar(ruta)
  }
}
