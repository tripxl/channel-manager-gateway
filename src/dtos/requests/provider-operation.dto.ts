import { Type } from "class-transformer";
import { IsObject, ValidateNested } from "class-validator";
import { EnvelopeDto, ProviderContextDto } from "./common.dto";

export class ProviderOperationEnvelopeDto extends EnvelopeDto<
  Record<string, unknown>
> {
  @ValidateNested()
  @Type(() => ProviderContextDto)
  declare context: ProviderContextDto;
  @IsObject()
  declare data: Record<string, unknown>;
}
