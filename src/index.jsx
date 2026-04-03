import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './Investitaty.jsx'
import pkg from '../package.json'

const runtimeEnv = String(pkg?.environment || '').trim().toLowerCase()
document.title = runtimeEnv && runtimeEnv !== 'production'
  ? `Investitaty - ${runtimeEnv}`
  : 'Investitaty'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
