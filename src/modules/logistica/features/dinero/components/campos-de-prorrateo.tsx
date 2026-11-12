'use client'

import { formatearNumero } from '@/shared/lib/formato'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { useRegional } from '@/shared/ui/regional'
import type { OpcionesDeGasto } from '../../../areas/dinero/composicion.client'
import { categoriasParaElegir } from '../../../entities/dinero/categoria'
import type { useProrrateo } from '../hooks/use-prorrateo'

type Props = { opciones: OpcionesDeGasto; formulario: ReturnType<typeof useProrrateo> }

const DECIMALES_DE_LA_TASA = 4

type Formulario = Props['formulario']

// La moneda, el monto y, si la moneda no es la base, el tipo de cambio.
function CamposDeMonto({ opciones, formulario: f }: Props) {
  const { locale, monedaBase } = useRegional()
  const { valores, errores, enCurso, tipos } = f
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <CampoSeleccion
          nombre="prorrateo-moneda"
          etiqueta="Moneda"
          opciones={opciones.monedas.map((m) => ({
            valor: m.codigo,
            etiqueta: `${m.codigo} · ${m.nombre}`,
          }))}
          value={valores.moneda}
          onChange={(evento) => {
            f.escribir({ moneda: evento.target.value })
          }}
          error={errores['moneda']}
          disabled={enCurso}
        />
        <Campo
          nombre="prorrateo-monto"
          etiqueta="Monto a repartir"
          inputMode="decimal"
          autoComplete="off"
          value={valores.monto}
          onChange={(evento) => {
            f.escribir({ monto: evento.target.value })
          }}
          error={errores['monto']}
          disabled={enCurso}
        />
      </div>
      {valores.moneda !== monedaBase ? (
        <CampoSeleccion
          nombre="prorrateo-tipo-de-cambio"
          etiqueta="Tipo de cambio"
          opciones={[
            {
              valor: '',
              etiqueta:
                tipos.length === 0 ? 'Sin tipo de cambio activo' : 'Elige el tipo de cambio',
            },
            ...tipos.map((t) => ({
              valor: t.id,
              etiqueta: `${t.nombre} · ${t.monedaDe} → ${t.monedaA} · ${formatearNumero(t.valor, { locale, decimales: DECIMALES_DE_LA_TASA })}`,
            })),
          ]}
          value={valores.tipoCambioId}
          onChange={(evento) => {
            f.escribir({ tipoCambioId: evento.target.value })
          }}
          ayuda={`La base guarda el equivalente en ${monedaBase} con el valor de este momento.`}
          error={errores['tipoCambioId']}
          disabled={enCurso}
        />
      ) : null}
    </>
  )
}

function CampoDeTexto({
  clave,
  etiqueta,
  formulario: f,
  type,
}: {
  clave: 'fecha' | 'proveedor' | 'notas'
  etiqueta: string
  formulario: Formulario
  type?: 'date'
}) {
  return (
    <Campo
      nombre={`prorrateo-${clave}`}
      etiqueta={etiqueta}
      type={type}
      autoComplete="off"
      value={f.valores[clave]}
      onChange={(evento) => {
        f.escribir({ [clave]: evento.target.value })
      }}
      error={f.errores[clave]}
      disabled={f.enCurso}
    />
  )
}

// Los campos de un gasto repartido: los de «Registrar gasto» sin el comprobante (D4: adjuntarlo N veces rompería el refcount; se adjunta desde cada unidad).
export function CamposDeProrrateo({ opciones, formulario: f }: Props) {
  return (
    <>
      <CampoSeleccion
        nombre="prorrateo-categoria"
        etiqueta="Categoría"
        opciones={[
          { valor: '', etiqueta: 'Elige una categoría' },
          ...categoriasParaElegir(opciones.categorias, null).map((c) => ({
            valor: c.id,
            etiqueta: c.nombre,
          })),
        ]}
        value={f.valores.categoriaId}
        onChange={(evento) => {
          f.escribir({ categoriaId: evento.target.value })
        }}
        error={f.errores['categoriaId']}
        disabled={f.enCurso}
      />
      <CamposDeMonto opciones={opciones} formulario={f} />
      <CampoDeTexto clave="fecha" etiqueta="Fecha" type="date" formulario={f} />
      <CampoDeTexto clave="proveedor" etiqueta="Proveedor" formulario={f} />
      <CampoDeTexto clave="notas" etiqueta="Notas" formulario={f} />
    </>
  )
}
