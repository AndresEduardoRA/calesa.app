-- apibara: el catálogo de datos, el escritor de la subasta y el estado en una columna propia.
-- Escrito a mano.
--
-- Qué había: `subasta_*`, `estado_subasta` y `apibara_*` eran columnas sin escritor, el preset de
-- subasta traía 17 `clave_apibara` adivinadas (ninguna calzaba con la respuesta real) y
-- `estado_subasta` era un texto libre.
--
-- Qué hay desde acá:
--   estado_subasta (enum)      — abierta | en_vivo | terminada | vendida, derivado del bruto
--   _apibara_catalogo()        — cada dato normalizado de la respuesta, con su ruta (`a.b.c`) como
--                                `clave_apibara`: lo que nace con un origen de subasta
--   origen_apibara_completar() — suma lo que le falta a un origen ya creado; idempotente
--   origen_apibara_rutas_sin_campo() / origen_apibara_agregar() — lo que la API trajo después
--   _vehiculo_subasta_desde()  — una sola regla para fecha y estado: el alta, el refresco y la
--                                limpieza (parte 6) la comparten
--   vehiculo_crear(…, p_apibara) y vehiculo_subasta_refrescar() — los escritores
--   vehiculo_fotos_agregar()   — guarda de dónde vino cada foto (`origen_url`)
--   vehiculos_repetidos()      — «ya está en el inventario», antes de traer nada
--   apibara_contexto()         — qué puede hacer quien llama con apibara en un origen
--
-- Se aplica sobre una base viva: todo es idempotente y la estructura también vive en
-- `supabase/schemas/` (de ahí sale la migración base de una base nueva).

-- ---------------------------------------------------------------------------
-- Estado de la subasta
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type t where t.typname = 'estado_subasta' and t.typnamespace = 'public'::regnamespace) then
    create type public.estado_subasta as enum ('abierta', 'en_vivo', 'terminada', 'vendida');
  end if;
  if (select c.data_type from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = 'vehiculos' and c.column_name = 'estado_subasta') = 'text' then
    alter table public.vehiculos alter column estado_subasta type public.estado_subasta using (
      case upper(estado_subasta)
        when 'FUTURE' then 'abierta' when 'PRE_BID' then 'abierta' when 'LIVE' then 'en_vivo'
        when 'SOLD' then 'vendida' when 'NO_SALE' then 'terminada' else null end)::public.estado_subasta;
  end if;
end $$;
comment on column public.vehiculos.estado_subasta is 'abierta | en_vivo | terminada | vendida. Lo deriva _vehiculo_subasta_desde() de apibara_raw: nadie lo escribe a mano.';

create index if not exists vehiculos_subasta_estado_idx on public.vehiculos (estado_subasta, subasta_en)
  where eliminado_en is null and estado_subasta is not null;
create index if not exists vehiculos_apibara_sync_idx on public.vehiculos (apibara_sync_en)
  where eliminado_en is null and apibara_sync_en is not null;

-- Una ruta de apibara llena un solo campo por origen. Antes de crear el índice, lo repetido
-- (nada lo impedía) se deja con el primero.
update public.origenes_campos c set clave_apibara = null
from (select id, row_number() over (partition by origen_id, clave_apibara order by orden, id) as n
      from public.origenes_campos where clave_apibara is not null) d
where c.id = d.id and d.n > 1;
create unique index if not exists origenes_campos_apibara_unico on public.origenes_campos (origen_id, clave_apibara)
  where clave_apibara is not null;

-- ---------------------------------------------------------------------------
-- El catálogo
-- ---------------------------------------------------------------------------
-- Una fila por dato normalizado de la respuesta de apibara (los grupos anidados, aplanados en una
-- ruta con puntos). Quedan fuera, y siguen en `apibara_raw`: `details`, las listas, lo que caduca
-- al minuto, los duplicados, las clases CSS y lo que ya es columna de `vehiculos` (título, marca,
-- modelo, año, VIN, lote, plataforma, kilometraje, fecha de la subasta). Las primeras 17 son el
-- preset de siempre (`es_sistema`); `clave_apibara` nula = dato que la API no trae.
-- `src/modules/origenes/entities/catalogo-apibara.ts` es su espejo y un test los compara.
create or replace function public._apibara_catalogo()
returns table (clave text, etiqueta text, tipo public.tipo_campo, grupo text, orden smallint,
               en_tarjeta boolean, filtrable boolean, publico_web boolean, clave_apibara text, es_sistema boolean)
language sql immutable set search_path = '' as $$
  select v.clave, v.etiqueta, v.tipo::public.tipo_campo, v.grupo, v.orden::smallint, v.en_tarjeta, v.filtrable,
         v.publico_web, v.clave_apibara, v.es_sistema
  from (values
    ('color', 'Color', 'texto', 'Vehículo', 10, true, true, true, 'vehicle_specs.exterior_color', true),
    ('transmision', 'Transmisión', 'texto', 'Vehículo', 20, true, true, true, 'vehicle_specs.transmission', true),
    ('combustible', 'Combustible', 'texto', 'Vehículo', 30, false, true, true, 'vehicle_specs.fuel_type', true),
    ('motor', 'Motor', 'texto', 'Vehículo', 40, false, false, true, 'vehicle_specs.engine.raw', true),
    ('cilindros', 'Cilindros', 'numero', 'Vehículo', 50, false, true, true, null, true),
    ('traccion', 'Tracción', 'texto', 'Vehículo', 60, false, true, true, 'vehicle_specs.drive_type', true),
    ('carroceria', 'Carrocería', 'texto', 'Vehículo', 70, false, true, true, 'vehicle_specs.body_style', true),
    ('tipo_vehiculo', 'Tipo', 'texto', 'Vehículo', 80, false, true, true, 'type', true),
    ('codigo_titulo', 'Código de título', 'texto', 'Subasta', 90, true, true, true, 'sale_document.name', true),
    ('dano_principal', 'Daño principal', 'texto', 'Subasta', 100, true, true, true, 'condition.primary_damage', true),
    ('dano_secundario', 'Daño secundario', 'texto', 'Subasta', 110, false, true, true, 'condition.secondary_damage', true),
    ('enciende_y_anda', 'Enciende y anda', 'booleano', 'Subasta', 120, true, true, true, null, true),
    ('tiene_llave', 'Tiene llave', 'booleano', 'Subasta', 130, false, true, true, 'condition.has_key', true),
    ('valor_mercado', 'Valor de mercado (USD)', 'moneda', 'Subasta', 140, false, false, true, 'pricing.estimated_retail_value_usd', true),
    ('ubicacion', 'Ubicación', 'texto', 'Subasta', 150, true, true, true, 'location.display', true),
    ('nota_subasta', 'Nota de la subasta', 'texto_largo', 'Subasta', 160, false, false, true, null, true),
    ('banderas_subasta', 'Banderas', 'multi_opcion', 'Subasta', 170, false, true, true, null, true),
    ('serie_clave', 'Serie (clave)', 'texto', 'Modelo y generación', 200, false, false, false, 'series.key', false),
    ('serie', 'Serie', 'texto', 'Modelo y generación', 210, false, false, false, 'series.name', false),
    ('generacion_id', 'Generación (id)', 'numero', 'Modelo y generación', 220, false, false, false, 'generation.id', false),
    ('generacion', 'Generación', 'texto', 'Modelo y generación', 230, false, false, false, 'generation.name', false),
    ('generacion_nombre', 'Generación (nombre completo)', 'texto', 'Modelo y generación', 240, false, false, false, 'generation.generation', false),
    ('generacion_marca', 'Marca de la generación', 'texto', 'Modelo y generación', 250, false, false, false, 'generation.make', false),
    ('generacion_modelo', 'Modelo de la generación', 'texto', 'Modelo y generación', 260, false, false, false, 'generation.model', false),
    ('generacion_serie', 'Serie de la generación', 'texto', 'Modelo y generación', 270, false, false, false, 'generation.series', false),
    ('generacion_serie_clave', 'Clave de serie de la generación', 'texto', 'Modelo y generación', 280, false, false, false, 'generation.series_key', false),
    ('generacion_desde', 'Generación desde (año)', 'numero', 'Modelo y generación', 290, false, false, false, 'generation.year_from', false),
    ('generacion_hasta', 'Generación hasta (año)', 'numero', 'Modelo y generación', 300, false, false, false, 'generation.year_to', false),
    ('generacion_etiqueta', 'Generación (etiqueta)', 'texto', 'Modelo y generación', 310, false, false, false, 'generation.label', false),
    ('estado_apibara', 'Estado según apibara', 'texto', 'Subasta', 320, false, false, false, 'auction.state', false),
    ('subasta_temporizada', 'Subasta temporizada', 'booleano', 'Subasta', 330, false, false, false, 'auction.is_timed', false),
    ('compra_inmediata_disponible', 'Compra inmediata disponible', 'booleano', 'Subasta', 340, false, false, false, 'auction.is_buy_now', false),
    ('fin_temporizada', 'Fin de la subasta temporizada', 'fecha_hora', 'Subasta', 350, false, false, false, 'auction.timed_end_at', false),
    ('ultimo_dia_venta', 'Último día de venta', 'fecha', 'Subasta', 360, false, false, false, 'auction.last_sold_day', false),
    ('ultima_venta_en', 'Última venta (momento)', 'fecha_hora', 'Subasta', 370, false, false, false, 'auction.last_sold_at', false),
    ('ultima_venta_estado', 'Estado de la última venta', 'texto', 'Subasta', 380, false, false, false, 'auction.last_sold_status', false),
    ('resultado_subasta', 'Resultado de la subasta', 'texto', 'Subasta', 390, false, false, false, 'auction.outcome_status', false),
    ('subasta_termino_en', 'La subasta terminó el', 'fecha_hora', 'Subasta', 400, false, false, false, 'auction.auction_ended_at', false),
    ('resultado_observado_en', 'Resultado observado el', 'fecha_hora', 'Subasta', 410, false, false, false, 'auction.outcome_observed_at', false),
    ('lote_retirado', 'Lote retirado', 'booleano', 'Subasta', 420, false, false, false, 'auction.lot_removed', false),
    ('vendido_compra_inmediata', 'Vendido por compra inmediata', 'booleano', 'Subasta', 430, false, false, false, 'auction.sold_buy_now', false),
    ('vendido_temporizada', 'Vendido en subasta temporizada', 'booleano', 'Subasta', 440, false, false, false, 'auction.sold_timed', false),
    ('puja_actual', 'Puja actual (USD)', 'moneda', 'Precios', 450, false, false, false, 'pricing.current_bid_usd', false),
    ('puja_observada_en', 'Puja observada el', 'fecha_hora', 'Precios', 460, false, false, false, 'pricing.current_bid_at', false),
    ('puja_secundaria', 'Puja secundaria (USD)', 'moneda', 'Precios', 470, false, false, false, 'pricing.current_bid2_usd', false),
    ('compra_inmediata', 'Compra inmediata (USD)', 'moneda', 'Precios', 480, false, false, false, 'pricing.buy_now_usd', false),
    ('precio_de_venta', 'Precio de venta (USD)', 'moneda', 'Precios', 490, false, false, false, 'pricing.sale_price_usd', false),
    ('ultimo_precio_de_venta', 'Último precio de venta (USD)', 'moneda', 'Precios', 500, false, false, false, 'pricing.last_sold_price_usd', false),
    ('costo_estimado_desde', 'Costo estimado desde (USD)', 'moneda', 'Precios', 510, false, false, false, 'pricing.estimated_cost.from', false),
    ('costo_estimado_hasta', 'Costo estimado hasta (USD)', 'moneda', 'Precios', 520, false, false, false, 'pricing.estimated_cost.to', false),
    ('costo_estimado_mediano', 'Costo estimado mediano (USD)', 'moneda', 'Precios', 530, false, false, false, 'pricing.estimated_cost.median', false),
    ('costo_estimado_texto', 'Costo estimado (texto)', 'texto', 'Precios', 540, false, false, false, 'pricing.estimated_cost.text', false),
    ('costo_estimado_muestras', 'Muestras del costo estimado', 'numero', 'Precios', 550, false, false, false, 'pricing.estimated_cost.sample_count', false),
    ('costo_estimado_refinamiento', 'Refinamiento del costo estimado', 'texto', 'Precios', 560, false, false, false, 'pricing.estimated_cost.refinement_method', false),
    ('costo_estimado_muestras_refinamiento', 'Muestras del refinamiento', 'numero', 'Precios', 570, false, false, false, 'pricing.estimated_cost.refinement_sample_count', false),
    ('costo_estimado_motor_l', 'Motor del costo estimado (L)', 'numero', 'Precios', 580, false, false, false, 'pricing.estimated_cost.engine_size_l', false),
    ('costo_estimado_franja_km', 'Franja de kilometraje del costo estimado', 'texto', 'Precios', 590, false, false, false, 'pricing.estimated_cost.mileage_bucket', false),
    ('costo_estimado_multiplicador', 'Multiplicador de mercado', 'numero', 'Precios', 600, false, false, false, 'pricing.estimated_cost.market_multiplier', false),
    ('puja_anterior_mas_alta', 'Puja más alta anterior (USD)', 'moneda', 'Precios', 610, false, false, false, 'pricing.estimated_cost.previous_high_bid_usd', false),
    ('se_envia_desde', 'Se envía desde', 'texto', 'Ubicación y patio', 620, false, false, false, 'location.send_from', false),
    ('ubicacion_estado', 'Estado de la ubicación', 'texto', 'Ubicación y patio', 630, false, false, false, 'location.state', false),
    ('patio_id', 'Patio (id)', 'numero', 'Ubicación y patio', 640, false, false, false, 'facility.id', false),
    ('patio_estado', 'Patio: estado', 'texto', 'Ubicación y patio', 650, false, false, false, 'facility.state', false),
    ('patio_codigo_postal', 'Patio: código postal', 'texto', 'Ubicación y patio', 660, false, false, false, 'facility.zip', false),
    ('patio_latitud', 'Patio: latitud', 'numero', 'Ubicación y patio', 670, false, false, false, 'facility.lat', false),
    ('patio_longitud', 'Patio: longitud', 'numero', 'Ubicación y patio', 680, false, false, false, 'facility.lng', false),
    ('patio_nombre', 'Patio: nombre', 'texto', 'Ubicación y patio', 690, false, false, false, 'facility.office_name', false),
    ('patio_direccion', 'Patio: dirección', 'texto', 'Ubicación y patio', 700, false, false, false, 'facility.address', false),
    ('patio_ciudad', 'Patio: ciudad', 'texto', 'Ubicación y patio', 710, false, false, false, 'facility.city', false),
    ('patio_nombre_fuente', 'Patio: nombre en la fuente', 'texto', 'Ubicación y patio', 720, false, false, false, 'facility.source_location_name', false),
    ('patio_externo', 'Patio externo', 'booleano', 'Ubicación y patio', 730, false, false, false, 'facility.is_offsite', false),
    ('almacenamiento_ubicacion_id', 'Ubicación de almacenamiento (id)', 'numero', 'Ubicación y patio', 740, false, false, false, 'facility.storage_location_id', false),
    ('almacenamiento_patio_id', 'Patio de almacenamiento (id)', 'numero', 'Ubicación y patio', 750, false, false, false, 'facility.storage_facility_id', false),
    ('patio_oficial_id', 'Patio oficial (id)', 'numero', 'Ubicación y patio', 760, false, false, false, 'facility.canonical.id', false),
    ('patio_oficial_nombre', 'Patio oficial: nombre', 'texto', 'Ubicación y patio', 770, false, false, false, 'facility.canonical.name', false),
    ('patio_oficial_direccion', 'Patio oficial: dirección', 'texto', 'Ubicación y patio', 780, false, false, false, 'facility.canonical.address', false),
    ('patio_oficial_ciudad', 'Patio oficial: ciudad', 'texto', 'Ubicación y patio', 790, false, false, false, 'facility.canonical.city', false),
    ('patio_oficial_estado', 'Patio oficial: estado', 'texto', 'Ubicación y patio', 800, false, false, false, 'facility.canonical.state', false),
    ('patio_oficial_codigo_postal', 'Patio oficial: código postal', 'texto', 'Ubicación y patio', 810, false, false, false, 'facility.canonical.zip', false),
    ('patio_oficial_latitud', 'Patio oficial: latitud', 'numero', 'Ubicación y patio', 820, false, false, false, 'facility.canonical.lat', false),
    ('patio_oficial_longitud', 'Patio oficial: longitud', 'numero', 'Ubicación y patio', 830, false, false, false, 'facility.canonical.lng', false),
    ('patio_oficial_enlace', 'Patio oficial: enlace', 'texto', 'Ubicación y patio', 840, false, false, false, 'facility.canonical.url', false),
    ('vendedor', 'Vendedor', 'texto', 'Vendedor', 850, false, false, false, 'seller.name', false),
    ('vendedor_tipo', 'Tipo de vendedor', 'texto', 'Vendedor', 860, false, false, false, 'seller.type', false),
    ('condicion_de_marcha', 'Condición de marcha', 'texto', 'Condición', 870, false, false, false, 'condition.run_condition.value', false),
    ('condicion_de_marcha_etiqueta', 'Condición de marcha (etiqueta)', 'texto', 'Condición', 880, false, false, false, 'condition.run_condition.label', false),
    ('tipo_de_perdida', 'Tipo de pérdida', 'texto', 'Condición', 890, false, false, false, 'condition.loss', false),
    ('odometro_millas', 'Odómetro (millas)', 'numero', 'Condición', 900, false, false, false, 'odometer.mi', false),
    ('cilindrada_litros', 'Cilindrada (L)', 'texto', 'Especificaciones', 910, false, false, false, 'vehicle_specs.engine.size_l', false),
    ('potencia_hp', 'Potencia (HP)', 'numero', 'Especificaciones', 920, false, false, false, 'vehicle_specs.engine.hp', false),
    ('disposicion_motor', 'Disposición del motor', 'texto', 'Especificaciones', 930, false, false, false, 'vehicle_specs.engine.layout', false),
    ('bolsas_de_aire', 'Bolsas de aire', 'texto', 'Especificaciones', 940, false, false, false, 'vehicle_specs.airbags', false),
    ('sistema_de_retencion', 'Sistema de retención', 'texto_largo', 'Especificaciones', 950, false, false, false, 'vehicle_specs.restraint_system', false),
    ('documento_tipo', 'Tipo de documento de venta', 'texto', 'Documento de venta', 960, false, false, false, 'sale_document.type', false),
    ('documento_exportable', 'Se puede exportar', 'booleano', 'Documento de venta', 970, false, false, false, 'sale_document.export', false),
    ('documento_registrable', 'Se puede registrar', 'booleano', 'Documento de venta', 980, false, false, false, 'sale_document.registration', false),
    ('documento_pendiente', 'Documento pendiente', 'booleano', 'Documento de venta', 990, false, false, false, 'sale_document.is_pending', false),
    ('documento_pagina', 'Página del documento', 'numero', 'Documento de venta', 1000, false, false, false, 'sale_document.page_id', false),
    ('documento_grupo', 'Grupo del documento', 'texto', 'Documento de venta', 1010, false, false, false, 'sale_document.sale_document_group', false),
    ('fotos_cantidad', 'Cantidad de fotos', 'numero', 'Fotos y video', 1020, false, false, false, 'media.images_count', false),
    ('miniaturas_cantidad', 'Cantidad de miniaturas', 'numero', 'Fotos y video', 1030, false, false, false, 'media.thumbs_count', false),
    ('tiene_video', 'Tiene video', 'booleano', 'Fotos y video', 1040, false, false, false, 'media.has_video', false),
    ('tiene_360', 'Tiene vista 360°', 'booleano', 'Fotos y video', 1050, false, false, false, 'media.has_360', false),
    ('identificador_apibara', 'Identificador de apibara', 'texto', 'Registro de apibara', 1060, false, false, false, 'slug_vin', false),
    ('es_sublote', 'Es un sublote', 'booleano', 'Registro de apibara', 1070, false, false, false, 'subLot', false),
    ('actualizado_en_apibara', 'Actualizado en apibara', 'fecha_hora', 'Registro de apibara', 1080, false, false, false, 'updated_at', false)
  ) as v(clave, etiqueta, tipo, grupo, orden, en_tarjeta, filtrable, publico_web, clave_apibara, es_sistema);
$$;
revoke all on function public._apibara_catalogo() from public, anon, authenticated;

-- Lo que nace con un origen: en subasta, el catálogo entero (encendido); en manual, lo de siempre.
create or replace function public.origen_preconfigurar_campos()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.tipo = 'subasta' then
    insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, requerido, grupo, orden, en_tarjeta, filtrable, publico_web, clave_apibara, es_sistema)
    select new.id, c.clave, c.etiqueta, c.tipo, false, c.grupo, c.orden, c.en_tarjeta, c.filtrable, c.publico_web, c.clave_apibara, c.es_sistema
    from public._apibara_catalogo() c;
  else
    insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, requerido, grupo, orden, en_tarjeta, filtrable, publico_web, es_sistema) values
      (new.id, 'color', 'Color', 'texto', false, 'Vehículo', 10, true, true, true, true),
      (new.id, 'transmision', 'Transmisión', 'opcion', false, 'Vehículo', 20, true, true, true, true),
      (new.id, 'combustible', 'Combustible', 'opcion', false, 'Vehículo', 30, false, true, true, true),
      (new.id, 'motor', 'Motor', 'texto', false, 'Vehículo', 40, false, false, true, true),
      (new.id, 'traccion', 'Tracción', 'opcion', false, 'Vehículo', 50, false, true, true, true),
      (new.id, 'carroceria', 'Carrocería', 'opcion', false, 'Vehículo', 60, false, true, true, true),
      (new.id, 'condicion', 'Condición', 'opcion', false, 'Venta', 70, true, true, true, true),
      (new.id, 'descripcion', 'Descripción comercial', 'texto_largo', false, 'Venta', 80, false, false, true, true);
  end if;
  return new;
end;
$$;

-- Suma a un origen de subasta lo que le falta del catálogo. Nunca duplica una ruta ni pisa un
-- campo propio con la misma clave. Sólo la llaman esta migración y, si hiciera falta, el soporte.
create or replace function public.origen_apibara_completar(p_origen uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if not exists (select 1 from public.origenes o where o.id = p_origen and o.tipo = 'subasta') then
    return 0;
  end if;
  insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, requerido, grupo, orden, en_tarjeta, filtrable, publico_web, clave_apibara, es_sistema)
  select p_origen, c.clave, c.etiqueta, c.tipo, false, c.grupo, c.orden, c.en_tarjeta, c.filtrable, c.publico_web, c.clave_apibara, c.es_sistema
  from public._apibara_catalogo() c
  where not exists (select 1 from public.origenes_campos x where x.origen_id = p_origen and x.clave = c.clave)
    and (c.clave_apibara is null or not exists (
      select 1 from public.origenes_campos x where x.origen_id = p_origen and x.clave_apibara = c.clave_apibara));
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.origen_apibara_completar(uuid) from public, anon, authenticated;

-- Los 17 campos que ya existían: su `clave_apibara` pasa a la ruta real sólo si todavía es la que
-- se había adivinado (una que la persona cambió a propósito no se toca). Lo que la API no trae
-- queda sin clave: es un campo manual.
update public.origenes_campos c set clave_apibara = k.nueva
from (
  select m.clave, m.vieja, cat.clave_apibara as nueva
  from (values ('color', 'color'), ('transmision', 'transmission'), ('combustible', 'fuel_type'), ('motor', 'engine_type'),
               ('cilindros', 'cylinders'), ('traccion', 'drivetrain'), ('carroceria', 'body_style'), ('tipo_vehiculo', 'vehicle_type'),
               ('codigo_titulo', 'title_code'), ('dano_principal', 'primary_damage'), ('dano_secundario', 'secondary_damage'),
               ('enciende_y_anda', 'run_and_drive'), ('tiene_llave', 'has_key'), ('valor_mercado', 'estimated_retail_value'),
               ('ubicacion', 'location'), ('nota_subasta', 'auction_note'), ('banderas_subasta', 'sale_flags')) as m(clave, vieja)
  join public._apibara_catalogo() cat on cat.clave = m.clave
) k
where c.clave = k.clave and c.clave_apibara = k.vieja and c.es_sistema;

-- Un valor de la API («Automatic») no calza con una lista de opciones vacía: esos cinco pasan a
-- texto mientras no tengan opciones. Con opciones, `valoresDesdeSubasta()` busca la que coincide.
update public.origenes_campos c set tipo = 'texto', valor_defecto = null
where c.es_sistema and c.tipo = 'opcion' and c.opciones = '[]'::jsonb and c.clave_apibara is not null
  and c.clave in ('transmision', 'combustible', 'traccion', 'carroceria', 'tipo_vehiculo');

select public.origen_apibara_completar(o.id) from public.origenes o where o.tipo = 'subasta';

-- ---------------------------------------------------------------------------
-- Lo que la API trae y el origen no tiene como campo
-- ---------------------------------------------------------------------------
-- Las hojas de un JSON, con la ruta aplanada. Los objetos se recorren; lo demás (incluidas las
-- listas) es una hoja con su tipo.
create or replace function public._apibara_hojas(p_raw jsonb)
returns table (ruta text, tipo text, valor jsonb)
language sql immutable set search_path = '' as $$
  with recursive r(ruta, valor) as (
    select e.key, e.value from jsonb_each(p_raw) e
    union all
    select r.ruta || '.' || e.key, e.value from r, jsonb_each(r.valor) e where jsonb_typeof(r.valor) = 'object'
  )
  select r.ruta, jsonb_typeof(r.valor), r.valor from r where jsonb_typeof(r.valor) <> 'object';
$$;
revoke all on function public._apibara_hojas(jsonb) from public, anon, authenticated;

-- Rutas que no se ofrecen como campo: ya son columna, son un duplicado, caducan o son pura forma.
create or replace function public._apibara_ruta_ignorada(p_ruta text)
returns boolean language sql immutable set search_path = '' as $$
  select p_ruta = any (array['title', 'make', 'model', 'year', 'vin', 'lot_number', 'platform', 'platform_id', 'odometer.km',
      'auction.auction_at', 'auction.diff_minutes', 'auction.formatted', 'auction.ad', 'auction.full_date', 'ad', 'distance',
      'media.items_count', 'seller.class', 'seller.text_class', 'condition.run_condition.class_hint'])
    or p_ruta = 'details' or p_ruta like 'details.%'
    or p_ruta like 'auction.countdown.%' or p_ruta like 'media.items%' or p_ruta like 'media.thumbs.%' or p_ruta = 'media.thumbs';
$$;
revoke all on function public._apibara_ruta_ignorada(text) from public, anon, authenticated;

-- Lo que trajeron los vehículos de un origen y no tiene campo (miramos los últimos 200).
create or replace function public.origen_apibara_rutas_sin_campo(p_origen uuid)
returns table (ruta text, tipo text, ejemplo text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.assert_permiso('origenes.gestionar');
  if not exists (select 1 from public.origenes o where o.id = p_origen and o.tipo = 'subasta') then
    return;
  end if;
  return query
  with ultimos as (
    select v.apibara_raw from public.vehiculos v
    where v.origen_id = p_origen and v.eliminado_en is null and v.apibara_raw is not null
    order by v.apibara_sync_en desc nulls last limit 200
  ), hojas as (
    select h.ruta, h.tipo, h.valor from ultimos u cross join lateral public._apibara_hojas(u.apibara_raw) h
  ), conocidas as (
    select c.clave_apibara as ruta from public.origenes_campos c where c.origen_id = p_origen and c.clave_apibara is not null
    union select k.clave_apibara from public._apibara_catalogo() k where k.clave_apibara is not null
  )
  select h.ruta, min(h.tipo), min(left(h.valor #>> '{}', 80))
  from hojas h
  where h.tipo not in ('array', 'null') and not public._apibara_ruta_ignorada(h.ruta)
    and not exists (select 1 from conocidas c where c.ruta = h.ruta)
  group by h.ruta
  order by h.ruta;
end;
$$;
revoke all on function public.origen_apibara_rutas_sin_campo(uuid) from public, anon;
grant execute on function public.origen_apibara_rutas_sin_campo(uuid) to authenticated;

-- Crea un campo por cada ruta pedida (sólo las que de verdad trajo el origen). La etiqueta es la
-- ruta: quien gestiona los campos la renombra. Nace activo y sin tocar los vehículos existentes.
create or replace function public.origen_apibara_agregar(p_origen uuid, p_rutas text[])
returns int language plpgsql security definer set search_path = '' as $$
declare r record; v_n int := 0; v_clave text; v_orden int; v_sufijo int;
begin
  perform public.assert_permiso('origenes.gestionar');
  perform 1 from public.origenes o where o.id = p_origen and o.tipo = 'subasta' for update;
  if not found then raise exception 'Ese origen no es de subasta o ya no existe.' using errcode = 'PT409'; end if;
  if p_rutas is null or cardinality(p_rutas) = 0 then return 0; end if;
  for r in select * from public.origen_apibara_rutas_sin_campo(p_origen) x where x.ruta = any (p_rutas) loop
    v_clave := left('apibara_' || regexp_replace(lower(r.ruta), '[^a-z0-9]+', '_', 'g'), 41);
    v_sufijo := 1;
    while exists (select 1 from public.origenes_campos c where c.origen_id = p_origen and c.clave = v_clave) loop
      v_sufijo := v_sufijo + 1;
      v_clave := left('apibara_' || regexp_replace(lower(r.ruta), '[^a-z0-9]+', '_', 'g'), 38) || '_' || v_sufijo;
    end loop;
    select coalesce(max(c.orden) + 10, 10) into v_orden from public.origenes_campos c where c.origen_id = p_origen;
    insert into public.origenes_campos (origen_id, clave, etiqueta, tipo, grupo, orden, clave_apibara, es_sistema)
    values (p_origen, v_clave, left(r.ruta, 60),
            case r.tipo when 'number' then 'numero' when 'boolean' then 'booleano' else 'texto' end::public.tipo_campo,
            'Otros datos de apibara', v_orden, r.ruta, false);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke all on function public.origen_apibara_agregar(uuid, text[]) from public, anon;
grant execute on function public.origen_apibara_agregar(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- La subasta de un vehículo: fecha y estado, derivados de lo que apibara dijo
-- ---------------------------------------------------------------------------
-- Una sola regla para el alta, el refresco y la limpieza. El orden importa: un lote vendido que
-- además figura como terminado es vendido.
create or replace function public._vehiculo_subasta_desde(p_raw jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  a jsonb := coalesce(p_raw -> 'auction', '{}'::jsonb);
  v_en timestamptz; v_fin timestamptz; v_estado public.estado_subasta; v_sub text;
  v_resultado text := lower(coalesce(a ->> 'outcome_status', ''));
  v_state text := lower(coalesce(a ->> 'state', ''));
begin
  begin v_en := nullif(a ->> 'auction_at', '')::timestamptz; exception when others then v_en := null; end;
  begin v_fin := coalesce(nullif(a ->> 'timed_end_at', '')::timestamptz, nullif(a ->> 'auction_ended_at', '')::timestamptz);
  exception when others then v_fin := null; end;
  v_sub := lower(coalesce(a ->> 'lot_sub_status', ''));
  if v_resultado in ('sold', 'sold on approval') or coalesce((a ->> 'sold_buy_now')::boolean, false)
     or coalesce((a ->> 'sold_timed')::boolean, false) then
    v_estado := 'vendida';
  elsif v_resultado in ('not sold', 'removed') or coalesce((a ->> 'lot_removed')::boolean, false)
        or nullif(a ->> 'auction_ended_at', '') is not null or v_sub = 'ended'
        or (v_state <> '' and v_state not in ('open', 'live', 'future', 'pre_bid', 'upcoming')) then
    v_estado := 'terminada';
  elsif v_sub = 'live' or v_state = 'live' then
    v_estado := 'en_vivo';
  elsif v_en is not null or v_state <> '' then
    v_estado := 'abierta';
  end if;
  return jsonb_build_object('subasta_en', v_en, 'subasta_fin_en', v_fin, 'estado_subasta', v_estado);
end;
$$;
revoke all on function public._vehiculo_subasta_desde(jsonb) from public, anon, authenticated;

-- Lo que se acepta como respuesta de apibara: un objeto y de tamaño razonable.
create or replace function public._vehiculo_apibara_valido(p_raw jsonb)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(p_raw) <> 'object' then
    raise exception 'La respuesta de apibara no tiene la forma esperada.' using errcode = '22023';
  end if;
  if octet_length(p_raw::text) > 524288 then
    raise exception 'La respuesta de apibara es demasiado grande para guardarla.' using errcode = '22023';
  end if;
end;
$$;
revoke all on function public._vehiculo_apibara_valido(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Alta con la respuesta de apibara
-- ---------------------------------------------------------------------------
-- Cambia la firma: sin el `drop` quedarían dos sobrecargas y la llamada por nombre (PostgREST)
-- sería ambigua. `apibara_sync_en` lo pone la base: no se confía en un reloj de afuera.
drop function if exists public.vehiculo_crear(uuid, uuid, jsonb);

create or replace function public.vehiculo_crear(p_id uuid, p_origen uuid, p_datos jsonb, p_apibara jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.vehiculos; v_origen public.origenes; v_fase uuid; v_flujo uuid; v_sub jsonb;
begin
  if p_id is null or p_origen is null then
    raise exception 'Faltan el identificador y el origen del vehículo.' using errcode = '22023';
  end if;
  perform public.assert_permiso('vehiculos.crear', p_origen);

  select * into v from public.vehiculos x where x.id = p_id;
  if found then
    if v.creado_por is distinct from (select auth.uid()) or v.origen_id <> p_origen then
      raise exception 'Ese identificador ya está en uso. Cierra el formulario y vuelve a abrirlo.' using errcode = '23505';
    end if;
    return jsonb_build_object('id', v.id, 'numero', v.numero, 'actualizado_en', v.actualizado_en, 'fase_id', v.fase_id);
  end if;

  select * into v_origen from public.origenes o where o.id = p_origen;
  if not found then raise exception 'Ese origen ya no existe.' using errcode = 'PT409'; end if;
  if not v_origen.activo then
    raise exception 'El origen «%» está desactivado: no recibe registros nuevos.', v_origen.nombre using errcode = '23514';
  end if;
  if p_apibara is not null then
    if v_origen.tipo <> 'subasta' then
      raise exception 'Sólo un origen de subasta guarda datos de apibara.' using errcode = '22023';
    end if;
    perform public._vehiculo_apibara_valido(p_apibara);
    v_sub := public._vehiculo_subasta_desde(p_apibara);
  end if;

  v.id := p_id;
  v.origen_id := p_origen;
  v.atributos := '{}'::jsonb;
  v := public._vehiculo_aplicar(v, p_datos);
  perform public._vehiculo_sin_repetidos(v);

  begin
    insert into public.vehiculos (id, origen_id, categoria_id, titulo, marca, modelo, anio, vin, lote, plataforma, url_origen,
      precio, precio_negociable, acepta_permuta, placado, kilometraje, atributos, creado_por,
      subasta_en, subasta_fin_en, estado_subasta, apibara_sync_en, apibara_raw)
    values (v.id, v.origen_id, v.categoria_id, v.titulo, v.marca, v.modelo, v.anio, v.vin, v.lote, v.plataforma, v.url_origen,
      v.precio, v.precio_negociable, v.acepta_permuta, v.placado, v.kilometraje, v.atributos, (select auth.uid()),
      (v_sub ->> 'subasta_en')::timestamptz, (v_sub ->> 'subasta_fin_en')::timestamptz,
      (v_sub ->> 'estado_subasta')::public.estado_subasta,
      case when p_apibara is not null then now() end, p_apibara)
    returning * into v;
  exception when unique_violation then
    raise exception 'Ya hay un vehículo con ese VIN o ese lote.' using errcode = '23505';
  end;

  v_fase := public._vehiculo_fase_de_entrada(v.id, p_origen);
  if v_fase is not null then
    select f.flujo_id into v_flujo from public.fases f where f.id = v_fase;
    update public.vehiculos x set fase_id = v_fase, fase_desde = now() where x.id = v.id returning * into v;
    insert into public.historial_fases (flujo_id, vehiculo_id, de_fase_id, a_fase_id, usuario_id)
    values (v_flujo, v.id, null, v_fase, (select auth.uid()));
  end if;
  return jsonb_build_object('id', v.id, 'numero', v.numero, 'actualizado_en', v.actualizado_en, 'fase_id', v.fase_id);
end;
$$;
revoke all on function public.vehiculo_crear(uuid, uuid, jsonb, jsonb) from public, anon;
grant execute on function public.vehiculo_crear(uuid, uuid, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Refrescar la subasta
-- ---------------------------------------------------------------------------
-- Escribe la respuesta nueva (`apibara_raw`, `apibara_sync_en`, fecha y estado: son del sistema,
-- siempre se pisan) y los datos que la app decidió actualizar (`p_datos`, con las mismas claves
-- que `vehiculo_guardar`: la app ya separó lo que la persona editó de lo que no). Lleva la versión
-- del vehículo: quien lo editaba en ese momento ve un conflicto, no se pisa nada.
create or replace function public.vehiculo_subasta_refrescar(
  p_vehiculo uuid, p_actualizado_en_esperado timestamptz, p_apibara jsonb, p_datos jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.vehiculos; n public.vehiculos; v_sub jsonb;
begin
  perform public.assert_activo();
  select * into v from public.vehiculos x where x.id = p_vehiculo and x.eliminado_en is null for update;
  if not found then
    raise exception 'Ese vehículo ya no existe o está en la papelera.' using errcode = 'PT409';
  end if;
  if not public.puede_vehiculo(v.id, 'vehiculos.editar') then
    raise exception 'No tienes permiso para editar este vehículo.' using errcode = '42501';
  end if;
  if p_actualizado_en_esperado is null then
    raise exception 'Falta la versión que tenías en pantalla. Recarga e intenta de nuevo.';
  end if;
  if not exists (select 1 from public.origenes o where o.id = v.origen_id and o.tipo = 'subasta') then
    raise exception 'Sólo un vehículo de subasta se refresca desde apibara.' using errcode = '22023';
  end if;
  if v.actualizado_en is distinct from p_actualizado_en_esperado then
    perform public._conflicto_de_edicion('vehiculos', v.id, v.actualizado_en, 'este vehículo');
  end if;
  perform public._vehiculo_apibara_valido(p_apibara);
  v_sub := public._vehiculo_subasta_desde(p_apibara);

  n := public._vehiculo_aplicar(v, coalesce(p_datos, '{}'::jsonb));
  perform public._vehiculo_sin_repetidos(n);
  begin
    update public.vehiculos x set
      categoria_id = n.categoria_id, titulo = n.titulo, marca = n.marca, modelo = n.modelo, anio = n.anio, vin = n.vin,
      lote = n.lote, plataforma = n.plataforma, url_origen = n.url_origen, precio = n.precio,
      precio_negociable = n.precio_negociable, acepta_permuta = n.acepta_permuta, placado = n.placado,
      kilometraje = n.kilometraje, atributos = n.atributos,
      subasta_en = (v_sub ->> 'subasta_en')::timestamptz, subasta_fin_en = (v_sub ->> 'subasta_fin_en')::timestamptz,
      estado_subasta = (v_sub ->> 'estado_subasta')::public.estado_subasta,
      apibara_sync_en = now(), apibara_raw = p_apibara
    where x.id = v.id
    returning * into n;
  exception when unique_violation then
    raise exception 'Ya hay un vehículo con ese VIN o ese lote.' using errcode = '23505';
  end;
  return jsonb_build_object('actualizado_en', n.actualizado_en, 'subasta_en', n.subasta_en,
    'estado_subasta', n.estado_subasta, 'apibara_sync_en', n.apibara_sync_en);
end;
$$;
revoke all on function public.vehiculo_subasta_refrescar(uuid, timestamptz, jsonb, jsonb) from public, anon;
grant execute on function public.vehiculo_subasta_refrescar(uuid, timestamptz, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Fotos: de dónde vino cada una
-- ---------------------------------------------------------------------------
-- Igual que antes, más `origen_url`: con eso «faltan» es la lista de la respuesta menos lo
-- registrado, y reintentar trae sólo esas.
create or replace function public.vehiculo_fotos_agregar(p_vehiculo uuid, p_fotos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  f jsonb; v_version timestamptz; v_hay int; v_hash text; v_orden int; v_id uuid; v_url text;
  v_agregadas text[] := '{}'; v_repetidas text[] := '{}'; v_sin_lugar text[] := '{}';
begin
  v_version := public._fotos_abrir(p_vehiculo);
  if jsonb_typeof(p_fotos) is distinct from 'array' or jsonb_array_length(p_fotos) = 0 then
    raise exception 'No llegó ninguna foto.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_fotos) > 24 then
    raise exception 'Un vehículo admite hasta 24 fotos.' using errcode = '23514';
  end if;
  select count(*) into v_hay from public.vehiculos_imagenes x where x.vehiculo_id = p_vehiculo;

  for f in select * from jsonb_array_elements(p_fotos) loop
    v_hash := f ->> 'hash';
    if v_hash is null or v_hash !~ '^[0-9a-f]{64}$' then
      raise exception 'Una de las fotos llegó incompleta. Vuelve a elegirla.' using errcode = '22023';
    end if;
    v_url := nullif(btrim(f ->> 'origen_url'), '');
    if v_url is not null and (char_length(v_url) > 1000 or v_url !~* '^https?://[^[:space:]]+$') then
      raise exception 'La dirección de origen de una foto no es válida.' using errcode = '22023';
    end if;
    if v_hash = any (v_agregadas) or exists (select 1 from public.vehiculos_imagenes x where x.vehiculo_id = p_vehiculo and x.hash = v_hash) then
      v_repetidas := v_repetidas || v_hash;
      continue;
    end if;
    if v_hay >= 24 then
      v_sin_lugar := v_sin_lugar || v_hash;
      continue;
    end if;
    -- Al final, salvo que traiga su lugar: ahí se le hace sitio.
    v_orden := least(greatest(coalesce((f ->> 'orden')::int, v_hay + 1), 1), v_hay + 1);
    update public.vehiculos_imagenes x set orden = x.orden + 1 where x.vehiculo_id = p_vehiculo and x.orden >= v_orden;
    insert into public.vehiculos_imagenes (vehiculo_id, hash, ruta, ruta_miniatura, ancho, alto, bytes, orden, origen_url)
    values (p_vehiculo, v_hash, f ->> 'ruta', f ->> 'ruta_miniatura', (f ->> 'ancho')::int, (f ->> 'alto')::int, (f ->> 'bytes')::int, v_orden, v_url)
    returning id into v_id;
    if coalesce((f ->> 'es_portada')::boolean, false) then
      update public.vehiculos_imagenes x set es_portada = false where x.vehiculo_id = p_vehiculo and x.es_portada;
      update public.vehiculos_imagenes x set es_portada = true where x.id = v_id;
    end if;
    v_hay := v_hay + 1;
    v_agregadas := v_agregadas || v_hash;
  end loop;

  if cardinality(v_agregadas) > 0 then
    v_version := public._fotos_cerrar(p_vehiculo, 'vehiculo.fotos_agregadas', jsonb_build_object('cantidad', cardinality(v_agregadas)));
  end if;
  return jsonb_build_object('actualizado_en', v_version, 'agregadas', to_jsonb(v_agregadas),
    'repetidas', to_jsonb(v_repetidas), 'sin_lugar', to_jsonb(v_sin_lugar));
end;
$$;

-- ---------------------------------------------------------------------------
-- Repetidos: antes de traer nada
-- ---------------------------------------------------------------------------
-- `p_claves` = [{vin?, lote?, plataforma?}, …] (una por línea pegada). Devuelve, por posición, si
-- ya hay un vehículo vivo con ese VIN (en cualquier origen) o con ese lote en este origen. El id
-- sólo vuelve si quien pregunta lo puede ver: lo demás es «existe, pero no lo ves».
create or replace function public.vehiculos_repetidos(p_origen uuid, p_claves jsonb)
returns table (posicion int, vehiculo_id uuid, visible boolean)
language plpgsql stable security definer set search_path = '' as $$
declare k jsonb; i int := 0; v_id uuid; v_vin text; v_lote text; v_plat text;
begin
  perform public.assert_permiso('vehiculos.crear', p_origen);
  if jsonb_typeof(p_claves) is distinct from 'array' or jsonb_array_length(p_claves) > 100 then
    raise exception 'Las claves a revisar tienen que ser una lista de hasta 100.' using errcode = '22023';
  end if;
  for k in select * from jsonb_array_elements(p_claves) loop
    i := i + 1;
    v_id := null;
    v_vin := nullif(upper(btrim(k ->> 'vin')), '');
    v_lote := nullif(btrim(k ->> 'lote'), '');
    v_plat := nullif(lower(btrim(k ->> 'plataforma')), '');
    if v_vin is not null then
      select x.id into v_id from public.vehiculos x where x.vin = v_vin and x.eliminado_en is null limit 1;
    end if;
    if v_id is null and v_lote is not null then
      select x.id into v_id from public.vehiculos x
      where x.origen_id = p_origen and x.lote = v_lote and x.eliminado_en is null
        and (v_plat is null or x.plataforma is not distinct from v_plat) limit 1;
    end if;
    if v_id is not null then
      posicion := i;
      visible := public.puede_vehiculo(v_id, 'vehiculos.ver');
      vehiculo_id := case when visible then v_id end;
      return next;
    end if;
  end loop;
end;
$$;
revoke all on function public.vehiculos_repetidos(uuid, jsonb) from public, anon;
grant execute on function public.vehiculos_repetidos(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Qué puede hacer quien llama con apibara en un origen
-- ---------------------------------------------------------------------------
-- La edge function lo pregunta con la sesión de quien llama, antes de leer la clave. Las
-- plataformas son las de la integración (el techo) que además el origen acepta; un origen sin
-- plataformas elegidas acepta las de la integración.
create or replace function public.apibara_contexto(p_origen uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_int public.integraciones; v_origen public.origenes; v_plat text[]; v_config text[];
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('aplica', false);
  end if;
  select * into v_int from public.integraciones i where i.clave = 'apibara';
  select * into v_origen from public.origenes o where o.id = p_origen;
  if not found or v_origen.tipo <> 'subasta' then
    return jsonb_build_object('aplica', false);
  end if;
  select coalesce(array_agg(x), '{}') into v_config from jsonb_array_elements_text(coalesce(v_int.config -> 'plataformas', '[]'::jsonb)) x;
  v_plat := case when cardinality(v_origen.apibara_plataformas) = 0 then v_config
                 else (select coalesce(array_agg(p), '{}') from unnest(v_origen.apibara_plataformas) p where p = any (v_config)) end;
  return jsonb_build_object(
    'aplica', true,
    'activa', coalesce(v_int.activa, false) and v_int.secreto_guardado_en is not null,
    'endpoint', v_int.config ->> 'endpoint',
    'plataformas', to_jsonb(v_plat),
    'puede_crear', public.tiene_permiso('vehiculos.crear', p_origen),
    'puede_editar', public.tiene_permiso('vehiculos.editar', p_origen),
    'puede_ver_uso', public.tiene_permiso('empresa.ajustes.gestionar'));
end;
$$;
revoke all on function public.apibara_contexto(uuid) from public, anon;
grant execute on function public.apibara_contexto(uuid) to authenticated;
