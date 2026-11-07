import { execFileSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Arnes, pasoListo, responder, RUTEO_BASE } from './bucle.arnes'

// El flujo continuo (2026-11-07): lo que antes paraba un carril hasta que alguien lo relanzaba. La copia que se pone al día con main, la
// espera a main en vez de una compuerta al celular, el aviso que se reintenta solo, el cierre que cuenta sólo los commits propios y la
// rama que se trae main antes de cada parte.
vi.setConfig({ testTimeout: 60_000 })

let a: Arnes
let remoto = ''
let comun = ''
beforeEach(() => {
  a = new Arnes()
  remoto = join(a.raiz, 'remoto.git')
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remoto])
  a.git('remote', 'add', 'origin', remoto)
  a.git('push', '-q', 'origin', 'HEAD:main')
  a.git('fetch', '-q', 'origin')
  comun = join(a.raiz, 'coord')
  mkdirSync(comun, { recursive: true })
})
afterEach(() => a.limpiar())

const GIT = ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test']
/** Un commit en origin/main hecho desde otro clon (otro carril que integró algo). */
function integrarEnMain(ruta: string, texto: string) {
  const otro = join(a.raiz, `otro-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  execFileSync('git', ['clone', '-q', '-b', 'main', remoto, otro])
  mkdirSync(join(otro, ruta, '..'), { recursive: true })
  writeFileSync(join(otro, ruta), texto)
  execFileSync('git', [...GIT, 'add', '.'], { cwd: otro })
  execFileSync('git', [...GIT, 'commit', '-q', '-m', `integrar ${ruta}`], { cwd: otro })
  execFileSync('git', ['push', '-q', 'origin', 'main'], { cwd: otro })
}
/** Un `sleep` falso que, la primera vez, integra en main lo que espera el paso. */
function dormirQueIntegra(ruta: string) {
  const f = join(a.raiz, 'dormir-integra')
  const otro = join(a.raiz, 'otro-dormir')
  writeFileSync(
    f,
    `#!/usr/bin/env bash
echo "$*" >> "${join(a.fake, 'dormir.log')}"
[ -e "${f}.hecho" ] && exit 0
touch "${f}.hecho"
git clone -q -b main "${remoto}" "${otro}" && cd "${otro}" && mkdir -p "$(dirname '${ruta}')" && echo hecho > '${ruta}' &&
  git ${GIT.join(' ')} add . && git ${GIT.join(' ')} commit -q -m pedido && git push -q origin main
`,
  )
  chmodSync(f, 0o755)
  return f
}

const paso = (id: string, carril = 'formula') => `  - id: "${id}"
    titulo: 'paso ${id}'
    depende_de: []
    carril: ${carril}
    riesgo: verde
    modulos: [src/${carril === 'formula' ? 'f' : 'p'}/, docs/]
    ruteo: {agente: claude, modelo: sonnet, effort: high, modo: auto, sesion: nueva, revisor: ninguno}
    verificacion: 'Nivel 1'
    terminado: 'listo'
`
function plan(...pasos: string[]) {
  const f = join(comun, 'plan.yaml')
  writeFileSync(
    f,
    `esquema: plan/v1\nagentes_disponibles: [claude]\ncarriles:\n  - id: formula\n    dueno_de: [src/f/]\n  - id: papelera\n    dueno_de: [src/p/]\npasos:\n${pasos.join('')}`,
  )
  return f
}
const entorno = (f: string, extra: Record<string, string> = {}) => ({
  PILOTO_CARRIL: 'formula',
  PILOTO_COORDINADOR: resolve('scripts/coordinador/coordinador.mjs'),
  COORD_PLAN: f,
  COORD_DIR: join(comun, 'estado'),
  COORD_USD_VENTANA: '',
  HOME: a.raiz,
  // El bucle commitea la mezcla con main: en la máquina la identidad es la de git config; aquí, la del arnés.
  GIT_AUTHOR_NAME: 't',
  GIT_AUTHOR_EMAIL: 't@ejemplo.test',
  GIT_COMMITTER_NAME: 't',
  GIT_COMMITTER_EMAIL: 't@ejemplo.test',
  ...extra,
})
const coordinador = (f: string, ...args: string[]) =>
  execFileSync('node', [resolve('scripts/coordinador/coordinador.mjs'), ...args], {
    cwd: a.repo,
    encoding: 'utf8',
    env: { ...process.env, ...entorno(f) },
  })
const estadoCoord = () =>
  JSON.parse(readFileSync(join(comun, 'estado', 'estado.json'), 'utf8')) as {
    pasos: Record<string, { estado: string }>
    pedidos?: { id: string; de: string; para: string; texto: string; estado: string }[]
  }

/** Un paso que pide algo de otro carril: compuerta «espera» con su pedido y los archivos que tienen que llegar a main. */
const pasoEspera = (archivos: string[]) => `mkdir -p .piloto && cat > .piloto/ultimo.json <<'EOF'
{"paso":"4.99","resultado":"compuerta","resumen":"falta algo del otro carril","commits":[],"e2e_dirigidos":[],"compuerta":{"tipo":"espera","motivo":"falta el registro del carril papelera","pedido":"abrir src/p/registro.ts para formula","archivos":${JSON.stringify(archivos)}}}
EOF`

describe('bucle.sh › la espera a main (compuerta «espera»)', () => {
  it('no va a la persona: anota el pedido al dueño, espera a que llegue a main, lo trae a la rama y retoma el paso', () => {
    const f = plan(paso('4.99'))
    a.ruteo({ ...RUTEO_BASE, paso: '4.99' })
    a.paso(1, pasoEspera(['src/p/registro.ts']))
    a.paso(2, pasoListo({ 'src/f/a.ts': 'a' }))
    const r = a.correr(
      ['--hasta', '4.99'],
      entorno(f, { PILOTO_DORMIR: dormirQueIntegra('src/p/registro.ts') }),
    )
    expect(r.estado, r.salida).toBe(0)
    // Ninguna compuerta al celular.
    expect(a.secuencia().filter((l) => l.startsWith('decidir:'))).toEqual([])
    const registro = a.estado('registro.md')
    expect(registro).toContain('pedido pedido-1 al carril papelera (4.99)')
    expect(registro).toContain('4.99 espera a main')
    expect(registro).toMatch(/4\.99: main trajo [0-9a-f]{8}; lo traje a la rama y retomo el paso/)
    expect(registro).toContain('publicado 4.99')
    // El paso se retomó con su sesión y la respuesta dice qué trajo.
    expect(a.llamadas('paso')[1]).toContain('--resume')
    expect(a.estado('decision-sola.md')).toContain('main ya trae')
    expect(existsSync(join(a.repo, 'src/p/registro.ts'))).toBe(true)
    const pedido = estadoCoord().pedidos?.[0]
    expect(pedido).toMatchObject({
      id: 'pedido-1',
      de: 'formula',
      para: 'papelera',
      estado: 'pendiente',
    })
  })

  it('una «afuera» que dice que algo no está en main también espera (las del carril C en el 4.24-3)', () => {
    const f = plan(paso('4.99'))
    a.paso(
      1,
      `mkdir -p .piloto && cat > .piloto/ultimo.json <<'EOF'
{"paso":"4.99","resultado":"compuerta","resumen":"espera","commits":[],"e2e_dirigidos":[],"compuerta":{"tipo":"afuera","motivo":"El chore del A sobre huecos.test.tsx sigue sin estar en main","pregunta":"¿Sigo?","opciones":[{"etiqueta":"seguir","descripcion":"x"},{"etiqueta":"parar","descripcion":"y"}]}}
EOF`,
    )
    a.paso(2, pasoListo({ 'src/f/a.ts': 'a' }))
    const r = a.correr(
      ['--hasta', '4.99'],
      entorno(f, { PILOTO_DORMIR: dormirQueIntegra('src/f/huecos.test.tsx') }),
    )
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia().filter((l) => l.startsWith('decidir:'))).toEqual([])
    expect(a.estado('registro.md')).toContain('espera a main')
    expect(a.llamadas('paso')).toHaveLength(2)
  })

  it('pasado su tope, la espera es un aviso a la persona', () => {
    const f = plan(paso('4.99'))
    a.paso(1, pasoEspera(['src/p/nunca.ts']))
    a.decidir(1, responder('parado'))
    const r = a.correr([], entorno(f, { PILOTO_ESPERA_MAIN_MAX: '0' }))
    expect(r.estado, r.salida).toBe(0)
    expect(a.leerFake('compuerta-1.md')).toContain('espera algo de main')
    // La compuerta dice de qué carril es: otro carril no lee su decisión como propia.
    expect(a.leerFake('compuerta-1.md')).toContain('carril: formula')
  })
})

describe('bucle.sh › un aviso se reintenta solo antes de llegar al celular', () => {
  it('con «parada» en PILOTO_AUTO reintenta con sus esperas y, agotadas, pregunta como siempre', () => {
    writeFileSync(join(a.bin, 'extra.sh'), 'echo mal\n') // la copia alterada: un aviso en cada vuelta
    a.decidir(1, responder('parado'))
    const r = a.correr([], { PILOTO_AUTO: 'parada', PILOTO_PARADA_ESPERAS: '7 11' })
    expect(r.estado, r.salida).toBe(0)
    const registro = a.estado('registro.md')
    expect(registro).toContain('aviso (reintento solo 1 de 2 en 7 s)')
    expect(registro).toContain('aviso (reintento solo 2 de 2 en 11 s)')
    expect(a.lineas('dormir.log')).toEqual(['7', '11'])
    expect(a.secuencia()).toEqual(['decidir:abrir parada ', 'decidir:cerrar'])
    expect(a.llamadas('ruteo')).toEqual([])
  })

  it('el tope de gasto no se reintenta: va directo a la persona', () => {
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    a.decidir(1, responder('parado'))
    const r = a.correr([], {
      PILOTO_AUTO: 'parada',
      PILOTO_TOPE_USD_PASO: '1',
      PILOTO_TOPE_USD_MIN: '5',
    })
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).not.toContain('reintento solo')
    expect(a.leerFake('compuerta-1.md')).toContain('el tope del paso entero')
  })
})

describe('bucle.sh › el cierre cuenta sólo los commits propios del paso', () => {
  it('con un commit de main mezclado en el rango, ultimo.json no necesita listarlo', () => {
    const f = plan(paso('4.99'))
    integrarEnMain('src/p/de-otro.ts', 'otro')
    a.paso(
      1,
      `git fetch -q origin main && git -c user.name=t -c user.email=t@ejemplo.test merge -q --no-edit origin/main
${pasoListo({ 'src/f/a.ts': 'a' })}`,
    )
    const r = a.correr(['--una-vuelta'], { ...entorno(f), PILOTO_DORMIR: 'true' })
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('publicado 4.99')
    expect(a.estado('registro.md')).not.toContain('no coinciden')
  })
})

describe('bucle.sh › la rama del carril se trae main antes de cada parte', () => {
  it('al retomar un paso, una rama local vieja sin commits propios se rehace desde origin/main', () => {
    const f = plan(paso('4.99'))
    coordinador(f, 'siguiente', 'formula') // 4.99 queda asignado: la vuelta lo retoma
    a.git('branch', 'formula/4.99') // la rama vieja, en el commit de inicio
    integrarEnMain('src/p/nuevo.ts', 'nuevo')
    a.paso(1, pasoListo({ 'src/f/a.ts': 'a' }))
    const r = a.correr(['--una-vuelta'], entorno(f))
    expect(r.estado, r.salida).toBe(0)
    expect(existsSync(join(a.repo, 'src/p/nuevo.ts'))).toBe(true)
  })

  it('una rama con commits propios trae main con un merge antes de la parte siguiente', () => {
    const f = plan(paso('4.99'))
    coordinador(f, 'siguiente', 'formula')
    a.git('checkout', '-q', '-b', 'formula/4.99')
    a.escribirRepo('src/f/parte-1.ts', 'uno')
    a.git('add', '.')
    a.git(...GIT, 'commit', '-q', '-m', 'parte 1')
    integrarEnMain('src/p/nuevo.ts', 'nuevo')
    a.paso(1, pasoListo({ 'src/f/a.ts': 'a' }))
    const r = a.correr(['--una-vuelta'], entorno(f))
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('traje origin/main a formula/4.99')
    expect(existsSync(join(a.repo, 'src/p/nuevo.ts'))).toBe(true)
    expect(existsSync(join(a.repo, 'src/f/parte-1.ts'))).toBe(true)
  })
})

describe('bucle.sh › la copia se pone al día con main', () => {
  it('si origin/main trae otros scripts del piloto, entre pasos rehace la copia y se relanza con ella', () => {
    // main trae una copia completa de las piezas (las de la copia de ahora, con copiar-bin.sh) y un bucle.sh que se reconoce.
    copyFileSync(resolve('scripts/piloto/copiar-bin.sh'), join(a.bin, 'copiar-bin.sh'))
    a.firmar()
    mkdirSync(join(a.repo, 'scripts/piloto'), { recursive: true })
    for (const pieza of readdirSync(a.bin).filter((p) => p !== 'bin.sha256'))
      copyFileSync(join(a.bin, pieza), join(a.repo, 'scripts/piloto', pieza))
    const bucle = join(a.repo, 'scripts/piloto/bucle.sh')
    writeFileSync(
      bucle,
      readFileSync(bucle, 'utf8').replace(
        'set -uo pipefail\n',
        'set -uo pipefail\necho "BUCLE NUEVO"\n',
      ),
    )
    a.git('add', '.')
    a.git(...GIT, 'commit', '-q', '-m', 'piloto nuevo')
    a.git('push', '-q', 'origin', 'HEAD:main')
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    const r = a.correr(['--una-vuelta'])
    expect(r.estado, r.salida).toBe(0)
    expect(r.salida).toContain(
      'los scripts del piloto cambiaron en main: me relanzo con la copia nueva',
    )
    expect(r.salida).toContain('BUCLE NUEVO')
    expect(readFileSync(join(a.comun, 'bin.origen'), 'utf8').trim()).toBe(
      a.git('rev-parse', 'origin/main:scripts/piloto'),
    )
    expect(a.llamadas('paso')).toHaveLength(1)
  })
})
