import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

const TRIP_ID = Number(import.meta.env.VITE_SUPABASE_TRIP_ID || 1)
const ALLOWED_EMAILS = (import.meta.env.VITE_ALLOWED_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)
const NUMBER_POOL = Array.from({ length: 99 }, (_, index) => index + 1)
const stashOwners = [
  { key: 'renato_separated', label: 'Renato' },
  { key: 'livia_separated', label: 'Livia' },
]

const weekDayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'long',
  timeStyle: 'short',
})
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

const defaultState = {
  destination: 'Nossa viagem dos sonhos',
  targetAmount: 5000,
  tripDate: '',
  history: [],
}

function getWeekTypeFromDate(date) {
  const day = date.getDay()

  if (day === 1) {
    return 'monday'
  }

  if (day === 5) {
    return 'friday'
  }

  return 'monday'
}

function getWeekTypeLabel(type) {
  return type === 'monday' ? 'Segunda-feira' : 'Sexta-feira'
}

function getWeekTypeHint(type) {
  return type === 'monday'
    ? 'Segunda sorteia so de 1 a 49. Sexta vale qualquer numero livre de 1 a 99.'
    : 'Sexta sorteia qualquer numero livre de 1 a 99.'
}

function getCurrentDayMessage() {
  const now = new Date()
  const weekDay = weekDayFormatter.format(now)

  if (now.getDay() === 1 || now.getDay() === 5) {
    return `Hoje e ${weekDay}. A regra do dia ja esta aplicada.`
  }

  return `Hoje e ${weekDay}. O sorteio fica liberado so na segunda e na sexta.`
}

function formatCurrency(value) {
  return currencyFormatter.format(value)
}

function formatDate(value) {
  return dateFormatter.format(new Date(value))
}

function getEligibleNumbers(history, drawType) {
  const usedNumbers = new Set(history.map((entry) => Number(entry.number)))

  return NUMBER_POOL.filter((number) => {
    if (usedNumbers.has(number)) {
      return false
    }

    if (drawType === 'monday') {
      return number < 50
    }

    return true
  })
}

function countWeekdaysUntilTrip(tripDate) {
  if (!tripDate) {
    return { mondays: null, fridays: null }
  }

  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = new Date(`${tripDate}T00:00:00`)

  if (Number.isNaN(end.getTime()) || end < start) {
    return { mondays: 0, fridays: 0 }
  }

  const cursor = new Date(start)
  let mondays = 0
  let fridays = 0

  while (cursor <= end) {
    const day = cursor.getDay()

    if (day === 1) {
      mondays += 1
    }

    if (day === 5) {
      fridays += 1
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return { mondays, fridays }
}

function normalizeTrip(trip, history) {
  return {
    destination: trip?.name || defaultState.destination,
    targetAmount:
      Number.isFinite(trip?.target_amount) && trip.target_amount > 0
        ? trip.target_amount
        : defaultState.targetAmount,
    tripDate: trip?.trip_date || '',
    history: Array.isArray(history) ? history : [],
  }
}

function getUserEmail(user) {
  return user?.email?.toLowerCase() || ''
}

function isAllowedUser(user) {
  if (ALLOWED_EMAILS.length === 0) {
    return true
  }

  return ALLOWED_EMAILS.includes(getUserEmail(user))
}

async function fetchTripState() {
  const [{ data: trip, error: tripError }, { data: draws, error: drawsError }] =
    await Promise.all([
      supabase.from('trips').select('*').eq('id', TRIP_ID).single(),
      supabase.from('draws').select('*').eq('trip_id', TRIP_ID).order('drawn_at', { ascending: false }),
    ])

  if (tripError) {
    throw tripError
  }

  if (drawsError) {
    throw drawsError
  }

  return normalizeTrip(trip, draws)
}

function App() {
  const [authMode, setAuthMode] = useState('signin')
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authBusy, setAuthBusy] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [appState, setAppState] = useState(defaultState)
  const [highlightedNumber, setHighlightedNumber] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) {
        return
      }

      if (error) {
        setErrorMessage(error.message || 'Nao foi possivel verificar sua sessao.')
      }

      setSession(data.session)
      setAuthLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
      setAuthMessage('')
      setErrorMessage('')
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadState() {
      if (!session || !isAllowedUser(session.user)) {
        setAppState(defaultState)
        setHighlightedNumber(null)
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const nextState = await fetchTripState()

        if (!active) {
          return
        }

        setAppState(nextState)
        setErrorMessage('')
      } catch (error) {
        if (active) {
          setErrorMessage(error.message || 'Nao foi possivel carregar os dados.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadState()

    return () => {
      active = false
    }
  }, [session])

  const user = session?.user ?? null
  const canAccessApp = Boolean(session && isAllowedUser(user))
  const history = appState.history
  const totalSaved = history.reduce((sum, entry) => sum + Number(entry.amount), 0)
  const usedNumbers = new Set(history.map((entry) => Number(entry.number)))

  const completion = Math.round((history.length / 99) * 100)
  const targetProgress = appState.targetAmount
    ? Math.min(100, Math.round((totalSaved / appState.targetAmount) * 100))
    : 0
  const fridayRemaining = getEligibleNumbers(history, 'friday').length
  const lastEntry = history[0]
  const tripCountdown = countWeekdaysUntilTrip(appState.tripDate)
  const appReady = canAccessApp && !loading
  const today = new Date()
  const isDrawDay = today.getDay() === 1 || today.getDay() === 5
  const activeDrawType = getWeekTypeFromDate(today)
  const activeEligibleNumbers = getEligibleNumbers(history, activeDrawType)

  async function refreshState(nextHighlight = null) {
    const nextState = await fetchTripState()

    setAppState(nextState)
    setHighlightedNumber(nextHighlight)
  }

  async function handleSignIn(event) {
    event.preventDefault()

    if (!authEmail || !authPassword) {
      setAuthMessage('Preencha e-mail e senha para entrar.')
      return
    }

    setAuthBusy(true)
    setAuthMessage('')
    setErrorMessage('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      })

      if (error) {
        throw error
      }

      setAuthPassword('')
    } catch (error) {
      setAuthMessage(error.message || 'Nao foi possivel entrar agora.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleSignUp(event) {
    event.preventDefault()

    if (!authEmail || !authPassword) {
      setAuthMessage('Preencha e-mail e senha para criar a conta.')
      return
    }

    setAuthBusy(true)
    setAuthMessage('')
    setErrorMessage('')

    try {
      const { error } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
      })

      if (error) {
        throw error
      }

      setAuthPassword('')
      setAuthMode('signin')
      setAuthMessage('Conta criada. Agora e so entrar com o e-mail e a senha.')
    } catch (error) {
      setAuthMessage(error.message || 'Nao foi possivel criar a conta agora.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleSignOut() {
    setAuthBusy(true)
    setAuthMessage('')

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }
    } catch (error) {
      setAuthMessage(error.message || 'Nao foi possivel sair agora.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleDraw() {
    if (!appReady || !isDrawDay || activeEligibleNumbers.length === 0) {
      return
    }

    setBusyAction('draw')
    setErrorMessage('')
    setNotice('')

    try {
      const randomIndex = Math.floor(Math.random() * activeEligibleNumbers.length)
      const number = activeEligibleNumbers[randomIndex]

      const { error } = await supabase.from('draws').insert({
        trip_id: TRIP_ID,
        number,
        amount: number,
        draw_type: activeDrawType,
        renato_separated: false,
        livia_separated: false,
      })

      if (error) {
        throw error
      }

      await refreshState(number)
      setNotice(`Sorteio salvo: ${number} (${formatCurrency(number)}).`)
    } catch (error) {
      setErrorMessage(error.message || 'Nao foi possivel salvar o sorteio.')
    } finally {
      setBusyAction('')
    }
  }

  async function handleToggleSeparated(drawId, field, currentValue) {
    setBusyAction(`${field}-${drawId}`)
    setErrorMessage('')
    setNotice('')

    try {
      const { error } = await supabase.from('draws').update({ [field]: !currentValue }).eq('id', drawId)

      if (error) {
        throw error
      }

      await refreshState(highlightedNumber)
    } catch (error) {
      setErrorMessage(error.message || 'Nao foi possivel atualizar a caixinha.')
    } finally {
      setBusyAction('')
    }
  }

  function renderHistoryItem(entry) {
    return (
      <article key={entry.id} className="history-item">
        <div className="history-number">{entry.number}</div>

        <div className="history-content">
          <strong>{formatCurrency(Number(entry.amount))} guardados</strong>
          <p>
            {getWeekTypeLabel(entry.draw_type)} · {formatDate(entry.drawn_at)}
          </p>
        </div>

        <div className="history-flags" aria-label="Status da caixinha">
          {stashOwners.map((owner) => {
            const isChecked = Boolean(entry[owner.key])
            const isSaving = busyAction === `${owner.key}-${entry.id}`

            return (
              <button
                key={owner.key}
                type="button"
                className={['toggle-chip', isChecked ? 'checked' : ''].filter(Boolean).join(' ')}
                onClick={() => handleToggleSeparated(entry.id, owner.key, isChecked)}
                disabled={Boolean(busyAction)}
                aria-pressed={isChecked}
              >
                <span>{owner.label}</span>
                <strong>{isSaving ? '...' : isChecked ? 'Sim' : 'Nao'}</strong>
              </button>
            )
          })}
        </div>
      </article>
    )
  }

  if (authLoading) {
    return (
      <main className="app-shell auth-shell">
        <section className="card auth-card">
          <h1>Verificando a sessao...</h1>
        </section>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="app-shell auth-shell">
        <section className="card auth-card">
          <h1>{authMode === 'signin' ? 'Entrar na caixinha' : 'Criar conta'}</h1>

          <form className="auth-form" onSubmit={authMode === 'signin' ? handleSignIn : handleSignUp}>
            <label className="field">
              <span>Seu e-mail</span>
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                placeholder="voce@exemplo.com"
                autoComplete="email"
              />
            </label>

            <label className="field">
              <span>Sua senha</span>
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
              />
            </label>

            <button type="submit" className="draw-button" disabled={authBusy}>
              {authBusy
                ? authMode === 'signin'
                  ? 'Entrando...'
                  : 'Criando conta...'
                : authMode === 'signin'
                  ? 'Entrar'
                  : 'Criar minha conta'}
            </button>
          </form>

          <div className="auth-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
                setAuthMessage('')
              }}
              disabled={authBusy}
            >
              {authMode === 'signin' ? 'Primeiro acesso? Cadastre-se' : 'Voltar para entrar'}
            </button>
          </div>

          <div className="status-box">
            {authMessage ? <p>{authMessage}</p> : null}
          </div>
        </section>
      </main>
    )
  }

  if (!canAccessApp) {
    return (
      <main className="app-shell auth-shell">
        <section className="card auth-card">
          <h1>Esse e-mail nao esta liberado</h1>
          <p className="auth-copy">
            {getUserEmail(user)} entrou, mas o app esta configurado para aceitar apenas os e-mails da
            lista permitida.
          </p>

          <div className="status-box">
            <p className="error-text">
              Confere se `VITE_ALLOWED_EMAILS` e as policies do Supabase incluem voces dois.
            </p>
          </div>

          <button type="button" className="ghost-button auth-signout" onClick={handleSignOut}>
            Sair
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="compact-layout">
        <article className="card hero-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Caixinha da viagem</p>
              <h1>{appState.destination || 'Destino indefinido'}</h1>
            </div>

            <button type="button" className="ghost-button" onClick={handleSignOut} disabled={authBusy}>
              {authBusy ? 'Saindo...' : 'Sair'}
            </button>
          </div>

          <div className="hero-metrics">
            <div className="metric-block feature">
              <span>Guardado ate agora</span>
              <strong>{formatCurrency(totalSaved)}</strong>
              <small>
                {appState.targetAmount > 0
                  ? `${targetProgress}% da meta de ${formatCurrency(appState.targetAmount)}`
                  : 'Defina uma meta para acompanhar o total'}
              </small>
            </div>
            <div className="metric-block">
              <span>Meta em reais</span>
              <strong>{formatCurrency(appState.targetAmount)}</strong>
              <small>Valor definido para essa viagem</small>
            </div>
            <div className="metric-block">
              <span>Segundas ate a viagem</span>
              <strong>{tripCountdown.mondays ?? '--'}</strong>
              {appState.tripDate ? null : <small>Defina a data para calcular</small>}
            </div>
            <div className="metric-block">
              <span>Sextas ate a viagem</span>
              <strong>{tripCountdown.fridays ?? '--'}</strong>
              {appState.tripDate ? null : <small>Defina a data para calcular</small>}
            </div>
          </div>

          <div className="status-box">
            {loading ? <p>Carregando dados do Supabase...</p> : null}
            {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
            {notice ? <p className="notice-text">{notice}</p> : null}
            {!loading && !errorMessage ? <p>Logado como {user.email}</p> : null}
          </div>
        </article>

        <article className="card draw-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Sorteio</p>
              <h2>{getWeekTypeLabel(activeDrawType)}</h2>
            </div>
            <span className="status-pill">{activeEligibleNumbers.length} livres</span>
          </div>

          <p className="support-text">{getCurrentDayMessage()}</p>
          <p className="rule-note">{getWeekTypeHint(activeDrawType)}</p>

          <div className="number-spotlight">
            <span className="spotlight-label">Numero atual</span>
            <strong>{highlightedNumber ?? '--'}</strong>
          </div>

          <button
            type="button"
            className="draw-button"
            onClick={handleDraw}
            disabled={
              !appReady || !isDrawDay || busyAction === 'draw' || activeEligibleNumbers.length === 0
            }
          >
            {busyAction === 'draw'
              ? 'Sorteando...'
              : !isDrawDay
                ? 'Nao disponivel hoje'
                : activeEligibleNumbers.length === 0
                  ? 'Sem numeros disponiveis'
                  : 'Sortear valor'}
          </button>

          <div className="quick-stats">
            <div>
              <span>Ultimo registro</span>
              <strong>{lastEntry ? formatCurrency(Number(lastEntry.amount)) : '--'}</strong>
            </div>
            <div>
              <span>Livres para sexta</span>
              <strong>{fridayRemaining}</strong>
            </div>
          </div>
        </article>

        <article className="card board-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Mapa visual</p>
              <h2>Numeros de 1 a 99</h2>
            </div>
            <div className="board-meta">
              <span className="status-pill">{history.length}/99 usados</span>
              <span className="legend">
                <span className="legend-dot used" />
                saiu
                <span className="legend-dot available" />
                livre
              </span>
            </div>
          </div>

          <div className="progress-panel compact">
            <div>
              <div className="progress-label">
                <span>Progresso dos numeros</span>
                <strong>{completion}%</strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill warm" style={{ width: `${completion}%` }} />
              </div>
            </div>
            <div>
              <div className="progress-label">
                <span>Progresso da meta</span>
                <strong>{targetProgress}%</strong>
              </div>
              <div className="progress-track">
                <div className="progress-fill cool" style={{ width: `${targetProgress}%` }} />
              </div>
            </div>
          </div>

          <div className="number-board">
            {NUMBER_POOL.map((number) => {
              const isUsed = usedNumbers.has(number)
              const isJustDrawn = highlightedNumber === number

              return (
                <div
                  key={number}
                  className={[
                    'number-chip',
                    isUsed ? 'used' : 'available',
                    isJustDrawn ? 'highlighted' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {number}
                </div>
              )
            })}
          </div>
        </article>

        <article className="card history-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Historico</p>
              <h2>Ultimos sorteios</h2>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="empty-state">
              <strong>Nenhum sorteio registrado ainda.</strong>
              <p>O primeiro sorteio vai aparecer aqui com data e valor.</p>
            </div>
          ) : (
            <>
              <div className="history-list compact">{history.slice(0, 6).map(renderHistoryItem)}</div>

              {history.length > 6 ? (
                <details className="history-details">
                  <summary>Ver historico completo ({history.length})</summary>
                  <div className="history-list expanded">{history.slice(6).map(renderHistoryItem)}</div>
                </details>
              ) : null}
            </>
          )}
        </article>
      </section>
    </main>
  )
}

export default App
