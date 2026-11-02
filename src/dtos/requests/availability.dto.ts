import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsObject,
  Matches,
  ValidateNested,
} from "class-validator";
import {
  EnvelopeDto,
  OccupancyDto,
  ProviderContextDto,
  StayDto,
} from "./common.dto";

export class AvailabilityDataDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) checkIn!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) checkOut!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => OccupancyDto)
  rooms!: OccupancyDto[];

  @Matches(/^[A-Z]{3}$/)
  currency!: string;
}

export class AvailabilityEnvelopeDto extends EnvelopeDto<AvailabilityDataDto> {
  @ValidateNested()
  @Type(() => ProviderContextDto)
  declare context: ProviderContextDto;
  @ValidateNested()
  @Type(() => AvailabilityDataDto)
  declare data: AvailabilityDataDto;
}

export class RecheckDataDto {
  @IsObject() providerData!: object;
  @ValidateNested() @Type(() => StayDto) stay!: StayDto;
  @Matches(/^[A-Z]{3}$/) currency!: string;
}

export class RecheckEnvelopeDto extends EnvelopeDto<RecheckDataDto> {
  @ValidateNested()
  @Type(() => ProviderContextDto)
  declare context: ProviderContextDto;
  @ValidateNested() @Type(() => RecheckDataDto) declare data: RecheckDataDto;
}
