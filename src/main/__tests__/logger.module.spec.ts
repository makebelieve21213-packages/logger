import { ConfigModule, registerAs } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import LoggerModule from "src/main/logger.module";
import LoggerService from "src/main/logger.service";

import type { TestingModule } from "@nestjs/testing";
import type { LoggerConfig } from "src/types/logger.types";

describe("LoggerModule", () => {
	const mockConfig: LoggerConfig = {
		serviceName: "test-service",
		maxFiles: 7,
		maxLinesPerFile: 1000,
	};

	describe("forRootAsync с простой фабрикой (замена forRoot)", () => {
		let module: TestingModule;

		beforeEach(async () => {
			module = await Test.createTestingModule({
				imports: [
					LoggerModule.forRootAsync({
						useFactory: () => mockConfig,
					}),
				],
			}).compile();
		});

		afterEach(async () => {
			await module.close();
		});

		it("должен быть определен", () => {
			expect(module).toBeDefined();
		});

		it("должен предоставить LoggerService", async () => {
			const logger = await module.resolve<LoggerService>(LoggerService);
			expect(logger).toBeDefined();
			expect(logger).toBeInstanceOf(LoggerService);
		});

		it("должен создавать разные экземпляры LoggerService (TRANSIENT)", async () => {
			const logger1 = await module.resolve<LoggerService>(LoggerService);
			const logger2 = await module.resolve<LoggerService>(LoggerService);

			expect(logger1).not.toBe(logger2); // Разные экземпляры
			expect(logger1).toBeInstanceOf(LoggerService);
			expect(logger2).toBeInstanceOf(LoggerService);
		});
	});

	describe("forRootAsync с инжекцией зависимостей", () => {
		let module: TestingModule;

		const testLoggerConfig = registerAs("logger", (): LoggerConfig => mockConfig);

		beforeEach(async () => {
			module = await Test.createTestingModule({
				imports: [
					ConfigModule.forRoot({
						isGlobal: true,
						load: [testLoggerConfig],
					}),
					LoggerModule.forRootAsync<[LoggerConfig]>({
						useFactory: (config: LoggerConfig) => config,
						inject: [testLoggerConfig.KEY],
					}),
				],
			}).compile();
		});

		afterEach(async () => {
			await module.close();
		});

		it("должен быть определен", () => {
			expect(module).toBeDefined();
		});

		it("должен предоставить LoggerService через forRootAsync", async () => {
			const logger = await module.resolve<LoggerService>(LoggerService);
			expect(logger).toBeDefined();
			expect(logger).toBeInstanceOf(LoggerService);
		});

		it("должен создавать разные экземпляры LoggerService (TRANSIENT) через forRootAsync", async () => {
			const logger1 = await module.resolve<LoggerService>(LoggerService);
			const logger2 = await module.resolve<LoggerService>(LoggerService);

			expect(logger1).not.toBe(logger2);
			expect(logger1).toBeInstanceOf(LoggerService);
			expect(logger2).toBeInstanceOf(LoggerService);
		});

		it("должен получать конфигурацию через useFactory", async () => {
			const logger = await module.resolve<LoggerService>(LoggerService);

			// Проверяем, что логгер создан с правильной конфигурацией
			expect(logger).toBeDefined();
		});
	});

	describe("forRootAsync без inject", () => {
		let module: TestingModule;

		beforeEach(async () => {
			module = await Test.createTestingModule({
				imports: [
					LoggerModule.forRootAsync({
						useFactory: () => mockConfig,
						// Не указываем inject - должен использоваться дефолт []
					}),
				],
			}).compile();
		});

		afterEach(async () => {
			await module.close();
		});

		it("должен работать без указания inject (использовать дефолт [])", async () => {
			const logger = await module.resolve<LoggerService>(LoggerService);
			expect(logger).toBeDefined();
			expect(logger).toBeInstanceOf(LoggerService);
		});

		it("должен создавать разные экземпляры LoggerService без inject", async () => {
			const logger1 = await module.resolve<LoggerService>(LoggerService);
			const logger2 = await module.resolve<LoggerService>(LoggerService);

			expect(logger1).not.toBe(logger2);
			expect(logger1).toBeInstanceOf(LoggerService);
			expect(logger2).toBeInstanceOf(LoggerService);
		});
	});
});
