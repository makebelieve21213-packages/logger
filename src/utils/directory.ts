import { mkdirSync, existsSync } from "fs";

import LoggerError from "src/errors/logger.error";

// Функция для создания директории логов если её нет (синхронно)
export default function ensureLogDirectory(logDir: string): void {
	try {
		if (!existsSync(logDir)) {
			mkdirSync(logDir, { recursive: true });
		}
	} catch (error: Error | unknown) {
		throw new LoggerError(
			`Failed to create log directory: ${logDir}`,
			error instanceof Error ? error : new Error(String(error))
		);
	}
}
