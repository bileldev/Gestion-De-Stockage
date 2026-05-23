'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'

export default function MerchandiseManager() {
  const [merchandise, setMerchandise] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchMerchandise()
  }, [])

  const fetchMerchandise = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('merchandise')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMerchandise(data || [])
    } catch (error: any) {
      toast.error('Erreur lors du chargement des marchandises')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMerchandise = async (formData: FormData) => {
    setIsSubmitting(true)
    try {
      const name = formData.get('name') as string
      const code = formData.get('code') as string
      const unit = formData.get('unit') as string
      const description = formData.get('description') as string

      const { error } = await supabase.from('merchandise').insert({
        name,
        code,
        unit,
        description,
      })

      if (error) throw error

      toast.success('Marchandise ajoutée avec succès')
      setIsOpen(false)
      fetchMerchandise()
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'ajout')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette marchandise ?')) return

    try {
      const { error } = await supabase.from('merchandise').delete().eq('id', id)
      if (error) throw error
      toast.success('Marchandise supprimée')
      fetchMerchandise()
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Gestion des marchandises</CardTitle>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une marchandise</DialogTitle>
            </DialogHeader>
            <form action={handleAddMerchandise} className="space-y-4">
              <div>
                <Label>Nom</Label>
                <Input name="name" placeholder="Nom du produit" required />
              </div>
              <div>
                <Label>Code</Label>
                <Input name="code" placeholder="Code unique" required />
              </div>
              <div>
                <Label>Unité</Label>
                <Input name="unit" placeholder="Ex: pièce, kg, l" defaultValue="pièce" />
              </div>
              <div>
                <Label>Description</Label>
                <Input name="description" placeholder="Description" />
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
        ) : merchandise.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Aucune marchandise</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchandise.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.code}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.description}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
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
