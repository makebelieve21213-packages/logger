import * as winstonConfig from "src/configs/winston.config";
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

		it("должен создать Winston logger в конструкторе", () => {
			const createSpy = jest.spyOn(winstonConfig, "createWinstonLogger");
			createSpy.mockClear(); // Очищаем вызовы из beforeEach

			new LoggerService(mockConfig);

			expect(createSpy).toHaveBeenCalledWith(mockConfig);
			expect(createSpy).toHaveBeenCalledTimes(1);
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

	describe("onModuleDestroy", () => {
		it("должен закрыть Winston logger при уничтожении модуля", () => {
			loggerService.onModuleDestroy();

			expect(mockWinstonLogger.close).toHaveBeenCalledTimes(1);
		});
	});
});
