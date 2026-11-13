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

export const CONOCIDOS: Conocido[] = []

// R7, los blancos táctiles de 44 px (9.12-5): dura en el celular en las pantallas de las fases 5 a 9. Lo que se arregló en sus módulos no puede
// volver; lo que queda es de `shared/ui` (el marco, las pestañas, el interruptor, la casilla, «Abrir» de las listas) y su tamaño es de la persona
// (`docs/PENDIENTES.md`: WCAG 2.5.8 AA pide 24 px; los 44 px son la regla del proyecto). Cada uno vale en toda ruta de
// esas pantallas con a lo más `max` apariciones, para que un segundo blanco chico del mismo descriptor no se esconda tras él.
export const RUTAS_DE_LAS_FASES_5_A_9 = [
  /^\/(actividad|agenda|chat|datos|notificaciones|tablero)$/,
  /^\/repuestos(\/|$)/,
  /^\/logistica(\/|$)/,
  /^\/configuracion\/(web|cola-web)(\/|$)/,
]

export const esDeLasFases5a9 = (ruta: string) => RUTAS_DE_LAS_FASES_5_A_9.some((r) => r.test(ruta))

export const BLANCOS_CONOCIDOS: { descriptor: string; max: number; de: string }[] = [
  { descriptor: 'a href=#contenido', max: 1, de: 'el salto al contenido del marco (`_shell`)' },
  { descriptor: 'button[data-slot=button][type=button]', max: 1, de: '«Nuevo lead» del marco' },
  { descriptor: 'button[data-slot=tabs-trigger][type=button][role=tab]', max: 6, de: '`Tabs`' },
  { descriptor: 'span[data-slot=switch][role=switch]', max: 4, de: '`Switch`' },
  { descriptor: 'span[data-slot=checkbox][role=checkbox]', max: 2, de: '`Checkbox`' },
  { descriptor: 'button[type=button]', max: 25, de: '«Abrir» de las listas (`AbrirResumen`)' },
  {
    descriptor: 'button[data-slot=button][type=submit]',
    max: 1,
    de: 'el envío apagado de la barra de filtros',
  },
]

export const esBlancoConocido = (ruta: string, h: { descriptor: string; n: number }) =>
  esDeLasFases5a9(ruta) &&
  BLANCOS_CONOCIDOS.some((c) => c.descriptor === h.descriptor && h.n <= c.max)
