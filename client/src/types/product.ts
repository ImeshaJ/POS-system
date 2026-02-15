export type ApiProduct = {
  id: number
  code?: string | null
  name: string
  category?: string | null
  unit?: string | null
  size?: string | null
  weight?: string | null
  cost_price?: string | number | null
  selling_price?: string | number | null
  expiry_date?: string | null
  reorder_level?: number | null
  supplier_id?: number | null
  quantity?: number | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}
