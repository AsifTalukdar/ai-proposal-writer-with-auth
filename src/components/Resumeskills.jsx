import { useCallback, useEffect, useRef, useState } from 'react'

// ─── pdf.js loaded from CDN (no npm install needed) ───────────────────────
// Add this to your index.html <head> BEFORE your app script:
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs" type="module"></script>
//   <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs" type="module"></script>
//
// OR use the npm package approach (see bottom of this file).

const STORAGE_KEY = 'resume_skills'
const MAX_PDF_SIZE_MB = 5

// ─── Extract all text from a PDF file using pdf.js ────────────────────────
async function extractTextFromPDF(file) {
  // pdf.js must be loaded — either via CDN in index.html or npm
  // This uses the global pdfjsLib set by the CDN script
  const pdfjsLib = window['pdfjs-dist/build/pdf']
    || window.pdfjsLib
    || (await import('pdfjs-dist'))

  // Required: tell pdf.js where its worker lives
  if (pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs'
  }

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ''
  for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
    // Only read first 5 pages — resumes are never longer
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(' ')
    fullText += pageText + '\n'
  }

  return fullText.trim()
}

// ─── Call OpenRouter to extract 5 skill tags from resume text ─────────────
// Reuses the same /api/generate endpoint your app already has
async function extractSkillsFromText(resumeText, accessToken) {
  const prompt = `You are a resume parser. Extract exactly 5 key professional skills from this resume text.

Rules:
- Return ONLY a JSON array of 5 strings
- Each string is a short skill tag (1-3 words max)
- Focus on technical or professional skills most relevant to freelancing
- No explanations, no markdown, no extra text
- Example output: ["React", "Node.js", "UI Design", "REST APIs", "PostgreSQL"]

Resume text:
"""
${resumeText.slice(0, 3000)}
"""`

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 100
    })
  })

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('No response from AI')

  // Parse JSON array from response
  const match = content.match(/\[.*?\]/s)
  if (!match) throw new Error('Could not parse skills from AI response')

  const skills = JSON.parse(match[0])
  if (!Array.isArray(skills)) throw new Error('Invalid skills format')

  // Return max 5, clean strings only
  return skills
    .filter(s => typeof s === 'string' && s.trim())
    .slice(0, 5)
    .map(s => s.trim())
}

// ─── Main component ────────────────────────────────────────────────────────
export default function ResumeSkills({ onSkillClick, accessToken }) {
  const [skills, setSkills] = useState([])       // extracted skill tags
  const [loading, setLoading] = useState(false)   // parsing in progress
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')    // currently loaded file name
  const inputRef = useRef(null)

  // Load saved skills from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.skills?.length && parsed.fileName) {
          setSkills(parsed.skills)
          setFileName(parsed.fileName)
        }
      }
    } catch {
      // ignore corrupted storage
    }
  }, [])

  // Save skills to localStorage whenever they change
  useEffect(() => {
    if (skills.length && fileName) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ skills, fileName }))
    }
  }, [skills, fileName])

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so same file can be re-uploaded
    if (inputRef.current) inputRef.current.value = ''

    // Validate
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.')
      return
    }
    if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
      setError(`PDF must be under ${MAX_PDF_SIZE_MB}MB.`)
      return
    }

    setError('')
    setLoading(true)
    setSkills([])

    try {
      // Step 1: Extract text from PDF
      const text = await extractTextFromPDF(file)
      if (!text || text.length < 50) {
        throw new Error('Could not read text from this PDF. Try a text-based PDF.')
      }

      // Step 2: Send to AI for skill extraction
      const extracted = await extractSkillsFromText(text, accessToken)
      if (!extracted.length) throw new Error('No skills found in resume.')

      setSkills(extracted)
      setFileName(file.name)
    } catch (err) {
      setError(err.message || 'Failed to process resume.')
      setSkills([])
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  const handleClear = useCallback(() => {
    setSkills([])
    setFileName('')
    setError('')
    localStorage.removeItem(STORAGE_KEY)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  return (
    <div className="space-y-2">
      {/* Upload button row */}
      <div className="flex items-center gap-3 flex-wrap">
        <label
          className={`
            inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold
            border transition-all cursor-pointer select-none
            ${loading
              ? 'bg-slate-800/30 border-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/30 text-blue-300 active:scale-95'
            }
          `}
        >
          {loading ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Extracting skills...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {skills.length ? 'Re-upload Resume' : 'Upload Resume (PDF)'}
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={loading}
            className="hidden"
          />
        </label>

        {fileName && !loading && (
          <span className="text-xs text-slate-500 truncate max-w-[160px]" title={fileName}>
            📄 {fileName}
          </span>
        )}

        {skills.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Skill chips */}
      {skills.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-slate-500">
            Skills from resume — click to fill:
          </p>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSkillClick(skill)}
                className="
                  px-3 py-1.5 rounded-lg text-xs font-medium
                  bg-slate-800 hover:bg-blue-600/20
                  border border-slate-700 hover:border-blue-500/50
                  text-slate-300 hover:text-blue-300
                  transition-all active:scale-95
                "
              >
                + {skill}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}