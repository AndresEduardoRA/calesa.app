// La guardia de los e2e: antes de gastar minutos en una corrida, las funciones edge que los specs
// llaman tienen que estar servidas. Si no lo están, falla en segundos diciendo qué correr.
//
// Antes había además un respaldo de la integración de apibara y un borrado de los leads «E2E …»,
// para cuidar una base local con datos de quien la usa. Ya no: la corrida completa parte de un
// `db:reset` (`pnpm test:e2e:completo`) y la base de desarrollo es descartable (docs/DECISIONES.md).
import { entorno } from './base'

// Las funciones que los specs llaman de verdad (el resto las intercepta el navegador).
const FUNCIONES = ['apibara', 'storage-gc'] as const

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
