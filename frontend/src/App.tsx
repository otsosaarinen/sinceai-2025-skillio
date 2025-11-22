import { useState } from 'react'
import './App.css'

interface Job {
  id: number
  name: string
  description: string
  rating: number
  url: string
  company: string
  seniority: string
  financialSituation: number // revenue growth in %
  justifications: string[] // reasons why this job is a match
}

function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [isFading, setIsFading] = useState(false)
  const [showJobs, setShowJobs] = useState(false)
  const [showStartAnimation, setShowStartAnimation] = useState(false)
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null)

  const handleStart = async () => {
    setShowStartAnimation(true)

    // Brief animation before showing spinner
    setTimeout(() => {
      setIsLoading(true)
      setShowStartAnimation(false)
    }, 400) // Animation duration

    setIsFading(false)
    setShowJobs(false)

    // Simulate backend process - 3 seconds loading
    setTimeout(() => {
      // Mock data - replace with actual backend call when ready
      const mockJobs: Job[] = [
        {
          id: 1,
          name: 'Full Stack Developer',
          description: 'We are looking for an experienced full stack developer to join our team. You will work on building scalable web applications using modern technologies. Experience with React, Node.js, and cloud services required.',
          rating: 87,
          url: 'https://example.com/jobs/senior-full-stack-developer',
          company: 'TechCorp Solutions',
          seniority: 'Senior',
          financialSituation: 45.2,
          justifications: [
            'Strong match with your React and Node.js experience',
            'Company shows 45% revenue growth indicating stability',
            'Senior role aligns with your career progression goals'
          ]
        },
        {
          id: 2,
          name: 'AI/ML Engineer',
          description: 'Join our AI team to develop cutting-edge machine learning models. You will work on NLP, computer vision, and recommendation systems. Strong Python skills and experience with TensorFlow or PyTorch required.',
          rating: 92,
          url: 'https://example.com/jobs/ai-ml-engineer',
          company: 'InnovateAI',
          seniority: 'Mid-Level',
          financialSituation: 78.5,
          justifications: [
            'Perfect match for your AI/ML background',
            'Exceptional 78% revenue growth shows strong market position',
            'Cutting-edge technology stack matches your interests'
          ]
        },
        {
          id: 3,
          name: 'DevOps Engineer',
          description: 'We need a DevOps engineer to help us scale our infrastructure. You will manage CI/CD pipelines, container orchestration, and cloud infrastructure. Experience with Kubernetes, Docker, and AWS/GCP required.',
          rating: 79,
          url: 'https://example.com/jobs/devops-engineer',
          company: 'CloudScale Inc',
          seniority: 'Junior',
          financialSituation: 23.1,
          justifications: [
            'Good fit for your cloud infrastructure skills',
            'Growing company with 23% revenue growth',
            'Opportunity to work with modern DevOps tools'
          ]
        }
      ]

      // Sort jobs by rating (highest to lowest) - highest score on the left
      const sortedJobs = mockJobs.sort((a, b) => b.rating - a.rating)

      // Fade out loading, then fade in dashboard
      setIsFading(true)
      setTimeout(() => {
        setJobs(sortedJobs)
        setLastRunTime(new Date())
        setIsLoading(false)
        setTimeout(() => {
          setIsFading(false)
          // Trigger job card animations after fade in
          setTimeout(() => {
            setShowJobs(true)
          }, 100)
        }, 50) // Small delay to ensure state update before fade in
      }, 700) // Fade out duration (increased from 300ms)
    }, 3000)
  }

  const handleRetry = () => {
    setShowJobs(false)
    setIsFading(true)

    // Fade out dashboard, then show loading
    setTimeout(() => {
      setJobs([])
      setIsLoading(true)
      setIsFading(false)

      // Simulate backend process - 3 seconds loading
      setTimeout(() => {
        // Mock data - replace with actual backend call when ready
        const mockJobs: Job[] = [
          {
            id: 1,
            name: 'Full Stack Developer',
            description: 'We are looking for an experienced full stack developer to join our team. You will work on building scalable web applications using modern technologies. Experience with React, Node.js, and cloud services required.',
            rating: 87,
            url: 'https://example.com/jobs/senior-full-stack-developer',
            company: 'TechCorp Solutions',
            seniority: 'Senior',
            financialSituation: 45.2,
            justifications: [
              'Strong match with your React and Node.js experience',
              'Company shows 45% revenue growth indicating stability',
              'Senior role aligns with your career progression goals'
            ]
          },
          {
            id: 2,
            name: 'AI/ML Engineer',
            description: 'Join our AI team to develop cutting-edge machine learning models. You will work on NLP, computer vision, and recommendation systems. Strong Python skills and experience with TensorFlow or PyTorch required.',
            rating: 92,
            url: 'https://example.com/jobs/ai-ml-engineer',
            company: 'InnovateAI',
            seniority: 'Mid-Level',
            financialSituation: 78.5,
            justifications: [
              'Perfect match for your AI/ML background',
              'Exceptional 78% revenue growth shows strong market position',
              'Cutting-edge technology stack matches your interests'
            ]
          },
          {
            id: 3,
            name: 'DevOps Engineer',
            description: 'We need a DevOps engineer to help us scale our infrastructure. You will manage CI/CD pipelines, container orchestration, and cloud infrastructure. Experience with Kubernetes, Docker, and AWS/GCP required.',
            rating: 79,
            url: 'https://example.com/jobs/devops-engineer',
            company: 'CloudScale Inc',
            seniority: 'Junior',
            financialSituation: 23.1,
            justifications: [
              'Good fit for your cloud infrastructure skills',
              'Growing company with 23% revenue growth',
              'Opportunity to work with modern DevOps tools'
            ]
          }
        ]

        // Sort jobs by rating (highest to lowest) - highest score on the left
        const sortedJobs = mockJobs.sort((a, b) => b.rating - a.rating)

        // Fade out loading, then fade in dashboard
        setIsFading(true)
        setTimeout(() => {
          setJobs(sortedJobs)
          setLastRunTime(new Date())
          setIsLoading(false)
          setTimeout(() => {
            setIsFading(false)
            // Trigger job card animations after fade in
            setTimeout(() => {
              setShowJobs(true)
            }, 100)
          }, 50) // Small delay to ensure state update before fade in
        }, 700) // Fade out duration (increased from 300ms)
      }, 3000)
    }, 700) // Fade out duration
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 80) return 'text-green-700 bg-green-100 border border-green-300'
    if (rating >= 60) return 'text-orange-700 bg-orange-100 border border-orange-300'
    return 'text-red-700 bg-red-100 border border-red-300'
  }

  if (jobs.length > 0) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8 transition-opacity duration-700 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-2">
                Dashboard
              </h1>
              <p className="text-slate-600">
                Top 3 Job Matches
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job, index) => (
              <div
                key={job.id}
                className={`bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-all duration-500 p-4 flex flex-col shadow-md hover:shadow-lg ${showJobs
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-8'
                  }`}
                style={{
                  transitionDelay: showJobs ? `${index * 100}ms` : '0ms'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 mr-4">
                    <h2 className="text-xl font-bold text-slate-900 leading-tight mb-2">
                      {job.name}
                    </h2>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <svg
                          className="w-4 h-4 text-slate-500 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        <span className="text-sm font-medium text-slate-700 truncate">{job.company}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg
                          className="w-4 h-4 text-slate-500 flex-shrink-0"
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
                        <span className="text-sm font-medium text-slate-600">{job.seniority}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${getRatingColor(job.rating)}`}>
                    {job.rating}/100
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-3">
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
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-slate-700">Lead Score:</span>
                    <span className="text-sm font-bold text-slate-700">{job.rating}/100</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
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
                    <span className="text-sm font-semibold text-slate-700">Revenue Growth:</span>
                    <span className={`text-sm font-bold ${job.financialSituation >= 50 ? 'text-green-600' : job.financialSituation >= 30 ? 'text-orange-600' : 'text-red-600'}`}>
                      +{job.financialSituation}%
                    </span>
                  </div>
                </div>

                <p className="text-slate-600 mb-4 flex-1 line-clamp-3">
                  {job.description}
                </p>

                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Why this job matches:</h3>
                  <ul className="space-y-1.5">
                    {job.justifications.map((justification, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <svg
                          className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>{justification}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-4 border-t border-slate-200">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-2"
                  >
                    <span>View Job</span>
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
                  <p className="text-xs text-slate-400 mt-2 truncate" title={job.url}>
                    {job.url}
                  </p>
                </div>
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
