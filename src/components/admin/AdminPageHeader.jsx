// Page title row of an admin screen. `children` = actions on the right (buttons, filters).
function AdminPageHeader({ title, description, children }) {
  return (
    <header className="admin-page-header">
      <div>
        <h1 className="admin-page-header__title">{title}</h1>
        {description && <p className="admin-page-header__description">{description}</p>}
      </div>
      {children && <div className="admin-page-header__actions">{children}</div>}
    </header>
  );
}

export default AdminPageHeader;
