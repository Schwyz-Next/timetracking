CREATE TABLE `odooConfigurations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`odooUrl` varchar(255) NOT NULL,
	`apiKey` varchar(255) NOT NULL,
	`database` varchar(100) NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`lastTestedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `odooConfigurations_id` PRIMARY KEY(`id`),
	CONSTRAINT `odooConfigurations_userId_unique` UNIQUE(`userId`)
);
