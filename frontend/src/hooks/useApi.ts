export async function fetchRoot(): Promise<any> {
  const res = await fetch('http://127.0.0.1:8000/')
  if (!res.ok) throw new Error('Network error')
  return res.json()
}
