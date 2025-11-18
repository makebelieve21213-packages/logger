import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";

import type { Linter } from "eslint";

// Общие правила для всех конфигураций
const commonRules = {
	// TypeScript правила
	"@typescript-eslint/no-explicit-any": "error",
	"@typescript-eslint/explicit-function-return-type": "off",
	"@typescript-eslint/explicit-module-boundary-types": "off",
	"@typescript-eslint/no-unused-vars": [
		"error",
		{
			argsIgnorePattern: "^_",
			varsIgnorePattern: "^_",
		},
	],
	"@typescript-eslint/no-non-null-assertion": "warn",
	"@typescript-eslint/consistent-type-imports": [
		"error",
		{
			prefer: "type-imports",
			fixStyle: "separate-type-imports",
		},
	],

	// Общие правила
	"no-console": ["warn", { allow: ["warn", "error"] }],
	"prefer-const": "error",
	"no-var": "error",
	"max-len": [
		"error",
		{
			code: 100,
			ignoreUrls: true,
			ignoreStrings: true,
			ignoreTemplateLiterals: true,
			ignoreRegExpLiterals: true,
		},
	],

	// Правила сортировки импортов
	"import/order": [
		"error",
		{
			groups: [
				"builtin", // Node.js встроенные модули
				"external", // npm пакеты
				"internal", // packages/* (локальные пакеты монорепозитория)
				["parent", "sibling", "index"], // Относительные импорты
				"type", // Type-only imports
				"object", // object imports
			],
			pathGroups: [
				{
					pattern: "packages/**",
					group: "internal",
					position: "before",
				},
				{
					pattern: "*.{css,scss,sass,less}",
					group: "object",
					position: "after",
				},
			],
			pathGroupsExcludedImportTypes: ["builtin", "type"],
			"newlines-between": "always",
			alphabetize: {
				order: "asc",
				caseInsensitive: true,
			},
		},
	],
	"import/no-duplicates": "error",
	"import/newline-after-import": ["error", { count: 1 }],
};

export default [
	{
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/coverage/**",
			"**/eslint.config.ts",
			"**/jest.config.ts",
		],
	},
	// Основные файлы пакета (исключая тесты)
	{
		files: ["src/**/*.ts"],
		ignores: [
			"src/**/*.spec.ts",
			"src/**/__tests__/**/*.ts",
		],
		languageOptions: {
			parser: parser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				project: ["./tsconfig.json"],
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
			import: importPlugin,
		},
		rules: {
			...commonRules,
			// NestJS специфичные правила
			"@typescript-eslint/interface-name-prefix": "off",
			"@typescript-eslint/no-useless-constructor": "off",
			"no-useless-constructor": "off",
		},
	},
	// Тестовые файлы
	{
		files: [
			"src/**/*.spec.ts",
			"src/**/__tests__/**/*.ts",
		],
		languageOptions: {
			parser: parser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				project: ["./tsconfig.json"],
			},
		},
		plugins: {
			"@typescript-eslint": tseslint,
			import: importPlugin,
		},
		rules: {
			...commonRules,
			// Более мягкие правила для тестов
			"no-console": "off",
			"@typescript-eslint/no-explicit-any": "warn",
		},
	},
] as Linter.Config[];
