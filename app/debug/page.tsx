export default function DebugPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>Environment Variables Debug</h1>
      <p>
        NEXT_PUBLIC_SUPABASE_URL: {supabaseUrl ? '✓ SET' : '✗ MISSING'}
      </p>
      <p>
        NEXT_PUBLIC_SUPABASE_ANON_KEY: {supabaseKey ? '✓ SET' : '✗ MISSING'}
      </p>
      
      {supabaseUrl && (
        <details>
          <summary>Show URL</summary>
          <code>{supabaseUrl}</code>
        </details>
      )}
      
      <hr style={{ margin: '2rem 0' }} />
      
      <h2>Fix Instructions:</h2>
      <ol>
        <li>Go to Vercel Dashboard</li>
        <li>Select your project (gestion-de-stockage-gtuh)</li>
        <li>Settings → Environment Variables</li>
        <li>Add these variables:
          <ul>
            <li>NEXT_PUBLIC_SUPABASE_URL = your-supabase-url</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key</li>
          </ul>
        </li>
        <li>Click "Save"</li>
        <li>Go to Deployments → Redeploy the latest commit</li>
      </ol>
    </div>
  )
}
