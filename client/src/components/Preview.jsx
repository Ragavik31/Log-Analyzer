import React from 'react'

export default function Preview({ data }) {
  if (!data) return null
  const { kind, preview, maskedText, contentHash } = data
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <strong>Preview</strong>
        <span style={{ fontSize: 12, color: '#666' }}>Kind: {kind} • Hash: {contentHash?.slice(0, 10)}…</span>
      </div>
      <div style={{ marginTop: 8, border: '1px solid #ddd', padding: 12, borderRadius: 8, background: '#fcfcfc' }}>
        {kind === 'json' ? (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(preview, null, 2)}</pre>
        ) : (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{maskedText}</pre>
        )}
      </div>
    </div>
  )
}
