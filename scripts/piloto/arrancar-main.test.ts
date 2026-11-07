import { execFileSync, spawn, spawnSync } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { arrancar, comun, limpiar, preparar, raiz, repo, tmux } from './arrancar.arnes'

// FLUJO-1 (2026-11-07): la copia sale de origin/main (copiar-bin.sh), con un enlace a la vigente, y `--si-caido` levanta un bucle que se cayó.
beforeEach(preparar)
afterAll(limpiar)

describe('arrancar.sh › la copia sale de origin/main (copiar-bin.sh)', () => {
  const GIT = ['-c', 'user.name=t', '-c', 'user.email=t@ejemplo.test']
  const conMain = () => {
    const remoto = join(raiz, 'remoto.git')
    execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remoto])
    execFileSync('git', [...GIT, 'add', '.'], { cwd: repo })
    execFileSync('git', [...GIT, 'commit', '-q', '-m', 'inicio'], { cwd: repo })
    execFileSync('git', ['remote', 'add', 'origin', remoto], { cwd: repo })
    execFileSync('git', ['push', '-q', 'origin', 'HEAD:main'], { cwd: repo })
    execFileSync('git', ['fetch', '-q', 'origin'], { cwd: repo })
  }
  const copiar = (...args: string[]) =>
    spawnSync('bash', [join(repo, 'scripts/piloto/copiar-bin.sh'), ...args], {
      cwd: repo,
      encoding: 'utf8',
      env: { NODE_ENV: 'test', PATH: process.env['PATH'] ?? '', PILOTO_RAIZ: repo, HOME: raiz },
    })

  it('copia lo integrado en main, no lo que la rama del carril tenga sin integrar, y anota de dónde salió', () => {
    conMain()
    writeFileSync(
      join(repo, 'scripts/piloto/parar.sh'),
      '#!/usr/bin/env bash\n# una versión vieja de la rama\n',
    )
    const r = arrancar()
    expect(r.status, r.stderr).toBe(0)
    expect(readFileSync(join(comun, 'bin/parar.sh'), 'utf8')).not.toContain('versión vieja')
    expect(readFileSync(join(comun, 'bin.origen'), 'utf8').trim()).toBe(
      execFileSync('git', ['rev-parse', 'origin/main:scripts/piloto'], {
        cwd: repo,
        encoding: 'utf8',
      }).trim(),
    )
  })

  it('--si-cambio no copia si main no cambió (0) y copia si cambió (10)', () => {
    conMain()
    expect(copiar().status).toBe(0)
    expect(copiar('--si-cambio').status).toBe(0)
    // `bin` es un enlace a la copia vigente; la de antes sigue ahí para el bucle que la está usando.
    expect(lstatSync(join(comun, 'bin')).isSymbolicLink()).toBe(true)
    const antes = realpathSync(join(comun, 'bin'))
    writeFileSync(
      join(repo, 'scripts/piloto/parar.sh'),
      '#!/usr/bin/env bash\n# versión nueva de main\n',
    )
    execFileSync('git', [...GIT, 'commit', '-qam', 'nueva'], { cwd: repo })
    execFileSync('git', ['push', '-q', 'origin', 'HEAD:main'], { cwd: repo })
    execFileSync('git', ['fetch', '-q', 'origin'], { cwd: repo })
    const r = copiar('--si-cambio')
    expect(r.status, r.stderr).toBe(10)
    expect(readFileSync(join(comun, 'bin/parar.sh'), 'utf8')).toContain('versión nueva de main')
    expect(realpathSync(join(comun, 'bin'))).not.toBe(antes)
    expect(readFileSync(join(antes, 'parar.sh'), 'utf8')).not.toContain('versión nueva de main')
    expect(() =>
      execFileSync('sha256sum', ['-c', '--quiet', 'bin.sha256'], { cwd: join(comun, 'bin') }),
    ).not.toThrow()
  })

  it('dos copias seguidas no comparten carpeta: la primera queda entera para el bucle que la carga', () => {
    conMain()
    expect(copiar().status).toBe(0)
    const primera = realpathSync(join(comun, 'bin'))
    expect(copiar().status).toBe(0)
    expect(realpathSync(join(comun, 'bin'))).not.toBe(primera)
    expect(existsSync(join(primera, 'bucle.sh'))).toBe(true)
    expect(existsSync(join(primera, 'gasto.sh'))).toBe(true)
  })

  it('una copia de main sin bucle.sh no reemplaza a la que hay', () => {
    conMain()
    expect(copiar().status).toBe(0)
    execFileSync('git', [...GIT, 'rm', '-q', 'scripts/piloto/bucle.sh'], { cwd: repo })
    execFileSync('git', [...GIT, 'commit', '-qm', 'roto'], { cwd: repo })
    execFileSync('git', ['push', '-q', 'origin', 'HEAD:main'], { cwd: repo })
    execFileSync('git', ['fetch', '-q', 'origin'], { cwd: repo })
    const r = copiar('--si-cambio')
    expect(r.status).toBe(1)
    expect(r.stderr).toContain('no trae bucle.sh')
    expect(existsSync(join(comun, 'bin/bucle.sh'))).toBe(true)
  })
})

describe('arrancar.sh › --si-caido (el vigía de systemd)', () => {
  const registro = (linea: string) => {
    mkdirSync(join(repo, '.piloto'), { recursive: true })
    writeFileSync(join(repo, '.piloto/registro.md'), `- 2026-11-07T03:00:00-04:00 ${linea}\n`)
  }

  it('con el bucle caído y sin parada a propósito, cierra el tmux viejo y lo levanta', () => {
    registro('paso 4.21 (opus, high, nueva 27a194c1).')
    const r = arrancar('--carril', 'b', '--si-caido')
    expect(r.status, r.stderr).toBe(0)
    expect(r.stderr).toContain('no corría y nadie lo paró')
    expect(tmux()).toContain('kill-session -t piloto-bucle-b')
    expect(tmux()).toContain('new-session -d -s piloto-bucle-b')
    expect(readFileSync(join(repo, '.piloto/registro.md'), 'utf8')).toContain(
      'vigía: el bucle no corría',
    )
  })

  it.each([
    ['la persona dijo «parado»', 'parado por la persona en la compuerta de 4.24-3.'],
    ['el carril terminó', 'carril b: el coordinador no tiene más pasos para este carril.'],
    ['llegó a --hasta', 'llegamos a 4.21.'],
  ])('no lo levanta si %s', (_c, linea) => {
    registro(linea)
    const r = arrancar('--carril', 'b', '--si-caido')
    expect(r.status, r.stderr).toBe(0)
    expect(tmux()).toBe('')
  })

  it('no lo levanta con PARAR ni con un bucle vivo (que tiene bucle.lock)', async () => {
    registro('paso 4.21 (opus, high, nueva x).')
    writeFileSync(join(repo, '.piloto/PARAR'), '')
    expect(arrancar('--carril', 'b', '--si-caido').status).toBe(0)
    expect(tmux()).toBe('')
    rmSync(join(repo, '.piloto/PARAR'))
    const vivo = spawn('flock', [join(repo, '.piloto/bucle.lock'), 'sleep', '3'], {
      stdio: 'ignore',
    })
    await new Promise((seguir) => setTimeout(seguir, 300))
    expect(arrancar('--carril', 'b', '--si-caido').status).toBe(0)
    expect(tmux()).toBe('')
    vivo.kill()
  })
})
