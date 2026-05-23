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

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non connecté')

      // Create invoice record
      const invoiceNumber = `INV-${Date.now()}`
      const { error } = await supabase.from('invoices').insert({
        invoice_number: invoiceNumber,
        supplier_id: '00000000-0000-0000-0000-000000000000', // Placeholder
        status: 'pending',
        ocr_data: {
          extracted_text: extractedText,
          timestamp: new Date().toISOString(),
        },
      })

      if (error) throw error

      toast.success('Facture uploadée avec succès. En attente d\'approbation')
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
