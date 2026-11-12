export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      accesos_portal: {
        Row: {
          bloqueado_hasta: string | null
          clave_hash: string
          codigo: string
          debe_cambiar_clave: boolean
          habilitado: boolean
          intentos_fallidos: number
          lead_id: string
          otorgado_en: string
          otorgado_por: string | null
          revocado_en: string | null
          revocado_por: string | null
          ultimo_ingreso_en: string | null
        }
        ComputedFields: never
        Insert: {
          bloqueado_hasta?: string | null
          clave_hash: string
          codigo: string
          debe_cambiar_clave?: boolean
          habilitado?: boolean
          intentos_fallidos?: number
          lead_id: string
          otorgado_en?: string
          otorgado_por?: string | null
          revocado_en?: string | null
          revocado_por?: string | null
          ultimo_ingreso_en?: string | null
        }
        Update: {
          bloqueado_hasta?: string | null
          clave_hash?: string
          codigo?: string
          debe_cambiar_clave?: boolean
          habilitado?: boolean
          intentos_fallidos?: number
          lead_id?: string
          otorgado_en?: string
          otorgado_por?: string | null
          revocado_en?: string | null
          revocado_por?: string | null
          ultimo_ingreso_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'accesos_portal_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: true
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accesos_portal_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: true
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accesos_portal_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: true
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'accesos_portal_otorgado_por_fkey'
            columns: ['otorgado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'accesos_portal_revocado_por_fkey'
            columns: ['revocado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      actividad: {
        Row: {
          accion: string
          actor_id: string | null
          antes: Json | null
          creado_en: string
          despues: Json | null
          detalle: Json | null
          id: number
          registro_id: string | null
          tabla: string | null
        }
        ComputedFields: never
        Insert: {
          accion: string
          actor_id?: string | null
          antes?: Json | null
          creado_en?: string
          despues?: Json | null
          detalle?: Json | null
          id?: never
          registro_id?: string | null
          tabla?: string | null
        }
        Update: {
          accion?: string
          actor_id?: string | null
          antes?: Json | null
          creado_en?: string
          despues?: Json | null
          detalle?: Json | null
          id?: never
          registro_id?: string | null
          tabla?: string | null
        }
        Relationships: []
      }
      ajustes_empresa: {
        Row: {
          actividad_dias: number
          actualizado_en: string
          actualizado_por: string | null
          ciudad: string | null
          color_acento: string | null
          demora_dias_default: number
          direccion: string | null
          email: string | null
          iconos: Json | null
          id: number
          lead_dormido_meses: number
          limpieza_automatica: boolean
          limpieza_dias_gracia: number
          locale: string
          logo_oscuro_ruta: string | null
          logo_ruta: string | null
          moneda_base: string
          nit: string | null
          nombre: string
          pais: string
          papelera_dias: number
          razon_social: string | null
          registro_abierto: boolean
          telefono: string | null
          telefono_cc: string | null
          vehiculo_obligatorio_al_cotizar: boolean
          vigencia_dias: number
          whatsapp: string | null
          zona_horaria: string
        }
        ComputedFields: never
        Insert: {
          actividad_dias?: number
          actualizado_en?: string
          actualizado_por?: string | null
          ciudad?: string | null
          color_acento?: string | null
          demora_dias_default?: number
          direccion?: string | null
          email?: string | null
          iconos?: Json | null
          id?: number
          lead_dormido_meses?: number
          limpieza_automatica?: boolean
          limpieza_dias_gracia?: number
          locale?: string
          logo_oscuro_ruta?: string | null
          logo_ruta?: string | null
          moneda_base?: string
          nit?: string | null
          nombre?: string
          pais?: string
          papelera_dias?: number
          razon_social?: string | null
          registro_abierto?: boolean
          telefono?: string | null
          telefono_cc?: string | null
          vehiculo_obligatorio_al_cotizar?: boolean
          vigencia_dias?: number
          whatsapp?: string | null
          zona_horaria?: string
        }
        Update: {
          actividad_dias?: number
          actualizado_en?: string
          actualizado_por?: string | null
          ciudad?: string | null
          color_acento?: string | null
          demora_dias_default?: number
          direccion?: string | null
          email?: string | null
          iconos?: Json | null
          id?: number
          lead_dormido_meses?: number
          limpieza_automatica?: boolean
          limpieza_dias_gracia?: number
          locale?: string
          logo_oscuro_ruta?: string | null
          logo_ruta?: string | null
          moneda_base?: string
          nit?: string | null
          nombre?: string
          pais?: string
          papelera_dias?: number
          razon_social?: string | null
          registro_abierto?: boolean
          telefono?: string | null
          telefono_cc?: string | null
          vehiculo_obligatorio_al_cotizar?: boolean
          vigencia_dias?: number
          whatsapp?: string | null
          zona_horaria?: string
        }
        Relationships: []
      }
      ajustes_leads: {
        Row: {
          embudo_actualizado_en: string
          embudo_etapas: Json | null
          id: number
          portal_actualizado_en: string
          portal_mensaje: string | null
        }
        ComputedFields: never
        Insert: {
          embudo_actualizado_en?: string
          embudo_etapas?: Json | null
          id?: number
          portal_actualizado_en?: string
          portal_mensaje?: string | null
        }
        Update: {
          embudo_actualizado_en?: string
          embudo_etapas?: Json | null
          id?: number
          portal_actualizado_en?: string
          portal_mensaje?: string | null
        }
        Relationships: []
      }
      ajustes_web: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          cola_activa: boolean
          dias_pegajoso: number
          direccion_publica: string | null
          horario: string | null
          id: number
          legales: NonNullable<Json>
          lema: string | null
          max_abiertas_default: number
          max_intentos: number
          mostrar_moneda_secundaria: boolean
          nombre_sitio: string | null
          origenes_visibles: string[]
          redes: NonNullable<Json>
          seo: NonNullable<Json>
          ttl_contacto_minutos: number
          whatsapp_respaldo: string | null
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          cola_activa?: boolean
          dias_pegajoso?: number
          direccion_publica?: string | null
          horario?: string | null
          id?: number
          legales?: NonNullable<Json>
          lema?: string | null
          max_abiertas_default?: number
          max_intentos?: number
          mostrar_moneda_secundaria?: boolean
          nombre_sitio?: string | null
          origenes_visibles?: string[]
          redes?: NonNullable<Json>
          seo?: NonNullable<Json>
          ttl_contacto_minutos?: number
          whatsapp_respaldo?: string | null
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          cola_activa?: boolean
          dias_pegajoso?: number
          direccion_publica?: string | null
          horario?: string | null
          id?: number
          legales?: NonNullable<Json>
          lema?: string | null
          max_abiertas_default?: number
          max_intentos?: number
          mostrar_moneda_secundaria?: boolean
          nombre_sitio?: string | null
          origenes_visibles?: string[]
          redes?: NonNullable<Json>
          seo?: NonNullable<Json>
          ttl_contacto_minutos?: number
          whatsapp_respaldo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ajustes_web_actualizado_por_fkey'
            columns: ['actualizado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      apibara_consultas: {
        Row: {
          creado_en: string
          creado_por: string
          id: string
          origen_id: string
          raw: NonNullable<Json>
          vehiculo_id: string | null
        }
        ComputedFields: never
        Insert: {
          creado_en?: string
          creado_por: string
          id?: string
          origen_id: string
          raw: NonNullable<Json>
          vehiculo_id?: string | null
        }
        Update: {
          creado_en?: string
          creado_por?: string
          id?: string
          origen_id?: string
          raw?: NonNullable<Json>
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'apibara_consultas_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'apibara_consultas_origen_id_fkey'
            columns: ['origen_id']
            isOneToOne: false
            referencedRelation: 'origenes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'apibara_consultas_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'apibara_consultas_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      categorias: {
        Row: {
          activa: boolean
          actualizado_en: string
          id: string
          nombre: string
          orden: number
          origen_id: string
          padre_id: string | null
        }
        ComputedFields: never
        Insert: {
          activa?: boolean
          actualizado_en?: string
          id?: string
          nombre: string
          orden?: number
          origen_id: string
          padre_id?: string | null
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          id?: string
          nombre?: string
          orden?: number
          origen_id?: string
          padre_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'categorias_origen_id_fkey'
            columns: ['origen_id']
            isOneToOne: false
            referencedRelation: 'origenes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'categorias_padre_id_fkey'
            columns: ['padre_id']
            isOneToOne: false
            referencedRelation: 'categorias'
            referencedColumns: ['id']
          },
        ]
      }
      categorias_gasto: {
        Row: {
          activo: boolean
          id: string
          nombre: string
          orden: number
          proposito: string | null
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          id?: string
          nombre: string
          orden?: number
          proposito?: string | null
        }
        Update: {
          activo?: boolean
          id?: string
          nombre?: string
          orden?: number
          proposito?: string | null
        }
        Relationships: []
      }
      cola_gc_barrido: {
        Row: {
          actualizado_en: string
          bucket: string
          ultimo_nombre: string
          vuelta_desde: string
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          bucket: string
          ultimo_nombre?: string
          vuelta_desde?: string
        }
        Update: {
          actualizado_en?: string
          bucket?: string
          ultimo_nombre?: string
          vuelta_desde?: string
        }
        Relationships: []
      }
      cola_gc_pases: {
        Row: {
          creado_en: string
          pase: string
          usado_en: string | null
        }
        ComputedFields: never
        Insert: {
          creado_en?: string
          pase?: string
          usado_en?: string | null
        }
        Update: {
          creado_en?: string
          pase?: string
          usado_en?: string | null
        }
        Relationships: []
      }
      cola_gc_storage: {
        Row: {
          bucket: string
          encolado_en: string
          reclamado_en: string | null
          ruta: string
        }
        ComputedFields: never
        Insert: {
          bucket: string
          encolado_en?: string
          reclamado_en?: string | null
          ruta: string
        }
        Update: {
          bucket?: string
          encolado_en?: string
          reclamado_en?: string | null
          ruta?: string
        }
        Relationships: []
      }
      cola_web_asesores: {
        Row: {
          asignadas_total: number
          contactadas_total: number
          disponible: boolean
          habilitado: boolean
          max_abiertas: number | null
          orden: number
          prioridad: number
          ultima_asignacion_en: string | null
          usuario_id: string
          vencidas_total: number
        }
        ComputedFields: never
        Insert: {
          asignadas_total?: number
          contactadas_total?: number
          disponible?: boolean
          habilitado?: boolean
          max_abiertas?: number | null
          orden?: number
          prioridad?: number
          ultima_asignacion_en?: string | null
          usuario_id: string
          vencidas_total?: number
        }
        Update: {
          asignadas_total?: number
          contactadas_total?: number
          disponible?: boolean
          habilitado?: boolean
          max_abiertas?: number | null
          orden?: number
          prioridad?: number
          ultima_asignacion_en?: string | null
          usuario_id?: string
          vencidas_total?: number
        }
        Relationships: [
          {
            foreignKeyName: 'cola_web_asesores_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: true
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      comprobantes: {
        Row: {
          anulado_en: string | null
          anulado_por: string | null
          cotizacion_id: string
          datos: NonNullable<Json>
          emitido_en: string
          emitido_por: string | null
          id: string
          motivo_anulacion: string | null
          numero: number
          serie: string
        }
        ComputedFields: never
        Insert: {
          anulado_en?: string | null
          anulado_por?: string | null
          cotizacion_id: string
          datos: NonNullable<Json>
          emitido_en?: string
          emitido_por?: string | null
          id?: string
          motivo_anulacion?: string | null
          numero: number
          serie: string
        }
        Update: {
          anulado_en?: string | null
          anulado_por?: string | null
          cotizacion_id?: string
          datos?: NonNullable<Json>
          emitido_en?: string
          emitido_por?: string | null
          id?: string
          motivo_anulacion?: string | null
          numero?: number
          serie?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comprobantes_anulado_por_fkey'
            columns: ['anulado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comprobantes_cotizacion_id_fkey'
            columns: ['cotizacion_id']
            isOneToOne: false
            referencedRelation: 'cotizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comprobantes_emitido_por_fkey'
            columns: ['emitido_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comprobantes_serie_fkey'
            columns: ['serie']
            isOneToOne: false
            referencedRelation: 'comprobantes_contadores'
            referencedColumns: ['serie']
          },
        ]
      }
      comprobantes_ajustes: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          serie: string
          unica: boolean
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          serie: string
          unica?: boolean
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          serie?: string
          unica?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'comprobantes_ajustes_actualizado_por_fkey'
            columns: ['actualizado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'comprobantes_ajustes_serie_fkey'
            columns: ['serie']
            isOneToOne: false
            referencedRelation: 'comprobantes_contadores'
            referencedColumns: ['serie']
          },
        ]
      }
      comprobantes_contadores: {
        Row: {
          serie: string
          ultimo: number
        }
        ComputedFields: never
        Insert: {
          serie: string
          ultimo?: number
        }
        Update: {
          serie?: string
          ultimo?: number
        }
        Relationships: []
      }
      conversaciones: {
        Row: {
          actualizado_en: string
          creado_en: string
          creado_por: string | null
          es_global: boolean
          id: string
          nombre: string | null
          par_directo: string[] | null
          tipo: Database['public']['Enums']['tipo_conversacion']
          ultimo_mensaje_en: string
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          es_global?: boolean
          id?: string
          nombre?: string | null
          par_directo?: string[] | null
          tipo: Database['public']['Enums']['tipo_conversacion']
          ultimo_mensaje_en?: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          es_global?: boolean
          id?: string
          nombre?: string | null
          par_directo?: string[] | null
          tipo?: Database['public']['Enums']['tipo_conversacion']
          ultimo_mensaje_en?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversaciones_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      conversaciones_miembros: {
        Row: {
          agregado_en: string
          conversacion_id: string
          silenciada: boolean
          ultimo_leido_en: string | null
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          agregado_en?: string
          conversacion_id: string
          silenciada?: boolean
          ultimo_leido_en?: string | null
          usuario_id: string
        }
        Update: {
          agregado_en?: string
          conversacion_id?: string
          silenciada?: boolean
          ultimo_leido_en?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversaciones_miembros_conversacion_id_fkey'
            columns: ['conversacion_id']
            isOneToOne: false
            referencedRelation: 'conversaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversaciones_miembros_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      cotizaciones: {
        Row: {
          actualizado_en: string
          clase: Database['public']['Enums']['clase_cotizacion']
          cotizacion_padre_id: string | null
          creado_en: string
          creado_por: string
          eliminado_en: string | null
          eliminado_por: string | null
          estado: Database['public']['Enums']['estado_cotizacion']
          favoritos_count: number
          formula_id: string
          fuentes: NonNullable<Json>
          id: string
          lead_id: string | null
          lote_papelera_id: string | null
          modo_tc: string | null
          moneda_mostrar: string | null
          notas: string | null
          numero: number
          origen_id: string
          plantilla_id: string | null
          reportes_count: number
          tipos_cambio: NonNullable<Json>
          titulo: string | null
          total_base: number
          totales: NonNullable<Json>
          valores: NonNullable<Json>
          vehiculo_id: string | null
          ver_total_bs: boolean
          version: number
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          clase?: Database['public']['Enums']['clase_cotizacion']
          cotizacion_padre_id?: string | null
          creado_en?: string
          creado_por: string
          eliminado_en?: string | null
          eliminado_por?: string | null
          estado?: Database['public']['Enums']['estado_cotizacion']
          favoritos_count?: number
          formula_id: string
          fuentes?: NonNullable<Json>
          id?: string
          lead_id?: string | null
          lote_papelera_id?: string | null
          modo_tc?: string | null
          moneda_mostrar?: string | null
          notas?: string | null
          numero?: never
          origen_id: string
          plantilla_id?: string | null
          reportes_count?: number
          tipos_cambio: NonNullable<Json>
          titulo?: string | null
          total_base: number
          totales: NonNullable<Json>
          valores: NonNullable<Json>
          vehiculo_id?: string | null
          ver_total_bs?: boolean
          version?: number
        }
        Update: {
          actualizado_en?: string
          clase?: Database['public']['Enums']['clase_cotizacion']
          cotizacion_padre_id?: string | null
          creado_en?: string
          creado_por?: string
          eliminado_en?: string | null
          eliminado_por?: string | null
          estado?: Database['public']['Enums']['estado_cotizacion']
          favoritos_count?: number
          formula_id?: string
          fuentes?: NonNullable<Json>
          id?: string
          lead_id?: string | null
          lote_papelera_id?: string | null
          modo_tc?: string | null
          moneda_mostrar?: string | null
          notas?: string | null
          numero?: never
          origen_id?: string
          plantilla_id?: string | null
          reportes_count?: number
          tipos_cambio?: NonNullable<Json>
          titulo?: string | null
          total_base?: number
          totales?: NonNullable<Json>
          valores?: NonNullable<Json>
          vehiculo_id?: string | null
          ver_total_bs?: boolean
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'cotizaciones_cotizacion_padre_id_fkey'
            columns: ['cotizacion_padre_id']
            isOneToOne: false
            referencedRelation: 'cotizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cotizaciones_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cotizaciones_eliminado_por_fkey'
            columns: ['eliminado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cotizaciones_formula_id_fkey'
            columns: ['formula_id']
            isOneToOne: false
            referencedRelation: 'formulas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cotizaciones_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cotizaciones_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cotizaciones_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'cotizaciones_lote_papelera_id_fkey'
            columns: ['lote_papelera_id']
            isOneToOne: false
            referencedRelation: 'lotes_papelera'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cotizaciones_origen_id_fkey'
            columns: ['origen_id']
            isOneToOne: false
            referencedRelation: 'origenes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cotizaciones_plantilla_id_fkey'
            columns: ['plantilla_id']
            isOneToOne: false
            referencedRelation: 'plantillas_tarjeta'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cotizaciones_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'cotizaciones_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      cotizaciones_adjuntos: {
        Row: {
          bytes: number
          cotizacion_id: string
          creado_en: string
          id: string
          mime: string
          nombre: string
          ruta: string
          subido_por: string | null
        }
        ComputedFields: never
        Insert: {
          bytes: number
          cotizacion_id: string
          creado_en?: string
          id?: string
          mime: string
          nombre: string
          ruta: string
          subido_por?: string | null
        }
        Update: {
          bytes?: number
          cotizacion_id?: string
          creado_en?: string
          id?: string
          mime?: string
          nombre?: string
          ruta?: string
          subido_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'cotizaciones_adjuntos_cotizacion_id_fkey'
            columns: ['cotizacion_id']
            isOneToOne: false
            referencedRelation: 'cotizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cotizaciones_adjuntos_subido_por_fkey'
            columns: ['subido_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      cotizaciones_comentarios: {
        Row: {
          actualizado_en: string
          cotizacion_id: string
          creado_en: string
          cuerpo: string
          eliminado_en: string | null
          id: string
          padre_id: string | null
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          cotizacion_id: string
          creado_en?: string
          cuerpo: string
          eliminado_en?: string | null
          id?: string
          padre_id?: string | null
          usuario_id: string
        }
        Update: {
          actualizado_en?: string
          cotizacion_id?: string
          creado_en?: string
          cuerpo?: string
          eliminado_en?: string | null
          id?: string
          padre_id?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cotizaciones_comentarios_cotizacion_id_fkey'
            columns: ['cotizacion_id']
            isOneToOne: false
            referencedRelation: 'cotizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cotizaciones_comentarios_padre_id_fkey'
            columns: ['padre_id']
            isOneToOne: false
            referencedRelation: 'cotizaciones_comentarios'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cotizaciones_comentarios_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      cotizaciones_favoritos: {
        Row: {
          cotizacion_id: string
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          cotizacion_id: string
          usuario_id: string
        }
        Update: {
          cotizacion_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cotizaciones_favoritos_cotizacion_id_fkey'
            columns: ['cotizacion_id']
            isOneToOne: false
            referencedRelation: 'cotizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cotizaciones_favoritos_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      cotizaciones_niveles: {
        Row: {
          actualizado_en: string
          clave: string
          creado_en: string
          id: string
          nombre: string
          retirado_en: string | null
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          clave: string
          creado_en?: string
          id?: string
          nombre: string
          retirado_en?: string | null
        }
        Update: {
          actualizado_en?: string
          clave?: string
          creado_en?: string
          id?: string
          nombre?: string
          retirado_en?: string | null
        }
        Relationships: []
      }
      cotizaciones_reportes: {
        Row: {
          cotizacion_id: string
          creado_en: string
          motivo: string | null
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          cotizacion_id: string
          creado_en?: string
          motivo?: string | null
          usuario_id: string
        }
        Update: {
          cotizacion_id?: string
          creado_en?: string
          motivo?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cotizaciones_reportes_cotizacion_id_fkey'
            columns: ['cotizacion_id']
            isOneToOne: false
            referencedRelation: 'cotizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cotizaciones_reportes_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      cotizaciones_revisiones: {
        Row: {
          cotizacion_id: string
          creado_en: string
          diff: NonNullable<Json>
          huella: string | null
          id: number
          intento: string | null
          usuario_id: string | null
        }
        ComputedFields: never
        Insert: {
          cotizacion_id: string
          creado_en?: string
          diff: NonNullable<Json>
          huella?: string | null
          id?: never
          intento?: string | null
          usuario_id?: string | null
        }
        Update: {
          cotizacion_id?: string
          creado_en?: string
          diff?: NonNullable<Json>
          huella?: string | null
          id?: never
          intento?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'cotizaciones_revisiones_cotizacion_id_fkey'
            columns: ['cotizacion_id']
            isOneToOne: false
            referencedRelation: 'cotizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cotizaciones_revisiones_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      declaraciones_aduana: {
        Row: {
          aceptada_el: string | null
          actualizado_en: string
          canal: Database['public']['Enums']['canal_aforo'] | null
          creado_en: string
          creado_por: string | null
          deposito: string | null
          despachante: string | null
          id: string
          notas: string | null
          numero: string
          vence_tributos_el: string | null
        }
        ComputedFields: never
        Insert: {
          aceptada_el?: string | null
          actualizado_en?: string
          canal?: Database['public']['Enums']['canal_aforo'] | null
          creado_en?: string
          creado_por?: string | null
          deposito?: string | null
          despachante?: string | null
          id?: string
          notas?: string | null
          numero: string
          vence_tributos_el?: string | null
        }
        Update: {
          aceptada_el?: string | null
          actualizado_en?: string
          canal?: Database['public']['Enums']['canal_aforo'] | null
          creado_en?: string
          creado_por?: string | null
          deposito?: string | null
          despachante?: string | null
          id?: string
          notas?: string | null
          numero?: string
          vence_tributos_el?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'declaraciones_aduana_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      declaraciones_vehiculos: {
        Row: {
          agregado_en: string
          declaracion_id: string
          removido_en: string | null
          vehiculo_id: string
        }
        ComputedFields: never
        Insert: {
          agregado_en?: string
          declaracion_id: string
          removido_en?: string | null
          vehiculo_id: string
        }
        Update: {
          agregado_en?: string
          declaracion_id?: string
          removido_en?: string | null
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'declaraciones_vehiculos_declaracion_id_fkey'
            columns: ['declaracion_id']
            isOneToOne: false
            referencedRelation: 'declaraciones_aduana'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'declaraciones_vehiculos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'declaraciones_vehiculos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      documentos: {
        Row: {
          actualizado_en: string
          bytes: number | null
          creado_en: string
          eliminado_en: string | null
          eliminado_por: string | null
          emitido_el: string | null
          estado: Database['public']['Enums']['estado_documento']
          id: string
          mime: string | null
          motivo_rechazo: string | null
          nombre_archivo: string | null
          nota: string | null
          recibido_el: string | null
          repuesto_id: string | null
          revisado_en: string | null
          revisado_por: string | null
          ruta: string | null
          subido_por: string | null
          tipo_documento_id: string
          vehiculo_id: string | null
          vence_el: string | null
          visible_portal: boolean
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          bytes?: number | null
          creado_en?: string
          eliminado_en?: string | null
          eliminado_por?: string | null
          emitido_el?: string | null
          estado?: Database['public']['Enums']['estado_documento']
          id?: string
          mime?: string | null
          motivo_rechazo?: string | null
          nombre_archivo?: string | null
          nota?: string | null
          recibido_el?: string | null
          repuesto_id?: string | null
          revisado_en?: string | null
          revisado_por?: string | null
          ruta?: string | null
          subido_por?: string | null
          tipo_documento_id: string
          vehiculo_id?: string | null
          vence_el?: string | null
          visible_portal?: boolean
        }
        Update: {
          actualizado_en?: string
          bytes?: number | null
          creado_en?: string
          eliminado_en?: string | null
          eliminado_por?: string | null
          emitido_el?: string | null
          estado?: Database['public']['Enums']['estado_documento']
          id?: string
          mime?: string | null
          motivo_rechazo?: string | null
          nombre_archivo?: string | null
          nota?: string | null
          recibido_el?: string | null
          repuesto_id?: string | null
          revisado_en?: string | null
          revisado_por?: string | null
          ruta?: string | null
          subido_por?: string | null
          tipo_documento_id?: string
          vehiculo_id?: string | null
          vence_el?: string | null
          visible_portal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'documentos_eliminado_por_fkey'
            columns: ['eliminado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documentos_repuesto_id_fkey'
            columns: ['repuesto_id']
            isOneToOne: false
            referencedRelation: 'repuestos_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documentos_revisado_por_fkey'
            columns: ['revisado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documentos_subido_por_fkey'
            columns: ['subido_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documentos_tipo_documento_id_fkey'
            columns: ['tipo_documento_id']
            isOneToOne: false
            referencedRelation: 'tipos_documento'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'documentos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'documentos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      embudos: {
        Row: {
          actualizado_en: string
          creado_en: string
          es_default: boolean
          id: string
          nombre: string
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          creado_en?: string
          es_default?: boolean
          id?: string
          nombre: string
          usuario_id: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          es_default?: boolean
          id?: string
          nombre?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'embudos_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      embudos_etapas: {
        Row: {
          color: string
          embudo_id: string
          es_ganada: boolean
          es_inicial: boolean
          es_perdida: boolean
          id: string
          nombre: string
          orden: number
        }
        ComputedFields: never
        Insert: {
          color?: string
          embudo_id: string
          es_ganada?: boolean
          es_inicial?: boolean
          es_perdida?: boolean
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          color?: string
          embudo_id?: string
          es_ganada?: boolean
          es_inicial?: boolean
          es_perdida?: boolean
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: 'embudos_etapas_embudo_id_fkey'
            columns: ['embudo_id']
            isOneToOne: false
            referencedRelation: 'embudos'
            referencedColumns: ['id']
          },
        ]
      }
      equipo_bajas: {
        Row: {
          empezada_en: string
          leads_al_limbo: number
          oportunidades_canceladas: number
          por: string | null
          terminada_en: string | null
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          empezada_en?: string
          leads_al_limbo?: number
          oportunidades_canceladas?: number
          por?: string | null
          terminada_en?: string | null
          usuario_id: string
        }
        Update: {
          empezada_en?: string
          leads_al_limbo?: number
          oportunidades_canceladas?: number
          por?: string | null
          terminada_en?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'equipo_bajas_por_fkey'
            columns: ['por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'equipo_bajas_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: true
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      etiquetas: {
        Row: {
          actualizado_en: string
          color: string
          creado_en: string
          id: string
          nombre: string
          usuario_id: string
          _etiqueta_json: Json | null
        }
        ComputedFields: '_etiqueta_json'
        Insert: {
          actualizado_en?: string
          color?: string
          creado_en?: string
          id?: string
          nombre: string
          usuario_id: string
        }
        Update: {
          actualizado_en?: string
          color?: string
          creado_en?: string
          id?: string
          nombre?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'etiquetas_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      eventos: {
        Row: {
          actualizado_en: string
          cotizacion_id: string | null
          creado_en: string
          creado_por: string
          descripcion: string | null
          eliminado_en: string | null
          estado: Database['public']['Enums']['estado_agenda']
          id: string
          inicia_en: string
          lead_id: string | null
          lugar: string | null
          termina_en: string | null
          titulo: string
          vehiculo_id: string | null
          visibilidad: Database['public']['Enums']['visibilidad_evento']
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          cotizacion_id?: string | null
          creado_en?: string
          creado_por: string
          descripcion?: string | null
          eliminado_en?: string | null
          estado?: Database['public']['Enums']['estado_agenda']
          id?: string
          inicia_en: string
          lead_id?: string | null
          lugar?: string | null
          termina_en?: string | null
          titulo: string
          vehiculo_id?: string | null
          visibilidad?: Database['public']['Enums']['visibilidad_evento']
        }
        Update: {
          actualizado_en?: string
          cotizacion_id?: string | null
          creado_en?: string
          creado_por?: string
          descripcion?: string | null
          eliminado_en?: string | null
          estado?: Database['public']['Enums']['estado_agenda']
          id?: string
          inicia_en?: string
          lead_id?: string | null
          lugar?: string | null
          termina_en?: string | null
          titulo?: string
          vehiculo_id?: string | null
          visibilidad?: Database['public']['Enums']['visibilidad_evento']
        }
        Relationships: [
          {
            foreignKeyName: 'eventos_cotizacion_id_fkey'
            columns: ['cotizacion_id']
            isOneToOne: false
            referencedRelation: 'cotizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'eventos_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'eventos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'eventos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'eventos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'eventos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'eventos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      eventos_destinatarios: {
        Row: {
          evento_id: string
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          evento_id: string
          usuario_id: string
        }
        Update: {
          evento_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'eventos_destinatarios_evento_id_fkey'
            columns: ['evento_id']
            isOneToOne: false
            referencedRelation: 'eventos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'eventos_destinatarios_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      eventos_web: {
        Row: {
          creado_en: string
          evento: string
          id: number
          referencia_id: string | null
          ruta: string | null
          token: string
          utm: Json | null
        }
        ComputedFields: never
        Insert: {
          creado_en?: string
          evento: string
          id?: never
          referencia_id?: string | null
          ruta?: string | null
          token: string
          utm?: Json | null
        }
        Update: {
          creado_en?: string
          evento?: string
          id?: never
          referencia_id?: string | null
          ruta?: string | null
          token?: string
          utm?: Json | null
        }
        Relationships: []
      }
      fases: {
        Row: {
          activa: boolean
          actualizado_en: string
          alerta_cada_horas: number | null
          alias_portal: string | null
          color: string
          creado_en: string
          cuenta_llegada_repuestos: boolean
          demora_dias: number | null
          descripcion: string | null
          descripcion_portal: string | null
          es_final: boolean
          es_inicial: boolean
          es_logistica: boolean
          flujo_id: string
          icono: string | null
          id: string
          nombre: string
          nota_obligatoria: boolean
          orden: number
          permite_aduana: boolean
          permite_contenedor: boolean
          publica_web: boolean
          visible_portal: boolean
        }
        ComputedFields: never
        Insert: {
          activa?: boolean
          actualizado_en?: string
          alerta_cada_horas?: number | null
          alias_portal?: string | null
          color?: string
          creado_en?: string
          cuenta_llegada_repuestos?: boolean
          demora_dias?: number | null
          descripcion?: string | null
          descripcion_portal?: string | null
          es_final?: boolean
          es_inicial?: boolean
          es_logistica?: boolean
          flujo_id: string
          icono?: string | null
          id?: string
          nombre: string
          nota_obligatoria?: boolean
          orden?: number
          permite_aduana?: boolean
          permite_contenedor?: boolean
          publica_web?: boolean
          visible_portal?: boolean
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          alerta_cada_horas?: number | null
          alias_portal?: string | null
          color?: string
          creado_en?: string
          cuenta_llegada_repuestos?: boolean
          demora_dias?: number | null
          descripcion?: string | null
          descripcion_portal?: string | null
          es_final?: boolean
          es_inicial?: boolean
          es_logistica?: boolean
          flujo_id?: string
          icono?: string | null
          id?: string
          nombre?: string
          nota_obligatoria?: boolean
          orden?: number
          permite_aduana?: boolean
          permite_contenedor?: boolean
          publica_web?: boolean
          visible_portal?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'fases_flujo_id_fkey'
            columns: ['flujo_id']
            isOneToOne: false
            referencedRelation: 'flujos'
            referencedColumns: ['id']
          },
        ]
      }
      fases_requisitos: {
        Row: {
          bloqueante: boolean
          clave_dato: string | null
          config: NonNullable<Json>
          espera_ambito: Database['public']['Enums']['ambito_espera'] | null
          espera_fase_id: string | null
          fase_id: string
          formatos: string[] | null
          id: string
          max_archivos: number | null
          min_archivos: number | null
          notas: string | null
          orden: number
          tipo: Database['public']['Enums']['tipo_requisito']
          tipo_documento_id: string | null
        }
        ComputedFields: never
        Insert: {
          bloqueante?: boolean
          clave_dato?: string | null
          config?: NonNullable<Json>
          espera_ambito?: Database['public']['Enums']['ambito_espera'] | null
          espera_fase_id?: string | null
          fase_id: string
          formatos?: string[] | null
          id?: string
          max_archivos?: number | null
          min_archivos?: number | null
          notas?: string | null
          orden?: number
          tipo: Database['public']['Enums']['tipo_requisito']
          tipo_documento_id?: string | null
        }
        Update: {
          bloqueante?: boolean
          clave_dato?: string | null
          config?: NonNullable<Json>
          espera_ambito?: Database['public']['Enums']['ambito_espera'] | null
          espera_fase_id?: string | null
          fase_id?: string
          formatos?: string[] | null
          id?: string
          max_archivos?: number | null
          min_archivos?: number | null
          notas?: string | null
          orden?: number
          tipo?: Database['public']['Enums']['tipo_requisito']
          tipo_documento_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fases_requisitos_espera_fase_id_fkey'
            columns: ['espera_fase_id']
            isOneToOne: false
            referencedRelation: 'fases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fases_requisitos_fase_id_fkey'
            columns: ['fase_id']
            isOneToOne: false
            referencedRelation: 'fases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fases_requisitos_tipo_documento_id_fkey'
            columns: ['tipo_documento_id']
            isOneToOne: false
            referencedRelation: 'tipos_documento'
            referencedColumns: ['id']
          },
        ]
      }
      fases_roles: {
        Row: {
          fase_id: string
          rol_id: string
        }
        ComputedFields: never
        Insert: {
          fase_id: string
          rol_id: string
        }
        Update: {
          fase_id?: string
          rol_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fases_roles_fase_id_fkey'
            columns: ['fase_id']
            isOneToOne: false
            referencedRelation: 'fases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fases_roles_rol_id_fkey'
            columns: ['rol_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }
      fases_transiciones: {
        Row: {
          a_fase_id: string
          accion: string | null
          de_fase_id: string
          flujo_id: string
          id: string
          nota_obligatoria: boolean
        }
        ComputedFields: never
        Insert: {
          a_fase_id: string
          accion?: string | null
          de_fase_id: string
          flujo_id: string
          id?: string
          nota_obligatoria?: boolean
        }
        Update: {
          a_fase_id?: string
          accion?: string | null
          de_fase_id?: string
          flujo_id?: string
          id?: string
          nota_obligatoria?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'fases_transiciones_a_fase_id_fkey'
            columns: ['a_fase_id']
            isOneToOne: false
            referencedRelation: 'fases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fases_transiciones_de_fase_id_fkey'
            columns: ['de_fase_id']
            isOneToOne: false
            referencedRelation: 'fases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fases_transiciones_flujo_id_fkey'
            columns: ['flujo_id']
            isOneToOne: false
            referencedRelation: 'flujos'
            referencedColumns: ['id']
          },
        ]
      }
      fases_transiciones_roles: {
        Row: {
          rol_id: string
          transicion_id: string
        }
        ComputedFields: never
        Insert: {
          rol_id: string
          transicion_id: string
        }
        Update: {
          rol_id?: string
          transicion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fases_transiciones_roles_rol_id_fkey'
            columns: ['rol_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fases_transiciones_roles_transicion_id_fkey'
            columns: ['transicion_id']
            isOneToOne: false
            referencedRelation: 'fases_transiciones'
            referencedColumns: ['id']
          },
        ]
      }
      flujos: {
        Row: {
          activo: boolean
          actualizado_en: string
          ambito: Database['public']['Enums']['ambito_flujo']
          creado_en: string
          id: string
          nombre: string
          origen_id: string | null
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          actualizado_en?: string
          ambito: Database['public']['Enums']['ambito_flujo']
          creado_en?: string
          id?: string
          nombre: string
          origen_id?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          ambito?: Database['public']['Enums']['ambito_flujo']
          creado_en?: string
          id?: string
          nombre?: string
          origen_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'flujos_origen_id_fkey'
            columns: ['origen_id']
            isOneToOne: false
            referencedRelation: 'origenes'
            referencedColumns: ['id']
          },
        ]
      }
      flujos_reglas: {
        Row: {
          activa: boolean
          flujo_id: string
          regla: string
        }
        ComputedFields: never
        Insert: {
          activa?: boolean
          flujo_id: string
          regla: string
        }
        Update: {
          activa?: boolean
          flujo_id?: string
          regla?: string
        }
        Relationships: [
          {
            foreignKeyName: 'flujos_reglas_flujo_id_fkey'
            columns: ['flujo_id']
            isOneToOne: false
            referencedRelation: 'flujos'
            referencedColumns: ['id']
          },
        ]
      }
      flujos_transporte_oferta: {
        Row: {
          flujo_id: string
          naviera_id: string | null
          puerto_id: string | null
          tipo: string
        }
        ComputedFields: never
        Insert: {
          flujo_id: string
          naviera_id?: string | null
          puerto_id?: string | null
          tipo: string
        }
        Update: {
          flujo_id?: string
          naviera_id?: string | null
          puerto_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'flujos_transporte_oferta_flujo_id_fkey'
            columns: ['flujo_id']
            isOneToOne: false
            referencedRelation: 'flujos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'flujos_transporte_oferta_naviera_id_fkey'
            columns: ['naviera_id']
            isOneToOne: false
            referencedRelation: 'navieras'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'flujos_transporte_oferta_puerto_id_fkey'
            columns: ['puerto_id']
            isOneToOne: false
            referencedRelation: 'puertos'
            referencedColumns: ['id']
          },
        ]
      }
      formulas: {
        Row: {
          actualizado_en: string
          creado_en: string
          creado_por: string | null
          definicion: NonNullable<Json>
          diseno: Json | null
          estado: Database['public']['Enums']['estado_version']
          id: string
          nota: string | null
          origen_id: string
          params: NonNullable<Json>
          publicado_en: string | null
          publicado_por: string | null
          version: number | null
          version_origen_id: string | null
          visibilidad: Json | null
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          definicion: NonNullable<Json>
          diseno?: Json | null
          estado?: Database['public']['Enums']['estado_version']
          id?: string
          nota?: string | null
          origen_id: string
          params?: NonNullable<Json>
          publicado_en?: string | null
          publicado_por?: string | null
          version?: number | null
          version_origen_id?: string | null
          visibilidad?: Json | null
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          definicion?: NonNullable<Json>
          diseno?: Json | null
          estado?: Database['public']['Enums']['estado_version']
          id?: string
          nota?: string | null
          origen_id?: string
          params?: NonNullable<Json>
          publicado_en?: string | null
          publicado_por?: string | null
          version?: number | null
          version_origen_id?: string | null
          visibilidad?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'formulas_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'formulas_origen_id_fkey'
            columns: ['origen_id']
            isOneToOne: false
            referencedRelation: 'origenes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'formulas_publicado_por_fkey'
            columns: ['publicado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'formulas_version_origen_id_fkey'
            columns: ['version_origen_id']
            isOneToOne: false
            referencedRelation: 'formulas'
            referencedColumns: ['id']
          },
        ]
      }
      gastos: {
        Row: {
          actualizado_en: string
          categoria_id: string
          comprobante_ruta: string | null
          creado_en: string
          creado_por: string | null
          eliminado_en: string | null
          fecha: string
          id: string
          lote_id: string | null
          moneda: string
          monto: number
          monto_base: number
          notas: string | null
          proveedor: string | null
          repuesto_id: string | null
          tipo_cambio_aplicado: number | null
          tipo_cambio_id: string | null
          vehiculo_id: string | null
          _gasto_bloquear: undefined | null
        }
        ComputedFields: '_gasto_bloquear'
        Insert: {
          actualizado_en?: string
          categoria_id: string
          comprobante_ruta?: string | null
          creado_en?: string
          creado_por?: string | null
          eliminado_en?: string | null
          fecha?: string
          id?: string
          lote_id?: string | null
          moneda: string
          monto: number
          monto_base: number
          notas?: string | null
          proveedor?: string | null
          repuesto_id?: string | null
          tipo_cambio_aplicado?: number | null
          tipo_cambio_id?: string | null
          vehiculo_id?: string | null
        }
        Update: {
          actualizado_en?: string
          categoria_id?: string
          comprobante_ruta?: string | null
          creado_en?: string
          creado_por?: string | null
          eliminado_en?: string | null
          fecha?: string
          id?: string
          lote_id?: string | null
          moneda?: string
          monto?: number
          monto_base?: number
          notas?: string | null
          proveedor?: string | null
          repuesto_id?: string | null
          tipo_cambio_aplicado?: number | null
          tipo_cambio_id?: string | null
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'gastos_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'categorias_gasto'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'gastos_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'gastos_moneda_fkey'
            columns: ['moneda']
            isOneToOne: false
            referencedRelation: 'monedas'
            referencedColumns: ['codigo']
          },
          {
            foreignKeyName: 'gastos_repuesto_id_fkey'
            columns: ['repuesto_id']
            isOneToOne: false
            referencedRelation: 'repuestos_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'gastos_tipo_cambio_id_fkey'
            columns: ['tipo_cambio_id']
            isOneToOne: false
            referencedRelation: 'tipos_cambio'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'gastos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'gastos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      historial_fases: {
        Row: {
          a_fase_id: string
          creado_en: string
          de_fase_id: string | null
          flujo_id: string
          id: number
          nota: string | null
          repuesto_id: string | null
          usuario_id: string | null
          vehiculo_id: string | null
        }
        ComputedFields: never
        Insert: {
          a_fase_id: string
          creado_en?: string
          de_fase_id?: string | null
          flujo_id: string
          id?: never
          nota?: string | null
          repuesto_id?: string | null
          usuario_id?: string | null
          vehiculo_id?: string | null
        }
        Update: {
          a_fase_id?: string
          creado_en?: string
          de_fase_id?: string | null
          flujo_id?: string
          id?: never
          nota?: string | null
          repuesto_id?: string | null
          usuario_id?: string | null
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'historial_fases_a_fase_id_fkey'
            columns: ['a_fase_id']
            isOneToOne: false
            referencedRelation: 'fases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'historial_fases_de_fase_id_fkey'
            columns: ['de_fase_id']
            isOneToOne: false
            referencedRelation: 'fases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'historial_fases_flujo_id_fkey'
            columns: ['flujo_id']
            isOneToOne: false
            referencedRelation: 'flujos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'historial_fases_repuesto_fk'
            columns: ['repuesto_id']
            isOneToOne: false
            referencedRelation: 'repuestos_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'historial_fases_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'historial_fases_vehiculo_fk'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'historial_fases_vehiculo_fk'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      importaciones: {
        Row: {
          archivo_ruta: string | null
          creado_en: string
          deshecha_en: string | null
          deshecha_lote: string | null
          deshecha_resultado: Json | null
          entidad: string
          errores: NonNullable<Json>
          estado: Database['public']['Enums']['estado_importacion']
          filas_ok: number | null
          filas_total: number | null
          id: string
          iniciada_en: string | null
          mapeo: NonNullable<Json>
          terminada_en: string | null
          usuario_id: string
          _importacion_vence_en: string | null
        }
        ComputedFields: '_importacion_vence_en'
        Insert: {
          archivo_ruta?: string | null
          creado_en?: string
          deshecha_en?: string | null
          deshecha_lote?: string | null
          deshecha_resultado?: Json | null
          entidad: string
          errores?: NonNullable<Json>
          estado?: Database['public']['Enums']['estado_importacion']
          filas_ok?: number | null
          filas_total?: number | null
          id?: string
          iniciada_en?: string | null
          mapeo?: NonNullable<Json>
          terminada_en?: string | null
          usuario_id: string
        }
        Update: {
          archivo_ruta?: string | null
          creado_en?: string
          deshecha_en?: string | null
          deshecha_lote?: string | null
          deshecha_resultado?: Json | null
          entidad?: string
          errores?: NonNullable<Json>
          estado?: Database['public']['Enums']['estado_importacion']
          filas_ok?: number | null
          filas_total?: number | null
          id?: string
          iniciada_en?: string | null
          mapeo?: NonNullable<Json>
          terminada_en?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'importaciones_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      importaciones_leads: {
        Row: {
          creado_en: string
          fila: number
          importacion_id: string
          lead_id: string
        }
        ComputedFields: never
        Insert: {
          creado_en?: string
          fila: number
          importacion_id: string
          lead_id: string
        }
        Update: {
          creado_en?: string
          fila?: number
          importacion_id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'importaciones_leads_importacion_id_fkey'
            columns: ['importacion_id']
            isOneToOne: false
            referencedRelation: 'importaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'importaciones_leads_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'importaciones_leads_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'importaciones_leads_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
        ]
      }
      integraciones: {
        Row: {
          activa: boolean
          actualizado_en: string
          actualizado_por: string | null
          clave: string
          config: NonNullable<Json>
          secreto_guardado_en: string | null
        }
        ComputedFields: never
        Insert: {
          activa?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          clave: string
          config?: NonNullable<Json>
          secreto_guardado_en?: string | null
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          clave?: string
          config?: NonNullable<Json>
          secreto_guardado_en?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          actualizado_en: string
          atributos: NonNullable<Json>
          atributos_publicos: NonNullable<Json>
          cartera: string[]
          cliente_desde: string | null
          creado_en: string
          creado_por: string | null
          eliminado_en: string | null
          eliminado_por: string | null
          id: string
          lote_papelera_id: string | null
          nombre: string
          numero: number
          numero_propio: number | null
          origen_lead_id: string | null
          telefono_cc: string | null
          telefono_principal: string
          tipo_lead_id: string
          ultimo_seguimiento_en: string | null
          _lead_motivo_de_restaurar: string | null
        }
        ComputedFields: '_lead_motivo_de_restaurar'
        Insert: {
          actualizado_en?: string
          atributos?: NonNullable<Json>
          atributos_publicos?: NonNullable<Json>
          cartera?: string[]
          cliente_desde?: string | null
          creado_en?: string
          creado_por?: string | null
          eliminado_en?: string | null
          eliminado_por?: string | null
          id?: string
          lote_papelera_id?: string | null
          nombre: string
          numero?: never
          numero_propio?: number | null
          origen_lead_id?: string | null
          telefono_cc?: string | null
          telefono_principal: string
          tipo_lead_id: string
          ultimo_seguimiento_en?: string | null
        }
        Update: {
          actualizado_en?: string
          atributos?: NonNullable<Json>
          atributos_publicos?: NonNullable<Json>
          cartera?: string[]
          cliente_desde?: string | null
          creado_en?: string
          creado_por?: string | null
          eliminado_en?: string | null
          eliminado_por?: string | null
          id?: string
          lote_papelera_id?: string | null
          nombre?: string
          numero?: never
          numero_propio?: number | null
          origen_lead_id?: string | null
          telefono_cc?: string | null
          telefono_principal?: string
          tipo_lead_id?: string
          ultimo_seguimiento_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'leads_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_eliminado_por_fkey'
            columns: ['eliminado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_lote_papelera_id_fkey'
            columns: ['lote_papelera_id']
            isOneToOne: false
            referencedRelation: 'lotes_papelera'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_origen_lead_id_fkey'
            columns: ['origen_lead_id']
            isOneToOne: false
            referencedRelation: 'origenes_lead'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_tipo_lead_id_fkey'
            columns: ['tipo_lead_id']
            isOneToOne: false
            referencedRelation: 'tipos_lead'
            referencedColumns: ['id']
          },
        ]
      }
      leads_asesores: {
        Row: {
          compartido_por: string | null
          desde: string
          lead_creado_en: string
          lead_id: string
          lead_reciente_en: string
          revocado_en: string | null
          revocado_por: string | null
          tipo_acceso: Database['public']['Enums']['tipo_acceso_lead']
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          compartido_por?: string | null
          desde?: string
          lead_creado_en: string
          lead_id: string
          lead_reciente_en: string
          revocado_en?: string | null
          revocado_por?: string | null
          tipo_acceso: Database['public']['Enums']['tipo_acceso_lead']
          usuario_id: string
        }
        Update: {
          compartido_por?: string | null
          desde?: string
          lead_creado_en?: string
          lead_id?: string
          lead_reciente_en?: string
          revocado_en?: string | null
          revocado_por?: string | null
          tipo_acceso?: Database['public']['Enums']['tipo_acceso_lead']
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leads_asesores_compartido_por_fkey'
            columns: ['compartido_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_asesores_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_asesores_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_asesores_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'leads_asesores_revocado_por_fkey'
            columns: ['revocado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_asesores_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      leads_campos: {
        Row: {
          activo: boolean
          actualizado_en: string
          clave: string
          en_tabla: boolean
          es_sistema: boolean
          etiqueta: string
          filtrable: boolean
          grupo: string | null
          id: string
          maximo: number | null
          minimo: number | null
          opciones: NonNullable<Json>
          orden: number
          requerido: boolean
          solo_cartera: boolean
          solo_cartera_pendiente: boolean | null
          tipo: Database['public']['Enums']['tipo_campo']
          valor_defecto: Json | null
          valor_defecto_empresa: string | null
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          actualizado_en?: string
          clave: string
          en_tabla?: boolean
          es_sistema?: boolean
          etiqueta: string
          filtrable?: boolean
          grupo?: string | null
          id?: string
          maximo?: number | null
          minimo?: number | null
          opciones?: NonNullable<Json>
          orden?: number
          requerido?: boolean
          solo_cartera?: boolean
          solo_cartera_pendiente?: boolean | null
          tipo: Database['public']['Enums']['tipo_campo']
          valor_defecto?: Json | null
          valor_defecto_empresa?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          clave?: string
          en_tabla?: boolean
          es_sistema?: boolean
          etiqueta?: string
          filtrable?: boolean
          grupo?: string | null
          id?: string
          maximo?: number | null
          minimo?: number | null
          opciones?: NonNullable<Json>
          orden?: number
          requerido?: boolean
          solo_cartera?: boolean
          solo_cartera_pendiente?: boolean | null
          tipo?: Database['public']['Enums']['tipo_campo']
          valor_defecto?: Json | null
          valor_defecto_empresa?: string | null
        }
        Relationships: []
      }
      leads_contadores: {
        Row: {
          ultimo: number
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          ultimo?: number
          usuario_id: string
        }
        Update: {
          ultimo?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leads_contadores_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: true
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      leads_etiquetas: {
        Row: {
          etiqueta_id: string
          lead_id: string
        }
        ComputedFields: never
        Insert: {
          etiqueta_id: string
          lead_id: string
        }
        Update: {
          etiqueta_id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leads_etiquetas_etiqueta_id_fkey'
            columns: ['etiqueta_id']
            isOneToOne: false
            referencedRelation: 'etiquetas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_etiquetas_etiqueta_id_fkey'
            columns: ['etiqueta_id']
            isOneToOne: false
            referencedRelation: 'etiquetas_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_etiquetas_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_etiquetas_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_etiquetas_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
        ]
      }
      leads_favoritos: {
        Row: {
          creado_en: string
          lead_id: string
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          creado_en?: string
          lead_id: string
          usuario_id: string
        }
        Update: {
          creado_en?: string
          lead_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leads_favoritos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_favoritos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_favoritos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'leads_favoritos_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      leads_numeros_globales: {
        Row: {
          lead_id: string
          numero: number
        }
        ComputedFields: never
        Insert: {
          lead_id: string
          numero: number
        }
        Update: {
          lead_id?: string
          numero?: number
        }
        Relationships: [
          {
            foreignKeyName: 'leads_numeros_globales_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: true
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_numeros_globales_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: true
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_numeros_globales_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: true
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
        ]
      }
      leads_numeros_propios: {
        Row: {
          creado_por: string
          lead_id: string
          numero: number
        }
        ComputedFields: never
        Insert: {
          creado_por: string
          lead_id: string
          numero: number
        }
        Update: {
          creado_por?: string
          lead_id?: string
          numero?: number
        }
        Relationships: [
          {
            foreignKeyName: 'leads_numeros_propios_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: true
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_numeros_propios_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: true
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_numeros_propios_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: true
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
        ]
      }
      leads_tachados: {
        Row: {
          creado_en: string
          lead_id: string
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          creado_en?: string
          lead_id: string
          usuario_id: string
        }
        Update: {
          creado_en?: string
          lead_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leads_tachados_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_tachados_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_tachados_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'leads_tachados_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      leads_telefonos: {
        Row: {
          creado_en: string
          etiqueta: string | null
          id: string
          lead_id: string
          telefono: string
        }
        ComputedFields: never
        Insert: {
          creado_en?: string
          etiqueta?: string | null
          id?: string
          lead_id: string
          telefono: string
        }
        Update: {
          creado_en?: string
          etiqueta?: string | null
          id?: string
          lead_id?: string
          telefono?: string
        }
        Relationships: [
          {
            foreignKeyName: 'leads_telefonos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_telefonos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_telefonos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
        ]
      }
      limpieza_avisos: {
        Row: {
          avisado_en: string
          fecha: string
          vehiculo_id: string
        }
        ComputedFields: never
        Insert: {
          avisado_en?: string
          fecha: string
          vehiculo_id: string
        }
        Update: {
          avisado_en?: string
          fecha?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'limpieza_avisos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: true
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'limpieza_avisos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: true
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      limpieza_corridas: {
        Row: {
          empezo_en: string
          fecha: string
          id: string
          lote_id: string | null
          movidos: number
          parcial: boolean
          pendientes: number
          saltados: NonNullable<Json>
          termino_en: string | null
        }
        ComputedFields: never
        Insert: {
          empezo_en?: string
          fecha: string
          id?: string
          lote_id?: string | null
          movidos?: number
          parcial?: boolean
          pendientes?: number
          saltados?: NonNullable<Json>
          termino_en?: string | null
        }
        Update: {
          empezo_en?: string
          fecha?: string
          id?: string
          lote_id?: string | null
          movidos?: number
          parcial?: boolean
          pendientes?: number
          saltados?: NonNullable<Json>
          termino_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'limpieza_corridas_lote_id_fkey'
            columns: ['lote_id']
            isOneToOne: false
            referencedRelation: 'lotes_papelera'
            referencedColumns: ['id']
          },
        ]
      }
      lotes_papelera: {
        Row: {
          actualizado_en: string
          creado_en: string
          creado_por: string | null
          es_limpieza: boolean
          id: string
          purgado_en: string | null
          restaurado_en: string | null
          restaurado_por: string | null
          resumen: NonNullable<Json>
          tipo: Database['public']['Enums']['tipo_lote_papelera']
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          es_limpieza?: boolean
          id?: string
          purgado_en?: string | null
          restaurado_en?: string | null
          restaurado_por?: string | null
          resumen?: NonNullable<Json>
          tipo: Database['public']['Enums']['tipo_lote_papelera']
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          es_limpieza?: boolean
          id?: string
          purgado_en?: string | null
          restaurado_en?: string | null
          restaurado_por?: string | null
          resumen?: NonNullable<Json>
          tipo?: Database['public']['Enums']['tipo_lote_papelera']
        }
        Relationships: [
          {
            foreignKeyName: 'lotes_papelera_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'lotes_papelera_restaurado_por_fkey'
            columns: ['restaurado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      mensajes: {
        Row: {
          autor_id: string
          conversacion_id: string
          cotizacion_id: string | null
          creado_en: string
          cuerpo: string | null
          editado_en: string | null
          eliminado_en: string | null
          evento_id: string | null
          id: string
          lead_id: string | null
          responde_a_id: string | null
          tarea_id: string | null
          tipo: Database['public']['Enums']['tipo_mensaje']
          vehiculo_id: string | null
        }
        ComputedFields: never
        Insert: {
          autor_id: string
          conversacion_id: string
          cotizacion_id?: string | null
          creado_en?: string
          cuerpo?: string | null
          editado_en?: string | null
          eliminado_en?: string | null
          evento_id?: string | null
          id?: string
          lead_id?: string | null
          responde_a_id?: string | null
          tarea_id?: string | null
          tipo?: Database['public']['Enums']['tipo_mensaje']
          vehiculo_id?: string | null
        }
        Update: {
          autor_id?: string
          conversacion_id?: string
          cotizacion_id?: string | null
          creado_en?: string
          cuerpo?: string | null
          editado_en?: string | null
          eliminado_en?: string | null
          evento_id?: string | null
          id?: string
          lead_id?: string | null
          responde_a_id?: string | null
          tarea_id?: string | null
          tipo?: Database['public']['Enums']['tipo_mensaje']
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'mensajes_autor_id_fkey'
            columns: ['autor_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mensajes_conversacion_id_fkey'
            columns: ['conversacion_id']
            isOneToOne: false
            referencedRelation: 'conversaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mensajes_cotizacion_id_fkey'
            columns: ['cotizacion_id']
            isOneToOne: false
            referencedRelation: 'cotizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mensajes_evento_id_fkey'
            columns: ['evento_id']
            isOneToOne: false
            referencedRelation: 'eventos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mensajes_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mensajes_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mensajes_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'mensajes_responde_a_id_fkey'
            columns: ['responde_a_id']
            isOneToOne: false
            referencedRelation: 'mensajes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mensajes_tarea_id_fkey'
            columns: ['tarea_id']
            isOneToOne: false
            referencedRelation: 'tareas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mensajes_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'mensajes_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      mensajes_menciones: {
        Row: {
          mensaje_id: string
          referencia_id: string
          tipo: string
        }
        ComputedFields: never
        Insert: {
          mensaje_id: string
          referencia_id: string
          tipo: string
        }
        Update: {
          mensaje_id?: string
          referencia_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'mensajes_menciones_mensaje_id_fkey'
            columns: ['mensaje_id']
            isOneToOne: false
            referencedRelation: 'mensajes'
            referencedColumns: ['id']
          },
        ]
      }
      monedas: {
        Row: {
          activa: boolean
          actualizado_en: string
          codigo: string
          decimales: number
          nombre: string
          orden: number
          simbolo: string
        }
        ComputedFields: never
        Insert: {
          activa?: boolean
          actualizado_en?: string
          codigo: string
          decimales?: number
          nombre: string
          orden?: number
          simbolo: string
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          codigo?: string
          decimales?: number
          nombre?: string
          orden?: number
          simbolo?: string
        }
        Relationships: []
      }
      navieras: {
        Row: {
          activo: boolean
          id: string
          nombre: string
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      notas: {
        Row: {
          actualizado_en: string
          autor_id: string
          creado_en: string
          cuerpo: string
          eliminado_en: string | null
          historial_fase_id: number | null
          id: string
          repuesto_id: string | null
          vehiculo_id: string | null
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          autor_id: string
          creado_en?: string
          cuerpo: string
          eliminado_en?: string | null
          historial_fase_id?: number | null
          id?: string
          repuesto_id?: string | null
          vehiculo_id?: string | null
        }
        Update: {
          actualizado_en?: string
          autor_id?: string
          creado_en?: string
          cuerpo?: string
          eliminado_en?: string | null
          historial_fase_id?: number | null
          id?: string
          repuesto_id?: string | null
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notas_autor_id_fkey'
            columns: ['autor_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notas_historial_fase_id_fkey'
            columns: ['historial_fase_id']
            isOneToOne: false
            referencedRelation: 'historial_fases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notas_repuesto_id_fkey'
            columns: ['repuesto_id']
            isOneToOne: false
            referencedRelation: 'repuestos_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notas_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'notas_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      notificaciones: {
        Row: {
          accionada_en: string | null
          creado_en: string
          cuerpo: string | null
          id: number
          leida_en: string | null
          referencia_id: string | null
          referencia_tipo: string | null
          requiere_accion: boolean
          ruta: string | null
          tipo: string
          titulo: string
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          accionada_en?: string | null
          creado_en?: string
          cuerpo?: string | null
          id?: never
          leida_en?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          requiere_accion?: boolean
          ruta?: string | null
          tipo: string
          titulo: string
          usuario_id: string
        }
        Update: {
          accionada_en?: string | null
          creado_en?: string
          cuerpo?: string | null
          id?: never
          leida_en?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          requiere_accion?: boolean
          ruta?: string | null
          tipo?: string
          titulo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notificaciones_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      oportunidades: {
        Row: {
          actualizado_en: string
          creado_en: string
          eliminado_en: string | null
          embudo_id: string
          estado: Database['public']['Enums']['estado_oportunidad']
          etapa_id: string
          id: string
          lead_id: string
          moneda: string
          monto_estimado: number | null
          motivo_perdida: string | null
          notas: string | null
          titulo: string
          ultima_actividad_en: string
          usuario_id: string
          vehiculo_id: string | null
          _oportunidad_json: Json | null
        }
        ComputedFields: '_oportunidad_json'
        Insert: {
          actualizado_en?: string
          creado_en?: string
          eliminado_en?: string | null
          embudo_id: string
          estado?: Database['public']['Enums']['estado_oportunidad']
          etapa_id: string
          id?: string
          lead_id: string
          moneda: string
          monto_estimado?: number | null
          motivo_perdida?: string | null
          notas?: string | null
          titulo: string
          ultima_actividad_en?: string
          usuario_id: string
          vehiculo_id?: string | null
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          eliminado_en?: string | null
          embudo_id?: string
          estado?: Database['public']['Enums']['estado_oportunidad']
          etapa_id?: string
          id?: string
          lead_id?: string
          moneda?: string
          monto_estimado?: number | null
          motivo_perdida?: string | null
          notas?: string | null
          titulo?: string
          ultima_actividad_en?: string
          usuario_id?: string
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'oportunidades_embudo_de_la_persona'
            columns: ['usuario_id', 'embudo_id']
            isOneToOne: false
            referencedRelation: 'embudos'
            referencedColumns: ['usuario_id', 'id']
          },
          {
            foreignKeyName: 'oportunidades_etapa_del_embudo'
            columns: ['embudo_id', 'etapa_id']
            isOneToOne: false
            referencedRelation: 'embudos_etapas'
            referencedColumns: ['embudo_id', 'id']
          },
          {
            foreignKeyName: 'oportunidades_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'oportunidades_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'oportunidades_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'oportunidades_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'oportunidades_vehiculo_fk'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'oportunidades_vehiculo_fk'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      oportunidades_historial: {
        Row: {
          a_etapa_id: string | null
          creado_en: string
          de_etapa_id: string | null
          id: number
          oportunidad_id: string
          usuario_id: string | null
        }
        ComputedFields: never
        Insert: {
          a_etapa_id?: string | null
          creado_en?: string
          de_etapa_id?: string | null
          id?: never
          oportunidad_id: string
          usuario_id?: string | null
        }
        Update: {
          a_etapa_id?: string | null
          creado_en?: string
          de_etapa_id?: string | null
          id?: never
          oportunidad_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'oportunidades_historial_a_etapa_id_fkey'
            columns: ['a_etapa_id']
            isOneToOne: false
            referencedRelation: 'embudos_etapas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'oportunidades_historial_de_etapa_id_fkey'
            columns: ['de_etapa_id']
            isOneToOne: false
            referencedRelation: 'embudos_etapas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'oportunidades_historial_oportunidad_id_fkey'
            columns: ['oportunidad_id']
            isOneToOne: false
            referencedRelation: 'oportunidades'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'oportunidades_historial_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      origenes: {
        Row: {
          activo: boolean
          actualizado_en: string
          apibara_plataformas: string[]
          clave: string
          color: string
          creado_en: string
          genero: Database['public']['Enums']['genero_gramatical']
          icono: string | null
          id: string
          nombre: string
          orden: number
          sustantivo: string
          tipo: Database['public']['Enums']['tipo_origen']
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          actualizado_en?: string
          apibara_plataformas?: string[]
          clave: string
          color?: string
          creado_en?: string
          genero?: Database['public']['Enums']['genero_gramatical']
          icono?: string | null
          id?: string
          nombre: string
          orden?: number
          sustantivo?: string
          tipo?: Database['public']['Enums']['tipo_origen']
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          apibara_plataformas?: string[]
          clave?: string
          color?: string
          creado_en?: string
          genero?: Database['public']['Enums']['genero_gramatical']
          icono?: string | null
          id?: string
          nombre?: string
          orden?: number
          sustantivo?: string
          tipo?: Database['public']['Enums']['tipo_origen']
        }
        Relationships: []
      }
      origenes_campos: {
        Row: {
          activo: boolean
          actualizado_en: string
          clave: string
          clave_apibara: string | null
          en_tarjeta: boolean
          es_sistema: boolean
          etiqueta: string
          filtrable: boolean
          grupo: string | null
          id: string
          maximo: number | null
          minimo: number | null
          opciones: NonNullable<Json>
          orden: number
          origen_id: string
          principal: boolean
          publico_web: boolean
          requerido: boolean
          tipo: Database['public']['Enums']['tipo_campo']
          valor_defecto: Json | null
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          actualizado_en?: string
          clave: string
          clave_apibara?: string | null
          en_tarjeta?: boolean
          es_sistema?: boolean
          etiqueta: string
          filtrable?: boolean
          grupo?: string | null
          id?: string
          maximo?: number | null
          minimo?: number | null
          opciones?: NonNullable<Json>
          orden?: number
          origen_id: string
          principal?: boolean
          publico_web?: boolean
          requerido?: boolean
          tipo: Database['public']['Enums']['tipo_campo']
          valor_defecto?: Json | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          clave?: string
          clave_apibara?: string | null
          en_tarjeta?: boolean
          es_sistema?: boolean
          etiqueta?: string
          filtrable?: boolean
          grupo?: string | null
          id?: string
          maximo?: number | null
          minimo?: number | null
          opciones?: NonNullable<Json>
          orden?: number
          origen_id?: string
          principal?: boolean
          publico_web?: boolean
          requerido?: boolean
          tipo?: Database['public']['Enums']['tipo_campo']
          valor_defecto?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'origenes_campos_origen_id_fkey'
            columns: ['origen_id']
            isOneToOne: false
            referencedRelation: 'origenes'
            referencedColumns: ['id']
          },
        ]
      }
      origenes_lead: {
        Row: {
          activo: boolean
          actualizado_en: string
          clave: string
          creado_en: string
          icono: string | null
          id: string
          nombre: string
          orden: number
          por_defecto: boolean
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          actualizado_en?: string
          clave: string
          creado_en?: string
          icono?: string | null
          id?: string
          nombre: string
          orden?: number
          por_defecto?: boolean
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          clave?: string
          creado_en?: string
          icono?: string | null
          id?: string
          nombre?: string
          orden?: number
          por_defecto?: boolean
        }
        Relationships: []
      }
      pagos: {
        Row: {
          actualizado_en: string
          comprobante_ruta: string | null
          concepto: string
          confirmado: boolean
          confirmado_en: string | null
          confirmado_por: string | null
          creado_en: string
          creado_por: string | null
          eliminado_en: string | null
          fecha: string
          id: string
          lead_id: string | null
          metodo: string | null
          moneda: string
          monto: number
          monto_base: number
          notas: string | null
          proyecto_repuestos_id: string | null
          tipo_cambio_aplicado: number | null
          tipo_cambio_id: string | null
          vehiculo_id: string | null
          _pago_exigir_edicion: undefined | null
        }
        ComputedFields: '_pago_exigir_edicion'
        Insert: {
          actualizado_en?: string
          comprobante_ruta?: string | null
          concepto: string
          confirmado?: boolean
          confirmado_en?: string | null
          confirmado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          eliminado_en?: string | null
          fecha?: string
          id?: string
          lead_id?: string | null
          metodo?: string | null
          moneda: string
          monto: number
          monto_base: number
          notas?: string | null
          proyecto_repuestos_id?: string | null
          tipo_cambio_aplicado?: number | null
          tipo_cambio_id?: string | null
          vehiculo_id?: string | null
        }
        Update: {
          actualizado_en?: string
          comprobante_ruta?: string | null
          concepto?: string
          confirmado?: boolean
          confirmado_en?: string | null
          confirmado_por?: string | null
          creado_en?: string
          creado_por?: string | null
          eliminado_en?: string | null
          fecha?: string
          id?: string
          lead_id?: string | null
          metodo?: string | null
          moneda?: string
          monto?: number
          monto_base?: number
          notas?: string | null
          proyecto_repuestos_id?: string | null
          tipo_cambio_aplicado?: number | null
          tipo_cambio_id?: string | null
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'pagos_confirmado_por_fkey'
            columns: ['confirmado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'pagos_moneda_fkey'
            columns: ['moneda']
            isOneToOne: false
            referencedRelation: 'monedas'
            referencedColumns: ['codigo']
          },
          {
            foreignKeyName: 'pagos_proyecto_repuestos_id_fkey'
            columns: ['proyecto_repuestos_id']
            isOneToOne: false
            referencedRelation: 'repuestos_proyectos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_tipo_cambio_id_fkey'
            columns: ['tipo_cambio_id']
            isOneToOne: false
            referencedRelation: 'tipos_cambio'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pagos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'pagos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean
          actualizado_en: string
          avatar_miniatura_fallo_en: string | null
          avatar_miniatura_ruta: string | null
          avatar_ruta: string | null
          baja_en: string | null
          baja_por: string | null
          bio: string | null
          bio_web: string | null
          bloqueado: boolean
          bloqueado_en: string | null
          bloqueado_por: string | null
          bloqueo_motivo: string | null
          cargo: string | null
          cargo_web: string | null
          creado_en: string
          email: string | null
          especialidades: string[]
          handle: string | null
          id: string
          invitacion_aceptada_en: string | null
          invitado_en: string | null
          nombre: string
          publico_web: boolean
          telefono: string | null
          ultimo_acceso_en: string | null
          whatsapp_web: string | null
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          actualizado_en?: string
          avatar_miniatura_fallo_en?: string | null
          avatar_miniatura_ruta?: string | null
          avatar_ruta?: string | null
          baja_en?: string | null
          baja_por?: string | null
          bio?: string | null
          bio_web?: string | null
          bloqueado?: boolean
          bloqueado_en?: string | null
          bloqueado_por?: string | null
          bloqueo_motivo?: string | null
          cargo?: string | null
          cargo_web?: string | null
          creado_en?: string
          email?: string | null
          especialidades?: string[]
          handle?: string | null
          id: string
          invitacion_aceptada_en?: string | null
          invitado_en?: string | null
          nombre?: string
          publico_web?: boolean
          telefono?: string | null
          ultimo_acceso_en?: string | null
          whatsapp_web?: string | null
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          avatar_miniatura_fallo_en?: string | null
          avatar_miniatura_ruta?: string | null
          avatar_ruta?: string | null
          baja_en?: string | null
          baja_por?: string | null
          bio?: string | null
          bio_web?: string | null
          bloqueado?: boolean
          bloqueado_en?: string | null
          bloqueado_por?: string | null
          bloqueo_motivo?: string | null
          cargo?: string | null
          cargo_web?: string | null
          creado_en?: string
          email?: string | null
          especialidades?: string[]
          handle?: string | null
          id?: string
          invitacion_aceptada_en?: string | null
          invitado_en?: string | null
          nombre?: string
          publico_web?: boolean
          telefono?: string | null
          ultimo_acceso_en?: string | null
          whatsapp_web?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'perfiles_baja_por_fkey'
            columns: ['baja_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'perfiles_bloqueado_por_fkey'
            columns: ['bloqueado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      permisos: {
        Row: {
          aplicado_en: string
          clave: string
          con_alcance: boolean
          descripcion: string
          modulo: string
          nivel_clave: string | null
          nombre: string
          orden: number
          por_origen: boolean
        }
        ComputedFields: never
        Insert: {
          aplicado_en: string
          clave: string
          con_alcance?: boolean
          descripcion: string
          modulo: string
          nivel_clave?: string | null
          nombre: string
          orden?: number
          por_origen?: boolean
        }
        Update: {
          aplicado_en?: string
          clave?: string
          con_alcance?: boolean
          descripcion?: string
          modulo?: string
          nivel_clave?: string | null
          nombre?: string
          orden?: number
          por_origen?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'permisos_nivel_fk'
            columns: ['nivel_clave']
            isOneToOne: false
            referencedRelation: 'cotizaciones_niveles'
            referencedColumns: ['clave']
          },
        ]
      }
      plantillas_tarjeta: {
        Row: {
          actualizado_en: string
          creado_en: string
          creado_por: string | null
          definicion: NonNullable<Json>
          estado: Database['public']['Enums']['estado_version']
          id: string
          nota: string | null
          origen_id: string
          publicado_en: string | null
          version: number | null
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          definicion: NonNullable<Json>
          estado?: Database['public']['Enums']['estado_version']
          id?: string
          nota?: string | null
          origen_id: string
          publicado_en?: string | null
          version?: number | null
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          creado_por?: string | null
          definicion?: NonNullable<Json>
          estado?: Database['public']['Enums']['estado_version']
          id?: string
          nota?: string | null
          origen_id?: string
          publicado_en?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'plantillas_tarjeta_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'plantillas_tarjeta_origen_id_fkey'
            columns: ['origen_id']
            isOneToOne: false
            referencedRelation: 'origenes'
            referencedColumns: ['id']
          },
        ]
      }
      preferencias_usuario: {
        Row: {
          actualizado_en: string
          clave: string
          usuario_id: string
          valor: NonNullable<Json>
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          clave: string
          usuario_id: string
          valor?: NonNullable<Json>
        }
        Update: {
          actualizado_en?: string
          clave?: string
          usuario_id?: string
          valor?: NonNullable<Json>
        }
        Relationships: [
          {
            foreignKeyName: 'preferencias_usuario_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      puertos: {
        Row: {
          activo: boolean
          codigo: string | null
          id: string
          nombre: string
          orden: number
          pais: string | null
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          codigo?: string | null
          id?: string
          nombre: string
          orden?: number
          pais?: string | null
        }
        Update: {
          activo?: boolean
          codigo?: string | null
          id?: string
          nombre?: string
          orden?: number
          pais?: string | null
        }
        Relationships: []
      }
      push_pases: {
        Row: {
          creado_en: string
          notificacion_id: number
          pase: string
          resultado_en: string | null
          usado_en: string | null
        }
        ComputedFields: never
        Insert: {
          creado_en?: string
          notificacion_id: number
          pase?: string
          resultado_en?: string | null
          usado_en?: string | null
        }
        Update: {
          creado_en?: string
          notificacion_id?: number
          pase?: string
          resultado_en?: string | null
          usado_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'push_pases_notificacion_id_fkey'
            columns: ['notificacion_id']
            isOneToOne: false
            referencedRelation: 'notificaciones'
            referencedColumns: ['id']
          },
        ]
      }
      recordatorios: {
        Row: {
          actualizado_en: string
          completado_en: string | null
          creado_en: string
          eliminado_en: string | null
          id: string
          lead_id: string | null
          notificado_en: string | null
          recordar_en: string
          titulo: string
          usuario_id: string
          vehiculo_id: string | null
          _recordatorio_json: Json | null
        }
        ComputedFields: '_recordatorio_json'
        Insert: {
          actualizado_en?: string
          completado_en?: string | null
          creado_en?: string
          eliminado_en?: string | null
          id?: string
          lead_id?: string | null
          notificado_en?: string | null
          recordar_en: string
          titulo: string
          usuario_id: string
          vehiculo_id?: string | null
        }
        Update: {
          actualizado_en?: string
          completado_en?: string | null
          creado_en?: string
          eliminado_en?: string | null
          id?: string
          lead_id?: string | null
          notificado_en?: string | null
          recordar_en?: string
          titulo?: string
          usuario_id?: string
          vehiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'recordatorios_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recordatorios_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recordatorios_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'recordatorios_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recordatorios_vehiculo_fk'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'recordatorios_vehiculo_fk'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      repuestos_cajas: {
        Row: {
          activa: boolean
          id: string
          moneda: string
          monto: number
        }
        ComputedFields: never
        Insert: {
          activa?: boolean
          id?: string
          moneda: string
          monto: number
        }
        Update: {
          activa?: boolean
          id?: string
          moneda?: string
          monto?: number
        }
        Relationships: [
          {
            foreignKeyName: 'repuestos_cajas_moneda_fkey'
            columns: ['moneda']
            isOneToOne: false
            referencedRelation: 'monedas'
            referencedColumns: ['codigo']
          },
        ]
      }
      repuestos_catalogos: {
        Row: {
          activo: boolean
          catalogo: string
          datos: NonNullable<Json>
          id: string
          nombre: string
          orden: number
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          catalogo: string
          datos?: NonNullable<Json>
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          catalogo?: string
          datos?: NonNullable<Json>
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      repuestos_compras: {
        Row: {
          actualizado_en: string
          comprobante_ruta: string | null
          creado_en: string
          creado_por: string | null
          eliminado_en: string | null
          fecha: string
          id: string
          item_id: string | null
          moneda: string
          monto: number
          monto_base: number | null
          notas: string | null
          proveedor: string | null
          proyecto_id: string
          tipo_cambio_aplicado: number | null
          tipo_cambio_id: string | null
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          comprobante_ruta?: string | null
          creado_en?: string
          creado_por?: string | null
          eliminado_en?: string | null
          fecha?: string
          id?: string
          item_id?: string | null
          moneda: string
          monto: number
          monto_base?: number | null
          notas?: string | null
          proveedor?: string | null
          proyecto_id: string
          tipo_cambio_aplicado?: number | null
          tipo_cambio_id?: string | null
        }
        Update: {
          actualizado_en?: string
          comprobante_ruta?: string | null
          creado_en?: string
          creado_por?: string | null
          eliminado_en?: string | null
          fecha?: string
          id?: string
          item_id?: string | null
          moneda?: string
          monto?: number
          monto_base?: number | null
          notas?: string | null
          proveedor?: string | null
          proyecto_id?: string
          tipo_cambio_aplicado?: number | null
          tipo_cambio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'repuestos_compras_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_compras_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'repuestos_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_compras_moneda_fkey'
            columns: ['moneda']
            isOneToOne: false
            referencedRelation: 'monedas'
            referencedColumns: ['codigo']
          },
          {
            foreignKeyName: 'repuestos_compras_proyecto_id_fkey'
            columns: ['proyecto_id']
            isOneToOne: false
            referencedRelation: 'repuestos_proyectos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_compras_tipo_cambio_id_fkey'
            columns: ['tipo_cambio_id']
            isOneToOne: false
            referencedRelation: 'tipos_cambio'
            referencedColumns: ['id']
          },
        ]
      }
      repuestos_cotizaciones: {
        Row: {
          aceptada_en: string | null
          actualizado_en: string
          config_snapshot: NonNullable<Json>
          creado_en: string
          creado_por: string | null
          estado: Database['public']['Enums']['estado_cotizacion_repuestos']
          id: string
          moneda: string
          notas: string | null
          numero: number
          proyecto_id: string
          total: number | null
        }
        ComputedFields: never
        Insert: {
          aceptada_en?: string | null
          actualizado_en?: string
          config_snapshot: NonNullable<Json>
          creado_en?: string
          creado_por?: string | null
          estado?: Database['public']['Enums']['estado_cotizacion_repuestos']
          id?: string
          moneda: string
          notas?: string | null
          numero?: never
          proyecto_id: string
          total?: number | null
        }
        Update: {
          aceptada_en?: string | null
          actualizado_en?: string
          config_snapshot?: NonNullable<Json>
          creado_en?: string
          creado_por?: string | null
          estado?: Database['public']['Enums']['estado_cotizacion_repuestos']
          id?: string
          moneda?: string
          notas?: string | null
          numero?: never
          proyecto_id?: string
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'repuestos_cotizaciones_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_cotizaciones_moneda_fkey'
            columns: ['moneda']
            isOneToOne: false
            referencedRelation: 'monedas'
            referencedColumns: ['codigo']
          },
          {
            foreignKeyName: 'repuestos_cotizaciones_proyecto_id_fkey'
            columns: ['proyecto_id']
            isOneToOne: false
            referencedRelation: 'repuestos_proyectos'
            referencedColumns: ['id']
          },
        ]
      }
      repuestos_cotizaciones_lineas: {
        Row: {
          bloque: string
          caja: number | null
          caja_sugerida: number | null
          cantidad: number
          condicion_id: string | null
          costo: number | null
          cotizacion_id: string
          descripcion: string
          id: string
          item_id: string | null
          logistica: number | null
          logistica_sugerida: number | null
          orden: number
          tipo_pieza_id: string | null
          total: number | null
        }
        ComputedFields: never
        Insert: {
          bloque: string
          caja?: number | null
          caja_sugerida?: number | null
          cantidad?: number
          condicion_id?: string | null
          costo?: number | null
          cotizacion_id: string
          descripcion: string
          id?: string
          item_id?: string | null
          logistica?: number | null
          logistica_sugerida?: number | null
          orden?: number
          tipo_pieza_id?: string | null
          total?: number | null
        }
        Update: {
          bloque?: string
          caja?: number | null
          caja_sugerida?: number | null
          cantidad?: number
          condicion_id?: string | null
          costo?: number | null
          cotizacion_id?: string
          descripcion?: string
          id?: string
          item_id?: string | null
          logistica?: number | null
          logistica_sugerida?: number | null
          orden?: number
          tipo_pieza_id?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'repuestos_cotizaciones_lineas_condicion_id_fkey'
            columns: ['condicion_id']
            isOneToOne: false
            referencedRelation: 'repuestos_catalogos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_cotizaciones_lineas_cotizacion_id_fkey'
            columns: ['cotizacion_id']
            isOneToOne: false
            referencedRelation: 'repuestos_cotizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_cotizaciones_lineas_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'repuestos_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_cotizaciones_lineas_tipo_pieza_id_fkey'
            columns: ['tipo_pieza_id']
            isOneToOne: false
            referencedRelation: 'repuestos_catalogos'
            referencedColumns: ['id']
          },
        ]
      }
      repuestos_cotizador_config: {
        Row: {
          creado_por: string | null
          factor_importado: number
          id: number
          recargo_local: number
          redondeo: number
          vigente_desde: string
        }
        ComputedFields: never
        Insert: {
          creado_por?: string | null
          factor_importado: number
          id?: never
          recargo_local: number
          redondeo?: number
          vigente_desde?: string
        }
        Update: {
          creado_por?: string | null
          factor_importado?: number
          id?: never
          recargo_local?: number
          redondeo?: number
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: 'repuestos_cotizador_config_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      repuestos_items: {
        Row: {
          actualizado_en: string
          cantidad: number
          condicion_id: string | null
          creado_en: string
          creado_por: string | null
          descripcion: string
          eliminado_en: string | null
          en_stock_desde: string | null
          fase_desde: string | null
          fase_id: string | null
          id: string
          modo_transporte_id: string | null
          moneda: string | null
          notas: string | null
          pais_origen_id: string | null
          precio_cliente: number | null
          proyecto_id: string
          stock_cantidad: number
          tipo_pieza_id: string | null
          tracking: string | null
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          cantidad?: number
          condicion_id?: string | null
          creado_en?: string
          creado_por?: string | null
          descripcion: string
          eliminado_en?: string | null
          en_stock_desde?: string | null
          fase_desde?: string | null
          fase_id?: string | null
          id?: string
          modo_transporte_id?: string | null
          moneda?: string | null
          notas?: string | null
          pais_origen_id?: string | null
          precio_cliente?: number | null
          proyecto_id: string
          stock_cantidad?: number
          tipo_pieza_id?: string | null
          tracking?: string | null
        }
        Update: {
          actualizado_en?: string
          cantidad?: number
          condicion_id?: string | null
          creado_en?: string
          creado_por?: string | null
          descripcion?: string
          eliminado_en?: string | null
          en_stock_desde?: string | null
          fase_desde?: string | null
          fase_id?: string | null
          id?: string
          modo_transporte_id?: string | null
          moneda?: string | null
          notas?: string | null
          pais_origen_id?: string | null
          precio_cliente?: number | null
          proyecto_id?: string
          stock_cantidad?: number
          tipo_pieza_id?: string | null
          tracking?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'repuestos_items_condicion_id_fkey'
            columns: ['condicion_id']
            isOneToOne: false
            referencedRelation: 'repuestos_catalogos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_items_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_items_fase_id_fkey'
            columns: ['fase_id']
            isOneToOne: false
            referencedRelation: 'fases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_items_modo_transporte_id_fkey'
            columns: ['modo_transporte_id']
            isOneToOne: false
            referencedRelation: 'repuestos_catalogos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_items_moneda_fkey'
            columns: ['moneda']
            isOneToOne: false
            referencedRelation: 'monedas'
            referencedColumns: ['codigo']
          },
          {
            foreignKeyName: 'repuestos_items_pais_origen_id_fkey'
            columns: ['pais_origen_id']
            isOneToOne: false
            referencedRelation: 'repuestos_catalogos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_items_proyecto_id_fkey'
            columns: ['proyecto_id']
            isOneToOne: false
            referencedRelation: 'repuestos_proyectos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_items_tipo_pieza_id_fkey'
            columns: ['tipo_pieza_id']
            isOneToOne: false
            referencedRelation: 'repuestos_catalogos'
            referencedColumns: ['id']
          },
        ]
      }
      repuestos_items_imagenes: {
        Row: {
          creado_en: string
          id: string
          item_id: string
          orden: number
          ruta: string
        }
        ComputedFields: never
        Insert: {
          creado_en?: string
          id?: string
          item_id: string
          orden?: number
          ruta: string
        }
        Update: {
          creado_en?: string
          id?: string
          item_id?: string
          orden?: number
          ruta?: string
        }
        Relationships: [
          {
            foreignKeyName: 'repuestos_items_imagenes_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'repuestos_items'
            referencedColumns: ['id']
          },
        ]
      }
      repuestos_proyectos: {
        Row: {
          actualizado_en: string
          cerrado_en: string | null
          cliente_nombre: string | null
          cliente_telefono: string | null
          creado_en: string
          creado_por: string | null
          eliminado_en: string | null
          id: string
          lead_id: string | null
          notas: string | null
          numero: number
          vehiculo_etiqueta: string | null
          vehiculo_id: string | null
          vin: string | null
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          cerrado_en?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          creado_en?: string
          creado_por?: string | null
          eliminado_en?: string | null
          id?: string
          lead_id?: string | null
          notas?: string | null
          numero?: never
          vehiculo_etiqueta?: string | null
          vehiculo_id?: string | null
          vin?: string | null
        }
        Update: {
          actualizado_en?: string
          cerrado_en?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          creado_en?: string
          creado_por?: string | null
          eliminado_en?: string | null
          id?: string
          lead_id?: string | null
          notas?: string | null
          numero?: never
          vehiculo_etiqueta?: string | null
          vehiculo_id?: string | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'repuestos_proyectos_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_proyectos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_proyectos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_proyectos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'repuestos_proyectos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'repuestos_proyectos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      repuestos_stock_movimientos: {
        Row: {
          cantidad: number
          creado_en: string
          id: number
          item_id: string
          motivo: string
          nota: string | null
          usuario_id: string | null
        }
        ComputedFields: never
        Insert: {
          cantidad: number
          creado_en?: string
          id?: never
          item_id: string
          motivo: string
          nota?: string | null
          usuario_id?: string | null
        }
        Update: {
          cantidad?: number
          creado_en?: string
          id?: never
          item_id?: string
          motivo?: string
          nota?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'repuestos_stock_movimientos_item_id_fkey'
            columns: ['item_id']
            isOneToOne: false
            referencedRelation: 'repuestos_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'repuestos_stock_movimientos_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      repuestos_tramos_logistica: {
        Row: {
          activo: boolean
          costo_max: number | null
          costo_min: number
          id: string
          moneda: string
          monto: number
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          costo_max?: number | null
          costo_min: number
          id?: string
          moneda: string
          monto: number
        }
        Update: {
          activo?: boolean
          costo_max?: number | null
          costo_min?: number
          id?: string
          moneda?: string
          monto?: number
        }
        Relationships: [
          {
            foreignKeyName: 'repuestos_tramos_logistica_moneda_fkey'
            columns: ['moneda']
            isOneToOne: false
            referencedRelation: 'monedas'
            referencedColumns: ['codigo']
          },
        ]
      }
      roles: {
        Row: {
          actualizado_en: string
          clave: string
          color: string | null
          creado_en: string
          descripcion: string | null
          es_sistema: boolean
          id: string
          nombre: string
          orden: number
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          clave: string
          color?: string | null
          creado_en?: string
          descripcion?: string | null
          es_sistema?: boolean
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          actualizado_en?: string
          clave?: string
          color?: string | null
          creado_en?: string
          descripcion?: string | null
          es_sistema?: boolean
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      roles_permisos: {
        Row: {
          alcance: Database['public']['Enums']['alcance_permiso']
          creado_en: string
          id: string
          origen_id: string | null
          permiso_clave: string
          rol_id: string
        }
        ComputedFields: never
        Insert: {
          alcance?: Database['public']['Enums']['alcance_permiso']
          creado_en?: string
          id?: string
          origen_id?: string | null
          permiso_clave: string
          rol_id: string
        }
        Update: {
          alcance?: Database['public']['Enums']['alcance_permiso']
          creado_en?: string
          id?: string
          origen_id?: string | null
          permiso_clave?: string
          rol_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'roles_permisos_origen_fk'
            columns: ['origen_id']
            isOneToOne: false
            referencedRelation: 'origenes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'roles_permisos_permiso_clave_fkey'
            columns: ['permiso_clave']
            isOneToOne: false
            referencedRelation: 'permisos'
            referencedColumns: ['clave']
          },
          {
            foreignKeyName: 'roles_permisos_rol_id_fkey'
            columns: ['rol_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
        ]
      }
      seguimientos: {
        Row: {
          actualizado_en: string
          creado_en: string
          detalle_doc: Json | null
          detalle_texto: string | null
          eliminado_en: string | null
          id: string
          lead_id: string
          ocurrido_en: string
          tipo_id: string
          titulo: string
          usuario_id: string
          vehiculo_id: string | null
          visibilidad: Database['public']['Enums']['visibilidad_seguimiento']
          _seguimiento_json: Json | null
        }
        ComputedFields: '_seguimiento_json'
        Insert: {
          actualizado_en?: string
          creado_en?: string
          detalle_doc?: Json | null
          detalle_texto?: string | null
          eliminado_en?: string | null
          id?: string
          lead_id: string
          ocurrido_en?: string
          tipo_id: string
          titulo: string
          usuario_id: string
          vehiculo_id?: string | null
          visibilidad?: Database['public']['Enums']['visibilidad_seguimiento']
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          detalle_doc?: Json | null
          detalle_texto?: string | null
          eliminado_en?: string | null
          id?: string
          lead_id?: string
          ocurrido_en?: string
          tipo_id?: string
          titulo?: string
          usuario_id?: string
          vehiculo_id?: string | null
          visibilidad?: Database['public']['Enums']['visibilidad_seguimiento']
        }
        Relationships: [
          {
            foreignKeyName: 'seguimientos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'seguimientos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'seguimientos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'seguimientos_tipo_id_fkey'
            columns: ['tipo_id']
            isOneToOne: false
            referencedRelation: 'tipos_seguimiento'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'seguimientos_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'seguimientos_vehiculo_fk'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'seguimientos_vehiculo_fk'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      solicitudes_contacto_web: {
        Row: {
          asignada_en: string
          codigo: string
          contactada_en: string | null
          contactada_por: string | null
          creado_en: string
          es_directa: boolean
          estado: Database['public']['Enums']['estado_solicitud_web']
          fuente: string
          id: string
          intento: number
          lead_id: string | null
          ruta: string | null
          senal_contacto: string | null
          solicitud_previa_id: string | null
          token_visitante: string
          usuario_id: string | null
          utm: Json | null
          vehiculo_id: string | null
          vence_en: string | null
        }
        ComputedFields: never
        Insert: {
          asignada_en?: string
          codigo: string
          contactada_en?: string | null
          contactada_por?: string | null
          creado_en?: string
          es_directa?: boolean
          estado?: Database['public']['Enums']['estado_solicitud_web']
          fuente: string
          id?: string
          intento?: number
          lead_id?: string | null
          ruta?: string | null
          senal_contacto?: string | null
          solicitud_previa_id?: string | null
          token_visitante: string
          usuario_id?: string | null
          utm?: Json | null
          vehiculo_id?: string | null
          vence_en?: string | null
        }
        Update: {
          asignada_en?: string
          codigo?: string
          contactada_en?: string | null
          contactada_por?: string | null
          creado_en?: string
          es_directa?: boolean
          estado?: Database['public']['Enums']['estado_solicitud_web']
          fuente?: string
          id?: string
          intento?: number
          lead_id?: string | null
          ruta?: string | null
          senal_contacto?: string | null
          solicitud_previa_id?: string | null
          token_visitante?: string
          usuario_id?: string | null
          utm?: Json | null
          vehiculo_id?: string | null
          vence_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'solicitudes_contacto_web_contactada_por_fkey'
            columns: ['contactada_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'solicitudes_contacto_web_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'solicitudes_contacto_web_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'solicitudes_contacto_web_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'solicitudes_contacto_web_solicitud_previa_id_fkey'
            columns: ['solicitud_previa_id']
            isOneToOne: false
            referencedRelation: 'solicitudes_contacto_web'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'solicitudes_contacto_web_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'solicitudes_contacto_web_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'solicitudes_contacto_web_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      suscripciones_push: {
        Row: {
          claves: NonNullable<Json>
          creado_en: string
          endpoint: string
          fallos: number
          id: string
          ultimo_envio_en: string | null
          user_agent: string | null
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          claves: NonNullable<Json>
          creado_en?: string
          endpoint: string
          fallos?: number
          id?: string
          ultimo_envio_en?: string | null
          user_agent?: string | null
          usuario_id: string
        }
        Update: {
          claves?: NonNullable<Json>
          creado_en?: string
          endpoint?: string
          fallos?: number
          id?: string
          ultimo_envio_en?: string | null
          user_agent?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'suscripciones_push_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      tablas_referencia: {
        Row: {
          activa: boolean
          actualizado_en: string
          clave: string
          columnas: NonNullable<Json>
          creado_en: string
          descripcion: string | null
          id: string
          nombre: string
          nota: string | null
          origen_id: string | null
          publicado_en: string | null
          publicado_por: string | null
          version: number
        }
        ComputedFields: never
        Insert: {
          activa?: boolean
          actualizado_en?: string
          clave: string
          columnas: NonNullable<Json>
          creado_en?: string
          descripcion?: string | null
          id?: string
          nombre: string
          nota?: string | null
          origen_id?: string | null
          publicado_en?: string | null
          publicado_por?: string | null
          version?: number
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          clave?: string
          columnas?: NonNullable<Json>
          creado_en?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          nota?: string | null
          origen_id?: string | null
          publicado_en?: string | null
          publicado_por?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'tablas_referencia_origen_id_fkey'
            columns: ['origen_id']
            isOneToOne: false
            referencedRelation: 'origenes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tablas_referencia_publicado_por_fkey'
            columns: ['publicado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      tablas_referencia_filas: {
        Row: {
          activa: boolean
          actualizado_en: string
          id: string
          orden: number
          tabla_id: string
          valores: NonNullable<Json>
        }
        ComputedFields: never
        Insert: {
          activa?: boolean
          actualizado_en?: string
          id?: string
          orden?: number
          tabla_id: string
          valores: NonNullable<Json>
        }
        Update: {
          activa?: boolean
          actualizado_en?: string
          id?: string
          orden?: number
          tabla_id?: string
          valores?: NonNullable<Json>
        }
        Relationships: [
          {
            foreignKeyName: 'tablas_referencia_filas_tabla_id_fkey'
            columns: ['tabla_id']
            isOneToOne: false
            referencedRelation: 'tablas_referencia'
            referencedColumns: ['id']
          },
        ]
      }
      tareas: {
        Row: {
          actualizado_en: string
          completada_en: string | null
          conversacion_id: string | null
          cotizacion_id: string | null
          creado_en: string
          creado_por: string
          descripcion: string | null
          eliminado_en: string | null
          estado: Database['public']['Enums']['estado_agenda']
          id: string
          lead_id: string | null
          responsable_id: string
          titulo: string
          vehiculo_id: string | null
          vence_en: string | null
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          completada_en?: string | null
          conversacion_id?: string | null
          cotizacion_id?: string | null
          creado_en?: string
          creado_por: string
          descripcion?: string | null
          eliminado_en?: string | null
          estado?: Database['public']['Enums']['estado_agenda']
          id?: string
          lead_id?: string | null
          responsable_id: string
          titulo: string
          vehiculo_id?: string | null
          vence_en?: string | null
        }
        Update: {
          actualizado_en?: string
          completada_en?: string | null
          conversacion_id?: string | null
          cotizacion_id?: string | null
          creado_en?: string
          creado_por?: string
          descripcion?: string | null
          eliminado_en?: string | null
          estado?: Database['public']['Enums']['estado_agenda']
          id?: string
          lead_id?: string | null
          responsable_id?: string
          titulo?: string
          vehiculo_id?: string | null
          vence_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'tareas_conversacion_id_fkey'
            columns: ['conversacion_id']
            isOneToOne: false
            referencedRelation: 'conversaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tareas_cotizacion_id_fkey'
            columns: ['cotizacion_id']
            isOneToOne: false
            referencedRelation: 'cotizaciones'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tareas_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tareas_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tareas_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tareas_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'tareas_responsable_id_fkey'
            columns: ['responsable_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tareas_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'tareas_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      tipos_cambio: {
        Row: {
          activo: boolean
          actualizado_en: string
          actualizado_por: string | null
          clave: string
          es_default: boolean
          id: string
          moneda_a: string
          moneda_de: string
          nombre: string
          orden: number
          valor: number
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          clave: string
          es_default?: boolean
          id?: string
          moneda_a: string
          moneda_de: string
          nombre: string
          orden?: number
          valor: number
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          actualizado_por?: string | null
          clave?: string
          es_default?: boolean
          id?: string
          moneda_a?: string
          moneda_de?: string
          nombre?: string
          orden?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: 'tipos_cambio_moneda_a_fkey'
            columns: ['moneda_a']
            isOneToOne: false
            referencedRelation: 'monedas'
            referencedColumns: ['codigo']
          },
          {
            foreignKeyName: 'tipos_cambio_moneda_de_fkey'
            columns: ['moneda_de']
            isOneToOne: false
            referencedRelation: 'monedas'
            referencedColumns: ['codigo']
          },
        ]
      }
      tipos_cambio_historial: {
        Row: {
          cambiado_en: string
          cambiado_por: string | null
          id: number
          tipo_cambio_id: string
          valor_anterior: number | null
          valor_nuevo: number
        }
        ComputedFields: never
        Insert: {
          cambiado_en?: string
          cambiado_por?: string | null
          id?: never
          tipo_cambio_id: string
          valor_anterior?: number | null
          valor_nuevo: number
        }
        Update: {
          cambiado_en?: string
          cambiado_por?: string | null
          id?: never
          tipo_cambio_id?: string
          valor_anterior?: number | null
          valor_nuevo?: number
        }
        Relationships: [
          {
            foreignKeyName: 'tipos_cambio_historial_tipo_cambio_id_fkey'
            columns: ['tipo_cambio_id']
            isOneToOne: false
            referencedRelation: 'tipos_cambio'
            referencedColumns: ['id']
          },
        ]
      }
      tipos_documento: {
        Row: {
          activo: boolean
          actualizado_en: string
          aviso_dias: number | null
          creado_en: string
          descripcion: string | null
          flujo_id: string | null
          formatos: string[]
          id: string
          modo_vencimiento: Database['public']['Enums']['modo_vencimiento']
          nombre: string
          orden: number
          proposito: string | null
          vigencia_dias: number | null
          visible_portal_permitido: boolean
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          actualizado_en?: string
          aviso_dias?: number | null
          creado_en?: string
          descripcion?: string | null
          flujo_id?: string | null
          formatos?: string[]
          id?: string
          modo_vencimiento?: Database['public']['Enums']['modo_vencimiento']
          nombre: string
          orden?: number
          proposito?: string | null
          vigencia_dias?: number | null
          visible_portal_permitido?: boolean
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          aviso_dias?: number | null
          creado_en?: string
          descripcion?: string | null
          flujo_id?: string | null
          formatos?: string[]
          id?: string
          modo_vencimiento?: Database['public']['Enums']['modo_vencimiento']
          nombre?: string
          orden?: number
          proposito?: string | null
          vigencia_dias?: number | null
          visible_portal_permitido?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'tipos_documento_flujo_id_fkey'
            columns: ['flujo_id']
            isOneToOne: false
            referencedRelation: 'flujos'
            referencedColumns: ['id']
          },
        ]
      }
      tipos_lead: {
        Row: {
          activo: boolean
          actualizado_en: string
          clase: Database['public']['Enums']['clase_tipo_lead']
          clave: string
          creado_en: string
          icono: string | null
          id: string
          nombre: string
          orden: number
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          actualizado_en?: string
          clase: Database['public']['Enums']['clase_tipo_lead']
          clave: string
          creado_en?: string
          icono?: string | null
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          clase?: Database['public']['Enums']['clase_tipo_lead']
          clave?: string
          creado_en?: string
          icono?: string | null
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      tipos_seguimiento: {
        Row: {
          activo: boolean
          actualizado_en: string
          clave: string
          creado_en: string
          icono: string | null
          id: string
          nombre: string
          orden: number
        }
        ComputedFields: never
        Insert: {
          activo?: boolean
          actualizado_en?: string
          clave: string
          creado_en?: string
          icono?: string | null
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          clave?: string
          creado_en?: string
          icono?: string | null
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      tonos: {
        Row: {
          actualizado_en: string
          claro_borde: string
          claro_fondo: string
          claro_tinta: string
          clave: string
          creado_en: string
          id: string
          nombre: string
          oscuro_borde: string
          oscuro_fondo: string
          oscuro_tinta: string
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          claro_borde: string
          claro_fondo: string
          claro_tinta: string
          clave: string
          creado_en?: string
          id?: string
          nombre: string
          oscuro_borde: string
          oscuro_fondo: string
          oscuro_tinta: string
        }
        Update: {
          actualizado_en?: string
          claro_borde?: string
          claro_fondo?: string
          claro_tinta?: string
          clave?: string
          creado_en?: string
          id?: string
          nombre?: string
          oscuro_borde?: string
          oscuro_fondo?: string
          oscuro_tinta?: string
        }
        Relationships: []
      }
      transportes: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          arribo_el: string | null
          booking: string | null
          contenedor: string | null
          creado_en: string
          eta_el: string | null
          id: string
          naviera_id: string | null
          notas: string | null
          puerto_destino_id: string | null
          puerto_origen_id: string | null
          repuesto_id: string | null
          sigue_al_vehiculo: boolean
          vehiculo_id: string | null
          zarpe_el: string | null
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          arribo_el?: string | null
          booking?: string | null
          contenedor?: string | null
          creado_en?: string
          eta_el?: string | null
          id?: string
          naviera_id?: string | null
          notas?: string | null
          puerto_destino_id?: string | null
          puerto_origen_id?: string | null
          repuesto_id?: string | null
          sigue_al_vehiculo?: boolean
          vehiculo_id?: string | null
          zarpe_el?: string | null
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          arribo_el?: string | null
          booking?: string | null
          contenedor?: string | null
          creado_en?: string
          eta_el?: string | null
          id?: string
          naviera_id?: string | null
          notas?: string | null
          puerto_destino_id?: string | null
          puerto_origen_id?: string | null
          repuesto_id?: string | null
          sigue_al_vehiculo?: boolean
          vehiculo_id?: string | null
          zarpe_el?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'transportes_actualizado_por_fkey'
            columns: ['actualizado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transportes_naviera_id_fkey'
            columns: ['naviera_id']
            isOneToOne: false
            referencedRelation: 'navieras'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transportes_puerto_destino_id_fkey'
            columns: ['puerto_destino_id']
            isOneToOne: false
            referencedRelation: 'puertos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transportes_puerto_origen_id_fkey'
            columns: ['puerto_origen_id']
            isOneToOne: false
            referencedRelation: 'puertos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transportes_repuesto_id_fkey'
            columns: ['repuesto_id']
            isOneToOne: true
            referencedRelation: 'repuestos_items'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transportes_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: true
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'transportes_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: true
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      usuarios_roles: {
        Row: {
          asignado_en: string
          asignado_por: string | null
          es_principal: boolean
          rol_id: string
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          asignado_en?: string
          asignado_por?: string | null
          es_principal?: boolean
          rol_id: string
          usuario_id: string
        }
        Update: {
          asignado_en?: string
          asignado_por?: string | null
          es_principal?: boolean
          rol_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'usuarios_roles_asignado_por_fkey'
            columns: ['asignado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usuarios_roles_rol_id_fkey'
            columns: ['rol_id']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'usuarios_roles_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      vehiculos: {
        Row: {
          acepta_permuta: boolean | null
          actualizado_en: string
          anio: number | null
          apibara_raw: Json | null
          apibara_sync_en: string | null
          atributos: NonNullable<Json>
          categoria_id: string | null
          cierre_subasta_en: string | null
          cotizado_en: string | null
          creado_en: string
          creado_por: string | null
          destacado_web: boolean
          eliminado_en: string | null
          eliminado_por: string | null
          estado_subasta: Database['public']['Enums']['estado_subasta'] | null
          fase_desde: string | null
          fase_id: string | null
          id: string
          importado_apibara: boolean
          kilometraje: number | null
          lead_id: string | null
          lote: string | null
          lote_papelera_id: string | null
          marca: string | null
          modelo: string | null
          numero: number
          origen_id: string
          placado: boolean | null
          plataforma: string | null
          precio: number | null
          precio_negociable: boolean | null
          precio_web: number | null
          precio_web_hasta: number | null
          precio_web_nota: string | null
          publicado_web: boolean
          subasta_en: string | null
          subasta_fin_en: string | null
          subasta_zona: string | null
          titulo: string
          url_origen: string | null
          vin: string | null
          _limpieza_ancla: string | null
          _limpieza_aplica: boolean | null
          _vehiculo_resumen: Json | null
          _vehiculo_sin_repetidos: undefined | null
          limpieza_el: string | null
        }
        ComputedFields:
          | '_limpieza_ancla'
          | '_limpieza_aplica'
          | '_vehiculo_resumen'
          | '_vehiculo_sin_repetidos'
          | 'limpieza_el'
        Insert: {
          acepta_permuta?: boolean | null
          actualizado_en?: string
          anio?: number | null
          apibara_raw?: Json | null
          apibara_sync_en?: string | null
          atributos?: NonNullable<Json>
          categoria_id?: string | null
          cierre_subasta_en?: never
          cotizado_en?: string | null
          creado_en?: string
          creado_por?: string | null
          destacado_web?: boolean
          eliminado_en?: string | null
          eliminado_por?: string | null
          estado_subasta?: Database['public']['Enums']['estado_subasta'] | null
          fase_desde?: string | null
          fase_id?: string | null
          id?: string
          importado_apibara?: boolean
          kilometraje?: number | null
          lead_id?: string | null
          lote?: string | null
          lote_papelera_id?: string | null
          marca?: string | null
          modelo?: string | null
          numero?: never
          origen_id: string
          placado?: boolean | null
          plataforma?: string | null
          precio?: number | null
          precio_negociable?: boolean | null
          precio_web?: number | null
          precio_web_hasta?: number | null
          precio_web_nota?: string | null
          publicado_web?: boolean
          subasta_en?: string | null
          subasta_fin_en?: string | null
          subasta_zona?: string | null
          titulo: string
          url_origen?: string | null
          vin?: string | null
        }
        Update: {
          acepta_permuta?: boolean | null
          actualizado_en?: string
          anio?: number | null
          apibara_raw?: Json | null
          apibara_sync_en?: string | null
          atributos?: NonNullable<Json>
          categoria_id?: string | null
          cierre_subasta_en?: never
          cotizado_en?: string | null
          creado_en?: string
          creado_por?: string | null
          destacado_web?: boolean
          eliminado_en?: string | null
          eliminado_por?: string | null
          estado_subasta?: Database['public']['Enums']['estado_subasta'] | null
          fase_desde?: string | null
          fase_id?: string | null
          id?: string
          importado_apibara?: boolean
          kilometraje?: number | null
          lead_id?: string | null
          lote?: string | null
          lote_papelera_id?: string | null
          marca?: string | null
          modelo?: string | null
          numero?: never
          origen_id?: string
          placado?: boolean | null
          plataforma?: string | null
          precio?: number | null
          precio_negociable?: boolean | null
          precio_web?: number | null
          precio_web_hasta?: number | null
          precio_web_nota?: string | null
          publicado_web?: boolean
          subasta_en?: string | null
          subasta_fin_en?: string | null
          subasta_zona?: string | null
          titulo?: string
          url_origen?: string | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'vehiculos_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'categorias'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehiculos_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehiculos_eliminado_por_fkey'
            columns: ['eliminado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehiculos_fase_id_fkey'
            columns: ['fase_id']
            isOneToOne: false
            referencedRelation: 'fases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehiculos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehiculos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehiculos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'vehiculos_lote_papelera_id_fkey'
            columns: ['lote_papelera_id']
            isOneToOne: false
            referencedRelation: 'lotes_papelera'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehiculos_origen_id_fkey'
            columns: ['origen_id']
            isOneToOne: false
            referencedRelation: 'origenes'
            referencedColumns: ['id']
          },
        ]
      }
      vehiculos_conservados: {
        Row: {
          conservado_en: string
          conservado_por: string | null
          vehiculo_id: string
        }
        ComputedFields: never
        Insert: {
          conservado_en?: string
          conservado_por?: string | null
          vehiculo_id: string
        }
        Update: {
          conservado_en?: string
          conservado_por?: string | null
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vehiculos_conservados_conservado_por_fkey'
            columns: ['conservado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehiculos_conservados_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: true
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'vehiculos_conservados_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: true
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      vehiculos_imagenes: {
        Row: {
          alto: number
          ancho: number
          bytes: number
          creado_en: string
          es_portada: boolean
          hash: string
          id: string
          orden: number
          origen_url: string | null
          ruta: string
          ruta_miniatura: string
          vehiculo_id: string
        }
        ComputedFields: never
        Insert: {
          alto: number
          ancho: number
          bytes: number
          creado_en?: string
          es_portada?: boolean
          hash: string
          id?: string
          orden?: number
          origen_url?: string | null
          ruta: string
          ruta_miniatura: string
          vehiculo_id: string
        }
        Update: {
          alto?: number
          ancho?: number
          bytes?: number
          creado_en?: string
          es_portada?: boolean
          hash?: string
          id?: string
          orden?: number
          origen_url?: string | null
          ruta?: string
          ruta_miniatura?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vehiculos_imagenes_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'vehiculos_imagenes_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      vehiculos_imagenes_version: {
        Row: {
          actualizado_en: string
          vehiculo_id: string
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          vehiculo_id: string
        }
        Update: {
          actualizado_en?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vehiculos_imagenes_version_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: true
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'vehiculos_imagenes_version_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: true
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      vehiculos_interesados: {
        Row: {
          creado_en: string
          lead_id: string
          nota: string | null
          usuario_id: string | null
          vehiculo_id: string
        }
        ComputedFields: never
        Insert: {
          creado_en?: string
          lead_id: string
          nota?: string | null
          usuario_id?: string | null
          vehiculo_id: string
        }
        Update: {
          creado_en?: string
          lead_id?: string
          nota?: string | null
          usuario_id?: string | null
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vehiculos_interesados_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehiculos_interesados_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehiculos_interesados_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'vehiculos_interesados_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehiculos_interesados_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'vehiculos_interesados_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      vehiculos_vinculos: {
        Row: {
          desde: string
          hasta: string | null
          id: number
          lead_id: string
          usuario_id: string | null
          vehiculo_id: string
        }
        ComputedFields: never
        Insert: {
          desde?: string
          hasta?: string | null
          id?: never
          lead_id: string
          usuario_id?: string | null
          vehiculo_id: string
        }
        Update: {
          desde?: string
          hasta?: string | null
          id?: never
          lead_id?: string
          usuario_id?: string | null
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vehiculos_vinculos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehiculos_vinculos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehiculos_vinculos_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'vehiculos_vinculos_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'vehiculos_vinculos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['vehiculo_id']
          },
          {
            foreignKeyName: 'vehiculos_vinculos_vehiculo_id_fkey'
            columns: ['vehiculo_id']
            isOneToOne: false
            referencedRelation: 'vehiculos'
            referencedColumns: ['id']
          },
        ]
      }
      visitados: {
        Row: {
          referencia_id: string
          tipo: string
          usuario_id: string
          visto_en: string
        }
        ComputedFields: never
        Insert: {
          referencia_id: string
          tipo: string
          usuario_id: string
          visto_en?: string
        }
        Update: {
          referencia_id?: string
          tipo?: string
          usuario_id?: string
          visto_en?: string
        }
        Relationships: [
          {
            foreignKeyName: 'visitados_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      vistas_guardadas: {
        Row: {
          creado_en: string
          id: string
          nombre: string
          orden: number
          pantalla: string
          params: NonNullable<Json>
          usuario_id: string
        }
        ComputedFields: never
        Insert: {
          creado_en?: string
          id?: string
          nombre: string
          orden?: number
          pantalla: string
          params?: NonNullable<Json>
          usuario_id: string
        }
        Update: {
          creado_en?: string
          id?: string
          nombre?: string
          orden?: number
          pantalla?: string
          params?: NonNullable<Json>
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'vistas_guardadas_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      web_categorias_guias: {
        Row: {
          activa: boolean
          id: string
          nombre: string
          orden: number
          slug: string
        }
        ComputedFields: never
        Insert: {
          activa?: boolean
          id?: string
          nombre: string
          orden?: number
          slug: string
        }
        Update: {
          activa?: boolean
          id?: string
          nombre?: string
          orden?: number
          slug?: string
        }
        Relationships: []
      }
      web_faqs: {
        Row: {
          actualizado_en: string
          categoria: string | null
          id: string
          orden: number
          pregunta: string
          publicada: boolean
          respuesta: string
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          categoria?: string | null
          id?: string
          orden?: number
          pregunta: string
          publicada?: boolean
          respuesta: string
        }
        Update: {
          actualizado_en?: string
          categoria?: string | null
          id?: string
          orden?: number
          pregunta?: string
          publicada?: boolean
          respuesta?: string
        }
        Relationships: []
      }
      web_guias: {
        Row: {
          actualizado_en: string
          autor_id: string | null
          categoria_id: string | null
          creado_en: string
          creado_por: string | null
          cuerpo_doc: Json | null
          cuerpo_html: string
          id: string
          minutos_lectura: number | null
          orden: number
          portada_ruta: string | null
          publicada_en: string | null
          resumen: string | null
          seo_descripcion: string | null
          seo_titulo: string | null
          slug: string
          titulo: string
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          autor_id?: string | null
          categoria_id?: string | null
          creado_en?: string
          creado_por?: string | null
          cuerpo_doc?: Json | null
          cuerpo_html?: string
          id?: string
          minutos_lectura?: number | null
          orden?: number
          portada_ruta?: string | null
          publicada_en?: string | null
          resumen?: string | null
          seo_descripcion?: string | null
          seo_titulo?: string | null
          slug: string
          titulo: string
        }
        Update: {
          actualizado_en?: string
          autor_id?: string | null
          categoria_id?: string | null
          creado_en?: string
          creado_por?: string | null
          cuerpo_doc?: Json | null
          cuerpo_html?: string
          id?: string
          minutos_lectura?: number | null
          orden?: number
          portada_ruta?: string | null
          publicada_en?: string | null
          resumen?: string | null
          seo_descripcion?: string | null
          seo_titulo?: string | null
          slug?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: 'web_guias_autor_id_fkey'
            columns: ['autor_id']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'web_guias_categoria_id_fkey'
            columns: ['categoria_id']
            isOneToOne: false
            referencedRelation: 'web_categorias_guias'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'web_guias_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      web_testimonios: {
        Row: {
          actualizado_en: string
          ciudad: string | null
          cliente: string
          consent_canal: string | null
          consent_ciudad: boolean
          consent_en: string | null
          consent_foto: boolean
          consent_por: string | null
          consent_retirado_en: string | null
          consent_vehiculo: boolean
          creado_en: string
          foto_ruta: string | null
          id: string
          lead_id: string | null
          orden: number
          publicado: boolean
          texto: string
          vehiculo: string | null
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string
          ciudad?: string | null
          cliente: string
          consent_canal?: string | null
          consent_ciudad?: boolean
          consent_en?: string | null
          consent_foto?: boolean
          consent_por?: string | null
          consent_retirado_en?: string | null
          consent_vehiculo?: boolean
          creado_en?: string
          foto_ruta?: string | null
          id?: string
          lead_id?: string | null
          orden?: number
          publicado?: boolean
          texto: string
          vehiculo?: string | null
        }
        Update: {
          actualizado_en?: string
          ciudad?: string | null
          cliente?: string
          consent_canal?: string | null
          consent_ciudad?: boolean
          consent_en?: string | null
          consent_foto?: boolean
          consent_por?: string | null
          consent_retirado_en?: string | null
          consent_vehiculo?: boolean
          creado_en?: string
          foto_ruta?: string | null
          id?: string
          lead_id?: string | null
          orden?: number
          publicado?: boolean
          texto?: string
          vehiculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'web_testimonios_consent_por_fkey'
            columns: ['consent_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'web_testimonios_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'web_testimonios_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'web_testimonios_lead_id_fkey'
            columns: ['lead_id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
        ]
      }
    }
    Views: {
      estado_cola_web: {
        Row: {
          abiertas: number | null
          asignadas_total: number | null
          contactadas_total: number | null
          cupo: number | null
          disponible: boolean | null
          habilitado: boolean | null
          handle: string | null
          nombre: string | null
          orden: number | null
          prioridad: number | null
          tasa_contacto_pct: number | null
          ultima_asignacion_en: string | null
          usuario_id: string | null
          vencidas_total: number | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'cola_web_asesores_usuario_id_fkey'
            columns: ['usuario_id']
            isOneToOne: true
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
        ]
      }
      etiquetas_vista: {
        Row: {
          actualizado_en: string | null
          color: string | null
          creado_en: string | null
          id: string | null
          leads: number | null
          nombre: string | null
        }
        ComputedFields: never
        Insert: {
          actualizado_en?: string | null
          color?: string | null
          creado_en?: string | null
          id?: string | null
          leads?: never
          nombre?: string | null
        }
        Update: {
          actualizado_en?: string | null
          color?: string | null
          creado_en?: string | null
          id?: string | null
          leads?: never
          nombre?: string | null
        }
        Relationships: []
      }
      leads_cartera_vista: {
        Row: {
          actualizado_en: string | null
          atributos: Json | null
          atributos_publicos: Json | null
          creado_en: string | null
          creado_por: string | null
          dueno_id: string | null
          en_cartera: boolean | null
          es_favorito: boolean | null
          esta_tachado: boolean | null
          etiquetas: string[] | null
          id: string | null
          nombre: string | null
          numero: number | null
          numero_propio: number | null
          numero_propio_creador: string | null
          numero_propio_de: string | null
          numero_visible: number | null
          origen_lead_id: string | null
          reciente_en: string | null
          telefono_cc: string | null
          telefono_principal: string | null
          telefono_visible: boolean | null
          tipo_lead_id: string | null
          ultimo_seguimiento_en: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'leads_asesores_lead_id_fkey'
            columns: ['id']
            isOneToOne: false
            referencedRelation: 'leads'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_asesores_lead_id_fkey'
            columns: ['id']
            isOneToOne: false
            referencedRelation: 'leads_vista'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_asesores_lead_id_fkey'
            columns: ['id']
            isOneToOne: false
            referencedRelation: 'recordatorios_vista'
            referencedColumns: ['lead_id']
          },
          {
            foreignKeyName: 'leads_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_origen_lead_id_fkey'
            columns: ['origen_lead_id']
            isOneToOne: false
            referencedRelation: 'origenes_lead'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_tipo_lead_id_fkey'
            columns: ['tipo_lead_id']
            isOneToOne: false
            referencedRelation: 'tipos_lead'
            referencedColumns: ['id']
          },
        ]
      }
      leads_vista: {
        Row: {
          actualizado_en: string | null
          atributos: Json | null
          atributos_publicos: Json | null
          creado_en: string | null
          creado_por: string | null
          dueno_id: string | null
          en_cartera: boolean | null
          es_favorito: boolean | null
          esta_tachado: boolean | null
          etiquetas: string[] | null
          id: string | null
          nombre: string | null
          numero: number | null
          numero_propio: number | null
          numero_propio_creador: string | null
          numero_propio_de: string | null
          numero_visible: number | null
          origen_lead_id: string | null
          reciente_en: string | null
          telefono_cc: string | null
          telefono_principal: string | null
          telefono_visible: boolean | null
          tipo_lead_id: string | null
          ultimo_seguimiento_en: string | null
        }
        ComputedFields: never
        Relationships: [
          {
            foreignKeyName: 'leads_creado_por_fkey'
            columns: ['creado_por']
            isOneToOne: false
            referencedRelation: 'perfiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_origen_lead_id_fkey'
            columns: ['origen_lead_id']
            isOneToOne: false
            referencedRelation: 'origenes_lead'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leads_tipo_lead_id_fkey'
            columns: ['tipo_lead_id']
            isOneToOne: false
            referencedRelation: 'tipos_lead'
            referencedColumns: ['id']
          },
        ]
      }
      recordatorios_vista: {
        Row: {
          actualizado_en: string | null
          completado_en: string | null
          creado_en: string | null
          id: string | null
          lead_id: string | null
          lead_nombre: string | null
          lead_numero: number | null
          lead_numero_propio: number | null
          notificado_en: string | null
          recordar_en: string | null
          titulo: string | null
          vehiculo_id: string | null
          vehiculo_numero: number | null
          vehiculo_oculto: boolean | null
          vehiculo_titulo: string | null
        }
        ComputedFields: never
        Relationships: []
      }
    }
    Functions: {
      _acotar_pagina: {
        Args: { p_defecto: number; p_maximo: number; p_pedido: number }
        Returns: number
      }
      _aduana_vehiculo_visible: {
        Args: {
          p_algun: string[]
          p_creado_por: string
          p_lead: string
          p_origen: string
          p_todos: string[]
          p_yo: string
        }
        Returns: boolean
      }
      _agenda_cotizacion: { Args: { p_cot: string; p_hint?: string }; Returns: string }
      _agenda_destinatarios_aplicar: {
        Args: { p_dest: string[]; p_evento: string; p_titulo: string }
        Returns: undefined
      }
      _agenda_destinatarios_validar: {
        Args: {
          p_creador: string
          p_dest: string[]
          p_vis: Database['public']['Enums']['visibilidad_evento']
          p_ya: string[]
        }
        Returns: string[]
      }
      _agenda_evento_datos: {
        Args: {
          p_actual: Omit<
            Database['public']['Tables']['eventos']['Row'],
            Database['public']['Tables']['eventos']['ComputedFields']
          >
          p_datos: Json
        }
        Returns: {
          actualizado_en: string
          cotizacion_id: string | null
          creado_en: string
          creado_por: string
          descripcion: string | null
          eliminado_en: string | null
          estado: Database['public']['Enums']['estado_agenda']
          id: string
          inicia_en: string
          lead_id: string | null
          lugar: string | null
          termina_en: string | null
          titulo: string
          vehiculo_id: string | null
          visibilidad: Database['public']['Enums']['visibilidad_evento']
        }
        SetofOptions: {
          from: '*'
          to: 'eventos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _agenda_evento_mio: {
        Args: { p_evento: string }
        Returns: {
          actualizado_en: string
          cotizacion_id: string | null
          creado_en: string
          creado_por: string
          descripcion: string | null
          eliminado_en: string | null
          estado: Database['public']['Enums']['estado_agenda']
          id: string
          inicia_en: string
          lead_id: string | null
          lugar: string | null
          termina_en: string | null
          titulo: string
          vehiculo_id: string | null
          visibilidad: Database['public']['Enums']['visibilidad_evento']
        }
        SetofOptions: {
          from: '*'
          to: 'eventos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _agenda_fecha: { Args: { p_hint: string; p_valor: Json }; Returns: string }
      _agenda_puede_recibir: { Args: { p_usuario: string }; Returns: boolean }
      _agenda_soy_destinatario: { Args: { p_evento: string }; Returns: boolean }
      _agenda_tarea_accionar: { Args: { p_tarea: string; p_usuario: string }; Returns: undefined }
      _agenda_tarea_datos: {
        Args: {
          p_actual: Omit<
            Database['public']['Tables']['tareas']['Row'],
            Database['public']['Tables']['tareas']['ComputedFields']
          >
          p_datos: Json
        }
        Returns: {
          actualizado_en: string
          completada_en: string | null
          conversacion_id: string | null
          cotizacion_id: string | null
          creado_en: string
          creado_por: string
          descripcion: string | null
          eliminado_en: string | null
          estado: Database['public']['Enums']['estado_agenda']
          id: string
          lead_id: string | null
          responsable_id: string
          titulo: string
          vehiculo_id: string | null
          vence_en: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'tareas'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _agenda_tarea_tomar: {
        Args: { p_tarea: string }
        Returns: {
          actualizado_en: string
          completada_en: string | null
          conversacion_id: string | null
          cotizacion_id: string | null
          creado_en: string
          creado_por: string
          descripcion: string | null
          eliminado_en: string | null
          estado: Database['public']['Enums']['estado_agenda']
          id: string
          lead_id: string | null
          responsable_id: string
          titulo: string
          vehiculo_id: string | null
          vence_en: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'tareas'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _alcance_de_usuario: {
        Args: { p_clave: string; p_origen: string; p_usuario: string }
        Returns: Database['public']['Enums']['alcance_permiso']
      }
      _alerta_demora_avisar: {
        Args: {
          p_dias: number
          p_fase: string
          p_fase_desde: string
          p_fase_nombre: string
          p_horas: number
          p_titulo: string
          p_usuario: string
          p_vehiculo: string
        }
        Returns: number
      }
      _alertas_destinatarios: {
        Args: { p_clave: string; p_origen: string }
        Returns: {
          todos: boolean
          usuario_id: string
        }[]
      }
      _apibara_catalogo: {
        Args: Record<PropertyKey, never>
        Returns: {
          clave: string
          clave_apibara: string
          en_tarjeta: boolean
          es_sistema: boolean
          etiqueta: string
          filtrable: boolean
          grupo: string
          orden: number
          publico_web: boolean
          tipo: Database['public']['Enums']['tipo_campo']
        }[]
      }
      _apibara_consulta_tomar: {
        Args: { p_consulta: string; p_origen: string; p_vehiculo: string }
        Returns: {
          creado_en: string
          creado_por: string
          id: string
          origen_id: string
          raw: NonNullable<Json>
          vehiculo_id: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'apibara_consultas'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _apibara_hojas: {
        Args: { p_raw: Json }
        Returns: {
          ruta: string
          tipo: string
          valor: Json
        }[]
      }
      _apibara_ruta_ignorada: { Args: { p_ruta: string }; Returns: boolean }
      _atributos_completar: {
        Args: {
          p_activas: string[]
          p_actuales: Json
          p_msg_clave: string
          p_msg_objeto: string
          p_nuevos: Json
        }
        Returns: Json
      }
      _atributos_fusionar: {
        Args: {
          p_activas: string[]
          p_actuales: Json
          p_cambios: Json
          p_msg_clave: string
          p_msg_objeto: string
        }
        Returns: Json
      }
      _atributos_rango: {
        Args: { p_anteriores: Json; p_campos: Json; p_nuevos: Json }
        Returns: undefined
      }
      _atributos_validar: {
        Args: { p_atributos: Json; p_campos: Json; p_msg_objeto: string }
        Returns: undefined
      }
      _baja_lote: { Args: { p_lote: number; p_usuario: string }; Returns: boolean }
      _baja_lote_desde: {
        Args: { p_desde: string; p_lote: number; p_usuario: string }
        Returns: string
      }
      _baja_terminar: { Args: { p_usuario: string }; Returns: boolean }
      _bajas_en_curso: { Args: Record<PropertyKey, never>; Returns: string[] }
      _bandeja_demoradas: {
        Args: { p_n: number }
        Returns: {
          dias: number
          fase: string
          fase_desde: string
          fase_id: string
          id: string
          origen_id: string
          titulo: string
          vence: string
        }[]
      }
      _bandeja_por_aprobar: { Args: { p_n: number }; Returns: Json }
      _bandeja_trabados: { Args: { p_demoradas: Json; p_n: number }; Returns: Json }
      _borrador_formula_empezado_por: { Args: { p_creado_por: string }; Returns: string }
      _buscador_interpretar: { Args: { p_texto: string }; Returns: Record<string, unknown> }
      _campo_impacto: {
        Args: { p_tipo: Database['public']['Enums']['tipo_campo']; p_valores: Json[] }
        Returns: Json
      }
      _campo_limite: {
        Args: { p_cambios: Json; p_clave: string; p_vigente: number }
        Returns: number
      }
      _campo_nombre_valido: {
        Args: { p_largo: number; p_que: string; p_texto: string }
        Returns: string
      }
      _campo_opciones_validas: { Args: { p_opciones: Json }; Returns: undefined }
      _campo_rango: {
        Args: {
          p_defecto: Json
          p_maximo: number
          p_minimo: number
          p_tipo: Database['public']['Enums']['tipo_campo']
        }
        Returns: undefined
      }
      _campo_tiene_valor: { Args: { p_valor: Json }; Returns: boolean }
      _campo_valor_defecto: {
        Args: { p_opciones: Json; p_tipo: Database['public']['Enums']['tipo_campo']; p_valor: Json }
        Returns: Json
      }
      _campos_renumerar: {
        Args: { p_filas: Json }
        Returns: {
          campo_id: string
          orden_nuevo: number
        }[]
      }
      _campos_reordenar: {
        Args: { p_campo: string; p_despues_de: string; p_filas: Json }
        Returns: {
          campo_id: string
          orden_nuevo: number
        }[]
      }
      _candado_de_objeto: { Args: { p_bucket: string; p_ruta: string }; Returns: number }
      _chat_cuerpo: { Args: { p_cuerpo: string; p_obligatorio: boolean }; Returns: string }
      _chat_menciones_guardar: {
        Args: { p_conversacion: string; p_cuerpo: string; p_menciones: Json; p_mensaje: string }
        Returns: undefined
      }
      _chat_miembro_vigente: {
        Args: { p_conversacion: string; p_usuario: string }
        Returns: boolean
      }
      _chat_puede_conversar: { Args: { p_usuario: string }; Returns: boolean }
      _color_contraste: { Args: { p_a: string; p_b: string }; Returns: number }
      _color_luminancia: { Args: { p_hex: string }; Returns: number }
      _comentario_item: {
        Args: {
          p_actualizado_en: string
          p_autor: string
          p_creado_en: string
          p_cuerpo: string
          p_eliminado_en: string
          p_id: string
          p_nombre: string
          p_yo: string
        }
        Returns: Json
      }
      _compilar_visibilidad: { Args: { p_def: Json; p_diseno: Json }; Returns: Json }
      _comprobante_ruta_valida: { Args: { p_ruta: string; p_unidad: string }; Returns: boolean }
      _comprobante_unidad: { Args: { p_nombre: string }; Returns: string }
      _conflicto_de_edicion: {
        Args: { p_cuando: string; p_registro: string; p_sujeto: string; p_tabla: string }
        Returns: undefined
      }
      _contraste_aa: { Args: { p_razon: number }; Returns: boolean }
      _cotizacion_a_papelera: {
        Args: { p_con_version: boolean; p_esperado: string; p_id: string; p_lote: string }
        Returns: Json
      }
      _cotizacion_abierta: {
        Args: { p_abierta_en: string; p_formula: string; p_origen: string }
        Returns: undefined
      }
      _cotizacion_abierta_firmar: {
        Args: { p_cuando: string; p_formula: string; p_origen: string }
        Returns: string
      }
      _cotizacion_abierta_leer: {
        Args: { p_abierta: string; p_origen: string }
        Returns: {
          abierta_en: string
          formula_id: string
        }[]
      }
      _cotizacion_armar: {
        Args: {
          p_abierta_en?: string
          p_con_la_abierta?: boolean
          p_cotizacion: string
          p_entradas: Json
          p_formula?: string
          p_origen: string
          p_vehiculo: string
        }
        Returns: {
          definicion: Json
          entrada: Json
          formula_id: string
          guardado: Json
          origen_id: string
          params: Json
          tc_cambiado: boolean
          visibilidad: Json
        }[]
      }
      _cotizacion_cadena: {
        Args: {
          c: Omit<
            Database['public']['Tables']['cotizaciones']['Row'],
            Database['public']['Tables']['cotizaciones']['ComputedFields']
          >
          p_publicada: string
        }
        Returns: Json
      }
      _cotizacion_conservar: {
        Args: { p_def: Json; p_editables: Json; p_entrada: Json; p_guardado: Json }
        Returns: Json
      }
      _cotizacion_contexto: {
        Args: { p_def: Json; p_visibilidad: Json; p_visibles: string[] }
        Returns: Json
      }
      _cotizacion_de_objeto: { Args: { p_nombre: string }; Returns: string }
      _cotizacion_descartados: {
        Args: {
          p_def_ant: Json
          p_fuentes: Json
          p_lleva: Json
          p_res: Json
          p_valores: Json
          p_visibles: string[]
        }
        Returns: number
      }
      _cotizacion_diff_recortado: {
        Args: { p_ctx: Json; p_diff: Json; p_legibles: string[] }
        Returns: Json
      }
      _cotizacion_entradas_de: {
        Args: { p_def: Json; p_fuentes: Json; p_valores: Json }
        Returns: Json
      }
      _cotizacion_guardable: { Args: { p_mandados: Json; p_res: Json }; Returns: number }
      _cotizacion_hoja: {
        Args: { p_edita?: boolean; p_formula: string; p_origen: string }
        Returns: Json
      }
      _cotizacion_lo_que_se_lleva: {
        Args: { p_def: Json; p_entrada: Json; p_fuentes: Json; p_valores: Json }
        Returns: Json
      }
      _cotizacion_modo: { Args: { p_formula: string; p_modo_tc: string }; Returns: Json }
      _cotizacion_puede_guardar: {
        Args: {
          p_clase: Database['public']['Enums']['clase_cotizacion']
          p_cot: string
          p_origen: string
        }
        Returns: boolean
      }
      _cotizacion_recorte: { Args: { p_ctx: Json; p_res: Json }; Returns: Json }
      _cotizacion_respuesta: {
        Args: {
          c: Omit<
            Database['public']['Tables']['cotizaciones']['Row'],
            Database['public']['Tables']['cotizaciones']['ComputedFields']
          >
          p_ctx?: Json
        }
        Returns: Json
      }
      _cotizacion_tabla_version: {
        Args: { p_abierta: string; p_cotizacion: string; p_origen: string }
        Returns: string
      }
      _cotizacion_tipeado: {
        Args: { p_def: Json; p_entrada: Json; p_modo: Json; p_ok: Json; p_tiene_variante?: boolean }
        Returns: string[]
      }
      _cotizacion_vehiculo: { Args: { p_vehiculo: string }; Returns: undefined }
      _cotizacion_ver_total_bs: { Args: { p_formula: string; p_ver: boolean }; Returns: undefined }
      _cotizaciones_papelera_lote_json: {
        Args: {
          p_dias: number
          p_lote: Omit<
            Database['public']['Tables']['lotes_papelera']['Row'],
            Database['public']['Tables']['lotes_papelera']['ComputedFields']
          >
          p_primeros: number
          p_yo: string
        }
        Returns: Json
      }
      _declaracion_datos: {
        Args: {
          o: Omit<
            Database['public']['Tables']['declaraciones_aduana']['Row'],
            Database['public']['Tables']['declaraciones_aduana']['ComputedFields']
          >
          p_datos: Json
        }
        Returns: {
          aceptada_el: string | null
          actualizado_en: string
          canal: Database['public']['Enums']['canal_aforo'] | null
          creado_en: string
          creado_por: string | null
          deposito: string | null
          despachante: string | null
          id: string
          notas: string | null
          numero: string
          vence_tributos_el: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'declaraciones_aduana'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _declaracion_resumen: {
        Args: { p_algun: string[]; p_id: string; p_todos: string[]; p_yo: string }
        Returns: Record<string, unknown>
      }
      _declaracion_vehiculos_listas: {
        Args: { p_agregar: string[]; p_quitar: string[] }
        Returns: Record<string, unknown>
      }
      _declaracion_vehiculos_validar: {
        Args: { p_agregar: string[]; p_declaracion: string; p_todos: string[] }
        Returns: undefined
      }
      _declaraciones_filtros: { Args: { p_filtros: Json }; Returns: Record<string, unknown> }
      _dinero_filtros: {
        Args: { p_claves: string[]; p_filtros: Json }
        Returns: Record<string, unknown>
      }
      _dinero_regla_activa: {
        Args: { p_regla: string; p_repuesto: string; p_vehiculo: string }
        Returns: boolean
      }
      _diseno_auxiliares: { Args: { p_def: Json }; Returns: Json }
      _diseno_forma: { Args: { p_diseno: Json }; Returns: undefined }
      _diseno_forma_item: { Args: { p_i: Json }; Returns: boolean }
      _diseno_maximo_de_items: { Args: Record<PropertyKey, never>; Returns: number }
      _diseno_modos: {
        Args: {
          p_buckets: Json
          p_modos: Json
          p_nb: number
          p_pos: Json
          p_tipos: string[]
          p_total_en: string
        }
        Returns: undefined
      }
      _diseno_nivel: {
        Args: { p_donde: string; p_nivel: string; p_niveles: Json; p_retirados: Json }
        Returns: undefined
      }
      _diseno_secciones: {
        Args: {
          p_cond: Json
          p_ids: string[]
          p_niveles: Json
          p_ops: string[]
          p_pcts: string[]
          p_pos: Json
          p_req: Json
          p_retirados: Json
          p_salidas: string[]
          p_secs: Json
          p_sobres: boolean[]
          p_tarjeta: Json
          p_tipos: string[]
        }
        Returns: undefined
      }
      _documento_fecha: { Args: { p_cambios: Json; p_clave: string }; Returns: string }
      _documento_puede_tocar: {
        Args: {
          p_estado: Database['public']['Enums']['estado_documento']
          p_repuesto: string
          p_subido_por: string
          p_vehiculo: string
        }
        Returns: boolean
      }
      _documento_tipo_de: {
        Args: { p_repuesto: string; p_tipo: string; p_vehiculos: string[] }
        Returns: {
          activo: boolean
          actualizado_en: string
          aviso_dias: number | null
          creado_en: string
          descripcion: string | null
          flujo_id: string | null
          formatos: string[]
          id: string
          modo_vencimiento: Database['public']['Enums']['modo_vencimiento']
          nombre: string
          orden: number
          proposito: string | null
          vigencia_dias: number | null
          visible_portal_permitido: boolean
        }
        SetofOptions: {
          from: '*'
          to: 'tipos_documento'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _documento_validar_archivo: {
        Args: {
          p_bytes: number
          p_formatos: string[]
          p_mime: string
          p_nombre: string
          p_ruta: string
          p_unidades: string[]
        }
        Returns: Record<string, unknown>
      }
      _documento_validar_unidades: {
        Args: { p_repuesto: string; p_vehiculos: string[] }
        Returns: string[]
      }
      _documento_vence: {
        Args: {
          p_emitido: string
          p_modo: Database['public']['Enums']['modo_vencimiento']
          p_subido: string
          p_vence: string
          p_vigencia: number
        }
        Returns: string
      }
      _documento_vencimiento_avisar: {
        Args: {
          p_cuerpo: string
          p_desde: string
          p_documento: string
          p_titulo: string
          p_usuario: string
          p_vehiculo: string
        }
        Returns: number
      }
      _documento_ya_registrado: { Args: { p_ids: string[]; p_ruta: string }; Returns: Json }
      _documentos_de: { Args: { p_ids: string[] }; Returns: Json }
      _embudo_conflicto: { Args: { p_cuando: string }; Returns: undefined }
      _embudo_defecto_de: { Args: { p_usuario: string }; Returns: string }
      _embudo_etapas_de_fabrica: { Args: Record<PropertyKey, never>; Returns: Json }
      _embudo_insertar: {
        Args: {
          p_default: boolean
          p_etapas: Json
          p_id: string
          p_nombre: string
          p_usuario: string
        }
        Returns: string
      }
      _embudo_json: { Args: { p_embudo: string }; Returns: Json }
      _embudo_mio: {
        Args: { p_embudo: string }
        Returns: {
          actualizado_en: string
          creado_en: string
          es_default: boolean
          id: string
          nombre: string
          usuario_id: string
        }
        SetofOptions: {
          from: '*'
          to: 'embudos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _embudo_nombre: { Args: { p_nombre: string }; Returns: string }
      _embudo_nombre_libre: {
        Args: { p_excepto: string; p_nombre: string; p_usuario: string }
        Returns: undefined
      }
      _embudo_patron: { Args: { p_texto: string }; Returns: string }
      _embudo_plantilla_normalizar: { Args: { p_etapas: Json }; Returns: Json }
      _embudos_candado: { Args: { p_usuario: string }; Returns: undefined }
      _embudos_puedo: { Args: Record<PropertyKey, never>; Returns: string }
      _encolar_para_limpiar: {
        Args: { p_bucket: string; p_rutas: string[]; p_ya: boolean }
        Returns: number
      }
      _equipo_busqueda_patron: { Args: { p_texto: string }; Returns: string }
      _equipo_lista_indexable: { Args: { p_texto: string }; Returns: boolean }
      _equipo_lista_recorrido: { Args: Record<PropertyKey, never>; Returns: number }
      _equipo_lista_sql: {
        Args: { p_estado: string; p_etapa: string; p_limite: number; p_texto: string }
        Returns: string
      }
      _estado_de_persona: {
        Args: {
          p_aceptada_en: string
          p_activo: boolean
          p_bloqueado: boolean
          p_invitado_en: string
        }
        Returns: string
      }
      _etiqueta_color: { Args: { p_color: string }; Returns: string }
      _etiqueta_conflicto: { Args: { p_cuando: string }; Returns: undefined }
      _etiqueta_json: {
        Args: {
          e: Omit<
            Database['public']['Tables']['etiquetas']['Row'],
            Database['public']['Tables']['etiquetas']['ComputedFields']
          >
        }
        Returns: Json
      }
      _etiqueta_nombre: { Args: { p_nombre: string }; Returns: string }
      _etiqueta_nombre_libre: { Args: { p_excepto: string; p_nombre: string }; Returns: undefined }
      _etiquetas_candado: { Args: Record<PropertyKey, never>; Returns: undefined }
      _etiquetas_paleta: { Args: Record<PropertyKey, never>; Returns: string[] }
      _exigir_borrador_formula: {
        Args: {
          p_borrador: Omit<
            Database['public']['Tables']['formulas']['Row'],
            Database['public']['Tables']['formulas']['ComputedFields']
          >
          p_esperado: string
        }
        Returns: undefined
      }
      _exigir_persona_dominada: {
        Args: { p_accion: string; p_usuario: string }
        Returns: undefined
      }
      _exigir_version: {
        Args: { p_actual: string; p_esperado: string; p_mensaje: string }
        Returns: undefined
      }
      _fase_aplicar: {
        Args: {
          p_datos: Json
          p_fila: Omit<
            Database['public']['Tables']['fases']['Row'],
            Database['public']['Tables']['fases']['ComputedFields']
          >
        }
        Returns: {
          activa: boolean
          actualizado_en: string
          alerta_cada_horas: number | null
          alias_portal: string | null
          color: string
          creado_en: string
          cuenta_llegada_repuestos: boolean
          demora_dias: number | null
          descripcion: string | null
          descripcion_portal: string | null
          es_final: boolean
          es_inicial: boolean
          es_logistica: boolean
          flujo_id: string
          icono: string | null
          id: string
          nombre: string
          nota_obligatoria: boolean
          orden: number
          permite_aduana: boolean
          permite_contenedor: boolean
          publica_web: boolean
          visible_portal: boolean
        }
        SetofOptions: {
          from: '*'
          to: 'fases'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _fase_conflicto: {
        Args: { p_actual: string; p_repuesto: string; p_vehiculo: string }
        Returns: undefined
      }
      _fase_forma: { Args: { p_datos: Json; p_vacio_vale: boolean }; Returns: undefined }
      _fase_unico: { Args: { p_nombre: string; p_restriccion: string }; Returns: undefined }
      _fase_uso: { Args: { p_fase: string }; Returns: Json }
      _fase_validar: {
        Args: {
          p_claves: string[]
          p_fila: Omit<
            Database['public']['Tables']['fases']['Row'],
            Database['public']['Tables']['fases']['ComputedFields']
          >
        }
        Returns: undefined
      }
      _final_aplicar: {
        Args: {
          c: Omit<
            Database['public']['Tables']['cotizaciones']['Row'],
            Database['public']['Tables']['cotizaciones']['ComputedFields']
          >
          p_tomadas: string[]
        }
        Returns: undefined
      }
      _final_crear_mirar: {
        Args: { p_ids: string[]; p_lead: string; p_vehiculo: string }
        Returns: undefined
      }
      _flujo_para_editar: {
        Args: { p_actualizado_en_esperado: string; p_flujo: string }
        Returns: {
          activo: boolean
          actualizado_en: string
          ambito: Database['public']['Enums']['ambito_flujo']
          creado_en: string
          id: string
          nombre: string
          origen_id: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'flujos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _flujo_regla_admitida: {
        Args: { p_ambito: Database['public']['Enums']['ambito_flujo']; p_regla: string }
        Returns: boolean
      }
      _flujo_regla_uso: { Args: { p_flujo: string; p_regla: string }; Returns: Json }
      _flujo_tocar: { Args: { p_flujo: string }; Returns: string }
      _formula_cambio_y_grupos: {
        Args: {
          p_buckets: Json
          p_formatos: string[]
          p_grupos: Json
          p_ids: string[]
          p_nodos: Json
          p_pos: Json
          p_tipos: string[]
          p_total: number
          p_total_en: Json
        }
        Returns: undefined
      }
      _formula_campos: { Args: { p_nodos: Json; p_tipos: string[] }; Returns: undefined }
      _formula_forma: { Args: { p_def: Json; p_params: Json }; Returns: undefined }
      _formula_forma_nodo: { Args: { p_n: Json }; Returns: string }
      _formula_rechazar: {
        Args: { p_donde: string; p_mensaje: string; p_regla: string }
        Returns: undefined
      }
      _formula_variante: {
        Args: { p_ids: string[]; p_nodos: Json; p_tipos: string[] }
        Returns: undefined
      }
      _fotos_abrir: { Args: { p_vehiculo: string }; Returns: string }
      _fotos_cerrar: {
        Args: { p_accion: string; p_detalle: Json; p_vehiculo: string }
        Returns: string
      }
      _fotos_exigir_version: {
        Args: { p_actual: string; p_esperado: string; p_vehiculo: string }
        Returns: undefined
      }
      _gasto_bloquear: {
        Args: {
          o: Omit<
            Database['public']['Tables']['gastos']['Row'],
            Database['public']['Tables']['gastos']['ComputedFields']
          >
        }
        Returns: undefined
      }
      _gasto_de_cambios: {
        Args: {
          o: Omit<
            Database['public']['Tables']['gastos']['Row'],
            Database['public']['Tables']['gastos']['ComputedFields']
          >
          p_cambios: Json
        }
        Returns: {
          actualizado_en: string
          categoria_id: string
          comprobante_ruta: string | null
          creado_en: string
          creado_por: string | null
          eliminado_en: string | null
          fecha: string
          id: string
          lote_id: string | null
          moneda: string
          monto: number
          monto_base: number
          notas: string | null
          proveedor: string | null
          repuesto_id: string | null
          tipo_cambio_aplicado: number | null
          tipo_cambio_id: string | null
          vehiculo_id: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'gastos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _gasto_respuesta: {
        Args: {
          g: Omit<
            Database['public']['Tables']['gastos']['Row'],
            Database['public']['Tables']['gastos']['ComputedFields']
          >
          p_extra: Json
        }
        Returns: Json
      }
      _gasto_tributo_protegido: {
        Args: {
          o: Omit<
            Database['public']['Tables']['gastos']['Row'],
            Database['public']['Tables']['gastos']['ComputedFields']
          >
          p_categoria_nueva: string
        }
        Returns: undefined
      }
      _gasto_validar: {
        Args: {
          p_categoria: string
          p_monto: number
          p_repuesto: string
          p_ruta: string
          p_vehiculo: string
        }
        Returns: undefined
      }
      _gracia_de_storage: { Args: Record<PropertyKey, never>; Returns: string }
      _hace: { Args: { p_cuando: string }; Returns: string }
      _hoja_chips: {
        Args: { p_columna: string; p_filas: number; p_nodo: Json; p_origen: string; p_params: Json }
        Returns: Json
      }
      _hoja_datos_del_vehiculo: {
        Args: { p_nodos: Json; p_origen: string; p_tablas: Json; p_vivas: Json }
        Returns: Json
      }
      _hoja_estado: {
        Args: {
          p_celda: boolean
          p_cfg: boolean
          p_edita: boolean
          p_nivel: string
          p_nodo: Json
          p_nombre: string
          p_tc: boolean
        }
        Returns: Json
      }
      _icono_del_catalogo: { Args: { p_icono: string }; Returns: string }
      _iconos_del_catalogo: { Args: Record<PropertyKey, never>; Returns: string[] }
      _importacion_vence_en: {
        Args: {
          p: Omit<
            Database['public']['Tables']['importaciones']['Row'],
            Database['public']['Tables']['importaciones']['ComputedFields']
          >
        }
        Returns: string
      }
      _lead_aplicar_bajas: { Args: { p_lead: string }; Returns: undefined }
      _lead_atributos_formato: {
        Args: { p_anteriores: Json; p_campos: Json; p_nuevos: Json }
        Returns: undefined
      }
      _lead_atributos_publicos: { Args: { p_atributos: Json }; Returns: Json }
      _lead_busqueda_patron: { Args: { p_texto: string }; Returns: string }
      _lead_campo_con_valor: { Args: { p_clave: string }; Returns: number }
      _lead_campo_privacidad_lote: { Args: { p_campo: string; p_lote: number }; Returns: boolean }
      _lead_campos_renumerar: { Args: Record<PropertyKey, never>; Returns: undefined }
      _lead_cartera_calcular: { Args: { p_lead: string }; Returns: string[] }
      _lead_cartera_json: { Args: { p_lead: string }; Returns: Json }
      _lead_clave_reservada: { Args: { p_clave: string }; Returns: boolean }
      _lead_conflicto: { Args: { p_cuando: string; p_lead: string }; Returns: undefined }
      _lead_crear: {
        Args: {
          p_id: string
          p_lead: Json
          p_recordar_origen: boolean
          p_recordatorio: Json
          p_seguimiento: Json
        }
        Returns: Json
      }
      _lead_defecto_empresa: {
        Args: {
          p_defecto: Json
          p_empresa: string
          p_tipo: Database['public']['Enums']['tipo_campo']
        }
        Returns: string
      }
      _lead_destino_validar: { Args: { p_usuario: string }; Returns: undefined }
      _lead_dueno: { Args: { p_lead: string }; Returns: string }
      _lead_mio: {
        Args: { p_bloquear?: boolean; p_clave?: string; p_lead: string }
        Returns: {
          actualizado_en: string
          atributos: NonNullable<Json>
          atributos_publicos: NonNullable<Json>
          cartera: string[]
          cliente_desde: string | null
          creado_en: string
          creado_por: string | null
          eliminado_en: string | null
          eliminado_por: string | null
          id: string
          lote_papelera_id: string | null
          nombre: string
          numero: number
          numero_propio: number | null
          origen_lead_id: string | null
          telefono_cc: string | null
          telefono_principal: string
          tipo_lead_id: string
          ultimo_seguimiento_en: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'leads'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _lead_mis_etiquetas: { Args: { p_lead: string }; Returns: Json }
      _lead_motivo_de_bloqueo: {
        Args: {
          l: Omit<
            Database['public']['Tables']['leads']['Row'],
            Database['public']['Tables']['leads']['ComputedFields']
          >
          p_al_enviar: boolean
        }
        Returns: string
      }
      _lead_motivo_de_restaurar: {
        Args: {
          l: Omit<
            Database['public']['Tables']['leads']['Row'],
            Database['public']['Tables']['leads']['ComputedFields']
          >
        }
        Returns: string
      }
      _lead_motivo_para_deshacer: { Args: { p_lead: string; p_yo: string }; Returns: string }
      _lead_numeros: {
        Args: {
          p_lead: Omit<
            Database['public']['Tables']['leads']['Row'],
            Database['public']['Tables']['leads']['ComputedFields']
          >
          p_ve: boolean
        }
        Returns: Json
      }
      _lead_numeros_de: { Args: { p_lead: string }; Returns: Json }
      _lead_para_mover: {
        Args: { p_lead: string }
        Returns: {
          actualizado_en: string
          atributos: NonNullable<Json>
          atributos_publicos: NonNullable<Json>
          cartera: string[]
          cliente_desde: string | null
          creado_en: string
          creado_por: string | null
          eliminado_en: string | null
          eliminado_por: string | null
          id: string
          lote_papelera_id: string | null
          nombre: string
          numero: number
          numero_propio: number | null
          origen_lead_id: string | null
          telefono_cc: string | null
          telefono_principal: string
          tipo_lead_id: string
          ultimo_seguimiento_en: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'leads'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _lead_telefonos_estado: { Args: { p_lead: string; p_resultado: string }; Returns: Json }
      _lead_verificar: { Args: { p_excluir?: string; p_tel: string }; Returns: Json }
      _lead_visible: { Args: { p_lead: string }; Returns: string }
      _lead_visible_para: {
        Args: {
          p_alcance: Database['public']['Enums']['alcance_permiso']
          p_cartera: string[]
          p_eliminado_en: string
          p_fuera: string[]
          p_yo: string
        }
        Returns: boolean
      }
      _lead_vivo_en_mi_cartera: { Args: { p_lead: string }; Returns: boolean }
      _leads_al_limbo_de: { Args: { p_tope: number; p_usuario: string }; Returns: number }
      _leads_asesores_reciente_rellenar: { Args: Record<PropertyKey, never>; Returns: number }
      _leads_candidatos_etiquetas: { Args: { p_filtros: Json; p_yo: string }; Returns: string[] }
      _leads_candidatos_indexable: { Args: { p_filtros: Json }; Returns: boolean }
      _leads_candidatos_recorrido: { Args: Record<PropertyKey, never>; Returns: number }
      _leads_candidatos_sql: {
        Args: {
          p_alcance: Database['public']['Enums']['alcance_permiso']
          p_etapa: string
          p_filtros: Json
          p_fuera: string[]
          p_yo: string
        }
        Returns: string
      }
      _leads_candidatos_tope: { Args: Record<PropertyKey, never>; Returns: number }
      _leads_cartera_corta_tope: { Args: Record<PropertyKey, never>; Returns: number }
      _leads_cartera_recalcular: { Args: { p_leads: string[] }; Returns: undefined }
      _leads_columnas_a_atributos: { Args: Record<PropertyKey, never>; Returns: number }
      _leads_derivados_rellenar: { Args: { p_lote: number }; Returns: number }
      _leads_numerar_existentes: { Args: Record<PropertyKey, never>; Returns: undefined }
      _leads_papelera_lote_json: {
        Args: {
          p_dias: number
          p_lote: Omit<
            Database['public']['Tables']['lotes_papelera']['Row'],
            Database['public']['Tables']['lotes_papelera']['ComputedFields']
          >
          p_primeros: number
          p_yo: string
        }
        Returns: Json
      }
      _leads_vista_crear: { Args: Record<PropertyKey, never>; Returns: undefined }
      _limpieza_ancla: {
        Args: {
          v: Omit<
            Database['public']['Tables']['vehiculos']['Row'],
            Database['public']['Tables']['vehiculos']['ComputedFields']
          >
        }
        Returns: string
      }
      _limpieza_aplica: {
        Args: {
          v: Omit<
            Database['public']['Tables']['vehiculos']['Row'],
            Database['public']['Tables']['vehiculos']['ComputedFields']
          >
        }
        Returns: boolean
      }
      _limpieza_fecha: {
        Args: {
          p_ahora: string
          p_proxima: string
          v: Omit<
            Database['public']['Tables']['vehiculos']['Row'],
            Database['public']['Tables']['vehiculos']['ComputedFields']
          >
        }
        Returns: string
      }
      _limpieza_hora: { Args: Record<PropertyKey, never>; Returns: number }
      _limpieza_proxima: { Args: { p_ahora: string }; Returns: string }
      _limpieza_termino: {
        Args: {
          p_ahora: string
          v: Omit<
            Database['public']['Tables']['vehiculos']['Row'],
            Database['public']['Tables']['vehiculos']['ComputedFields']
          >
        }
        Returns: string
      }
      _limpieza_vence: {
        Args: {
          p_ahora: string
          v: Omit<
            Database['public']['Tables']['vehiculos']['Row'],
            Database['public']['Tables']['vehiculos']['ComputedFields']
          >
        }
        Returns: string
      }
      _limpieza_ventana_de_aviso: { Args: Record<PropertyKey, never>; Returns: number }
      _logistica_alcance: {
        Args: { p_origen: string }
        Returns: Database['public']['Enums']['alcance_permiso']
      }
      _logistica_columna: {
        Args: {
          p_desde: string
          p_dias: number
          p_f: Json
          p_fase: string
          p_id: string
          p_n: number
          p_origen: string
          p_todos: boolean
        }
        Returns: Json
      }
      _logistica_dias: { Args: { p_fase: string }; Returns: number }
      _logistica_filtros: { Args: { p: Json }; Returns: Json }
      _lote_papelera_tocar: { Args: { p_lote: string }; Returns: string }
      _monto_en_base: {
        Args: { p_moneda: string; p_monto: number; p_tipo_cambio: string; p_valor?: number }
        Returns: Record<string, unknown>
      }
      _motor_borde_entre: { Args: { a: number; b: number }; Returns: number }
      _motor_borde_mas: { Args: { a: number; b: number }; Returns: number }
      _motor_borde_menos: { Args: { a: number; b: number }; Returns: number }
      _motor_borde_numero: { Args: { j: Json }; Returns: number }
      _motor_borde_por: { Args: { a: number; b: number }; Returns: number }
      _motor_entre: { Args: { a: number; b: number }; Returns: number }
      _motor_fallar: {
        Args: { p_codigo: string; p_donde: string; p_mensaje: string }
        Returns: undefined
      }
      _motor_forma_entrada: { Args: { p_e: Json }; Returns: string }
      _motor_forma_modo: { Args: { p_m: Json }; Returns: string }
      _motor_mas: { Args: { a: number; b: number }; Returns: number }
      _motor_menos: { Args: { a: number; b: number }; Returns: number }
      _motor_numero: { Args: { j: Json }; Returns: number }
      _motor_por: { Args: { a: number; b: number }; Returns: number }
      _motor_redondear: { Args: { n: number; x: number }; Returns: number }
      _motor_sin_leer: { Args: { p_quien: string; p_ref: string }; Returns: undefined }
      _motor_sin_validar: { Args: { p_detalle: string; p_donde: string }; Returns: undefined }
      _nivel_clave: { Args: { p_nombre: string }; Returns: string }
      _nivel_motivo_de_uso: { Args: { p_clave: string }; Returns: string }
      _nivel_nombre: { Args: { p_texto: string }; Returns: string }
      _nivel_permisos_crear: {
        Args: { p_clave: string; p_conceder: boolean; p_nombre: string }
        Returns: undefined
      }
      _nivel_uso: { Args: { p_clave: string }; Returns: Json }
      _niveles_de_cotizacion: { Args: Record<PropertyKey, never>; Returns: Record<string, unknown> }
      _niveles_del_diseno: { Args: { p_diseno: Json }; Returns: Json }
      _niveles_lista: { Args: Record<PropertyKey, never>; Returns: Json }
      _niveles_tope: { Args: Record<PropertyKey, never>; Returns: number }
      _nodos_visibles: {
        Args: { p_formula: string }
        Returns: {
          editar: boolean
          nodo: string
        }[]
      }
      _oportunidad_conflicto: { Args: { p_cuando: string }; Returns: undefined }
      _oportunidad_constancia: {
        Args: {
          o: Omit<
            Database['public']['Tables']['oportunidades']['Row'],
            Database['public']['Tables']['oportunidades']['ComputedFields']
          >
          p_antes: Database['public']['Enums']['estado_oportunidad']
        }
        Returns: undefined
      }
      _oportunidad_json: {
        Args: {
          o: Omit<
            Database['public']['Tables']['oportunidades']['Row'],
            Database['public']['Tables']['oportunidades']['ComputedFields']
          >
        }
        Returns: Json
      }
      _oportunidad_mia: {
        Args: { p_eliminada?: boolean; p_id: string }
        Returns: {
          actualizado_en: string
          creado_en: string
          eliminado_en: string | null
          embudo_id: string
          estado: Database['public']['Enums']['estado_oportunidad']
          etapa_id: string
          id: string
          lead_id: string
          moneda: string
          monto_estimado: number | null
          motivo_perdida: string | null
          notas: string | null
          titulo: string
          ultima_actividad_en: string
          usuario_id: string
          vehiculo_id: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'oportunidades'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _oportunidad_monto: { Args: { p_valor: Json }; Returns: number }
      _oportunidad_motivo: { Args: { p_motivo: string }; Returns: string }
      _oportunidad_notas: { Args: { p_valor: Json }; Returns: string }
      _oportunidad_titulo: { Args: { p_valor: Json }; Returns: string }
      _origen_campos_desmarcar_principal: {
        Args: { p_origen: string; p_salvo: string }
        Returns: string
      }
      _origen_campos_renumerar: { Args: { p_origen: string }; Returns: undefined }
      _origen_clave_reservada: { Args: { p_clave: string }; Returns: boolean }
      _origen_lead_clave: { Args: { p_nombre: string }; Returns: string }
      _origen_lead_nombre: { Args: { p_texto: string }; Returns: string }
      _origen_nombre_valido: {
        Args: { p_largo: number; p_que: string; p_texto: string }
        Returns: string
      }
      _origen_opciones_validas: { Args: { p_opciones: Json }; Returns: undefined }
      _origen_valor_defecto: {
        Args: { p_opciones: Json; p_tipo: Database['public']['Enums']['tipo_campo']; p_valor: Json }
        Returns: Json
      }
      _origen_vehiculos_con_valor: { Args: { p_clave: string; p_origen: string }; Returns: number }
      _origenes_lead_json: { Args: Record<PropertyKey, never>; Returns: Json }
      _origenes_lead_tope: { Args: Record<PropertyKey, never>; Returns: number }
      _pago_de_cambios: {
        Args: {
          o: Omit<
            Database['public']['Tables']['pagos']['Row'],
            Database['public']['Tables']['pagos']['ComputedFields']
          >
          p_cambios: Json
        }
        Returns: {
          actualizado_en: string
          comprobante_ruta: string | null
          concepto: string
          confirmado: boolean
          confirmado_en: string | null
          confirmado_por: string | null
          creado_en: string
          creado_por: string | null
          eliminado_en: string | null
          fecha: string
          id: string
          lead_id: string | null
          metodo: string | null
          moneda: string
          monto: number
          monto_base: number
          notas: string | null
          proyecto_repuestos_id: string | null
          tipo_cambio_aplicado: number | null
          tipo_cambio_id: string | null
          vehiculo_id: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'pagos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _pago_exigir_edicion: {
        Args: {
          p: Omit<
            Database['public']['Tables']['pagos']['Row'],
            Database['public']['Tables']['pagos']['ComputedFields']
          >
        }
        Returns: undefined
      }
      _pago_respuesta: {
        Args: {
          p: Omit<
            Database['public']['Tables']['pagos']['Row'],
            Database['public']['Tables']['pagos']['ComputedFields']
          >
          p_extra: Json
        }
        Returns: Json
      }
      _pago_tomar: {
        Args: { p_id: string }
        Returns: {
          actualizado_en: string
          comprobante_ruta: string | null
          concepto: string
          confirmado: boolean
          confirmado_en: string | null
          confirmado_por: string | null
          creado_en: string
          creado_por: string | null
          eliminado_en: string | null
          fecha: string
          id: string
          lead_id: string | null
          metodo: string | null
          moneda: string
          monto: number
          monto_base: number
          notas: string | null
          proyecto_repuestos_id: string | null
          tipo_cambio_aplicado: number | null
          tipo_cambio_id: string | null
          vehiculo_id: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'pagos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _pago_validar: {
        Args: {
          p_concepto: string
          p_metodo: string
          p_monto: number
          p_ruta: string
          p_unidad: string
        }
        Returns: undefined
      }
      _pagos_requisitos_de_fase: { Args: { p_vehiculo: string }; Returns: Json }
      _papelera_purgar_cotizaciones: { Args: { p_ids: string[]; p_lote: string }; Returns: Json }
      _papelera_purgar_leads: { Args: { p_leads: string[]; p_lote: string }; Returns: Json }
      _papelera_purgar_vehiculos: { Args: { p_lote: string; p_vehiculos: string[] }; Returns: Json }
      _papelera_restaurar_cotizaciones: { Args: { p_ids: string[]; p_lote: string }; Returns: Json }
      _papelera_solo_cotizaciones: {
        Args: { p_tipo: Database['public']['Enums']['tipo_lote_papelera'] }
        Returns: undefined
      }
      _personas_dominadas: { Args: { p_ids: string[] }; Returns: string[] }
      _plantilla_borrador_ausente: {
        Args: { p_esperada: string; p_origen: string }
        Returns: undefined
      }
      _plantilla_forma: { Args: { p_plantilla: Json }; Returns: undefined }
      _plantilla_nodos: {
        Args: { p_def: Json; p_diseno: Json; p_plantilla: Json; p_visibilidad: Json }
        Returns: undefined
      }
      _portal_clave_validar: { Args: { p_clave: string }; Returns: undefined }
      _portal_codigo_normal: { Args: { p_codigo: string }; Returns: string }
      _portal_hash_falso: { Args: Record<PropertyKey, never>; Returns: string }
      _portal_mensaje_normalizar: { Args: { p_texto: string }; Returns: string }
      _portal_persona: { Args: { p_id: string }; Returns: Json }
      _portal_vigente: {
        Args: { p_lead: string; p_otorgado_en: string }
        Returns: {
          bloqueado_hasta: string | null
          clave_hash: string
          codigo: string
          debe_cambiar_clave: boolean
          habilitado: boolean
          intentos_fallidos: number
          lead_id: string
          otorgado_en: string
          otorgado_por: string | null
          revocado_en: string | null
          revocado_por: string | null
          ultimo_ingreso_en: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'accesos_portal'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _preparar_publicacion: {
        Args: { p_def: Json; p_diseno: Json; p_ignorar_retirados: boolean; p_params: Json }
        Returns: Json
      }
      _publicar_formula: {
        Args: {
          p_actualizado_en_esperado: string
          p_ignorar_retirados: boolean
          p_nota: string
          p_origen: string
          p_publicada_esperada: string
        }
        Returns: string
      }
      _publicar_version: {
        Args: {
          p_def: Json
          p_detalle: Json
          p_diseno: Json
          p_esperada: string
          p_ignorar_retirados: boolean
          p_nota: string
          p_origen: string
          p_params: Json
        }
        Returns: string
      }
      _puede_mover: { Args: { p_a: string; p_de: string; p_flujo: string }; Returns: boolean }
      _push_endpoint_valido: { Args: { p_endpoint: string }; Returns: boolean }
      _push_host_permitido: { Args: { p_host: string }; Returns: boolean }
      _push_tope_por_persona: { Args: Record<PropertyKey, never>; Returns: number }
      _recordatorio_conflicto: { Args: { p_cuando: string }; Returns: undefined }
      _recordatorio_cuando: { Args: { p_hint: string; p_valor: string }; Returns: string }
      _recordatorio_json: {
        Args: {
          r: Omit<
            Database['public']['Tables']['recordatorios']['Row'],
            Database['public']['Tables']['recordatorios']['ComputedFields']
          >
        }
        Returns: Json
      }
      _recordatorio_mio: {
        Args: { p_id: string }
        Returns: {
          actualizado_en: string
          completado_en: string | null
          creado_en: string
          eliminado_en: string | null
          id: string
          lead_id: string | null
          notificado_en: string | null
          recordar_en: string
          titulo: string
          usuario_id: string
          vehiculo_id: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'recordatorios'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _recordatorio_titulo: { Args: { p_hint: string; p_valor: string }; Returns: string }
      _repuesto_ante_espera: { Args: { p_fase: string; p_item: string }; Returns: string }
      _repuesto_catalogo: {
        Args: { p_catalogo: string; p_clave: string; p_datos: Json }
        Returns: string
      }
      _repuesto_compra_de_datos: {
        Args: {
          o: Omit<
            Database['public']['Tables']['repuestos_compras']['Row'],
            Database['public']['Tables']['repuestos_compras']['ComputedFields']
          >
          p_crear: boolean
          p_datos: Json
        }
        Returns: {
          actualizado_en: string
          comprobante_ruta: string | null
          creado_en: string
          creado_por: string | null
          eliminado_en: string | null
          fecha: string
          id: string
          item_id: string | null
          moneda: string
          monto: number
          monto_base: number | null
          notas: string | null
          proveedor: string | null
          proyecto_id: string
          tipo_cambio_aplicado: number | null
          tipo_cambio_id: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'repuestos_compras'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _repuesto_compra_proyecto: {
        Args: { p_proyecto: string }
        Returns: {
          actualizado_en: string
          cerrado_en: string | null
          cliente_nombre: string | null
          cliente_telefono: string | null
          creado_en: string
          creado_por: string | null
          eliminado_en: string | null
          id: string
          lead_id: string | null
          notas: string | null
          numero: number
          vehiculo_etiqueta: string | null
          vehiculo_id: string | null
          vin: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'repuestos_proyectos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _repuesto_compra_respuesta: {
        Args: {
          c: Omit<
            Database['public']['Tables']['repuestos_compras']['Row'],
            Database['public']['Tables']['repuestos_compras']['ComputedFields']
          >
          p_extra: Json
        }
        Returns: Json
      }
      _repuesto_compra_tc_vigente: { Args: { p_moneda: string }; Returns: string }
      _repuesto_cotizacion_linea: {
        Args: {
          p_bloque: string
          p_caja: number
          p_cantidad: number
          p_costo: number
          p_logistica: number
          p_snapshot: Json
        }
        Returns: Json
      }
      _repuesto_cotizacion_linea_de: {
        Args: { p_cotizacion: string; p_linea: Json; p_orden: number; p_snapshot: Json }
        Returns: {
          bloque: string
          caja: number | null
          caja_sugerida: number | null
          cantidad: number
          condicion_id: string | null
          costo: number | null
          cotizacion_id: string
          descripcion: string
          id: string
          item_id: string | null
          logistica: number | null
          logistica_sugerida: number | null
          orden: number
          tipo_pieza_id: string | null
          total: number | null
        }
        SetofOptions: {
          from: '*'
          to: 'repuestos_cotizaciones_lineas'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _repuesto_cotizacion_monto: { Args: { p_clave: string; p_linea: Json }; Returns: number }
      _repuesto_cotizacion_para_cambiar: {
        Args: { p_esperado: string; p_id: string }
        Returns: {
          aceptada_en: string | null
          actualizado_en: string
          config_snapshot: NonNullable<Json>
          creado_en: string
          creado_por: string | null
          estado: Database['public']['Enums']['estado_cotizacion_repuestos']
          id: string
          moneda: string
          notas: string | null
          numero: number
          proyecto_id: string
          total: number | null
        }
        SetofOptions: {
          from: '*'
          to: 'repuestos_cotizaciones'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _repuesto_cotizacion_proyecto: { Args: { p_proyecto: string }; Returns: undefined }
      _repuesto_cotizacion_respuesta: {
        Args: {
          c: Omit<
            Database['public']['Tables']['repuestos_cotizaciones']['Row'],
            Database['public']['Tables']['repuestos_cotizaciones']['ComputedFields']
          >
          p_ya_existia: boolean
        }
        Returns: Json
      }
      _repuesto_cotizacion_sugerida: {
        Args: { p_costo: number; p_snapshot: Json }
        Returns: number
      }
      _repuesto_fase_de_entrada: { Args: { p_item: string }; Returns: string }
      _repuesto_proyecto_tomar: {
        Args: { p_esperado: string; p_proyecto: string }
        Returns: {
          actualizado_en: string
          cerrado_en: string | null
          cliente_nombre: string | null
          cliente_telefono: string | null
          creado_en: string
          creado_por: string | null
          eliminado_en: string | null
          id: string
          lead_id: string | null
          notas: string | null
          numero: number
          vehiculo_etiqueta: string | null
          vehiculo_id: string | null
          vin: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'repuestos_proyectos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _repuesto_stock_aplicar: {
        Args: {
          p_con_signo: number
          p_item: Omit<
            Database['public']['Tables']['repuestos_items']['Row'],
            Database['public']['Tables']['repuestos_items']['ComputedFields']
          >
          p_motivo: string
          p_nota: string
        }
        Returns: Json
      }
      _repuesto_stock_item: {
        Args: { p_item: string }
        Returns: {
          actualizado_en: string
          cantidad: number
          condicion_id: string | null
          creado_en: string
          creado_por: string | null
          descripcion: string
          eliminado_en: string | null
          en_stock_desde: string | null
          fase_desde: string | null
          fase_id: string | null
          id: string
          modo_transporte_id: string | null
          moneda: string | null
          notas: string | null
          pais_origen_id: string | null
          precio_cliente: number | null
          proyecto_id: string
          stock_cantidad: number
          tipo_pieza_id: string | null
          tracking: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'repuestos_items'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _requisito_aplicar: {
        Args: {
          p_datos: Json
          p_fila: Omit<
            Database['public']['Tables']['fases_requisitos']['Row'],
            Database['public']['Tables']['fases_requisitos']['ComputedFields']
          >
        }
        Returns: {
          bloqueante: boolean
          clave_dato: string | null
          config: NonNullable<Json>
          espera_ambito: Database['public']['Enums']['ambito_espera'] | null
          espera_fase_id: string | null
          fase_id: string
          formatos: string[] | null
          id: string
          max_archivos: number | null
          min_archivos: number | null
          notas: string | null
          orden: number
          tipo: Database['public']['Enums']['tipo_requisito']
          tipo_documento_id: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'fases_requisitos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _requisito_dato_cumplido: {
        Args: { p_clave: string; p_config: Json; p_repuesto: string; p_vehiculo: string }
        Returns: boolean
      }
      _requisito_forma: {
        Args: {
          p_crear: boolean
          p_datos: Json
          p_tipo: Database['public']['Enums']['tipo_requisito']
        }
        Returns: undefined
      }
      _requisito_validar: {
        Args: {
          p_claves: string[]
          p_fila: Omit<
            Database['public']['Tables']['fases_requisitos']['Row'],
            Database['public']['Tables']['fases_requisitos']['ComputedFields']
          >
        }
        Returns: undefined
      }
      _revision_etiquetas: { Args: { p_def: Json; p_filas: Json }; Returns: Json }
      _rol_para_editar: { Args: { p_esperado: string; p_rol: string }; Returns: undefined }
      _rol_tocar: { Args: { p_rol: string }; Returns: string }
      _roles_de_lista: { Args: { p_roles: string[] }; Returns: string[] }
      _seguimiento_conflicto: { Args: { p_cuando: string }; Returns: undefined }
      _seguimiento_detalle: { Args: { p_doc: Json }; Returns: string }
      _seguimiento_fecha: { Args: { p_valor: Json }; Returns: string }
      _seguimiento_href_valido: { Args: { p_href: string }; Returns: boolean }
      _seguimiento_json: {
        Args: {
          s: Omit<
            Database['public']['Tables']['seguimientos']['Row'],
            Database['public']['Tables']['seguimientos']['ComputedFields']
          >
        }
        Returns: Json
      }
      _seguimiento_marcas: { Args: { p_marcas: Json }; Returns: undefined }
      _seguimiento_mio: {
        Args: { p_id: string }
        Returns: {
          actualizado_en: string
          creado_en: string
          detalle_doc: Json | null
          detalle_texto: string | null
          eliminado_en: string | null
          id: string
          lead_id: string
          ocurrido_en: string
          tipo_id: string
          titulo: string
          usuario_id: string
          vehiculo_id: string | null
          visibilidad: Database['public']['Enums']['visibilidad_seguimiento']
        }
        SetofOptions: {
          from: '*'
          to: 'seguimientos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _seguimiento_nodo: {
        Args: { p_nodo: Json; p_padre: string; p_profundidad: number }
        Returns: string
      }
      _seguimiento_titulo: { Args: { p_hint: string; p_valor: Json }; Returns: string }
      _seguimiento_visibilidad: {
        Args: { p_valor: Json }
        Returns: Database['public']['Enums']['visibilidad_seguimiento']
      }
      _sin_tildes: { Args: { p_texto: string }; Returns: string }
      _tabla_referencia_filas_validas: {
        Args: { p_columnas: Json; p_filas: Json }
        Returns: undefined
      }
      _tabla_referencia_publicada_por: { Args: { p_tabla: string }; Returns: string }
      _tabla_referencia_usada_en: {
        Args: { p_origen?: string; p_tabla: string }
        Returns: {
          formula_id: string
          origen_id: string
        }[]
      }
      _tablero_conversion_desde: { Args: Record<PropertyKey, never>; Returns: string }
      _tablero_ventana: {
        Args: { p_desde: string; p_hasta: string }
        Returns: {
          fin: string
          ini: string
          zona: string
        }[]
      }
      _tarjeta_grupos: { Args: { p_def: Json; p_plantilla: Json; p_tonos: Json }; Returns: Json }
      _tarjeta_json: {
        Args: {
          o: Omit<
            Database['public']['Tables']['oportunidades']['Row'],
            Database['public']['Tables']['oportunidades']['ComputedFields']
          >
          p_lead: Json
          p_vehiculo: Json
        }
        Returns: Json
      }
      _tarjeta_tipos_de_cambio: {
        Args: { p_buckets: string[]; p_def: Json; p_diseno: Json }
        Returns: Json
      }
      _telefono_o_nulo: { Args: { p_cc: string; p_tel: string }; Returns: string }
      _tipo_documento_de_jsonb: {
        Args: {
          p_al_crear: boolean
          p_base: Omit<
            Database['public']['Tables']['tipos_documento']['Row'],
            Database['public']['Tables']['tipos_documento']['ComputedFields']
          >
          p_datos: Json
        }
        Returns: {
          activo: boolean
          actualizado_en: string
          aviso_dias: number | null
          creado_en: string
          descripcion: string | null
          flujo_id: string | null
          formatos: string[]
          id: string
          modo_vencimiento: Database['public']['Enums']['modo_vencimiento']
          nombre: string
          orden: number
          proposito: string | null
          vigencia_dias: number | null
          visible_portal_permitido: boolean
        }
        SetofOptions: {
          from: '*'
          to: 'tipos_documento'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _tipo_documento_dias: {
        Args: { p_campo: string; p_mensaje: string; p_valor: Json }
        Returns: number
      }
      _tipo_documento_exigir_permiso: { Args: { p_flujo: string }; Returns: undefined }
      _tipo_documento_nombre_libre: {
        Args: { p_activo: boolean; p_flujo: string; p_id: string; p_nombre: string }
        Returns: undefined
      }
      _tipo_documento_uso: { Args: { p_id: string }; Returns: Record<string, unknown> }
      _tipo_documento_validar: {
        Args: {
          p_tipo: Omit<
            Database['public']['Tables']['tipos_documento']['Row'],
            Database['public']['Tables']['tipos_documento']['ComputedFields']
          >
          p_validos: string[]
        }
        Returns: {
          activo: boolean
          actualizado_en: string
          aviso_dias: number | null
          creado_en: string
          descripcion: string | null
          flujo_id: string | null
          formatos: string[]
          id: string
          modo_vencimiento: Database['public']['Enums']['modo_vencimiento']
          nombre: string
          orden: number
          proposito: string | null
          vigencia_dias: number | null
          visible_portal_permitido: boolean
        }
        SetofOptions: {
          from: '*'
          to: 'tipos_documento'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _tipo_lead_clave: { Args: { p_nombre: string }; Returns: string }
      _tipo_lead_exigir_activo: { Args: { p_id: string }; Returns: undefined }
      _tipo_lead_nombre: { Args: { p_texto: string }; Returns: string }
      _tipo_lead_por_defecto: { Args: Record<PropertyKey, never>; Returns: string }
      _tipo_seguimiento_clave: { Args: { p_nombre: string }; Returns: string }
      _tipo_seguimiento_nombre: { Args: { p_texto: string }; Returns: string }
      _tipos_documento_formatos: { Args: Record<PropertyKey, never>; Returns: string[] }
      _tipos_documento_tope: { Args: Record<PropertyKey, never>; Returns: number }
      _tipos_lead_lista: { Args: Record<PropertyKey, never>; Returns: Json }
      _tipos_lead_tope: { Args: Record<PropertyKey, never>; Returns: number }
      _tipos_seguimiento_lista: { Args: Record<PropertyKey, never>; Returns: Json }
      _tipos_seguimiento_tope: { Args: Record<PropertyKey, never>; Returns: number }
      _tono_clave: { Args: { p_nombre: string }; Returns: string }
      _tono_colores: { Args: { p_colores: Json }; Returns: Json }
      _tono_en_uso: { Args: { p_clave: string }; Returns: string }
      _tono_nombre: { Args: { p_texto: string }; Returns: string }
      _tonos_de_grupos: { Args: { p_def: Json }; Returns: Json }
      _tonos_lista: { Args: Record<PropertyKey, never>; Returns: Json }
      _tonos_tope: { Args: Record<PropertyKey, never>; Returns: number }
      _transicion_accion: { Args: { p_accion: string }; Returns: string }
      _transicion_unico: {
        Args: { p_a: string; p_de: string; p_restriccion: string }
        Returns: undefined
      }
      _transporte_cambios: {
        Args: {
          o: Omit<
            Database['public']['Tables']['transportes']['Row'],
            Database['public']['Tables']['transportes']['ComputedFields']
          >
          p_cambios: Json
          p_claves: string[]
        }
        Returns: {
          actualizado_en: string
          actualizado_por: string | null
          arribo_el: string | null
          booking: string | null
          contenedor: string | null
          creado_en: string
          eta_el: string | null
          id: string
          naviera_id: string | null
          notas: string | null
          puerto_destino_id: string | null
          puerto_origen_id: string | null
          repuesto_id: string | null
          sigue_al_vehiculo: boolean
          vehiculo_id: string | null
          zarpe_el: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'transportes'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _transporte_clave: { Args: { p_clave: string; p_tipo: string }; Returns: string }
      _transporte_grupo_bloquear: {
        Args: { p_repuestos: string[]; p_vehiculos: string[] }
        Returns: undefined
      }
      _transporte_grupos_filtros: { Args: { p_filtros: Json }; Returns: Record<string, unknown> }
      _transporte_unidad: {
        Args: { p_bloquear: boolean; p_repuesto: string; p_vehiculo: string }
        Returns: Record<string, unknown>
      }
      _transporte_validar: {
        Args: {
          n: Omit<
            Database['public']['Tables']['transportes']['Row'],
            Database['public']['Tables']['transportes']['ComputedFields']
          >
          o: Omit<
            Database['public']['Tables']['transportes']['Row'],
            Database['public']['Tables']['transportes']['ComputedFields']
          >
          p_fase: string
          p_flujo: string
          p_titulo: string
        }
        Returns: undefined
      }
      _unidad_sin_acceso: { Args: { p_vehiculo: string }; Returns: string }
      _url_del_proyecto: { Args: Record<PropertyKey, never>; Returns: string }
      _uuid_de: { Args: { p_hint: string; p_valor: Json }; Returns: string }
      _valor_fuera_de_rango: {
        Args: { p_maximo: number; p_minimo: number; p_valor: Json }
        Returns: boolean
      }
      _vehiculo_a_lote: {
        Args: {
          p_lote: string
          v: Omit<
            Database['public']['Tables']['vehiculos']['Row'],
            Database['public']['Tables']['vehiculos']['ComputedFields']
          >
        }
        Returns: Json
      }
      _vehiculo_a_papelera: {
        Args: { p_esperado: string; p_lote: string; p_vehiculo: string }
        Returns: Json
      }
      _vehiculo_apibara_valido: { Args: { p_raw: Json }; Returns: undefined }
      _vehiculo_aplicar: {
        Args: {
          p_datos: Json
          v: Omit<
            Database['public']['Tables']['vehiculos']['Row'],
            Database['public']['Tables']['vehiculos']['ComputedFields']
          >
        }
        Returns: {
          acepta_permuta: boolean | null
          actualizado_en: string
          anio: number | null
          apibara_raw: Json | null
          apibara_sync_en: string | null
          atributos: NonNullable<Json>
          categoria_id: string | null
          cierre_subasta_en: string | null
          cotizado_en: string | null
          creado_en: string
          creado_por: string | null
          destacado_web: boolean
          eliminado_en: string | null
          eliminado_por: string | null
          estado_subasta: Database['public']['Enums']['estado_subasta'] | null
          fase_desde: string | null
          fase_id: string | null
          id: string
          importado_apibara: boolean
          kilometraje: number | null
          lead_id: string | null
          lote: string | null
          lote_papelera_id: string | null
          marca: string | null
          modelo: string | null
          numero: number
          origen_id: string
          placado: boolean | null
          plataforma: string | null
          precio: number | null
          precio_negociable: boolean | null
          precio_web: number | null
          precio_web_hasta: number | null
          precio_web_nota: string | null
          publicado_web: boolean
          subasta_en: string | null
          subasta_fin_en: string | null
          subasta_zona: string | null
          titulo: string
          url_origen: string | null
          vin: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'vehiculos'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      _vehiculo_de_nota_json: { Args: { p_es_mio: boolean; p_vehiculo: string }; Returns: Json }
      _vehiculo_fase_de_entrada: { Args: { p_origen: string; p_vehiculo: string }; Returns: string }
      _vehiculo_motivo_de_bloqueo: {
        Args: {
          p_al_enviar: boolean
          v: Omit<
            Database['public']['Tables']['vehiculos']['Row'],
            Database['public']['Tables']['vehiculos']['ComputedFields']
          >
        }
        Returns: string
      }
      _vehiculo_numero: {
        Args: {
          p_clave: string
          p_datos: Json
          p_entero: boolean
          p_maximo: number
          p_minimo: number
          p_nombre: string
        }
        Returns: number
      }
      _vehiculo_para_nota: { Args: { p_hint?: string; p_vehiculo: string }; Returns: string }
      _vehiculo_resumen: {
        Args: {
          v: Omit<
            Database['public']['Tables']['vehiculos']['Row'],
            Database['public']['Tables']['vehiculos']['ComputedFields']
          >
        }
        Returns: Json
      }
      _vehiculo_si_no: {
        Args: { p_clave: string; p_datos: Json; p_nombre: string }
        Returns: boolean
      }
      _vehiculo_sin_repetidos: {
        Args: {
          v: Omit<
            Database['public']['Tables']['vehiculos']['Row'],
            Database['public']['Tables']['vehiculos']['ComputedFields']
          >
        }
        Returns: undefined
      }
      _vehiculo_subasta_desde: { Args: { p_raw: Json }; Returns: Json }
      _vehiculo_texto: {
        Args: { p_clave: string; p_datos: Json; p_largo: number; p_nombre: string }
        Returns: string
      }
      _vehiculos_cotizado_rellenar: { Args: Record<PropertyKey, never>; Returns: number }
      _vehiculos_inventario_condicion: {
        Args: { p_columna: string; p_i: number; p_tipo: string }
        Returns: string
      }
      _vehiculos_inventario_patron: { Args: { p_i: number }; Returns: string }
      _vehiculos_inventario_sql: {
        Args: { p_filtros: Json; p_rutas: string; p_sentido: string }
        Returns: string
      }
      _vehiculos_inventario_validar: { Args: { p_filtros: Json }; Returns: undefined }
      _vehiculos_papelera_lote_json: {
        Args: {
          p_dias: number
          p_lote: Omit<
            Database['public']['Tables']['lotes_papelera']['Row'],
            Database['public']['Tables']['lotes_papelera']['ComputedFields']
          >
          p_primeros: number
          p_yo: string
        }
        Returns: Json
      }
      _version_publicada_por: { Args: { p_formula: string }; Returns: string }
      _web_ajustes_objeto: {
        Args: { p_actual: Json; p_clave: string; p_valor: Json }
        Returns: Json
      }
      _web_ajustes_valor: { Args: { p_clave: string; p_valor: Json }; Returns: Json }
      _web_doc_html: { Args: { p_doc: Json }; Returns: string }
      _web_doc_imagen: { Args: { p_nodo: Json }; Returns: string }
      _web_doc_marcas: { Args: { p_html: string; p_marcas: Json }; Returns: string }
      _web_doc_minutos: { Args: { p_doc: Json }; Returns: number }
      _web_doc_nodo: {
        Args: { p_nodo: Json; p_padre: string; p_profundidad: number }
        Returns: string
      }
      _web_doc_ruta_valida: { Args: { p_ruta: string }; Returns: boolean }
      _web_html_escapar: { Args: { p_texto: string }; Returns: string }
      _web_legales_validar: { Args: { p_anterior: Json; p_legales: Json }; Returns: Json }
      actividad_purgar: { Args: Record<PropertyKey, never>; Returns: number }
      agenda_quienes_reciben: { Args: { p_conversacion?: string; p_texto: string }; Returns: Json }
      agenda_rango: {
        Args: { p_de_todos?: boolean; p_desde: string; p_hasta: string }
        Returns: Json
      }
      agenda_tareas_sin_fecha: {
        Args: { p_antes_en?: string; p_antes_id?: string; p_tamano?: number }
        Returns: Json
      }
      ajustes_leads_leer: { Args: Record<PropertyKey, never>; Returns: Json }
      alcance_de: {
        Args: { p_clave: string; p_origen?: string }
        Returns: Database['public']['Enums']['alcance_permiso']
      }
      alertas_demora: { Args: Record<PropertyKey, never>; Returns: number }
      apibara_consulta_guardar: {
        Args: { p_origen: string; p_raw: Json; p_usuario: string }
        Returns: string
      }
      apibara_consulta_leer: { Args: { p_consulta: string }; Returns: Json }
      apibara_consultas_purgar: { Args: Record<PropertyKey, never>; Returns: number }
      apibara_contexto: { Args: { p_origen: string }; Returns: Json }
      assert_activo: { Args: Record<PropertyKey, never>; Returns: undefined }
      assert_permiso: { Args: { p_clave: string; p_origen?: string }; Returns: undefined }
      atributos_lead: { Args: { p_lead: string }; Returns: Json }
      avatar_miniatura_fallo: {
        Args: { p_avatar_ruta: string; p_usuario: string }
        Returns: boolean
      }
      avatar_miniatura_guardar: {
        Args: { p_avatar_ruta: string; p_miniatura: string; p_usuario: string }
        Returns: boolean
      }
      avatares_miniaturas_correr: { Args: Record<PropertyKey, never>; Returns: number }
      avatares_miniaturas_disparar: { Args: { p_url: string }; Returns: number }
      avatares_miniaturas_pendientes: {
        Args: { p_max: number }
        Returns: {
          avatar_ruta: string
          usuario_id: string
        }[]
      }
      avatares_miniaturas_programar: { Args: { p_url: string }; Returns: undefined }
      buscador_cotizaciones: {
        Args: { p_tamano: number; p_texto: string }
        Returns: {
          clase: Database['public']['Enums']['clase_cotizacion']
          creado_en: string
          estado: Database['public']['Enums']['estado_cotizacion']
          id: string
          numero: number
          origen_id: string
          titulo: string
        }[]
      }
      buscador_leads: { Args: { p_tamano: number; p_texto: string }; Returns: string[] }
      buscador_vehiculos: {
        Args: { p_tamano: number; p_texto: string }
        Returns: {
          creado_en: string
          id: string
          lote: string
          origen_id: string
          titulo: string
          vin: string
        }[]
      }
      cambiar_fase: {
        Args: {
          p_fase_destino: string
          p_fase_esperada?: string
          p_nota?: string
          p_repuesto: string
          p_vehiculo: string
        }
        Returns: number
      }
      cambiar_fase_lote: {
        Args: { p_fase_destino: string; p_nota?: string; p_unidades: Json }
        Returns: Json
      }
      cambiar_telefono_lead: {
        Args: { p_actualizado_en_esperado: string; p_cc: string; p_lead: string; p_tel: string }
        Returns: Json
      }
      categoria_crear: {
        Args: { p_nombre: string; p_origen: string; p_padre?: string }
        Returns: Json
      }
      categoria_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_categoria: string }
        Returns: undefined
      }
      categoria_guardar: {
        Args: {
          p_activa?: boolean
          p_actualizado_en_esperado: string
          p_categoria: string
          p_nombre?: string
        }
        Returns: string
      }
      categoria_mover: {
        Args: { p_actualizado_en_esperado: string; p_categoria: string; p_despues_de?: string }
        Returns: string
      }
      categorias_con_uso: {
        Args: { p_origen: string }
        Returns: {
          categoria_id: string
          vehiculos: number
        }[]
      }
      chat_conversaciones: {
        Args: { p_antes_en?: string; p_antes_id?: string; p_tamano?: number }
        Returns: Json
      }
      chat_directa: { Args: { p_usuario: string }; Returns: Json }
      chat_global_entrar: { Args: Record<PropertyKey, never>; Returns: Json }
      chat_grupo_crear: {
        Args: { p_id: string; p_miembros: string[]; p_nombre: string }
        Returns: Json
      }
      chat_grupo_miembros: {
        Args: { p_agregar: string[]; p_conversacion: string; p_quitar: string[] }
        Returns: Json
      }
      chat_leer: { Args: { p_conversacion: string; p_hasta: string }; Returns: Json }
      chat_no_leidos: { Args: Record<PropertyKey, never>; Returns: number }
      chat_salir: { Args: { p_conversacion: string }; Returns: Json }
      chat_silenciar: { Args: { p_conversacion: string; p_silenciada: boolean }; Returns: Json }
      claves_dato_requisito: {
        Args: { p_ambito: Database['public']['Enums']['ambito_flujo'] }
        Returns: string[]
      }
      codigo_dictable: { Args: { p_largo?: number }; Returns: string }
      cola_web_configurar: {
        Args: {
          p_habilitado: boolean
          p_max_abiertas?: number
          p_orden?: number
          p_prioridad?: number
          p_usuario: string
        }
        Returns: undefined
      }
      cola_web_solicitudes: {
        Args: {
          p_cursor_creado?: string
          p_cursor_id?: string
          p_estado: Database['public']['Enums']['estado_solicitud_web']
          p_tamano?: number
        }
        Returns: Json
      }
      cola_web_tablero: { Args: { p_tope?: number }; Returns: Json }
      comprobante_anular: { Args: { p_comprobante: string; p_motivo: string }; Returns: Json }
      comprobante_emitir: {
        Args: { p_cotizacion: string; p_cotizacion_esperada: string }
        Returns: Json
      }
      comprobante_puede: { Args: { p_accion: string; p_nombre: string }; Returns: boolean }
      comprobantes_serie_cambiar: {
        Args: { p_actualizado_en_esperado: string; p_serie: string }
        Returns: Json
      }
      concesion_dominada: {
        Args: {
          p_alcance: Database['public']['Enums']['alcance_permiso']
          p_clave: string
          p_origen: string
        }
        Returns: boolean
      }
      cotizacion_adjuntar: {
        Args: {
          p_bytes: number
          p_cotizacion: string
          p_mime: string
          p_nombre: string
          p_ruta: string
        }
        Returns: Json
      }
      cotizacion_adjunto_quitar: { Args: { p_adjunto: string }; Returns: Json }
      cotizacion_comentar: {
        Args: { p_cotizacion: string; p_cuerpo: string; p_padre: string }
        Returns: Json
      }
      cotizacion_comentario_borrar: {
        Args: { p_actualizado_en_esperado: string; p_comentario: string }
        Returns: Json
      }
      cotizacion_comentario_editar: {
        Args: { p_actualizado_en_esperado: string; p_comentario: string; p_cuerpo: string }
        Returns: Json
      }
      cotizacion_comentario_respuestas: {
        Args: {
          p_comentario: string
          p_despues_en?: string
          p_despues_id?: string
          p_tope?: number
        }
        Returns: Json
      }
      cotizacion_comentarios: {
        Args: {
          p_antes_en?: string
          p_antes_id?: string
          p_cotizacion: string
          p_primeros?: number
          p_tope?: number
        }
        Returns: Json
      }
      cotizacion_crear: {
        Args: {
          p_abierta: string
          p_clase?: Database['public']['Enums']['clase_cotizacion']
          p_con_la_abierta?: boolean
          p_entradas: Json
          p_id: string
          p_lead: string
          p_modo_tc?: string
          p_origen: string
          p_vehiculo?: string
          p_vehiculo_nuevo?: Json
          p_ver_total_bs?: boolean
        }
        Returns: Json
      }
      cotizacion_encima: { Args: { p_anterior: string; p_id: string }; Returns: Json }
      cotizacion_evaluar: {
        Args: {
          p_abierta?: string
          p_cotizacion?: string
          p_entradas: Json
          p_modo?: Json
          p_modo_tc?: string
          p_origen?: string
          p_vehiculo?: string
        }
        Returns: Json
      }
      cotizacion_favorito_poner: { Args: { p_cotizacion: string; p_valor: boolean }; Returns: Json }
      cotizacion_guardar: {
        Args: {
          p_actualizado_en_esperado: string
          p_entradas: Json
          p_id: string
          p_intento: string
          p_modo_tc: string
          p_notas: string
          p_titulo: string
          p_vehiculo: string
          p_ver_total_bs: boolean
        }
        Returns: Json
      }
      cotizacion_hoja: { Args: { p_origen: string }; Returns: Json }
      cotizacion_hoja_guardada: { Args: { p_id: string }; Returns: Json }
      cotizacion_leer: { Args: { p_id: string }; Returns: Json }
      cotizacion_marcar_final: { Args: { p_cotizacion: string }; Returns: undefined }
      cotizacion_moderar: {
        Args: {
          p_actualizado_en_esperado: string
          p_cotizacion: string
          p_estado: Database['public']['Enums']['estado_cotizacion']
        }
        Returns: Json
      }
      cotizacion_puede_adjuntar: { Args: { p_cot: string }; Returns: boolean }
      cotizacion_reportar: { Args: { p_cotizacion: string; p_motivo: string }; Returns: Json }
      cotizacion_reporte_retirar: { Args: { p_cotizacion: string }; Returns: Json }
      cotizacion_revisiones: {
        Args: { p_antes?: number; p_cotizacion: string; p_hasta?: string; p_tamano?: number }
        Returns: Json
      }
      cotizacion_tabla: {
        Args: { p_abierta?: string; p_cotizacion?: string; p_origen?: string; p_tabla: string }
        Returns: Json
      }
      cotizacion_tarjeta: { Args: { p_formula: string }; Returns: Json }
      cotizaciones_listado: {
        Args: {
          p_clase?: Database['public']['Enums']['clase_cotizacion']
          p_cursor_en?: string
          p_cursor_id?: string
          p_hacia_atras?: boolean
          p_lead?: string
          p_mias?: boolean
          p_origen?: string
          p_tamano: number
          p_vehiculo?: string
        }
        Returns: {
          clase: Database['public']['Enums']['clase_cotizacion']
          creado_en: string
          creado_por: string
          estado: Database['public']['Enums']['estado_cotizacion']
          id: string
          lead_id: string
          moneda_mostrar: string
          numero: number
          origen_id: string
          titulo: string
          total_base: number
          vehiculo_id: string
          vence_el: string
          vencida: boolean
        }[]
      }
      cotizaciones_papelera_enviar: { Args: { p_cotizaciones: Json }; Returns: Json }
      cotizaciones_papelera_listar: {
        Args: {
          p_antes_en?: string
          p_antes_id?: string
          p_hacia_atras?: boolean
          p_primeros?: number
          p_tope?: number
        }
        Returns: Json
      }
      cotizaciones_papelera_lote: { Args: { p_lote: string }; Returns: Json }
      cotizaciones_papelera_purgar: {
        Args: { p_actualizado_en_esperado: string; p_cotizaciones?: string[]; p_lote: string }
        Returns: Json
      }
      cotizaciones_papelera_restaurar: {
        Args: { p_actualizado_en_esperado: string; p_cotizaciones?: string[]; p_lote: string }
        Returns: Json
      }
      crear_lead: {
        Args: { p_id: string; p_lead: Json; p_recordatorio?: Json; p_seguimiento?: Json }
        Returns: Json
      }
      declaracion_canal: {
        Args: { p_actualizado_en_esperado: string; p_canal: string; p_id: string }
        Returns: Json
      }
      declaracion_guardar: {
        Args: { p_actualizado_en_esperado: string; p_datos: Json; p_id: string }
        Returns: Json
      }
      declaracion_leer: { Args: { p_id: string }; Returns: Json }
      declaracion_vehiculos_poner: {
        Args: {
          p_actualizado_en_esperado: string
          p_agregar: string[]
          p_declaracion: string
          p_quitar: string[]
        }
        Returns: Json
      }
      declaraciones_listar: {
        Args: { p_desde: string; p_filtros: Json; p_id: string; p_tope: number }
        Returns: {
          aceptada_el: string
          actualizado_en: string
          canal: string
          creado_en: string
          deposito: string
          despachante: string
          faltan: number
          hay_ocultos: boolean
          id: string
          numero: string
          pagada: boolean
          vehiculos: number
          vence_tributos_el: string
        }[]
      }
      documento_editar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_id: string }
        Returns: Json
      }
      documento_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      documento_registrar: {
        Args: {
          p_bytes: number
          p_emitido_el: string
          p_id: string
          p_mime: string
          p_nombre: string
          p_nota: string
          p_repuesto: string
          p_ruta: string
          p_tipo: string
          p_vehiculos: string[]
          p_vence_el: string
        }
        Returns: Json
      }
      documento_revisar: {
        Args: {
          p_actualizado_en_esperado: string
          p_estado: Database['public']['Enums']['estado_documento']
          p_id: string
          p_motivo: string
        }
        Returns: Json
      }
      documentos_vencimientos: { Args: Record<PropertyKey, never>; Returns: number }
      embudo_crear: { Args: { p_id: string; p_nombre: string }; Returns: Json }
      embudo_eliminar: { Args: { p_actualizado_en_esperado: string; p_id: string }; Returns: Json }
      embudo_etapa_pagina: {
        Args: {
          p_antes_en: string
          p_antes_id: string
          p_buscar?: string
          p_etapa: string
          p_tope?: number
        }
        Returns: Json
      }
      embudo_etapas_guardar: {
        Args: { p_actualizado_en_esperado: string; p_embudo: string; p_etapas: Json }
        Returns: Json
      }
      embudo_guardar: {
        Args: { p_actualizado_en_esperado: string; p_id: string; p_nombre: string }
        Returns: Json
      }
      embudo_plantilla_guardar: {
        Args: { p_actualizado_en_esperado: string; p_etapas: Json }
        Returns: string
      }
      embudo_por_defecto: { Args: Record<PropertyKey, never>; Returns: Json }
      embudo_tablero: {
        Args: { p_buscar?: string; p_embudo: string; p_tope?: number; p_tope_total?: number }
        Returns: Json
      }
      empresa_con_datos_cargados: { Args: Record<PropertyKey, never>; Returns: boolean }
      empresa_guardar_ajustes: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json }
        Returns: string
      }
      empresa_guardar_ajustes_de_cotizacion: {
        Args: {
          p_actualizado_en_esperado: string
          p_vehiculo_obligatorio: boolean
          p_vigencia_dias: number
        }
        Returns: string
      }
      en_cartera: { Args: { p_lead: string }; Returns: boolean }
      enmascarar_telefono: { Args: { p: string }; Returns: string }
      equipo_aceptar_invitacion: { Args: Record<PropertyKey, never>; Returns: undefined }
      equipo_bajas_continuar: { Args: Record<PropertyKey, never>; Returns: Json }
      equipo_bloquear: {
        Args: { p_bloquear: boolean; p_motivo?: string; p_usuario: string }
        Returns: undefined
      }
      equipo_dar_de_baja: { Args: { p_usuario: string }; Returns: Json }
      equipo_lista: {
        Args: { p_estado?: string; p_limite?: number; p_texto?: string }
        Returns: string[]
      }
      equipo_vista_previa_baja: { Args: { p_usuario: string }; Returns: Json }
      es_miembro: { Args: { p_conversacion: string }; Returns: boolean }
      es_usuario_activo: { Args: Record<PropertyKey, never>; Returns: boolean }
      etiqueta_crear: { Args: { p_color?: string; p_id: string; p_nombre: string }; Returns: Json }
      etiqueta_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      etiqueta_guardar: {
        Args: {
          p_actualizado_en_esperado: string
          p_color?: string
          p_id: string
          p_nombre?: string
        }
        Returns: Json
      }
      evaluar_formula: {
        Args: { p_def: Json; p_entrada: Json; p_modo?: Json; p_params: Json }
        Returns: Json
      }
      evaluar_requisitos: {
        Args: { p_fase: string; p_repuesto: string; p_vehiculo: string }
        Returns: {
          bloqueante: boolean
          cumplido: boolean
          descripcion: string
          detalle: Json
          requisito_id: string
          tipo: Database['public']['Enums']['tipo_requisito']
        }[]
      }
      evento_crear: {
        Args: { p_datos: Json; p_destinatarios?: string[]; p_id: string }
        Returns: Json
      }
      evento_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_evento: string }
        Returns: Json
      }
      evento_guardar: {
        Args: {
          p_actualizado_en_esperado: string
          p_datos: Json
          p_destinatarios: string[]
          p_evento: string
        }
        Returns: Json
      }
      fase_crear: {
        Args: { p_actualizado_en_esperado: string; p_datos: Json; p_flujo: string; p_id: string }
        Returns: string
      }
      fase_eliminar: { Args: { p_actualizado_en_esperado: string; p_fase: string }; Returns: Json }
      fase_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_fase: string }
        Returns: string
      }
      fase_impacto: { Args: { p_fase: string }; Returns: Json }
      fase_mover: {
        Args: { p_actualizado_en_esperado: string; p_despues_de?: string; p_fase: string }
        Returns: string
      }
      fase_reactivar: {
        Args: { p_actualizado_en_esperado: string; p_fase: string }
        Returns: string
      }
      fase_roles_poner: {
        Args: { p_actualizado_en_esperado: string; p_fase: string; p_roles: string[] }
        Returns: string
      }
      flujo_de_fase: { Args: { p_fase: string }; Returns: string }
      flujo_fuera_de_regla: {
        Args: { p_flujo: string; p_tope?: number }
        Returns: {
          faltan: number
          fase_id: string
          repuesto_id: string
          vehiculo_id: string
        }[]
      }
      flujo_oferta: { Args: { p_flujo: string }; Returns: Json }
      flujo_oferta_guardar: {
        Args: {
          p_actualizado_en_esperado: string
          p_flujo: string
          p_navieras: string[]
          p_puertos_destino: string[]
          p_puertos_origen: string[]
        }
        Returns: string
      }
      flujo_regla_activa: { Args: { p_flujo: string; p_regla: string }; Returns: boolean }
      flujo_regla_cambiar: {
        Args: {
          p_activa: boolean
          p_actualizado_en_esperado: string
          p_flujo: string
          p_regla: string
        }
        Returns: string
      }
      flujo_regla_impacto: { Args: { p_flujo: string; p_regla: string }; Returns: Json }
      formula_cambiar_constante: {
        Args: { p_nodo: string; p_origen: string; p_publicada_esperada?: string; p_valor: number }
        Returns: string
      }
      formula_descartar_borrador: {
        Args: { p_actualizado_en_esperado?: string; p_origen: string }
        Returns: undefined
      }
      formula_guardar_borrador: {
        Args: {
          p_actualizado_en_esperado?: string
          p_def: Json
          p_diseno: Json
          p_nota?: string
          p_origen: string
          p_params: Json
          p_publicada_esperada?: string
        }
        Returns: Json
      }
      formula_para_cotizar: { Args: { p_origen: string }; Returns: Json }
      formula_publicar: {
        Args: {
          p_actualizado_en_esperado?: string
          p_nota: string
          p_origen: string
          p_publicada_esperada?: string
        }
        Returns: string
      }
      formula_revertir: {
        Args: { p_nota: string; p_origen: string; p_publicada_esperada: string; p_version: string }
        Returns: string
      }
      formula_tipo_cambio_del_nodo: { Args: { p_formula: string; p_nodo: string }; Returns: Json }
      gasto_eliminar: { Args: { p_actualizado_en_esperado: string; p_id: string }; Returns: Json }
      gasto_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_id: string }
        Returns: Json
      }
      gasto_registrar: {
        Args: {
          p_categoria: string
          p_comprobante_ruta: string
          p_fecha: string
          p_id: string
          p_moneda: string
          p_monto: number
          p_notas: string
          p_proveedor: string
          p_repuesto: string
          p_tipo_cambio: string
          p_vehiculo: string
        }
        Returns: Json
      }
      gastos_listar: {
        Args: { p_cursor_fecha: string; p_cursor_id: string; p_filtros: Json; p_tope: number }
        Returns: {
          actualizado_en: string
          categoria_id: string
          categoria_nombre: string
          comprobante_ruta: string
          fecha: string
          id: string
          lote_id: string
          moneda: string
          monto: number
          monto_base: number
          origen_id: string
          proveedor: string
          tipo_cambio_aplicado: number
          vehiculo_id: string
          vehiculo_titulo: string
        }[]
      }
      gastos_prorratear: {
        Args: {
          p_categoria: string
          p_comprobante_ruta: string
          p_fecha: string
          p_lote: string
          p_moneda: string
          p_monto: number
          p_notas: string
          p_proveedor: string
          p_tipo_cambio: string
          p_vehiculos: string[]
        }
        Returns: Json
      }
      importaciones_vinculos_purgar: { Args: Record<PropertyKey, never>; Returns: number }
      integracion_guardar: {
        Args: {
          p_activa?: boolean
          p_actualizado_en_esperado: string
          p_clave: string
          p_config?: Json
        }
        Returns: string
      }
      integracion_guardar_secreto: {
        Args: { p_actualizado_en_esperado: string; p_clave: string; p_secreto: string }
        Returns: string
      }
      integracion_secreto: { Args: { p_clave: string }; Returns: string }
      lead_alta_contexto: { Args: Record<PropertyKey, never>; Returns: Json }
      lead_campo_crear: {
        Args: {
          p_clave: string
          p_en_tabla?: boolean
          p_etiqueta: string
          p_filtrable?: boolean
          p_grupo?: string
          p_maximo?: number
          p_minimo?: number
          p_opciones?: Json
          p_requerido?: boolean
          p_solo_cartera?: boolean
          p_tipo: Database['public']['Enums']['tipo_campo']
          p_valor_defecto?: Json
          p_valor_defecto_empresa?: string
        }
        Returns: Json
      }
      lead_campo_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_campo: string }
        Returns: undefined
      }
      lead_campo_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_campo: string }
        Returns: string
      }
      lead_campo_impacto: { Args: { p_cambios?: Json; p_campo: string }; Returns: Json }
      lead_campo_mover: {
        Args: { p_actualizado_en_esperado: string; p_campo: string; p_despues_de?: string }
        Returns: string
      }
      lead_cartera: { Args: { p_lead: string }; Returns: Json }
      lead_cartera_candidatos: { Args: { p_lead: string }; Returns: Json }
      lead_compartir: { Args: { p_lead: string; p_usuario: string }; Returns: Json }
      lead_en_limbo: { Args: { p_lead: string }; Returns: boolean }
      lead_etiquetas_poner: {
        Args: { p_etiquetas: string[]; p_lead: string; p_valor: boolean }
        Returns: Json
      }
      lead_favorito_poner: { Args: { p_lead: string; p_valor: boolean }; Returns: Json }
      lead_ficha: { Args: { p_lead: string }; Returns: Json }
      lead_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_lead: string }
        Returns: Json
      }
      lead_oportunidades: {
        Args: {
          p_antes_abierta?: boolean
          p_antes_en?: string
          p_antes_id?: string
          p_lead: string
          p_tamano?: number
        }
        Returns: Json
      }
      lead_recordatorios: {
        Args: {
          p_completados?: boolean
          p_desde_en?: string
          p_desde_id?: string
          p_lead: string
          p_tamano?: number
        }
        Returns: Json
      }
      lead_revocar_acceso: { Args: { p_lead: string; p_usuario: string }; Returns: Json }
      lead_salir: { Args: { p_lead: string }; Returns: Json }
      lead_seguimiento: { Args: { p_id: string; p_lead: string }; Returns: Json }
      lead_seguimientos: {
        Args: { p_antes_en?: string; p_antes_id?: string; p_lead: string; p_tamano?: number }
        Returns: Json
      }
      lead_tachado_poner: { Args: { p_lead: string; p_valor: boolean }; Returns: Json }
      lead_telefono_guardar: {
        Args: {
          p_cc: string
          p_creado_en?: string
          p_etiqueta?: string
          p_id: string
          p_lead: string
          p_tel: string
        }
        Returns: Json
      }
      lead_telefono_quitar: { Args: { p_id: string; p_lead: string }; Returns: Json }
      lead_telefonos: {
        Args: { p_lead: string }
        Returns: {
          creado_en: string
          etiqueta: string
          id: string
          telefono: string
        }[]
      }
      lead_transferir: {
        Args: { p_destino: string; p_dueno_esperado: string; p_lead: string }
        Returns: Json
      }
      lead_vehiculos: { Args: { p_lead: string }; Returns: Json }
      leads_campos_privacidad_aplicar: { Args: Record<PropertyKey, never>; Returns: Json }
      leads_candidatos: { Args: { p_filtros: Json }; Returns: Json }
      leads_cartera_corta: { Args: Record<PropertyKey, never>; Returns: boolean }
      leads_catalogos: { Args: Record<PropertyKey, never>; Returns: Json }
      leads_exportacion_registrar: {
        Args: { p_filas: number; p_filtros?: string[] }
        Returns: Json
      }
      leads_ids_del_numero: { Args: { p_numero: number; p_todos: boolean }; Returns: string[] }
      leads_importacion_deshacer: { Args: { p_importacion: string }; Returns: Json }
      leads_importacion_terminar: {
        Args: {
          p_importacion: string
          p_origen?: string
          p_rechazadas: number
          p_ya_existian: number
        }
        Returns: Json
      }
      leads_importaciones_recientes: { Args: Record<PropertyKey, never>; Returns: Json }
      leads_importar_lote: {
        Args: { p_filas: Json; p_importacion: string; p_total: number }
        Returns: Json
      }
      leads_papelera_enviar: { Args: { p_leads: string[]; p_lote: string }; Returns: Json }
      leads_papelera_listar: {
        Args: {
          p_antes_en?: string
          p_antes_id?: string
          p_hacia_atras?: boolean
          p_primeros?: number
          p_tope?: number
        }
        Returns: Json
      }
      leads_papelera_lote: { Args: { p_lote: string }; Returns: Json }
      leads_papelera_purgar: {
        Args: { p_actualizado_en_esperado: string; p_leads?: string[]; p_lote: string }
        Returns: Json
      }
      leads_papelera_restaurar: {
        Args: { p_actualizado_en_esperado: string; p_leads?: string[]; p_lote: string }
        Returns: Json
      }
      leads_vista_por_ids: {
        Args: { p_leads: string[] }
        Returns: {
          actualizado_en: string | null
          atributos: Json | null
          atributos_publicos: Json | null
          creado_en: string | null
          creado_por: string | null
          dueno_id: string | null
          en_cartera: boolean | null
          es_favorito: boolean | null
          esta_tachado: boolean | null
          etiquetas: string[] | null
          id: string | null
          nombre: string | null
          numero: number | null
          numero_propio: number | null
          numero_propio_creador: string | null
          numero_propio_de: string | null
          numero_visible: number | null
          origen_lead_id: string | null
          reciente_en: string | null
          telefono_cc: string | null
          telefono_principal: string | null
          telefono_visible: boolean | null
          tipo_lead_id: string | null
          ultimo_seguimiento_en: string | null
        }[]
        SetofOptions: {
          from: '*'
          to: 'leads_vista'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      limpieza_automatica_correr: {
        Args: { p_ahora?: string; p_origenes?: string[] }
        Returns: Json
      }
      limpieza_avisar: { Args: { p_ahora?: string; p_origenes?: string[] }; Returns: Json }
      limpieza_el: {
        Args: {
          v: Omit<
            Database['public']['Tables']['vehiculos']['Row'],
            Database['public']['Tables']['vehiculos']['ComputedFields']
          >
        }
        Returns: string
      }
      limpieza_ultima: { Args: Record<PropertyKey, never>; Returns: Json }
      logistica_bandeja: { Args: { p_tope?: number }; Returns: Json }
      logistica_cadena: {
        Args: { p_filtros?: Json; p_origen: string; p_tope?: number }
        Returns: Json
      }
      logistica_cadena_columna: {
        Args: {
          p_desde?: string
          p_fase: string
          p_filtros?: Json
          p_id?: string
          p_origen: string
          p_tope?: number
        }
        Returns: Json
      }
      logistica_donde_esta: { Args: { p_buscar: string; p_tope?: number }; Returns: Json }
      logistica_unidad: { Args: { p_vehiculo: string }; Returns: Json }
      margen_vehiculo: { Args: { p_vehiculo: string }; Returns: Json }
      mensaje_editar: {
        Args: {
          p_actualizado_en_esperado: string
          p_cuerpo: string
          p_menciones?: Json
          p_mensaje: string
        }
        Returns: Json
      }
      mensaje_eliminar: { Args: { p_mensaje: string }; Returns: Json }
      mensaje_enviar: {
        Args: {
          p_conversacion: string
          p_cuerpo: string
          p_ficha?: Json
          p_id: string
          p_menciones?: Json
          p_responde_a?: string
        }
        Returns: Json
      }
      mensaje_evento_crear: {
        Args: { p_conversacion: string; p_datos: Json; p_destinatarios?: string[]; p_id: string }
        Returns: Json
      }
      mensaje_tarea_crear: {
        Args: { p_conversacion: string; p_datos: Json; p_id: string }
        Returns: Json
      }
      mi_sesion: { Args: { p_perspectiva?: string }; Returns: Json }
      mis_leads: { Args: Record<PropertyKey, never>; Returns: string[] }
      mis_permisos: {
        Args: Record<PropertyKey, never>
        Returns: {
          alcance: Database['public']['Enums']['alcance_permiso']
          clave: string
          origen_id: string
        }[]
      }
      moneda_crear: {
        Args: { p_codigo: string; p_decimales?: number; p_nombre: string; p_simbolo: string }
        Returns: string
      }
      moneda_guardar: {
        Args: {
          p_activa?: boolean
          p_actualizado_en_esperado: string
          p_codigo: string
          p_decimales?: number
          p_nombre?: string
          p_simbolo?: string
        }
        Returns: string
      }
      nivel_crear: { Args: { p_id: string; p_nombre: string }; Returns: Json }
      nivel_eliminar: { Args: { p_actualizado_en_esperado: string; p_id: string }; Returns: Json }
      nivel_renombrar: {
        Args: { p_actualizado_en_esperado: string; p_id: string; p_nombre: string }
        Returns: Json
      }
      nivel_restaurar: { Args: { p_actualizado_en_esperado: string; p_id: string }; Returns: Json }
      nivel_retirar: { Args: { p_actualizado_en_esperado: string; p_id: string }; Returns: Json }
      niveles_con_uso: { Args: Record<PropertyKey, never>; Returns: Json }
      normalizar_telefono: { Args: { p_cc: string; p_tel: string }; Returns: string }
      notificaciones_purgar: { Args: Record<PropertyKey, never>; Returns: Json }
      notificar: {
        Args: {
          p_accion?: boolean
          p_cuerpo: string
          p_ref_id: string
          p_ref_tipo: string
          p_ruta: string
          p_tipo: string
          p_titulo: string
          p_usuario: string
        }
        Returns: undefined
      }
      oportunidad_crear: { Args: { p_datos: Json; p_id: string; p_lead: string }; Returns: Json }
      oportunidad_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      oportunidad_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_id: string }
        Returns: Json
      }
      oportunidad_mover: {
        Args: { p_etapa: string; p_etapa_esperada: string; p_id: string; p_motivo_perdida?: string }
        Returns: Json
      }
      oportunidad_restaurar: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      origen_apibara_agregar: { Args: { p_origen: string; p_rutas: string[] }; Returns: number }
      origen_apibara_completar: { Args: { p_origen: string }; Returns: number }
      origen_apibara_rutas_sin_campo: {
        Args: { p_origen: string }
        Returns: {
          ejemplo: string
          ruta: string
          tipo: string
        }[]
      }
      origen_campo_crear: {
        Args: {
          p_clave: string
          p_clave_apibara?: string
          p_en_tarjeta?: boolean
          p_etiqueta: string
          p_filtrable?: boolean
          p_grupo?: string
          p_maximo?: number
          p_minimo?: number
          p_opciones?: Json
          p_origen: string
          p_principal?: boolean
          p_publico_web?: boolean
          p_requerido?: boolean
          p_tipo: Database['public']['Enums']['tipo_campo']
          p_valor_defecto?: Json
        }
        Returns: Json
      }
      origen_campo_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_campo: string }
        Returns: undefined
      }
      origen_campo_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_campo: string }
        Returns: string
      }
      origen_campo_impacto: { Args: { p_cambios?: Json; p_campo: string }; Returns: Json }
      origen_campo_mover: {
        Args: { p_actualizado_en_esperado: string; p_campo: string; p_despues_de?: string }
        Returns: string
      }
      origen_crear: {
        Args: {
          p_apibara_plataformas?: string[]
          p_clave: string
          p_color?: string
          p_genero: Database['public']['Enums']['genero_gramatical']
          p_nombre: string
          p_sustantivo: string
          p_tipo: Database['public']['Enums']['tipo_origen']
        }
        Returns: Json
      }
      origen_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_origen: string }
        Returns: undefined
      }
      origen_guardar: {
        Args: {
          p_activo?: boolean
          p_actualizado_en_esperado: string
          p_apibara_plataformas?: string[]
          p_color?: string
          p_genero?: Database['public']['Enums']['genero_gramatical']
          p_nombre?: string
          p_origen: string
          p_sustantivo?: string
        }
        Returns: string
      }
      origen_lead_crear: {
        Args: { p_icono?: string; p_id: string; p_nombre: string }
        Returns: Json
      }
      origen_lead_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      origen_lead_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_id: string }
        Returns: Json
      }
      origen_lead_mover: {
        Args: { p_actualizado_en_esperado: string; p_despues_de?: string; p_id: string }
        Returns: Json
      }
      origenes_con_alcance: {
        Args: { p_clave: string; p_minimo: Database['public']['Enums']['alcance_permiso'] }
        Returns: string[]
      }
      origenes_con_permiso: { Args: { p_clave: string }; Returns: string[] }
      origenes_lead_con_uso: { Args: Record<PropertyKey, never>; Returns: Json }
      origenes_resumen: {
        Args: Record<PropertyKey, never>
        Returns: {
          campos_activos: number
          categorias: number
          concesiones: number
          cotizaciones: number
          fases: number
          formula_publicada: boolean
          origen_id: string
          vehiculos: number
        }[]
      }
      otorgar_portal: {
        Args: { p_clave: string; p_lead: string; p_otorgado_en_esperado: string }
        Returns: Json
      }
      pago_anular: {
        Args: { p_actualizado_en_esperado: string; p_id: string; p_motivo: string }
        Returns: Json
      }
      pago_confirmar: { Args: { p_actualizado_en_esperado: string; p_id: string }; Returns: Json }
      pago_eliminar: { Args: { p_actualizado_en_esperado: string; p_id: string }; Returns: Json }
      pago_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_id: string }
        Returns: Json
      }
      pago_registrar: {
        Args: {
          p_comprobante_ruta: string
          p_concepto: string
          p_fecha: string
          p_id: string
          p_lead: string
          p_metodo: string
          p_moneda: string
          p_monto: number
          p_notas: string
          p_tipo_cambio: string
          p_vehiculo: string
        }
        Returns: Json
      }
      pagos_listar: {
        Args: { p_cursor_fecha: string; p_cursor_id: string; p_filtros: Json; p_tope: number }
        Returns: {
          actualizado_en: string
          comprobante_ruta: string
          concepto: string
          confirmado: boolean
          confirmado_en: string
          confirmado_por: string
          fecha: string
          id: string
          metodo: string
          moneda: string
          monto: number
          monto_base: number
          origen_id: string
          tipo_cambio_aplicado: number
          vehiculo_id: string
          vehiculo_titulo: string
        }[]
      }
      papelera_enviar: {
        Args: { p_ids: string[]; p_tipo: Database['public']['Enums']['tipo_lote_papelera'] }
        Returns: string
      }
      papelera_listar: {
        Args: { p_tipo: Database['public']['Enums']['tipo_lote_papelera'] }
        Returns: {
          borrado_en: string
          borrado_por: string
          lote_id: string
          purga_el: string
          registro_id: string
          titulo: string
        }[]
      }
      papelera_purgar: { Args: { p_lote: string }; Returns: number }
      papelera_purgar_vencidos: { Args: Record<PropertyKey, never>; Returns: number }
      papelera_restaurar: { Args: { p_lote: string }; Returns: number }
      permisos_efectivos: {
        Args: { p_perspectiva?: string }
        Returns: {
          alcance: Database['public']['Enums']['alcance_permiso']
          clave: string
          origen_id: string
        }[]
      }
      persona_dominada: { Args: { p_usuario: string }; Returns: boolean }
      personas_dominadas: { Args: { p_ids: string[] }; Returns: string[] }
      plantilla_descartar_borrador: {
        Args: { p_actualizado_en_esperado: string; p_origen: string }
        Returns: undefined
      }
      plantilla_guardar_borrador: {
        Args: { p_actualizado_en_esperado: string; p_def: Json; p_nota?: string; p_origen: string }
        Returns: string
      }
      plantilla_publicar: {
        Args: { p_actualizado_en_esperado: string; p_nota: string; p_origen: string }
        Returns: string
      }
      portal_desbloquear: { Args: { p_lead: string }; Returns: undefined }
      portal_estado: { Args: { p_lead: string }; Returns: Json }
      portal_intentos_purgar: { Args: Record<PropertyKey, never>; Returns: number }
      portal_mensaje_guardar: {
        Args: { p_actualizado_en_esperado: string; p_texto: string }
        Returns: string
      }
      previsualizar_cambio_fase: {
        Args: { p_fase_destino: string; p_repuesto: string; p_vehiculo: string }
        Returns: Json
      }
      previsualizar_cambio_fase_lote: {
        Args: { p_fase: string; p_vehiculos: string[] }
        Returns: Json
      }
      puede_actuar_lead: { Args: { p_clave: string; p_lead: string }; Returns: boolean }
      puede_configurar_flujo: { Args: { p_flujo: string }; Returns: boolean }
      puede_cotizacion: { Args: { p_clave: string; p_cot: string }; Returns: boolean }
      puede_estar_en_la_rueda: { Args: { p_usuario: string }; Returns: boolean }
      puede_evento: { Args: { p_evento: string }; Returns: boolean }
      puede_lead: { Args: { p_clave: string; p_lead: string }; Returns: boolean }
      puede_objeto_de_vehiculo: { Args: { p_clave: string; p_nombre: string }; Returns: boolean }
      puede_repuesto: { Args: { p_clave: string; p_item: string }; Returns: boolean }
      puede_unidad: {
        Args: { p_clave_r: string; p_clave_v: string; p_repuesto: string; p_vehiculo: string }
        Returns: boolean
      }
      puede_vehiculo: { Args: { p_clave: string; p_vehiculo: string }; Returns: boolean }
      push_abrir: { Args: { p_pase: string }; Returns: Json }
      push_desuscribir: { Args: { p_endpoint: string }; Returns: boolean }
      push_resultado: { Args: { p_pase: string; p_resultados: Json }; Returns: Json }
      push_suscribir: {
        Args: { p_claves: Json; p_endpoint: string; p_user_agent?: string }
        Returns: string
      }
      rbac_asignar_rol: {
        Args: { p_principal?: boolean; p_rol: string; p_usuario: string }
        Returns: undefined
      }
      rbac_crear_rol: {
        Args: { p_clave: string; p_color?: string; p_descripcion?: string; p_nombre: string }
        Returns: string
      }
      rbac_eliminar_rol: {
        Args: { p_actualizado_en_esperado: string; p_rol: string }
        Returns: undefined
      }
      rbac_otorgar: {
        Args: {
          p_actualizado_en_esperado: string
          p_alcance?: Database['public']['Enums']['alcance_permiso']
          p_clave: string
          p_origen?: string
          p_rol: string
        }
        Returns: string
      }
      rbac_quitar_rol: { Args: { p_rol: string; p_usuario: string }; Returns: undefined }
      rbac_revocar: {
        Args: {
          p_actualizado_en_esperado: string
          p_clave: string
          p_origen?: string
          p_rol: string
        }
        Returns: string
      }
      reasignar_tarea: {
        Args: { p_actualizado_en_esperado: string; p_responsable: string; p_tarea: string }
        Returns: Json
      }
      recordatorio_completar: {
        Args: { p_actualizado_en_esperado: string; p_completado: boolean; p_id: string }
        Returns: Json
      }
      recordatorio_crear: {
        Args: {
          p_id: string
          p_lead: string
          p_recordar_en: string
          p_titulo: string
          p_vehiculo?: string
        }
        Returns: Json
      }
      recordatorio_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      recordatorio_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_id: string }
        Returns: Json
      }
      recordatorio_restaurar: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      recordatorios_notificar: { Args: Record<PropertyKey, never>; Returns: number }
      registrar_actividad: {
        Args: {
          p_accion: string
          p_antes?: Json
          p_despues?: Json
          p_detalle?: Json
          p_registro_id: string
          p_tabla: string
        }
        Returns: undefined
      }
      repuesto_compra_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      repuesto_compra_guardar: {
        Args: { p_actualizado_en_esperado: string; p_datos: Json; p_id: string }
        Returns: Json
      }
      repuesto_compra_restaurar: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      repuesto_item_crear: {
        Args: { p_datos: Json; p_id: string; p_proyecto: string }
        Returns: Json
      }
      repuesto_item_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_item: string }
        Returns: Json
      }
      repuesto_proyecto_cerrar: {
        Args: { p_actualizado_en_esperado: string; p_proyecto: string }
        Returns: Json
      }
      repuesto_proyecto_crear: { Args: { p_datos: Json; p_id: string }; Returns: Json }
      repuesto_proyecto_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_proyecto: string }
        Returns: Json
      }
      repuesto_proyecto_reabrir: {
        Args: { p_actualizado_en_esperado: string; p_proyecto: string }
        Returns: Json
      }
      repuesto_proyecto_restaurar: {
        Args: { p_eliminado_en_esperado: string; p_proyecto: string }
        Returns: Json
      }
      repuesto_stock_mover: {
        Args: {
          p_item: string
          p_motivo: string
          p_nota?: string
          p_stock_esperado: number
          p_unidades: number
        }
        Returns: Json
      }
      repuesto_stock_reasignar: {
        Args: { p_id: string; p_item: string; p_proyecto_destino: string; p_unidades: number }
        Returns: Json
      }
      repuestos_cotizacion_aceptar: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      repuestos_cotizacion_anular: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      repuestos_cotizacion_crear: {
        Args: { p_id: string; p_moneda: string; p_proyecto: string }
        Returns: Json
      }
      repuestos_cotizacion_guardar: {
        Args: { p_actualizado_en_esperado: string; p_id: string; p_lineas: Json; p_notas: string }
        Returns: Json
      }
      repuestos_pendientes_de_vehiculo: {
        Args: { p_tope?: number; p_vehiculo: string }
        Returns: {
          descripcion: string
          espera_fase_id: string
          espera_fase_nombre: string
          fase_destino_id: string
          fase_destino_nombre: string
          fase_id: string
          fase_nombre: string
          item_id: string
          proyecto_id: string
          proyecto_numero: number
          requisito_id: string
        }[]
      }
      repuestos_proyecto_margen: { Args: { p_proyecto: string }; Returns: Json }
      repuestos_proyectos_listar: {
        Args: { p_cursor: number; p_estado: string; p_q: string; p_tamano: number }
        Returns: {
          actualizado_en: string
          cerrado_en: string
          cliente_nombre: string
          en_stock: number
          id: string
          items: number
          numero: number
          pendientes: number
          terminados: number
          ultima_actividad: string
          vehiculo_etiqueta: string
          vehiculo_id: string
          vehiculo_titulo: string
          vin: string
        }[]
      }
      repuestos_stock_listar: {
        Args: { p_cursor_en: string; p_cursor_id: string; p_tamano: number }
        Returns: {
          descripcion: string
          en_stock_desde: string
          id: string
          proyecto_cerrado_en: string
          proyecto_id: string
          proyecto_numero: number
          stock_cantidad: number
          vehiculo_etiqueta: string
          vehiculo_id: string
          vehiculo_titulo: string
        }[]
      }
      requisito_crear: {
        Args: {
          p_actualizado_en_esperado: string
          p_datos: Json
          p_fase: string
          p_id: string
          p_tipo: Database['public']['Enums']['tipo_requisito']
        }
        Returns: string
      }
      requisito_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_requisito: string }
        Returns: string
      }
      requisito_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_requisito: string }
        Returns: string
      }
      requisito_impacto: { Args: { p_requisito: string; p_tope?: number }; Returns: Json }
      requisito_mover: {
        Args: { p_actualizado_en_esperado: string; p_despues_de?: string; p_requisito: string }
        Returns: string
      }
      revisar_flujo: {
        Args: { p_flujo: string }
        Returns: {
          codigo: string
          fase_id: string
          mensaje: string
          nivel: string
        }[]
      }
      revocar_portal: { Args: { p_lead: string }; Returns: undefined }
      rol_dominado: { Args: { p_rol: string }; Returns: boolean }
      roles_personas: {
        Args: Record<PropertyKey, never>
        Returns: {
          personas: number
          rol_id: string
        }[]
      }
      seguimiento_crear: {
        Args: { p_id: string; p_lead: string; p_recordatorio?: Json; p_seguimiento: Json }
        Returns: Json
      }
      seguimiento_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      seguimiento_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_id: string }
        Returns: Json
      }
      seguimiento_restaurar: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      slugificar: { Args: { p: string }; Returns: string }
      storage_gc_abrir: { Args: { p_pase: string }; Returns: boolean }
      storage_gc_confirmar: { Args: { p_bucket: string; p_rutas: string[] }; Returns: number }
      storage_gc_correr: { Args: Record<PropertyKey, never>; Returns: number }
      storage_gc_disparar: { Args: { p_url: string }; Returns: number }
      storage_gc_encolar_huerfanos: {
        Args: { p_bucket: string; p_gracia: string }
        Returns: number
      }
      storage_gc_pendiente: { Args: Record<PropertyKey, never>; Returns: Json }
      storage_gc_programar: { Args: { p_url: string }; Returns: undefined }
      storage_gc_reclamar: {
        Args: { p_max?: number }
        Returns: {
          bucket: string
          ruta: string
        }[]
      }
      storage_gc_rescatar: { Args: { p_bucket: string; p_ruta: string }; Returns: undefined }
      storage_refcount: { Args: { p_bucket: string; p_ruta: string }; Returns: number }
      tabla_referencia_publicar: {
        Args: { p_filas: Json; p_nota: string; p_tabla: string; p_version_esperada: number }
        Returns: Json
      }
      tablero_cotizaciones: { Args: { p_desde: string; p_hasta: string }; Returns: Json }
      tablero_leads: { Args: { p_desde: string; p_hasta: string }; Returns: Json }
      tarea_completar: {
        Args: { p_actualizado_en_esperado: string; p_completada: boolean; p_tarea: string }
        Returns: Json
      }
      tarea_crear: { Args: { p_conversacion?: string; p_datos: Json; p_id: string }; Returns: Json }
      tarea_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_tarea: string }
        Returns: Json
      }
      tarea_guardar: {
        Args: { p_actualizado_en_esperado: string; p_datos: Json; p_tarea: string }
        Returns: Json
      }
      telefono_lead: { Args: { p_lead: string }; Returns: string }
      tiene_permiso: { Args: { p_clave: string; p_origen?: string }; Returns: boolean }
      tipo_cambio_crear: {
        Args: {
          p_clave: string
          p_moneda_a: string
          p_moneda_de: string
          p_nombre: string
          p_valor: number
        }
        Returns: string
      }
      tipo_cambio_guardar: {
        Args: {
          p_activo?: boolean
          p_actualizado_en_esperado: string
          p_es_default?: boolean
          p_id: string
          p_nombre?: string
          p_valor?: number
        }
        Returns: string
      }
      tipo_documento_crear: {
        Args: { p_datos: Json; p_flujo: string; p_id: string }
        Returns: Json
      }
      tipo_documento_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      tipo_documento_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_id: string }
        Returns: Json
      }
      tipo_documento_mover: {
        Args: { p_actualizado_en_esperado: string; p_despues_de?: string; p_id: string }
        Returns: Json
      }
      tipo_lead_crear: {
        Args: { p_clase: string; p_icono?: string; p_id: string; p_nombre: string }
        Returns: Json
      }
      tipo_lead_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      tipo_lead_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_id: string }
        Returns: Json
      }
      tipo_lead_mover: {
        Args: { p_actualizado_en_esperado: string; p_despues_de?: string; p_id: string }
        Returns: Json
      }
      tipo_seguimiento_crear: {
        Args: { p_icono?: string; p_id: string; p_nombre: string }
        Returns: Json
      }
      tipo_seguimiento_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_id: string }
        Returns: Json
      }
      tipo_seguimiento_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_id: string }
        Returns: Json
      }
      tipo_seguimiento_mover: {
        Args: { p_actualizado_en_esperado: string; p_despues_de?: string; p_id: string }
        Returns: Json
      }
      tipos_documento_con_uso: {
        Args: { p_flujo: string }
        Returns: {
          documentos: number
          requisitos: number
          tipo_id: string
        }[]
      }
      tipos_lead_con_uso: { Args: Record<PropertyKey, never>; Returns: Json }
      tipos_seguimiento_con_uso: { Args: Record<PropertyKey, never>; Returns: Json }
      tono_crear: { Args: { p_colores: Json; p_id: string; p_nombre: string }; Returns: Json }
      tono_eliminar: { Args: { p_actualizado_en_esperado: string; p_id: string }; Returns: Json }
      tono_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_id: string }
        Returns: Json
      }
      transicion_crear: {
        Args: {
          p_a: string
          p_accion: string
          p_actualizado_en_esperado: string
          p_de: string
          p_flujo: string
          p_id: string
          p_nota_obligatoria: boolean
        }
        Returns: string
      }
      transicion_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_transicion: string }
        Returns: string
      }
      transicion_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json; p_transicion: string }
        Returns: string
      }
      transicion_roles_poner: {
        Args: { p_actualizado_en_esperado: string; p_roles: string[]; p_transicion: string }
        Returns: string
      }
      transporte_grupo: { Args: { p_clave: string; p_tipo: string }; Returns: Json }
      transporte_grupo_aplicar: {
        Args: { p_cambios: Json; p_clave: string; p_esperadas: Json; p_tipo: string }
        Returns: Json
      }
      transporte_grupos: {
        Args: { p_desde: string; p_filtros: Json; p_tipo: string; p_tope: number }
        Returns: Json
      }
      transporte_guardar: {
        Args: {
          p_actualizado_en_esperado: string
          p_cambios: Json
          p_repuesto: string
          p_vehiculo: string
        }
        Returns: Json
      }
      unidad_llego_a_fase: {
        Args: { p_fase: string; p_repuesto: string; p_vehiculo: string }
        Returns: boolean
      }
      usuario_tiene_permiso: { Args: { p_clave: string; p_usuario: string }; Returns: boolean }
      validar_diseno: {
        Args: {
          p_def: Json
          p_diseno: Json
          p_niveles: string[]
          p_retirados: string[]
          p_tonos: string[]
        }
        Returns: undefined
      }
      validar_formula: { Args: { p_def: Json; p_params: Json }; Returns: undefined }
      validar_plantilla: {
        Args: {
          p_def: Json
          p_diseno: Json
          p_plantilla: Json
          p_tonos: string[]
          p_visibilidad: Json
        }
        Returns: undefined
      }
      vehiculo_conservar: { Args: { p_conservar: boolean; p_vehiculo: string }; Returns: Json }
      vehiculo_crear: {
        Args: { p_consulta?: string; p_datos: Json; p_id: string; p_origen: string }
        Returns: Json
      }
      vehiculo_foto_eliminar: {
        Args: { p_actualizado_en_esperado: string; p_foto: string; p_vehiculo: string }
        Returns: Json
      }
      vehiculo_foto_mover: {
        Args: {
          p_actualizado_en_esperado: string
          p_despues_de?: string
          p_foto: string
          p_vehiculo: string
        }
        Returns: Json
      }
      vehiculo_foto_portada: {
        Args: { p_actualizado_en_esperado: string; p_foto: string; p_vehiculo: string }
        Returns: Json
      }
      vehiculo_fotos_agregar: { Args: { p_fotos: Json; p_vehiculo: string }; Returns: Json }
      vehiculo_guardar: {
        Args: { p_actualizado_en_esperado: string; p_datos: Json; p_vehiculo: string }
        Returns: Json
      }
      vehiculo_interesado_marcar: {
        Args: { p_lead: string; p_nota?: string; p_vehiculo: string }
        Returns: Json
      }
      vehiculo_interesado_quitar: { Args: { p_lead: string; p_vehiculo: string }; Returns: Json }
      vehiculo_interesados: {
        Args: { p_vehiculo: string }
        Returns: {
          creado_en: string
          lead_id: string
          lead_nombre: string
          lead_numero: number
          lead_numero_propio: number
          nota: string
          por_nombre: string
        }[]
      }
      vehiculo_limpieza: { Args: { p_vehiculo: string }; Returns: Json }
      vehiculo_subasta_refrescar: {
        Args: {
          p_actualizado_en_esperado: string
          p_consulta: string
          p_datos?: Json
          p_vehiculo: string
        }
        Returns: Json
      }
      vehiculo_vincular: {
        Args: { p_actualizado_en_esperado: string; p_lead: string; p_vehiculo: string }
        Returns: Json
      }
      vehiculo_vinculos: {
        Args: { p_vehiculo: string }
        Returns: {
          desde: string
          hasta: string
          lead_id: string
          lead_nombre: string
          lead_numero: number
          lead_numero_propio: number
          por_nombre: string
        }[]
      }
      vehiculo_vitrina: {
        Args: {
          p_actualizado_en_esperado: string
          p_destacado: boolean
          p_nota: string
          p_precio: number
          p_precio_hasta: number
          p_publicado: boolean
          p_vehiculo: string
        }
        Returns: Json
      }
      vehiculo_vitrina_previa: { Args: { p_vehiculo: string }; Returns: Json }
      vehiculos_con_permiso: { Args: { p_clave: string; p_ids: string[] }; Returns: string[] }
      vehiculos_editables: { Args: { p_ids: string[] }; Returns: string[] }
      vehiculos_inventario: {
        Args: {
          p_cursor_en?: string
          p_cursor_id?: string
          p_filtros?: Json
          p_hacia_atras?: boolean
          p_origen: string
          p_tamano?: number
        }
        Returns: {
          acepta_permuta: boolean
          actualizado_en: string
          anio: number
          atributos: Json
          categoria_id: string
          creado_en: string
          creado_por: string
          destacado_web: boolean
          fase_id: string
          id: string
          kilometraje: number
          lead_id: string
          limpieza_el: string
          lote: string
          marca: string
          modelo: string
          numero: number
          origen_id: string
          placado: boolean
          plataforma: string
          portada_ruta: string
          precio: number
          precio_negociable: boolean
          precio_web: number
          precio_web_hasta: number
          precio_web_nota: string
          publicado_web: boolean
          titulo: string
          url_origen: string
          vin: string
        }[]
      }
      vehiculos_papelera_enviar: { Args: { p_vehiculos: Json }; Returns: Json }
      vehiculos_papelera_listar: {
        Args: {
          p_antes_en?: string
          p_antes_id?: string
          p_hacia_atras?: boolean
          p_primeros?: number
          p_tope?: number
        }
        Returns: Json
      }
      vehiculos_papelera_lote: { Args: { p_lote: string }; Returns: Json }
      vehiculos_papelera_purgar: {
        Args: { p_actualizado_en_esperado: string; p_lote: string; p_vehiculos?: string[] }
        Returns: Json
      }
      vehiculos_papelera_restaurar: {
        Args: { p_actualizado_en_esperado: string; p_lote: string; p_vehiculos?: string[] }
        Returns: Json
      }
      vehiculos_para_lead: { Args: { p_lead: string; p_texto?: string }; Returns: Json }
      vehiculos_repetidos: {
        Args: { p_claves: Json; p_origen: string }
        Returns: {
          posicion: number
          vehiculo_id: string
          visible: boolean
        }[]
      }
      verificar_telefono: { Args: { p_cc: string; p_tel: string }; Returns: Json }
      verificar_telefono_de_lead: {
        Args: { p_cc: string; p_lead: string; p_tel: string }
        Returns: Json
      }
      visita_registrar: { Args: { p_id: string; p_tipo: string }; Returns: undefined }
      vitrina_del_origen: { Args: { p_origen: string }; Returns: Json }
      web_ajustes_guardar: {
        Args: { p_actualizado_en_esperado: string; p_cambios: Json }
        Returns: string
      }
      web_confirmar_contacto: { Args: { p_lead?: string; p_solicitud: string }; Returns: undefined }
      web_expirar_solicitudes: { Args: { p_limite?: number }; Returns: number }
      web_publica_vehiculos_que_cambian: { Args: Record<PropertyKey, never>; Returns: number }
      web_revalidar_correr: { Args: Record<PropertyKey, never>; Returns: number }
      web_testimonio_consentir: {
        Args: {
          p_actualizado_en_esperado: string
          p_canal: string
          p_ciudad: boolean
          p_foto: boolean
          p_testimonio: string
          p_vehiculo: boolean
        }
        Returns: string
      }
      web_testimonio_retirar: {
        Args: { p_actualizado_en_esperado: string; p_testimonio: string }
        Returns: string
      }
    }
    Enums: {
      alcance_permiso: 'propios' | 'todos'
      ambito_espera: 'padre' | 'hijos'
      ambito_flujo: 'vehiculos' | 'repuestos'
      canal_aforo: 'verde' | 'amarillo' | 'rojo'
      clase_cotizacion: 'preventa' | 'final'
      clase_tipo_lead: 'prospecto' | 'cliente'
      estado_agenda: 'pendiente' | 'completado' | 'cancelado'
      estado_cotizacion: 'activa' | 'reportada' | 'invalida'
      estado_cotizacion_repuestos: 'borrador' | 'aceptada' | 'anulada'
      estado_documento: 'pendiente' | 'subido' | 'aprobado' | 'rechazado'
      estado_importacion: 'pendiente' | 'procesando' | 'terminada' | 'fallida'
      estado_oportunidad: 'abierta' | 'ganada' | 'perdida' | 'cancelada'
      estado_solicitud_web: 'asignada' | 'contactada' | 'vencida' | 'sin_asignar' | 'cancelada'
      estado_subasta: 'abierta' | 'en_vivo' | 'terminada' | 'vendida'
      estado_version: 'borrador' | 'publicada' | 'archivada'
      genero_gramatical: 'm' | 'f'
      modo_vencimiento: 'ninguno' | 'renovar' | 'solicitar'
      tipo_acceso_lead: 'dueno' | 'compartido' | 'adoptado'
      tipo_campo:
        | 'texto'
        | 'texto_largo'
        | 'numero'
        | 'moneda'
        | 'booleano'
        | 'fecha'
        | 'fecha_hora'
        | 'opcion'
        | 'multi_opcion'
        | 'url'
        | 'vin'
        | 'lote'
        | 'correo'
        | 'documento'
      tipo_conversacion: 'directa' | 'grupo'
      tipo_lote_papelera: 'vehiculos' | 'leads' | 'cotizaciones'
      tipo_mensaje: 'texto' | 'evento' | 'tarea' | 'vehiculo' | 'lead' | 'cotizacion'
      tipo_origen: 'subasta' | 'manual'
      tipo_requisito: 'documento' | 'dato' | 'espera'
      visibilidad_evento: 'privado' | 'publico' | 'seleccionados'
      visibilidad_seguimiento: 'privado' | 'publico'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  web: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      ajustes: {
        Row: {
          ciudad: string | null
          direccion: string | null
          horario: string | null
          legales: Json | null
          lema: string | null
          locale: string | null
          logo_ruta: string | null
          moneda_base: string | null
          mostrar_moneda_secundaria: boolean | null
          nit: string | null
          nombre: string | null
          nombre_sitio: string | null
          pais: string | null
          razon_social: string | null
          redes: Json | null
          seo: Json | null
          whatsapp: string | null
          whatsapp_respaldo: string | null
        }
        ComputedFields: never
        Relationships: []
      }
      asesores: {
        Row: {
          avatar: string | null
          bio: string | null
          cargo: string | null
          desde: string | null
          especialidades: string[] | null
          handle: string | null
          id: string | null
          nombre: string | null
          orden: number | null
          whatsapp: string | null
        }
        ComputedFields: never
        Relationships: []
      }
      faqs: {
        Row: {
          categoria: string | null
          orden: number | null
          pregunta: string | null
          respuesta: string | null
        }
        ComputedFields: never
        Insert: {
          categoria?: string | null
          orden?: number | null
          pregunta?: string | null
          respuesta?: string | null
        }
        Update: {
          categoria?: string | null
          orden?: number | null
          pregunta?: string | null
          respuesta?: string | null
        }
        Relationships: []
      }
      guias: {
        Row: {
          autor: string | null
          autor_avatar: string | null
          autor_handle: string | null
          categoria: string | null
          categoria_etiqueta: string | null
          cuerpo_html: string | null
          minutos_lectura: number | null
          orden: number | null
          portada: string | null
          publicada_en: string | null
          resumen: string | null
          seo_descripcion: string | null
          seo_titulo: string | null
          slug: string | null
          titulo: string | null
        }
        ComputedFields: never
        Relationships: []
      }
      testimonios: {
        Row: {
          ciudad: string | null
          cliente: string | null
          foto: string | null
          orden: number | null
          texto: string | null
          vehiculo: string | null
        }
        ComputedFields: never
        Insert: {
          ciudad?: never
          cliente?: string | null
          foto?: never
          orden?: number | null
          texto?: string | null
          vehiculo?: never
        }
        Update: {
          ciudad?: never
          cliente?: string | null
          foto?: never
          orden?: number | null
          texto?: string | null
          vehiculo?: never
        }
        Relationships: []
      }
      vehiculos: {
        Row: {
          actualizado_en: string | null
          anio: number | null
          atributos: Json | null
          categoria: string | null
          destacado: boolean | null
          id: string | null
          imagen: string | null
          marca: string | null
          miniatura: string | null
          modelo: string | null
          numero: number | null
          origen: string | null
          origen_nombre: string | null
          precio: number | null
          precio_hasta: number | null
          precio_nota: string | null
          titulo: string | null
        }
        ComputedFields: never
        Relationships: []
      }
    }
    Functions: {
      ajustes_acceso: {
        Args: Record<PropertyKey, never>
        Returns: {
          color_acento: string
          iconos: Json
          locale: string
          logo_ruta: string
          moneda_base: string
          nombre: string
          primer_registro: boolean
          registro_abierto: boolean
          zona_horaria: string
        }[]
      }
      portal_cambiar_clave: {
        Args: { p_actual: string; p_lead: string; p_nueva: string; p_otorgado_en: string }
        Returns: boolean
      }
      portal_direccion_publica: { Args: Record<PropertyKey, never>; Returns: string }
      portal_documento_ruta: {
        Args: { p_documento: string; p_lead: string; p_otorgado_en: string }
        Returns: string
      }
      portal_intento: { Args: { p_ip: string }; Returns: boolean }
      portal_login: {
        Args: { p_clave: string; p_codigo: string }
        Returns: {
          debe_cambiar_clave: boolean
          lead_id: string
          nombre: string
          otorgado_en: string
        }[]
      }
      portal_snapshot: { Args: { p_lead: string; p_otorgado_en: string }; Returns: Json }
      registrar_evento: {
        Args: {
          p_evento: string
          p_referencia_id?: string
          p_ruta?: string
          p_token: string
          p_utm?: Json
        }
        Returns: undefined
      }
      solicitar_asesor: {
        Args: {
          p_fuente: string
          p_handle?: string
          p_ruta?: string
          p_token: string
          p_utm?: Json
          p_vehiculo_id?: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alcance_permiso: ['propios', 'todos'],
      ambito_espera: ['padre', 'hijos'],
      ambito_flujo: ['vehiculos', 'repuestos'],
      canal_aforo: ['verde', 'amarillo', 'rojo'],
      clase_cotizacion: ['preventa', 'final'],
      clase_tipo_lead: ['prospecto', 'cliente'],
      estado_agenda: ['pendiente', 'completado', 'cancelado'],
      estado_cotizacion: ['activa', 'reportada', 'invalida'],
      estado_cotizacion_repuestos: ['borrador', 'aceptada', 'anulada'],
      estado_documento: ['pendiente', 'subido', 'aprobado', 'rechazado'],
      estado_importacion: ['pendiente', 'procesando', 'terminada', 'fallida'],
      estado_oportunidad: ['abierta', 'ganada', 'perdida', 'cancelada'],
      estado_solicitud_web: ['asignada', 'contactada', 'vencida', 'sin_asignar', 'cancelada'],
      estado_subasta: ['abierta', 'en_vivo', 'terminada', 'vendida'],
      estado_version: ['borrador', 'publicada', 'archivada'],
      genero_gramatical: ['m', 'f'],
      modo_vencimiento: ['ninguno', 'renovar', 'solicitar'],
      tipo_acceso_lead: ['dueno', 'compartido', 'adoptado'],
      tipo_campo: [
        'texto',
        'texto_largo',
        'numero',
        'moneda',
        'booleano',
        'fecha',
        'fecha_hora',
        'opcion',
        'multi_opcion',
        'url',
        'vin',
        'lote',
        'correo',
        'documento',
      ],
      tipo_conversacion: ['directa', 'grupo'],
      tipo_lote_papelera: ['vehiculos', 'leads', 'cotizaciones'],
      tipo_mensaje: ['texto', 'evento', 'tarea', 'vehiculo', 'lead', 'cotizacion'],
      tipo_origen: ['subasta', 'manual'],
      tipo_requisito: ['documento', 'dato', 'espera'],
      visibilidad_evento: ['privado', 'publico', 'seleccionados'],
      visibilidad_seguimiento: ['privado', 'publico'],
    },
  },
  web: {
    Enums: {},
  },
} as const
