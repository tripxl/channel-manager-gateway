export interface DjuboMoneyValue { amount?: string | number; currency?: string }
export interface DjuboLineItem {
  type?: string;
  sub_type?: string;
  paid_at_checkout?: boolean;
  price?: { currency_of_charge_price?: DjuboMoneyValue };
}
export interface DjuboRoomRate {
  room_type_key?: string;
  rate_plan_key?: string;
  rate_plan_id?: string | number;
  rooms_remaining?: number;
  url?: string;
  partner_data?: unknown;
  price_per_room?: Record<string, {
    totalPrice?: string | number;
    totalTax?: string | number;
    totalPricePerNight?: string | number;
    totalTaxPerNight?: string | number;
    tax_break_up_dict?: Record<string, string | number>;
    currency?: string;
  }>;
  line_items?: DjuboLineItem[];
}
export interface DjuboAvailabilityResponse {
  currency?: string;
  availability_request?: { party?: Array<{ room_id?: string | number; adults?: number; children?: number[]; childrenAges?: number[] }> };
  party_information?: Array<{ room_id?: string | number; adults?: number; children?: number[]; childrenAges?: number[] }>;
  hotels?: Record<string, {
    response_type?: string;
    available?: {
      room_types?: Record<string, { name?: string; max_occupancy?: unknown }>;
      rate_plans?: Record<string, { name?: string; meal_plan_description_name?: string; cancellation_policy?: { cancellation_summary?: { refundable?: string | boolean; unstructured_cancellation_text?: string } } }>;
      room_rates?: Record<string, DjuboRoomRate>;
      partner_booking_details?: unknown;
    };
  }>;
}
