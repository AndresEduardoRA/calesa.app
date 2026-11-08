import { execFileSync, spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Arnes, pasoListo, responder, RUTEO_BASE } from './bucle.arnes'
import {
  conMain,
  coordinador,
  dormirQueIntegra,
  entorno,
  estadoCoord,
  GIT,
  integrarEnMain,
  paso,
  pasoEspera,
  plan,
} from './bucle-flujo.arnes'

// El flujo continuo (2026-11-07): lo que antes paraba un carril hasta que alguien lo relanzaba. La copia que se pone al día con main, la
// espera a main en vez de una compuerta al celular, el aviso que se reintenta solo, el cierre que cuenta sólo los commits propios y la
// rama que se trae main antes de cada parte. Lo que corrigió la revisión, en bucle-flujo-revision.test.ts.
vi.setConfig({ testTimeout: 60_000 })

let a: Arnes
beforeEach(() => {
  a = conMain()
})
afterEach(() => a.limpiar())

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

describe('bucle.sh › un worktree de carril que quedó en main (2026-11-08)', () => {
  it('no para: sin paso en curso y limpio, el carril saca la rama del paso asignado', () => {
    const f = plan(paso('4.99'))
    a.git('fetch', '-q', 'origin')
    a.git('checkout', '-q', '-B', 'main', 'origin/main')
    a.paso(1, pasoListo({ 'src/f/a.ts': 'a' }))
    const r = a.correr(['--una-vuelta'], entorno(f))
    expect(r.estado, r.salida).toBe(0)
    expect(a.secuencia().filter((l) => l.startsWith('decidir:'))).toEqual([])
    expect(a.estado('registro.md')).toContain('el coordinador asignó 4.99 en formula/4.99')
    expect(a.llamadas('paso')).toHaveLength(1)
  })
})

describe('bucle.sh › un choque con main al traerlo (2026-11-08)', () => {
  // La rama del carril con un commit propio sobre un archivo que main también cambió después.
  const ramaQueChoca = (ruta: string, base: string, deLaRama: string, deMain: string) => {
    integrarEnMain(ruta, base)
    a.git('fetch', '-q', 'origin')
    a.git('checkout', '-q', '-b', 'formula/4.99', 'origin/main')
    a.escribirRepo(ruta, deLaRama)
    a.git('add', '.')
    a.git(...GIT, 'commit', '-q', '-m', 'parte 1')
    integrarEnMain(ruta, deMain)
  }

  it('en docs/ se resuelve solo, con las líneas de los dos lados', () => {
    const f = plan(paso('4.99'))
    coordinador(f, 'siguiente', 'formula')
    ramaQueChoca('docs/notas.md', 'uno\n', 'uno\nde la rama\n', 'uno\nde main\n')
    a.paso(1, pasoListo({ 'src/f/a.ts': 'a' }))
    const r = a.correr(['--una-vuelta'], entorno(f))
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('los choques en docs/ se unieron (docs/notas.md)')
    const notas = readFileSync(join(a.repo, 'docs/notas.md'), 'utf8')
    expect(notas).toContain('de la rama')
    expect(notas).toContain('de main')
    expect(a.git('merge-base', '--is-ancestor', 'origin/main', 'HEAD')).toBe('')
    expect(existsSync(join(a.repo, '.piloto/conflicto-con-main.md'))).toBe(false)
  })

  it('en código se aborta y queda anotado para la sesión del paso, que corre igual', () => {
    const f = plan(paso('4.99'))
    coordinador(f, 'siguiente', 'formula')
    ramaQueChoca('src/f/hoja.ts', 'uno\n', 'de la rama\n', 'de main\n')
    a.paso(1, pasoListo({ 'src/f/a.ts': 'a' }))
    const r = a.correr(['--una-vuelta'], entorno(f))
    expect(r.estado, r.salida).toBe(0)
    expect(a.estado('registro.md')).toContain('choca: src/f/hoja.ts')
    expect(a.estado('conflicto-con-main.md')).toContain('`src/f/hoja.ts`')
    expect(readFileSync(join(a.repo, 'src/f/hoja.ts'), 'utf8')).toBe('de la rama\n')
    expect(a.llamadas('paso')).toHaveLength(1)
  })
})

describe('bucle.sh › la copia común que puso al día otro carril', () => {
  it('si otro carril ya puso al día la copia común, este bucle igual se relanza con ella (manda la carpeta que corre)', () => {
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
    // Otro carril copia primero: bin.origen ya es el de main y `bin` apunta a la carpeta nueva; este bucle arranca desde la vieja.
    const vieja = join(a.comun, 'bin-vieja')
    execFileSync('cp', ['-a', a.bin, vieja])
    const copia = spawnSync('bash', [join(a.bin, 'copiar-bin.sh'), '--si-cambio'], {
      cwd: a.repo,
      encoding: 'utf8',
      env: { ...process.env, PILOTO_RAIZ: a.repo, PILOTO_COMUN: a.comun },
    })
    expect(copia.status, copia.stdout + copia.stderr).toBe(10)
    a.paso(1, pasoListo({ 'src/a.ts': 'a' }))
    const r = spawnSync('bash', [join(vieja, 'bucle.sh'), '--una-vuelta'], {
      cwd: a.repo,
      encoding: 'utf8',
      timeout: 60_000,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PATH: `${join(a.fake, 'bin')}:${process.env['PATH'] ?? ''}`,
        HOME: a.raiz,
        PILOTO_RAIZ: a.repo,
        PILOTO_COMUN: a.comun,
        PILOTO_POLL: '0.05',
        PILOTO_AUTO: '',
        PILOTO_REPARAR: '0',
        PILOTO_DORMIR: join(a.fake, 'dormir'),
        PILOTO_PGREP_PATRON: 'un-proceso-que-no-existe-ni-existira',
        CLAUDE_BIN: join(a.fake, 'claude'),
        FAKE_DIR: a.fake,
      },
    })
    const salida = r.stdout + r.stderr
    expect(salida).toContain('me relanzo con la copia nueva')
    expect(salida).toContain('BUCLE NUEVO')
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
