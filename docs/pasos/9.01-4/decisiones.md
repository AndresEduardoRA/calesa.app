## 2026-11-12 · Paso 9.01-4: el diff en su drawer, «Ver actividad» en las fichas

- **La moneda de cada lado sale de la foto** (D37). `actividad_diff` suma `moneda_antes = antes->>'moneda'` y `moneda_despues = despues->>'moneda'`,
  nunca de la fila vigente (pudo cambiar o borrarse). Sólo fuera de `leads` y sólo si `authenticated` lee la columna `moneda` de esa tabla: la misma
  regla de grants con que `_actividad_recortar` elige columnas. Una tabla nueva con `moneda` entra sola. Sin foto (un evento de
  `registrar_actividad`), `null`, y el monto sale con «(moneda sin conocer)».
- **`origen_id` de la foto en la cabecera de un vehículo** (D38): sin él el drawer no sabe de qué origen leer las etiquetas de `atributos`. Quien
  recibe `visible: true` ya pasó `puede_vehiculo`.
- **Las etiquetas de `atributos` se leen al abrir y sólo de las claves que llegaron** (D39), activas o no; si la lectura falla, la clave sale
  humanizada y el resto del diff se ve igual.
- **La fila sin acceso no abre nada** (D40); por la URL, el drawer dice «No tienes acceso a este cambio.».
- **`?cambio=` se lee como texto** (D41, auditoría del plan): `idDelCambio` exige sólo dígitos, entero seguro y positivo. Cualquier otra cosa abre el
  drawer con «No tienes acceso a este cambio.» sin leer nada.
- **Abrir el drawer suma al historial y no va al servidor** (D42); **el título es fijo, «Detalle del cambio»** (D43), y la descripción llega con la lectura.
- **Un monto sin moneda conocida va por `<Monto moneda={null}>`** (D44, cambia lo del plan): el plan pedía `formatearNumero()` suelto, pero un número
  de dinero fuera de `<Monto>` no se oculta en el Modo Live. `<Monto>` acepta `moneda: null` (sólo el número, sin inventar moneda) y sigue siendo
  el único lugar donde se imprime dinero.
- **«Ver actividad» entra en la lista única del «⋯»** (D45) de lead y de vehículo, en un bloque propio antes de la papelera, sin «…» (lleva a otra
  página). Sólo la ficha lo ofrece. **La ruta la arma `src/app`** (D46) con `puede(permisos, 'actividad.ver')` y `rutaDeActividadDe`: `leads` y
  `vehiculos` no importan `actividad`. Son núcleo del carril A (D47): se editan sin borrar nada.
- **El e2e entra por «Ver actividad»** (D48) y elige la fila por la persona (el alta del lead la hizo el sistema).
