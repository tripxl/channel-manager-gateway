import { Type } from "class-transformer";
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { EnvelopeDto, ProviderContextDto } from "./common.dto";

export class CancelDataDto {
  @IsString() @IsNotEmpty() bookingReference!: string;
  @IsOptional() @IsString() providerReservationId?: string;
  @IsOptional() @IsString() providerReferenceId?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsObject() providerData?: object;
}

export class CancelEnvelopeDto extends EnvelopeDto<CancelDataDto> {
  @ValidateNested()
  @Type(() => ProviderContextDto)
  declare context: ProviderContextDto;
  @ValidateNested() @Type(() => CancelDataDto) declare data: CancelDataDto;
}
