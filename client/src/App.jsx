import React from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import { requestCurrentLocation } from './utils/geolocation.js';

function AuthLayout({ children, title, subtitle }) {
  return <main className="auth-layout"><section className="auth-card">
    <div className="brand-mark">OA</div><p className="eyebrow">Office Attendance</p>
    <h1>{title}</h1><p className="description">{subtitle}</p>{children}
  </section></main>;
}

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  if (user) return <Navigate to={user.role === 'hr' ? '/hr' : '/employee'} replace />;
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    try { const account = await login({ email: form.get('email'), password: form.get('password') }); navigate(account.role === 'hr' ? '/hr' : '/employee'); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  return <AuthLayout title="Welcome back" subtitle="Sign in with your work account.">
    <form onSubmit={submit} className="form">
      <label>Email<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <p className="form-footer">New to the workspace? <NavLink to="/register">Create an account</NavLink></p>
  </AuthLayout>;
}

function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  if (user) return <Navigate to={user.role === 'hr' ? '/hr' : '/employee'} replace />;
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    const details = Object.fromEntries(form.entries());
    try { const account = await register(details); navigate(account.role === 'hr' ? '/hr' : '/employee'); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  return <AuthLayout title="Create your account" subtitle="Register with your employee details.">
    <form onSubmit={submit} className="form">
      <label>Full name<input name="name" autoComplete="name" required maxLength="100" /></label>
      <label>Employee ID<input name="employeeId" required /></label>
      <label>Work email<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" autoComplete="new-password" minLength="8" required /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
    </form>
    <p className="form-footer">Already registered? <NavLink to="/login">Sign in</NavLink></p>
  </AuthLayout>;
}

function Dashboard({ kind }) {
  const { user, logout } = useAuth();
  const title = kind === 'hr' ? 'HR dashboard' : 'Employee dashboard';
  const [attendance, setAttendance] = React.useState(null);
  const [attendanceLoading, setAttendanceLoading] = React.useState(kind === 'employee');
  const [punchingIn, setPunchingIn] = React.useState(false);
  const [attendanceError, setAttendanceError] = React.useState('');
  const [attendanceMessage, setAttendanceMessage] = React.useState('');

  React.useEffect(() => {
    if (kind !== 'employee') return undefined;
    let active = true;
    fetch('/api/attendance/today', {
      headers: { Authorization: `Bearer ${localStorage.getItem('office-attendance-token')}` },
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load today\'s attendance.');
      return data;
    }).then((data) => { if (active) setAttendance(data.attendance); })
      .catch((error) => { if (active) setAttendanceError(error.message); })
      .finally(() => { if (active) setAttendanceLoading(false); });
    return () => { active = false; };
  }, [kind]);

  function locateAndPunchIn() {
    setAttendanceError('');
    setAttendanceMessage('');
    setPunchingIn(true);
    requestCurrentLocation().then(async (location) => {
      try {
        const token = localStorage.getItem('office-attendance-token');
        const response = await fetch('/api/attendance/punch-in', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(location),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to record punch-in.');
        setAttendance(result.attendance);
        setAttendanceMessage(result.message);
      } catch (error) {
        setAttendanceError(error.message);
      } finally {
        setPunchingIn(false);
      }
    }).catch((error) => {
      setAttendanceError(error.message);
      setPunchingIn(false);
    });
  }

  return <main className="dashboard-shell"><header className="topbar">
    <div className="brand"><span className="brand-mark small">OA</span><span>Office Attendance</span></div>
    <button className="button-secondary" onClick={logout}>Log out</button>
  </header><section className="dashboard-card">
    <p className="eyebrow">{kind === 'hr' ? 'Human resources' : 'Employee workspace'}</p>
    <h1>{title}</h1><p className="description">Hello, {user.name}. {kind === 'employee' ? 'Here is your attendance for today.' : 'Your account is signed in successfully.'}</p>
    {kind === 'employee' ? <section className="attendance-panel" aria-labelledby="attendance-heading">
      <div className="attendance-heading"><div><p className="section-label">Today</p><h2 id="attendance-heading">Attendance status</h2></div>
        {attendance && <span className={`attendance-badge ${attendance.status.toLowerCase()}`}>{attendance.status}</span>}
      </div>
      {attendanceLoading ? <p className="attendance-note">Loading today&apos;s attendance…</p> : attendance ? <>
        <p className="punch-time">Punched in at <strong>{attendance.punchInTime || `${new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(attendance.punchInTimestamp))} IST`}</strong></p>
        <p className="attendance-note">Your punch-in for today has been recorded.</p>
      </> : <>
        <p className="attendance-note">You have not punched in today.</p>
        <button className="punch-button" onClick={locateAndPunchIn} disabled={punchingIn}>{punchingIn ? 'Getting location…' : 'Punch In'}</button>
      </>}
      {attendanceError && <p className="form-error attendance-feedback" role="alert">{attendanceError}</p>}
      {attendanceMessage && <p className="success-message attendance-feedback" role="status">{attendanceMessage}</p>}
    </section> : <div className="placeholder"><strong>Workspace ready</strong><span>Dashboard tools will be added in a later phase.</span></div>}
    <p className="account-meta">{user.employeeId} · {user.email}</p>
  </section></main>;
}

function App() {
  return <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route element={<ProtectedRoute roles={['employee']} />}><Route path="/employee" element={<Dashboard kind="employee" />} /></Route>
    <Route element={<ProtectedRoute roles={['hr']} />}><Route path="/hr" element={<Dashboard kind="hr" />} /></Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}

export default App;
