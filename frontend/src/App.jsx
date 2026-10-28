import { useState } from 'react'
import CoursesTab from './components/CoursesTab'
import CVTab from './components/CVTab'
import InterviewTab from './components/InterviewTab'
import MatchingTab from './components/MatchingTab'

const TABS = [
  { id: 'cv', label: '1. Phân tích CV' },
  { id: 'matching', label: '2. So khớp & Môn NEU' },
  { id: 'interview', label: '3. Phỏng vấn mô phỏng' },
  { id: 'courses', label: '4. CTĐT NEU' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('cv')
  const [cvData, setCvData] = useState(null)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>NEU Career AI</h1>
        <nav style={{ display: 'flex', gap: '0.5rem' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.5rem 0.75rem',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 600 : 400,
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {activeTab === 'cv' && <CVTab cvData={cvData} onCvParsed={setCvData} />}
        {activeTab === 'matching' && <MatchingTab cvData={cvData} />}
        {activeTab === 'interview' && <InterviewTab />}
        {activeTab === 'courses' && <CoursesTab />}
      </main>
    </div>
  )
}
