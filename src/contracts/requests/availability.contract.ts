import { Occupancy } from '../common/provider.types';

export interface AvailabilityRequest { checkIn: string; checkOut: string; rooms: Occupancy[]; currency: string }
export interface RecheckRateRequest { providerData: unknown; stay: { checkIn: string; checkOut: string; rooms: Occupancy[] }; currency: string }
