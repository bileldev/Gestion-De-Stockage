'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function OperationsHistory() {
  const [operations, setOperations] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchOperations()
    const subscription = supabase
      .channel('operations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'operations' },
        () => fetchOperations()
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchOperations = async () => {
    setIsLoading(true)
    try {
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
        .limit(100)

      if (error) throw error
      setOperations(data || [])
    } catch (error: any) {
      toast.error('Erreur lors du chargement des opérations')
    } finally {
      setIsLoading(false)
    }
  }

  const getOperationBadgeColor = (type: string) => {
    switch (type) {
      case 'add':
        return 'bg-green-100 text-green-800'
      case 'remove':
        return 'bg-red-100 text-red-800'
      case 'transfer':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getOperationLabel = (type: string) => {
    switch (type) {
      case 'add':
        return 'Ajout'
      case 'remove':
        return 'Retrait'
      case 'transfer':
        return 'Transfert'
      default:
        return type
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des opérations</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Chargement...</div>
        ) : operations.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">Aucune opération enregistrée</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Marchandise</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>À</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.map((op: any) => (
                  <TableRow key={op.id}>
                    <TableCell>
                      <Badge className={getOperationBadgeColor(op.operation_type)}>
                        {getOperationLabel(op.operation_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {op.merchandise?.name}
                      <span className="text-xs text-muted-foreground block">{op.merchandise?.code}</span>
                    </TableCell>
                    <TableCell>{op.quantity}</TableCell>
                    <TableCell>{op.from_block?.name || '-'}</TableCell>
                    <TableCell>{op.to_block?.name || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {op.user?.first_name} {op.user?.last_name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDistanceToNow(new Date(op.created_at), { locale: fr, addSuffix: true })}
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
