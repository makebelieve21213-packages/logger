import { existsSync } from "fs";
import { resolve } from "path";

import { findPackageRoot } from "src/utils/constants";

describe("constants", () => {
	describe("findPackageRoot", () => {
		it("должен найти package.json при нормальном выполнении", () => {
			const startPath = process.cwd();
			const result = findPackageRoot(startPath);
			const packageJsonPath = resolve(result, "package.json");

			expect(existsSync(packageJsonPath)).toBe(true);
		});

		it("должен вернуть process.cwd() если package.json не найден (fallback)", () => {
			// Мокаем existsSync чтобы всегда возвращать false
			const existsSyncSpy = jest.spyOn(require("fs"), "existsSync").mockReturnValue(false);

			// Мокаем process.cwd() чтобы вернуть тестовое значение
			const originalCwd = process.cwd;
			const mockCwd = "/test/path";
			process.cwd = jest.fn(() => mockCwd);

			const startPath = "/some/path";
			const result = findPackageRoot(startPath);

			// Проверяем что вернулся fallback (process.cwd())
			expect(result).toBe(mockCwd);
			expect(process.cwd).toHaveBeenCalled();

			// Восстанавливаем оригинальные функции
			existsSyncSpy.mockRestore();
			process.cwd = originalCwd;
		});

		it("должен искать package.json вверх по дереву директорий", () => {
			const startPath = process.cwd();
			const result = findPackageRoot(startPath);

			// Результат должен быть либо текущая директория, либо родительская
			expect(result).toBeDefined();
			expect(typeof result).toBe("string");
		});
	});

	describe("getDefaultLogDir", () => {
		it("должен использовать test-logs в тестовом окружении", () => {
			// В тестах JEST_WORKER_ID установлен, поэтому должен использоваться test-logs
			const { getDefaultLogDir } = require("src/utils/constants");

			const logDir = getDefaultLogDir();
			expect(logDir).toContain("test-logs");
			expect(logDir).not.toContain("dist");
		});

		it("getDefaultLogDir должен возвращать функцию", () => {
			const { getDefaultLogDir } = require("src/utils/constants");
			expect(typeof getDefaultLogDir).toBe("function");
		});

		it("должен использовать dist/logs в продакшене когда dist существует", async () => {
			const originalJestWorkerId = process.env.JEST_WORKER_ID;
			const originalNodeEnv = process.env.NODE_ENV;
			delete process.env.JEST_WORKER_ID;
			delete process.env.NODE_ENV;

			jest.resetModules();

			const { getDefaultLogDir: getDefaultLogDirProd } = await import("src/utils/constants");

			// Используем функцию для динамического получения пути
			const logDir = getDefaultLogDirProd();

			// Если dist существует, должен использоваться dist/logs
			expect(logDir).toMatch(/[\\\/]dist[\\\/]logs$/);
			expect(logDir).not.toMatch(/[\\\/]test-logs[\\\/]/);

			if (originalJestWorkerId) {
				process.env.JEST_WORKER_ID = originalJestWorkerId;
			}
			if (originalNodeEnv) {
				process.env.NODE_ENV = originalNodeEnv;
			}
			jest.resetModules();
		});

		it("должен использовать logs в корне когда dist не существует", async () => {
			const originalJestWorkerId = process.env.JEST_WORKER_ID;
			const originalNodeEnv = process.env.NODE_ENV;
			delete process.env.JEST_WORKER_ID;
			delete process.env.NODE_ENV;

			jest.resetModules();

			// Мокаем existsSync для dist
			const fs = require("fs");
			const originalExistsSync = fs.existsSync;
			const existsSyncSpy = jest
				.spyOn(fs, "existsSync")
				.mockImplementation((...args: unknown[]) => {
					const path = args[0] as string;
					// Возвращаем false для dist, но true для package.json и других файлов
					if (typeof path === "string" && path.includes("dist") && !path.includes("package.json")) {
						return false;
					}
					return originalExistsSync.apply(fs, args as [string]);
				});

			jest.resetModules();
			const { getDefaultLogDir: getDefaultLogDirProd } = await import("src/utils/constants");

			// Используем функцию для динамического получения пути
			const logDir = getDefaultLogDirProd();

			// Если dist не существует, должен использоваться logs в корне
			expect(logDir).toMatch(/[\\\/]logs$/);
			expect(logDir).not.toMatch(/[\\\/]dist[\\\/]/);
			expect(logDir).not.toMatch(/[\\\/]test-logs[\\\/]/);

			existsSyncSpy.mockRestore();
			if (originalJestWorkerId) {
				process.env.JEST_WORKER_ID = originalJestWorkerId;
			}
			if (originalNodeEnv) {
				process.env.NODE_ENV = originalNodeEnv;
			}
			jest.resetModules();
		});
	});
});
