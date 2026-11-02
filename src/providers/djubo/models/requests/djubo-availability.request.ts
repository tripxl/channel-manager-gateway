export interface DjuboParty {
  adults: number;
  children: number[];
}
export interface DjuboAvailabilityRequest {
  api_version: number;
  source_id: number;
  sub_source_id: number;
  start_date: string;
  end_date: string;
  multiple_category_allowed: boolean;
  party: DjuboParty[];
  language: string;
  query_key: string;
  currency: string;
  user_country: string;
  device_type: string;
  availability_id: string;
  requested_payload: {
    categories: {
      room_type_details: boolean;
      rate_plan_details: boolean;
      room_rate_details: boolean;
      hotel_details: boolean;
    };
    category_modifiers: {
      partner_booking_data: boolean;
      real_time_pricing: boolean;
      multiple_room_rates: boolean;
      photos: boolean;
      text: boolean;
    };
  };
  hotels: Array<{ partner_hotel_code: string }>;
}
