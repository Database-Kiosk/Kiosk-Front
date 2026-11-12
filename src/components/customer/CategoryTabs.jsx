// Horizontal, scrollable category tabs. selectedId === null means "전체".
function CategoryTabs({ categories, selectedId, onSelect }) {
  const tabs = [{ category_id: null, category_name: '전체' }, ...categories];

  return (
    <nav className="category-tabs" aria-label="메뉴 카테고리">
      <div className="category-tabs__list" role="tablist">
        {tabs.map((category) => {
          const isSelected = category.category_id === selectedId;
          return (
            <button
              key={category.category_id ?? 'all'}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`category-tabs__tab${isSelected ? ' is-selected' : ''}`}
              onClick={() => onSelect(category.category_id)}
            >
              {category.category_name}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default CategoryTabs;
