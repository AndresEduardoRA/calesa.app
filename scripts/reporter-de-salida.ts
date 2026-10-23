import { closeSync, mkdirSync, openSync, readdirSync, rmSync, writeSync } from 'node:fs'
import type { Reporter, Vitest } from 'vitest/node'
import {
  CARPETA_DE_SALIDAS,
  SALIDAS_GUARDADAS,
  sinColores,
  sobrantesDeSalidas,
} from './salida-de-test'

// Guarda sola la salida completa de una corrida de `pnpm test` en `test-salidas/<corrida>/salida.txt` (el JSON, a su lado,
// lo escribe el reporter `json`). Copia lo que Vitest escribe en stdout y stderr y lo sigue mostrando igual; cada escritura
// va directa al archivo, así que una corrida cortada con Ctrl+C deja lo que alcanzó a imprimir. No corre en modo watch.
export class ReporterDeSalida implements Reporter {
  constructor(private readonly corrida: string) {}

  onInit(vitest: Vitest): void {
    if (vitest.config.watch) {
      return
    }
    mkdirSync(`${CARPETA_DE_SALIDAS}/${this.corrida}`, { recursive: true })
    const nombre = this.corrida.split('/').pop() ?? this.corrida
    for (const viejo of sobrantesDeSalidas(
      readdirSync(CARPETA_DE_SALIDAS),
      nombre,
      SALIDAS_GUARDADAS,
    )) {
      rmSync(`${CARPETA_DE_SALIDAS}/${viejo}`, { recursive: true, force: true })
    }
    const archivo = openSync(`${CARPETA_DE_SALIDAS}/${this.corrida}/salida.txt`, 'a')
    process.once('exit', () => closeSync(archivo))
    for (const flujo of [process.stdout, process.stderr]) {
      const escribir = flujo.write.bind(flujo) as (...args: unknown[]) => boolean
      flujo.write = ((trozo: unknown, ...resto: unknown[]) => {
        try {
          writeSync(
            archivo,
            sinColores(
              typeof trozo === 'string' ? trozo : Buffer.from(trozo as Uint8Array).toString(),
            ),
          )
        } catch {
          // guardar la salida nunca tumba la corrida
        }
        return escribir(trozo, ...resto)
      }) as typeof flujo.write
    }
  }
}
