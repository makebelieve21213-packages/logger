import type { LoggerService as NestLoggerService } from "@nestjs/common";

// Интерфейс для нашего логгера, расширяющий NestJS LoggerService
export default interface Logger extends NestLoggerService {
	log(message: string, context?: string): void;
	error(message: string, trace?: string, context?: string): void;
	warn(message: string, context?: string): void;
	debug(message: string, context?: string): void;
	verbose(message: string, context?: string): void;
	setContext(context: string): void;
}
