import { Module } from '@nestjs/common';
import { ProviderHttpTransport } from '../../common/http/provider-http.transport';
import { DjuboChannelProvider } from './djubo-channel.provider';
import { DjuboAuthStrategy } from './config/djubo-auth.strategy';
import { DjuboMapper } from './mapper/djubo.mapper';
import { DjuboClient } from './client/djubo.client';
import { DjuboOperationMapper } from './mapper/djubo-operation.mapper';
@Module({ providers: [DjuboChannelProvider, DjuboClient, DjuboAuthStrategy, DjuboMapper, DjuboOperationMapper, ProviderHttpTransport], exports: [DjuboChannelProvider] })
export class DjuboModule {}
