export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      api_request_keys: {
        Row: {
          created_at: string
          operation: string
          request_id: string
          request_identity: string
          run_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          operation: string
          request_id: string
          request_identity: string
          run_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          operation?: string
          request_id?: string
          request_identity?: string
          run_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_request_key_run_fk"
            columns: ["user_id", "run_id"]
            isOneToOne: false
            referencedRelation: "simulation_runs"
            referencedColumns: ["user_id", "run_id"]
          },
        ]
      }
      context_confirmation_keys: {
        Row: {
          context_version_id: string
          created_at: string
          operation: string
          request_id: string
          request_identity: string
          user_id: string
        }
        Insert: {
          context_version_id: string
          created_at?: string
          operation: string
          request_id: string
          request_identity: string
          user_id: string
        }
        Update: {
          context_version_id?: string
          created_at?: string
          operation?: string
          request_id?: string
          request_identity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "context_confirmation_context_fk"
            columns: ["user_id", "context_version_id"]
            isOneToOne: false
            referencedRelation: "financial_context_versions"
            referencedColumns: ["user_id", "version_id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          content_payload: Json
          context_version_id: string
          conversation_id: string
          created_at: string
          kind: string
          message_id: string
          run_id: string | null
          sequence_number: number
          user_id: string
        }
        Insert: {
          content_payload: Json
          context_version_id: string
          conversation_id: string
          created_at?: string
          kind: string
          message_id: string
          run_id?: string | null
          sequence_number: number
          user_id: string
        }
        Update: {
          content_payload?: Json
          context_version_id?: string
          conversation_id?: string
          created_at?: string
          kind?: string
          message_id?: string
          run_id?: string | null
          sequence_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_message_conversation_fk"
            columns: ["user_id", "conversation_id", "context_version_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: [
              "user_id",
              "conversation_id",
              "context_version_id",
            ]
          },
          {
            foreignKeyName: "conversation_message_run_fk"
            columns: ["user_id", "run_id", "context_version_id"]
            isOneToOne: false
            referencedRelation: "simulation_runs"
            referencedColumns: ["user_id", "run_id", "context_version_id"]
          },
        ]
      }
      conversation_turns: {
        Row: {
          assistant_message_id: string | null
          completed_at: string | null
          context_version_id: string
          conversation_id: string
          created_at: string
          explanation_fallback_used: boolean
          explanation_prompt_version: string
          explanation_schema_version: string
          failure_category: string | null
          interpretation_kind: string | null
          interpretation_prompt_version: string
          interpretation_schema_version: string
          model_identifier: string
          provider_attempt_count: number
          provider_identifier: string
          referenced_run_id: string | null
          request_id: string
          request_identity: string
          response_payload: Json | null
          status: string
          trusted_timestamp: string
          trusted_timezone: string
          turn_id: string
          user_id: string
          user_message_id: string
        }
        Insert: {
          assistant_message_id?: string | null
          completed_at?: string | null
          context_version_id: string
          conversation_id: string
          created_at?: string
          explanation_fallback_used?: boolean
          explanation_prompt_version: string
          explanation_schema_version: string
          failure_category?: string | null
          interpretation_kind?: string | null
          interpretation_prompt_version: string
          interpretation_schema_version: string
          model_identifier: string
          provider_attempt_count?: number
          provider_identifier: string
          referenced_run_id?: string | null
          request_id: string
          request_identity: string
          response_payload?: Json | null
          status: string
          trusted_timestamp: string
          trusted_timezone: string
          turn_id: string
          user_id: string
          user_message_id: string
        }
        Update: {
          assistant_message_id?: string | null
          completed_at?: string | null
          context_version_id?: string
          conversation_id?: string
          created_at?: string
          explanation_fallback_used?: boolean
          explanation_prompt_version?: string
          explanation_schema_version?: string
          failure_category?: string | null
          interpretation_kind?: string | null
          interpretation_prompt_version?: string
          interpretation_schema_version?: string
          model_identifier?: string
          provider_attempt_count?: number
          provider_identifier?: string
          referenced_run_id?: string | null
          request_id?: string
          request_identity?: string
          response_payload?: Json | null
          status?: string
          trusted_timestamp?: string
          trusted_timezone?: string
          turn_id?: string
          user_id?: string
          user_message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_turn_assistant_message_fk"
            columns: ["user_id", "assistant_message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["user_id", "message_id"]
          },
          {
            foreignKeyName: "conversation_turn_conversation_fk"
            columns: ["user_id", "conversation_id", "context_version_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: [
              "user_id",
              "conversation_id",
              "context_version_id",
            ]
          },
          {
            foreignKeyName: "conversation_turn_run_fk"
            columns: ["user_id", "referenced_run_id", "context_version_id"]
            isOneToOne: false
            referencedRelation: "simulation_runs"
            referencedColumns: ["user_id", "run_id", "context_version_id"]
          },
          {
            foreignKeyName: "conversation_turn_user_message_fk"
            columns: ["user_id", "user_message_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["user_id", "message_id"]
          },
        ]
      }
      conversations: {
        Row: {
          context_version_id: string
          conversation_id: string
          created_at: string
          latest_activity_at: string
          orchestration_version: string
          pending_clarification: Json | null
          selected_run_id: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          context_version_id: string
          conversation_id: string
          created_at?: string
          latest_activity_at?: string
          orchestration_version: string
          pending_clarification?: Json | null
          selected_run_id?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          context_version_id?: string
          conversation_id?: string
          created_at?: string
          latest_activity_at?: string
          orchestration_version?: string
          pending_clarification?: Json | null
          selected_run_id?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_context_fk"
            columns: ["user_id", "context_version_id"]
            isOneToOne: false
            referencedRelation: "financial_context_versions"
            referencedColumns: ["user_id", "version_id"]
          },
          {
            foreignKeyName: "conversation_selected_run_fk"
            columns: ["user_id", "selected_run_id", "context_version_id"]
            isOneToOne: false
            referencedRelation: "simulation_runs"
            referencedColumns: ["user_id", "run_id", "context_version_id"]
          },
        ]
      }
      financial_context_versions: {
        Row: {
          compatible_calendar_version: string
          compatible_rules_version: string
          confirmation_reason: string
          context_id: string
          created_at: string
          domain_schema_version: string
          onboarding_request_hash: string | null
          origin: string
          payload: Json
          payload_hash: string | null
          persistence_schema_version: string
          predecessor_version_id: string | null
          source: string
          user_id: string
          version_id: string
        }
        Insert: {
          compatible_calendar_version?: string
          compatible_rules_version?: string
          confirmation_reason: string
          context_id: string
          created_at?: string
          domain_schema_version: string
          onboarding_request_hash?: string | null
          origin: string
          payload: Json
          payload_hash?: string | null
          persistence_schema_version: string
          predecessor_version_id?: string | null
          source: string
          user_id: string
          version_id: string
        }
        Update: {
          compatible_calendar_version?: string
          compatible_rules_version?: string
          confirmation_reason?: string
          context_id?: string
          created_at?: string
          domain_schema_version?: string
          onboarding_request_hash?: string | null
          origin?: string
          payload?: Json
          payload_hash?: string | null
          persistence_schema_version?: string
          predecessor_version_id?: string | null
          source?: string
          user_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_context_predecessor_fk"
            columns: ["user_id", "predecessor_version_id"]
            isOneToOne: false
            referencedRelation: "financial_context_versions"
            referencedColumns: ["user_id", "version_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          current_financial_context_version_id: string | null
          display_name: string
          is_demo: boolean
          onboarding_state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_financial_context_version_id?: string | null
          display_name: string
          is_demo?: boolean
          onboarding_state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_financial_context_version_id?: string | null
          display_name?: string
          is_demo?: boolean
          onboarding_state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_context_fk"
            columns: ["user_id", "current_financial_context_version_id"]
            isOneToOne: false
            referencedRelation: "financial_context_versions"
            referencedColumns: ["user_id", "version_id"]
          },
        ]
      }
      scenarios: {
        Row: {
          baseline_id: string
          context_version_id: string
          created_at: string
          definition_hash: string | null
          definition_payload: Json
          derived_from_scenario_id: string | null
          parent_scenario_id: string | null
          scenario_id: string
          scenario_kind: string
          user_id: string
        }
        Insert: {
          baseline_id: string
          context_version_id: string
          created_at?: string
          definition_hash?: string | null
          definition_payload: Json
          derived_from_scenario_id?: string | null
          parent_scenario_id?: string | null
          scenario_id: string
          scenario_kind: string
          user_id: string
        }
        Update: {
          baseline_id?: string
          context_version_id?: string
          created_at?: string
          definition_hash?: string | null
          definition_payload?: Json
          derived_from_scenario_id?: string | null
          parent_scenario_id?: string | null
          scenario_id?: string
          scenario_kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_baseline_fk"
            columns: ["user_id", "baseline_id"]
            isOneToOne: false
            referencedRelation: "simulation_baselines"
            referencedColumns: ["user_id", "baseline_id"]
          },
          {
            foreignKeyName: "scenario_context_fk"
            columns: ["user_id", "context_version_id"]
            isOneToOne: false
            referencedRelation: "financial_context_versions"
            referencedColumns: ["user_id", "version_id"]
          },
          {
            foreignKeyName: "scenario_derived_from_fk"
            columns: ["user_id", "derived_from_scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["user_id", "scenario_id"]
          },
          {
            foreignKeyName: "scenario_parent_fk"
            columns: ["user_id", "parent_scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["user_id", "scenario_id"]
          },
        ]
      }
      simulation_baselines: {
        Row: {
          baseline_id: string
          calendar_version: string
          context_version_id: string
          created_at: string
          input_identity: string
          projection_hash: string | null
          projection_payload: Json
          rules_version: string
          user_id: string
        }
        Insert: {
          baseline_id: string
          calendar_version: string
          context_version_id: string
          created_at?: string
          input_identity: string
          projection_hash?: string | null
          projection_payload: Json
          rules_version: string
          user_id: string
        }
        Update: {
          baseline_id?: string
          calendar_version?: string
          context_version_id?: string
          created_at?: string
          input_identity?: string
          projection_hash?: string | null
          projection_payload?: Json
          rules_version?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_baseline_context_fk"
            columns: ["user_id", "context_version_id"]
            isOneToOne: false
            referencedRelation: "financial_context_versions"
            referencedColumns: ["user_id", "version_id"]
          },
        ]
      }
      simulation_runs: {
        Row: {
          baseline_id: string
          calendar_fallback_metadata: Json
          calendar_version: string
          canonical_request: Json
          context_version_id: string
          created_at: string
          deterministic_classification: string
          input_identity: string
          material_assumptions: Json
          output_identity: string
          parent_scenario_id: string | null
          projection_horizons: Json
          request_id: string
          request_identity: string
          response_hash: string | null
          response_payload: Json
          response_schema_version: string
          rules_version: string
          run_id: string
          scenario_id: string
          scenario_kind: string
          user_id: string
        }
        Insert: {
          baseline_id: string
          calendar_fallback_metadata: Json
          calendar_version: string
          canonical_request: Json
          context_version_id: string
          created_at?: string
          deterministic_classification: string
          input_identity: string
          material_assumptions: Json
          output_identity: string
          parent_scenario_id?: string | null
          projection_horizons: Json
          request_id: string
          request_identity: string
          response_hash?: string | null
          response_payload: Json
          response_schema_version: string
          rules_version: string
          run_id: string
          scenario_id: string
          scenario_kind: string
          user_id: string
        }
        Update: {
          baseline_id?: string
          calendar_fallback_metadata?: Json
          calendar_version?: string
          canonical_request?: Json
          context_version_id?: string
          created_at?: string
          deterministic_classification?: string
          input_identity?: string
          material_assumptions?: Json
          output_identity?: string
          parent_scenario_id?: string | null
          projection_horizons?: Json
          request_id?: string
          request_identity?: string
          response_hash?: string | null
          response_payload?: Json
          response_schema_version?: string
          rules_version?: string
          run_id?: string
          scenario_id?: string
          scenario_kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_run_baseline_fk"
            columns: ["user_id", "baseline_id"]
            isOneToOne: false
            referencedRelation: "simulation_baselines"
            referencedColumns: ["user_id", "baseline_id"]
          },
          {
            foreignKeyName: "simulation_run_context_fk"
            columns: ["user_id", "context_version_id"]
            isOneToOne: false
            referencedRelation: "financial_context_versions"
            referencedColumns: ["user_id", "version_id"]
          },
          {
            foreignKeyName: "simulation_run_parent_scenario_fk"
            columns: ["user_id", "parent_scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["user_id", "scenario_id"]
          },
          {
            foreignKeyName: "simulation_run_scenario_fk"
            columns: ["user_id", "scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["user_id", "scenario_id"]
          },
        ]
      }
      workplace_associations: {
        Row: {
          association_source: string
          created_at: string
          updated_at: string
          user_id: string
          verification_status: string
          workplace_name: string
        }
        Insert: {
          association_source: string
          created_at?: string
          updated_at?: string
          user_id: string
          verification_status: string
          workplace_name: string
        }
        Update: {
          association_source?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          verification_status?: string
          workplace_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      begin_conversation_turn: {
        Args: {
          p_conversation_id: string
          p_explanation_prompt_version: string
          p_explanation_schema_version: string
          p_interpretation_prompt_version: string
          p_interpretation_schema_version: string
          p_message_text: string
          p_model_identifier: string
          p_provider_identifier: string
          p_request_id: string
          p_request_identity: string
          p_trusted_timestamp: string
          p_trusted_timezone: string
          p_turn_id: string
          p_user_message_id: string
        }
        Returns: {
          response_payload: Json
          status: string
          turn_id: string
        }[]
      }
      canonical_jsonb_sha256: {
        Args: { value: Json }
        Returns: string
      }
      complete_conversation_turn: {
        Args: {
          p_assistant_content: Json
          p_assistant_kind: string
          p_assistant_message_id: string
          p_conversation_id: string
          p_explanation_fallback_used: boolean
          p_failure_category: string
          p_final_status: string
          p_interpretation_kind: string
          p_pending_clarification: Json
          p_provider_attempt_count: number
          p_referenced_run_id: string
          p_response_payload: Json
          p_selected_run_id: string
          p_turn_id: string
        }
        Returns: undefined
      }
      confirm_financial_context_version: {
        Args: {
          p_calendar_version: string
          p_confirmation_reason: string
          p_context_id: string
          p_domain_schema_version: string
          p_expected_current_version_id: string
          p_onboarding_request_hash: string
          p_operation: string
          p_origin: string
          p_payload: Json
          p_persistence_schema_version: string
          p_request_id: string
          p_request_identity: string
          p_rules_version: string
          p_source: string
          p_version_id: string
        }
        Returns: {
          context_version_id: string
          status: string
        }[]
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

