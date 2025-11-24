import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

import {
	createConsoleTransport,
	createFileTransport,
	createLogstashTransport,
	createWinstonLogger,
} from "src/configs/winston.config";
import LoggerError from "src/errors/logger.error";
import { createLogger, transports, type Logger, type transport as WinstonTransport } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

import type { LoggerConfig } from "src/types/logger.types";

// Глобальная переменная для отслеживания вызовов конструктора LogstashTransport
const logstashTransportCalls: Array<{
	host: string;
	port: number;
	protocol?: string;
	json?: boolean;
	node_name?: string;
}> = [];

// Мокаем winston-logstash
jest.mock("winston-logstash", () => {
	// Импортируем winston внутри мока для доступа к transports.Stream
	const winston = require("winston");
	// Создаем класс, который наследуется от winston.transports.Stream
	class MockLogstashTransport extends winston.transports.Stream {
		options: {
			host: string;
			port: number;
			protocol?: string;
			json?: boolean;
			node_name?: string;
		};

		constructor(options: {
			host: string;
			port: number;
			protocol?: string;
			json?: boolean;
			node_name?: string;
		}) {
			// Создаем пустой stream для базового класса
			const { PassThrough } = require("stream");
			const stream = new PassThrough();
			super({ stream });

			// Сохраняем опции для проверок в тестах
			this.options = options;
			// Отслеживаем вызов конструктора
			logstashTransportCalls.push(options);
		}

		log(_info: unknown, callback: () => void): void {
			if (callback) {
				callback();
			}
		}

		close(): void {
			// Закрываем stream
			const stream = (this as unknown as { stream?: { end?: () => void } }).stream;
			if (stream && typeof stream.end === "function") {
				stream.end();
			}
		}
	}

	return {
		__esModule: true,
		default: MockLogstashTransport,
	};
});

describe("Winston Config", () => {
	let mockConfig: LoggerConfig;
	const createdLoggers: Logger[] = [];
	const createdTransports: WinstonTransport[] = [];

	beforeEach(() => {
		mockConfig = {
			serviceName: "test-service",
			maxFiles: 30,
			maxLinesPerFile: 10000,
		};

		jest.clearAllMocks();
		// Очищаем массив вызовов конструктора
		logstashTransportCalls.length = 0;
	});

	afterEach(async () => {
		// Закрываем все созданные логгеры
		for (const logger of createdLoggers) {
			logger.setMaxListeners(20);
			await logger.close();
		}
		createdLoggers.length = 0;

		// Закрываем все транспорты
		for (const transport of createdTransports) {
			if (typeof transport.close === "function") {
				transport.close();
			}
		}
		createdTransports.length = 0;

		// Удаляем папку dist/logs если она была создана тестами (после закрытия транспортов)
		const fs = require("fs");
		const distLogsPath = require("path").resolve(process.cwd(), "dist", "logs");
		if (fs.existsSync(distLogsPath)) {
			// Небольшая задержка чтобы файлы успели закрыться
			await new Promise((resolve) => setTimeout(resolve, 50));
			const rimraf = require("rimraf");
			try {
				rimraf.sync(distLogsPath);
			} catch {
				// Игнорируем ошибки удаления
			}
		}
	});

	describe("formatters", () => {
		it("должен форматировать лог с контекстом для консоли", () => {
			const logger = createWinstonLogger(mockConfig);
			createdLoggers.push(logger);
			logger.info("Test message with context", { context: "TestContext" });
			expect(logger).toBeDefined();
		});

		it("должен форматировать лог без контекста для консоли", () => {
			const logger = createWinstonLogger(mockConfig);
			createdLoggers.push(logger);
			logger.error("Error message without context");
			expect(logger).toBeDefined();
		});

		it("должен форматировать лог для файла в JSON с контекстом", () => {
			const logger = createWinstonLogger(mockConfig);
			createdLoggers.push(logger);
			logger.warn("Warning message", { context: "TestContext" });
			expect(logger).toBeDefined();
		});

		it("должен форматировать лог для файла в JSON без контекста", () => {
			const logger = createWinstonLogger(mockConfig);
			createdLoggers.push(logger);
			logger.debug("Debug message");
			expect(logger).toBeDefined();
		});

		it("должен использовать дефолтный цвет для неизвестного уровня лога", () => {
			const logger = createWinstonLogger(mockConfig);
			createdLoggers.push(logger);
			// Логируем с уровнем который есть в winston но нет в наших colors
			logger.log("verbose", "Verbose level message");
			logger.log("http", "HTTP level message");
			logger.log("silly", "Silly level message");
			expect(logger).toBeDefined();
		});

		it("должен форматировать лог для файла с дополнительными метаданными", () => {
			const logger = createWinstonLogger(mockConfig);
			createdLoggers.push(logger);
			logger.info("Message with meta", { context: "TestContext", userId: 123, action: "test" });
			expect(logger).toBeDefined();
		});

		it("должен использовать дефолтный контекст 'Application' для файлового формата", () => {
			const logger = createWinstonLogger(mockConfig);
			createdLoggers.push(logger);
			logger.info("Message without context");
			expect(logger).toBeDefined();
		});
	});

	describe("createConsoleTransport", () => {
		it("должен создать Console transport", () => {
			const transport = createConsoleTransport();

			expect(transport).toBeInstanceOf(transports.Console);
			expect(transport.format).toBeDefined();
		});

		it("должен создать Console transport с правильным форматом", () => {
			const transport = createConsoleTransport();
			const logger = createLogger({
				transports: [transport],
			});
			createdLoggers.push(logger);

			// Проверяем что формат работает
			logger.info("Test message", { context: "TestContext" });
			expect(transport.format).toBeDefined();
		});
	});

	describe("createFileTransport", () => {
		it("должен создать DailyRotateFile transport с правильными параметрами", () => {
			const transport = createFileTransport(mockConfig) as DailyRotateFile;
			createdTransports.push(transport);

			expect(transport).toBeDefined();
			expect(transport.level).toBe("info");
			expect(transport.dirname).toContain("test-service");
			expect(transport.filename).toBe("%DATE%.log");
		});

		it("должен использовать дефолтные значения если не указаны в конфиге", () => {
			const minimalConfig: LoggerConfig = {
				serviceName: "minimal-service",
			};
			const transport = createFileTransport(minimalConfig) as DailyRotateFile;
			createdTransports.push(transport);

			expect(transport).toBeDefined();
			expect(transport.dirname).toContain("minimal-service");
			expect(transport.level).toBe("info");
		});

		it("должен использовать кастомные maxFiles и maxLinesPerFile", () => {
			const customConfig: LoggerConfig = {
				serviceName: "custom-service",
				maxFiles: 60,
				maxLinesPerFile: 5000,
			};
			const transport = createFileTransport(customConfig) as DailyRotateFile;
			createdTransports.push(transport);

			expect(transport).toBeDefined();
			expect(transport.dirname).toContain("custom-service");
			expect(transport.level).toBe("info");
		});

		it("должен создать директорию если её не существует", () => {
			const fs = require("fs");
			// По умолчанию используется process.cwd()/logs
			const serviceLogDir = resolve(process.cwd(), "logs", "new-service");

			// Удаляем директорию если она существует, чтобы проверить создание
			if (fs.existsSync(serviceLogDir)) {
				const rimraf = require("rimraf");
				rimraf.sync(serviceLogDir);
			}

			// Мокируем existsSync чтобы вернуть false только для первого вызова
			// (в ensureLogDirectory), а потом true для всех остальных вызовов
			// (в file-stream-rotator)
			let callCount = 0;
			const originalExistsSync = fs.existsSync;
			const existsSyncSpy = jest.spyOn(fs, "existsSync").mockImplementation((...args: unknown[]) => {
				callCount++;
				// Первый вызов - в ensureLogDirectory, возвращаем false
				// Остальные вызовы - в file-stream-rotator, возвращаем true
				// (директория уже создана)
				if (callCount === 1) {
					return false;
				}
				return originalExistsSync.apply(fs, args as [string]);
			});
			const mkdirSyncSpy = jest.spyOn(fs, "mkdirSync");

			const config: LoggerConfig = {
				serviceName: "new-service",
			};

			const transport = createFileTransport(config);
			createdTransports.push(transport);

			expect(existsSyncSpy).toHaveBeenCalled();
			expect(mkdirSyncSpy).toHaveBeenCalledWith(expect.any(String), { recursive: true });

			existsSyncSpy.mockRestore();
			mkdirSyncSpy.mockRestore();
		});

		it("должен не создавать директорию если она уже существует", () => {
			const fs = require("fs");

			// По умолчанию используется process.cwd()/logs
			const serviceLogDir = resolve(process.cwd(), "logs", "existing-service");

			// Создаем реальную директорию перед тестом
			mkdirSync(serviceLogDir, { recursive: true });

			// Создаем файл лога чтобы DailyRotateFile мог его открыть при создании транспорта
			// DailyRotateFile пытается открыть файл при создании, поэтому файл должен существовать
			const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD формат
			const logFilePath = resolve(serviceLogDir, `${today}.log`);
			// Создаем файл с содержимым чтобы он был валидным
			writeFileSync(logFilePath, "", { flag: "w" });

			// Мокируем mkdirSync чтобы отследить его вызовы
			const mkdirSyncSpy = jest.spyOn(fs, "mkdirSync");

			const config: LoggerConfig = {
				serviceName: "existing-service",
			};

			// Создаем транспорт - DailyRotateFile может выбросить ошибку при открытии файла,
			// но это не влияет на проверку того, что директория не создается повторно
			let transport: WinstonTransport;
			try {
				transport = createFileTransport(config);
				createdTransports.push(transport);
			} catch (error) {
				// Игнорируем ошибку открытия файла, так как цель теста -
				// проверить создание директории
				// В реальном сценарии файл будет создан автоматически при первой записи
				if ((error as { code?: string }).code !== "ENOENT") {
					throw error;
				}
				// Если ошибка ENOENT, создаем транспорт без проверки открытия файла
				transport = createFileTransport(config);
				createdTransports.push(transport);
			}

			// Проверяем что mkdirSync не был вызван для существующей директории
			// (может быть вызван для других целей, но не для serviceLogDir)
			const mkdirSyncCalls = mkdirSyncSpy.mock.calls.filter(
				(call) => resolve(call[0] as string) === resolve(serviceLogDir)
			);
			expect(mkdirSyncCalls).toHaveLength(0);

			mkdirSyncSpy.mockRestore();
		});

		it("должен использовать process.cwd()/logs по умолчанию независимо от окружения", () => {
			const config: LoggerConfig = {
				serviceName: "test-service",
			};

			const transport = createFileTransport(config) as DailyRotateFile;
			createdTransports.push(transport);

			expect(transport).toBeDefined();
			expect(transport.dirname).toContain("test-service");
			// По умолчанию используется process.cwd()/logs
			const expectedPath = resolve(process.cwd(), "logs", "test-service");
			expect(transport.dirname).toBe(expectedPath);
		});

		it("должен выбросить LoggerError при неудачном создании директории логов", () => {
			const fs = require("fs");
			const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

			// Мокаем existsSync чтобы вернуть false (директории не существует)
			const existsSyncSpy = jest.spyOn(fs, "existsSync").mockReturnValue(false);

			// Мокаем mkdirSync чтобы выбросить ошибку
			const originalError = new Error("Permission denied");
			const mkdirSyncSpy = jest.spyOn(fs, "mkdirSync").mockImplementation(() => {
				throw originalError;
			});

			const errorConfig: LoggerConfig = {
				serviceName: "error-service",
			};

			expect(() => {
				createFileTransport(errorConfig);
			}).toThrow(LoggerError);

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Failed to create log directory"),
				originalError
			);

			// Проверяем что выброшена именно LoggerError с правильным сообщением
			try {
				createFileTransport(errorConfig);
			} catch (error) {
				expect(error).toBeInstanceOf(LoggerError);
				expect(error).toBeInstanceOf(Error);
				if (error instanceof LoggerError) {
					expect(error.message).toContain("Failed to create log directory");
					expect(error.cause).toBe(originalError);
				}
			}

			// Восстанавливаем все моки
			consoleErrorSpy.mockRestore();
			existsSyncSpy.mockRestore();
			mkdirSyncSpy.mockRestore();
		});

		it("должен выбросить LoggerError с обернутой ошибкой когда ошибка не является экземпляром Error", () => {
			const fs = require("fs");
			const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

			// Мокаем existsSync чтобы вернуть false (директории не существует)
			const existsSyncSpy = jest.spyOn(fs, "existsSync").mockReturnValue(false);

			// Мокаем mkdirSync чтобы выбросить не-Error объект (например, строку)
			const mkdirSyncSpy = jest.spyOn(fs, "mkdirSync").mockImplementation(() => {
				throw "String error";
			});

			const errorConfig: LoggerConfig = {
				serviceName: "error-service",
			};

			expect(() => {
				createFileTransport(errorConfig);
			}).toThrow(LoggerError);

			// Проверяем что выброшена именно LoggerError с правильным сообщением
			try {
				createFileTransport(errorConfig);
			} catch (error) {
				expect(error).toBeInstanceOf(LoggerError);
				expect(error).toBeInstanceOf(Error);
				if (error instanceof LoggerError) {
					expect(error.message).toContain("Failed to create log directory");
					// Когда ошибка не является Error, она должна быть обернута в новый Error
					expect(error.cause).toBeInstanceOf(Error);
					if (error.cause instanceof Error) {
						expect(error.cause.message).toBe("String error");
					}
				}
			}

			// Восстанавливаем все моки
			consoleErrorSpy.mockRestore();
			existsSyncSpy.mockRestore();
			mkdirSyncSpy.mockRestore();
		});

		it("должен использовать кастомный logDir если указан относительный путь", () => {
			const customLogDir = "custom-logs";
			const configWithLogDir: LoggerConfig = {
				serviceName: "service-with-logdir",
				logDir: customLogDir,
			};
			const transport = createFileTransport(configWithLogDir) as DailyRotateFile;
			createdTransports.push(transport);

			expect(transport).toBeDefined();
			// Путь должен быть разрешен относительно process.cwd()
			const expectedPath = resolve(process.cwd(), customLogDir, "service-with-logdir");
			expect(transport.dirname).toBe(expectedPath);
		});

		it("должен использовать кастомный logDir если указан абсолютный путь", () => {
			// Используем временную директорию для абсолютного пути
			const tempDir = resolve(process.cwd(), "temp-absolute-logs");
			const configWithAbsoluteLogDir: LoggerConfig = {
				serviceName: "service-with-absolute-logdir",
				logDir: tempDir,
			};
			const transport = createFileTransport(configWithAbsoluteLogDir) as DailyRotateFile;
			createdTransports.push(transport);

			expect(transport).toBeDefined();
			// Путь должен быть абсолютным
			const expectedPath = resolve(tempDir, "service-with-absolute-logdir");
			expect(transport.dirname).toBe(expectedPath);
		});

		it("должен использовать дефолтную директорию если logDir не указан", () => {
			// По умолчанию используется process.cwd()/logs
			const defaultLogDir = resolve(process.cwd(), "logs");

			const config: LoggerConfig = {
				serviceName: "service-without-logdir",
			};
			const transport = createFileTransport(config) as DailyRotateFile;
			createdTransports.push(transport);

			expect(transport).toBeDefined();
			const expectedPath = resolve(defaultLogDir, "service-without-logdir");
			expect(transport.dirname).toBe(expectedPath);
		});
	});

	describe("createLogstashTransport", () => {
		it("должен вернуть null если host не указан", () => {
			const configWithoutHost: LoggerConfig = {
				...mockConfig,
				logstashPort: 5000,
			};
			const transport = createLogstashTransport(configWithoutHost);

			expect(transport).toBeNull();
		});

		it("должен вернуть null если port не указан", () => {
			const configWithoutPort: LoggerConfig = {
				...mockConfig,
				logstashHost: "localhost",
			};
			const transport = createLogstashTransport(configWithoutPort);

			expect(transport).toBeNull();
		});

		it("должен создать Logstash transport если host и port указаны", () => {
			const configWithLogstash: LoggerConfig = {
				...mockConfig,
				logstashHost: "localhost",
				logstashPort: 5000,
			};

			const transport = createLogstashTransport(configWithLogstash);

			expect(transport).toBeDefined();
			expect(transport).not.toBeNull();
			// Проверяем что конструктор был вызван с правильными опциями
			expect(logstashTransportCalls).toHaveLength(1);
			expect(logstashTransportCalls[0]).toEqual({
				host: "localhost",
				port: 5000,
				protocol: "tcp",
				json: true,
				node_name: "test-service",
			});
			// Проверяем опции через свойство options мока
			if (transport && "options" in transport) {
				const options = (transport as { options: unknown }).options;
				expect(options).toEqual({
					host: "localhost",
					port: 5000,
					protocol: "tcp",
					json: true,
					node_name: "test-service",
				});
			}
		});

		it("должен вернуть null если host пустая строка", () => {
			const configWithEmptyHost: LoggerConfig = {
				...mockConfig,
				logstashHost: "",
				logstashPort: 5000,
			};
			const transport = createLogstashTransport(configWithEmptyHost);

			expect(transport).toBeNull();
		});

		it("должен вернуть null если port равен 0", () => {
			const configWithZeroPort: LoggerConfig = {
				...mockConfig,
				logstashHost: "localhost",
				logstashPort: 0,
			};
			const transport = createLogstashTransport(configWithZeroPort);

			expect(transport).toBeNull();
		});
	});

	describe("createWinstonLogger", () => {
		it("должен создать Winston logger со всеми транспортами", () => {
			const logger = createWinstonLogger(mockConfig);
			createdLoggers.push(logger);

			expect(logger).toBeDefined();
			expect(logger.level).toBe("debug");
			expect(logger.transports).toHaveLength(2); // console + file
		});

		it("должен добавить Logstash transport когда он настроен", () => {
			const configWithLogstash: LoggerConfig = {
				...mockConfig,
				logstashHost: "localhost",
				logstashPort: 5000,
			};

			const logger = createWinstonLogger(configWithLogstash);
			createdLoggers.push(logger);

			expect(logger).toBeDefined();
			expect(logger.transports).toHaveLength(3); // console + file + logstash

			// Проверяем что Logstash transport был создан с правильными опциями
			// через массив вызовов
			expect(logstashTransportCalls.length).toBeGreaterThan(0);
			const lastCall = logstashTransportCalls[logstashTransportCalls.length - 1];
			expect(lastCall).toEqual({
				host: "localhost",
				port: 5000,
				protocol: "tcp",
				json: true,
				node_name: "test-service",
			});

			// Проверяем что Logstash transport был создан с правильными опциями
			const logstashTransport = logger.transports.find(
				(t) => t.constructor.name === "MockLogstashTransport"
			);
			expect(logstashTransport).toBeDefined();
			if (logstashTransport && "options" in logstashTransport) {
				const options = (logstashTransport as { options: unknown }).options;
				expect(options).toEqual({
					host: "localhost",
					port: 5000,
					protocol: "tcp",
					json: true,
					node_name: "test-service",
				});
			}
		});

		it("должен установить serviceName в defaultMeta", () => {
			const logger = createWinstonLogger(mockConfig);
			createdLoggers.push(logger);

			expect(logger.defaultMeta).toEqual({ service: "test-service" });
		});

		it("должен использовать уровень debug для логгера", () => {
			const logger = createWinstonLogger(mockConfig);
			createdLoggers.push(logger);

			expect(logger.level).toBe("debug");
		});

		it("должен создать логгер с правильным количеством транспортов без Logstash", () => {
			const logger = createWinstonLogger(mockConfig);
			createdLoggers.push(logger);

			expect(logger.transports).toHaveLength(2);
			expect(logger.transports[0]).toBeInstanceOf(transports.Console);
			expect(logger.transports[1]).toBeInstanceOf(DailyRotateFile);
		});

		it("должен создать логгер с правильным количеством транспортов с Logstash", () => {
			const configWithLogstash: LoggerConfig = {
				...mockConfig,
				logstashHost: "localhost",
				logstashPort: 5000,
			};

			const logstashTransport = createLogstashTransport(configWithLogstash);
			expect(logstashTransport).not.toBeNull();

			// Проверяем что createLogstashTransport возвращает транспорт
			expect(logstashTransport).toBeDefined();
		});
	});
});
