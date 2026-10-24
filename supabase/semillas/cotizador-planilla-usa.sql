-- Fórmula v1 de planilla_usa: el Excel de cotización, sus cuatro cotizaciones en una fórmula con su variante.
-- Es el caso «excel: las cuatro cotizaciones…» de `casos-de-formula.json` con los tonos del catálogo (verde, amarillo, naranja). Los tipos de cambio son los
-- de la empresa: para reproducir los totales del Excel hay que sobrescribir el oficial (9,73) y el paralelo (10), que son los de su hoja.
-- Nace por el mismo camino que publicar: `validar_formula()`, `validar_diseno()` con los niveles y los tonos de verdad y
-- `_compilar_visibilidad()` (todo en `_preparar_publicacion()`, la que usa `_publicar_formula()`). Un diseño inválido tumba el seed con la regla y su
-- `donde`. Y la versión pasa el `check` «una publicada tiene diseño y visibilidad». `entities/semilla.test.ts` la compara con `casos-de-formula.json` y
-- `casos-de-diseno.json`; `supabase/tests/semilla-cotizador.sql` la evalúa contra las cifras de las capturas y del Excel.
do $$
declare v_origen uuid; v_def jsonb; v_params jsonb; v_diseno jsonb;
begin
  select id into v_origen from public.origenes where clave = 'planilla_usa';
  if exists (select 1 from public.formulas where origen_id = v_origen) then return; end if;
  v_def := $j${"nodos": [
    {"id":"variante","tipo":"opcion","etiqueta":"Variante","opciones":[{"clave":"moto","etiqueta":"Moto","titulo":"COTIZACIÓN MOTO EEUU - BOLIVIA"},{"clave":"gasolina","etiqueta":"Auto gasolina","titulo":"COTIZACIÓN VEHÍCULOS A GASOLINA EEUU - BOL"},{"clave":"chile","etiqueta":"USA → Chile","titulo":"COTIZACIÓN VEHÍCULOS EEUU - CHILE"},{"clave":"hibrido","etiqueta":"Híbrido / eléctrico","titulo":"COTIZACIÓN HÍBRIDOS Y ELÉCTRICOS EEUU - BOL"}],"por_defecto":"gasolina"},
    {"id":"tc_oficial","tipo":"tipo_cambio","clave":"oficial","etiqueta":"TC oficial","formato":"raw"},
    {"id":"tc_paralelo","tipo":"tipo_cambio","clave":"paralelo","etiqueta":"TC paralelo","formato":"raw"},
    {"id":"tc_unificado","tipo":"tipo_cambio","clave":"unificado","etiqueta":"Dólar unificado","formato":"raw"},
    {"id":"anio","tipo":"campo_vehiculo","campo":"anio","etiqueta":"Año","formato":"raw"},
    {"id":"cuenta_especial_usa","tipo":"bandera","etiqueta":"Cuenta especial USA","formato":"raw"},
    {"id":"remate","tipo":"input","etiqueta":"Remate (costo aprox.)","descripcion":"Probabilidad de compra en subasta","grupo":"compra"},
    {"id":"fees_pct","tipo":"constante","etiqueta":"Fees (%)","formato":"pct"},
    {"id":"fees","tipo":"calculo","op":"porcentaje_de","de":["remate"],"pct":"fees_pct","etiqueta":"Fees / Tarifa USA","descripcion":"Comisión de subasta USA (aprox.)","grupo":"compra","sobrescribible":true},
    {"id":"transferencia_pct","tipo":"constante","etiqueta":"Transferencia (%)","formato":"pct"},
    {"id":"transferencia","tipo":"calculo","op":"porcentaje_de","de":["remate","fees"],"pct":"transferencia_pct","etiqueta":"Transferencia a USA","descripcion":"Comisión giro 4%","grupo":"compra"},
    {"id":"cuenta_especial","tipo":"input","etiqueta":"Cuenta especial USA","condicion":"cuenta_especial_usa","grupo":"compra"},
    {"id":"grua","tipo":"input","etiqueta":"Grúa","descripcion":"Traslado al puerto (USA)","grupo":"logistica"},
    {"id":"transporte_bolivia","tipo":"tabla","tabla":"transporte_usa_bolivia","match":{"tipo":"tipo_vehiculo"},"columna":"cliente","etiqueta":"Transporte","descripcion":"USA - Chile / Chile - Bolivia (Cbba.)","solo_en":["moto","gasolina","hibrido"],"grupo":"logistica","sobrescribible":true},
    {"id":"transporte_chile","tipo":"tabla","tabla":"transporte_usa_chile","match":{"tipo":"tipo_vehiculo"},"columna":"cliente","etiqueta":"Transporte","descripcion":"USA - Chile","solo_en":["chile"],"grupo":"logistica","sobrescribible":true},
    {"id":"comision","tipo":"tabla","tabla":"comision_por_variante","match":{"variante":"variante"},"columna":"monto","etiqueta":"Comisión","descripcion":"Servicio de logística","grupo":"logistica","sobrescribible":true},
    {"id":"documentacion","tipo":"constante","etiqueta":"Documentación de ingreso","descripcion":"Facturas y documentos de ingreso","solo_en":["gasolina","hibrido"],"grupo":"logistica"},
    {"id":"export","tipo":"constante","etiqueta":"Export. Hybrid o Electric","descripcion":"Trámite en USA","solo_en":["hibrido"],"grupo":"logistica"},
    {"id":"valor_tabla","tipo":"input","etiqueta":"Valor tabla (FOB o MSRP)"},
    {"id":"factor_dp","tipo":"tabla","tabla":"depreciacion","match":{"anio":"anio"},"columna":"factor","etiqueta":"Factor DP gasolina","formato":"raw","sobrescribible":true},
    {"id":"fob","tipo":"calculo","op":"multiplicar","de":["valor_tabla","factor_dp"],"etiqueta":"Valor FOB"},
    {"id":"seguro_pct","tipo":"constante","etiqueta":"Seguro (%)","formato":"pct"},
    {"id":"seguro","tipo":"calculo","op":"porcentaje_de","de":["fob"],"pct":"seguro_pct","etiqueta":"Seguro"},
    {"id":"flete","tipo":"constante","etiqueta":"Flete I y II"},
    {"id":"gasto_puerto","tipo":"constante","etiqueta":"Gasto de puerto"},
    {"id":"gasto_taller","tipo":"constante","etiqueta":"Gasto de taller"},
    {"id":"utilidad","tipo":"constante","etiqueta":"Utilidad"},
    {"id":"cif","tipo":"calculo","op":"suma","de":["fob","seguro","flete","gasto_puerto","gasto_taller","utilidad"],"etiqueta":"Valor CIF","salida":"base_imponible"},
    {"id":"ga_pct","tipo":"constante","etiqueta":"Gravamen arancelario (%)","formato":"pct"},
    {"id":"ga","tipo":"calculo","op":"porcentaje_de","de":["cif"],"pct":"ga_pct","etiqueta":"Gravamen arancelario (GA)"},
    {"id":"iva_pct","tipo":"constante","etiqueta":"IVA (%)","formato":"pct"},
    {"id":"iva","tipo":"calculo","op":"porcentaje_de","de":["cif","ga"],"pct":"iva_pct","etiqueta":"IVA"},
    {"id":"ice_pct","tipo":"constante","etiqueta":"ICE (%)","formato":"pct"},
    {"id":"ice","tipo":"calculo","op":"porcentaje_de","de":["cif","ga"],"pct":"ice_pct","etiqueta":"ICE"},
    {"id":"total_impuesto","tipo":"calculo","op":"suma","de":["ga","iva","ice"],"etiqueta":"Total impuesto"},
    {"id":"factura_taller","tipo":"constante","etiqueta":"Factura de taller"},
    {"id":"almacenaje","tipo":"constante","etiqueta":"Almacenaje"},
    {"id":"total_gastos","tipo":"calculo","op":"suma","de":["total_impuesto","factura_taller","almacenaje"],"etiqueta":"Total gastos"},
    {"id":"agencia","tipo":"constante","etiqueta":"Agencia"},
    {"id":"gas_sao","tipo":"constante","etiqueta":"Gas, SAO"},
    {"id":"factura_venta","tipo":"constante","etiqueta":"Factura de venta"},
    {"id":"almacenaje_salida","tipo":"constante","etiqueta":"Almacenaje de salida"},
    {"id":"nacionalizacion","tipo":"calculo","op":"suma","de":["total_gastos","agencia","gas_sao","factura_venta","almacenaje_salida"],"etiqueta":"Nacionalización","descripcion":"Póliza y gastos aduaneros","solo_en":["moto","gasolina","hibrido"],"grupo":"aduana","sobrescribible":true},
    {"id":"garantia_pct","tipo":"constante","etiqueta":"Garantía (%)","formato":"pct"},
    {"id":"garantia","tipo":"calculo","op":"porcentaje_de","de":["remate"],"pct":"garantia_pct","etiqueta":"Garantía de participación","salida":"aparte"},
    {"id":"total","tipo":"calculo","op":"suma","de":["remate","fees","transferencia","cuenta_especial","grua","transporte_bolivia","transporte_chile","comision","documentacion","export","nacionalizacion"],"etiqueta":"TOTAL","salida":"total","descripcion":"Todo con papeles, fuera de Aduana Nacional Cochabamba (No incluye reparación)"}
  ], "buckets": {"exterior":"tc_paralelo","aduana":"tc_oficial"}, "total_en": "tc_paralelo", "grupos": [{"id":"compra","etiqueta":"Compra","plazo":"2 días","tono":"verde","bucket":"exterior"},{"id":"logistica","etiqueta":"Logística","plazo":"7 días","tono":"amarillo","bucket":"exterior"},{"id":"aduana","etiqueta":"Aduana","plazo":"4 meses (Aprox.)","tono":"naranja","bucket":"aduana"}]}$j$;
  v_params := $j${
    "fees_pct": 0.13,
    "transferencia_pct": 0.04,
    "documentacion": 700,
    "export": 500,
    "seguro_pct": 0.02,
    "flete": 900,
    "gasto_puerto": 35,
    "gasto_taller": 200,
    "utilidad": 20,
    "ga_pct": 0.1,
    "iva_pct": 0.1494,
    "ice_pct": 0.15,
    "factura_taller": 100,
    "almacenaje": 0,
    "agencia": 150,
    "gas_sao": 70,
    "factura_venta": 300,
    "almacenaje_salida": 160,
    "garantia_pct": 0.15,
    "tablas": {
      "depreciacion": [{"anio":2018,"factor":0.328},{"anio":2019,"factor":0.328},{"anio":2020,"factor":0.328},{"anio":2021,"factor":0.328},{"anio":2022,"factor":0.41},{"anio":2023,"factor":0.512},{"anio":2024,"factor":0.64},{"anio":2025,"factor":0.8},{"anio":2026,"factor":1}],
      "transporte_usa_bolivia": [{"tipo":"autos","oficina":2700,"cliente":3000},{"tipo":"vagonetas_medianas","oficina":3300,"cliente":3600},{"tipo":"vagonetas_grandes","oficina":3400,"cliente":3700},{"tipo":"camionetas_medianas","oficina":3400,"cliente":3700},{"tipo":"camionetas_grandes","oficina":3700,"cliente":4000},{"tipo":"utv","oficina":2700,"cliente":3000},{"tipo":"atv","oficina":null,"cliente":null},{"tipo":"motos","oficina":null,"cliente":null}],
      "transporte_usa_chile": [{"tipo":"autos","oficina":2400,"cliente":2700},{"tipo":"vagonetas_medianas","oficina":3000,"cliente":3300},{"tipo":"vagonetas_grandes","oficina":3100,"cliente":3400},{"tipo":"camionetas_medianas","oficina":3100,"cliente":3400},{"tipo":"camionetas_grandes","oficina":3400,"cliente":3700},{"tipo":"utv","oficina":2400,"cliente":2700},{"tipo":"atv","oficina":null,"cliente":null},{"tipo":"motos","oficina":null,"cliente":null}],
      "comision_por_variante": [{"variante":"moto","monto":400},{"variante":"gasolina","monto":500},{"variante":"chile","monto":400},{"variante":"hibrido","monto":500}]
    }
  }$j$;
  v_diseno := $j${"secciones": [
    {"id":"hoja","titulo":"Hoja","presentacion":"principal","items":[{"tipo":"variante","nodo":"variante"},{"tipo":"interruptor","nodo":"cuenta_especial_usa","efecto":"habilita"}]},
    {"id":"compra","titulo":"Compra","presentacion":"principal","items":[{"tipo":"celda","nodo":"remate","ancho":"completo"},{"tipo":"celda","nodo":"fees","ancho":"mitad","secundario":"porcentaje"},{"tipo":"celda","nodo":"transferencia","ancho":"mitad","secundario":"porcentaje"},{"tipo":"celda","nodo":"cuenta_especial","ancho":"completo"}]},
    {"id":"logistica","titulo":"Logística","presentacion":"principal","items":[{"tipo":"celda","nodo":"grua","ancho":"completo"},{"tipo":"celda","nodo":"transporte_bolivia","ancho":"mitad","ayuda":{"tabla":"transporte_usa_bolivia"}},{"tipo":"celda","nodo":"transporte_chile","ancho":"mitad","ayuda":{"tabla":"transporte_usa_chile"}},{"tipo":"celda","nodo":"comision","ancho":"mitad"},{"tipo":"celda","nodo":"documentacion","ancho":"mitad"},{"tipo":"celda","nodo":"export","ancho":"mitad"}]},
    {"id":"aduana","titulo":"Aduana","presentacion":"principal","items":[{"tipo":"celda","nodo":"nacionalizacion","ancho":"completo"}]},
    {"id":"cif","titulo":"Componentes CIF","presentacion":"avanzado","items":[{"tipo":"celda","nodo":"valor_tabla","ancho":"mitad"},{"tipo":"atajos","nodo":"factor_dp","columna":"anio","filas":8},{"tipo":"celda","nodo":"factor_dp","ancho":"mitad","ayuda":{"tabla":"depreciacion"}},{"tipo":"celda","nodo":"fob","ancho":"completo"},{"tipo":"celda","nodo":"seguro","ancho":"mitad","secundario":"porcentaje"},{"tipo":"celda","nodo":"flete","ancho":"tercio"},{"tipo":"celda","nodo":"gasto_puerto","ancho":"tercio"},{"tipo":"celda","nodo":"gasto_taller","ancho":"tercio"},{"tipo":"celda","nodo":"utilidad","ancho":"tercio"},{"tipo":"subtotal","nodo":"cif"}],"nivel_ver":"costos","nivel_editar":"costos"},
    {"id":"impuestos","titulo":"Impuestos","presentacion":"avanzado","items":[{"tipo":"celda","nodo":"ga","ancho":"tercio","secundario":"porcentaje"},{"tipo":"celda","nodo":"iva","ancho":"tercio","secundario":"porcentaje"},{"tipo":"celda","nodo":"ice","ancho":"tercio","secundario":"porcentaje"},{"tipo":"subtotal","nodo":"total_impuesto"}],"nivel_ver":"costos","nivel_editar":"costos"},
    {"id":"poliza","titulo":"Póliza","presentacion":"avanzado","items":[{"tipo":"celda","nodo":"factura_taller","ancho":"mitad"},{"tipo":"celda","nodo":"almacenaje","ancho":"mitad"},{"tipo":"subtotal","nodo":"total_gastos"},{"tipo":"celda","nodo":"agencia","ancho":"tercio"},{"tipo":"celda","nodo":"gas_sao","ancho":"tercio"},{"tipo":"celda","nodo":"factura_venta","ancho":"tercio"},{"tipo":"celda","nodo":"almacenaje_salida","ancho":"tercio"}],"nivel_ver":"costos","nivel_editar":"costos"},
    {"id":"garantia","titulo":"Garantía","presentacion":"principal","items":[{"tipo":"celda","nodo":"garantia","ancho":"completo","secundario":"porcentaje"}]}
  ], "cabecera": {"modos":[],"ver_total_bs":false}, "tarjeta_total": {"nodo":"total","secundarios":["garantia"]}}$j$;

  -- Las tablas de referencia de la hoja: las MISMAS filas que la versión congela en `params.tablas` (D5), generadas de ellas para que la viva y la
  -- congelada no puedan diferir. El transporte es el del Excel (`docs/referencias/excel-de-cotizacion.md`, «Tablas de referencia»).
  insert into public.tablas_referencia (origen_id, clave, nombre, columnas) values
    (v_origen, 'depreciacion', 'Depreciación por año', '[{"clave":"anio","etiqueta":"Año","tipo":"anio"},{"clave":"factor","etiqueta":"Factor","tipo":"numero"}]'),
    (v_origen, 'transporte_usa_bolivia', 'Transporte EE. UU. a Bolivia', '[{"clave":"tipo","etiqueta":"Tipo de vehículo","tipo":"texto"},{"clave":"oficina","etiqueta":"Oficina","tipo":"numero"},{"clave":"cliente","etiqueta":"Cliente","tipo":"numero"}]'),
    (v_origen, 'transporte_usa_chile', 'Transporte EE. UU. a Chile', '[{"clave":"tipo","etiqueta":"Tipo de vehículo","tipo":"texto"},{"clave":"oficina","etiqueta":"Oficina","tipo":"numero"},{"clave":"cliente","etiqueta":"Cliente","tipo":"numero"}]'),
    (v_origen, 'comision_por_variante', 'Comisión por variante', '[{"clave":"variante","etiqueta":"Variante","tipo":"texto"},{"clave":"monto","etiqueta":"Monto","tipo":"numero"}]');
  insert into public.tablas_referencia_filas (tabla_id, valores, orden)
  select t.id, f.valor, (f.n - 1)::smallint
    from jsonb_each(v_params -> 'tablas') e
    join public.tablas_referencia t on t.origen_id = v_origen and t.clave = e.key
    cross join lateral jsonb_array_elements(e.value) with ordinality f (valor, n);
  insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
  values (v_origen, 1, 'publicada', v_def, v_params, v_diseno, public._preparar_publicacion(v_def, v_params, v_diseno, false), 'Fórmula inicial', now());
end $$;
