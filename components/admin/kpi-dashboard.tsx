'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { toast } from 'sonner'

export default function KPIDashboard() {
  const [stats, setStats] = useState({
    totalMerchandise: 0,
    totalInventory: 0,
    pendingInvoices: 0,
    approvedInvoices: 0,
  })
  const [chartData, setChartData] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      // Get total merchandise
      const { count: merchandiseCount } = await supabase
        .from('merchandise')
        .select('id', { count: 'exact' })

      // Get total inventory quantity
      const { data: inventory } = await supabase
        .from('inventory')
        .select('quantity')

      const totalInventory = inventory?.reduce((sum, item) => sum + item.quantity, 0) || 0

      // Get pending and approved invoices
      const { count: pendingCount } = await supabase
        .from('invoices')
        .select('id', { count: 'exact' })
        .eq('status', 'pending')

      const { count: approvedCount } = await supabase
        .from('invoices')
        .select('id', { count: 'exact' })
        .eq('status', 'approved')

      setStats({
        totalMerchandise: merchandiseCount || 0,
        totalInventory: Math.round(totalInventory * 100) / 100,
        pendingInvoices: pendingCount || 0,
        approvedInvoices: approvedCount || 0,
      })

      // Get operations data for last 30 days
      const { data: operations } = await supabase
        .from('operations')
        .select('operation_type, quantity, created_at')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (operations) {
        const grouped = groupOperationsByDate(operations)
        setChartData(grouped)
      }
    } catch (error: any) {
      toast.error('Erreur lors du chargement des statistiques')
    } finally {
      setIsLoading(false)
    }
  }

  const groupOperationsByDate = (operations: any[]) => {
    const grouped: { [key: string]: { adds: number; removes: number; transfers: number } } = {}

    operations.forEach((op) => {
      const date = new Date(op.created_at).toLocaleDateString('fr-FR')
      if (!grouped[date]) {
        grouped[date] = { adds: 0, removes: 0, transfers: 0 }
      }
      grouped[date][`${op.operation_type}s`] += op.quantity
    })

    return Object.entries(grouped).map(([date, values]) => ({
      date,
      ...values,
    }))
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Marchandises</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMerchandise}</div>
            <p className="text-xs text-muted-foreground">Articles en stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalInventory}</div>
            <p className="text-xs text-muted-foreground">Unités en stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factures en attente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">À approuver</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factures approuvées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedInvoices}</div>
            <p className="text-xs text-muted-foreground">Traitées</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Opérations des 30 derniers jours</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : chartData.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">Aucune donnée disponible</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="adds" stroke="#22c55e" name="Ajouts" />
                <Line type="monotone" dataKey="removes" stroke="#ef4444" name="Retraits" />
                <Line type="monotone" dataKey="transfers" stroke="#3b82f6" name="Transferts" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
