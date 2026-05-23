'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Plus, AlertCircle } from 'lucide-react'
import { isSupplierBlocked, validateQuantity } from '@/lib/validations'

export default function InventoryManagement() {
  const [warehouses, setWarehouses] = useState([])
  const [blocks, setBlocks] = useState([])
  const [inventory, setInventory] = useState([])
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [selectedBlock, setSelectedBlock] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchWarehouses()
  }, [])

  useEffect(() => {
    if (selectedWarehouse) {
      fetchBlocks(selectedWarehouse)
      setSelectedBlock('')
      setInventory([])
    }
  }, [selectedWarehouse])

  useEffect(() => {
    if (selectedBlock) {
      fetchInventory(selectedBlock)
    }
  }, [selectedBlock])

  const fetchWarehouses = async () => {
    const { data, error } = await supabase.from('warehouses').select('*')
    if (error) {
      toast.error('Erreur lors du chargement des entrepôts')
      return
    }
    setWarehouses(data || [])
  }

  const fetchBlocks = async (warehouseId: string) => {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .eq('warehouse_id', warehouseId)
    if (error) {
      toast.error('Erreur lors du chargement des blocs')
      return
    }
    setBlocks(data || [])
  }

  const fetchInventory = async (blockId: string) => {
    const { data, error } = await supabase
      .from('inventory')
      .select(
        `*,
         merchandise:merchandise_id(name, code, unit),
         supplier:supplier_id(name)`
      )
      .eq('block_id', blockId)
    if (error) {
      toast.error('Erreur lors du chargement de l\'inventaire')
      return
    }
    setInventory(data || [])
  }

  const handleAddStock = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const merchandiseId = formData.get('merchandise')
      const quantity = parseFloat(formData.get('quantity') as string)
      const supplierId = formData.get('supplier')

      // Validate quantity
      const quantityValidation = validateQuantity(quantity)
      if (!quantityValidation.valid) {
        toast.error(quantityValidation.error || 'Quantité invalide')
        setIsLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      // Check for blocked suppliers
      const { data: supplier } = await supabase
        .from('suppliers')
        .select('name')
        .eq('id', supplierId)
        .single()

      if (supplier && isSupplierBlocked(supplier.name)) {
        toast.error(`Opération non autorisée: Le fournisseur "${supplier.name}" est bloqué`)
        setIsLoading(false)
        return
      }

      // Add inventory
      const { error: invError } = await supabase.from('inventory').insert({
        block_id: selectedBlock,
        merchandise_id: merchandiseId,
        quantity,
        supplier_id: supplierId,
      })

      if (invError && invError.code !== '23505') throw invError

      // Log operation
      const { data: operation } = await supabase.from('operations').insert({
        user_id: user.id,
        operation_type: 'add',
        merchandise_id: merchandiseId,
        to_block_id: selectedBlock,
        quantity,
      }).select().single()

      // Get merchandise details for email
      const { data: merchandise } = await supabase
        .from('merchandise')
        .select('name')
        .eq('id', merchandiseId)
        .single()

      // Send email notification
      if (merchandise && user.user_metadata?.first_name) {
        const userName = `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
        await fetch('/api/email/send-operation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operationType: 'add',
            merchandiseName: merchandise.name,
            quantity,
            userName,
          }),
        }).catch(() => {}) // Silently fail if email service unavailable
      }

      toast.success('Stock ajouté avec succès')
      setIsOpen(false)
      fetchInventory(selectedBlock)
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'ajout du stock')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sélectionner un emplacement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <div>
              <Label>Entrepôt</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un entrepôt" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bloc</Label>
              <Select value={selectedBlock} onValueChange={setSelectedBlock} disabled={!selectedWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un bloc" />
                </SelectTrigger>
                <SelectContent>
                  {blocks.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.location_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedBlock && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Inventaire du bloc</CardTitle>
              <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Ajouter du stock
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter du stock</DialogTitle>
                  </DialogHeader>
                  <form action={handleAddStock} className="space-y-4">
                    <div>
                      <Label>Marchandise</Label>
                      <Input type="hidden" name="merchandise" id="merchandise" />
                      <Input type="text" placeholder="Sélectionner une marchandise" />
                    </div>
                    <div>
                      <Label>Quantité</Label>
                      <Input type="number" name="quantity" placeholder="0" step="0.001" required />
                    </div>
                    <div>
                      <Label>Fournisseur</Label>
                      <Input type="hidden" name="supplier" id="supplier" />
                      <Input type="text" placeholder="Sélectionner un fournisseur" />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading ? 'Ajout en cours...' : 'Ajouter'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marchandise</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead>Fournisseur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Aucun inventaire dans ce bloc
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventory.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.merchandise?.name}</TableCell>
                        <TableCell>{item.merchandise?.code}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{item.merchandise?.unit}</TableCell>
                        <TableCell>{item.supplier?.name || 'N/A'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
