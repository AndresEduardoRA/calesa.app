'use client'

import { useId } from 'react'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { Switch } from '@/shared/ui/switch'
import type { AjustesDeLeads } from '../../../entities/ajustes-de-leads'
import { useTelefonosExtraDeLaEmpresa } from '../hooks/use-telefonos-extra-de-la-empresa'

type Props = { telefonos: AjustesDeLeads['telefonos'] }

// Configuración › Leads › «Teléfonos extra» (`?seccion=telefonos`): cuántos teléfonos extra admite un lead y si cuentan como el principal.
// Quien lo monta le da la versión como `key`: lo guardado, acá o por otra persona, vuelve a montarlo desde la base.
export function TelefonosExtraDeLaEmpresa({ telefonos }: Props) {
  const formulario = useTelefonosExtraDeLaEmpresa(telefonos)
  const idRegla = useId()
  const idAyuda = `${idRegla}-ayuda`
  return (
    <form
      aria-label="Teléfonos extra"
      className="grid gap-4"
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault()
        void formulario.enviar()
      }}
    >
      {formulario.conflicto ? (
        <AvisoDeConflicto mensaje={formulario.conflicto} alRecargar={formulario.recargar} />
      ) : null}
      <Bloque titulo="Teléfonos extra">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <Campo
            nombre="telefonos-extra-maximo"
            etiqueta="Máximo de teléfonos extra"
            inputMode="numeric"
            autoComplete="off"
            value={formulario.maximo}
            onChange={(evento) => {
              formulario.escribirMaximo(evento.target.value)
            }}
            error={formulario.motivo ?? undefined}
            ayuda="De 0 a 20. Los leads que ya tengan más los conservan; no se les agregan más hasta quedar por debajo."
            disabled={formulario.enCurso}
          />
          <div className="grid gap-1.5">
            <div className="flex min-h-11 items-center gap-2 md:min-h-8">
              <Switch
                id={idRegla}
                checked={formulario.comoPrincipal}
                disabled={formulario.enCurso}
                aria-describedby={idAyuda}
                onCheckedChange={formulario.cambiarRegla}
              />
              <Label htmlFor={idRegla}>Los teléfonos extra cuentan como el principal</Label>
            </div>
            <p id={idAyuda} className="text-(length:--text-sm) text-(--color-ink-faint)">
              Un teléfono extra no podrá repetirse en otro lead y registrar ese número encontrará a
              este lead. Lo que ya se repite queda como está.
            </p>
          </div>
        </div>
      </Bloque>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          className="min-h-11 md:min-h-9"
          disabled={!formulario.hayCambios || formulario.enCurso}
        >
          {formulario.enCurso ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
