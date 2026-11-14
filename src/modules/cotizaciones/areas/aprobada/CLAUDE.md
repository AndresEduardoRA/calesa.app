# cotizaciones › aprobada

El área `aprobada` de `cotizaciones`: la cotización aprobada de cada vehículo. Ficha del módulo: `../../CLAUDE.md` › «Áreas». Dominio y reglas:
`docs/COTIZADOR.md` › «La cotización aprobada».

## Qué es

Cada vehículo tiene a lo sumo una cotización **aprobada** (`cotizaciones_aprobadas`, una fila por vehículo con el primer resultado congelado). Nace aprobada la
primera activa; quien aprueba en el origen (`cotizaciones.aprobar`) elige otra; si la aprobada se invalida o va a la papelera la releva la más antigua activa.
No es la **Final**. `client.ts` vacío; `index.ts` sólo lleva las lecturas por página que unen las pantallas de `src/app`.

## En la pantalla

- **La guardada** (`pantallas/aprobada-cotizacion.ts` → `HUECOS_DE_APROBADA_EN_LA_GUARDADA.Insignias`, antes de las insignias de `comentarios`):
  `aprobada-de-la-guardada.tsx` (Server Component tras `<Suspense fallback={null}>`) lee `leerMarcaDeLaGuardada()` (`cotizaciones` con el embebido por el único de
  `cotizaciones_aprobadas`, `cache()`). Todos los que ven la cotización ven la insignia «Aprobada» (`insignia-aprobada.tsx`: un `<span>` con `badgeVariants`, sin
  `<Badge>` de Base UI); quien tiene la clave en el origen ve «Aprobar» (`boton-aprobar.tsx`, una isla que al entrar pasa a la insignia). Sin vehículo, inválida o
  sin la lectura de la marca, el botón queda apagado con su motivo (`motivoParaNoAprobar`, `aria-describedby`); sin lectura nunca se inventa una marca.
- **No hay `<Confirmar>`:** aprobar es reversible. `aprobarLaCotizacion()` (función, no hook; sin `useAction`: el JS en frío de la guardada está al tope) llama a la
  action, aplica lo devuelto con `alCambiar` y avisa con «Deshacer» 10 s si llegó `anterior` (aprueba la anterior con su versión). **La action no revalida ni
  refresca** (`.claude/rules/acciones.md`: remontaría lo tipeado en la hoja).
- Errores: el texto de la base (PT409 con quién y cuándo + «Recargar», 42501, 22023, 23514); sin red, «Sin conexión: no se aprobó…»; inesperado tras llegar,
  «No sabemos si se aprobó: recarga para verlo.» + «Recargar». Ninguna cifra en un `aria-label` ni en un `title`.
- **Las lecturas por página** (`leerAprobadasDeVehiculos(ids)` para `/vehiculos`, `leerAprobadasDeCotizaciones(ids)` para el listado): una consulta por clave
  primaria o por el único, de ≤ 100 ids, con `.limit(ids.length)`; sin ids no consultan. El monto cruza como texto (`monto::text`).

## En la base

`cotizacion_aprobar(id, versión)` y el mantenimiento al confirmar: `docs/COTIZADOR.md`. Pruebas: `supabase/tests/areas/aprobada/`,
`scripts/carreras/cotizaciones-aprobada.mjs`, `supabase/tests/medir-cotizaciones-aprobadas.sql`.
