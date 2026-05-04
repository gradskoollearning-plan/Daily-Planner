import { useRouter } from 'next/router';

export default function NotFound() {
  const router = useRouter();
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontFamily:'var(--sans)', background:'var(--g50)' }}>
      <div style={{ fontFamily:'var(--serif)', fontSize:'5rem', fontWeight:700, color:'var(--red)', lineHeight:1 }}>404</div>
      <h1 style={{ fontFamily:'var(--serif)', fontSize:'1.5rem', margin:'1rem 0 0.5rem' }}>Page not found</h1>
      <p style={{ color:'var(--g600)', fontSize:'0.9rem', marginBottom:'2rem' }}>This page doesn't exist.</p>
      <button className="btn btn-red" onClick={() => router.push('/')}>Back to Home</button>
    </div>
  );
}
