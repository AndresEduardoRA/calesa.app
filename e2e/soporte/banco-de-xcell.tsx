// El banco de la XCell: la app que el navegador monta en `e2e/soporte/banco.ts` para probar la celda SOLA, hidratada y con sus estilos
// reales, sin una ruta en `src/app` que viaje en el build de producción. Lo compila esbuild a un script; los estilos son los de `/ingreso`.
// Un comentario `data-caso` nombra cada celda; `window.__emitidos` y `window.__resets` anotan lo que la celda le dice a la hoja.
import { useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { EstiloDeTonos, SimbolosDeXCell, XCell, type XCellProps } from '../../src/shared/ui/xcell'

declare global {
  interface Window {
    __emitidos: [string, number | null][]
    __resets: string[]
    __ayudas: string[]
    __ajustes: string[]
  }
}

type Caso = Omit<
  XCellProps,
  'suggested' | 'overridden' | 'onCommit' | 'onReset' | 'onHelp' | 'onSettings'
> & {
  caso: string
  suggested?: boolean
  overridden?: boolean
}

// Los tres tonos de la semilla (`…005700_tonos.sql`): el cuarto, «inventado», no existe en el catálogo.
const TONOS = [
  {
    clave: 'amarillo',
    claro: { fondo: '#fff7d6', borde: '#e9d27a', tinta: '#1b2130' },
    oscuro: { fondo: '#3e3f3c', borde: '#797251', tinta: '#f2f4f8' },
  },
  {
    clave: 'verde',
    claro: { fondo: '#e6f6ee', borde: '#8fd3b0', tinta: '#1b2130' },
    oscuro: { fondo: '#2d3c42', borde: '#50726a', tinta: '#f2f4f8' },
  },
  {
    clave: 'naranja',
    claro: { fondo: '#ffe9d6', borde: '#f0b27a', tinta: '#1b2130' },
    oscuro: { fondo: '#3f3a3c', borde: '#876b55', tinta: '#f2f4f8' },
  },
]

const MOTIVO_LARGO =
  'No se puede editar mientras la garantía esté apagada para esta variante del vehículo; actívala en el interruptor de la sección para volver a escribir este costo.'

const ETIQUETA_LARGA =
  'Impuesto interno de importación de vehículos usados con más de cinco años de antigüedad'

// El orden es el del DOM y el de lectura: el e2e de `Tab` cuenta con él (el modificado va antes del modificado sin defecto).
const CASOS: Caso[] = [
  { caso: 'normal', id: 'fees', label: 'Fees', format: 'monto', value: 1234.567 },
  {
    caso: 'sugerido',
    id: 'nac',
    label: 'Nacionalización',
    format: 'monto',
    value: 250.75,
    suggested: true,
  },
  {
    caso: 'modificado',
    id: 'factor',
    label: 'Factor de depreciación',
    format: 'porcentaje',
    value: 0.35,
    defaultValue: 0.4,
    overridden: true,
  },
  {
    caso: 'modificado-sin-defecto',
    id: 'transp',
    label: 'Transporte',
    format: 'monto',
    value: 900,
    overridden: true,
  },
  {
    caso: 'deshabilitado',
    id: 'garantia',
    label: 'Garantía',
    format: 'monto',
    value: 0,
    disabledReason: 'Se activa con el interruptor de garantía.',
  },
  {
    caso: 'motivo-largo',
    id: 'extra',
    label: 'Costo extra',
    format: 'monto',
    value: 75,
    disabledReason: MOTIVO_LARGO,
  },
  { caso: 'etiqueta-larga', id: 'impuesto', label: ETIQUETA_LARGA, format: 'monto', value: 4821.5 },
  {
    caso: 'par',
    id: 'iva',
    label: 'IVA',
    format: 'monto',
    value: 181,
    secondaryId: 'iva_pct',
    secondaryFormat: 'porcentaje',
    secondaryValue: 0.1494,
  },
  {
    caso: 'par-modificado',
    id: 'fob',
    label: 'Comisión del despachante',
    format: 'monto',
    value: 320,
    overridden: true,
    suggested: true,
    secondaryId: 'fob_pct',
    secondaryFormat: 'porcentaje',
    secondaryValue: 0.032,
  },
  {
    caso: 'tono-amarillo',
    id: 'a',
    label: 'Precio de subasta',
    format: 'monto',
    value: 8500,
    tone: 'amarillo',
  },
  { caso: 'tono-verde', id: 'v', label: 'Costo fijo', format: 'monto', value: 120, tone: 'verde' },
  {
    caso: 'tono-naranja',
    id: 'n',
    label: 'A revisar',
    format: 'monto',
    value: 60,
    tone: 'naranja',
    suggested: true,
  },
  {
    caso: 'tono-desconocido',
    id: 'x',
    label: 'Tono inventado',
    format: 'monto',
    value: 99,
    tone: 'inventado',
  },
  {
    caso: 'error',
    id: 'err',
    label: 'Descuento',
    format: 'monto',
    value: 5000,
    error: 'Tiene que ser menor que el precio de subasta.',
  },
  { caso: 'vacio', id: 'vacio', label: 'Seguro', format: 'monto', value: null },
  {
    caso: 'tipo-de-cambio',
    id: 'tc',
    label: 'Tipo de cambio',
    format: 'numero',
    value: 6.96,
    tone: 'verde',
  },
  // 4.12-2: la ayuda y el ⚙. El orden del DOM cuenta: el e2e de `Tab` va de `tipo-de-cambio` a `ayuda`.
  {
    caso: 'ayuda',
    id: 'fees_a',
    label: 'Fees de la casa',
    format: 'monto',
    value: 450,
    hasHelp: true,
  },
  {
    caso: 'configurable',
    id: 'iva_c',
    label: 'Alícuota de IVA',
    format: 'porcentaje',
    value: 0.13,
    defaultValue: 0.13,
    hasSettings: true,
  },
  {
    caso: 'deshabilitado-con-acciones',
    id: 'gar_c',
    label: 'Garantía extendida',
    format: 'monto',
    value: 0,
    overridden: true,
    disabledReason: 'Se activa con el interruptor de garantía.',
    hasHelp: true,
    hasSettings: true,
  },
  {
    caso: 'todas-las-acciones',
    id: 'todo',
    label: 'Comisión del despachante aduanero por trámite de nacionalización',
    format: 'monto',
    value: 320,
    defaultValue: 300,
    overridden: true,
    error: 'Tiene que ser menor que el precio de subasta.',
    secondaryId: 'todo_pct',
    secondaryFormat: 'porcentaje',
    secondaryValue: 0.032,
    hasHelp: true,
    hasSettings: true,
  },
]

// `?modo=300`: 300 celdas de la mezcla, con ids propios.
function variante(base: Caso, i: number): Caso {
  const sufijo = `_${String(i)}`
  return {
    ...base,
    caso: `${base.caso}${sufijo}`,
    id: `${base.id}${sufijo}`,
    ...(base.secondaryId === undefined ? {} : { secondaryId: `${base.secondaryId}${sufijo}` }),
  }
}

function casosDe(modo: string | null): Caso[] {
  if (modo !== '300') {
    return CASOS
  }
  return Array.from({ length: 300 }, (_, i) => CASOS[i % CASOS.length]).flatMap((base, i) =>
    base ? [variante(base, i)] : [],
  )
}

function Hoja({ casos }: { casos: Caso[] }) {
  const [valores, setValores] = useState<Record<string, number | null>>({})
  const [quitados, setQuitados] = useState<Record<string, true>>({})
  const alCommit = useCallback((id: string, valor: number | null) => {
    window.__emitidos.push([id, valor])
    setValores((antes) => ({ ...antes, [id]: valor }))
  }, [])
  const alReset = useCallback((id: string) => {
    window.__resets.push(id)
    setQuitados((antes) => ({ ...antes, [id]: true }))
  }, [])
  const alAyudar = useCallback((id: string) => {
    window.__ayudas.push(id)
  }, [])
  const alAjustar = useCallback((id: string) => {
    window.__ajustes.push(id)
  }, [])

  return (
    <main
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 18rem), 1fr))',
        gap: '0.5rem',
        padding: '1rem',
      }}
    >
      {casos.map(({ caso, suggested, overridden, ...celda }) => (
        <div key={caso} data-caso={caso} style={{ minWidth: 0 }}>
          <XCell
            {...celda}
            value={celda.id in valores ? (valores[celda.id] ?? null) : celda.value}
            secondaryValue={
              celda.secondaryId !== undefined && celda.secondaryId in valores
                ? (valores[celda.secondaryId] ?? null)
                : celda.secondaryValue
            }
            suggested={suggested ?? false}
            overridden={(overridden ?? false) && !(celda.id in quitados)}
            onCommit={alCommit}
            onReset={alReset}
            onHelp={alAyudar}
            onSettings={alAjustar}
          />
        </div>
      ))}
    </main>
  )
}

window.__emitidos = []
window.__resets = []
window.__ayudas = []
window.__ajustes = []
const destino = document.getElementById('banco')
if (destino) {
  const modo = new URLSearchParams(window.location.search).get('modo')
  createRoot(destino).render(
    <>
      <SimbolosDeXCell />
      <EstiloDeTonos tonos={TONOS} />
      <Hoja casos={casosDe(modo)} />
    </>,
  )
}
