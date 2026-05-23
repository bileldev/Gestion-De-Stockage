import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AdminHeader from '@/components/admin/header'
import KPIDashboard from '@/components/admin/kpi-dashboard'
import MerchandiseManager from '@/components/admin/merchandise-manager'
import SupplierManager from '@/components/admin/supplier-manager'
import InvoiceApproval from '@/components/admin/invoice-approval'
import UserManagement from '@/components/admin/user-management'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  let profile = null
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data
  } catch (error) {
    console.log('Profile not found')
  }

  // Only allow admins
  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard/employee')
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader profile={profile} />

      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Tableau de bord administrateur</h1>
          <p className="text-muted-foreground">Gérez l&apos;inventaire et les utilisateurs</p>
        </div>

        <Tabs defaultValue="kpi" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-6">
            <TabsTrigger value="kpi">KPI</TabsTrigger>
            <TabsTrigger value="merchandise">Marchandises</TabsTrigger>
            <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
            <TabsTrigger value="invoices">Factures</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          </TabsList>

          <TabsContent value="kpi" className="mt-6">
            <KPIDashboard />
          </TabsContent>

          <TabsContent value="merchandise" className="mt-6">
            <MerchandiseManager />
          </TabsContent>

          <TabsContent value="suppliers" className="mt-6">
            <SupplierManager />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <InvoiceApproval />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
