import * as winstonConfig from "src/configs/winston.config";
import LoggerError from "src/errors/logger.error";
import LoggerService from "src/main/logger.service";

import type { LoggerConfig } from "src/types/logger.types";
import type { Logger } from "winston";

// Создаем мок winston logger с явной типизацией
// Используем Map для хранения зарегистрированных listeners
const eventListeners = new Map<string, (() => void)[]>();

const mockWinstonLoggerInstance: {
	info: jest.Mock;
	error: jest.Mock;
	warn: jest.Mock;
	debug: jest.Mock;
	close: jest.Mock;
	on: jest.Mock;
} = {
	info: jest.fn(),
	error: jest.fn(),
	warn: jest.fn(),
	debug: jest.fn(),
	close: jest.fn(),
	on: jest.fn((event: string, callback: () => void): typeof mockWinstonLoggerInstance => {
		// Сохраняем callback для события
		if (!eventListeners.has(event)) {
			eventListeners.set(event, []);
		}
		const listeners = eventListeners.get(event);
		if (listeners) {
			listeners.push(callback);
		}

		// Если это событие "finish" - эмулируем что close() уже завершился
		// и вызываем callback асинхронно
		if (event === "finish") {
			queueMicrotask(() => {
				callback();
			});
		}

		return mockWinstonLoggerInstance; // Возвращаем this для chaining
	}),
};

describe("LoggerService", () => {
	let loggerService: LoggerService;
	let mockWinstonLogger: typeof mockWinstonLoggerInstance;
	const mockConfig: LoggerConfig = {
		serviceName: "test-service",
	};

	beforeEach(() => {
		// Очищаем моки и listeners перед каждым тестом
		jest.clearAllMocks();
		eventListeners.clear();

		// Мокаем createWinstonLogger через spyOn
		jest
			.spyOn(winstonConfig, "createWinstonLogger")
			.mockReturnValue(mockWinstonLoggerInstance as unknown as Logger);

		loggerService = new LoggerService(mockConfig);
		loggerService.onModuleInit(); // Инициализируем logger
		mockWinstonLogger = mockWinstonLoggerInstance;
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("constructor", () => {
		it("должен создать экземпляр LoggerService", () => {
			expect(loggerService).toBeDefined();
			expect(loggerService).toBeInstanceOf(LoggerService);
		});

		it("должен установить serviceName из конфигурации", () => {
			const newLogger = new LoggerService(mockConfig);
			expect(newLogger).toBeDefined();
		});
	});

	describe("onModuleInit", () => {
		it("должен создать Winston logger при инициализации", () => {
			const newLogger = new LoggerService(mockConfig);
			const createSpy = jest.spyOn(winstonConfig, "createWinstonLogger");

			newLogger.onModuleInit();

			expect(createSpy).toHaveBeenCalledWith(mockConfig);
		});

		it("должен позволить использовать logger после инициализации", () => {
			const newLogger = new LoggerService(mockConfig);
			newLogger.onModuleInit();

			expect(() => {
				newLogger.log("test message");
			}).not.toThrow();
		});

		it("должен выбрасывать LoggerError при использовании до инициализации", () => {
			const newLogger = new LoggerService(mockConfig);

			expect(() => {
				newLogger.log("test message");
			}).toThrow(LoggerError);
			expect(() => {
				newLogger.log("test message");
			}).toThrow("Logger not initialized");
		});
	});

	describe("setContext", () => {
		it("должен установить контекст", () => {
			loggerService.setContext("TestContext");
			loggerService.log("test message");

			expect(mockWinstonLogger.info).toHaveBeenCalledWith("test message", {
				context: "TestContext",
				service: "test-service",
			});
		});
	});

	describe("log", () => {
		it("должен записать info лог", () => {
			loggerService.log("test message");

			expect(mockWinstonLogger.info).toHaveBeenCalledWith("test message", {
				context: undefined,
				service: "test-service",
			});
		});

		it("должен записать лог с контекстом", () => {
			loggerService.log("test message", "CustomContext");

			expect(mockWinstonLogger.info).toHaveBeenCalledWith("test message", {
				context: "CustomContext",
				service: "test-service",
			});
		});

		it("должен использовать установленный контекст если не передан явно", () => {
			loggerService.setContext("DefaultContext");
			loggerService.log("test message");

			expect(mockWinstonLogger.info).toHaveBeenCalledWith("test message", {
				context: "DefaultContext",
				service: "test-service",
			});
		});
	});

	describe("error", () => {
		it("должен записать error лог", () => {
			loggerService.error("error message");

			expect(mockWinstonLogger.error).toHaveBeenCalledWith("error message", {
				context: undefined,
				service: "test-service",
				trace: undefined,
			});
		});

		it("должен записать error лог с trace", () => {
			const trace = "Error stack trace";
			loggerService.error("error message", trace);

			expect(mockWinstonLogger.error).toHaveBeenCalledWith("error message", {
				context: undefined,
				service: "test-service",
				trace,
			});
		});

		it("должен записать error лог с контекстом", () => {
			loggerService.error("error message", "stack trace", "ErrorContext");

			expect(mockWinstonLogger.error).toHaveBeenCalledWith("error message", {
				context: "ErrorContext",
				service: "test-service",
				trace: "stack trace",
			});
		});

		it("должен выбрасывать LoggerError при использовании до инициализации", () => {
			const newLogger = new LoggerService(mockConfig);

			expect(() => {
				newLogger.error("error message");
			}).toThrow(LoggerError);
			expect(() => {
				newLogger.error("error message");
			}).toThrow("Logger not initialized");
		});
	});

	describe("warn", () => {
		it("должен записать warn лог", () => {
			loggerService.warn("warning message");

			expect(mockWinstonLogger.warn).toHaveBeenCalledWith("warning message", {
				context: undefined,
				service: "test-service",
			});
		});

		it("должен записать warn лог с контекстом", () => {
			loggerService.warn("warning message", "WarnContext");

			expect(mockWinstonLogger.warn).toHaveBeenCalledWith("warning message", {
				context: "WarnContext",
				service: "test-service",
			});
		});

		it("должен выбрасывать LoggerError при использовании до инициализации", () => {
			const newLogger = new LoggerService(mockConfig);

			expect(() => {
				newLogger.warn("warning message");
			}).toThrow(LoggerError);
			expect(() => {
				newLogger.warn("warning message");
			}).toThrow("Logger not initialized");
		});
	});

	describe("debug", () => {
		it("должен записать debug лог", () => {
			loggerService.debug("debug message");

			expect(mockWinstonLogger.debug).toHaveBeenCalledWith("debug message", {
				context: undefined,
				service: "test-service",
			});
		});

		it("должен записать debug лог с контекстом", () => {
			loggerService.debug("debug message", "DebugContext");

			expect(mockWinstonLogger.debug).toHaveBeenCalledWith("debug message", {
				context: "DebugContext",
				service: "test-service",
			});
		});

		it("должен выбрасывать LoggerError при использовании до инициализации", () => {
			const newLogger = new LoggerService(mockConfig);

			expect(() => {
				newLogger.debug("debug message");
			}).toThrow(LoggerError);
			expect(() => {
				newLogger.debug("debug message");
			}).toThrow("Logger not initialized");
		});
	});

	describe("verbose", () => {
		it("должен вызвать метод log (alias)", () => {
			const logSpy = jest.spyOn(loggerService, "log");
			loggerService.verbose("verbose message");

			expect(logSpy).toHaveBeenCalledWith("verbose message", undefined);
		});

		it("должен вызвать метод log с контекстом", () => {
			const logSpy = jest.spyOn(loggerService, "log");
			loggerService.verbose("verbose message", "VerboseContext");

			expect(logSpy).toHaveBeenCalledWith("verbose message", "VerboseContext");
		});
	});

	describe("close", () => {
		it("должен закрыть Winston logger и зарегистрировать обработчик finish", () => {
			// Вызываем close() - не ждем завершения Promise
			loggerService.close();

			// Проверяем что методы были вызваны
			expect(mockWinstonLogger.close).toHaveBeenCalled();
			expect(mockWinstonLogger.on).toHaveBeenCalledWith("finish", expect.any(Function));
		});

		it("должен корректно создать Promise при вызове close()", () => {
			const closePromise = loggerService.close();

			// Проверяем что возвращается Promise
			expect(closePromise).toBeInstanceOf(Promise);
			expect(mockWinstonLogger.close).toHaveBeenCalled();
			expect(mockWinstonLogger.on).toHaveBeenCalledWith("finish", expect.any(Function));
		});

		it("должен резолвить Promise когда событие finish срабатывает", async () => {
			// Создаем мок который вызовет callback сразу
			mockWinstonLogger.on.mockImplementationOnce((event: string, callback: () => void) => {
				if (event === "finish") {
					// Вызываем callback сразу чтобы Promise резолвился
					process.nextTick(callback);
				}
				return mockWinstonLogger;
			});

			const closePromise = loggerService.close();

			// Ждем резолва Promise
			await expect(closePromise).resolves.toBeUndefined();
			expect(mockWinstonLogger.close).toHaveBeenCalled();
		});

		it("должен вернуть undefined если logger не инициализирован", async () => {
			const newLogger = new LoggerService(mockConfig);

			const result = await newLogger.close();

			expect(result).toBeUndefined();
			expect(mockWinstonLogger.close).not.toHaveBeenCalled();
		});
	});

	describe("onModuleDestroy", () => {
		it("должен вызвать метод close() при уничтожении модуля", async () => {
			const closeSpy = jest.spyOn(loggerService, "close").mockResolvedValue();

			await loggerService.onModuleDestroy();

			expect(closeSpy).toHaveBeenCalledTimes(1);
		});

		it("должен корректно закрыть Winston logger при уничтожении модуля", async () => {
			// Настраиваем мок для немедленного вызова callback
			mockWinstonLogger.on.mockImplementationOnce((event: string, callback: () => void) => {
				if (event === "finish") {
					process.nextTick(callback);
				}
				return mockWinstonLogger;
			});

			await loggerService.onModuleDestroy();

			expect(mockWinstonLogger.close).toHaveBeenCalled();
			expect(mockWinstonLogger.on).toHaveBeenCalledWith("finish", expect.any(Function));
		});
	});
});
