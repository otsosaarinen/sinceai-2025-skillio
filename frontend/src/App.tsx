import { useState, useEffect, useRef } from 'react'
import './App.css'

interface JobData {
  title: string
  seniority: string
}

interface Company {
  name: string
  ticker: string
  website: string
  financial_summary: string
  job_data: JobData[]
  lead_score: number
  sales_argument: string
  sources: string[]
}

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [isFading, setIsFading] = useState(false)
  const [showJobs, setShowJobs] = useState(false)
  const [showStartAnimation, setShowStartAnimation] = useState(false)
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null)
  const [wsMessages, setWsMessages] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const handleStart = async () => {
    setShowStartAnimation(true)

    // Brief animation before showing spinner
    setTimeout(() => {
      setIsLoading(true)
      setShowStartAnimation(false)
    }, 400) // Animation duration

    setIsFading(false)
    setShowJobs(false)
    // Set initial messages
    setWsMessages(['Initializing search...'])

    // Connect to WebSocket
    try {
      const ws = new WebSocket('ws://localhost:4000')
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected successfully')
      }

      ws.onmessage = (event) => {
        const message = event.data
        setWsMessages((prev) => [...prev, message])
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        console.error('WebSocket connection failed. Make sure the server is running on ws://localhost:4000')
        // Add error message to UI
        setWsMessages((prev) => [...prev, '⚠️ WebSocket connection failed - check if server is running on port 4000'])
      }

      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason)
        if (event.code !== 1000) {
          // Not a normal closure
          console.error('WebSocket closed unexpectedly:', event.code, event.reason)
        }
        wsRef.current = null
      }
    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
      setWsMessages((prev) => [...prev, '⚠️ Failed to create WebSocket connection'])
    }

    // Wait 3 seconds before sending GET request
    await new Promise(resolve => setTimeout(resolve, 3000))

    try {
      // Send GET request to fetch company data
      const response = await fetch('http://localhost:3000', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: Company[] = await response.json()

      // Ensure we have valid data
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data format or empty response')
      }

      // Sort companies by lead_score (highest to lowest) - highest score first
      const sortedCompanies = data.sort((a, b) => b.lead_score - a.lead_score).slice(0, 3)

      // Send POST request to webhook with the same data
      try {
        await fetch('https://otsosaarinen.app.n8n.cloud/webhook/1fa2fee2-72c5-41fa-9e40-72abe6202392', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sortedCompanies),
        })
      } catch (postError) {
        console.error('Error sending data to webhook:', postError)
        // Don't block the UI if webhook fails
      }

      // Fade out loading, then fade in dashboard
      setIsFading(true)
      setTimeout(() => {
        setCompanies(sortedCompanies)
        setLastRunTime(new Date())
        setIsLoading(false)
        setTimeout(() => {
          setIsFading(false)
          // Trigger company card animations after fade in
          setTimeout(() => {
            setShowJobs(true)
          }, 100)
        }, 50) // Small delay to ensure state update before fade in
      }, 700) // Fade out duration
    } catch (error) {
      console.error('Error fetching company data:', error)
      // For now, just log the error - don't show error state
      // This allows viewing mock data during development
    } finally {
      // Close WebSocket connection when loading is done
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }

  const handleRetry = async () => {
    setShowJobs(false)
    setIsFading(true)
    // Set initial messages
    setWsMessages(['Initializing search...'])

    // Fade out dashboard, then show loading
    setTimeout(async () => {
      setCompanies([])
      setIsLoading(true)
      setIsFading(false)

      // Connect to WebSocket
      try {
        const ws = new WebSocket('ws://localhost:4000')
        wsRef.current = ws

        ws.onopen = () => {
          console.log('WebSocket connected successfully')
        }

        ws.onmessage = (event) => {
          const message = event.data
          setWsMessages((prev) => [...prev, message])
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          console.error('WebSocket connection failed. Make sure the server is running on ws://localhost:4000')
          // Add error message to UI
          setWsMessages((prev) => [...prev, '⚠️ WebSocket connection failed - check if server is running on port 4000'])
        }

        ws.onclose = (event) => {
          console.log('WebSocket disconnected', event.code, event.reason)
          if (event.code !== 1000) {
            // Not a normal closure
            console.error('WebSocket closed unexpectedly:', event.code, event.reason)
          }
          wsRef.current = null
        }
      } catch (error) {
        console.error('Error creating WebSocket connection:', error)
        setWsMessages((prev) => [...prev, '⚠️ Failed to create WebSocket connection'])
      }

      // Wait 3 seconds before sending GET request
      await new Promise(resolve => setTimeout(resolve, 3000))

      try {
        // Send GET request to fetch company data
        const response = await fetch('http://localhost:3000', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: Company[] = await response.json()

        // Ensure we have valid data
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('Invalid data format or empty response')
        }

        // Sort companies by lead_score (highest to lowest) - highest score first
        const sortedCompanies = data.sort((a, b) => b.lead_score - a.lead_score).slice(0, 3)

        // Send POST request to webhook with the same data
        try {
          await fetch('https://otsosaarinen.app.n8n.cloud/webhook-test/1fa2fee2-72c5-41fa-9e40-72abe6202392', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          })
        } catch (postError) {
          console.error('Error sending data to webhook:', postError)
          // Don't block the UI if webhook fails
        }

        // Fade out loading, then fade in dashboard
        setIsFading(true)
        setTimeout(() => {
          setCompanies(sortedCompanies)
          setLastRunTime(new Date())
          setIsLoading(false)
          setTimeout(() => {
            setIsFading(false)
            // Trigger company card animations after fade in
            setTimeout(() => {
              setShowJobs(true)
            }, 100)
          }, 50) // Small delay to ensure state update before fade in
        }, 700) // Fade out duration
      } catch (error) {
        console.error('Error fetching company data:', error)
        // For now, just log the error - don't show error state
      } finally {
        // Close WebSocket connection when loading is done
        if (wsRef.current) {
          wsRef.current.close()
          wsRef.current = null
        }
      }
    }, 700) // Fade out duration
  }

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-700 bg-green-100 border border-green-300'
    if (score >= 60) return 'text-orange-700 bg-orange-100 border border-orange-300'
    return 'text-red-700 bg-red-100 border border-red-300'
  }

  if (companies.length > 0) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8 transition-opacity duration-700 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-2">
                Dashboard
              </h1>
              <p className="text-slate-600">
                Company Matches
              </p>
              {lastRunTime && (
                <p className="text-sm text-slate-500 mt-1">
                  Last run: {lastRunTime.toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={handleRetry}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Retry
            </button>
          </div>

          <div className="space-y-6">
            {companies.map((company, index) => (
              <div
                key={company.name}
                className={`bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-all duration-500 p-6 flex flex-col shadow-md hover:shadow-lg ${showJobs
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
                  }`}
                style={{
                  transitionDelay: showJobs ? `${index * 100}ms` : '0ms'
                }}
              >
                {/* Company Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-slate-900">
                        {company.name}
                      </h2>
                      {company.ticker && company.ticker !== 'Check' && (
                        <span className="text-sm text-slate-500 font-medium">
                          ({company.ticker})
                        </span>
                      )}
                    </div>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                      <span>{company.website}</span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${getScoreColor(company.lead_score)}`}>
                    Score: {company.lead_score}/100
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Financial Summary
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {company.financial_summary}
                  </p>
                </div>

                {/* Sales Argument */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Sales Argument
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {company.sales_argument}
                  </p>
                </div>

                {/* Job Listings */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-slate-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Open Positions ({company.job_data.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {company.job_data.map((job, jobIndex) => (
                      <div
                        key={jobIndex}
                        className="bg-slate-50 border border-slate-200 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-slate-900 mb-1">
                              {job.title}
                            </h4>
                            <div className="flex items-center gap-1.5">
                              <svg
                                className="w-3.5 h-3.5 text-slate-500 flex-shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                                />
                              </svg>
                              <span className="text-xs font-medium text-slate-600">{job.seniority}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sources */}
                {company.sources && company.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h3 className="text-xs font-semibold text-slate-700 mb-2">Sources:</h3>
                    <div className="flex flex-wrap gap-2">
                      {company.sources.slice(0, 5).map((source, sourceIndex) => (
                        <a
                          key={sourceIndex}
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 hover:underline truncate max-w-xs"
                          title={source}
                        >
                          {source}
                        </a>
                      ))}
                      {company.sources.length > 5 && (
                        <span className="text-xs text-slate-500">
                          +{company.sources.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={`mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3 transition-all duration-500 ${showJobs
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
            }`}
            style={{
              transitionDelay: showJobs ? '300ms' : '0ms'
            }}>
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-medium">
                This data has also been sent to <span className="font-semibold">Slack</span> and <span className="font-semibold">Email</span>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M5.042 15.165a2.528 2.528 0 01-2.52-2.523c0-1.393 1.128-2.527 2.52-2.527h.075c.811-2.35 3.06-4.035 5.717-4.035 2.829 0 5.17 1.88 5.88 4.41h.05c2.014 0 3.65 1.636 3.65 3.65 0 2.014-1.636 3.65-3.65 3.65H5.042z" />
              </svg>
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 transition-opacity duration-700 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="max-w-5xl w-full">
        <div className="text-center space-y-8 md:space-y-12">
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-slate-900 leading-tight">
              AI Lead Agent
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl text-slate-600 font-light max-w-3xl mx-auto">
              Start identifying potential customers with intelligent automation
            </p>
          </div>

          <div className="pt-8">
            {!isLoading && !showStartAnimation ? (
              <button
                onClick={handleStart}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-12 py-4 rounded-xl transition-all duration-200 transform hover:scale-105 hover:cursor-pointer active:scale-95 shadow-2xl hover:shadow-3xl"
              >
                Start
              </button>
            ) : showStartAnimation ? (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-center">
                  <div className="relative w-20 h-20">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full animate-pulse"></div>
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin-slow"></div>
                  </div>
                </div>
                <p className="text-slate-600 font-medium text-lg animate-pulse">
                  Starting...
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="relative w-20 h-20">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                </div>
                <p className="text-slate-600 font-medium text-lg">
                  Processing...
                </p>
                {wsMessages.length > 0 && (
                  <div className="mt-6 max-w-md mx-auto">
                    <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg p-4 shadow-lg">
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {wsMessages.map((message, index) => (
                          <div
                            key={index}
                            className="text-sm text-slate-700 animate-fade-in"
                          >
                            {message}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
