// La CLI de punta a punta: un repo de verdad en una carpeta temporal, el estado en su carpeta común y un `gh` falso.
import assert from 'node:assert/strict'
import { execFile, execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { promisify } from 'node:util'

const CLI = new URL('./coordinador.mjs', import.meta.url).pathname
const PLAN = `esquema: plan/v1
agentes_disponibles: [claude]
carriles:
  - {id: datos, dueno_de: [supabase/]}
  - {id: ui, dueno_de: [src/app/, src/ui/]}
pasos:
  - {id: P01, titulo: Esquema, depende_de: [], carril: datos, riesgo: rojo, modulos: [supabase/migrations/],
     ruteo: {agente: claude, modelo: opus, effort: xhigh, modo: plan→manual, sesion: nueva, revisor: claude-sesion-nueva},
     verificacion: {nivel: 1, comando: pnpm db:probar}, terminado: db verde}
  - {id: P02, titulo: Inicio, depende_de: [], carril: ui, riesgo: verde, modulos: [src/app/],
     ruteo: {agente: claude, modelo: sonnet, effort: high, modo: auto, sesion: nueva, revisor: ninguno},
     verificacion: {nivel: 1, comando: pnpm test}, terminado: test verde}
  - {id: P03, titulo: Lista, depende_de: [P01, P02], carril: ui, riesgo: ambar, modulos: [src/ui/],
     ruteo: {agente: claude, modelo: sonnet, effort: high, modo: auto, sesion: nueva, revisor: ninguno},
     verificacion: {nivel: 1, comando: pnpm test}, terminado: test verde}
`

function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'coord-'))
  const g = (...a) => execFileSync('git', a, { cwd: dir })
  g('init', '-q', '-b', 'main')
  mkdirSync(join(dir, 'docs/semilla'), { recursive: true })
  writeFileSync(join(dir, 'docs/plan.yaml'), PLAN)
  g('add', '.')
  g('-c', 'user.email=a@b', '-c', 'user.name=t', 'commit', '-qm', 'plan')
  // gh falso: responde lo que diga $GH_RESPUESTAS/<pr>.json y anota los merges.
  const respuestas = join(dir, '.gh')
  mkdirSync(respuestas)
  const gh = join(respuestas, 'gh')
  writeFileSync(
    gh,
    `#!/usr/bin/env bash
case "$1 $2" in
  "pr view") cat "${respuestas}/$3.json" ;;
  "pr merge") echo "$3" >> "${respuestas}/merges"; echo "$*" >> "${respuestas}/merges-args"; echo '{"state":"MERGED"}' > "${respuestas}/$3.json" ;;
  "api -X") echo "$*" >> "${respuestas}/api" ;;
  "pr list") cat "${respuestas}/prs.json" 2>/dev/null || echo '[]' ;;
  "run list") cat "${respuestas}/runs.json" 2>/dev/null || echo '[]' ;;
  "run rerun") echo "$*" >> "${respuestas}/reruns" ;;
  "run view") if [[ "$*" == *--log-failed* ]]; then cat "${respuestas}/run-$3.log" || exit 2; else cat "${respuestas}/run-$3.json" || exit 2; fi ;;
  *) exit 2 ;;
esac
`,
  )
  chmodSync(gh, 0o755)
  const con = (extra, ...args) =>
    execFileSync('node', [CLI, ...args], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, COORD_GH: gh, COORD_USD_VENTANA: '', COORD_LIMPIAR: '0', ...extra },
    })
  const correr = (...args) => con({}, ...args)
  correr.con = con
  const correrAsync = (...args) =>
    promisify(execFile)('node', [CLI, ...args], {
      cwd: dir,
      env: { ...process.env, COORD_GH: gh, COORD_USD_VENTANA: '', COORD_LIMPIAR: '0' },
    })
  const pr = (n, datos) => writeFileSync(join(respuestas, `${n}.json`), JSON.stringify(datos))
  return { dir, correr, correrAsync, pr, respuestas }
}

const verde = [{ status: 'COMPLETED', conclusion: 'SUCCESS' }]

test('validar', () => {
  const { correr } = repo()
  assert.match(correr('validar'), /sin choques/)
})

test('dos carriles piden a la vez y reciben pasos distintos; el mismo carril no recibe dos', async () => {
  const { correrAsync } = repo()
  const [a, b, c] = await Promise.all([
    correrAsync('siguiente', 'datos'),
    correrAsync('siguiente', 'ui'),
    correrAsync('siguiente', 'ui'),
  ])
  const ja = JSON.parse(a.stdout)
  const jb = JSON.parse(b.stdout)
  const jc = JSON.parse(c.stdout)
  assert.equal(ja.paso, 'P01')
  assert.equal(ja.rama, 'datos/p01')
  assert.equal(ja.ruteo.modelo, 'opus')
  assert.equal(jb.paso, 'P02')
  assert.equal(jc.paso, 'P02') // el segundo pedido del mismo carril retoma el mismo paso
  assert.deepEqual([jb.retomar, jc.retomar].sort(), [false, true]) // cuál llega primero lo decide el candado
})

test('el ciclo completo: publicar, sincronizar, integrar solo lo que se puede', () => {
  const { dir, correr, pr, respuestas } = repo()
  JSON.parse(correr('siguiente', 'datos'))
  JSON.parse(correr('siguiente', 'ui'))
  correr('publicado', 'P01', '11')
  correr('publicado', 'P02', '12')
  pr(11, { state: 'OPEN', mergeable: 'MERGEABLE', statusCheckRollup: verde })
  pr(12, { state: 'OPEN', mergeable: 'MERGEABLE', statusCheckRollup: verde })

  let informe = correr('sincronizar')
  assert.match(informe, /P01: CI en verde; es rojo: lo integra la persona \(#11\)/)
  assert.match(informe, /P02: integrado por el coordinador \(#12, verde\)/)
  assert.equal(readFileSync(join(respuestas, 'merges'), 'utf8').trim(), '12')

  // P03 espera a P01, que es rojo: la persona lo integra en GitHub.
  assert.match(JSON.parse(correr('siguiente', 'ui')).motivo, /P03 espera a que se integren: P01/)
  pr(11, { state: 'MERGED' })
  assert.match(correr('sincronizar'), /P01: integrado \(#11\)/)
  assert.equal(JSON.parse(correr('siguiente', 'ui')).paso, 'P03')

  const estado = JSON.parse(readFileSync(join(dir, '.git/coordinador/estado.json'), 'utf8'))
  assert.equal(estado.pasos.P02.integro, 'coordinador')
  assert.match(correr('tablero'), /2 de 3 pasos integrados/)
})

test('un PR en rojo o en conflicto vuelve a su carril', () => {
  const { correr, pr } = repo()
  correr('siguiente', 'ui')
  correr('publicado', 'P02', '5')
  pr(5, { state: 'OPEN', mergeable: 'CONFLICTING', statusCheckRollup: verde })
  assert.match(correr('sincronizar'), /P02: conflicto con main \(#5\): vuelve a su carril/)
  const r = JSON.parse(correr('siguiente', 'ui'))
  assert.equal(r.paso, 'P02')
  assert.equal(r.arreglar, 'conflicto con main')
  correr('publicado', 'P02', '5')
  pr(5, {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    statusCheckRollup: [{ status: 'COMPLETED', conclusion: 'FAILURE' }],
  })
  assert.match(correr('sincronizar'), /P02: CI en rojo/)
})

test('CI todavía corriendo: no integra', () => {
  const { correr, pr } = repo()
  correr('siguiente', 'ui')
  correr('publicado', 'P02', '8')
  pr(8, {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    statusCheckRollup: [{ status: 'IN_PROGRESS', conclusion: null }],
  })
  assert.equal(correr('sincronizar').trim(), '')
})

test('un estado de commit pendiente (otro servicio) no es un CI en rojo: espera; en ERROR, sí', () => {
  const { correr, pr } = repo()
  correr('siguiente', 'ui')
  correr('publicado', 'P02', '9')
  pr(9, {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    statusCheckRollup: [
      ...verde,
      { __typename: 'StatusContext', context: 'otro-servicio', state: 'PENDING' },
    ],
  })
  assert.equal(correr('sincronizar').trim(), '')
  pr(9, {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    statusCheckRollup: [
      ...verde,
      { __typename: 'StatusContext', context: 'otro-servicio', state: 'ERROR' },
    ],
  })
  assert.match(correr('sincronizar'), /P02: CI en rojo \(#9\)/)
})

// De corrido (2026-11-09): la vista previa de Vercel no es el CI del proyecto (usa la demo y no migra) y su tope diario de despliegues
// daría rojos que no son del código.
test('el estado de Vercel no decide: ni su pendiente frena ni su error devuelve el paso', () => {
  const { correr, pr } = repo()
  correr('siguiente', 'ui')
  correr('publicado', 'P02', '9')
  pr(9, {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    statusCheckRollup: [
      ...verde,
      { __typename: 'StatusContext', context: 'Vercel', state: 'ERROR' },
    ],
  })
  assert.match(correr('sincronizar'), /P02: integrado por el coordinador \(#9, verde\)/)
})

test('un rojo firme (Nivel 1, Carriles) vuelve a su carril sin reintento y sin esperar al resto del CI', () => {
  const { correr, pr, respuestas } = repo()
  correr('siguiente', 'ui')
  correr('publicado', 'P02', '12')
  pr(12, {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    headRefOid: 'abc',
    statusCheckRollup: [
      { name: 'Carriles · lo que el PR puede tocar', status: 'COMPLETED', conclusion: 'FAILURE' },
      { name: 'e2e · bloque 1 de 4', status: 'IN_PROGRESS' },
    ],
  })
  writeFileSync(
    join(respuestas, 'runs.json'),
    JSON.stringify([{ databaseId: 77, conclusion: 'failure' }]),
  )
  assert.match(correr('sincronizar'), /P02: CI en rojo \(#12\): vuelve a su carril/)
  assert.throws(() => readFileSync(join(respuestas, 'reruns'), 'utf8'))
  assert.equal(JSON.parse(correr('siguiente', 'ui')).arreglar, 'CI en rojo')
})

test('un CI cancelado sin otra corrida detrás se vuelve a correr una vez; si queda igual, es un rojo', () => {
  const { correr, pr, respuestas } = repo()
  const env = { COORD_COLGADO_ESPERA: '0' }
  correr('siguiente', 'ui')
  correr('publicado', 'P02', '12')
  const colgado = {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    headRefOid: 'abc',
    statusCheckRollup: [
      ...verde,
      { name: 'e2e · bloque 1 de 1', status: 'COMPLETED', conclusion: 'CANCELLED' },
    ],
  }
  pr(12, colgado)
  writeFileSync(
    join(respuestas, 'runs.json'),
    JSON.stringify([{ databaseId: 88, conclusion: 'cancelled' }]),
  )
  assert.equal(correr.con(env, 'sincronizar').trim(), '') // la primera vez sólo lo anota
  assert.match(
    correr.con(env, 'sincronizar'),
    /el CI de #12 quedó cancelado sin otra corrida detrás: lo vuelvo a correr, una vez/,
  )
  assert.equal(readFileSync(join(respuestas, 'reruns'), 'utf8').trim(), 'run rerun 88')
  assert.match(correr.con(env, 'sincronizar'), /P02: CI en rojo \(#12\): vuelve a su carril/)
  // Con otra corrida en marcha no está colgado: espera.
  const otro = repo()
  otro.correr('siguiente', 'ui')
  otro.correr('publicado', 'P02', '13')
  otro.pr(13, {
    ...colgado,
    statusCheckRollup: [...colgado.statusCheckRollup, { name: 'Nivel 1', status: 'IN_PROGRESS' }],
  })
  assert.equal(otro.correr.con(env, 'sincronizar').trim(), '')
  assert.equal(otro.correr.con(env, 'sincronizar').trim(), '')
})

test('un CI rojo se vuelve a correr una vez por commit antes de devolver el paso; la segunda, vuelve a su carril', () => {
  const { correr, pr, respuestas } = repo()
  correr('siguiente', 'ui')
  correr('publicado', 'P02', '12')
  const rojo = {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    headRefOid: 'def456',
    statusCheckRollup: [...verde, { status: 'COMPLETED', conclusion: 'FAILURE' }],
  }
  pr(12, rojo)
  writeFileSync(
    join(respuestas, 'runs.json'),
    JSON.stringify([
      { databaseId: 77, conclusion: 'failure' },
      { databaseId: 78, conclusion: 'success' },
    ]),
  )
  assert.match(
    correr('sincronizar'),
    /P02: CI en rojo \(#12\): vuelvo a correr lo que cayó, una vez/,
  )
  assert.equal(readFileSync(join(respuestas, 'reruns'), 'utf8').trim(), 'run rerun 77 --failed')
  assert.equal(JSON.parse(correr('siguiente', 'ui')).accion, 'esperar') // no vuelve al carril todavía
  pr(12, rojo) // el mismo commit sigue rojo tras el reintento
  assert.match(correr('sincronizar'), /P02: CI en rojo \(#12\): vuelve a su carril/)
  assert.equal(readFileSync(join(respuestas, 'reruns'), 'utf8').trim(), 'run rerun 77 --failed')
})

test('un rojo del entorno (cayó un paso que no es una prueba, con la red en el log) se vuelve a correr varias veces y no vuelve a su carril', () => {
  const { correr, pr, respuestas } = repo()
  correr('siguiente', 'ui')
  correr('publicado', 'P02', '12')
  const rojo = {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    headRefOid: 'def456',
    statusCheckRollup: [...verde, { status: 'COMPLETED', conclusion: 'FAILURE' }],
  }
  pr(12, rojo)
  writeFileSync(
    join(respuestas, 'runs.json'),
    JSON.stringify([{ databaseId: 77, conclusion: 'failure' }]),
  )
  const jobs = (paso) =>
    JSON.stringify({
      jobs: [{ conclusion: 'failure', steps: [{ name: paso, conclusion: 'failure' }] }],
    })
  writeFileSync(join(respuestas, 'run-77.json'), jobs('chromium y lo que pide del sistema'))
  writeFileSync(
    join(respuestas, 'run-77.log'),
    "Temporary failure resolving 'azure.archive.ubuntu.com'\n",
  )
  const sinEspera = { COORD_ENTORNO_ESPERA: '0', COORD_ENTORNO_MAX: '3' }
  assert.match(
    correr.con(sinEspera, 'sincronizar'),
    /P02: CI en rojo \(#12\): rojo del entorno \(«chromium y lo que pide del sistema»\), no del código: vuelvo a correr lo que cayó \(1 de 3\)/,
  )
  assert.match(correr.con(sinEspera, 'sincronizar'), /2 de 3/)
  // Entre una corrida y la otra espera callado, sin devolver el paso.
  assert.doesNotMatch(correr.con({ COORD_ENTORNO_MAX: '3' }, 'sincronizar'), /P02/)
  assert.equal(JSON.parse(correr('siguiente', 'ui')).accion, 'esperar')
  assert.match(correr.con(sinEspera, 'sincronizar'), /3 de 3/)
  assert.equal(readFileSync(join(respuestas, 'reruns'), 'utf8').trim().split('\n').length, 3)
  // Agotadas las veces, es un rojo como cualquiera.
  assert.match(correr.con(sinEspera, 'sincronizar'), /P02: CI en rojo \(#12\): vuelve a su carril/)
})

test('una prueba que cae con la red en el log no es un rojo del entorno: una vez y vuelve a su carril', () => {
  const { correr, pr, respuestas } = repo()
  correr('siguiente', 'ui')
  correr('publicado', 'P02', '12')
  pr(12, {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    headRefOid: 'def456',
    statusCheckRollup: [...verde, { status: 'COMPLETED', conclusion: 'FAILURE' }],
  })
  writeFileSync(
    join(respuestas, 'runs.json'),
    JSON.stringify([{ databaseId: 77, conclusion: 'failure' }]),
  )
  writeFileSync(
    join(respuestas, 'run-77.json'),
    JSON.stringify({
      jobs: [
        {
          conclusion: 'failure',
          steps: [{ name: 'e2e (dirigidos), bloque 1 de 4', conclusion: 'failure' }],
        },
      ],
    }),
  )
  writeFileSync(join(respuestas, 'run-77.log'), 'Error: read ECONNRESET\n')
  assert.match(correr('sincronizar'), /vuelvo a correr lo que cayó, una vez/)
  assert.match(correr('sincronizar'), /P02: CI en rojo \(#12\): vuelve a su carril/)
})

test('un PR suelto de una rama fix/ de este repo se integra con el CI en verde; el de un fork, un borrador u otra rama, no', () => {
  const { correr, pr, respuestas } = repo()
  const listo = {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    headRefOid: 'aaa111',
    statusCheckRollup: verde,
  }
  for (const n of [31, 32, 33, 34]) pr(n, listo)
  writeFileSync(
    join(respuestas, 'prs.json'),
    JSON.stringify([
      { number: 31, headRefName: 'fix/ci', isCrossRepository: false, isDraft: false },
      { number: 32, headRefName: 'fix/de-afuera', isCrossRepository: true, isDraft: false },
      { number: 33, headRefName: 'fix/a-medias', isCrossRepository: false, isDraft: true },
      { number: 34, headRefName: 'otra/cosa', isCrossRepository: false, isDraft: false },
    ]),
  )
  assert.match(correr('sincronizar'), /#31 \(fix\/ci\): integrado por el coordinador/)
  assert.equal(readFileSync(join(respuestas, 'merges'), 'utf8').trim(), '31')
  assert.match(
    readFileSync(join(respuestas, 'merges-args'), 'utf8'),
    /--squash --match-head-commit aaa111/,
  )
})

test('con un job todavía corriendo, un rojo no devuelve el paso: espera a que termine', () => {
  const { correr, pr } = repo()
  correr('siguiente', 'ui')
  correr('publicado', 'P02', '13')
  pr(13, {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    statusCheckRollup: [
      { status: 'COMPLETED', conclusion: 'FAILURE' },
      { status: 'IN_PROGRESS', conclusion: null },
    ],
  })
  assert.equal(correr('sincronizar').trim(), '')
})

test('un job cancelado no es un CI en rojo: el PR espera la corrida siguiente', () => {
  const { correr, pr } = repo()
  correr('siguiente', 'ui')
  correr('publicado', 'P02', '10')
  pr(10, {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    statusCheckRollup: [...verde, { status: 'COMPLETED', conclusion: 'CANCELLED' }],
  })
  assert.equal(correr('sincronizar').trim(), '')
  assert.equal(JSON.parse(correr('siguiente', 'ui')).accion, 'esperar')
})

test('liberar e integrado a mano; transición inválida falla con mensaje', () => {
  const { correr } = repo()
  correr('siguiente', 'datos')
  assert.match(correr('liberar', 'P01', 'me', 'arrepentí'), /vuelve a pendiente/)
  assert.throws(() => correr('integrado', 'P01'), /no puede pasar de pendiente a integrado/)
})

test('una parte publicada (parcial) se integra con su CI en verde, con merge y sin soltar el paso', () => {
  const { dir, correr, pr, respuestas } = repo()
  correr('siguiente', 'ui')
  assert.match(correr('parcial', 'P02', '21'), /parte publicada \(#21\)/)
  pr(21, { state: 'OPEN', mergeable: 'MERGEABLE', statusCheckRollup: verde })
  assert.match(correr('sincronizar'), /P02: parte integrada por el coordinador \(#21, verde\)/)
  assert.equal(readFileSync(join(respuestas, 'merges'), 'utf8').trim(), '21')
  const estado = JSON.parse(readFileSync(join(dir, '.git/coordinador/estado.json'), 'utf8'))
  assert.equal(estado.pasos.P02.estado, 'asignado')
  assert.equal(estado.pasos.P02.pr_parcial, undefined)
  assert.throws(() => correr('parcial', 'P01', '22'), /no está asignado/)
  // La última parte en el mismo PR: deja de ser parte.
  correr('parcial', 'P02', '23')
  correr('publicado', 'P02', '23')
  const despues = JSON.parse(readFileSync(join(dir, '.git/coordinador/estado.json'), 'utf8'))
  assert.equal(despues.pasos.P02.pr_parcial, undefined)
  assert.equal(despues.pasos.P02.pr, 23)
})

test('un pedido: lo anota quien espera, lo toma el dueño antes que lo suyo y el coordinador lo integra', () => {
  const { dir, correr, pr, respuestas } = repo()
  const pd = JSON.parse(
    correr('pedir', 'ui', 'P02', 'un índice para la lista', 'supabase/migrations/x.sql'),
  )
  assert.equal(pd.id, 'pedido-1')
  assert.equal(pd.para, 'datos')
  assert.equal(pd.nuevo, true)
  assert.equal(JSON.parse(correr('pedir', 'ui', 'P02', 'otra vez')).nuevo, false)
  const r = JSON.parse(correr('siguiente', 'datos'))
  assert.equal(r.paso, 'pedido-1')
  assert.equal(r.rama, 'datos/pedido-1')
  assert.deepEqual(r.pedido, {
    de: 'ui',
    paso: 'P02',
    texto: 'un índice para la lista',
    archivos: ['supabase/migrations/x.sql'],
  })
  correr('publicado', 'pedido-1', '41')
  pr(41, { state: 'OPEN', mergeable: 'MERGEABLE', statusCheckRollup: verde })
  assert.match(
    correr('sincronizar'),
    /pedido-1: integrado por el coordinador \(#41\); el carril ui se retoma/,
  )
  assert.equal(readFileSync(join(respuestas, 'merges'), 'utf8').trim(), '41')
  const estado = JSON.parse(readFileSync(join(dir, '.git/coordinador/estado.json'), 'utf8'))
  assert.equal(estado.pedidos[0].estado, 'integrado')
  assert.equal(JSON.parse(correr('siguiente', 'datos')).paso, 'P01')
})

test('integra el commit que vio el CI, y un PR que toca las guardas del piloto lo deja para la persona', () => {
  const { correr, pr, respuestas } = repo()
  correr('siguiente', 'ui')
  correr('publicado', 'P02', '61')
  pr(61, {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    statusCheckRollup: verde,
    headRefOid: 'abc123',
    files: [{ path: 'scripts/piloto/bucle.sh' }, { path: 'src/app/x.tsx' }],
  })
  assert.match(
    correr('sincronizar'),
    /P02: #61 toca las guardas del piloto \(scripts\/piloto\/bucle\.sh\): lo integra la persona/,
  )
  pr(61, {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    statusCheckRollup: verde,
    headRefOid: 'abc123',
    headRefName: 'ui/p02',
    files: [{ path: 'src/app/x.tsx' }],
  })
  assert.match(correr('sincronizar'), /P02: integrado por el coordinador \(#61, verde\)/)
  // Sin --delete-branch (borraba la rama local y pasaba a main el worktree donde corre el coordinador): la remota, por la API.
  assert.match(
    readFileSync(join(respuestas, 'merges-args'), 'utf8'),
    /pr merge 61 --squash --match-head-commit abc123/,
  )
  assert.doesNotMatch(readFileSync(join(respuestas, 'merges-args'), 'utf8'), /--delete-branch/)
  assert.match(
    readFileSync(join(respuestas, 'api'), 'utf8'),
    /api -X DELETE repos\/\{owner\}\/\{repo\}\/git\/refs\/heads\/ui\/p02/,
  )
})

test('cerrar-pedido: el dueño lo cerró sin cambios y no se lo vuelve a dar; pedido <id> lo muestra', () => {
  const { correr } = repo()
  correr('pedir', 'ui', 'P02', 'un índice', 'supabase/migrations/x.sql')
  assert.equal(JSON.parse(correr('siguiente', 'datos')).paso, 'pedido-1')
  assert.match(correr('cerrar-pedido', 'pedido-1', 'ya', 'estaba'), /cerrado sin cambios/)
  assert.deepEqual(
    (({ estado, sin_cambios, motivo }) => ({ estado, sin_cambios, motivo }))(
      JSON.parse(correr('pedido', 'pedido-1')),
    ),
    { estado: 'integrado', sin_cambios: true, motivo: 'ya estaba' },
  )
  assert.equal(JSON.parse(correr('siguiente', 'datos')).paso, 'P01')
})

// De corrido (2026-11-09).
test('aparcar y reanudar: el paso aparcado no se vuelve a dar hasta enfriarse; siguiente trae puerta, cierre y fase del plan', () => {
  const { dir, correr } = repo()
  const plan = readFileSync(join(dir, 'docs/plan.yaml'), 'utf8').replace(
    'carril: ui, riesgo: verde',
    'carril: ui, riesgo: verde, puerta: true, fase: 6',
  )
  writeFileSync(join(dir, 'docs/plan.yaml'), plan)
  const dado = JSON.parse(correr('siguiente', 'ui'))
  assert.deepEqual([dado.paso, dado.puerta, dado.cierre, dado.fase], ['P02', true, false, 6])
  assert.match(
    correr('aparcar', 'P02', 'el', 'paso', 'gastó', 'su', 'tope'),
    /P02 aparcado \(1\.ª vez\)/,
  )
  const estado = JSON.parse(correr('estado', 'P02'))
  assert.deepEqual([estado.estado, estado.motivo_aparcado], ['aparcado', 'el paso gastó su tope'])
  assert.equal(JSON.parse(correr('siguiente', 'ui')).accion, 'esperar')
  assert.match(correr('tablero'), /✗ \| P02/)
  correr('reanudar', 'P02')
  assert.equal(JSON.parse(correr('siguiente', 'ui')).paso, 'P02')
})

test('un plan que deja de ser válido no deja sin paso a los carriles: se reparte con el último válido', () => {
  const { dir, correr } = repo()
  assert.equal(JSON.parse(correr('siguiente', 'datos')).paso, 'P01')
  writeFileSync(
    join(dir, 'docs/plan.yaml'),
    readFileSync(join(dir, 'docs/plan.yaml'), 'utf8').replace(
      'depende_de: [P01, P02]',
      'depende_de: [P01, P09]',
    ),
  )
  assert.throws(() => correr('validar'), /P03: depende de P09, que no existe/)
  assert.equal(JSON.parse(correr('siguiente', 'ui')).paso, 'P02')
})

test('sin un plan válido anterior, un plan inválido sí falla (y lo dice)', () => {
  const { dir, correr } = repo()
  writeFileSync(
    join(dir, 'docs/plan.yaml'),
    readFileSync(join(dir, 'docs/plan.yaml'), 'utf8').replace(
      'depende_de: [P01, P02]',
      'depende_de: [P01, P09]',
    ),
  )
  assert.throws(() => correr('siguiente', 'ui'), /el plan no es válido: paso P03: depende de P09/)
})

test('el plan se lee de origin/main cuando existe: el del árbol de un carril atrasado no manda', () => {
  const { dir, correr } = repo()
  const g = (...a) =>
    execFileSync('git', ['-c', 'user.email=a@b', '-c', 'user.name=t', ...a], { cwd: dir })
  const remoto = mkdtempSync(join(tmpdir(), 'coord-remoto-'))
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remoto])
  g('remote', 'add', 'origin', remoto)
  g('push', '-q', 'origin', 'main')
  g('fetch', '-q', 'origin')
  // El árbol (la rama de un carril) pierde un paso que main sí tiene.
  writeFileSync(
    join(dir, 'docs/plan.yaml'),
    readFileSync(join(dir, 'docs/plan.yaml'), 'utf8').split('  - {id: P03')[0],
  )
  assert.match(correr('tablero'), /P03 Lista/)
})

// La revisión de FLUJO-2: el relanzamiento de un CI colgado es uno por commit aunque entre medio el PR deje de estar colgado.
test('un CI que vuelve a quedar cancelado tras relanzarlo no se relanza otra vez: vuelve a su carril', () => {
  const { correr, pr, respuestas } = repo()
  const env = { COORD_COLGADO_ESPERA: '0' }
  correr('siguiente', 'ui')
  correr('publicado', 'P02', '12')
  const con = (checks) => ({
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    headRefOid: 'abc',
    statusCheckRollup: checks,
  })
  const cancelado = { name: 'e2e · bloque 1 de 1', status: 'COMPLETED', conclusion: 'CANCELLED' }
  writeFileSync(
    join(respuestas, 'runs.json'),
    JSON.stringify([{ databaseId: 88, conclusion: 'cancelled' }]),
  )
  pr(12, con([...verde, cancelado]))
  correr.con(env, 'sincronizar')
  assert.match(correr.con(env, 'sincronizar'), /lo vuelvo a correr, una vez/)
  // El relanzamiento corre: el PR ya no está colgado, y no se olvida que se relanzó.
  pr(12, con([...verde, { name: 'e2e · bloque 1 de 1', status: 'IN_PROGRESS' }]))
  assert.equal(correr.con(env, 'sincronizar').trim(), '')
  // Y se cancela otra vez (siempre pasa su tope): es un rojo, sin otro relanzamiento.
  pr(12, con([...verde, cancelado]))
  assert.match(correr.con(env, 'sincronizar'), /P02: CI en rojo \(#12\): vuelve a su carril/)
  assert.equal(readFileSync(join(respuestas, 'reruns'), 'utf8').trim(), 'run rerun 88')
  // Con un commit nuevo la cuenta empieza de cero.
  pr(12, { ...con([...verde, cancelado]), headRefOid: 'def' })
  correr.con(env, 'sincronizar')
  assert.match(correr.con(env, 'sincronizar'), /lo vuelvo a correr, una vez/)
})

test('un paso aparcado cuyo PR termina integrado queda integrado', () => {
  const { correr, pr } = repo()
  correr('siguiente', 'ui')
  correr('publicado', 'P02', '12')
  pr(12, { state: 'OPEN', mergeable: 'CONFLICTING', statusCheckRollup: verde })
  correr('sincronizar')
  assert.equal(JSON.parse(correr('siguiente', 'ui')).arreglar, 'conflicto con main')
  correr('aparcar', 'P02', 'no', 'pudo', 'resolver', 'el', 'choque')
  pr(12, { state: 'MERGED' })
  assert.match(correr('sincronizar'), /P02: estaba aparcado y su PR #12 ya está integrado/)
  assert.equal(JSON.parse(correr('estado', 'P02')).estado, 'integrado')
})
