import { useState, useCallback } from 'react'
import Dashboard from './Dashboard.jsx'
import UploadScreen from './UploadScreen.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function App() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fileNames, setFileNames] = useState({ f2024: '', f2025: '' })

  const handleAnalyze = useCallback(async (file1, file2, eventType = 'homecoming') => {
    setLoading(true)
    setError(null)
    setFileNames({ f2024: file1.name, f2025: file2?.name || '' })

    try {
      const formData = new FormData()
      formData.append('file1', file1)
      if (file2) formData.append('file2', file2)
      formData.append('eventType', eventType)

      const res = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`)
      }

      setAnalytics(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleReset = () => {
    setAnalytics(null)
    setError(null)
    setFileNames({ f2024: '', f2025: '' })
  }

  if (analytics) {
    return <Dashboard data={analytics} fileNames={fileNames} onReset={handleReset} />
  }

  return <UploadScreen onAnalyze={handleAnalyze} loading={loading} error={error} />
}
