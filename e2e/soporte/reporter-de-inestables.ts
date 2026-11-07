import { appendFileSync } from 'node:fs'
import { relative } from 'node:path'
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter'
import { avisoDeInestables, type Inestable } from '../../scripts/e2e-fallos'

// Avisa las pruebas que pasaron recién al reintentar. En CI hay un reintento (`retries: 1`, FLUJO-1): una prueba inestable ya no pone el PR en
// rojo ni lo devuelve a su carril, pero queda a la vista como anotación del PR y en el resumen de la corrida, para arreglar su causa.
export default class ReporterDeInestables implements Reporter {
  private readonly inestables: Inestable[] = []

  onTestEnd(test: TestCase, resultado: TestResult): void {
    if (resultado.status !== 'passed' || resultado.retry === 0) return
    this.inestables.push({
      archivo: relative(process.cwd(), test.location.file),
      linea: test.location.line,
      titulo: test.title,
      proyecto: test.parent.project()?.name ?? '',
    })
  }

  onEnd(): void {
    const { anotaciones, resumen } = avisoDeInestables(this.inestables)
    // Las órdenes de GitHub (`::warning …`) se leen de la salida estándar.
    for (const a of anotaciones) process.stdout.write(`${a}\n`)
    const archivo = process.env['GITHUB_STEP_SUMMARY']
    if (resumen && archivo) appendFileSync(archivo, resumen)
  }
}
