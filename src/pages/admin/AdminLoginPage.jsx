import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockAdminLogin } from '../../api/adminApi.js';
import './admin.css';
import './AdminLoginPage.css';

// Admin login page. Entry URL: /admin/login
// MOCK LOGIN (Front #9 design issue): only the input format is checked, then any ID/password is
// accepted and the page moves to /admin/orders. No request goes to Kiosk-Server and no session/cookie
// is created. The real POST /api/admin/login and access control come in a later issue.

// Same limits as Kiosk-Server: admin.admin_id is VARCHAR(50); bcrypt uses up to 72 bytes.
const ADMIN_ID_MAX_LENGTH = 50;
const PASSWORD_MAX_BYTES = 72;

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
  const [form, setForm] = useState({ adminId: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const adminIdRef = useRef(null);
  const passwordRef = useRef(null);

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
      await mockAdminLogin({ adminId: form.adminId, password: form.password });
      navigate('/admin/orders', { replace: true });
    } catch {
      setSubmitError('로그인을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="admin-scope admin-login">
      <div className="admin-login__card">
        <div className="admin-login__brand">
          <span className="admin-login__logo" aria-hidden="true">K</span>
          Kiosk 관리자
        </div>

        <h1 className="admin-login__title">관리자 로그인</h1>
        <p className="admin-login__dev-note" role="note">
          개발용 mock 로그인입니다. 실제 인증 없이 입력 형식만 확인합니다.
        </p>

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
      </div>
    </main>
  );
}

export default AdminLoginPage;
