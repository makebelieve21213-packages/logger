// Конфигурация Jest для @makebelieve21213-packages/logger
export default {
	// Verbose output для детальных логов
	verbose: true,

	// Очистка моков между тестами
	clearMocks: true,
	resetMocks: true,
	restoreMocks: true,

	// Игнорируемые папки для всех проектов
	testPathIgnorePatterns: ["/node_modules/", "/dist/", "/coverage/"],

	// Директория для coverage
	coverageDirectory: "coverage",

	// Reporters для покрытия
	coverageReporters: ["text", "lcov", "html", "json", "clover"],

	// Общие расширения файлов
	moduleFileExtensions: ["js", "json", "ts"],

	// Максимальное количество воркеров для параллельного запуска тестов
	maxWorkers: "50%",

	// Таймаут для тестов (5 секунд)
	testTimeout: 5000,

	// Принудительное завершение процессов после завершения тестов (решает проблему EPERM на Windows)
	forceExit: process.platform === "win32",

	// Конфигурация для TypeScript packages с ts-jest preset
	testEnvironment: "node",
	testRegex: ".*\\.spec\\.ts$",
	preset: "ts-jest/presets/default",
	rootDir: ".",
	transform: {
		"^.+\\.(t|j)s$": [
			"ts-jest",
			{
				tsconfig: "<rootDir>/tsconfig.json",
			},
		],
	},
	collectCoverageFrom: [
		"src/**/*.ts",
		"!src/**/__tests__/**/*.ts",
		"!src/**/*.spec.ts",
		"!src/**/*.d.ts",
		"!src/index.ts",
		"!src/types/**/*.ts",
		"!src/interfaces/**/*.ts",
	],
	coverageThreshold: {
		global: {
			branches: 100,
			functions: 100,
			lines: 100,
			statements: 100,
		},
	},
	moduleNameMapper: {
		"^src/(.*)$": "<rootDir>/src/$1",
	},
};
