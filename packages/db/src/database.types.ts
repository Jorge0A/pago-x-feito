
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "ai_calls": {
                  Row: {
                    "cache_read_tokens": number,"cache_write_tokens": number,"cost_usd_micros": number,"created_at": string,"duration_ms": number | null,"id": number,"inbox_item_id": string | null,"input_tokens": number,"model": string,"obra_id": string | null,"ok": boolean,"output_tokens": number,"purpose": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cache_read_tokens"?: number,"cache_write_tokens"?: number,"cost_usd_micros"?: number,"created_at"?: string,"duration_ms"?: number | null,"id"?: never,"inbox_item_id"?: string | null,"input_tokens"?: number,"model": string,"obra_id"?: string | null,"ok"?: boolean,"output_tokens"?: number,"purpose": string
                  }
                  Update: {
                    "cache_read_tokens"?: number,"cache_write_tokens"?: number,"cost_usd_micros"?: number,"created_at"?: string,"duration_ms"?: number | null,"id"?: never,"inbox_item_id"?: string | null,"input_tokens"?: number,"model"?: string,"obra_id"?: string | null,"ok"?: boolean,"output_tokens"?: number,"purpose"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_calls_inbox_item_id_fkey"
      columns: ["inbox_item_id"]
isOneToOne: false
      referencedRelation: "inbox_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_calls_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    }
                  ]
                },"budget_lines": {
                  Row: {
                    "budgeted_centavos": number,"category": string,"contract_id": string | null,"contracted_centavos": number | null,"created_at": string,"description": string,"id": string,"obra_id": string,"qty": number | null,"sort_order": number,"source_document_id": string | null,"supplier_id": string | null,"unit": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "budgeted_centavos"?: number,"category": string,"contract_id"?: string | null,"contracted_centavos"?: number | null,"created_at"?: string,"description": string,"id"?: string,"obra_id": string,"qty"?: number | null,"sort_order"?: number,"source_document_id"?: string | null,"supplier_id"?: string | null,"unit"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "budgeted_centavos"?: number,"category"?: string,"contract_id"?: string | null,"contracted_centavos"?: number | null,"created_at"?: string,"description"?: string,"id"?: string,"obra_id"?: string,"qty"?: number | null,"sort_order"?: number,"source_document_id"?: string | null,"supplier_id"?: string | null,"unit"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "budget_lines_contract_id_fkey"
      columns: ["contract_id"]
isOneToOne: false
      referencedRelation: "contracts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budget_lines_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budget_lines_source_document_id_fkey"
      columns: ["source_document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "budget_lines_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"buildings": {
                  Row: {
                    "address": string | null,"approval_process": NonNullable<Json>,"city": string,"created_at": string,"created_by": string | null,"id": string,"name": string,"neighborhood": string | null,"updated_at": string,"work_hours": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"approval_process"?: NonNullable<Json>,"city"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"neighborhood"?: string | null,"updated_at"?: string,"work_hours"?: NonNullable<Json>
                  }
                  Update: {
                    "address"?: string | null,"approval_process"?: NonNullable<Json>,"city"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"neighborhood"?: string | null,"updated_at"?: string,"work_hours"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"contracts": {
                  Row: {
                    "created_at": string,"document_id": string | null,"id": string,"issued_at": string | null,"notes": string | null,"obra_id": string,"signed_at": string | null,"supplier_id": string,"terms": NonNullable<Json>,"title": string,"total_centavos": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"document_id"?: string | null,"id"?: string,"issued_at"?: string | null,"notes"?: string | null,"obra_id": string,"signed_at"?: string | null,"supplier_id": string,"terms"?: NonNullable<Json>,"title": string,"total_centavos": number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"document_id"?: string | null,"id"?: string,"issued_at"?: string | null,"notes"?: string | null,"obra_id"?: string,"signed_at"?: string | null,"supplier_id"?: string,"terms"?: NonNullable<Json>,"title"?: string,"total_centavos"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contracts_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contracts_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contracts_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "building_id": string | null,"created_at": string,"extracted_text": string | null,"id": string,"kind": Database["public"]['Enums']["document_kind"],"mime_type": string | null,"obra_id": string | null,"original_name": string,"pages": number | null,"size_bytes": number | null,"storage_path": string,"uploaded_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "building_id"?: string | null,"created_at"?: string,"extracted_text"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["document_kind"],"mime_type"?: string | null,"obra_id"?: string | null,"original_name": string,"pages"?: number | null,"size_bytes"?: number | null,"storage_path": string,"uploaded_by"?: string | null
                  }
                  Update: {
                    "building_id"?: string | null,"created_at"?: string,"extracted_text"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["document_kind"],"mime_type"?: string | null,"obra_id"?: string | null,"original_name"?: string,"pages"?: number | null,"size_bytes"?: number | null,"storage_path"?: string,"uploaded_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_building_id_fkey"
      columns: ["building_id"]
isOneToOne: false
      referencedRelation: "buildings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"id": number,"obra_id": string,"payload": NonNullable<Json>,"source_document_id": string | null,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"id"?: never,"obra_id": string,"payload"?: NonNullable<Json>,"source_document_id"?: string | null,"type": string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"id"?: never,"obra_id"?: string,"payload"?: NonNullable<Json>,"source_document_id"?: string | null,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_source_document_id_fkey"
      columns: ["source_document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    }
                  ]
                },"inbox_items": {
                  Row: {
                    "attempts": number,"channel": Database["public"]['Enums']["inbox_channel"],"confidence": number | null,"created_at": string,"created_by": string | null,"document_id": string | null,"error": string | null,"id": string,"obra_id": string,"proposal": Json | null,"raw_text": string | null,"status": Database["public"]['Enums']["inbox_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"channel"?: Database["public"]['Enums']["inbox_channel"],"confidence"?: number | null,"created_at"?: string,"created_by"?: string | null,"document_id"?: string | null,"error"?: string | null,"id"?: string,"obra_id": string,"proposal"?: Json | null,"raw_text"?: string | null,"status"?: Database["public"]['Enums']["inbox_status"],"updated_at"?: string
                  }
                  Update: {
                    "attempts"?: number,"channel"?: Database["public"]['Enums']["inbox_channel"],"confidence"?: number | null,"created_at"?: string,"created_by"?: string | null,"document_id"?: string | null,"error"?: string | null,"id"?: string,"obra_id"?: string,"proposal"?: Json | null,"raw_text"?: string | null,"status"?: Database["public"]['Enums']["inbox_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inbox_items_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inbox_items_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    }
                  ]
                },"installments": {
                  Row: {
                    "amount_centavos": number,"contract_id": string,"created_at": string,"due_date": string | null,"id": string,"label": string,"obra_id": string,"sort_order": number,"status": Database["public"]['Enums']["installment_status"],"trigger": Database["public"]['Enums']["installment_trigger"],"trigger_note": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_centavos": number,"contract_id": string,"created_at"?: string,"due_date"?: string | null,"id"?: string,"label": string,"obra_id": string,"sort_order"?: number,"status"?: Database["public"]['Enums']["installment_status"],"trigger"?: Database["public"]['Enums']["installment_trigger"],"trigger_note"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount_centavos"?: number,"contract_id"?: string,"created_at"?: string,"due_date"?: string | null,"id"?: string,"label"?: string,"obra_id"?: string,"sort_order"?: number,"status"?: Database["public"]['Enums']["installment_status"],"trigger"?: Database["public"]['Enums']["installment_trigger"],"trigger_note"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "installments_contract_id_fkey"
      columns: ["contract_id"]
isOneToOne: false
      referencedRelation: "contracts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "installments_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    }
                  ]
                },"obra_members": {
                  Row: {
                    "created_at": string,"obra_id": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"obra_id": string,"role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"obra_id"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "obra_members_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    }
                  ]
                },"obras": {
                  Row: {
                    "building_id": string,"created_at": string,"id": string,"owner_id": string,"start_date": string | null,"status": Database["public"]['Enums']["obra_status"],"title": string,"unit": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "building_id": string,"created_at"?: string,"id"?: string,"owner_id": string,"start_date"?: string | null,"status"?: Database["public"]['Enums']["obra_status"],"title": string,"unit"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "building_id"?: string,"created_at"?: string,"id"?: string,"owner_id"?: string,"start_date"?: string | null,"status"?: Database["public"]['Enums']["obra_status"],"title"?: string,"unit"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "obras_building_id_fkey"
      columns: ["building_id"]
isOneToOne: false
      referencedRelation: "buildings"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount_centavos": number,"budget_line_id": string | null,"created_at": string,"id": string,"installment_id": string | null,"method": Database["public"]['Enums']["payment_method"],"nf_document_id": string | null,"nf_received_at": string | null,"nf_status": Database["public"]['Enums']["nf_status"],"notes": string | null,"obra_id": string,"paid_at": string,"receipt_document_id": string | null,"supplier_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_centavos": number,"budget_line_id"?: string | null,"created_at"?: string,"id"?: string,"installment_id"?: string | null,"method"?: Database["public"]['Enums']["payment_method"],"nf_document_id"?: string | null,"nf_received_at"?: string | null,"nf_status"?: Database["public"]['Enums']["nf_status"],"notes"?: string | null,"obra_id": string,"paid_at": string,"receipt_document_id"?: string | null,"supplier_id": string,"updated_at"?: string
                  }
                  Update: {
                    "amount_centavos"?: number,"budget_line_id"?: string | null,"created_at"?: string,"id"?: string,"installment_id"?: string | null,"method"?: Database["public"]['Enums']["payment_method"],"nf_document_id"?: string | null,"nf_received_at"?: string | null,"nf_status"?: Database["public"]['Enums']["nf_status"],"notes"?: string | null,"obra_id"?: string,"paid_at"?: string,"receipt_document_id"?: string | null,"supplier_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_budget_line_id_fkey"
      columns: ["budget_line_id"]
isOneToOne: false
      referencedRelation: "budget_lines"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_installment_id_fkey"
      columns: ["installment_id"]
isOneToOne: false
      referencedRelation: "installments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_nf_document_id_fkey"
      columns: ["nf_document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_receipt_document_id_fkey"
      columns: ["receipt_document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payments_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string | null,"id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reminder_settings": {
                  Row: {
                    "digest_hour": number,"email": string | null,"enabled": boolean,"last_sent_at": string | null,"obra_id": string,"pending_nf_days": number,"updated_at": string,"worker_registration_days": number
                  }
                  ComputedFields: never
                  Insert: {
                    "digest_hour"?: number,"email"?: string | null,"enabled"?: boolean,"last_sent_at"?: string | null,"obra_id": string,"pending_nf_days"?: number,"updated_at"?: string,"worker_registration_days"?: number
                  }
                  Update: {
                    "digest_hour"?: number,"email"?: string | null,"enabled"?: boolean,"last_sent_at"?: string | null,"obra_id"?: string,"pending_nf_days"?: number,"updated_at"?: string,"worker_registration_days"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "reminder_settings_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: true
      referencedRelation: "obras"
      referencedColumns: ["id"]
    }
                  ]
                },"suppliers": {
                  Row: {
                    "category": string | null,"cnpj": string | null,"contact_name": string | null,"created_at": string,"email": string | null,"id": string,"name": string,"notes": string | null,"obra_id": string,"phone": string | null,"updated_at": string,"whatsapp_number": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string | null,"cnpj"?: string | null,"contact_name"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"obra_id": string,"phone"?: string | null,"updated_at"?: string,"whatsapp_number"?: string | null
                  }
                  Update: {
                    "category"?: string | null,"cnpj"?: string | null,"contact_name"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"obra_id"?: string,"phone"?: string | null,"updated_at"?: string,"whatsapp_number"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "suppliers_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    }
                  ]
                },"task_dependencies": {
                  Row: {
                    "created_at": string,"depends_on_task_id": string,"task_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"depends_on_task_id": string,"task_id": string
                  }
                  Update: {
                    "created_at"?: string,"depends_on_task_id"?: string,"task_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
      columns: ["depends_on_task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_dependencies_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "created_at": string,"ends_at": string,"id": string,"notes": string | null,"obra_id": string,"outside_work_hours": boolean,"starts_at": string,"status": Database["public"]['Enums']["task_status"],"supplier_id": string | null,"title": string,"type": Database["public"]['Enums']["task_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"ends_at": string,"id"?: string,"notes"?: string | null,"obra_id": string,"outside_work_hours"?: boolean,"starts_at": string,"status"?: Database["public"]['Enums']["task_status"],"supplier_id"?: string | null,"title": string,"type"?: Database["public"]['Enums']["task_type"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"ends_at"?: string,"id"?: string,"notes"?: string | null,"obra_id"?: string,"outside_work_hours"?: boolean,"starts_at"?: string,"status"?: Database["public"]['Enums']["task_status"],"supplier_id"?: string | null,"title"?: string,"type"?: Database["public"]['Enums']["task_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_obra_id_fkey"
      columns: ["obra_id"]
isOneToOne: false
      referencedRelation: "obras"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "is_building_member":
{ Args: { "p_building_id": string }; Returns: boolean
                           },
"is_obra_member":
{ Args: { "p_obra_id": string }; Returns: boolean
                           },
"obra_role":
{ Args: { "p_obra_id": string }; Returns: Database["public"]['Enums']["member_role"]
                           }
          }
          Enums: {
            "document_kind": "receipt"|"nf"|"contract"|"budget"|"photo"|"quote"|"building_manual"|"building_procedures"|"assembly_minutes"|"other","inbox_channel": "upload"|"whatsapp"|"chat_export"|"email","inbox_status": "received"|"extracting"|"proposed"|"confirmed"|"discarded"|"failed","installment_status": "pending"|"paid"|"cancelled","installment_trigger": "date"|"delivery"|"milestone","member_role": "owner"|"partner"|"engineer"|"viewer","nf_status": "pending"|"received"|"not_applicable","obra_status": "planning"|"in_progress"|"finished","payment_method": "pix"|"transfer"|"boleto"|"card"|"cash"|"other","task_status": "planned"|"in_progress"|"done"|"cancelled","task_type": "delivery"|"measurement"|"installation"|"payment"|"paperwork"|"access"|"other"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "document_kind": ["receipt", "nf", "contract", "budget", "photo", "quote", "building_manual", "building_procedures", "assembly_minutes", "other"],"inbox_channel": ["upload", "whatsapp", "chat_export", "email"],"inbox_status": ["received", "extracting", "proposed", "confirmed", "discarded", "failed"],"installment_status": ["pending", "paid", "cancelled"],"installment_trigger": ["date", "delivery", "milestone"],"member_role": ["owner", "partner", "engineer", "viewer"],"nf_status": ["pending", "received", "not_applicable"],"obra_status": ["planning", "in_progress", "finished"],"payment_method": ["pix", "transfer", "boleto", "card", "cash", "other"],"task_status": ["planned", "in_progress", "done", "cancelled"],"task_type": ["delivery", "measurement", "installation", "payment", "paperwork", "access", "other"]
          }
        }
} as const
