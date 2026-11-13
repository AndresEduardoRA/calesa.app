// Los hallazgos de las reglas duras del barrido (9.12) que se conocen y todavía no se arreglan: cada uno con la parte del 9.12 que lo
// arregla. Uno nuevo que no esté aquí hace caer `e2e/accesibilidad.spec.ts`; uno de aquí que una corrida no ve no la hace caer (lo que se
// dibuja cambia con el proyecto y el estado): queda anotado como `conocido-sin-ver`. Al arreglarlo, su parte borra la entrada.
// La parte sale del dueño: `src/shared/ui` y Configuración → 9.12-3; leads, vehículos y cotizaciones → 9.12-2; lo demás → 9.12-5.
import type { Regla } from './accesibilidad'

export type Conocido = {
  ruta: string
  regla: Extract<Regla, 'nombre' | 'referencia'>
  descriptor: string
  parte: '9.12-2' | '9.12-3' | '9.12-5'
  motivo: string
}

export const CONOCIDOS: Conocido[] = []
