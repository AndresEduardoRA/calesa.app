// La guardia de los e2e: lo que una corrida que murió a mitad puede dejar en la base local (apibara
// apagada, leads de prueba) se repone antes de empezar y al terminar, y las funciones edge que
// necesitan los specs tienen que estar servidas antes de gastar minutos en una corrida que va a fallar.
//
// El respaldo vive en disco, no en una variable de cada spec: una corrida que no restauró lo deja
// escrito y la siguiente lo restaura ANTES de tomar uno nuevo. Así el estado malo no se respalda a sí
// mismo (pasó el 2026-10-14). La clave real de apibara nunca va a disco: sólo la marca de que había.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { admin, entorno } from './base'
import { PREFIJO_DE_LEAD_E2E } from './leads'

const RESPALDO = join(process.cwd(), 'e2e/.estado/respaldo.json')

type EstadoDeApibara = {
  activa: boolean
  config: unknown
  secreto_guardado_en: string | null
}

type Respaldo = { creadoEn: string; apibara: EstadoDeApibara }

// Las funciones que los specs llaman de verdad (el resto las intercepta el navegador).
const FUNCIONES = ['apibara', 'storage-gc'] as const

async function leerApibara(): Promise<EstadoDeApibara> {
  const { data, error } = await admin()
    .from('integraciones')
    .select('activa, config, secreto_guardado_en')
    .eq('clave', 'apibara')
    .single<EstadoDeApibara>()
  if (error) {
    throw new Error(`La guardia no pudo leer la integración de apibara: ${error.message}`)
  }
  return data
}

async function escribirApibara(estado: EstadoDeApibara): Promise<void> {
  const { error } = await admin().from('integraciones').update(estado).eq('clave', 'apibara')
  if (error) {
    throw new Error(`La guardia no pudo restaurar apibara: ${error.message}`)
  }
}

function leerRespaldo(): Respaldo | null {
  if (!existsSync(RESPALDO)) return null
  return JSON.parse(readFileSync(RESPALDO, 'utf8')) as Respaldo
}

// Antes de la corrida: repone lo que una anterior dejó torcido y guarda cómo está la base ahora.
export async function respaldarAntesDeCorrer(): Promise<void> {
  const pendiente = leerRespaldo()
  if (pendiente) {
    // Una corrida anterior no llegó a restaurar: lo respaldado ES el estado bueno. Nunca se pisa
    // con lo que hay en la base, que es lo que dejó el fallo.
    await escribirApibara(pendiente.apibara)
    rmSync(RESPALDO)
    console.warn(
      `[guardia] La corrida anterior (${pendiente.creadoEn}) no restauró la integración de apibara: ` +
        `se repuso desde el respaldo (${pendiente.apibara.activa ? 'activa' : 'apagada'}).`,
    )
  }
  mkdirSync(dirname(RESPALDO), { recursive: true })
  const respaldo: Respaldo = { creadoEn: new Date().toISOString(), apibara: await leerApibara() }
  writeFileSync(RESPALDO, JSON.stringify(respaldo, null, 2))
}

// Después de la corrida: restaura, comprueba que la clave sigue y que no quedó ningún lead de prueba.
export async function restaurarAlTerminar(): Promise<void> {
  const respaldo = leerRespaldo()
  if (respaldo) {
    await escribirApibara(respaldo.apibara)
    const ahora = await leerApibara()
    rmSync(RESPALDO)
    if (respaldo.apibara.secreto_guardado_en && !ahora.secreto_guardado_en) {
      throw new Error(
        'La integración de apibara tenía una clave guardada y ya no la tiene: vuelve a ponerla en ' +
          'Configuración › Empresa › Integraciones.',
      )
    }
  }
  const cliente = admin()
  const { error } = await cliente.from('leads').delete().like('nombre', `${PREFIJO_DE_LEAD_E2E}%`)
  if (error) {
    throw new Error(`La guardia no pudo borrar los leads de prueba: ${error.message}`)
  }
  const { count } = await cliente
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .like('nombre', `${PREFIJO_DE_LEAD_E2E}%`)
  if ((count ?? 0) > 0) {
    throw new Error(`Quedaron ${String(count)} leads de prueba en la base.`)
  }
}

// `OPTIONS` responde sin ejecutar nada (ni llama a apibara); una función que no está servida da 404
// o corta la conexión. El runtime local recicla sus procesos entre pedidos y alguno puede cortarse
// justo en medio: se insiste unas veces antes de darla por caída.
async function estaServida(url: string): Promise<boolean> {
  for (let intento = 0; intento < 4; intento++) {
    try {
      const respuesta = await fetch(url, { method: 'OPTIONS' })
      if (respuesta.status !== 404 && respuesta.status < 500) return true
    } catch {
      // Sin respuesta: se vuelve a intentar.
    }
    await new Promise((resolver) => setTimeout(resolver, 500))
  }
  return false
}

// Falla rápido si una función que un spec necesita no está servida. `E2E_SIN_FUNCIONES=1` lo salta
// (y lo avisa): los specs que las llaman fallarán por su cuenta.
export async function exigirFunciones(): Promise<void> {
  if (process.env['E2E_SIN_FUNCIONES'] === '1') {
    console.warn('[guardia] E2E_SIN_FUNCIONES=1: no se comprueba que las funciones estén servidas.')
    return
  }
  const base = entorno('NEXT_PUBLIC_SUPABASE_URL')
  const caidas: string[] = []
  for (const nombre of FUNCIONES) {
    if (!(await estaServida(`${base}/functions/v1/${nombre}`))) caidas.push(nombre)
  }
  if (caidas.length > 0) {
    throw new Error(
      `Las funciones edge no están servidas (${caidas.join(', ')}): corre \`npx supabase functions ` +
        'serve` en otra terminal, o `E2E_SIN_FUNCIONES=1` si no vas a correr los specs que las usan.',
    )
  }
}
