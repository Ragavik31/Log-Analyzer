import React, { useState } from 'react'
import Dropzone from '../components/Dropzone'
import Preview from '../components/Preview'
import { api } from '../api/client'

export default function Dashboard() {
  const [previewData, setPreviewData] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function runAnalysis() {
    if (!previewData) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      let payload
      if (previewData.kind === 'json') {
        payload = { kind: 'json', content: previewData.preview }
      } else {
        // For text logs, request per-line analysis
        payload = { kind: 'text', content: previewData.maskedText, perLine: true }
      }
      const { data } = await api.post('/api/analyze', payload)
      setResult(data)
    } catch (e) {
      setError(e?.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: '0 16px' }}>
      <h2 style={{ marginBottom: 8 }}>Log Analyzer</h2>
      <p style={{ marginTop: 0, color: '#555' }}>Upload logs (.json, .log, .txt, .docx), preview with PII masked, analyze severity, root cause, and solution. Cached by content.</p>

      <Dropzone onPreview={setPreviewData} />
      <Preview data={previewData} />

      {previewData && (
        <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={runAnalysis} disabled={loading} style={{ padding: '8px 12px' }}>
            {loading ? 'Analyzing…' : 'Analyze'}
          </button>
          {error && <span style={{ color: 'red' }}>{error}</span>}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 8 }}>Analysis</h3>
          {/* Per-line analysis for text logs */}
          {result.perLine ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14, color: '#666' }}>
                Per-line analysis • Lines: {result.lines?.length ?? 0}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflow: 'auto' }}>
                {result.lines?.map((item, idx) => (
                  <div
                    key={item.contentHash || idx}
                    style={{
                      border: '1px solid #eee',
                      borderRadius: 6,
                      padding: 8,
                      background: '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666' }}>
                      <span>Line {idx + 1}{item.fromCache ? ' • cache' : ''}</span>
                      <span>{item.contentHash?.slice(0, 10)}…</span>
                    </div>
                    <pre style={{ margin: '4px 0 8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.line}</pre>
                    {item.result?.root_cause && (
                      <div style={{ marginTop: 2, fontSize: 13, whiteSpace: 'pre-wrap' }}>
                        {item.result.root_cause}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#fff' }}>
                <div style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>Overall summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <strong>Severity</strong>
                    <div style={{ marginTop: 4 }}>{result.summary?.severity || '-'}</div>
                  </div>
                  <div>
                    <strong>Root Cause</strong>
                    <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{result.summary?.root_cause || '-'}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <strong>Proposed Solution</strong>
                  <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{result.summary?.proposed_solution || '-'}</div>
                </div>
              </div>
            </div>
          ) : (
            // Aggregate analysis (e.g., JSON logs)
            <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#fff' }}>
              <div style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>
                {result.fromCache ? 'Served from cache' : 'Fresh analysis'} • Hash: {result.contentHash?.slice(0,10)}…
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <strong>Severity</strong>
                  <div style={{ marginTop: 4 }}>{result.result?.severity || '-'}</div>
                </div>
                <div>
                  <strong>Root Cause</strong>
                  <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{result.result?.root_cause || '-'}</div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <strong>Proposed Solution</strong>
                <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{result.result?.proposed_solution || '-'}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
