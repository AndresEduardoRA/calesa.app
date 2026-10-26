import { execFileSync, spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

// El arnés de las pruebas del bucle (`bucle*.test.ts`): un repo de git temporal con su carpeta común, una copia de las piezas REALES
// del piloto (`bin/`, con su `bin.sha256`) y, en su lugar, falsos de lo que habla con el mundo: `claude` (JSON enlatado y un guion de
// bash por llamada que corre en el repo), `decidir.sh` (un guion por compuerta, que escribe `decision.md` como lo haría el hook),
// `verificar.sh` y `publicar.sh` (sólo registran que corrieron), `gh` y `sleep`. El registro de llamadas de los falsos fija el orden.
const REAL = resolve('scripts/piloto')
const PIEZAS_REALES = [
  'bucle.sh',
  'comun.sh',
  'compuerta.sh',
  'cierre.sh',
  'hechos.sh',
  'consumo.sh',
  'cuenta-e2e.mjs',
  'ruteo.schema.json',
  'ultimo.schema.json',
]

export const RUTEO_BASE = {
  paso: '4.99',
  titulo: 'Un paso de mentira',
  modelo: 'sonnet',
  effort: 'medium',
  sesion: { tipo: 'nueva', session_id: null },
  nivel: { nivel: 1, disparadores: [], cuenta_e2e: 0, completo: false },
  compuerta: { tipo: 'ninguna', motivo: '' },
  particion: '',
  por_que: 'prueba',
}

const FALSO_CLAUDE = `#!/usr/bin/env bash
F="$FAKE_DIR"
modo="\${PILOTO_SESION:-sin-sesion}"
n=$(( $(cat "$F/n-$modo" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$F/n-$modo"
echo "$modo n=$n args: $*" >> "$F/llamadas.log"
if [ "$modo" = ruteo ]; then
  f="$F/ruteo-$n.json"; [ -f "$f" ] || f="$F/ruteo.json"
  cat "$f"
  exit 0
fi
[ -f "$F/paso-$n.sh" ] && bash "$F/paso-$n.sh"
if [ -f "$F/paso-$n.out.json" ]; then cat "$F/paso-$n.out.json"; else
  echo '{"type":"result","is_error":false,"result":"hecho","session_id":"fake","total_cost_usd":0.5,"duration_ms":1000,"modelUsage":{"claude-opus-5-5":{"inputTokens":10,"outputTokens":5,"cacheReadInputTokens":100,"cacheCreationInputTokens":20,"costUSD":0.5}}}'
fi
exit "$(cat "$F/paso-$n.exit" 2>/dev/null || echo 0)"
`

const FALSO_DECIDIR = `#!/usr/bin/env bash
F="$FAKE_DIR"
case "\${1:-}" in
  abrir)
    id=$(sed -n 's/^id: *//p' "$PILOTO_COMUN/compuerta.md" | head -n 1)
    tipo=$(sed -n 's/^tipo: *//p' "$PILOTO_COMUN/compuerta.md" | head -n 1)
    paso=$(sed -n 's/^paso: *//p' "$PILOTO_COMUN/compuerta.md" | head -n 1)
    n=$(( $(cat "$F/n-decidir" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$F/n-decidir"
    echo "decidir:abrir $tipo $paso" >> "$F/secuencia.log"
    cp "$PILOTO_COMUN/compuerta.md" "$F/compuerta-$n.md"
    [ -f "$F/decidir-$n.sh" ] && ( ID="$id" COMUN="$PILOTO_COMUN" bash "$F/decidir-$n.sh" ) >/dev/null 2>&1 &
    ;;
  cerrar) echo "decidir:cerrar" >> "$F/secuencia.log" ;;
esac
exit 0
`

const FALSO_VERIFICAR = `#!/usr/bin/env bash
echo "verificar:copia" >> "$FAKE_DIR/secuencia.log"
[ -n "\${FAKE_VERIFICAR_FALLA:-}" ] && { echo "verificar: lint falló" >&2; exit 1; }
exit 0
`

const FALSO_PUBLICAR = `#!/usr/bin/env bash
echo "publicar:$1" >> "$FAKE_DIR/secuencia.log"
[ -n "\${FAKE_PUBLICAR_FALLA:-}" ] && { echo "publicar: CI rojo" >&2; exit 1; }
exit 0
`

export class Arnes {
  raiz = mkdtempSync(join(tmpdir(), 'bucle-'))
  repo = join(this.raiz, 'repo')
  comun = join(this.raiz, 'comun')
  bin = join(this.comun, 'bin')
  fake = join(this.raiz, 'fake')

  constructor() {
    for (const d of [this.repo, this.comun, this.bin, join(this.fake, 'bin')])
      mkdirSync(d, { recursive: true })
    execFileSync('git', ['init', '-q', '-b', 'main', this.repo])
    this.escribirRepo('.gitignore', '.piloto/\n')
    this.escribirRepo('README.md', 'x\n')
    this.escribirRepo('docs/ESTADO.md', 'estado\n')
    this.escribirRepo('docs/BITACORA.md', '# Bitácora\n')
    this.escribirRepo(
      'package.json',
      JSON.stringify(
        {
          scripts: {
            dev: 'next dev',
            'db:reset': 'supabase db reset',
            'test:e2e': 'playwright test',
          },
        },
        null,
        2,
      ) + '\n',
    )
    this.escribirRepo('scripts/piloto/verificar.sh', 'touch "$FAKE_DIR/repo-ejecutado"\n')
    this.escribirRepo('.claude/hooks/x.sh', '#!/bin/bash\n')
    this.git('add', '.')
    this.git('commit', '-q', '-m', 'inicio')
    for (const pieza of PIEZAS_REALES) copyFileSync(join(REAL, pieza), join(this.bin, pieza))
    this.escribirBin('decidir.sh', FALSO_DECIDIR)
    this.escribirBin('verificar.sh', FALSO_VERIFICAR)
    this.escribirBin('publicar.sh', FALSO_PUBLICAR)
    this.firmar()
    this.escribirFake('claude', FALSO_CLAUDE)
    this.escribirFake('dormir', '#!/usr/bin/env bash\necho "$*" >> "$FAKE_DIR/dormir.log"\n')
    this.escribirFake('bin/gh', '#!/usr/bin/env bash\nprintf \'%s\' "${FAKE_GH_LISTA:-[]}"\n')
    this.ruteo(RUTEO_BASE)
  }

  git(...args: string[]) {
    return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test', ...args], {
      cwd: this.repo,
      encoding: 'utf8',
    }).trim()
  }

  escribirRepo(ruta: string, texto: string) {
    mkdirSync(dirname(join(this.repo, ruta)), { recursive: true })
    writeFileSync(join(this.repo, ruta), texto)
  }

  private escribirBin(nombre: string, texto: string) {
    writeFileSync(join(this.bin, nombre), texto)
    chmodSync(join(this.bin, nombre), 0o755)
  }

  private escribirFake(nombre: string, texto: string) {
    writeFileSync(join(this.fake, nombre), texto)
    chmodSync(join(this.fake, nombre), 0o755)
  }

  /** El sha256 de cada pieza de la copia, como lo anota `arrancar.sh`. */
  firmar() {
    const archivos = execFileSync('ls', [this.bin], { encoding: 'utf8' })
      .split('\n')
      .filter((a) => a && a !== 'bin.sha256')
    writeFileSync(
      join(this.bin, 'bin.sha256'),
      execFileSync('sha256sum', ['--', ...archivos], { cwd: this.bin, encoding: 'utf8' }),
    )
  }

  /** Lo que contesta el ruteo en su llamada n (sin n: en todas). */
  ruteo(r: Record<string, unknown>, n?: number) {
    const salida = {
      type: 'result',
      is_error: false,
      result: '',
      session_id: 'ruteo',
      total_cost_usd: 0.01,
      duration_ms: 500,
      structured_output: r,
      modelUsage: {
        'claude-sonnet-5-5': {
          inputTokens: 5,
          outputTokens: 5,
          cacheReadInputTokens: 0,
          cacheCreationInputTokens: 0,
          costUSD: 0.01,
        },
      },
    }
    writeFileSync(
      join(this.fake, n === undefined ? 'ruteo.json' : `ruteo-${n}.json`),
      JSON.stringify(salida),
    )
  }

  /** El guion de bash que corre el paso n (en el repo) y, aparte, su salida JSON y su código de salida. */
  paso(n: number, guion: string, extra: { salida?: unknown; salida_codigo?: number } = {}) {
    writeFileSync(join(this.fake, `paso-${n}.sh`), `${guion}\n`)
    if (extra.salida !== undefined)
      writeFileSync(join(this.fake, `paso-${n}.out.json`), JSON.stringify(extra.salida))
    if (extra.salida_codigo !== undefined)
      writeFileSync(join(this.fake, `paso-${n}.exit`), String(extra.salida_codigo))
  }

  /** El guion de la compuerta n: lo que la persona (y, a veces, un intruso) escribe en decision.md. */
  decidir(n: number, guion: string) {
    writeFileSync(join(this.fake, `decidir-${n}.sh`), `${guion}\n`)
  }

  correr(args: string[] = [], entorno: Record<string, string> = {}) {
    const r = spawnSync('bash', [join(this.bin, 'bucle.sh'), ...args], {
      cwd: this.repo,
      encoding: 'utf8',
      timeout: 60_000,
      env: {
        NODE_ENV: 'test',
        PATH: `${join(this.fake, 'bin')}:${process.env['PATH'] ?? ''}`,
        HOME: this.raiz,
        PILOTO_RAIZ: this.repo,
        PILOTO_COMUN: this.comun,
        PILOTO_POLL: '0.05',
        PILOTO_ESPERA_MAX: '25',
        PILOTO_DISCO_MAX: '99',
        PILOTO_DORMIR: join(this.fake, 'dormir'),
        PILOTO_PGREP_PATRON: 'un-proceso-que-no-existe-ni-existira',
        CLAUDE_BIN: join(this.fake, 'claude'),
        FAKE_DIR: this.fake,
        ...entorno,
      },
    })
    return { estado: r.status, salida: r.stdout + r.stderr }
  }

  leerBin(nombre: string) {
    return readFileSync(join(this.bin, nombre), 'utf8')
  }

  leerFake(nombre: string) {
    const ruta = join(this.fake, nombre)
    return existsSync(ruta) ? readFileSync(ruta, 'utf8') : ''
  }

  /** Las líneas de un registro de los falsos. */
  lineas(nombre: string) {
    return this.leerFake(nombre).split('\n').filter(Boolean)
  }

  secuencia() {
    return this.lineas('secuencia.log')
  }

  llamadas(modo: 'ruteo' | 'paso') {
    return this.lineas('llamadas.log').filter((l) => l.startsWith(`${modo} `))
  }

  estado(nombre: string) {
    const ruta = join(this.repo, '.piloto', nombre)
    return existsSync(ruta) ? readFileSync(ruta, 'utf8') : ''
  }

  limpiar() {
    rmSync(this.raiz, { recursive: true, force: true })
  }
}

/** Un paso que commitea archivos y deja `listo` (lo que declare `commits`, por defecto el sha de lo que commiteó). */
export function pasoListo(
  archivos: Record<string, string>,
  opciones: {
    commits?: string[] | 'ninguno' | 'ultimo'
    e2e?: string[]
    sucio?: boolean
    paso?: string
    unPorArchivo?: boolean
  } = {},
) {
  const paso = opciones.paso ?? '4.99'
  const lineas: string[] = [
    'set -e',
    'GIT="git -c user.name=t -c user.email=t@ejemplo.test"',
    'declare -a SHAS=()',
  ]
  const entradas = Object.entries(archivos)
  const grupos = opciones.unPorArchivo ? entradas.map((e) => [e]) : [entradas]
  for (const grupo of grupos) {
    for (const [ruta, texto] of grupo) {
      lineas.push(
        `mkdir -p "$(dirname '${ruta}')"; printf '%s' '${texto}' > '${ruta}'; git add -- '${ruta}'`,
      )
    }
    lineas.push('$GIT commit -q -m "cambio"', 'SHAS+=("$(git rev-parse HEAD)")')
  }
  if (opciones.sucio) lineas.push('echo sucio > sucio.txt')
  const declarados =
    opciones.commits === 'ninguno'
      ? '[]'
      : opciones.commits === 'ultimo'
        ? '["$(git rev-parse HEAD)"]'
        : opciones.commits
          ? JSON.stringify(opciones.commits)
          : "$(printf '\"%s\",' \"${SHAS[@]}\" | sed 's/,$//' | sed 's/^/[/; s/$/]/')"
  lineas.push(
    `mkdir -p .piloto && cat > .piloto/ultimo.json <<EOF`,
    `{"paso":"${paso}","resultado":"listo","resumen":"hecho","commits":${declarados},"e2e_dirigidos":${JSON.stringify(opciones.e2e ?? [])},"compuerta":null}`,
    'EOF',
  )
  return lineas.join('\n')
}

/** Un paso que termina con una compuerta (ultimo.json con resultado «compuerta»). */
export function pasoCompuerta(tipo: string, opciones: { paso?: string } = {}) {
  const paso = opciones.paso ?? '4.99'
  return `mkdir -p .piloto && cat > .piloto/ultimo.json <<'EOF'
{"paso":"${paso}","resultado":"compuerta","resumen":"necesita decisión","commits":[],"e2e_dirigidos":[],"compuerta":{"tipo":"${tipo}","motivo":"toca datos","pregunta":"¿Apruebas el plan?","opciones":[{"etiqueta":"aprobar","descripcion":"sigue"},{"etiqueta":"parar","descripcion":"no sigue"}],"contexto":[".piloto/planes/${paso}.md"]}}
EOF`
}

export function pasoFalla(paso = '4.99') {
  return `mkdir -p .piloto && cat > .piloto/ultimo.json <<'EOF'
{"paso":"${paso}","resultado":"falla","resumen":"no pude","commits":[],"e2e_dirigidos":[],"compuerta":null}
EOF`
}

/** El guion de una compuerta: la persona responde `texto` poco después de que se abra. */
export function responder(texto: string) {
  return `sleep 0.3
printf 'id: %s\\nopcion: ${texto}\\nnotas: \\ncreada: %s\\nme respondió: «${texto}»\\n' "$ID" "$(date +%s)" > "$COMUN/decision.md"`
}
