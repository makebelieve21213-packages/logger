import { Injectable, Scope } from "@nestjs/common";
import { createWinstonLogger } from "src/configs/winston.config";

import type {
	LoggerService as NestLoggerService,
	OnModuleDestroy,
} from "@nestjs/common";
import type Logger from "src/interfaces/logger.interface";
import type { LoggerConfig } from "src/types/logger.types";
import type { Logger as WinstonLogger } from "winston";

/**
 * Сервис логирования, расширяющий стандартный NestJS Logger
 * Использует Winston для записи логов в файлы
 * Scope.TRANSIENT - каждый сервис получает свой экземпляр с контекстом
 */
@Injectable({ scope: Scope.TRANSIENT })
export default class LoggerService
	implements Logger, NestLoggerService, OnModuleDestroy
{
	private readonly winstonLogger: WinstonLogger;
	private readonly serviceName: string;

	private context?: string;

	constructor(private readonly config: LoggerConfig) {
		this.serviceName = this.config.serviceName;
		this.winstonLogger = createWinstonLogger(this.config);
	}

	// Устанавливает контекст для всех последующих логов
	setContext(context: string): void {
		this.context = context;
	}

	/**
	 * Записывает обычный лог (info level)
	 * Выводится в консоль и записывается в файл
	 */
	log(message: string, context?: string): void {
		const logContext = context || this.context;
		this.winstonLogger.info(message, {
			context: logContext,
			service: this.serviceName,
		});
	}

	/**
	 * Записывает лог ошибки (error level)
	 * Выводится в консоль и записывается в файл
	 */
	error(message: string, trace?: string, context?: string): void {
		const logContext = context || this.context;
		this.winstonLogger.error(message, {
			context: logContext,
			service: this.serviceName,
			trace,
		});
	}

	/**
	 * Записывает предупреждение (warn level)
	 * Выводится в консоль и записывается в файл
	 */
	warn(message: string, context?: string): void {
		const logContext = context || this.context;
		this.winstonLogger.warn(message, {
			context: logContext,
			service: this.serviceName,
		});
	}

	/**
	 * Записывает отладочный лог (debug level)
	 * Только выводится в консоль, НЕ записывается в файл
	 */
	debug(message: string, context?: string): void {
		const logContext = context || this.context;
		this.winstonLogger.debug(message, {
			context: logContext,
			service: this.serviceName,
		});
	}

	// Alias для метода log (для совместимости с NestJS)
	verbose(message: string, context?: string): void {
		this.log(message, context);
	}

	/**
	 * Вызывается при уничтожении модуля
	 * Закрывает все транспорты Winston (TCP соединения, файловые дескрипторы)
	 */
	onModuleDestroy(): void {
		this.winstonLogger.close();
	}
}
