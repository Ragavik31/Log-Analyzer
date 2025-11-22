import React, { useCallback, useRef, useState } from 'react'
import { api } from '../api/client'

export default function Dropzone({ onPreview }) {
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  const onDrop = useCallback(async (file) => {
    setError('')
    const form = new FormData()
    form.append('file', file)
    try {
      const { data } = await api.post('/api/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      onPreview?.(data)
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    }
  }, [onPreview])

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onDrop(f) }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: '2px dashed #888', padding: 24, textAlign: 'center', cursor: 'pointer',
          background: drag ? '#fafafa' : 'transparent', borderRadius: 8
        }}
      >
        <p style={{ margin: 0 }}>Drag & drop .json/.log/.txt/.docx here, or click to select</p>
        <input ref={inputRef} type="file" accept=".json,.log,.txt,.docx" style={{ display: 'none' }} onChange={(e) => {
          const f = e.target.files?.[0]; if (f) onDrop(f)
        }} />
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
