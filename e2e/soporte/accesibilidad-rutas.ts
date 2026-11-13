// Las rutas que recorre el barrido de accesibilidad (9.12): salen del árbol de `src/app` (cada `page.tsx`), no de una lista a mano ni de
// `docs/MAPA.md`, que no se versiona. Cada segmento dinámico (`[id]`) tiene su entrada en `DINAMICAS`: o arma la URL con lo que
// `sembrarTerreno` dejó en la base, o queda pendiente con la parte que lo resuelve. Una página dinámica nueva sin entrada hace caer la
// prueba de cobertura del spec.
import { readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { borrarLeadsDePrueba, crearLead } from './leads'
import { codigoDePaisDeLaEmpresa, telefonoAlAzar } from './leads-alta'
import { origenPorClave } from './origenes'
import { limpiarEspera, sembrarEspera } from './repuestos-espera'

export type Grupo = 'acceso' | 'app'
export type Ruta = { plantilla: string; grupo: Grupo }

const APP = join(process.cwd(), 'src', 'app')

function paginas(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name)
    if (entrada.isDirectory()) return paginas(ruta)
    return entrada.name === 'page.tsx' ? [ruta] : []
  })
}

// `(app)/leads/[id]/page.tsx` → `/leads/[id]`, en el grupo `app`. Las de fuera de `(acceso)` y `(app)` (no hay hoy) irían a `app`.
export function rutasDeLaApp(): Ruta[] {
  return paginas(APP)
    .map((archivo) => {
      const segmentos = relative(APP, archivo).split(sep).slice(0, -1)
      const grupo: Grupo = segmentos[0] === '(acceso)' ? 'acceso' : 'app'
      const visibles = segmentos.filter((s) => !/^\(.*\)$/.test(s))
      return { plantilla: `/${visibles.join('/')}`, grupo }
    })
    .sort((a, b) => a.plantilla.localeCompare(b.plantilla))
}

export const esDinamica = (plantilla: string) => plantilla.includes('[')

// Lo que se siembra para que las rutas dinámicas tengan a qué apuntar.
export type Terreno = {
  lead: string
  vehiculo: string
  origen: string
  proyectoDeRepuestos: string
}

export type Destino = { url: string } | { pendiente: string; motivo: string }

export const DINAMICAS: Record<string, (t: Terreno) => Destino> = {
  '/leads/[id]': (t) => ({ url: `/leads/${t.lead}` }),
  '/vehiculos/[id]': (t) => ({ url: `/vehiculos/${t.vehiculo}` }),
  '/logistica/vehiculo/[id]': (t) => ({ url: `/logistica/vehiculo/${t.vehiculo}` }),
  '/configuracion/origenes/[id]': (t) => ({ url: `/configuracion/origenes/${t.origen}` }),
  '/repuestos/[id]': (t) => ({ url: `/repuestos/${t.proyectoDeRepuestos}` }),
  '/cotizaciones/[id]': () => ({
    pendiente: '9.12-2',
    motivo:
      'una cotización pide la fórmula publicada de su origen y el origen sembrado no la tiene',
  }),
  '/repuestos/[id]/cotizaciones/[cotizacion]': () => ({
    pendiente: '9.12-5',
    motivo: 'falta sembrar una cotización de repuestos',
  }),
  '/configuracion/web/guias/[id]': () => ({
    pendiente: '9.12-5',
    motivo: 'falta sembrar una guía de la web',
  }),
}

// Sin sesión de recuperación, elegir la contraseña manda a pedir otro enlace: se barre lo que dibuja ese destino.
export const REDIRECCIONES: Record<string, string> = {
  '/auth/nueva-contrasena': '/recuperar',
}

const claveDelOrigen = (proyecto: string) => `a11y_${proyecto}`

export async function sembrarTerreno(proyecto: string, duena: string): Promise<Terreno> {
  const espera = await sembrarEspera(`A11y ${proyecto}`, claveDelOrigen(proyecto))
  const origen = await origenPorClave(`e2e_${claveDelOrigen(proyecto)}`)
  if (!origen) throw new Error('No quedó el origen sembrado del barrido')
  const lead = await crearLead({
    nombre: `Barrido ${proyecto}`,
    telefono: `${await codigoDePaisDeLaEmpresa()}${telefonoAlAzar()}`,
    deQuien: duena,
  })
  return {
    lead,
    vehiculo: espera.vehiculo,
    origen: origen.id,
    proyectoDeRepuestos: espera.proyectoDeRepuestos,
  }
}

export async function limpiarTerreno(proyecto: string): Promise<void> {
  await borrarLeadsDePrueba()
  await limpiarEspera(claveDelOrigen(proyecto))
}
