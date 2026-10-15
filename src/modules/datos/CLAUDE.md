# datos

Exportación e importación CSV: cada persona lo suyo, el dueño todo; vista previa por fila, importa las válidas y deja el informe.

## Entra y sale

- Entra: archivo CSV subido desde el navegador, mapeo de columnas, confirmación.
- Sale: `/datos`.
- Depende de: `leads`, `vehiculos`. **Los listados no dependen de `datos`:** el CSV de lo propio de `leads` (exportar «lo que ves» e importar con vista previa) vive en `leads` (Fase 3, parte 8) y `datos` lo consume por su entrada y reutiliza `shared/lib/csv` (`escribir`, `leer`, `descargar`). Lo que es de `datos` es el **todo del dueño** con `datos.exportar.todo` e `importar-csv`.

## Archivos clave

- `entities/plantillas.ts` — columnas de cada plantilla CSV con sus validadores Zod (teléfono normalizado por la base con el código de la empresa, fechas ISO, orígenes por nombre).
- `infra/importar.ts` — llama a `supabase/functions/importar-csv` (fuera de la Server Action: es trabajo en segundo plano).
- `features/exportar/`, `features/importar/` (mapeo, vista previa, resultado).

## Tablas

`importaciones` (estado, totales, informe por fila). RPC: `crear_lead` por fila (misma regla de limbo y duplicados).

## No se rompe

- Exportar respeta RLS: lo que no ves no sale. El teléfono completo sale sólo de la propia cartera.
- Importar nunca pisa: un teléfono existente se reporta como «ya existe» (en masa **no se nombra a nadie**, como en `leads`) y lo del limbo no se adopta en bloque: `crear_lead` con `adoptar` es una decisión por lead.
- El contrato de `leads` (Fase 3, parte 8, `docs/DECISIONES.md`): `_lead_crear(…, p_recordar_origen)` y `leads_importar_lote` son lo que se llama por fila o por lote; `importaciones.archivo_ruta` es nulo sólo en la de `leads`.
- El CSV usa `;` o `,` detectado, UTF-8 con BOM al exportar (Excel en español).

## Ojo

- `datos.exportar.todo` / `datos.importar.todo` son los únicos permisos que ven datos de otros en bloque: sólo para el dueño.
