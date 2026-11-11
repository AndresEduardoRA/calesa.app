import 'server-only'
import { entornoPublico } from '@/shared/config/entorno'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import { createClient } from '@/shared/lib/supabase/server'
import {
  configDeWebPublica,
  esDireccionDeRevalidacion,
  esDireccionLocal,
} from '../entities/integraciones'
import {
  MOTIVO_PROBAR_SIN_DIRECCION,
  MOTIVO_PROBAR_SIN_SECRETO,
  MOTIVO_SIN_PERMISO_AJUSTES,
} from '../entities/motivos'
import type { ProbadorDeRevalidacion } from '../entities/repositorios'

const ESPERA_MS = 5000

type ClienteDeQuienPrueba = Awaited<ReturnType<typeof createClient>>

// La dirección guardada (nunca la del navegador), si hay secreto y si se puede probar desde aquí.
async function direccionAProbar(supabase: ClienteDeQuienPrueba): Promise<Resultado<URL>> {
  const leida = await supabase
    .from('integraciones')
    .select('config, secreto_guardado_en')
    .eq('clave', 'web_publica')
    .maybeSingle()
  if (leida.error) {
    return { ok: false, error: errorDePostgrest(leida.error) }
  }
  const direccion = configDeWebPublica(leida.data?.config).revalidar_url
  if (!direccion) {
    return fallo('regla', MOTIVO_PROBAR_SIN_DIRECCION)
  }
  if (!leida.data?.secreto_guardado_en) {
    return fallo('regla', MOTIVO_PROBAR_SIN_SECRETO)
  }
  // El loopback sólo se prueba si la base del despliegue también es de esta máquina (local, CI):
  // en la nube, apuntaría al propio servidor (D10 en docs/pasos/8.06-2/decisiones.md).
  const loopback = esDireccionLocal(entornoPublico().NEXT_PUBLIC_SUPABASE_URL)
  if (!esDireccionDeRevalidacion(direccion, { loopback })) {
    return fallo(
      'regla',
      'Esta dirección no se puede probar desde aquí: tiene que empezar con https:// y no apuntar a una red interna.',
    )
  }
  return ok(new URL(direccion))
}

// La segunda excepción del cliente admin (.claude/rules/datos.md): leer el secreto de Vault, que
// sólo entrega `integracion_secreto()` a `service_role`. El orden no se saltea: el permiso con el
// cliente de quien prueba, la dirección guardada y su regla, y recién entonces el admin, para una
// sola llamada. El secreto va a la cabecera del POST y a ningún otro lado: ni al resultado, ni a
// un log, ni al error.
export const probarRevalidacion: ProbadorDeRevalidacion = async () => {
  const supabase = await createClient()
  const permiso = await supabase.rpc('tiene_permiso', { p_clave: 'empresa.ajustes.gestionar' })
  if (permiso.error) {
    return { ok: false, error: errorDePostgrest(permiso.error) }
  }
  if (!permiso.data) {
    return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
  }
  const url = await direccionAProbar(supabase)
  if (!url.ok) {
    return url
  }

  const secreto = await createAdminClient().rpc('integracion_secreto', { p_clave: 'web_publica' })
  if (secreto.error || !secreto.data) {
    return fallo('regla', MOTIVO_PROBAR_SIN_SECRETO)
  }

  try {
    // Sin seguir redirecciones: un 3xx vuelve como código y el secreto no viaja a otro host. El
    // cuerpo es fijo y la respuesta no se lee.
    const respuesta = await fetch(url.data.href, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${secreto.data}` },
      body: '{"etiquetas":[]}',
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(ESPERA_MS),
    })
    await respuesta.body?.cancel()
    return ok({ codigo: respuesta.status, conHttps: url.data.protocol === 'https:' })
  } catch {
    return fallo('regla', 'La dirección no respondió en 5 segundos o no se pudo conectar.')
  }
}
