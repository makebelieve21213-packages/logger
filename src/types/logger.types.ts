import type { InjectionToken, OptionalFactoryDependency, ModuleMetadata } from "@nestjs/common";

// Уровни логирования
export type LogLevel = "error" | "warn" | "log" | "debug";

// Конфигурация логгера
export interface LoggerConfig {
	serviceName: string;
	maxFiles?: number;
	maxLinesPerFile?: number;
	logstashHost?: string;
	logstashPort?: number;
	logDir?: string;
}

// Метаданные для лога
export interface LogMetadata {
	timestamp: string;
	level: LogLevel;
	context?: string;
	service: string;
	message: string;
	[key: string]: unknown;
}

// Типы для асинхронной регистрации модуля
export interface LoggerModuleAsyncOptions<T extends unknown[]>
	extends Pick<ModuleMetadata, "imports"> {
	useFactory: (...args: T) => LoggerConfig | Promise<LoggerConfig>;
	inject?: (InjectionToken | OptionalFactoryDependency)[];
}
