// `pnpm email:probar <destino>`: manda UN correo de prueba con el proveedor que dice `.env.local` (`EMAIL_PROVEEDOR`), por el mismo
// adaptador que usa la app. Es el único camino que manda un correo real, y sólo cuando se lo pides con un destino. Nunca imprime una
// clave. Qué pide cada proveedor: docs/ENTORNOS.md › «Correo».
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { parseEnv } from 'node:util'

import { z } from 'zod'

import { esquemaDelServidor, problemasDe } from '../src/shared/config/esquemas'
import { adaptadorDe, remitenteDe } from '../src/shared/lib/email/proveedor'

export type Salida = { salida: string[]; codigo: 0 | 1 }

const MENSAJE_DE_PRUEBA = {
  asunto: 'Prueba de correo de la app',
  texto: 'Si lees esto, el correo de la app sale por este proveedor.',
  html: '<p>Si lees esto, el correo de la app sale por este proveedor.</p>',
  etiquetas: { tipo: 'prueba' },
}

const NOTA_DE_CLOUDFLARE =
  'Nota: el contrato de Cloudflare se verificó con su documentación y con fetch simulado, no con un envío real (docs/ENTORNOS.md › Correo).'

const terminar = (codigo: 0 | 1, ...salida: string[]): Salida => ({ salida, codigo })

export async function probar(
  destino: string,
  valores: Record<string, string | undefined>,
  pedir?: typeof fetch,
): Promise<Salida> {
  if (!z.email().safeParse(destino).success)
    return terminar(1, '✗ El destino no es un correo: pnpm email:probar <destino>.')
  const problemas = problemasDe(esquemaDelServidor, valores)
  if (problemas.length > 0)
    return terminar(
      1,
      '✗ La configuración del servidor está incompleta (.env.local):',
      ...problemas.map((p) => `    ${p.variable}: ${p.motivo}`),
    )
  const entorno = esquemaDelServidor.parse(valores)
  if (entorno.EMAIL_PROVEEDOR === 'ninguno')
    return terminar(1, '✗ El correo está apagado (EMAIL_PROVEEDOR=ninguno): nada que probar.')
  const adaptador = adaptadorDe(entorno, pedir)
  if (!adaptador)
    return terminar(1, `✗ Falta la configuración de ${entorno.EMAIL_PROVEEDOR} (docs/ENTORNOS.md).`)
  const nota = entorno.EMAIL_PROVEEDOR === 'cloudflare' ? [NOTA_DE_CLOUDFLARE] : []
  const r = await adaptador({ ...MENSAJE_DE_PRUEBA, para: destino }, remitenteDe(entorno))
  return r.ok
    ? terminar(
        0,
        `✓ ${entorno.EMAIL_PROVEEDOR} aceptó el correo (id ${r.data.id}) para ${destino}.`,
        ...nota,
      )
    : terminar(1, `✗ ${r.error.mensaje}`, ...nota)
}

async function principal(): Promise<void> {
  const destino = process.argv[2] ?? ''
  const valores = existsSync('.env.local') ? parseEnv(readFileSync('.env.local', 'utf8')) : {}
  const { salida, codigo } = await probar(destino, valores)
  for (const linea of salida) process.stdout.write(`${linea}\n`)
  process.exit(codigo)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void principal()
}
