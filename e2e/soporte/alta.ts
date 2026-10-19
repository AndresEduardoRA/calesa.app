// Lo que repiten los e2e del alta rápida («Nuevo lead»): las personas con sus permisos, cómo se abre
// el drawer y un teclado que cuenta lo que se pulsa.
import { expect, type Locator, type Page } from '@playwright/test'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './base'
import { CLAVE } from './inventario'
import { borrarCamposDeLeadDePrueba } from './leads'
import { fijarCatalogosDeLead } from './leads-alta'
import { entrarConSesion } from './pasos'

export const CONTRASENA = CLAVE

export type PersonasDelAlta = {
  // Todo lo ve y lo crea (el rol de dueño).
  duena: string
  // Dos asesoras: crean leads y ven sólo los suyos.
  berta: string
  carlos: string
  // Ve leads de todos pero no crea ninguno, ni tiene cartera.
  sinCrear: string
  // Ve los leads «todos» y puede crear: no es de la cartera de lo ajeno.
  veTodos: string
  nombres: { berta: string; carlos: string }
}

const ASESORA = [
  'leads.crear',
  { clave: 'leads.ver', alcance: 'propios' as const },
  { clave: 'leads.editar', alcance: 'propios' as const },
  // Mover quién tiene el lead (y enviarlo a la papelera): los de su cartera como dueña.
  { clave: 'leads.compartir', alcance: 'propios' as const },
  { clave: 'leads.transferir', alcance: 'propios' as const },
  { clave: 'leads.eliminar', alcance: 'propios' as const },
]

// Crea la dueña, dos asesoras y dos personas más, y deja los orígenes y tipos de seguimiento que el
// drawer ofrece. Devuelve cómo restaurar los catálogos.
export async function prepararAlta(proyecto: string) {
  await borrarCamposDeLeadDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  const nombres = { berta: 'Berta Alta Prueba', carlos: 'Carlos Alta Prueba' }
  const personas: PersonasDelAlta = {
    duena: correoDePrueba(`duena-alta-${proyecto}`),
    berta: correoDePrueba(`berta-alta-${proyecto}`),
    carlos: correoDePrueba(`carlos-alta-${proyecto}`),
    sinCrear: correoDePrueba(`sincrear-alta-${proyecto}`),
    veTodos: correoDePrueba(`vetodos-alta-${proyecto}`),
    nombres,
  }
  await crearDuenaDePrueba({ email: personas.duena, contrasena: CONTRASENA, nombre: 'Dalia Alta' })
  const otras = [
    { email: personas.berta, nombre: nombres.berta, rol: 'berta', permisos: ASESORA },
    { email: personas.carlos, nombre: nombres.carlos, rol: 'carlos', permisos: ASESORA },
    {
      email: personas.sinCrear,
      nombre: 'Sin Crear Alta',
      rol: 'sincrear',
      permisos: [{ clave: 'leads.ver', alcance: 'todos' as const }],
    },
    {
      email: personas.veTodos,
      nombre: 'Ve Todos Alta',
      rol: 'vetodos',
      permisos: ['leads.crear', { clave: 'leads.ver', alcance: 'todos' as const }],
    },
  ]
  // La dueña va primero y sola (la primera persona nace dueña); las demás, a la vez: cada `createUser` tarda ~80 ms (bcrypt) y eran
  // cuatro en fila en cada `beforeAll`. `docs/RENDIMIENTO.md`, «Preparar y limpiar un spec».
  await Promise.all(
    otras.map(async (persona) => {
      await crearPersona({
        email: persona.email,
        contrasena: CONTRASENA,
        nombre: persona.nombre,
        invitada: true,
      })
      await darRolDePrueba({
        email: persona.email,
        rol: {
          nombre: `${PREFIJO_ROL_E2E}Alta ${persona.rol} ${proyecto}`,
          clave: `e2e_alta_${persona.rol}_${proyecto.replaceAll(/[^a-z0-9]/g, '_')}`,
        },
        permisos: persona.permisos,
      })
    }),
  )
  return { personas, restaurarCatalogos: await fijarCatalogosDeLead() }
}

export async function limpiarAlta(restaurarCatalogos: () => Promise<void>): Promise<void> {
  await borrarCamposDeLeadDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await restaurarCatalogos()
}

// Reusa la sesión de la cuenta dentro del spec (ver `entrarConSesion`).
export async function entrar(
  page: Page,
  correo: string,
  opciones?: { fresco?: boolean },
): Promise<void> {
  await entrarConSesion(page, correo, CONTRASENA, opciones)
}

export const dialogo = (page: Page): Locator => page.getByRole('dialog', { name: 'Nuevo lead' })

// La tecla N abre «Nuevo lead» recién cuando la página terminó de hidratar: se insiste hasta que
// abre. Con el panel ya pedido (la URL lo dice) no se vuelve a pulsar: la segunda «n» caería en el
// teléfono, que toma el foco. Con `teclado`, cuenta sólo la pulsación que abrió y devuelve el
// instante en que se hizo.
export async function abrirConN(page: Page, teclado?: Teclado): Promise<{ inicio: number }> {
  let inicio = 0
  await expect(async () => {
    if (!page.url().includes('panel=nuevo-lead')) {
      teclado?.reiniciar()
      inicio = performance.now()
      await (teclado ? teclado.pulsar('n') : page.keyboard.press('n'))
    }
    await expect(dialogo(page)).toBeVisible({ timeout: 1000 })
  }).toPass()
  // El drawer se abre al instante con su esqueleto mientras lee lo que necesita; las teclas siguientes son para el formulario. «Teléfono
  // principal» con el foco es lo que promete `docs/UX.md` («Foco en Teléfono principal»).
  await expect(dialogo(page).getByLabel('Teléfono principal')).toBeFocused({ timeout: 10_000 })
  return { inicio }
}

// El teclado de la persona: lo que se pulsa y lo que se tipea, para medir sin un solo clic.
export class Teclado {
  pulsaciones = 0
  caracteres = 0

  constructor(private readonly page: Page) {}

  reiniciar(): void {
    this.pulsaciones = 0
    this.caracteres = 0
  }

  async pulsar(tecla: string): Promise<void> {
    this.pulsaciones += 1
    await this.page.keyboard.press(tecla)
  }

  async escribir(texto: string): Promise<void> {
    this.caracteres += texto.length
    await this.page.keyboard.type(texto)
  }
}

// El teléfono nacional como se escribiría pegado de distintas maneras.
export function variantesDe(nacional: string, codigoDePais: string): string[] {
  return [
    `${nacional.slice(0, 3)} ${nacional.slice(3, 6)}-${nacional.slice(6)}`,
    `(${nacional.slice(0, 3)}) ${nacional.slice(3)}`,
    `0${nacional}`,
    `+${codigoDePais} ${nacional}`,
    `00${codigoDePais}${nacional}`,
  ]
}
