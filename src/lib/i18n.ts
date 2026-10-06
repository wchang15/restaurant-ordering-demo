import { Locale, LocalizedText } from '@/types/menu';

export const dictionary = {
  en: {
    appName: 'QR Ordering',
    startOrdering: 'Start Ordering',
    cart: 'Cart',
    addToCart: 'Add to Cart',
    sendOrder: 'Send Order',
    orderReceived: 'Your order has been received.',
    table: 'Table',
    notes: 'Notes',
    soldOut: 'Sold Out',
    quantity: 'Quantity',
    subtotal: 'Subtotal',
    tax: 'Tax',
    total: 'Total',
    backToMenu: 'Back to Menu',
    language: 'Language',
    yourOrder: 'Your Order',
    menu: 'Menu',
    remove: 'Remove',
    emptyCart: 'Your cart is empty.',
    sending: 'Sending...',
    restaurant: 'Restaurant',
    failedOrder: 'Failed to send order.',
    required: 'Required',
    orderItems: 'Items',
    qrManager: 'QR Manager',
    download: 'Download',
    open: 'Open',
  },
  ko: {
    appName: 'QR 주문',
    startOrdering: '주문 시작',
    cart: '장바구니',
    addToCart: '장바구니 담기',
    sendOrder: '주문 보내기',
    orderReceived: '주문이 접수되었습니다.',
    table: '테이블',
    notes: '요청사항',
    soldOut: '품절',
    quantity: '수량',
    subtotal: '소계',
    tax: '세금',
    total: '합계',
    backToMenu: '메뉴로 돌아가기',
    language: '언어',
    yourOrder: '주문 내역',
    menu: '메뉴',
    remove: '삭제',
    emptyCart: '장바구니가 비어 있습니다.',
    sending: '전송 중...',
    restaurant: '식당',
    failedOrder: '주문 전송에 실패했습니다.',
    required: '필수',
    orderItems: '주문 항목',
    qrManager: 'QR 관리',
    download: '다운로드',
    open: '열기',
  },
} as const;

export function t(locale: Locale) {
  return dictionary[locale];
}

export function pickText(value: LocalizedText, locale: Locale) {
  return value[locale] || value.en;
}
