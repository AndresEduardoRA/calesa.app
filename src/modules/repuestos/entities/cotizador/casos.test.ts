import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import casos from './casos-del-cotizador.json'

// La base corre los mismos casos: `cotizador.sql` los lleva copiados entre `$casos$ … $casos$` (el arnés de `db:probar` no inyecta archivos
// de datos de un área). Si alguien cambia un lado, esta prueba cae. La ruta va por una variable: Vite reescribe `new URL('…', import.meta.url)`.
const PRUEBA_SQL = join(process.cwd(), 'supabase/tests/areas/repuestos/cotizador.sql')

describe('los casos del cotizador', () => {
  it('el literal de cotizador.sql es copia exacta de casos-del-cotizador.json', () => {
    const sql = readFileSync(PRUEBA_SQL, 'utf8')
    const literal = /\$casos\$\n([\s\S]*?)\n\$casos\$/.exec(sql)?.[1]
    expect(literal, 'cotizador.sql no tiene el literal $casos$').toBeDefined()
    expect(JSON.parse(literal ?? 'null')).toEqual(casos)
  })
})
