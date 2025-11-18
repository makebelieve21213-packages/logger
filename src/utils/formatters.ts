import { colors } from "src/utils/constants";
import { format, type Logform } from "winston";

// Форматтер для консольного вывода с цветами
export const consoleFormat: Logform.Format = format.printf((info): string => {
	const { level, message, context, timestamp, service } = info as {
		level: string;
		message: string;
		context?: string;
		timestamp: string;
		service: string;
	};
	const color = colors[level] || colors.reset;
	const contextStr = context ? `[${context}]` : "";

	return `${color}[${service}] ${timestamp} [${level.toUpperCase()}] ${contextStr} ${message}${colors.reset}`;
});

// Форматтер для файлового вывода (JSON)
export const fileFormat: Logform.Format = format.printf((info): string => {
	const { level, message, context, timestamp, service, ...meta } = info as {
		level: string;
		message: string;
		context?: string;
		timestamp: string;
		service: string;
		[key: string]: unknown;
	};
	return JSON.stringify({
		timestamp,
		level,
		service,
		context: context || "Application",
		message,
		...meta,
	});
});
