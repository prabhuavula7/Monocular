'use client'

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, CheckCircle, Plus, X, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react'
import { nanoid } from 'nanoid'
import type { GeneratedScope, Message, RiskFlag, Deliverable, Milestone } from '@/types'

type Status = 'draft' | 'in_review' | 'sent' | 'won' | 'lost'

// ─── Currency data ─────────────────────────────────────────────────────────────
// Top 10 by global FX trading volume (BIS 2022), then all ISO 4217 alphabetically
const TOP_CURRENCIES = [
  { code: 'USD', name: 'US Dollar'         },
  { code: 'EUR', name: 'Euro'              },
  { code: 'INR', name: 'Indian Rupee'      },
  { code: 'JPY', name: 'Japanese Yen'      },
  { code: 'GBP', name: 'British Pound'     },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar'   },
  { code: 'CHF', name: 'Swiss Franc'       },
  { code: 'CNY', name: 'Chinese Yuan'      },
  { code: 'HKD', name: 'Hong Kong Dollar'  },
]

const ALL_CURRENCIES = [
  { code: 'AED', name: 'UAE Dirham'                        },
  { code: 'AFN', name: 'Afghan Afghani'                    },
  { code: 'ALL', name: 'Albanian Lek'                      },
  { code: 'AMD', name: 'Armenian Dram'                     },
  { code: 'ANG', name: 'Netherlands Antillean Guilder'     },
  { code: 'AOA', name: 'Angolan Kwanza'                    },
  { code: 'ARS', name: 'Argentine Peso'                    },
  { code: 'AUD', name: 'Australian Dollar'                 },
  { code: 'AWG', name: 'Aruban Florin'                     },
  { code: 'AZN', name: 'Azerbaijani Manat'                 },
  { code: 'BAM', name: 'Bosnia-Herzegovina Mark'           },
  { code: 'BBD', name: 'Barbadian Dollar'                  },
  { code: 'BDT', name: 'Bangladeshi Taka'                  },
  { code: 'BGN', name: 'Bulgarian Lev'                     },
  { code: 'BHD', name: 'Bahraini Dinar'                    },
  { code: 'BMD', name: 'Bermudian Dollar'                  },
  { code: 'BND', name: 'Brunei Dollar'                     },
  { code: 'BOB', name: 'Bolivian Boliviano'                },
  { code: 'BRL', name: 'Brazilian Real'                    },
  { code: 'BSD', name: 'Bahamian Dollar'                   },
  { code: 'BTN', name: 'Bhutanese Ngultrum'                },
  { code: 'BWP', name: 'Botswanan Pula'                    },
  { code: 'BYN', name: 'Belarusian Ruble'                  },
  { code: 'BZD', name: 'Belize Dollar'                     },
  { code: 'CAD', name: 'Canadian Dollar'                   },
  { code: 'CDF', name: 'Congolese Franc'                   },
  { code: 'CHF', name: 'Swiss Franc'                       },
  { code: 'CLP', name: 'Chilean Peso'                      },
  { code: 'CNY', name: 'Chinese Yuan'                      },
  { code: 'COP', name: 'Colombian Peso'                    },
  { code: 'CRC', name: 'Costa Rican Colón'                 },
  { code: 'CUP', name: 'Cuban Peso'                        },
  { code: 'CVE', name: 'Cape Verdean Escudo'               },
  { code: 'CZK', name: 'Czech Koruna'                      },
  { code: 'DJF', name: 'Djiboutian Franc'                  },
  { code: 'DKK', name: 'Danish Krone'                      },
  { code: 'DOP', name: 'Dominican Peso'                    },
  { code: 'DZD', name: 'Algerian Dinar'                    },
  { code: 'EGP', name: 'Egyptian Pound'                    },
  { code: 'ERN', name: 'Eritrean Nakfa'                    },
  { code: 'ETB', name: 'Ethiopian Birr'                    },
  { code: 'EUR', name: 'Euro'                              },
  { code: 'FJD', name: 'Fijian Dollar'                     },
  { code: 'FKP', name: 'Falkland Islands Pound'            },
  { code: 'GBP', name: 'British Pound'                     },
  { code: 'GEL', name: 'Georgian Lari'                     },
  { code: 'GHS', name: 'Ghanaian Cedi'                     },
  { code: 'GIP', name: 'Gibraltar Pound'                   },
  { code: 'GMD', name: 'Gambian Dalasi'                    },
  { code: 'GTQ', name: 'Guatemalan Quetzal'                },
  { code: 'GYD', name: 'Guyanese Dollar'                   },
  { code: 'HKD', name: 'Hong Kong Dollar'                  },
  { code: 'HNL', name: 'Honduran Lempira'                  },
  { code: 'HTG', name: 'Haitian Gourde'                    },
  { code: 'HUF', name: 'Hungarian Forint'                  },
  { code: 'IDR', name: 'Indonesian Rupiah'                 },
  { code: 'ILS', name: 'Israeli Shekel'                    },
  { code: 'INR', name: 'Indian Rupee'                      },
  { code: 'IQD', name: 'Iraqi Dinar'                       },
  { code: 'IRR', name: 'Iranian Rial'                      },
  { code: 'ISK', name: 'Icelandic Króna'                   },
  { code: 'JMD', name: 'Jamaican Dollar'                   },
  { code: 'JOD', name: 'Jordanian Dinar'                   },
  { code: 'JPY', name: 'Japanese Yen'                      },
  { code: 'KES', name: 'Kenyan Shilling'                   },
  { code: 'KGS', name: 'Kyrgyzstani Som'                   },
  { code: 'KHR', name: 'Cambodian Riel'                    },
  { code: 'KPW', name: 'North Korean Won'                  },
  { code: 'KRW', name: 'South Korean Won'                  },
  { code: 'KWD', name: 'Kuwaiti Dinar'                     },
  { code: 'KYD', name: 'Cayman Islands Dollar'             },
  { code: 'KZT', name: 'Kazakhstani Tenge'                 },
  { code: 'LAK', name: 'Laotian Kip'                       },
  { code: 'LBP', name: 'Lebanese Pound'                    },
  { code: 'LKR', name: 'Sri Lankan Rupee'                  },
  { code: 'LRD', name: 'Liberian Dollar'                   },
  { code: 'LSL', name: 'Lesotho Loti'                      },
  { code: 'LYD', name: 'Libyan Dinar'                      },
  { code: 'MAD', name: 'Moroccan Dirham'                   },
  { code: 'MDL', name: 'Moldovan Leu'                      },
  { code: 'MKD', name: 'Macedonian Denar'                  },
  { code: 'MMK', name: 'Myanmar Kyat'                      },
  { code: 'MNT', name: 'Mongolian Tögrög'                  },
  { code: 'MOP', name: 'Macanese Pataca'                   },
  { code: 'MRU', name: 'Mauritanian Ouguiya'               },
  { code: 'MUR', name: 'Mauritian Rupee'                   },
  { code: 'MVR', name: 'Maldivian Rufiyaa'                 },
  { code: 'MWK', name: 'Malawian Kwacha'                   },
  { code: 'MXN', name: 'Mexican Peso'                      },
  { code: 'MYR', name: 'Malaysian Ringgit'                 },
  { code: 'MZN', name: 'Mozambican Metical'                },
  { code: 'NAD', name: 'Namibian Dollar'                   },
  { code: 'NGN', name: 'Nigerian Naira'                    },
  { code: 'NIO', name: 'Nicaraguan Córdoba'                },
  { code: 'NOK', name: 'Norwegian Krone'                   },
  { code: 'NPR', name: 'Nepalese Rupee'                    },
  { code: 'NZD', name: 'New Zealand Dollar'                },
  { code: 'OMR', name: 'Omani Rial'                        },
  { code: 'PAB', name: 'Panamanian Balboa'                 },
  { code: 'PEN', name: 'Peruvian Sol'                      },
  { code: 'PGK', name: 'Papua New Guinean Kina'            },
  { code: 'PHP', name: 'Philippine Peso'                   },
  { code: 'PKR', name: 'Pakistani Rupee'                   },
  { code: 'PLN', name: 'Polish Złoty'                      },
  { code: 'PYG', name: 'Paraguayan Guaraní'                },
  { code: 'QAR', name: 'Qatari Riyal'                      },
  { code: 'RON', name: 'Romanian Leu'                      },
  { code: 'RSD', name: 'Serbian Dinar'                     },
  { code: 'RUB', name: 'Russian Ruble'                     },
  { code: 'RWF', name: 'Rwandan Franc'                     },
  { code: 'SAR', name: 'Saudi Riyal'                       },
  { code: 'SBD', name: 'Solomon Islands Dollar'            },
  { code: 'SCR', name: 'Seychellois Rupee'                 },
  { code: 'SDG', name: 'Sudanese Pound'                    },
  { code: 'SEK', name: 'Swedish Krona'                     },
  { code: 'SGD', name: 'Singapore Dollar'                  },
  { code: 'SHP', name: 'Saint Helena Pound'                },
  { code: 'SOS', name: 'Somali Shilling'                   },
  { code: 'SRD', name: 'Surinamese Dollar'                 },
  { code: 'SSP', name: 'South Sudanese Pound'              },
  { code: 'STN', name: 'São Tomé & Príncipe Dobra'         },
  { code: 'SYP', name: 'Syrian Pound'                      },
  { code: 'SZL', name: 'Swazi Lilangeni'                   },
  { code: 'THB', name: 'Thai Baht'                         },
  { code: 'TJS', name: 'Tajikistani Somoni'                },
  { code: 'TMT', name: 'Turkmenistani Manat'               },
  { code: 'TND', name: 'Tunisian Dinar'                    },
  { code: 'TOP', name: 'Tongan Paʻanga'                    },
  { code: 'TRY', name: 'Turkish Lira'                      },
  { code: 'TTD', name: 'Trinidad & Tobago Dollar'          },
  { code: 'TWD', name: 'New Taiwan Dollar'                 },
  { code: 'TZS', name: 'Tanzanian Shilling'                },
  { code: 'UAH', name: 'Ukrainian Hryvnia'                 },
  { code: 'UGX', name: 'Ugandan Shilling'                  },
  { code: 'USD', name: 'US Dollar'                         },
  { code: 'UYU', name: 'Uruguayan Peso'                    },
  { code: 'UZS', name: 'Uzbekistani Som'                   },
  { code: 'VES', name: 'Venezuelan Bolívar'                },
  { code: 'VND', name: 'Vietnamese Đồng'                   },
  { code: 'VUV', name: 'Vanuatu Vatu'                      },
  { code: 'WST', name: 'Samoan Tālā'                       },
  { code: 'XAF', name: 'Central African CFA Franc'         },
  { code: 'XCD', name: 'East Caribbean Dollar'             },
  { code: 'XOF', name: 'West African CFA Franc'            },
  { code: 'XPF', name: 'CFP Franc'                         },
  { code: 'YER', name: 'Yemeni Rial'                       },
  { code: 'ZAR', name: 'South African Rand'                },
  { code: 'ZMW', name: 'Zambian Kwacha'                    },
  { code: 'ZWL', name: 'Zimbabwean Dollar'                 },
]

interface Scope {
  id: string
  status: Status
  name: string | null
  clientName: string | null
  clientEmail: string | null
  transcript: Message[]
  generatedScope: GeneratedScope | null
  agencyNotes: string | null
  pdfUrl: string | null
  createdAt: Date | string | null
}

interface Version {
  id: string
  name: string | null
  createdAt: Date | string | null
  status: string | null
}

interface Props {
  scope: Scope
  agencyName: string
  versions?: Version[]
}

const STATUS_LABELS: Record<Status, string> = {
  draft:     'Draft',
  in_review: 'In Review',
  sent:      'Sent',
  won:       'Won',
  lost:      'Lost',
}

const STATUS_COLORS: Record<Status, string> = {
  draft:     'text-ink-3 bg-panel-hover border-line',
  in_review: 'text-amber-600 bg-amber-500/8 border-amber-500/20',
  sent:      'text-blue-600 bg-blue-500/8 border-blue-500/20',
  won:       'text-green-600 bg-green-500/8 border-green-500/20',
  lost:      'text-red-500 bg-red-500/8 border-red-500/20',
}

const RISK_COLORS: Record<string, string> = {
  high:   'bg-red-500 text-white border-red-500',
  medium: 'bg-amber-400 text-amber-950 border-amber-400',
  low:    'bg-zinc-400 text-white border-zinc-400 dark:bg-zinc-600 dark:border-zinc-600',
}

// ─── Auto-save hook ───────────────────────────────────────────────────────────

function useAutoSave(scopeId: string) {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = useCallback(async (patch: Record<string, unknown>) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaveState('saving')
    timerRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/scopes/${scopeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        setSaveState('saved')
        setTimeout(() => setSaveState('idle'), 2000)
      } catch {
        setSaveState('idle')
      }
    }, 700)
  }, [scopeId])

  return { save, saveState }
}

// ─── Inline editable primitives ───────────────────────────────────────────────

function EditableText({
  value,
  onSave,
  multiline = false,
  placeholder = 'Click to edit',
  className = '',
}: {
  value: string
  onSave: (v: string) => void
  multiline?: boolean
  placeholder?: string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  function commit() {
    setEditing(false)
    if (draft.trim() !== value) onSave(draft.trim())
  }

  const baseInput = 'w-full bg-transparent focus:outline-none focus:ring-0 border-0 p-0 m-0 resize-none'

  if (editing) {
    return multiline ? (
      <textarea
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        rows={Math.max(3, draft.split('\n').length)}
        className={`${baseInput} ${className}`}
      />
    ) : (
      <input
        autoFocus
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
        className={`${baseInput} ${className}`}
      />
    )
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true) }}
      className={`cursor-text rounded transition-colors hover:bg-panel-hover px-0.5 -mx-0.5 ${!value ? 'text-ink-3 italic' : ''} ${className}`}
    >
      {value || placeholder}
    </span>
  )
}

function EditableNumber({
  value,
  onSave,
  className = '',
}: {
  value: number
  onSave: (v: number) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  useEffect(() => { setDraft(String(value)) }, [value])

  function commit() {
    setEditing(false)
    const n = parseInt(draft.replace(/,/g, ''), 10)
    if (!isNaN(n) && n !== value) onSave(n)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
        className={`w-28 bg-transparent focus:outline-none border-0 p-0 m-0 ${className}`}
      />
    )
  }

  return (
    <span
      onClick={() => { setDraft(String(value)); setEditing(true) }}
      className={`cursor-text rounded transition-colors hover:bg-panel-hover px-0.5 -mx-0.5 ${className}`}
    >
      {value.toLocaleString()}
    </span>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pt-7 first:pt-0">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-orange mb-4">{label}</p>
      {children}
    </div>
  )
}

// ─── Add button ───────────────────────────────────────────────────────────────

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 flex items-center gap-1.5 text-xs text-orange hover:text-orange-hover transition-colors"
    >
      <Plus className="w-3 h-3" />
      {label}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScopeEditorClient({ scope, versions = [] }: Props) {
  const router = useRouter()
  const { save, saveState } = useAutoSave(scope.id)

  const [status, setStatus] = useState<Status>(scope.status)
  const [generated, setGenerated] = useState<GeneratedScope | null>(scope.generatedScope)
  const [isExporting, setIsExporting] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [pdfIsStale, setPdfIsStale] = useState(false)

  // Resizable transcript panel
  const TRANSCRIPT_MIN = 240
  const TRANSCRIPT_MAX = 640
  const TRANSCRIPT_DEFAULT = 320
  const [transcriptWidth, setTranscriptWidth] = useState(TRANSCRIPT_DEFAULT)
  const isDragging = useRef(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current || !bodyRef.current) return
      const rect = bodyRef.current.getBoundingClientRect()
      const newWidth = Math.min(TRANSCRIPT_MAX, Math.max(TRANSCRIPT_MIN, rect.right - e.clientX))
      setTranscriptWidth(newWidth)
    }
    function onMouseUp() {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // Poll until scope generates
  useEffect(() => {
    if (generated) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scopes/${scope.id}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.generatedScope) setGenerated(data.generatedScope as GeneratedScope)
      } catch {}
    }, 4000)
    return () => clearInterval(interval)
  }, [scope.id, generated])

  async function handleRetry() {
    setIsRetrying(true)
    try {
      const res = await fetch(`/api/scopes/${scope.id}/generate`, { method: 'POST' })
      const data = await res.json()
      if (data.generatedScope) setGenerated(data.generatedScope as GeneratedScope)
    } catch {}
    setIsRetrying(false)
  }

  async function handleStatusChange(newStatus: Status) {
    setStatus(newStatus)
    await save({ status: newStatus })
  }

  async function handleExportPdf() {
    setIsExporting(true)
    try {
      const res = await fetch(`/api/scopes/${scope.id}/export`, { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank')
        setPdfIsStale(false)
      }
    } catch {}
    setIsExporting(false)
  }

  // Saves the full generatedScope with a partial update merged in
  function patch(partial: Partial<GeneratedScope>) {
    if (!generated) return
    const updated = { ...generated, ...partial }
    setPdfIsStale(true)
    setGenerated(updated)
    save({ generatedScope: updated })
  }

  // ── Deliverables ─────────────────────────────────────────────────────────

  function updateDeliverable(id: string, changes: Partial<Deliverable>) {
    if (!generated) return
    patch({ deliverables: generated.deliverables.map(d => d.id === id ? { ...d, ...changes } : d) })
  }

  function removeDeliverable(id: string) {
    if (!generated) return
    patch({ deliverables: generated.deliverables.filter(d => d.id !== id) })
  }

  function addDeliverable() {
    if (!generated) return
    patch({
      deliverables: [
        ...generated.deliverables,
        { id: nanoid(), title: '', description: '', phase: '' },
      ],
    })
  }

  // ── Milestones ────────────────────────────────────────────────────────────

  function updateMilestone(id: string, changes: Partial<Milestone>) {
    if (!generated) return
    patch({ milestones: generated.milestones.map(m => m.id === id ? { ...m, ...changes } : m) })
  }

  function removeMilestone(id: string) {
    if (!generated) return
    patch({ milestones: generated.milestones.filter(m => m.id !== id) })
  }

  function moveMilestone(id: string, dir: -1 | 1) {
    if (!generated) return
    const sorted = [...generated.milestones].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex(m => m.id === id)
    const target = idx + dir
    if (target < 0 || target >= sorted.length) return
    const reordered = sorted.map((m, i) => {
      if (i === idx) return { ...m, order: sorted[target].order }
      if (i === target) return { ...m, order: sorted[idx].order }
      return m
    })
    patch({ milestones: reordered })
  }

  function addMilestone() {
    if (!generated) return
    const maxOrder = generated.milestones.reduce((m, x) => Math.max(m, x.order), 0)
    patch({
      milestones: [
        ...generated.milestones,
        { id: nanoid(), name: '', duration: '', deliverables: [], order: maxOrder + 1 },
      ],
    })
  }

  // ── String lists ──────────────────────────────────────────────────────────

  function updateListItem(key: 'outOfScope' | 'assumptions', idx: number, val: string) {
    if (!generated) return
    const arr = [...generated[key]]
    arr[idx] = val
    patch({ [key]: arr })
  }

  function removeListItem(key: 'outOfScope' | 'assumptions', idx: number) {
    if (!generated) return
    patch({ [key]: generated[key].filter((_, i) => i !== idx) })
  }

  function addListItem(key: 'outOfScope' | 'assumptions') {
    if (!generated) return
    patch({ [key]: [...generated[key], ''] })
  }

  // ── Risk flags ────────────────────────────────────────────────────────────

  function updateRiskFlag(id: string, changes: Partial<RiskFlag>) {
    if (!generated) return
    patch({ riskFlags: generated.riskFlags.map(r => r.id === id ? { ...r, ...changes } : r) })
  }

  function removeRiskFlag(id: string) {
    if (!generated) return
    patch({ riskFlags: generated.riskFlags.filter(r => r.id !== id) })
  }

  function addRiskFlag() {
    if (!generated) return
    patch({
      riskFlags: [
        ...generated.riskFlags,
        { id: nanoid(), severity: 'medium', title: '', description: '' },
      ],
    })
  }

  // ─────────────────────────────────────────────────────────────────────────

  const transcript = scope.transcript ?? []
  const createdDate = scope.createdAt
    ? new Date(scope.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  // Generating state
  if (!generated) {
    return (
      <div className="h-full flex flex-col">
        <header className="flex-shrink-0 border-b border-line px-6 h-12 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Scopes
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-6 h-6 border-2 border-line border-t-orange rounded-full animate-spin mx-auto mb-5" />
            <p className="text-sm font-medium text-ink mb-1">Generating scope</p>
            <p className="text-xs text-ink-3">Checking every few seconds</p>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="mt-5 text-xs text-ink-3 hover:text-orange underline-offset-2 underline transition-colors disabled:opacity-50"
            >
              {isRetrying ? 'Generating...' : 'Taking long? Retry now'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const sortedMilestones = [...generated.milestones].sort((a, b) => a.order - b.order)

  return (
    <div className="h-full flex flex-col">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 border-b border-line px-6 h-12 flex items-center justify-between gap-4 bg-canvas">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Scopes
        </button>

        <div className="flex items-center gap-3 flex-shrink-0">
          {saveState === 'saving' && (
            <span className="text-xs text-ink-3">Saving…</span>
          )}
          {saveState === 'saved' && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Saved
            </span>
          )}

          <select
            value={status}
            onChange={e => handleStatusChange(e.target.value as Status)}
            className={`text-xs font-medium rounded-full border px-3 py-1 focus:outline-none transition-colors cursor-pointer ${STATUS_COLORS[status]}`}
          >
            {(Object.keys(STATUS_LABELS) as Status[]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            title={pdfIsStale ? 'Changes made since last export' : undefined}
            className="relative flex items-center gap-1.5 bg-ink text-canvas text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-80 disabled:opacity-40 transition-opacity"
          >
            {pdfIsStale && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange ring-2 ring-canvas" />
            )}
            <Download className="w-3 h-3" />
            {isExporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </header>

      {/* ── Body: left scroll + right transcript ────────────────────────────── */}
      <div ref={bodyRef} className="flex-1 overflow-hidden flex">

        {/* Left — scrollable scope content, fills all available space */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-10 py-10">

            {/* Version history strip */}
            {versions.length > 1 && (
              <div className="flex items-center gap-1.5 mb-6">
                {versions.map((v, i) => {
                  const isCurrent = v.id === scope.id
                  const label = `v${i + 1}`
                  return isCurrent ? (
                    <span
                      key={v.id}
                      className="text-[11px] font-semibold text-orange bg-orange-dim border border-orange-border rounded-full px-2.5 py-0.5"
                    >
                      {label}
                    </span>
                  ) : (
                    <a
                      key={v.id}
                      href={`/scopes/${v.id}`}
                      className="text-[11px] font-medium text-ink-3 hover:text-ink bg-panel-hover border border-line rounded-full px-2.5 py-0.5 transition-colors"
                      title={v.name ?? undefined}
                    >
                      {label}
                    </a>
                  )
                })}
                <span className="text-[11px] text-ink-3 ml-1">
                  {versions.length} version{versions.length > 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Scope identity */}
            <div className="mb-10">
              <h1 className="text-2xl font-semibold text-ink leading-tight">
                {scope.name ?? scope.clientName ?? 'Untitled scope'}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {scope.clientEmail && (
                  <span className="text-sm text-ink-3">{scope.clientEmail}</span>
                )}
                {scope.clientEmail && createdDate && (
                  <span className="text-ink-3">·</span>
                )}
                {createdDate && (
                  <span className="text-sm text-ink-3">{createdDate}</span>
                )}
                {generated.confidence && (
                  <>
                    <span className="text-ink-3">·</span>
                    <span className={`text-xs font-medium ${
                      generated.confidence === 'high' ? 'text-green-600' :
                      generated.confidence === 'medium' ? 'text-amber-600' : 'text-red-500'
                    }`}>
                      {generated.confidence === 'high' ? 'Complete intake' :
                       generated.confidence === 'medium' ? 'Some gaps' : 'Significant gaps'}
                    </span>
                  </>
                )}
              </div>

              {/* Review flags — subtle, not a banner */}
              {generated.requiresHumanReview && generated.reviewFlags?.length > 0 && (
                <div className="mt-3 flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-ink-3 mt-0.5 flex-shrink-0" />
                  <ul className="space-y-0.5">
                    {generated.reviewFlags.map(f => (
                      <li key={f.id} className="text-xs text-ink-3">{f.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="divide-y divide-line space-y-0">

              {/* Executive Summary */}
              <Section label="Executive Summary">
                <EditableText
                  value={generated.executiveSummary}
                  onSave={v => patch({ executiveSummary: v })}
                  multiline
                  placeholder="Add an executive summary…"
                  className="text-sm text-ink leading-relaxed block w-full"
                />
              </Section>

              {/* Deliverables */}
              <Section label="Deliverables">
                <div className="space-y-3">
                  {generated.deliverables.map(d => (
                    <div key={d.id} className="group relative">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <EditableText
                            value={d.title}
                            onSave={v => updateDeliverable(d.id, { title: v })}
                            placeholder="Deliverable title"
                            className="text-sm font-medium text-orange block w-full"
                          />
                          <EditableText
                            value={d.description}
                            onSave={v => updateDeliverable(d.id, { description: v })}
                            multiline
                            placeholder="Description"
                            className="text-sm text-ink-2 mt-0.5 block w-full"
                          />
                          {(d.phase || true) && (
                            <EditableText
                              value={d.phase}
                              onSave={v => updateDeliverable(d.id, { phase: v })}
                              placeholder="Phase"
                              className="text-xs text-ink-3 mt-1 block"
                            />
                          )}
                        </div>
                        <button
                          onClick={() => removeDeliverable(d.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-3 hover:text-red-400 flex-shrink-0 mt-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <AddButton label="Add deliverable" onClick={addDeliverable} />
              </Section>

              {/* Milestones */}
              <Section label="Milestones">
                <div className="space-y-2">
                  {sortedMilestones.map((m, idx) => (
                    <div key={m.id} className="group flex items-center gap-3">
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => moveMilestone(m.id, -1)}
                          disabled={idx === 0}
                          className="text-ink-3 hover:text-ink disabled:opacity-20 transition-colors"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveMilestone(m.id, 1)}
                          disabled={idx === sortedMilestones.length - 1}
                          className="text-ink-3 hover:text-ink disabled:opacity-20 transition-colors"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="w-20 flex-shrink-0">
                        <EditableText
                          value={m.duration}
                          onSave={v => updateMilestone(m.id, { duration: v })}
                          placeholder="Duration"
                          className="text-xs text-ink-3 font-medium block"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <EditableText
                          value={m.name}
                          onSave={v => updateMilestone(m.id, { name: v })}
                          placeholder="Milestone name"
                          className="text-sm font-medium text-orange block w-full"
                        />
                      </div>
                      <button
                        onClick={() => removeMilestone(m.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-3 hover:text-red-400 flex-shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <AddButton label="Add milestone" onClick={addMilestone} />
              </Section>

              {/* Investment */}
              <Section label="Investment Estimate">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <div>
                    <p className="text-[10px] text-ink-3 mb-1 uppercase tracking-wide">Low</p>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-lg font-semibold text-ink">{generated.pricingEstimate.currency}</span>
                      <EditableNumber
                        value={generated.pricingEstimate.low}
                        onSave={v => patch({ pricingEstimate: { ...generated.pricingEstimate, low: v } })}
                        className="text-lg font-semibold text-ink"
                      />
                    </div>
                  </div>
                  <span className="text-ink-3 text-lg">—</span>
                  <div>
                    <p className="text-[10px] text-ink-3 mb-1 uppercase tracking-wide">High</p>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-lg font-semibold text-ink">{generated.pricingEstimate.currency}</span>
                      <EditableNumber
                        value={generated.pricingEstimate.high}
                        onSave={v => patch({ pricingEstimate: { ...generated.pricingEstimate, high: v } })}
                        className="text-lg font-semibold text-ink"
                      />
                    </div>
                  </div>
                  <select
                    value={generated.pricingEstimate.currency}
                    onChange={e => patch({ pricingEstimate: { ...generated.pricingEstimate, currency: e.target.value } })}
                    className="text-xs text-ink-3 bg-panel border-0 focus:outline-none cursor-pointer self-end mb-0.5 rounded"
                  >
                    <optgroup label="Most Used">
                      {TOP_CURRENCIES.map(({ code, name }) => (
                        <option key={code} value={code}>{code} — {name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="All Currencies">
                      {ALL_CURRENCIES.map(({ code, name }) => (
                        <option key={code} value={code}>{code} — {name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                {generated.pricingEstimate.notes && (
                  <p className="text-xs text-ink-2 mt-2 leading-relaxed">
                    {generated.pricingEstimate.notes}
                  </p>
                )}
                <p className="text-[11px] text-ink-3 mt-3 leading-relaxed">
                  Indicative estimate. Final pricing subject to detailed review.
                </p>
              </Section>

              {/* Risk Flags */}
              {(generated.riskFlags.length > 0 || true) && (
                <Section label="Risk Flags">
                  <div className="space-y-3">
                    {generated.riskFlags.map(r => (
                      <div key={r.id} className="group flex items-start gap-3">
                        <select
                          value={r.severity}
                          onChange={e => updateRiskFlag(r.id, { severity: e.target.value as RiskFlag['severity'] })}
                          className={`text-[10px] font-semibold uppercase tracking-wide rounded-full border px-2 py-0.5 focus:outline-none cursor-pointer flex-shrink-0 mt-0.5 ${RISK_COLORS[r.severity]}`}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <div className="flex-1 min-w-0">
                          <EditableText
                            value={r.title}
                            onSave={v => updateRiskFlag(r.id, { title: v })}
                            placeholder="Risk title"
                            className="text-sm font-medium text-orange block w-full"
                          />
                          <EditableText
                            value={r.description}
                            onSave={v => updateRiskFlag(r.id, { description: v })}
                            multiline
                            placeholder="Description"
                            className="text-sm text-ink-2 mt-0.5 block w-full"
                          />
                        </div>
                        <button
                          onClick={() => removeRiskFlag(r.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-3 hover:text-red-400 flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <AddButton label="Add risk flag" onClick={addRiskFlag} />
                </Section>
              )}

              {/* Out of Scope */}
              <Section label="Out of Scope">
                <div className="space-y-1.5">
                  {generated.outOfScope.map((item, i) => (
                    <div key={i} className="group flex items-start gap-2">
                      <span className="text-ink-3 text-sm mt-0.5 flex-shrink-0">—</span>
                      <EditableText
                        value={item}
                        onSave={v => updateListItem('outOfScope', i, v)}
                        placeholder="Add item…"
                        className="text-sm text-ink-2 flex-1 block"
                      />
                      <button
                        onClick={() => removeListItem('outOfScope', i)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-3 hover:text-red-400 flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <AddButton label="Add item" onClick={() => addListItem('outOfScope')} />
              </Section>

              {/* Assumptions */}
              <Section label="Assumptions">
                <div className="space-y-1.5">
                  {generated.assumptions.map((a, i) => (
                    <div key={i} className="group flex items-start gap-2">
                      <span className="text-orange text-sm mt-0.5 flex-shrink-0">•</span>
                      <EditableText
                        value={a}
                        onSave={v => updateListItem('assumptions', i, v)}
                        placeholder="Add assumption…"
                        className="text-sm text-ink-2 flex-1 block"
                      />
                      <button
                        onClick={() => removeListItem('assumptions', i)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-3 hover:text-red-400 flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <AddButton label="Add assumption" onClick={() => addListItem('assumptions')} />
              </Section>

            </div>
          </div>
        </div>

        {/* Drag handle */}
        <div
          onMouseDown={() => {
            isDragging.current = true
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
          }}
          className="w-1 flex-shrink-0 relative group cursor-col-resize border-l border-line hover:border-orange transition-colors"
        >
          {/* Visual grip dots */}
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {[0,1,2].map(i => (
              <div key={i} className="w-1 h-1 rounded-full bg-orange" />
            ))}
          </div>
        </div>

        {/* Right — transcript sidebar, resizable */}
        <aside className="flex-shrink-0 border-line overflow-y-auto" style={{ width: transcriptWidth }}>
          <div className="px-5 py-6">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-orange mb-5">
              Intake Transcript
            </p>
            <div className="space-y-2">
              {transcript.length === 0 ? (
                <p className="text-xs text-ink-3 italic">No transcript recorded.</p>
              ) : transcript.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-ink text-canvas'
                      : 'bg-panel-hover text-ink-2 border border-line'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

      </div>
    </div>
  )
}
