import React, { useEffect, useState } from 'react'
import { fetchRoot } from '../hooks/useApi'

export default function Home() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetchRoot().then(setData).catch(() => setData(null))
  }, [])

  return (
    <section>
      <h3>Home</h3>
      <pre>{data ? JSON.stringify(data, null, 2) : 'No data'}</pre>
    </section>
  )
}
