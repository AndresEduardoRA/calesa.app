-- El ajuste «Vehículo obligatorio al cotizar» (D3; paso 4.10, prompt 2).
--
-- D3 (`docs/DECISIONES.md`, «Apertura de la Fase 4»): el lead es obligatorio siempre; el vehículo, por defecto, también, y lo decide un ajuste único de la
-- empresa (sí por defecto, lo cambia `cotizaciones.configurar`). Con «no», una preventa se guarda sin vehículo; una final lo exige siempre. Lo lee
-- `cotizacion_crear()` (migración siguiente). La pantalla es del 4.20 (Configuración › Cotización) y nadie lo escribe antes: `empresa_guardar_ajustes()` sólo
-- acepta sus propias claves.
--
-- La columna ya está en `supabase/schemas/01_empresa/` (lo que aplica `db reset` es la migración base); esta migración es para una base que ya aplicó la base
-- (el patrón de `…014000500` y `…014001000`).

alter table public.ajustes_empresa add column if not exists vehiculo_obligatorio_al_cotizar boolean not null default true;

comment on column public.ajustes_empresa.vehiculo_obligatorio_al_cotizar is
  'D3 (Fase 4): sí por defecto. Con no, cotizacion_crear acepta una preventa sin vehículo; una final siempre lo exige. Sin pantalla hasta el 4.20 (Configuración › Cotización); lo cambia quien tiene cotizaciones.configurar.';
comment on table public.ajustes_empresa is
  'Fila única (id = 1). Marca, país, locale, zona horaria, moneda base y políticas globales. Del cotizador sólo vive acá el ajuste «Vehículo obligatorio al cotizar»: lo demás (fórmulas, tablas, plantillas) es de formulas y tablas_referencia.';
