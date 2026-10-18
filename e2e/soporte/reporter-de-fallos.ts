import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import type { FullResult, Reporter } from '@playwright/test/reporter'
import {
  CARPETA_DE_FALLOS,
  FALLOS_GUARDADOS,
  marcaDeFecha,
  sobrantes,
} from '../../scripts/e2e-fallos'

// Conserva lo de una corrida que falló (traza, video, captura, reporte) en `e2e-fallos/<fecha>/`, ignorada por git, antes de
// que la corrida siguiente vacíe `test-results/`. Va en TODA corrida —`pnpm test:e2e <spec>` también—, no sólo en la completa:
// el fallo de `listas-por-pagina` de la 9i salió de una corrida dirigida y no quedó nada para mirar. Quedan los cinco últimos.
const CARPETAS = ['test-results', 'playwright-report']

export default class ReporterDeFallos implements Reporter {
  // El reporte HTML se escribe en su propio `onEnd`: este reporter va último en la configuración y espera su turno.
  onEnd(resultado: FullResult): void {
    if (resultado.status === 'passed') {
      return
    }
    const destino = `${CARPETA_DE_FALLOS}/${marcaDeFecha(new Date())}`
    mkdirSync(destino, { recursive: true })
    for (const carpeta of CARPETAS) {
      if (existsSync(carpeta)) {
        cpSync(carpeta, `${destino}/${carpeta}`, { recursive: true })
      }
    }
    for (const viejo of sobrantes(readdirSync(CARPETA_DE_FALLOS), FALLOS_GUARDADOS)) {
      rmSync(`${CARPETA_DE_FALLOS}/${viejo}`, { recursive: true, force: true })
    }
    console.error(`\n[e2e] Falló: los artefactos quedaron en ${destino}/.\n`)
  }
}
