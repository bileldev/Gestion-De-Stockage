import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import InventoryManagement from '@/components/employee/inventory-management'
import OperationsHistory from '@/components/employee/operations-history'
import InvoiceUpload from '@/components/employee/invoice-upload'
import EmployeeHeader from '@/components/employee/header'

export default async function EmployeeDashboard() {
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
    console.log('Profile not found, allowing access with user data')
  }

  // If profile doesn't exist yet, use user data
  const displayProfile = profile || {
    id: user.id,
    first_name: user.user_metadata?.first_name || 'User',
    last_name: user.user_metadata?.last_name || '',
    email: user.email,
    role: 'employee',
  }

  return (
    <div className="min-h-screen bg-background">
      <EmployeeHeader profile={displayProfile} />
      
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Bienvenue, {displayProfile.first_name}</h1>
          <p className="text-muted-foreground">Gérez votre inventaire et vos opérations</p>
        </div>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="inventory">Inventaire</TabsTrigger>
            <TabsTrigger value="operations">Opérations</TabsTrigger>
            <TabsTrigger value="invoices">Factures</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="mt-6">
            <InventoryManagement />
          </TabsContent>

          <TabsContent value="operations" className="mt-6">
            <OperationsHistory />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            <InvoiceUpload />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
