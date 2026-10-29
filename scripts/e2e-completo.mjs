// El e2e completo: comprueba que las funciones edge estén servidas, resetea la base local
// (`supabase db reset`: migraciones y seed), corre las carreras (`pnpm db:carreras`) y corre TODO con `E2E_COMPLETO=1`, que convierte en error
// los tests que se saltarían porque la base tiene gente. Borra los datos de desarrollo de la base
// local: para correr un spec suelto sobre una base con datos, `pnpm test:e2e <spec>`.
// Uso: pnpm test:e2e:completo [argumentos de playwright, p. ej. --project=movil]
import { spawnSync } from 'node:child_process'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) process.loadEnvFile('.env.local')
const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
if (!/127\.0\.0\.1|localhost/.test(base)) {
  console.error(
    `El e2e completo resetea la base: sólo contra el Supabase local, no contra «${base}».`,
  )
  process.exit(1)
}

// `OPTIONS` no ejecuta nada ni llama a apibara; una función no servida da 404 o corta la conexión.
async function servida(nombre) {
  for (let intento = 0; intento < 4; intento++) {
    try {
      const { status } = await fetch(`${base}/functions/v1/${nombre}`, { method: 'OPTIONS' })
      if (status !== 404 && status < 500) return true
    } catch {
      // Sin respuesta: se vuelve a intentar.
    }
    await new Promise((resolver) => setTimeout(resolver, 500))
  }
  return false
}

async function exigirFunciones(cuando) {
  const caidas = []
  for (const nombre of ['apibara', 'storage-gc']) {
    if (!(await servida(nombre))) caidas.push(nombre)
  }
  if (caidas.length > 0) {
    console.error(
      `Las funciones edge no están servidas ${cuando} (${caidas.join(', ')}): corre ` +
        '`pnpm funciones` en otra terminal y vuelve a intentar.',
    )
    process.exit(1)
  }
}

function ejecutar(comando, args, env = {}) {
  const { status } = spawnSync(comando, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
  return status ?? 1
}

function correr(comando, args, env = {}) {
  const status = ejecutar(comando, args, env)
  if (status !== 0) process.exit(status)
}

await exigirFunciones('(antes de resetear)')
console.log('\n[e2e completo] Reseteando la base local: se pierden sus datos de desarrollo.\n')
correr('pnpm', ['db:reset'])
// Las carreras (dos conexiones reales a la base) corren sobre la base recién reseteada y la dejan como
// estaba: su terreno lleva un prefijo propio y se borra al terminar.
correr('pnpm', ['db:carreras'])
await exigirFunciones('(después de resetear)')
const status = ejecutar('pnpm', ['test:e2e', ...process.argv.slice(2)], { E2E_COMPLETO: '1' })
// Si falló, el reporter de Playwright ya dejó los artefactos en `e2e-fallos/` (`e2e/soporte/reporter-de-fallos.ts`).
if (status !== 0) {
  process.exit(status)
}
