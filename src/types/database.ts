export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

export type Supermarket = {
  id: string;
  name: string;
  chain: string | null;
  address: string;
  city: string;
  lat: number;
  lng: number;
  created_by: string | null;
  created_at: string;
};

export type Rating = {
  id: string;
  supermarket_id: string;
  user_id: string;
  score: number;
  cleanliness: number;
  service: number;
  organization: number;
  price: number;
  has_fish_counter: boolean | null;
  has_butcher: boolean | null;
  comment: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  brand: string;
  category: string | null;
  created_at: string;
};

export type PriceSource = "community" | "scraper" | "flyer";

export type PriceReport = {
  id: string;
  product_id: string;
  supermarket_id: string;
  user_id: string | null;
  price: number;
  image_url: string | null;
  ocr_raw_text: string | null;
  ocr_confidence: number | null;
  source: PriceSource;
  created_at: string;
};

export type LatestPrice = {
  id: string;
  product_id: string;
  supermarket_id: string;
  user_id: string | null;
  price: number;
  image_url: string | null;
  source: PriceSource;
  created_at: string;
  product_name: string;
  product_brand: string | null;
  product_category: string | null;
  supermarket_name: string;
  supermarket_city: string;
};

export type SupermarketRating = {
  supermarket_id: string;
  avg_score: number;
  ratings_count: number;
  avg_cleanliness: number;
  avg_service: number;
  avg_organization: number;
  avg_price: number;
  fish_counter_pct: number | null;
  butcher_pct: number | null;
};

export type Basket = {
  id: string;
  user_id: string;
  created_at: string;
};

export type BasketItem = {
  id: string;
  basket_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      supermarkets: {
        Row: Supermarket;
        Insert: Omit<Supermarket, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Supermarket>;
        Relationships: [];
      };
      ratings: {
        Row: Rating;
        Insert: Omit<Rating, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Rating>;
        Relationships: [];
      };
      products: {
        Row: Product;
        Insert: Omit<Product, "id" | "created_at" | "category"> & {
          id?: string;
          created_at?: string;
          category?: string | null;
        };
        Update: Partial<Product>;
        Relationships: [];
      };
      price_reports: {
        Row: PriceReport;
        Insert: Omit<PriceReport, "id" | "created_at" | "source"> & {
          id?: string;
          created_at?: string;
          source?: PriceSource;
        };
        Update: Partial<PriceReport>;
        Relationships: [];
      };
      baskets: {
        Row: Basket;
        Insert: Omit<Basket, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<Basket>;
        Relationships: [];
      };
      basket_items: {
        Row: BasketItem;
        Insert: Omit<BasketItem, "id" | "created_at" | "quantity"> & {
          id?: string;
          created_at?: string;
          quantity?: number;
        };
        Update: Partial<BasketItem>;
        Relationships: [];
      };
    };
    Views: {
      latest_prices: { Row: LatestPrice; Relationships: [] };
      supermarket_ratings: { Row: SupermarketRating; Relationships: [] };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
