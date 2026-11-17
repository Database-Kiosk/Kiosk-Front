import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { fetchAdminMe, loginAdmin } from '../../api/adminAuthApi.js';
import AdminStateView from '../../components/admin/AdminStateView.jsx';
import './admin.css';
import './AdminLoginPage.css';

// Admin login page. Entry URL: /admin/login
// POST /api/admin/login (Kiosk-Server) sets the login cookie. After a successful login the admin goes
// back to the admin page RequireAdmin sent them from (location.state.from), or to /admin/orders.
// Already logged in (GET /api/admin/me answers 200) → straight to that page as well.

// Same limits as Kiosk-Server: admin.admin_id is VARCHAR(50); bcrypt uses up to 72 bytes.
const ADMIN_ID_MAX_LENGTH = 50;
const PASSWORD_MAX_BYTES = 72;
const DEFAULT_ADMIN_PATH = '/admin/orders';

// Only admin pages are accepted as a return target (never the login page itself or another site).
function getReturnPath(from) {
  const pathname = typeof from?.pathname === 'string' ? from.pathname : '';
  if (!pathname.startsWith('/admin/') || pathname === '/admin/login') return DEFAULT_ADMIN_PATH;
  return `${pathname}${from.search ?? ''}${from.hash ?? ''}`;
}

// Message for a failed login request.
function loginErrorMessage(error) {
  if (error.status === 400 || error.status === 401) {
    return error.serverMessage ?? '아이디 또는 비밀번호가 올바르지 않습니다.';
  }
  if (error.status === 403) {
    return '허용되지 않은 주소에서 접속했습니다. 관리자 페이지 주소를 확인해 주세요.';
  }
  if (error.status) {
    return '서버 오류로 로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
  if (error.timedOut) {
    return '요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.';
  }
  return '서버에 연결할 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.';
}

function validate({ adminId, password }) {
  const errors = {};
  if (adminId.trim() === '') errors.adminId = '아이디를 입력하세요.';
  else if (adminId.length > ADMIN_ID_MAX_LENGTH) errors.adminId = `아이디는 ${ADMIN_ID_MAX_LENGTH}자 이하로 입력하세요.`;
  if (password === '') errors.password = '비밀번호를 입력하세요.';
  else if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    errors.password = '비밀번호가 너무 깁니다.';
  }
  return errors;
}

function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = getReturnPath(location.state?.from);
  // Login check with GET /api/admin/me: 200 → leave this page, 401 → form, server/network error → retry screen.
  // Each check has its own attempt number; a result only counts for the attempt that started it, so a
  // cancelled or earlier request cannot change the screen of a newer one.
  const [checkAttempt, setCheckAttempt] = useState(0);
  const [checkResult, setCheckResult] = useState({ attempt: null, status: 'checking' });
  const [form, setForm] = useState({ adminId: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const adminIdRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchAdminMe({ signal: controller.signal })
      .then(() => {
        if (!controller.signal.aborted) setCheckResult({ attempt: checkAttempt, status: 'loggedIn' });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setCheckResult({ attempt: checkAttempt, status: error.status === 401 ? 'loggedOut' : 'error' });
      });
    // Leaving the page or starting a retry cancels this request.
    return () => controller.abort();
  }, [checkAttempt]);

  const sessionCheck = checkResult.attempt === checkAttempt ? checkResult.status : 'checking';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setSubmitError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (nextErrors.adminId || nextErrors.password) {
      (nextErrors.adminId ? adminIdRef : passwordRef).current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      // The ID is sent exactly as typed (the server compares it as is).
      await loginAdmin({ adminId: form.adminId, password: form.password });
      navigate(returnPath, { replace: true });
    } catch (error) {
      setSubmitError(loginErrorMessage(error));
      setIsSubmitting(false);
      if (error.status === 401) {
        // Wrong ID or password: type the password again.
        setForm((previous) => ({ ...previous, password: '' }));
        passwordRef.current?.focus();
      }
    }
  };

  if (sessionCheck === 'loggedIn') {
    return <Navigate to={returnPath} replace />;
  }

  return (
    <main className="admin-scope admin-login">
      <div className="admin-login__card">
        <div className="admin-login__brand">
          <span className="admin-login__logo" aria-hidden="true">K</span>
          Kiosk 관리자
        </div>

        <h1 className="admin-login__title">관리자 로그인</h1>

        {sessionCheck === 'checking' && (
          <div className="admin-login__checking">
            <AdminStateView status="loading" message="로그인 상태를 확인하고 있습니다…" />
          </div>
        )}
        {sessionCheck === 'error' && (
          <div className="admin-login__checking">
            <AdminStateView
              status="error"
              message="로그인 상태를 확인하지 못했습니다. 서버 연결을 확인한 뒤 다시 시도해 주세요."
              onRetry={() => setCheckAttempt((count) => count + 1)}
            />
          </div>
        )}
        {sessionCheck === 'loggedOut' && (
          <form className="admin-login__form" onSubmit={handleSubmit} noValidate>
            <div className="admin-field">
              <label className="admin-field__label" htmlFor="admin-login-id">아이디</label>
              <input
                ref={adminIdRef}
                id="admin-login-id"
                className="admin-input"
                name="adminId"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={form.adminId}
                onChange={handleChange}
                aria-invalid={Boolean(errors.adminId)}
                aria-describedby={errors.adminId ? 'admin-login-id-error' : undefined}
              />
              {errors.adminId && <p id="admin-login-id-error" className="admin-field__error">{errors.adminId}</p>}
            </div>

            <div className="admin-field">
              <label className="admin-field__label" htmlFor="admin-login-password">비밀번호</label>
              <input
                ref={passwordRef}
                id="admin-login-password"
                className="admin-input"
                type="password"
                name="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'admin-login-password-error' : undefined}
              />
              {errors.password && (
                <p id="admin-login-password-error" className="admin-field__error">{errors.password}</p>
              )}
            </div>

            {submitError && <p className="admin-alert" role="alert">{submitError}</p>}

            <button type="submit" className="admin-btn admin-btn--primary admin-login__submit" disabled={isSubmitting}>
              {isSubmitting ? '로그인 중…' : '로그인'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default AdminLoginPage;
