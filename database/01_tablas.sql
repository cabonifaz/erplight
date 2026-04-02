-- sistema_erp.branches definition

CREATE TABLE `branches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `ruc` varchar(20) DEFAULT NULL,
  `razon_social` varchar(255) DEFAULT NULL,
  `status` int DEFAULT '1',
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.categorias definition

CREATE TABLE `categorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.clientes definition

CREATE TABLE `clientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_type_id` int NOT NULL,
  `doc_type_id` int NOT NULL,
  `document_number` varchar(20) NOT NULL,
  `razon_social` varchar(255) NOT NULL,
  `trade_name` varchar(255) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `paternal_surname` varchar(100) DEFAULT NULL,
  `maternal_surname` varchar(100) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `country` varchar(100) DEFAULT 'PERÚ',
  `department` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `district` varchar(100) DEFAULT NULL,
  `zip_code` varchar(20) DEFAULT NULL,
  `status` tinyint DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_number` (`document_number`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.inventory_movements definition

CREATE TABLE `inventory_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `user_id` int NOT NULL,
  `type` enum('INGRESO','SALIDA') NOT NULL,
  `concept` varchar(100) DEFAULT 'COMPRA',
  `description` text,
  `request_id` int DEFAULT NULL,
  `invoice_id` int DEFAULT NULL,
  `product_id` int NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_measure` varchar(10) DEFAULT 'UND',
  `document_path` text,
  `document_number` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.master_catalogs definition

CREATE TABLE `master_catalogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `category` varchar(50) NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` varchar(200) NOT NULL,
  `num_1` varchar(20) DEFAULT NULL,
  `status` int DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.products definition

CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `unit_measure` varchar(20) DEFAULT 'UND',
  `status` int DEFAULT '1',
  `description` text,
  `created_by` text,
  `created_at` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.providers definition

CREATE TABLE `providers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ruc` varchar(20) NOT NULL,
  `name` varchar(150) NOT NULL,
  `address` varchar(200) DEFAULT NULL,
  `estado` int DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.purchase_invoices definition

CREATE TABLE `purchase_invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL COMMENT 'ID de la solicitud de compra a la que pertenece',
  `provider_id` int DEFAULT NULL COMMENT 'ID del proveedor que emite la factura',
  `user_id` int NOT NULL COMMENT 'Usuario que registró el documento',
  `invoice_number` varchar(50) NOT NULL COMMENT 'Número de factura o comprobante (Ej: F001-00045)',
  `currency` varchar(3) DEFAULT 'PEN',
  `amount` decimal(10,2) NOT NULL COMMENT 'Monto total del comprobante',
  `invoice_path` varchar(255) DEFAULT NULL COMMENT 'Ruta del archivo PDF/Imagen subido',
  `status` varchar(20) DEFAULT 'REGISTRADO' COMMENT 'Estado de la factura (REGISTRADO, PAGADO, ANULADO)',
  `issue_date` date DEFAULT NULL COMMENT 'Fecha de emisión del comprobante',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `description` text,
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.users definition

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` varchar(50) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.product_batches definition

CREATE TABLE `product_batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `lote` varchar(50) NOT NULL,
  `quantity` decimal(10,2) NOT NULL DEFAULT '0.00',
  `expiration_date` date NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `product_batches_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_batches_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.product_stocks definition

CREATE TABLE `product_stocks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `product_id` int NOT NULL,
  `stock_current` decimal(10,2) DEFAULT '0.00',
  `min_stock` decimal(10,2) DEFAULT '5.00',
  `max_stock` decimal(10,2) DEFAULT '100.00',
  `reorder_point` decimal(10,2) DEFAULT '10.00',
  `last_update` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `description` text,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_stocks_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_stocks_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.purchase_payments definition

CREATE TABLE `purchase_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL COMMENT 'ID de la factura a la que pertenece este pago',
  `voucher_number` varchar(100) NOT NULL COMMENT 'Número de operación o referencia bancaria',
  `payment_proof_path` varchar(255) DEFAULT NULL COMMENT 'Ruta del archivo (JPG/PDF) del voucher',
  `payment_date` date NOT NULL COMMENT 'Fecha en que se realizó el depósito/transferencia',
  `status` varchar(20) DEFAULT 'PENDIENTE' COMMENT 'Estado: PENDIENTE, VALIDADO, RECHAZADO',
  `observation` text COMMENT 'Nota en caso de que contabilidad rechace el voucher',
  `user_id` int DEFAULT NULL COMMENT 'Usuario que registró el pago',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `fk_payment_invoice` (`invoice_id`),
  CONSTRAINT `fk_payment_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `purchase_invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.purchase_requests definition

CREATE TABLE `purchase_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `branch_id` int NOT NULL,
  `user_id` int NOT NULL,
  `status_id` int NOT NULL,
  `description` text NOT NULL,
  `estimated_total` decimal(10,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'PEN',
  `issue_date` date NOT NULL,
  `requester_name` varchar(100) DEFAULT NULL,
  `orden_compra_id` int DEFAULT NULL,
  `approval_comment` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `branch_id` (`branch_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `purchase_requests_ibfk_1` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`),
  CONSTRAINT `purchase_requests_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.user_branches definition

CREATE TABLE `user_branches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `branch_id` int NOT NULL,
  `is_main` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `branch_id` (`branch_id`),
  CONSTRAINT `user_branches_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_branches_ibfk_2` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.orden_compra definition

CREATE TABLE `orden_compra` (
  `id` int NOT NULL AUTO_INCREMENT,
  `solicitud_id` int NOT NULL,
  `comprador_ruc` varchar(20) DEFAULT NULL,
  `comprador_razon` varchar(255) DEFAULT NULL,
  `comprador_direccion` text,
  `solicitante` varchar(255) DEFAULT NULL,
  `proveedor_ruc` varchar(20) DEFAULT NULL,
  `proveedor_razon_social` varchar(150) DEFAULT NULL,
  `proveedor_direccion` varchar(200) DEFAULT NULL,
  `proveedor_contacto` varchar(150) DEFAULT NULL,
  `fecha_emision` date DEFAULT NULL,
  `fecha_recepcion_esperada` date DEFAULT NULL,
  `lugar_entrega` varchar(200) DEFAULT NULL,
  `condiciones_pago` varchar(200) DEFAULT NULL,
  `pago_en_cuotas` tinyint(1) DEFAULT '0',
  `condiciones_venta` varchar(200) DEFAULT NULL,
  `garantias` varchar(200) DEFAULT NULL,
  `incoterm` varchar(50) DEFAULT NULL,
  `incluye_instalacion` tinyint(1) DEFAULT '0',
  `moneda` varchar(10) DEFAULT 'PEN',
  `tipo_cambio` decimal(10,3) DEFAULT '3.800',
  `incluye_igv` tinyint(1) DEFAULT '0',
  `tiene_detraccion` tinyint(1) DEFAULT '0',
  `tipo_detraccion` varchar(20) DEFAULT NULL,
  `porcentaje_detraccion` decimal(5,2) DEFAULT '0.00',
  `monto_detraccion` decimal(10,2) DEFAULT '0.00',
  `numero_cuenta_operacion` varchar(50) DEFAULT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `estado` varchar(50) DEFAULT 'GENERADA',
  PRIMARY KEY (`id`),
  KEY `solicitud_id` (`solicitud_id`),
  CONSTRAINT `orden_compra_ibfk_1` FOREIGN KEY (`solicitud_id`) REFERENCES `purchase_requests` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.orden_compra_cuotas definition

CREATE TABLE `orden_compra_cuotas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orden_compra_id` int NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `porcentaje` decimal(5,2) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `orden_compra_id` (`orden_compra_id`),
  CONSTRAINT `orden_compra_cuotas_ibfk_1` FOREIGN KEY (`orden_compra_id`) REFERENCES `orden_compra` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.orden_compra_detalle definition

CREATE TABLE `orden_compra_detalle` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orden_compra_id` int NOT NULL,
  `codigo` varchar(50) DEFAULT NULL,
  `descripcion` varchar(255) NOT NULL,
  `cantidad` decimal(10,2) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `precio_total` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `orden_compra_id` (`orden_compra_id`),
  CONSTRAINT `orden_compra_detalle_ibfk_1` FOREIGN KEY (`orden_compra_id`) REFERENCES `orden_compra` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.purchase_quotations definition

CREATE TABLE `purchase_quotations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `is_selected` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `request_id` (`request_id`),
  CONSTRAINT `purchase_quotations_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `purchase_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- sistema_erp.purchase_receptions definition

CREATE TABLE `purchase_receptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `document_number` varchar(50) DEFAULT NULL,
  `product_id` int DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_measure` varchar(50) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_reception_request` (`request_id`),
  CONSTRAINT `fk_reception_request` FOREIGN KEY (`request_id`) REFERENCES `purchase_requests` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;