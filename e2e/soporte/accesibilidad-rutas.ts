// Las rutas que recorre el barrido de accesibilidad (9.12): salen del árbol de `src/app` (cada `page.tsx`), no de una lista a mano ni de
// `docs/MAPA.md`, que no se versiona. Cada segmento dinámico (`[id]`) tiene su entrada en `DINAMICAS`: o arma la URL con lo que
// `sembrarTerreno` dejó en la base, o queda pendiente con la parte que lo resuelve. Una página dinámica nueva sin entrada hace caer la
// prueba de cobertura del spec.
import { readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { idDePersona, sembrarCotizaciones } from './cotizaciones-sembradas'
import { borrarLeadsDePrueba, crearLead } from './leads'
import { codigoDePaisDeLaEmpresa, telefonoAlAzar } from './leads-alta'
import { origenPorClave } from './origenes'
import { limpiarEspera, sembrarEspera } from './repuestos-espera'
import { literal, sql } from './sql'

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
  cotizacion: string
  cotizacionDeRepuestos: string
  guia: string
}

export type Destino = { url: string } | { pendiente: string; motivo: string }

export const DINAMICAS: Record<string, (t: Terreno) => Destino> = {
  '/leads/[id]': (t) => ({ url: `/leads/${t.lead}` }),
  '/vehiculos/[id]': (t) => ({ url: `/vehiculos/${t.vehiculo}` }),
  '/logistica/vehiculo/[id]': (t) => ({ url: `/logistica/vehiculo/${t.vehiculo}` }),
  '/configuracion/origenes/[id]': (t) => ({ url: `/configuracion/origenes/${t.origen}` }),
  '/repuestos/[id]': (t) => ({ url: `/repuestos/${t.proyectoDeRepuestos}` }),
  '/cotizaciones/[id]': (t) => ({ url: `/cotizaciones/${t.cotizacion}` }),
  '/repuestos/[id]/cotizaciones/[cotizacion]': (t) => ({
    url: `/repuestos/${t.proyectoDeRepuestos}/cotizaciones/${t.cotizacionDeRepuestos}`,
  }),
  '/configuracion/web/guias/[id]': (t) => ({ url: `/configuracion/web/guias/${t.guia}` }),
}

// Sin sesión de recuperación, elegir la contraseña manda a pedir otro enlace: se barre lo que dibuja ese destino.
export const REDIRECCIONES: Record<string, string> = {
  '/auth/nueva-contrasena': '/recuperar',
}

const claveDelOrigen = (proyecto: string) => `a11y_${proyecto}`
const tituloDeLaCotizada = (proyecto: string) => `A11y cotizada ${proyecto}`
const slugDeLaGuia = (proyecto: string) => `e2e-guia-a11y-${proyecto}`

// Una cotización guardada para `/cotizaciones/[id]` (9.12-2): pide la fórmula publicada de su origen, así que va en la subasta de la semilla
// (como `presupuesto-js.spec.ts`), sobre un vehículo propio y creada por la dueña del barrido. Antes de sembrar, quita lo que dejó una corrida cortada.
function sembrarLaCotizada(proyecto: string, duena: string): string {
  quitarLaCotizada(proyecto)
  const origen = sql("select id from public.origenes where clave = 'subasta_usa'")
  const titulo = literal(tituloDeLaCotizada(proyecto))
  const vehiculo = sql(
    `insert into public.vehiculos (origen_id, titulo) values (${literal(origen)}::uuid, ${titulo}) returning id`,
  )
  sembrarCotizaciones({
    origenId: origen,
    vehiculoId: vehiculo,
    creadoPor: idDePersona(duena),
    cuantas: 1,
  })
  return sql(`select id from public.cotizaciones where vehiculo_id = ${literal(vehiculo)}::uuid`)
}

function quitarLaCotizada(proyecto: string): void {
  const titulo = literal(tituloDeLaCotizada(proyecto))
  sql(`
    delete from public.cotizaciones where vehiculo_id in (select id from public.vehiculos where titulo = ${titulo});
    delete from public.vehiculos where titulo = ${titulo}`)
}

// Una cotización de repuestos aceptada con una línea de cada bloque (9.12-5), para `/repuestos/[id]/cotizaciones/[cotizacion]`: se inserta por SQL como
// `repuestos-cotizaciones.spec.ts` (la hoja de lectura no pide un snapshot válido). La quita `limpiarTerreno` antes de borrar el proyecto.
function sembrarLaCotizacionDeRepuestos(proyecto: string, duena: string): string {
  const id = sql(`
    insert into public.repuestos_cotizaciones (proyecto_id, moneda, estado, config_snapshot, total, aceptada_en, creado_por)
      values (${literal(proyecto)}::uuid, 'USD', 'aceptada', '{}'::jsonb, 375, now(), ${literal(idDePersona(duena))}::uuid)
      returning id`)
  sql(`
    insert into public.repuestos_cotizaciones_lineas (cotizacion_id, descripcion, bloque, cantidad, costo, logistica_sugerida, caja, total, orden) values
      (${literal(id)}::uuid, 'Filtro importado', 'importado', 1, 80, 15, 10, 133, 0),
      (${literal(id)}::uuid, 'Aceite local', 'local', 2, 90, 15, 5, 242, 1)`)
  return id
}

// Una guía de la web en borrador (9.12-5), para `/configuracion/web/guias/[id]`.
function sembrarLaGuia(proyecto: string): string {
  const slug = literal(slugDeLaGuia(proyecto))
  sql(`delete from public.web_guias where slug = ${slug}`)
  return sql(
    `insert into public.web_guias (slug, titulo, cuerpo_html) values (${slug}, 'A11y guía ${proyecto}', '<p>Texto de la guía</p>') returning id`,
  )
}

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
    cotizacion: sembrarLaCotizada(proyecto, duena),
    cotizacionDeRepuestos: sembrarLaCotizacionDeRepuestos(espera.proyectoDeRepuestos, duena),
    guia: sembrarLaGuia(proyecto),
  }
}

export async function limpiarTerreno(proyecto: string): Promise<void> {
  quitarLaCotizada(proyecto)
  sql(`delete from public.web_guias where slug = ${literal(slugDeLaGuia(proyecto))}`)
  sql(`
    delete from public.repuestos_cotizaciones where proyecto_id in (
      select p.id from public.repuestos_proyectos p join public.vehiculos v on v.id = p.vehiculo_id
        join public.origenes o on o.id = v.origen_id where o.clave like ${literal(`e2e_${claveDelOrigen(proyecto)}%`)})`)
  await borrarLeadsDePrueba()
  await limpiarEspera(claveDelOrigen(proyecto))
}
