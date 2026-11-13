// El inventario del despliegue en seco: lo que el repo declara (`extraer.ts`) contra lo que la base local tiene (lo lee `revisar-base.mjs`).
// Puro: una base «simulada» es un `Hallado` armado a mano (`en-seco.test.ts`). Devuelve faltas (el guion no dice «listo») y lo que sólo puede
// hacer la persona en producción (9.13-2, C9).
import type { Esperado } from './extraer'

export type Hallado = {
  jobs: string[]
  buckets: { id: string; publico: boolean }[]
  vault: string[]
  /** Toda función de la base que nombra `/functions/v1/<nombre>` en su cuerpo. */
  llamadas: { desde: string; nombre: string }[]
  /** Toda función de la base que hace `net.http_post`, con las funciones edge que nombra (ninguna: una URL que se configura). */
  posts: { funcion: string; destinos: string[] }[]
  /** Los triggers de usuario cuya función hace `net.http_post`. */
  triggers: { trigger: string; tabla: string; funcion: string }[]
}

export type Inventario = { faltas: string[]; paraLaPersona: string[]; resumen: string }

// Los pone Supabase en toda función (docs de Edge Functions › secretos por defecto): no los pide `env:check produccion`.
export const SECRETOS_DE_LA_PLATAFORMA = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_URL',
]

function jobs(e: Esperado, h: Hallado): string[] {
  const enLaBase = new Set(h.jobs)
  const declarados = new Set(e.jobs.map((j) => j.nombre))
  return [
    ...e.jobs
      .filter((j) => !enLaBase.has(j.nombre))
      .map((j) => `falta el job ${j.nombre}, que declara ${j.archivo}`),
    ...h.jobs
      .filter((n) => !declarados.has(n))
      .map((n) => `job en la base sin declaración en el repo: ${n}`),
  ]
}

function buckets(e: Esperado, h: Hallado): string[] {
  const enLaBase = new Map(h.buckets.map((b) => [b.id, b.publico]))
  const declarados = new Set(e.buckets.map((b) => b.id))
  const tipo = (publico: boolean) => (publico ? 'público' : 'privado')
  return [
    ...e.buckets.flatMap((b) => {
      const publico = enLaBase.get(b.id)
      if (publico === undefined) return [`falta el bucket ${b.id}, que declara ${b.archivo}`]
      if (publico !== b.publico)
        return [`el bucket ${b.id} es ${tipo(publico)} en la base y ${tipo(b.publico)} en el repo`]
      return []
    }),
    ...h.buckets
      .filter((b) => !declarados.has(b.id))
      .map((b) => `bucket en la base sin declaración en el repo: ${b.id}`),
  ]
}

function vault(e: Esperado, h: Hallado, persona: string[]): string[] {
  const enLaBase = new Set(h.vault)
  const creados = new Set(e.vault.creadosEnMigraciones)
  for (const l of e.vault.leidos.filter((l) => !creados.has(l.nombre)))
    persona.push(
      `crear el secreto de Vault ${l.nombre} en producción (la base lo lee en ${l.archivo}; ` +
        (e.vault.creadosEnSemilla.includes(l.nombre)
          ? 'aquí lo pone supabase/seed.sql)'
          : 'ninguna migración lo crea)'),
    )
  for (const p of e.vault.prefijos)
    persona.push(`los secretos de Vault ${p.nombre}* los crea la app al guardar la integración`)
  return e.vault.leidos
    .filter((l) => !enLaBase.has(l.nombre))
    .map((l) => `falta el secreto de Vault ${l.nombre}, que la base lee en ${l.archivo}`)
}

function funciones(e: Esperado, h: Hallado, persona: string[]): string[] {
  const carpetas = new Set(e.funciones.map((f) => f.nombre))
  const config = new Set(e.configFunciones)
  const llamadasEnLaBase = new Set(h.llamadas.map((l) => l.nombre))
  const deProduccion = new Set(e.secretosDeProduccion)
  const plataforma = new Set(SECRETOS_DE_LA_PLATAFORMA)
  const leidos = new Set(e.funciones.flatMap((f) => f.secretos))
  const faltas = [
    ...e.funciones
      .filter((f) => !config.has(f.nombre))
      .map(
        (f) => `la función ${f.nombre} no tiene [functions.${f.nombre}] en supabase/config.toml`,
      ),
    ...e.configFunciones
      .filter((n) => !carpetas.has(n))
      .map((n) => `[functions.${n}] en supabase/config.toml sin supabase/functions/${n}/index.ts`),
    ...h.llamadas
      .filter((l) => !carpetas.has(l.nombre))
      .map(
        (l) =>
          `la base llama a /functions/v1/${l.nombre} desde ${l.desde} y no hay supabase/functions/${l.nombre}`,
      ),
    ...e.llamadas
      .filter((l) => !llamadasEnLaBase.has(l.nombre))
      .map(
        (l) =>
          `${l.archivo} llama a /functions/v1/${l.nombre} y ninguna función de la base lo hace`,
      ),
    ...e.funciones.flatMap((f) =>
      f.secretos
        .filter((s) => !plataforma.has(s) && !deProduccion.has(s))
        .map((s) => `${f.nombre} lee ${s} y env:check produccion no lo pide`),
    ),
    ...e.secretosDeProduccion
      .filter((s) => !leidos.has(s))
      .map((s) => `env:check produccion pide ${s} y ninguna función lo lee`),
  ]
  for (const f of e.funciones) {
    const propios = f.secretos.filter((s) => !plataforma.has(s))
    if (propios.length > 0)
      persona.push(`la función ${f.nombre} pide los secretos ${propios.join(', ')}`)
  }
  return faltas
}

function webhooks(h: Hallado, persona: string[]): string[] {
  const destinos = new Map(h.posts.map((p) => [p.funcion, p.destinos]))
  for (const p of h.posts.filter((p) => p.destinos.length === 0))
    persona.push(`${p.funcion} llama a una URL que se configura en Integraciones`)
  return h.triggers.map((t) => {
    const a = destinos.get(t.funcion) ?? []
    return `${t.trigger} en ${t.tabla} → ${a.length > 0 ? a.join(', ') : 'una URL de Integraciones'}`
  })
}

export function compararInventario(e: Esperado, h: Hallado): Inventario {
  const paraLaPersona: string[] = []
  const faltas = [
    ...e.noEntendidos,
    ...jobs(e, h),
    ...buckets(e, h),
    ...vault(e, h, paraLaPersona),
    ...funciones(e, h, paraLaPersona),
  ]
  const disparos = webhooks(h, paraLaPersona)
  const resumen =
    `${String(e.jobs.length)} jobs, ${String(e.buckets.length)} buckets, ` +
    `${String(e.vault.leidos.length)} secretos de Vault por nombre, ${String(e.funciones.length)} funciones, ` +
    `${String(new Set(h.llamadas.map((l) => l.nombre)).size)} funciones llamadas desde la base` +
    (disparos.length > 0 ? `; webhooks: ${disparos.join('; ')}` : '')
  return { faltas, paraLaPersona, resumen }
}
