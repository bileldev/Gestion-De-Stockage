'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Plus, Trash2, AlertCircle } from 'lucide-react'

export default function SupplierManager() {
  const [suppliers, setSuppliers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSuppliers(data || [])
    } catch (error: any) {
      toast.error('Erreur lors du chargement des fournisseurs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSupplier = async (formData: FormData) => {
    setIsSubmitting(true)
    try {
      const name = formData.get('name') as string
      const code = formData.get('code') as string
      const contact_email = formData.get('email') as string
      const phone = formData.get('phone') as string

      // Check if supplier is blocked
      if (name.toLowerCase().includes('eureka') || name.toLowerCase().includes('partner')) {
        toast.error('Ce fournisseur est bloqué pour les opérations de stock')
        setIsSubmitting(false)
        return
      }

      const { error } = await supabase.from('suppliers').insert({
        name,
        code,
        contact_email,
        phone,
      })

      if (error) throw error

      toast.success('Fournisseur ajouté avec succès')
      setIsOpen(false)
      fetchSuppliers()
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'ajout')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return

    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id)
      if (error) throw error
      toast.success('Fournisseur supprimé')
      fetchSuppliers()
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression')
    }
  }

  const isBlockedSupplier = (name: string) => {
    return name.toLowerCase().includes('eureka') || name.toLowerCase().includes('partner')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Gestion des fournisseurs</CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un fournisseur</DialogTitle>
            </DialogHeader>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Les fournisseurs "Eureka" et "Partner" ne peuvent pas être utilisés pour les opérations
              </AlertDescription>
            </Alert>
            <form action={handleAddSupplier} className="space-y-4">
              <div>
                <Label>Nom</Label>
                <Input name="name" placeholder="Nom du fournisseur" required />
              </div>
              <div>
                <Label>Code</Label>
                <Input name="code" placeholder="Code unique" />
              </div>
              <div>
                <Label>Email</Label>
                <Input name="email" type="email" placeholder="contact@example.com" />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input name="phone" placeholder="+216 XX XXX XXX" />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Ajout en cours...' : 'Ajouter'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Aucun fournisseur</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier: any) => (
                  <TableRow key={supplier.id} className={isBlockedSupplier(supplier.name) ? 'bg-red-50' : ''}>
                    <TableCell className="font-medium">
                      {supplier.name}
                      {isBlockedSupplier(supplier.name) && (
                        <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Bloqué
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{supplier.code}</TableCell>
                    <TableCell className="text-sm">{supplier.contact_email}</TableCell>
                    <TableCell className="text-sm">{supplier.phone}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(supplier.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
