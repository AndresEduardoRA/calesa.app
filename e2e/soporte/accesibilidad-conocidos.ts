// Los hallazgos de las reglas duras del barrido (9.12) que se conocen y todavía no se arreglan: cada uno con la parte del 9.12 que lo
// arregla. Uno nuevo que no esté aquí hace caer `e2e/accesibilidad.spec.ts`; uno de aquí que una corrida no ve no la hace caer (lo que se
// dibuja cambia con el proyecto y el estado): queda anotado como `conocido-sin-ver`. Al arreglarlo, su parte borra la entrada.
// La parte sale del dueño: `src/shared/ui` y Configuración → 9.12-3; leads, vehículos y cotizaciones → 9.12-2; lo demás → 9.12-5.
import type { Regla } from './accesibilidad'

export type Conocido = {
  ruta: string
  regla: Extract<Regla, 'nombre' | 'referencia' | 'h1'>
  descriptor: string
  parte: '9.12-2' | '9.12-3' | '9.12-5'
  motivo: string
}

const SIN_H1 = 'la página no da su h1 (el barrido de la 9.12-1, R3); se le da en su módulo'

export const CONOCIDOS: Conocido[] = [
  {
    ruta: '/actividad',
    regla: 'h1',
    descriptor: '0 h1 visibles',
    parte: '9.12-5',
    motivo: SIN_H1,
  },
  {
    ruta: '/logistica',
    regla: 'h1',
    descriptor: '0 h1 visibles',
    parte: '9.12-5',
    motivo: SIN_H1,
  },
  {
    ruta: '/logistica/aduana',
    regla: 'h1',
    descriptor: '0 h1 visibles',
    parte: '9.12-5',
    motivo: SIN_H1,
  },
  {
    ruta: '/logistica/embarques',
    regla: 'h1',
    descriptor: '0 h1 visibles',
    parte: '9.12-5',
    motivo: SIN_H1,
  },
  {
    ruta: '/logistica/gastos',
    regla: 'h1',
    descriptor: '0 h1 visibles',
    parte: '9.12-5',
    motivo: SIN_H1,
  },
  {
    ruta: '/logistica/vehiculo/[id]',
    regla: 'h1',
    descriptor: '0 h1 visibles',
    parte: '9.12-5',
    motivo: SIN_H1,
  },
  {
    ruta: '/repuestos',
    regla: 'h1',
    descriptor: '0 h1 visibles',
    parte: '9.12-5',
    motivo: SIN_H1,
  },
]
