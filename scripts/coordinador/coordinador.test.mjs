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
  *) exit 2 ;;
esac
`,
  )
  chmodSync(gh, 0o755)
  const correr = (...args) =>
    execFileSync('node', [CLI, ...args], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, COORD_GH: gh, COORD_USD_VENTANA: '' },
    })
  const correrAsync = (...args) =>
    promisify(execFile)('node', [CLI, ...args], {
      cwd: dir,
      env: { ...process.env, COORD_GH: gh, COORD_USD_VENTANA: '' },
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

test('un estado de commit pendiente (el de Vercel) no es un CI en rojo: espera; en ERROR, sí', () => {
  const { correr, pr } = repo()
  correr('siguiente', 'ui')
  correr('publicado', 'P02', '9')
  pr(9, {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    statusCheckRollup: [
      ...verde,
      { __typename: 'StatusContext', context: 'Vercel', state: 'PENDING' },
    ],
  })
  assert.equal(correr('sincronizar').trim(), '')
  pr(9, {
    state: 'OPEN',
    mergeable: 'MERGEABLE',
    statusCheckRollup: [
      ...verde,
      { __typename: 'StatusContext', context: 'Vercel', state: 'ERROR' },
    ],
  })
  assert.match(correr('sincronizar'), /P02: CI en rojo \(#9\)/)
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
    files: [{ path: 'src/app/x.tsx' }],
  })
  assert.match(correr('sincronizar'), /P02: integrado por el coordinador \(#61, verde\)/)
  assert.match(
    readFileSync(join(respuestas, 'merges-args'), 'utf8'),
    /pr merge 61 --squash --delete-branch --match-head-commit abc123/,
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
