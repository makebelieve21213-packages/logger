import { resolve, isAbsolute } from "path";

import ensureLogDirectory from "src/utils/directory";
import { consoleFormat, fileFormat } from "src/utils/formatters";
import { createLogger, format, transports, type Logger, type transport } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import LogstashTransport from "winston-logstash";

import type { LoggerConfig } from "src/types/logger.types";

// Создает транспорт для консольного вывода
export function createConsoleTransport(): transports.ConsoleTransportInstance {
	return new transports.Console({
		format: format.combine(format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), consoleFormat),
	});
}

/**
 * Создает единый транспорт для записи всех логов в файл с ротацией
 * Все уровни логов (кроме debug) записываются в один файл
 */
export function createFileTransport(config: LoggerConfig): transport {
	const maxLines = config.maxLinesPerFile || 10000;

	// Определяем базовую директорию для логов
	let baseLogDir: string;

	if (config.logDir) {
		/**
		 * Если указан абсолютный путь - используем его как есть
		 * Если относительный - разрешаем относительно process.cwd()
		 */
		baseLogDir = isAbsolute(config.logDir) ? config.logDir : resolve(process.cwd(), config.logDir);
	} else {
		/**
		 * По умолчанию используем process.cwd()/logs
		 * Это рабочая директория сервиса, который использует пакет
		 */
		baseLogDir = resolve(process.cwd(), "logs");
	}

	const serviceLogDir = resolve(baseLogDir, config.serviceName);

	// Создаем директорию для логов если её нет
	ensureLogDirectory(serviceLogDir);

	return new DailyRotateFile({
		dirname: serviceLogDir,
		filename: "%DATE%.log",
		datePattern: "YYYY-MM-DD",
		maxSize: `${maxLines}`,
		maxFiles: config.maxFiles || 30,
		format: format.combine(format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), fileFormat),
		level: "info", // Логируем info и выше (error, warn, info), но не debug
	});
}

// Создает транспорт для отправки в Logstash
export function createLogstashTransport(config: LoggerConfig): LogstashTransport | null {
	if (!config.logstashHost || !config.logstashPort) {
		return null;
	}

	return new LogstashTransport({
		host: config.logstashHost,
		port: config.logstashPort,
		protocol: "tcp",
		json: true,
		node_name: config.serviceName,
	});
}

// Создает Winston logger с настроенными транспортами
export function createWinstonLogger(config: LoggerConfig): Logger {
	const loggerTransports: transport[] = [createConsoleTransport(), createFileTransport(config)];

	const logstashTransport = createLogstashTransport(config);
	if (logstashTransport) {
		loggerTransports.push(logstashTransport);
	}

	return createLogger({
		level: "debug",
		defaultMeta: { service: config.serviceName },
		transports: loggerTransports,
	});
}
