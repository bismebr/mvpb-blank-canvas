export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointment_cancellations: {
        Row: {
          appointment_id: string
          canceled_by: Database["public"]["Enums"]["cancel_actor"]
          company_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          appointment_id: string
          canceled_by: Database["public"]["Enums"]["cancel_actor"]
          company_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          appointment_id?: string
          canceled_by?: Database["public"]["Enums"]["cancel_actor"]
          company_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_cancellations_appointment_id_company_id_fkey"
            columns: ["appointment_id", "company_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "appointment_cancellations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          cancel_token: string
          client_id: string | null
          company_id: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          customer_user_id: string | null
          duration_minutes_snapshot: number
          ends_at: string
          id: string
          notes: string | null
          professional_id: string
          professional_name_snapshot: string
          review_token: string
          review_token_expires_at: string | null
          service_id: string
          service_name_snapshot: string
          service_price_cents_snapshot: number
          starts_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          cancel_token?: string
          client_id?: string | null
          company_id: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          customer_user_id?: string | null
          duration_minutes_snapshot: number
          ends_at: string
          id?: string
          notes?: string | null
          professional_id: string
          professional_name_snapshot: string
          review_token?: string
          review_token_expires_at?: string | null
          service_id: string
          service_name_snapshot: string
          service_price_cents_snapshot: number
          starts_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          cancel_token?: string
          client_id?: string | null
          company_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          customer_user_id?: string | null
          duration_minutes_snapshot?: number
          ends_at?: string
          id?: string
          notes?: string | null
          professional_id?: string
          professional_name_snapshot?: string
          review_token?: string
          review_token_expires_at?: string | null
          service_id?: string
          service_name_snapshot?: string
          service_price_cents_snapshot?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_company_id_fkey"
            columns: ["client_id", "company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "appointments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_company_id_fkey"
            columns: ["professional_id", "company_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "appointments_service_id_company_id_fkey"
            columns: ["service_id", "company_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      blocks: {
        Row: {
          block_date: string
          company_id: string
          ends_at: string | null
          full_day: boolean
          id: string
          professional_id: string | null
          starts_at: string | null
        }
        Insert: {
          block_date: string
          company_id: string
          ends_at?: string | null
          full_day?: boolean
          id?: string
          professional_id?: string | null
          starts_at?: string | null
        }
        Update: {
          block_date?: string
          company_id?: string
          ends_at?: string | null
          full_day?: boolean
          id?: string
          professional_id?: string | null
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_professional_id_company_id_fkey"
            columns: ["professional_id", "company_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      breaks: {
        Row: {
          company_id: string
          ends_at: string
          id: string
          professional_id: string | null
          starts_at: string
          weekday: number | null
        }
        Insert: {
          company_id: string
          ends_at: string
          id?: string
          professional_id?: string | null
          starts_at: string
          weekday?: number | null
        }
        Update: {
          company_id?: string
          ends_at?: string
          id?: string
          professional_id?: string | null
          starts_at?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "breaks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breaks_professional_id_company_id_fkey"
            columns: ["professional_id", "company_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      business_hours: {
        Row: {
          closes_at: string
          company_id: string
          id: string
          is_open: boolean
          opens_at: string
          weekday: number
        }
        Insert: {
          closes_at?: string
          company_id: string
          id?: string
          is_open?: boolean
          opens_at?: string
          weekday: number
        }
        Update: {
          closes_at?: string
          company_id?: string
          id?: string
          is_open?: boolean
          opens_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "business_hours_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          appointment_id: string | null
          company_id: string
          id: string
          sent_at: string
          sent_to: string | null
          template_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          company_id: string
          id?: string
          sent_at?: string
          sent_to?: string | null
          template_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          company_id?: string
          id?: string
          sent_at?: string
          sent_to?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_appointment_id_company_id_fkey"
            columns: ["appointment_id", "company_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "message_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_template_id_company_id_fkey"
            columns: ["template_id", "company_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      message_templates: {
        Row: {
          company_id: string
          content: string
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          kind: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          bio: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          is_default_owner: boolean
          is_visible: boolean
          name: string
          off_days: number[]
          photo_url: string | null
          position: number
          role_title: string | null
          shift_end: string | null
          shift_start: string | null
          updated_at: string
          vacation_end: string | null
          vacation_start: string | null
        }
        Insert: {
          bio?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default_owner?: boolean
          is_visible?: boolean
          name: string
          off_days?: number[]
          photo_url?: string | null
          position?: number
          role_title?: string | null
          shift_end?: string | null
          shift_start?: string | null
          updated_at?: string
          vacation_end?: string | null
          vacation_start?: string | null
        }
        Update: {
          bio?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default_owner?: boolean
          is_visible?: boolean
          name?: string
          off_days?: number[]
          photo_url?: string | null
          position?: number
          role_title?: string | null
          shift_end?: string | null
          shift_start?: string | null
          updated_at?: string
          vacation_end?: string | null
          vacation_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          appointment_id: string | null
          comment: string | null
          company_id: string
          created_at: string
          customer_name: string
          id: string
          is_published: boolean
          rating: number
        }
        Insert: {
          appointment_id?: string | null
          comment?: string | null
          company_id: string
          created_at?: string
          customer_name: string
          id?: string
          is_published?: boolean
          rating: number
        }
        Update: {
          appointment_id?: string | null
          comment?: string | null
          company_id?: string
          created_at?: string
          customer_name?: string
          id?: string
          is_published?: boolean
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_company_id_fkey"
            columns: ["appointment_id", "company_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      service_professionals: {
        Row: {
          company_id: string
          professional_id: string
          service_id: string
        }
        Insert: {
          company_id: string
          professional_id: string
          service_id: string
        }
        Update: {
          company_id?: string
          professional_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_professionals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_professionals_professional_id_company_id_fkey"
            columns: ["professional_id", "company_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "service_professionals_service_id_company_id_fkey"
            columns: ["service_id", "company_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
      services: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price_cents: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price_cents?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_company_id_fkey"
            columns: ["category_id", "company_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id", "company_id"]
          },
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          about: string | null
          about_image_url: string | null
          address: string | null
          amenities: string[]
          company_id: string
          cover_url: string | null
          display_name: string | null
          logo_url: string | null
          rating_average: number
          reviews_count: number
          show_address: boolean
          social_facebook: string | null
          social_instagram: string | null
          social_tiktok: string | null
          social_youtube: string | null
          template_key: string | null
          theme_key: string | null
          updated_at: string
          website_url: string | null
          whatsapp: string | null
          work_image_urls: string[]
        }
        Insert: {
          about?: string | null
          about_image_url?: string | null
          address?: string | null
          amenities?: string[]
          company_id: string
          cover_url?: string | null
          display_name?: string | null
          logo_url?: string | null
          rating_average?: number
          reviews_count?: number
          show_address?: boolean
          social_facebook?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          social_youtube?: string | null
          template_key?: string | null
          theme_key?: string | null
          updated_at?: string
          website_url?: string | null
          whatsapp?: string | null
          work_image_urls?: string[]
        }
        Update: {
          about?: string | null
          about_image_url?: string | null
          address?: string | null
          amenities?: string[]
          company_id?: string
          cover_url?: string | null
          display_name?: string | null
          logo_url?: string | null
          rating_average?: number
          reviews_count?: number
          show_address?: boolean
          social_facebook?: string | null
          social_instagram?: string | null
          social_tiktok?: string | null
          social_youtube?: string | null
          template_key?: string | null
          theme_key?: string | null
          updated_at?: string
          website_url?: string | null
          whatsapp?: string | null
          work_image_urls?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          company_id: string
          current_period_end: string | null
          current_period_start: string | null
          last_stripe_event_at: string | null
          plan: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          company_id: string
          current_period_end?: string | null
          current_period_start?: string | null
          last_stripe_event_at?: string | null
          plan?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          company_id?: string
          current_period_end?: string | null
          current_period_start?: string | null
          last_stripe_event_at?: string | null
          plan?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off: {
        Row: {
          company_id: string
          end_date: string
          id: string
          professional_id: string | null
          reason: string | null
          start_date: string
        }
        Insert: {
          company_id: string
          end_date: string
          id?: string
          professional_id?: string | null
          reason?: string | null
          start_date: string
        }
        Update: {
          company_id?: string
          end_date?: string
          id?: string
          professional_id?: string | null
          reason?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_professional_id_company_id_fkey"
            columns: ["professional_id", "company_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id", "company_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_sync_service_professionals: {
        Args: { _cid: string }
        Returns: undefined
      }
      cancel_appointment_as_client: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      cancel_appointment_by_token: {
        Args: { _id: string; _reason: string; _token: string }
        Returns: undefined
      }
      create_company_for_current_user: {
        Args: { _name: string; _slug: string }
        Returns: string
      }
      create_public_appointment: {
        Args: {
          _customer_email?: string
          _customer_name: string
          _customer_phone: string
          _notes?: string
          _professional_id: string
          _service_id: string
          _slug: string
          _starts_at: string
        }
        Returns: Json
      }
      create_review_by_token: {
        Args: {
          _appointment_id: string
          _comment: string
          _rating: number
          _token: string
        }
        Returns: undefined
      }
      get_available_slots: {
        Args: {
          _date: string
          _professional_id: string
          _service_id: string
          _slug: string
        }
        Returns: Json
      }
      get_public_site_availability: { Args: { _slug: string }; Returns: Json }
      get_public_site_by_slug: { Args: { _slug: string }; Returns: Json }
      start_trial_if_needed: {
        Args: { _company_id: string }
        Returns: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          company_id: string
          current_period_end: string | null
          current_period_start: string | null
          last_stripe_event_at: string | null
          plan: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "subscriptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "owner" | "admin"
      appointment_status:
        | "pendente"
        | "confirmado"
        | "concluido"
        | "cancelado"
        | "naoCompareceu"
      cancel_actor: "client" | "company" | "system"
      subscription_status: "trial" | "active" | "past_due" | "canceled" | "none"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin"],
      appointment_status: [
        "pendente",
        "confirmado",
        "concluido",
        "cancelado",
        "naoCompareceu",
      ],
      cancel_actor: ["client", "company", "system"],
      subscription_status: ["trial", "active", "past_due", "canceled", "none"],
    },
  },
} as const
