declare module "winston-logstash" {
	import { transports, type Logform } from "winston";

	// Опции для Logstash транспорта
	interface LogstashTransportOptions {
		host: string;
		port: number;
		protocol?: "tcp" | "udp";
		json?: boolean;
		node_name?: string;
		level?: string;
		format?: Logform.Format;
	}

	// Класс транспорта для Logstash
	class LogstashTransport extends transports.Stream {
		constructor(options: LogstashTransportOptions);
	}

	export default LogstashTransport;
}
