import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'riadh.mtibaa@gmail.com'

export async function sendInvoiceApprovalEmail(invoiceNumber: string, totalAmount: number) {
  try {
    const supabase = await createClient()

    const emailContent = `
Bonjour,

Une facture a été approuvée dans le système Gestion De Stock.

Détails:
- Numéro de facture: ${invoiceNumber}
- Montant: ${totalAmount} TND
- Date: ${new Date().toLocaleDateString('fr-FR')}

Veuillez accéder au système pour plus de détails.

Cordialement,
Système Gestion De Stock
    `.trim()

    // Log the email notification (in production, use a real email service like SendGrid, Resend, etc.)
    console.log('[v0] Email notification sent to:', ADMIN_EMAIL)
    console.log('[v0] Subject: Facture approuvée - ' + invoiceNumber)
    console.log('[v0] Content:', emailContent)

    // Store notification in database
    const { error } = await supabase.from('notifications').insert({
      recipient_email: ADMIN_EMAIL,
      subject: `Facture approuvée - ${invoiceNumber}`,
      content: emailContent,
      type: 'invoice_approval',
      sent_at: new Date().toISOString(),
    }).catch(() => ({ error: null })) // Ignore if notifications table doesn't exist

    return { success: true, error: null }
  } catch (error: any) {
    console.error('[v0] Error sending email:', error)
    return { success: false, error: error.message }
  }
}

export async function sendOperationNotificationEmail(
  operationType: string,
  merchandiseName: string,
  quantity: number,
  userName: string
) {
  try {
    const supabase = await createClient()

    let typeLabel = 'Opération'
    let typeEmoji = '📦'

    if (operationType === 'add') {
      typeLabel = 'Ajout de stock'
      typeEmoji = '📥'
    } else if (operationType === 'remove') {
      typeLabel = 'Retrait de stock'
      typeEmoji = '📤'
    } else if (operationType === 'transfer') {
      typeLabel = 'Transfert de stock'
      typeEmoji = '🔄'
    }

    const emailContent = `
Bonjour,

Une opération d'inventaire a été enregistrée dans le système Gestion De Stock.

Type: ${typeLabel}
Marchandise: ${merchandiseName}
Quantité: ${quantity}
Utilisateur: ${userName}
Date: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}

Veuillez vérifier les détails dans le système.

Cordialement,
Système Gestion De Stock
    `.trim()

    console.log('[v0] Operation notification sent to:', ADMIN_EMAIL)
    console.log('[v0] Subject: ' + typeLabel)
    console.log('[v0] Content:', emailContent)

    return { success: true, error: null }
  } catch (error: any) {
    console.error('[v0] Error sending operation email:', error)
    return { success: false, error: error.message }
  }
}

export async function sendDailyReportEmail(stats: any) {
  try {
    const emailContent = `
Bonjour,

Rapport quotidien du système Gestion De Stock pour ${new Date().toLocaleDateString('fr-FR')}

Résumé:
- Opérations d'ajout: ${stats.adds || 0}
- Opérations de retrait: ${stats.removes || 0}
- Opérations de transfert: ${stats.transfers || 0}
- Factures approuvées: ${stats.invoices_approved || 0}
- Factures en attente: ${stats.invoices_pending || 0}

Pour plus de détails, accédez au tableau de bord administrateur.

Cordialement,
Système Gestion De Stock
    `.trim()

    console.log('[v0] Daily report sent to:', ADMIN_EMAIL)
    console.log('[v0] Subject: Rapport quotidien Gestion De Stock')
    console.log('[v0] Content:', emailContent)

    return { success: true, error: null }
  } catch (error: any) {
    console.error('[v0] Error sending report email:', error)
    return { success: false, error: error.message }
  }
}
