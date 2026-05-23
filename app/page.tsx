import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/auth/login')
    }

    // If user exists, redirect to employee dashboard
    // The profile may not exist yet (during account creation)
    // so we just redirect to the employee dashboard which will handle it
    redirect('/dashboard/employee')
  } catch (error) {
    console.error('[v0] Home page error:', error)
    redirect('/auth/login')
  }
}
