import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import {
  EnvelopeDto,
  GuestDto,
  MoneyDto,
  ProviderContextDto,
  StayDto,
} from "./common.dto";

export class CreateBookingDataDto {
  @IsString() @IsNotEmpty() bookingReference!: string;
  @IsObject() providerData!: object;
  @ValidateNested() @Type(() => StayDto) stay!: StayDto;
  @ValidateNested() @Type(() => GuestDto) guest!: GuestDto;
  @ValidateNested() @Type(() => MoneyDto) expectedPrice!: MoneyDto;
  @IsOptional() @IsString() specialRequests?: string;
}

export class BookingIdentifiersDto {
  @IsString() @IsNotEmpty() bookingReference!: string;
  @IsOptional() @IsString() providerReservationId?: string;
  @IsOptional() @IsString() providerReferenceId?: string;
  @IsOptional() @IsObject() providerData?: object;
}

export class CreateBookingEnvelopeDto extends EnvelopeDto<CreateBookingDataDto> {
  @ValidateNested()
  @Type(() => ProviderContextDto)
  declare context: ProviderContextDto;
  @ValidateNested()
  @Type(() => CreateBookingDataDto)
  declare data: CreateBookingDataDto;
}

export class BookingIdentifiersEnvelopeDto extends EnvelopeDto<BookingIdentifiersDto> {
  @ValidateNested()
  @Type(() => ProviderContextDto)
  declare context: ProviderContextDto;
  @ValidateNested()
  @Type(() => BookingIdentifiersDto)
  declare data: BookingIdentifiersDto;
}
