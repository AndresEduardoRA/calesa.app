// El inventario y la lista de avisos del despliegue en seco, con una base simulada (un `Hallado` armado aquí, sin Postgres). 9.13-2.
import { describe, expect, it } from 'vitest'
import { esquemaDeLasFunciones } from '../../src/shared/config/esquemas'
import { avisosSobrantes, compararDbLint, leerDbLint, urlLocal, type Lista } from './avisos'
import { esperadoDelRepo, type Archivo } from './extraer'
import { compararInventario, type Hallado } from './inventario'
import { archivosDelRepo } from './repo'

const SECRETOS = Object.keys(esquemaDeLasFunciones.shape)

const REPO_CHICO: Archivo[] = [
  {
    ruta: 'supabase/migrations/20260101000000_base.sql',
    texto: [
      `create function public.programar() returns void language sql as $$ select cron.schedule('dentro', '* * * * *', 'select 1') $$;`,
      `select cron.schedule('afuera', '0 * * * *', $$select 1$$);`,
      `select cron.schedule('viejo', '0 * * * *', $$select 1$$);`,
      `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values`,
      `  ('fotos', 'fotos', true, 1, '{image/png,image/webp}'),`,
      `  ('papeles', 'papeles', false, 2, '{application/pdf}')`,
      `on conflict (id) do update set public = excluded.public;`,
      `select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'clave:fija';`,
      `select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'integracion:' || p_clave;`,
      `select vault.create_secret(new_secret => 'x', new_name => 'clave:fija');`,
      `select net.http_post(url := v_url || '/functions/v1/avisar');`,
    ].join('\n'),
  },
  {
    ruta: 'supabase/migrations/20260102000000_quitar.sql',
    texto: `select cron.unschedule('viejo');\nselect s.decrypted_secret from vault.decrypted_secrets s where s.name = 'url_proyecto';`,
  },
  {
    ruta: 'supabase/seed.sql',
    texto: `select vault.create_secret('http://x', 'url_proyecto', 'la url');`,
  },
  { ruta: 'supabase/config.toml', texto: '[functions.avisar]\nverify_jwt = false\n' },
  {
    ruta: 'supabase/functions/avisar/index.ts',
    texto: `const u = Deno.env.get('SUPABASE_URL')\nconst k = Deno.env.get("VAPID_PRIVATE_KEY")`,
  },
  { ruta: 'supabase/functions/avisar/index.test.ts', texto: `Deno.env.get('SOLO_EN_PRUEBA')` },
]

const HALLADO_CHICO: Hallado = {
  jobs: ['dentro', 'afuera'],
  buckets: [
    { id: 'fotos', publico: true },
    { id: 'papeles', publico: false },
  ],
  vault: ['clave:fija', 'url_proyecto'],
  llamadas: [{ desde: 'public.avisar_disparar()', nombre: 'avisar' }],
  posts: [
    { funcion: 'public.avisar_disparar()', destinos: ['avisar'] },
    { funcion: 'public.revalidar()', destinos: [] },
  ],
  triggers: [{ trigger: 'trg_avisar', tabla: 'mensajes', funcion: 'public.avisar_disparar()' }],
}

const esperado = (archivos = REPO_CHICO, secretos = ['VAPID_PRIVATE_KEY']) =>
  esperadoDelRepo(archivos, secretos)
const conCambio = (cambio: Partial<Hallado>): Hallado => ({ ...HALLADO_CHICO, ...cambio })

describe('el inventario: lo que el repo declara', () => {
  it('lee jobs dentro y fuera de funciones, saca los que un unschedule posterior quita, y las filas de un insert multilínea', () => {
    const e = esperado()
    expect(e.jobs.map((j) => j.nombre).sort()).toEqual(['afuera', 'dentro'])
    expect(e.buckets.map((b) => [b.id, b.publico])).toEqual([
      ['fotos', true],
      ['papeles', false],
    ])
    expect(e.vault.leidos.map((l) => l.nombre)).toEqual(['clave:fija', 'url_proyecto'])
    expect(e.vault.prefijos.map((l) => l.nombre)).toEqual(['integracion:'])
    expect(e.funciones).toEqual([
      { nombre: 'avisar', secretos: ['SUPABASE_URL', 'VAPID_PRIVATE_KEY'] },
    ])
    expect(e.noEntendidos).toEqual([])
  })

  it('un job o un secreto sin nombre literal es una falta, no un silencio', () => {
    const raro: Archivo[] = [
      ...REPO_CHICO,
      {
        ruta: 'supabase/migrations/20260103000000_raro.sql',
        texto: `\nselect cron.schedule(v_nombre, '* * * * *', 'select 1');`,
      },
      { ruta: 'supabase/functions/avisar/otro.ts', texto: `Deno.env.get(nombre)` },
    ]
    const { faltas } = compararInventario(esperado(raro), HALLADO_CHICO)
    expect(faltas).toContain('job sin nombre fijo en supabase/migrations/20260103000000_raro.sql:2')
    expect(faltas).toContain('un secreto sin nombre fijo en supabase/functions/avisar/otro.ts:1')
  })
})

describe('el inventario contra una base simulada', () => {
  it('completa: cero faltas, y lo que es de la persona va aparte', () => {
    const r = compararInventario(esperado(), HALLADO_CHICO)
    expect(r.faltas).toEqual([])
    expect(r.paraLaPersona).toEqual([
      'crear el secreto de Vault url_proyecto en producción (la base lo lee en supabase/migrations/20260102000000_quitar.sql; aquí lo pone supabase/seed.sql)',
      'los secretos de Vault integracion:* los crea la app al guardar la integración',
      'la función avisar pide los secretos VAPID_PRIVATE_KEY',
      'public.revalidar() llama a una URL que se configura en Integraciones',
    ])
    expect(r.resumen).toContain('trg_avisar en mensajes → avisar')
  })

  it('cae si falta un job que una migración declara, o si la base tiene uno que nadie declara', () => {
    expect(
      compararInventario(esperado(), conCambio({ jobs: ['afuera', 'intruso'] })).faltas,
    ).toEqual([
      'falta el job dentro, que declara supabase/migrations/20260101000000_base.sql',
      'job en la base sin declaración en el repo: intruso',
    ])
  })

  it('cae si falta una función: llamada sin carpeta, carpeta sin config, secreto que env:check no pide', () => {
    const sinConfig = REPO_CHICO.map((a) =>
      a.ruta === 'supabase/config.toml' ? { ...a, texto: '' } : a,
    )
    const h = conCambio({
      llamadas: [...HALLADO_CHICO.llamadas, { desde: 'public.otra()', nombre: 'fantasma' }],
    })
    expect(compararInventario(esperado(sinConfig, []), h).faltas).toEqual([
      'la función avisar no tiene [functions.avisar] en supabase/config.toml',
      'la base llama a /functions/v1/fantasma desde public.otra() y no hay supabase/functions/fantasma',
      'avisar lee VAPID_PRIVATE_KEY y env:check produccion no lo pide',
    ])
    expect(compararInventario(esperado(), conCambio({ llamadas: [] })).faltas).toEqual([
      'supabase/migrations/20260101000000_base.sql llama a /functions/v1/avisar y ninguna función de la base lo hace',
    ])
  })

  it('cae con un bucket ausente o de otra visibilidad, y con un secreto de Vault que la base lee y no está', () => {
    const h = conCambio({ buckets: [{ id: 'fotos', publico: false }], vault: ['url_proyecto'] })
    expect(compararInventario(esperado(), h).faltas).toEqual([
      'el bucket fotos es privado en la base y público en el repo',
      'falta el bucket papeles, que declara supabase/migrations/20260101000000_base.sql',
      'falta el secreto de Vault clave:fija, que la base lee en supabase/migrations/20260101000000_base.sql',
    ])
  })

  it('el repo real contra una base armada igual: cero faltas (los extractores entienden todo lo que hay)', () => {
    const e = esperadoDelRepo(archivosDelRepo(process.cwd()), SECRETOS)
    const h: Hallado = {
      jobs: e.jobs.map((j) => j.nombre),
      buckets: e.buckets.map(({ id, publico }) => ({ id, publico })),
      vault: e.vault.leidos.map((l) => l.nombre),
      llamadas: e.llamadas.map((l) => ({ desde: 'public.x()', nombre: l.nombre })),
      posts: [],
      triggers: [],
    }
    expect(compararInventario(e, h).faltas).toEqual([])
    expect(e.jobs.length).toBeGreaterThan(0)
    expect(e.funciones.length).toBeGreaterThan(0)
  })
})

describe('la lista de avisos contra la base real', () => {
  const lista: Lista = {
    avisos: [
      { lint: 'security_definer_view', clave: 'v_web_a' },
      { lint: 'security_definer_view', clave: 'v_web_b' },
    ],
    comodines: [
      { lint: 'authenticated_security_definer_function_executable' },
      { lint: 'pg_graphql_authenticated_table_exposed' },
    ],
    fuera: [{ lint: 'unused_index' }],
    db_lint: [
      { patron: 'public.f', avisos: 2 },
      { patron: 'public.g', avisos: 1 },
    ],
  }
  const avisos = [
    { name: 'security_definer_view', cache_key: 'v_web_a' },
    { name: 'authenticated_security_definer_function_executable', cache_key: 'k' },
  ]

  it('una entrada exacta que ya no aparece y un comodín sin avisos caen; un fuera no; el de GraphQL sólo con la extensión', () => {
    expect(avisosSobrantes(lista, avisos, false)).toEqual([
      'motivo de un aviso que ya no existe: security_definer_view · v_web_b',
    ])
    expect(avisosSobrantes(lista, avisos, true)).toEqual([
      'motivo de un aviso que ya no existe: security_definer_view · v_web_b',
      'comodín de un lint que no da ningún aviso: pg_graphql_authenticated_table_exposed',
    ])
  })

  it('db:lint: función sin motivo, conteo distinto y motivo sobrante caen; sin la línea de resultados cae', () => {
    const salida = `Linting schema: public\n${JSON.stringify({
      results: [
        { function: 'public.f', issues: [{}, {}, {}] },
        { function: 'public.nueva', issues: [{}] },
        { function: 'public.limpia', issues: [] },
      ],
    })}\nA new version…`
    expect(compararDbLint(lista, leerDbLint(salida))).toEqual([
      'db:lint cambió: public.f daba 2, ahora 3: revisa el motivo',
      'db:lint sin motivo: public.nueva (1 avisos)',
      'motivo de db:lint de una función que ya no da avisos: public.g',
    ])
    expect(compararDbLint(lista, leerDbLint('Linting schema: public\n'))).toEqual([
      'no se pudo leer la salida de db:lint (ni la línea {"results":…} ni el arreglo)',
    ])
  })

  // La CLI cambia de formato según quién la corre: con un agente (`AI_AGENT`, `CLAUDECODE`) imprime `{"results":…}` en una línea; en el CI,
  // el arreglo con sangría (9.13, CI 43393195184). Las dos salidas son la misma lista.
  it('db:lint: el arreglo con sangría del CI se lee igual que la línea de resultados del agente', () => {
    const resultados = [
      { function: 'public.f', issues: [{ level: 'warning' }, { level: 'warning' }] },
      { function: 'public.g', issues: [{ level: 'warning extra' }] },
    ]
    const agente = `Linting schema: web\n${JSON.stringify({ results: resultados })}\n`
    const ci = `Linting schema: web\n${JSON.stringify(resultados, null, 2)}\nA new version of Supabase CLI is available: v3.1.0\n`
    expect(leerDbLint(agente)).toEqual(resultados)
    expect(leerDbLint(ci)).toEqual(resultados)
    expect(compararDbLint(lista, leerDbLint(ci))).toEqual([])
    expect(leerDbLint(`Linting schema: web\n[\n  {\n    "function": "public.f",\n`)).toBeNull()
  })
})

describe('sólo una base local', () => {
  it('acepta los tres hosts locales y rechaza un host remoto o uno escondido en los parámetros', () => {
    for (const h of ['127.0.0.1', 'localhost', '[::1]'])
      expect(urlLocal(`postgresql://postgres:postgres@${h}:54822/postgres`).ok).toBe(true)
    expect(urlLocal('postgresql://postgres:postgres@127.0.0.1:54822/postgres')).toEqual({
      ok: true,
      datos: {
        host: '127.0.0.1',
        port: 54822,
        user: 'postgres',
        password: 'postgres',
        database: 'postgres',
      },
    })
    for (const u of [
      'postgresql://u:p@db.ejemplo.com:5432/postgres',
      'postgresql://u:p@127.0.0.1:5432/postgres?host=db.ejemplo.com',
      'postgresql://u:p@127.0.0.1:5432/postgres?hostaddr=10.0.0.1',
      'postgresql://u:p@127.0.0.1.ejemplo.com/postgres',
      'http://127.0.0.1/postgres',
    ])
      expect(urlLocal(u).ok, u).toBe(false)
  })
})
