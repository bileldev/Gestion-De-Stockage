import { createClient } from '@/lib/supabase/server'

export async function getWarehouses() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('warehouses').select('*')
  if (error) throw error
  return data
}

export async function getBlocks(warehouseId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('blocks')
    .select('*')
    .eq('warehouse_id', warehouseId)
  if (error) throw error
  return data
}

export async function getInventory(blockId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inventory')
    .select(
      `*,
       merchandise:merchandise_id(*),
       supplier:supplier_id(*)`
    )
    .eq('block_id', blockId)
  if (error) throw error
  return data
}

export async function getMerchandise() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('merchandise').select('*')
  if (error) throw error
  return data
}

export async function getSuppliers() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('suppliers').select('*')
  if (error) throw error
  return data
}

export async function getOperations(limit = 50) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('operations')
    .select(
      `*,
       user:user_id(first_name, last_name),
       merchandise:merchandise_id(name, code),
       from_block:from_block_id(name),
       to_block:to_block_id(name)`
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function getInvoices(status?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('invoices')
    .select(
      `*,
       supplier:supplier_id(name, code)`
    )
    .order('created_at', { ascending: false })
  
  if (status) {
    query = query.eq('status', status)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getSalesData() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('operations')
    .select(
      `quantity,
       merchandise:merchandise_id(name),
       created_at`
    )
    .eq('operation_type', 'remove')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  
  if (error) throw error
  return data
}

export async function getTopSuppliers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('operations')
    .select(
      `quantity,
       merchandise:merchandise_id(name),
       created_at`
    )
    .eq('operation_type', 'add')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  
  if (error) throw error
  return data
}
