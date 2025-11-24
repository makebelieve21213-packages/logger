import { existsSync } from "fs";
import { resolve, dirname } from "path";

/**
 * Получаем путь к корню пакета logger (где находится package.json)
 * Ищет package.json вверх по дереву директорий от стартовой точки
 */
export function findPackageRoot(startPath: string): string {
	let currentPath = startPath;
	const root = resolve("/");

	while (currentPath !== root) {
		const packageJsonPath = resolve(currentPath, "package.json");

		if (existsSync(packageJsonPath)) {
			return currentPath;
		}

		currentPath = dirname(currentPath);
	}

	// Fallback: если не нашли package.json, возвращаем process.cwd()
	return process.cwd();
}

/**
 * Находим корень пакета
 * Используем process.cwd() как стартовую точку - это работает и в тестах, и в продакшене
 */
export const PACKAGE_ROOT = findPackageRoot(process.cwd());

/**
 * Путь к директории логов
 * Для тестов используем отдельную папку test-logs в корне проекта
 * Для продакшена - dist/logs (если dist существует) или logs в корне
 */
function isTestEnvironment(): boolean {
	return !!process.env.JEST_WORKER_ID || !!process.env.NODE_ENV?.includes("test");
}

export function getLogFolder(): string {
	return isTestEnvironment() ? "test-logs" : "logs";
}

// Для обратной совместимости
export const LOG_FOLDER = getLogFolder();

/**
 * Получает путь к директории логов
 * Для тестов всегда используем test-logs в корне проекта (не в dist)
 * Для продакшена используем dist/logs если dist существует, иначе logs в корне
 */
export function getDefaultLogDir(): string {
	const isTest = isTestEnvironment();
	const distPath = resolve(PACKAGE_ROOT, "dist");
	const isProduction = !isTest && existsSync(distPath);

	if (isTest) {
		return resolve(PACKAGE_ROOT, "test-logs");
	}

	if (isProduction) {
		return resolve(distPath, "logs");
	}

	return resolve(PACKAGE_ROOT, "logs");
}

// Цвета для разных уровней логирования
export const colors: Record<string, string> = {
	error: "\x1b[31m", // Красный
	warn: "\x1b[33m", // Желтый
	info: "\x1b[32m", // Зеленый
	debug: "\x1b[36m", // Голубой
	reset: "\x1b[0m", // Сброс
};

// Токены инъекции для конфигурации логгера
export const LOGGER_OPTIONS = Symbol("LOGGER_OPTIONS");
