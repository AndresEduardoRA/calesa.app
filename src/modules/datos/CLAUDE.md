# datos

Exportación e importación CSV: cada persona lo suyo, el dueño todo; vista previa por fila, importa las válidas y deja el informe.

## Entra y sale

- Entra: archivo CSV subido desde el navegador, mapeo de columnas, confirmación.
- Sale: `/datos`. `exportar(entidad, filtros)` lo usan los listados de `leads` y `vehiculos` («Exportar lo que ves»).
- Depende de: `leads`, `vehiculos`.

## Archivos clave

- `entities/plantillas.ts` — columnas de cada plantilla CSV con sus validadores Zod (teléfono E.164, fechas ISO, orígenes por clave).
- `infra/importar.ts` — llama a `supabase/functions/importar-csv` (fuera de la Server Action: es trabajo en segundo plano).
- `features/exportar/`, `features/importar/` (mapeo, vista previa, resultado).

## Tablas

`importaciones` (estado, totales, informe por fila). RPC: `crear_lead` por fila (misma regla de limbo y duplicados).

## No se rompe

- Exportar respeta RLS: lo que no ves no sale. El teléfono completo sale sólo de la propia cartera.
- Importar nunca pisa: un teléfono existente se reporta como «ya existe (de X)» o se adopta si está en limbo.
- El CSV usa `;` o `,` detectado, UTF-8 con BOM al exportar (Excel en español).

## Ojo

- `datos.exportar.todo` / `datos.importar.todo` son los únicos permisos que ven datos de otros en bloque: sólo para el dueño.
