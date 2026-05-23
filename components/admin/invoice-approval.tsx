'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Check, X, Eye } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function InvoiceApproval() {
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchInvoices()
    const subscription = supabase
      .channel('invoices_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        () => fetchInvoices()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error: any) {
      toast.error('Erreur lors du chargement des factures')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (invoiceId: string) => {
    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'approved' })
        .eq('id', invoiceId)

      if (error) throw error

      // Send email notification
      if (selectedInvoice) {
        await fetch('/api/email/send-approval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceNumber: selectedInvoice.invoice_number,
            totalAmount: selectedInvoice.total_amount,
          }),
        })
      }

      toast.success('Facture approuvée et email envoyé')
      setIsOpen(false)
      fetchInvoices()
    } catch (error: any) {
      toast.error('Erreur lors de l\'approbation')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async (invoiceId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir rejeter cette facture ?')) return

    setIsProcessing(true)
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'rejected' })
        .eq('id', invoiceId)

      if (error) throw error

      toast.success('Facture rejetée')
      setIsOpen(false)
      fetchInvoices()
    } catch (error: any) {
      toast.error('Erreur lors du rejet')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">En attente</Badge>
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approuvée</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejetée</Badge>
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approbation des factures</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Aucune facture</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro de facture</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice: any) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>{invoice.total_amount} TND</TableCell>
                    <TableCell className="text-sm">
                      {formatDistanceToNow(new Date(invoice.created_at), {
                        locale: fr,
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedInvoice(invoice)
                          setIsOpen(true)
                        }}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </Button>
                      {invoice.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleApprove(invoice.id)}
                            disabled={isProcessing}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReject(invoice.id)}
                            disabled={isProcessing}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de la facture</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="grid gap-4 grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Numéro de facture</p>
                  <p className="font-medium">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Montant</p>
                  <p className="font-medium">{selectedInvoice.total_amount} TND</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {new Date(selectedInvoice.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              {selectedInvoice.ocr_data?.extracted_text && (
                <div>
                  <p className="text-sm font-medium mb-2">Texte extrait (OCR)</p>
                  <div className="bg-muted p-4 rounded-lg max-h-48 overflow-y-auto text-sm">
                    {selectedInvoice.ocr_data.extracted_text}
                  </div>
                </div>
              )}

              {selectedInvoice.status === 'pending' && (
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Fermer
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedInvoice.id)}
                    disabled={isProcessing}
                  >
                    Rejeter
                  </Button>
                  <Button
                    onClick={() => handleApprove(selectedInvoice.id)}
                    disabled={isProcessing}
                  >
                    Approuver
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
