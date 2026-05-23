/**
 * Validation and safety rules for Gestion De Stock
 */

// List of blocked suppliers for inventory operations
const BLOCKED_SUPPLIERS = ['eureka', 'partner']

/**
 * Check if a supplier is blocked for operations
 */
export function isSupplierBlocked(supplierName: string): boolean {
  return BLOCKED_SUPPLIERS.some(blocked => 
    supplierName.toLowerCase().includes(blocked)
  )
}

/**
 * Get the French error message for blocked supplier
 */
export function getBlockedSupplierErrorMessage(supplierName: string): string {
  return `Opération non autorisée: Le fournisseur "${supplierName}" est bloqué pour les opérations de stock. Veuillez contacter un administrateur.`
}

/**
 * Validate quantity input
 */
export function validateQuantity(quantity: any): { valid: boolean; error?: string } {
  const parsed = parseFloat(quantity)
  
  if (isNaN(parsed)) {
    return { valid: false, error: 'La quantité doit être un nombre valide' }
  }
  
  if (parsed <= 0) {
    return { valid: false, error: 'La quantité doit être supérieure à 0' }
  }
  
  if (parsed > 1000000) {
    return { valid: false, error: 'La quantité est trop grande (max: 1 000 000)' }
  }
  
  return { valid: true }
}

/**
 * Validate merchandise code
 */
export function validateMerchandiseCode(code: string): { valid: boolean; error?: string } {
  if (!code || code.trim().length === 0) {
    return { valid: false, error: 'Le code de marchandise est requis' }
  }
  
  if (code.length > 50) {
    return { valid: false, error: 'Le code doit faire moins de 50 caractères' }
  }
  
  if (!/^[a-zA-Z0-9\-_]+$/.test(code)) {
    return { valid: false, error: 'Le code ne peut contenir que des lettres, chiffres, tirets et underscores' }
  }
  
  return { valid: true }
}

/**
 * Validate email
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!email || !emailRegex.test(email)) {
    return { valid: false, error: 'Email invalide' }
  }
  
  return { valid: true }
}

/**
 * Validate warehouse name
 */
export function validateWarehouseName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Le nom de l\'entrepôt est requis' }
  }
  
  if (name.length > 100) {
    return { valid: false, error: 'Le nom doit faire moins de 100 caractères' }
  }
  
  return { valid: true }
}

/**
 * Validate invoice number format
 */
export function validateInvoiceNumber(invoiceNumber: string): { valid: boolean; error?: string } {
  if (!invoiceNumber || invoiceNumber.trim().length === 0) {
    return { valid: false, error: 'Le numéro de facture est requis' }
  }
  
  if (invoiceNumber.length > 50) {
    return { valid: false, error: 'Le numéro de facture doit faire moins de 50 caractères' }
  }
  
  return { valid: true }
}

/**
 * Check if user has permission for operation
 */
export function canPerformOperation(userRole: string, operationType: string): boolean {
  // Employees can perform add, remove, transfer operations
  if (userRole === 'employee') {
    return ['add', 'remove', 'transfer'].includes(operationType)
  }
  
  // Admins can perform any operation
  if (userRole === 'admin') {
    return true
  }
  
  return false
}

/**
 * Safety check before inventory operation
 */
export async function performSafetyCheck(
  operationType: string,
  supplierId: string | null,
  quantity: number,
  currentQuantity: number,
  supplierName?: string
): Promise<{ safe: boolean; error?: string }> {
  // Check if supplier is blocked
  if (supplierId && supplierName && isSupplierBlocked(supplierName)) {
    return { 
      safe: false, 
      error: getBlockedSupplierErrorMessage(supplierName) 
    }
  }
  
  // Check quantity validation
  const quantityValidation = validateQuantity(quantity)
  if (!quantityValidation.valid) {
    return { safe: false, error: quantityValidation.error }
  }
  
  // Check if remove operation would result in negative quantity
  if (operationType === 'remove' && (currentQuantity - quantity) < 0) {
    return { 
      safe: false, 
      error: `Quantité insuffisante. Disponible: ${currentQuantity}, Demandé: ${quantity}` 
    }
  }
  
  return { safe: true }
}
