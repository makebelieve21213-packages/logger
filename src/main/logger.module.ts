import { Module, Global, Scope } from "@nestjs/common";
import LoggerService from "src/main/logger.service";
import { LOGGER_OPTIONS } from "src/utils/constants";

import type { DynamicModule, Provider } from "@nestjs/common";
import type { LoggerConfig, LoggerModuleAsyncOptions } from "src/types/logger.types";

// Глобальный модуль логирования для NestJS
@Global()
@Module({})
export default class LoggerModule {
	/**
	 * Регистрация модуля с динамическими опциями через useFactory
	 * Позволяет инжектить зависимости для создания конфигурации
	 */
	static forRootAsync<T extends unknown[]>(
		options: LoggerModuleAsyncOptions<T>
	): DynamicModule {
		const providers: Provider[] = [
			{
				provide: LOGGER_OPTIONS,
				useFactory: options.useFactory,
				inject: options.inject || [],
			},
			{
				provide: LoggerService,
				useFactory: (config: LoggerConfig): LoggerService => {
					return new LoggerService(config);
				},
				inject: [LOGGER_OPTIONS],
				scope: Scope.TRANSIENT,
			},
		];

		return {
			module: LoggerModule,
			imports: options.imports || [],
			providers,
			exports: [LoggerService],
		};
	}
}
