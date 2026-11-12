// TEMPORARY mock data (issues #2, #4). The backend has no category/menu API yet.
// Use ONLY through src/api/menuApi.js; pages must not import this file directly.
// Delete it once menuApi.js calls the real API.
// Field names mirror the DB columns (category, menu, menu_option).
// `options` inside each menu is a mock-only choice; the real API shape is not decided yet.
// is_active: 1 = 판매 중, 0 = 판매 중지 (hidden on the customer page). image_url may be null (placeholder is shown).
// Includes inactive menus (된장찌개, 식혜) to test that they are hidden.

export const categories = [
  { category_id: 1, category_name: '메인' },
  { category_id: 2, category_name: '사이드' },
  { category_id: 3, category_name: '음료' },
];

export const menus = [
  // 메인
  {
    menu_id: 1,
    menu_name: '김치찌개',
    price: 9000,
    category_id: 1,
    description: '잘 익은 묵은지와 돼지고기를 넣고 푹 끓인 찌개입니다.',
    image_url: null,
    is_active: 1,
    options: [
      { option_id: 1, option_name: '공기밥 추가', additional_price: 1000 },
      { option_id: 2, option_name: '라면사리 추가', additional_price: 1500 },
      { option_id: 3, option_name: '덜 맵게', additional_price: 0 },
    ],
  },
  {
    menu_id: 2,
    menu_name: '제육볶음',
    price: 10000,
    category_id: 1,
    description: '매콤달콤한 양념에 볶아낸 돼지고기 볶음입니다.',
    image_url: null,
    is_active: 1,
    options: [
      { option_id: 4, option_name: '공기밥 추가', additional_price: 1000 },
      { option_id: 5, option_name: '고기 추가', additional_price: 3000 },
    ],
  },
  {
    menu_id: 3,
    menu_name: '된장찌개',
    price: 8000,
    category_id: 1,
    description: '구수한 집된장에 두부와 애호박을 넣어 끓였습니다.',
    image_url: null,
    is_active: 0,
    options: [],
  },
  {
    menu_id: 4,
    menu_name: '스페셜 모둠 해물 철판 볶음밥 (2인분)',
    price: 18000,
    category_id: 1,
    description:
      '새우, 오징어, 홍합, 바지락 등 다양한 해산물을 듬뿍 넣고 센 불에 볶아낸 철판 볶음밥입니다. 두 분이 넉넉하게 드실 수 있으며, 마지막에 치즈를 올려 드시면 더욱 맛있습니다.',
    image_url: null,
    is_active: 1,
    options: [
      { option_id: 6, option_name: '치즈 토핑', additional_price: 2000 },
      { option_id: 7, option_name: '계란 프라이 추가', additional_price: 1000 },
    ],
  },

  // 사이드
  {
    menu_id: 5,
    menu_name: '계란말이',
    price: 6000,
    category_id: 2,
    description: '부드럽게 말아낸 두툼한 계란말이입니다.',
    image_url: null,
    is_active: 1,
    options: [{ option_id: 8, option_name: '치즈 추가', additional_price: 1500 }],
  },
  {
    menu_id: 6,
    menu_name: '군만두',
    price: 5000,
    category_id: 2,
    description: '바삭하게 구운 고기만두 6개입니다.',
    image_url: null,
    is_active: 1,
    options: [],
  },

  // 음료
  {
    menu_id: 7,
    menu_name: '콜라',
    price: 2000,
    category_id: 3,
    description: '355ml 캔',
    image_url: null,
    is_active: 1,
    options: [],
  },
  {
    menu_id: 8,
    menu_name: '사이다',
    price: 2000,
    category_id: 3,
    description: '355ml 캔',
    image_url: null,
    is_active: 1,
    options: [],
  },
  {
    menu_id: 9,
    menu_name: '식혜',
    price: 3000,
    category_id: 3,
    description: '직접 만든 전통 식혜입니다.',
    image_url: null,
    is_active: 0,
    options: [],
  },
];
