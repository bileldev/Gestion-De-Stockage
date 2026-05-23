# Gestion De Stock

A comprehensive warehouse and inventory management system with OCR invoice processing, built with Next.js, React, and Supabase.

## Features

### Employee Dashboard
- **Inventory Management**: Add, remove, and transfer stock between warehouse blocks
- **Invoice Upload**: Upload PDF/image invoices with automatic OCR extraction
- **Operation History**: Real-time audit log of all inventory movements
- **Supplier Blocking**: Safety rules prevent operations with blocked suppliers (Eureka, Partner)

### Admin Dashboard
- **KPI Analytics**: Track total merchandise, inventory levels, and invoice statistics
- **30-Day Analytics**: Interactive charts showing operation trends
- **Merchandise Management**: Create, edit, delete products with unique codes
- **Supplier Management**: Manage suppliers with contact information and pricing
- **Invoice Approval**: Review and approve pending invoices with OCR-extracted data
- **User Management**: View and manage employee accounts and roles

### Security
- Row Level Security (RLS) policies protect all data
- Role-based access control (employee/admin)
- Automatic profile creation on signup
- Email notifications for invoice approvals

### OCR Invoice Processing
- Free Tesseract.js OCR (client-side processing)
- Automatic extraction of:
  - Invoice numbers
  - Supplier information
  - Total amounts
  - Line items and quantities
  - Invoice dates
- Support for French, English, and Arabic text
- Handles various invoice formats (PDF, PNG, JPG)

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: Supabase (PostgreSQL with RLS)
- **Authentication**: Supabase Auth
- **OCR**: Tesseract.js (free, client-side)
- **Charts**: Recharts
- **Icons**: Lucide React

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm

### Installation
```bash
# Clone the repo
git clone <your-repo>
cd gestion-de-stock

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase credentials to .env.local

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete free deployment instructions to Vercel and Supabase.

### Summary
1. Create Supabase project and run the SQL schema
2. Get environment variables from Supabase
3. Deploy to Vercel (free tier)
4. Add environment variables to Vercel
5. Enable authentication callback URLs in Supabase

**Completely free tier compatible!**

## Features by Role

### Employee
- View inventory across all blocks
- Add stock with supplier selection
- Upload and OCR invoices
- View operation history
- Cannot approve invoices or modify master data

### Admin
- All employee features
- Create/edit/delete warehouses and blocks
- Manage merchandise catalog
- Manage suppliers and pricing
- Approve/reject invoices
- View user activity and KPIs
- Export analytics

## Database Schema

**Tables:**
- `profiles` - User roles and metadata
- `warehouses` - Warehouse locations
- `blocks` - Storage areas within warehouses
- `merchandise` - Product catalog
- `suppliers` - Vendor information
- `prices` - Product pricing by supplier
- `inventory` - Stock levels by block
- `operations` - Audit log of all movements
- `invoices` - Vendor invoices with OCR data

**Security:** All tables have RLS policies enforcing role-based access.

## Invoice Processing

The system can process invoices in multiple formats:
- PDF documents
- PNG/JPG images
- Multi-page documents

Extracted data includes:
- Invoice number and date
- Supplier name and details
- Line items with quantities and prices
- Total amounts and tax calculations

## Blocked Suppliers

For safety, operations are blocked for suppliers named:
- Eureka
- Partner

This prevents accidental operations with specific vendors. Admins can modify this list in `lib/validations.ts`.

## Email Notifications

Admins receive notifications for:
- Invoice approvals (sent to configured email)
- Daily operation summaries
- Inventory alerts

Configure the email address in `lib/email.ts`.

## Support

- Check logs in Vercel dashboard for deployment issues
- Review Supabase database logs for query errors
- Verify environment variables are set correctly

## License

MIT - Feel free to use this for your warehouse management needs!
