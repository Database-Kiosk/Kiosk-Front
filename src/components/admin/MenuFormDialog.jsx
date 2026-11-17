import { useEffect, useRef, useState } from 'react';
import './MenuFormDialog.css';

// Menu add / edit dialog (design only: saving goes to the mock API, nothing reaches the server).
// Image upload is not part of this issue (no upload API yet), so image_url is not edited here.
// Limits follow DB/schema.sql: menu_name / option_name VARCHAR(100), prices INT ≥ 0.
const NAME_MAX_LENGTH = 100;
const PRICE_MAX = 2147483647;

const toDraft = (menu) => ({
  menu_name: menu?.menu_name ?? '',
  category_id: menu?.category_id ? String(menu.category_id) : '',
  price: menu ? String(menu.price) : '',
  description: menu?.description ?? '',
  is_active: menu ? menu.is_active === 1 : true,
  options: (menu?.options ?? []).map((option) => ({ ...option, additional_price: String(option.additional_price) })),
});

const isPrice = (value) => /^\d+$/.test(value) && Number(value) <= PRICE_MAX;

function validate(draft) {
  const errors = {};
  if (draft.menu_name.trim() === '') errors.menu_name = '메뉴 이름을 입력하세요.';
  else if (draft.menu_name.trim().length > NAME_MAX_LENGTH) errors.menu_name = `${NAME_MAX_LENGTH}자 이하로 입력하세요.`;
  if (draft.category_id === '') errors.category_id = '카테고리를 선택하세요.';
  if (!isPrice(draft.price)) errors.price = '가격은 0 이상의 숫자로 입력하세요.';
  draft.options.forEach((option, index) => {
    const name = option.option_name.trim();
    if (name === '' || name.length > NAME_MAX_LENGTH || !isPrice(option.additional_price)) {
      errors[`option-${index}`] = `옵션 이름(${NAME_MAX_LENGTH}자 이하)과 0 이상의 추가 금액을 입력하세요.`;
    }
  });
  return errors;
}

function MenuFormDialog({ menu, categories, onClose, onSave }) {
  const dialogRef = useRef(null);
  const [draft, setDraft] = useState(() => toDraft(menu));
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [imageError, setImageError] = useState('');
  const isEdit = Boolean(menu);
  // Stable React keys for options added in this dialog (they have no option_id yet).
  const nextOptionKey = useRef(0);

  // Native modal dialog: focus stays inside, Esc closes (handled by onCancel below).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const update = (field, value) => setDraft((previous) => ({ ...previous, [field]: value }));
  const updateOption = (index, field, value) => setDraft((previous) => ({
    ...previous,
    options: previous.options.map((option, i) => (i === index ? { ...option, [field]: value } : option)),
  }));
  const addOption = () => {
    nextOptionKey.current += 1;
    const option = { key: `new-${nextOptionKey.current}`, option_name: '', additional_price: '0' };
    update('options', [...draft.options, option]);
  };
  const removeOption = (index) => update('options', draft.options.filter((_, i) => i !== index));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || isSaving) return;

    setIsSaving(true);
    setSaveError('');
    try {
      await onSave(
        {
          menu_id: menu?.menu_id,
          menu_name: draft.menu_name.trim(),
          category_id: Number(draft.category_id),
          price: Number(draft.price),
          description: draft.description.trim() || null,
          is_active: draft.is_active ? 1 : 0,

          options: draft.options.map((option) => ({
            option_id: option.option_id,
            option_name: option.option_name.trim(),
            additional_price: Number(option.additional_price),
          })),
        },
        imageFile,
      );
    } catch (error) {
      let message = '메뉴를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';

      if (error.status === 401) {
        message = '로그인이 만료되었습니다. 다시 로그인해 주세요.';
      } else if (error.serverMessage) {
        message = error.serverMessage;
      } else if (error.timedOut) {
        message = '서버 응답이 늦습니다. 메뉴 목록을 확인한 후 다시 시도해 주세요.';
      } else if (error.status === undefined) {
        message = '서버에 연결하지 못했습니다. 서버 실행 상태를 확인해 주세요.';
      }

      setSaveError(message);
      setIsSaving(false);
    }
  };

  const fieldProps = (name) => ({
    id: `menu-form-${name}`,
    className: 'admin-input',
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `menu-form-${name}-error` : undefined,
  });
  const fieldError = (name) => errors[name] && (
    <p id={`menu-form-${name}-error`} className="admin-field__error">{errors[name]}</p>
  );

  useEffect(() => {
  if (!imageFile) {
    setImagePreview('');
    return;
  }

  const url = URL.createObjectURL(imageFile);
  setImagePreview(url);

  return () => {
    URL.revokeObjectURL(url);
  };
}, [imageFile]);

const handleImageChange = (event) => {
  const file = event.target.files?.[0] ?? null;

  setImageError('');

  if (!file) {
    setImageFile(null);
    return;
  }

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  if (!allowedTypes.includes(file.type)) {
    setImageError('JPG, PNG, WebP 사진만 선택할 수 있습니다.');
    setImageFile(null);
    event.target.value = '';
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setImageError('사진은 최대 5MB까지 선택할 수 있습니다.');
    setImageFile(null);
    event.target.value = '';
    return;
  }

  setImageFile(file);
};

  return (
    <dialog
      ref={dialogRef}
      className="admin-dialog"
      aria-labelledby="menu-form-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!isSaving) onClose();
      }}
    >
      <form className="admin-dialog__form" onSubmit={handleSubmit} noValidate>
        <header className="admin-dialog__head">
          <h2 id="menu-form-title" className="admin-dialog__title">{isEdit ? '메뉴 수정' : '메뉴 추가'}</h2>
          <p className="admin-dialog__note">
            메뉴 기본 정보와 옵션을 입력해 주세요.
          </p>
        </header>

        <div className="admin-dialog__body">
          <div className="admin-field">
            <label
              className="admin-field__label"
              htmlFor="menu-form-image"
            >
              메뉴 사진 (선택)
            </label>

            <input
              id="menu-form-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              disabled={isSaving}
              aria-describedby="menu-form-image-help"
            />

            <p
              id="menu-form-image-help"
              className="admin-dialog__hint"
            >
              JPG, PNG, WebP · 최대 5MB
            </p>

            {imageError && (
              <p className="admin-field__error" role="alert">
                {imageError}
              </p>
            )}

            {imagePreview && (
              <img
                src={imagePreview}
                alt="선택한 메뉴 사진 미리보기"
                style={{
                  display: 'block',
                  width: '100%',
                  maxWidth: 240,
                  height: 160,
                  objectFit: 'cover',
                  borderRadius: 12,
                  marginTop: 12,
                }}
              />
            )}
          </div>
          <div className="admin-field">
            <label className="admin-field__label" htmlFor="menu-form-menu_name">메뉴 이름</label>
            <input
              {...fieldProps('menu_name')}
              value={draft.menu_name}
              onChange={(e) => update('menu_name', e.target.value)}
            />
            {fieldError('menu_name')}
          </div>

          <div className="admin-dialog__row">
            <div className="admin-field">
              <label className="admin-field__label" htmlFor="menu-form-category_id">카테고리</label>
              <select
                {...fieldProps('category_id')}
                value={draft.category_id}
                onChange={(e) => update('category_id', e.target.value)}
              >
                <option value="">선택하세요</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>{category.category_name}</option>
                ))}
              </select>
              {fieldError('category_id')}
            </div>
            <div className="admin-field">
              <label className="admin-field__label" htmlFor="menu-form-price">가격 (원)</label>
              <input
                {...fieldProps('price')}
                inputMode="numeric"
                value={draft.price}
                onChange={(e) => update('price', e.target.value)}
              />
              {fieldError('price')}
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-field__label" htmlFor="menu-form-description">설명 (선택)</label>
            <textarea
              {...fieldProps('description')}
              value={draft.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>

          <fieldset className="admin-dialog__options">
            <legend className="admin-field__label">옵션</legend>
            {draft.options.length === 0 && <p className="admin-dialog__hint">등록된 옵션이 없습니다.</p>}
            {draft.options.map((option, index) => (
              <div key={option.option_id ?? option.key} className="admin-dialog__option">
                <div className="admin-dialog__option-row">
                  <input
                    className="admin-input"
                    aria-label={`옵션 ${index + 1} 이름`}
                    placeholder="옵션 이름"
                    value={option.option_name}
                    onChange={(e) => updateOption(index, 'option_name', e.target.value)}
                  />
                  <input
                    className="admin-input admin-dialog__option-price"
                    aria-label={`옵션 ${index + 1} 추가 금액`}
                    inputMode="numeric"
                    value={option.additional_price}
                    onChange={(e) => updateOption(index, 'additional_price', e.target.value)}
                  />
                  <button type="button" className="admin-btn admin-btn--danger" onClick={() => removeOption(index)}>
                    삭제
                  </button>
                </div>
                {errors[`option-${index}`] && <p className="admin-field__error">{errors[`option-${index}`]}</p>}
              </div>
            ))}
            <button type="button" className="admin-btn admin-btn--secondary" onClick={addOption}>+ 옵션 추가</button>
          </fieldset>

          <label className="admin-dialog__check">
            <input type="checkbox" checked={draft.is_active} onChange={(e) => update('is_active', e.target.checked)} />
            판매 중으로 표시
          </label>

          {saveError && <p className="admin-alert" role="alert">{saveError}</p>}
        </div>

        <footer className="admin-dialog__foot">
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose} disabled={isSaving}>
            취소
          </button>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={isSaving}>
            {isSaving ? '저장 중…' : '저장'}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export default MenuFormDialog;
