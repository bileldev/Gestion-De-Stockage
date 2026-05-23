'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Upload, Loader2 } from 'lucide-react'
import Tesseract from 'tesseract.js'

export default function InvoiceUpload() {
  const [isLoading, setIsLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  const supabase = createClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)
    }
  }

  const extractInvoiceData = (text: string) => {
    // Extract invoice number
    const invoiceMatch = text.match(/(?:Facture|FV|Numéro|Invoice)\s*(?:Numéro)?\s*[\s:]*([A-Z0-9\/]+)/i)
    const invoiceNumber = invoiceMatch?.[1] || `INV-${Date.now()}`

    // Extract total amount (look for "Total" patterns)
    const totalMatch = text.match(/Total\s*(?:HT|TTC|:)?\s*([\d,.\s]+)/)
    const totalAmount = totalMatch ? parseFloat(totalMatch[1].replace(/\s+/g, '').replace(',', '.')) : 0

    // Extract supplier name (usually after company info lines)
    const supplierMatch = text.match(/(?:STE|S\.A\.R\.L|C\.F\.|ITAP|STIF|Eureka|Partner)[^.]*/)
    const supplierName = supplierMatch?.[0]?.trim() || 'Fournisseur Inconnu'

    // Extract date
    const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i)
    const invoiceDate = dateMatch?.[1] || new Date().toISOString()

    // Extract line items
    const lineItems: any[] = []
    const itemRegex = /([^\n]*?)\s+([\d,]+)\s+(?:\d+%)?[\s\d,]*?([\d,]+)\s*(?:TND|DT)?/g
    let itemMatch
    while ((itemMatch = itemRegex.exec(text)) !== null) {
      if (itemMatch[1].length > 5) { // Filter out noise
        lineItems.push({
          description: itemMatch[1].trim(),
          quantity: parseFloat(itemMatch[2].replace(/\s+/g, '').replace(',', '.')),
          amount: parseFloat(itemMatch[3].replace(/\s+/g, '').replace(',', '.')),
        })
      }
    }

    return {
      invoiceNumber,
      supplierName,
      totalAmount,
      invoiceDate,
      lineItems,
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Veuillez sélectionner une facture')
      return
    }

    setIsLoading(true)
    try {
      // Process OCR
      const result = await Tesseract.recognize(file, 'ara+eng+fra', {
        logger: (info) => console.log('[v0] OCR progress:', info.progress),
      })

      const extractedText = result.data.text
      console.log('[v0] Extracted text:', extractedText)

      // Extract structured data
      const invoiceData = extractInvoiceData(extractedText)
      console.log('[v0] Parsed invoice data:', invoiceData)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      // Find supplier by name
      let supplierId = null
      if (invoiceData.supplierName !== 'Fournisseur Inconnu') {
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('id')
          .ilike('name', `%${invoiceData.supplierName.split(' ')[0]}%`)
          .single()
        supplierId = supplier?.id
      }

      // Create invoice record
      const { error } = await supabase.from('invoices').insert({
        invoice_number: invoiceData.invoiceNumber,
        supplier_id: supplierId || '00000000-0000-0000-0000-000000000000',
        total_amount: invoiceData.totalAmount,
        status: 'pending',
        ocr_data: {
          extracted_text: extractedText,
          supplier_name: invoiceData.supplierName,
          invoice_date: invoiceData.invoiceDate,
          line_items: invoiceData.lineItems,
          timestamp: new Date().toISOString(),
        },
      })

      if (error) throw error

      toast.success(`Facture ${invoiceData.invoiceNumber} uploadée. En attente d'approbation`)
      setFile(null)
      setPreviewUrl('')
    } catch (error: any) {
      console.error('[v0] Error:', error)
      toast.error(error.message || 'Erreur lors du traitement de la facture')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload de factures</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border-2 border-dashed rounded-lg p-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <Upload className="w-8 h-8 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium">Glissez votre facture ou cliquez pour sélectionner</p>
              <p className="text-sm text-muted-foreground">Formats acceptés: PNG, JPG, PDF</p>
            </div>
            <Label htmlFor="invoice-input" className="cursor-pointer">
              <div className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition">
                Sélectionner une facture
              </div>
              <input
                id="invoice-input"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading}
              />
            </Label>
          </div>
        </div>

        {previewUrl && (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <img src={previewUrl} alt="Preview" className="w-full max-h-96 object-contain" />
            </div>
            <p className="text-sm text-muted-foreground">{file?.name}</p>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={!file || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Traitement en cours...
            </>
          ) : (
            'Soumettre la facture'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
