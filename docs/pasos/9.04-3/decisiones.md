## 2026-11-12 — Paso 9.04-3: el rango de un campo numérico en `shared` y el panel (9-2)

- **El rango no rechaza un valor igual a lo guardado** (como la base, 9.04-2): abrir un lead viejo y guardar otro dato no choca con un rango nuevo. Para eso la edición de lead pasa `guardado` a `esquemaDeValor()`, como ya hacía el vehículo; de paso, una opción que se sacó del campo y el lead conserva sigue valiendo al editar otro dato, que es lo que `ContextoDeEsquema.guardado` documenta.
- **En vehículos, si cambia el origen** la base valida todo (los campos son otros), pero el cliente deja pasar el valor igual a lo guardado: en ese caso raro el rechazo de la base cae junto al campo por su `hint`.
- **«Mínimo» y «Máximo» usan el control de «Valor por defecto»** (`type="number"`, `valueAsNumber`), no el lector con locale de `numero()`: es el patrón del panel. Reversible si el panel pasa al lector.
- **El motivo del formulario dice lo mismo que la base** con los números en el locale de la empresa (hasta 6 decimales); la base usa `trim_scale`.
- **Se cuenta antes de guardar sólo si el rango se acota** (aparece o sube el mínimo, aparece o baja el máximo); quitar o ensanchar no deja a nadie fuera. La vista previa manda sólo el rango propuesto en `p_cambios`.
- **El aviso de fuera de rango no bloquea** y dice «más de 50» con el tope de la base (51, `conteoAcotado`).
- **El panel valida el rango antes de enviar** con los textos de la base y lo dice junto a «Mínimo», «Máximo» o «Valor por defecto»; la base sigue siendo la última línea. El esquema de crear lo vuelve a mirar (`conReglasDeCampo`).
- **Cambiar a un tipo sin rango vacía «Mínimo» y «Máximo»** en el formulario, como las opciones; la base hace lo mismo.
- **`CampoDeVehiculo` suma el rango como opcional**: `vehiculos` no importa `origenes` y declara la forma; opcional, como `principal`.
- **`NUMERO_MAXIMO` pasa a `tipos.ts`** (lo reexporta `esquema-de-valor.ts`): `rango.ts` lo necesita y así no hay un ciclo de imports.
- **No se partió en 3a/3b:** el corte natural no compila sin código de relleno (`cambiosRespectoDe(…, Required<…>)` obliga al formulario a dar el rango apenas los cambios lo llevan).
