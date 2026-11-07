import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Arnes } from './bucle.arnes'

// El arnés de las pruebas del flujo continuo (FLUJO-1: `bucle-flujo*.test.ts`): el del bucle con un remoto (origin/main), un plan del
// coordinador con dos carriles (formula y papelera) y ayudas para que «otro carril» integre en main. Cada archivo de pruebas tiene su
// propia copia de este módulo (Vitest aísla por archivo): `conMain()` prepara un arnés nuevo antes de cada prueba.
let a: Arnes
let remoto = ''
let comun = ''

export function conMain(): Arnes {
  a = new Arnes()
  remoto = join(a.raiz, 'remoto.git')
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remoto])
  a.git('remote', 'add', 'origin', remoto)
  a.git('push', '-q', 'origin', 'HEAD:main')
  a.git('fetch', '-q', 'origin')
  comun = join(a.raiz, 'coord')
  mkdirSync(comun, { recursive: true })
  return a
}
/** La carpeta del estado del coordinador de la prueba. */
export const dirCoord = () => join(comun, 'estado')

export const GIT = ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test']
/** Un commit en origin/main hecho desde otro clon (otro carril que integró algo). */
export function integrarEnMain(ruta: string, texto: string) {
  const otro = join(a.raiz, `otro-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  execFileSync('git', ['clone', '-q', '-b', 'main', remoto, otro])
  mkdirSync(join(otro, ruta, '..'), { recursive: true })
  writeFileSync(join(otro, ruta), texto)
  execFileSync('git', [...GIT, 'add', '.'], { cwd: otro })
  execFileSync('git', [...GIT, 'commit', '-q', '-m', `integrar ${ruta}`], { cwd: otro })
  execFileSync('git', ['push', '-q', 'origin', 'main'], { cwd: otro })
}
/** Un `sleep` falso que, la primera vez, integra en main lo que espera el paso. */
export function dormirQueIntegra(ruta: string) {
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

export const paso = (id: string, carril = 'formula') => `  - id: "${id}"
    titulo: 'paso ${id}'
    depende_de: []
    carril: ${carril}
    riesgo: verde
    modulos: [src/${carril === 'formula' ? 'f' : 'p'}/, docs/]
    ruteo: {agente: claude, modelo: sonnet, effort: high, modo: auto, sesion: nueva, revisor: ninguno}
    verificacion: 'Nivel 1'
    terminado: 'listo'
`
export function plan(...pasos: string[]) {
  const f = join(comun, 'plan.yaml')
  writeFileSync(
    f,
    `esquema: plan/v1\nagentes_disponibles: [claude]\ncarriles:\n  - id: formula\n    dueno_de: [src/f/]\n  - id: papelera\n    dueno_de: [src/p/]\npasos:\n${pasos.join('')}`,
  )
  return f
}
export const entorno = (f: string, extra: Record<string, string> = {}) => ({
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
export const coordinador = (f: string, ...args: string[]) =>
  execFileSync('node', [resolve('scripts/coordinador/coordinador.mjs'), ...args], {
    cwd: a.repo,
    encoding: 'utf8',
    env: { ...process.env, ...entorno(f) },
  })
export const estadoCoord = () =>
  JSON.parse(readFileSync(join(comun, 'estado', 'estado.json'), 'utf8')) as {
    pasos: Record<string, { estado: string }>
    pedidos?: { id: string; de: string; para: string; texto: string; estado: string }[]
  }

/** Un paso que pide algo de otro carril: compuerta «espera» con su pedido y los archivos que tienen que llegar a main. */
export const pasoEspera = (
  archivos: string[],
) => `mkdir -p .piloto && cat > .piloto/ultimo.json <<'EOF'
{"paso":"4.99","resultado":"compuerta","resumen":"falta algo del otro carril","commits":[],"e2e_dirigidos":[],"compuerta":{"tipo":"espera","motivo":"falta el registro del carril papelera","pedido":"abrir src/p/registro.ts para formula","archivos":${JSON.stringify(archivos)}}}
EOF`

/** Un paso que dice «listo» sin cambios (sin commits). */
export const pasoSinCambios = (
  paso: string,
) => `mkdir -p .piloto && cat > .piloto/ultimo.json <<'EOF'
{"paso":"${paso}","resultado":"listo","resumen":"ya estaba","commits":[],"e2e_dirigidos":[],"compuerta":null}
EOF`
