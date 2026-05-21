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
      ai_insights: {
        Row: {
          completion_tokens: number | null
          cost_micro_usd: number | null
          created_at: string
          generated_at: string
          id: string
          message: string
          metadata: Json
          model_used: string | null
          period: string
          prompt_tokens: number | null
          type: string
          user_id: string
        }
        Insert: {
          completion_tokens?: number | null
          cost_micro_usd?: number | null
          created_at?: string
          generated_at?: string
          id?: string
          message: string
          metadata?: Json
          model_used?: string | null
          period: string
          prompt_tokens?: number | null
          type: string
          user_id: string
        }
        Update: {
          completion_tokens?: number | null
          cost_micro_usd?: number | null
          created_at?: string
          generated_at?: string
          id?: string
          message?: string
          metadata?: Json
          model_used?: string | null
          period?: string
          prompt_tokens?: number | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount_cents: number
          category_id: string
          created_at: string
          id: string
          period: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          category_id: string
          created_at?: string
          id?: string
          period: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          category_id?: string
          created_at?: string
          id?: string
          period?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_default: boolean
          keywords: string[]
          name: string
          sort_order: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id: string
          is_default?: boolean
          keywords?: string[]
          name: string
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          keywords?: string[]
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_cents: number
          category_id: string
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          metadata: Json
          occurred_at: string
          payment_method: string
          recurring_rule: Json | null
          source: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          category_id: string
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          metadata?: Json
          occurred_at?: string
          payment_method?: string
          recurring_rule?: Json | null
          source?: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          category_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          payment_method?: string
          recurring_rule?: Json | null
          source?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      incomes: {
        Row: {
          amount_cents: number
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          is_recurring: boolean
          received_at: string
          recurring_rule: Json | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          is_recurring?: boolean
          received_at?: string
          recurring_rule?: Json | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          is_recurring?: boolean
          received_at?: string
          recurring_rule?: Json | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          billing_closing_day: number | null
          created_at: string
          currency: string
          email: string
          id: string
          name: string
          phone: string | null
          salary_day: number | null
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          billing_closing_day?: number | null
          created_at?: string
          currency?: string
          email: string
          id: string
          name: string
          phone?: string | null
          salary_day?: number | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          billing_closing_day?: number | null
          created_at?: string
          currency?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          salary_day?: number | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          created_at: string
          id: string
          parse_error: string | null
          parsed_expense_id: string | null
          phone: string
          provider: string | null
          provider_message_id: string | null
          raw_text: string
          received_at: string
          responded_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          parse_error?: string | null
          parsed_expense_id?: string | null
          phone: string
          provider?: string | null
          provider_message_id?: string | null
          raw_text: string
          received_at?: string
          responded_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          parse_error?: string | null
          parsed_expense_id?: string | null
          phone?: string
          provider?: string | null
          provider_message_id?: string | null
          raw_text?: string
          received_at?: string
          responded_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_parsed_expense_id_fkey"
            columns: ["parsed_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
