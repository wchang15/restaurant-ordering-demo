export type Locale = 'en' | 'ko';

export type LocalizedText = {
  en: string;
  ko: string;
};

export type MenuOptionValue = {
  id: string;
  name: LocalizedText;
  priceDelta: number;
};

export type MenuOptionGroup = {
  id: string;
  name: LocalizedText;
  required: boolean;
  multiSelect: boolean;
  values: MenuOptionValue[];
};

export type MenuItem = {
  id: string;
  categoryId: string;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  imageUrl?: string | null;
  videoUrl?: string | null;
  soldOut: boolean;
  options?: MenuOptionGroup[];
};

export type MenuCategory = {
  id: string;
  name: LocalizedText;
  items: MenuItem[];
};

export type MenuPageData = {
  storeName: LocalizedText;
  tableName: string;
  tableToken: string;
  categories: MenuCategory[];
};
