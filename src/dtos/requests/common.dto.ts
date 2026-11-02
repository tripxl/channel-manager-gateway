import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import {
  PROVIDER_CODES,
  ProviderCode,
} from "../../contracts/common/provider.types";

export class ProviderContextDto {
  @IsIn(PROVIDER_CODES) provider!: ProviderCode;
  @IsString() @IsNotEmpty() providerHotelId!: string;
  @IsIn(["SANDBOX", "PRODUCTION"]) environment!: "SANDBOX" | "PRODUCTION";
  @IsOptional() @IsString() credentialRef?: string;
  @IsString() @IsNotEmpty() requestId!: string;
}
export class MoneyDto {
  @Matches(/^\d+(\.\d{1,4})?$/) amount!: string;
  @Matches(/^[A-Z]{3}$/) currency!: string;
}
export class OccupancyDto {
  @IsInt() @Min(1) @Max(20) adults!: number;
  @IsArray()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(17, { each: true })
  childrenAges!: number[];
}
export class StayDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) checkIn!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) checkOut!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => OccupancyDto)
  rooms!: OccupancyDto[];
}
export class GuestDto {
  @IsString() @IsNotEmpty() firstName!: string;
  @IsString() @IsNotEmpty() lastName!: string;
  @IsEmail() email!: string;
  @IsPhoneNumber() phone!: string;
}
export class EnvelopeDto<T> {
  @ValidateNested()
  @Type(() => ProviderContextDto)
  context!: ProviderContextDto;
  data!: T;
}
export function assertStay(stay: StayDto) {
  if (stay.checkOut <= stay.checkIn)
    throw new Error("checkOut must be after checkIn");
}
