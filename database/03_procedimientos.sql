CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_actualizar_orden_compra`(
    IN p_id INT, IN p_c_ruc VARCHAR(20), IN p_c_razon VARCHAR(255), IN p_c_dir TEXT, IN p_solicitante VARCHAR(255),
    IN p_p_ruc VARCHAR(20), IN p_p_razon VARCHAR(255), IN p_p_dir TEXT, IN p_p_cont VARCHAR(255),
    IN p_f_ent DATE, IN p_l_ent TEXT, IN p_cond_p VARCHAR(255), IN p_cond_v TEXT,
    IN p_gar VARCHAR(255), IN p_inc VARCHAR(50), IN p_inst TINYINT, IN p_mon VARCHAR(10), IN p_tc DECIMAL(10,3), IN p_igv TINYINT,
    IN p_det TINYINT, IN p_t_det VARCHAR(50), IN p_p_det DECIMAL(5,2), IN p_m_det DECIMAL(10,2), IN p_cuenta VARCHAR(50),
    IN p_sub DECIMAL(10,2), IN p_tot DECIMAL(10,2)
)
BEGIN
    UPDATE orden_compra SET 
        comprador_ruc=p_c_ruc, comprador_razon=p_c_razon, comprador_direccion=p_c_dir, solicitante=p_solicitante,
        proveedor_ruc=p_p_ruc, proveedor_razon_social=p_p_razon, proveedor_direccion=p_p_dir, proveedor_contacto=p_p_cont,
        fecha_recepcion_esperada=p_f_ent, lugar_entrega=p_l_ent, condiciones_pago=p_cond_p, condiciones_venta=p_cond_v,
        garantias=p_gar, incoterm=p_inc, incluye_instalacion=p_inst, moneda=p_mon, tipo_cambio=p_tc, incluye_igv=p_igv,
        tiene_detraccion=p_det, tipo_detraccion=p_t_det, porcentaje_detraccion=p_p_det, monto_detraccion=p_m_det, numero_cuenta_operacion=p_cuenta,
        subtotal=p_sub, total=p_tot 
    WHERE id = p_id;

    DELETE FROM orden_compra_detalle WHERE orden_compra_id = p_id;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_actualizar_solicitud`(IN p_req_id INT, IN p_branch INT, IN p_desc TEXT, IN p_total DECIMAL(10,2), IN p_curr VARCHAR(10))
BEGIN
    DECLARE v_status VARCHAR(50);
    SELECT mc.code INTO v_status FROM purchase_requests pr INNER JOIN master_catalogs mc ON pr.status_id = mc.id WHERE pr.id = p_req_id;
    
    IF v_status != 'PENDIENTE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solicitud no editable';
    END IF;

    UPDATE purchase_requests SET branch_id = p_branch, description = p_desc, estimated_total = p_total, currency = p_curr, updated_at = NOW() WHERE id = p_req_id;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_aprobar_solicitud`(
    IN p_request_id INT,
    IN p_user_id INT,
    OUT p_success INT,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_status_id INT;
    SELECT id INTO v_status_id FROM master_catalogs WHERE code = 'APROBADO' LIMIT 1;
    
    UPDATE purchase_requests SET status_id = v_status_id, updated_at = NOW() WHERE id = p_request_id;
    
    SET p_success = 1;
    SET p_message = 'Solicitud aprobada exitosamente';
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_buscar_productos`(IN p_term VARCHAR(100))
BEGIN
    SELECT 
        id, 
        name, 
        code, 
        unit_measure 
    FROM products 
    WHERE status = 1 
      AND (name LIKE CONCAT('%', p_term, '%') OR code LIKE CONCAT('%', p_term, '%'))
    LIMIT 15;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_buscar_producto_codigo`(IN p_code VARCHAR(50))
BEGIN
    SELECT name, unit_measure FROM products WHERE code = p_code AND status = 1 LIMIT 1;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_buscar_proveedores`(IN p_term VARCHAR(100))
BEGIN
    SET @term = CONCAT('%', p_term, '%');
    SELECT id, ruc, name as razon_social, address as direccion FROM providers 
    WHERE (ruc LIKE @term OR name LIKE @term) AND estado = 1 LIMIT 5;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_buscar_usuario_login`(IN p_email VARCHAR(150))
BEGIN
    SELECT 
        id, 
        name, 
        email, 
        password, 
        role 
    FROM users 
    WHERE email = p_email 
    LIMIT 1;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_crear_empresa`(
    IN p_user_id INT, IN p_client_type_id INT, IN p_doc_type_id INT, IN p_doc_number VARCHAR(20),
    IN p_business_name VARCHAR(255), IN p_trade_name VARCHAR(255),
    IN p_email VARCHAR(150), IN p_phone VARCHAR(50), IN p_address TEXT,
    IN p_country VARCHAR(100), IN p_department VARCHAR(100), IN p_province VARCHAR(100), 
    IN p_district VARCHAR(100), IN p_zip VARCHAR(20)
)
BEGIN
    INSERT INTO clientes (
        created_by, client_type_id, doc_type_id, document_number, 
        razon_social, trade_name, email, phone, address,
        country, department, province, district, zip_code
    ) VALUES (
        p_user_id, p_client_type_id, p_doc_type_id, p_doc_number,
        p_business_name, p_trade_name, p_email, p_phone, p_address,
        p_country, p_department, p_province, p_district, p_zip
    );
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_crear_persona`(
    IN p_user_id INT, IN p_client_type_id INT, IN p_doc_type_id INT, IN p_doc_number VARCHAR(20),
    IN p_first_name VARCHAR(100), IN p_paternal VARCHAR(100), IN p_maternal VARCHAR(100),
    IN p_email VARCHAR(150), IN p_phone VARCHAR(50), IN p_address TEXT,
    IN p_country VARCHAR(100), IN p_department VARCHAR(100), IN p_province VARCHAR(100), 
    IN p_district VARCHAR(100), IN p_zip VARCHAR(20)
)
BEGIN
    INSERT INTO clientes (
        created_by, client_type_id, doc_type_id, document_number, 
        first_name, paternal_surname, maternal_surname, razon_social,
        email, phone, address, country, department, province, district, zip_code
    ) VALUES (
        p_user_id, p_client_type_id, p_doc_type_id, p_doc_number,
        p_first_name, p_paternal, p_maternal, CONCAT(p_first_name, ' ', p_paternal, ' ', p_maternal),
        p_email, p_phone, p_address, p_country, p_department, p_province, p_district, p_zip
    );
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_crear_producto`(
    IN p_name VARCHAR(255),
    IN p_description TEXT,
    IN p_unit_measure VARCHAR(50),
    IN p_user_id INT
)
BEGIN
    DECLARE v_next_id INT;
    DECLARE v_auto_code VARCHAR(20);

    -- Bloqueamos la tabla brevemente para calcular el ID sin duplicados
    SELECT IFNULL(MAX(id), 0) + 1 INTO v_next_id FROM products;
    
    -- Generamos el formato PROD-000001
    SET v_auto_code = CONCAT('PROD-', LPAD(v_next_id, 6, '0'));

    -- Insertamos el producto
    INSERT INTO products (
        name, 
        code, 
        description, 
        unit_measure, 
        status, 
        created_by, 
        created_at
    )
    VALUES (UPPER(p_name), v_auto_code, p_description, p_unit_measure, 1, p_user_id, NOW());

    -- Retornamos los datos generados para que Next.js los reciba
    SELECT LAST_INSERT_ID() AS id, v_auto_code AS code;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_crear_solicitud`(
    IN p_branch_id INT,
    IN p_user_id INT,
    IN p_issue_date DATE,
    IN p_description TEXT,
    IN p_estimated_total DECIMAL(10,2),
    IN p_currency VARCHAR(10),
    OUT p_new_id INT
)
BEGIN
    DECLARE v_status_id INT;
    SELECT id INTO v_status_id FROM master_catalogs WHERE code = 'PENDIENTE' LIMIT 1;
    
    INSERT INTO purchase_requests (branch_id, user_id, status_id, description, estimated_total, currency, issue_date)
    VALUES (p_branch_id, p_user_id, v_status_id, p_description, p_estimated_total, p_currency, p_issue_date);
    
    SET p_new_id = LAST_INSERT_ID();
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_editar_empresa`(
    IN p_id INT, IN p_user_id INT, 
    IN p_bname VARCHAR(255), IN p_tname VARCHAR(255),
    IN p_email VARCHAR(150), IN p_phone VARCHAR(50), IN p_address TEXT,
    IN p_country VARCHAR(100), IN p_dept VARCHAR(100), IN p_prov VARCHAR(100), 
    IN p_dist VARCHAR(100), IN p_zip VARCHAR(20)
)
BEGIN
    UPDATE clientes SET 
        razon_social = p_bname, trade_name = p_tname,
        email = p_email, phone = p_phone, address = p_address,
        country = p_country, department = p_dept, province = p_prov, 
        district = p_dist, zip_code = p_zip, updated_at = NOW()
    WHERE id = p_id;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_editar_persona`(
    IN p_id INT, IN p_user_id INT, 
    IN p_fname VARCHAR(100), IN p_paternal VARCHAR(100), IN p_maternal VARCHAR(100),
    IN p_email VARCHAR(150), IN p_phone VARCHAR(50), IN p_address TEXT,
    IN p_country VARCHAR(100), IN p_dept VARCHAR(100), IN p_prov VARCHAR(100), 
    IN p_dist VARCHAR(100), IN p_zip VARCHAR(20)
)
BEGIN
    UPDATE clientes SET 
        first_name = p_fname, paternal_surname = p_paternal, maternal_surname = p_maternal,
        razon_social = CONCAT(p_fname, ' ', p_paternal, ' ', p_maternal),
        email = p_email, phone = p_phone, address = p_address,
        country = p_country, department = p_dept, province = p_prov, 
        district = p_dist, zip_code = p_zip, updated_at = NOW()
    WHERE id = p_id;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_eliminar_cliente`(IN p_id INT, IN p_user_id INT)
BEGIN
    UPDATE clientes 
    SET status = 0, deleted_at = NOW() 
    WHERE id = p_id;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_eliminar_cotizaciones`(IN p_ids VARCHAR(255))
BEGIN
    SET @s = CONCAT('DELETE FROM purchase_quotations WHERE FIND_IN_SET(id, "', p_ids, '") > 0');
    PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_eliminar_orden_compra`(IN p_orden_id INT)
BEGIN
    DELETE FROM orden_compra_detalle WHERE orden_compra_id = p_orden_id;
    DELETE FROM orden_compra WHERE id = p_orden_id;
    UPDATE purchase_requests SET orden_compra_id = NULL WHERE orden_compra_id = p_orden_id;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_filtrar_inventario`(
    IN p_branch_id INT,
    IN p_search_term VARCHAR(100),
    IN p_min_stock DECIMAL(10,2),
    IN p_max_stock DECIMAL(10,2),
    IN p_updated_from DATE
)
BEGIN
    SELECT 
        ps.id,
        ps.product_id,
        p.code AS product_code,
        p.name AS product_name,
        p.unit_measure,
        ps.branch_id,
        b.name AS branch_name,
        ps.stock_current,
        ps.last_update
    FROM product_stocks ps
    INNER JOIN products p ON ps.product_id = p.id
    INNER JOIN branches b ON ps.branch_id = b.id
    WHERE p.status = 1
      -- Filtro de Sucursal (Ignora si es NULL o 0)
      AND (p_branch_id IS NULL OR p_branch_id = 0 OR ps.branch_id = p_branch_id)
      
      -- Filtro de Búsqueda (Texto en el nombre o código)
      AND (p_search_term IS NULL OR p_search_term = '' OR p.name LIKE CONCAT('%', p_search_term, '%') OR p.code LIKE CONCAT('%', p_search_term, '%'))
      
      -- Filtros de Rango de Stock
      AND (p_min_stock IS NULL OR ps.stock_current >= p_min_stock)
      AND (p_max_stock IS NULL OR ps.stock_current <= p_max_stock)
      
      -- Filtro de Fecha de Actualización
      AND (p_updated_from IS NULL OR DATE(ps.last_update) >= p_updated_from)
      
    ORDER BY b.name ASC, p.name ASC;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_finalizar_compra_manual`(
    IN p_request_id INT
)
BEGIN
    DECLARE v_status_id INT;

    -- Buscamos el ID para el estado 'COMPRA REALIZADA'
    -- Asegúrate de que el código sea exactamente 'COMPRA REALIZADA'
    SELECT id INTO v_status_id 
    FROM master_catalogs 
    WHERE code = 'COMPRA REALIZADA' 
      AND category = 'PURCHASE_STATUS' 
    LIMIT 1;

    -- Si no existe el estado en la tabla de catálogos, lanzamos un error
    IF v_status_id IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Error: No se encontró el código COMPRA REALIZADA en master_catalogs';
    ELSE
        -- Si todo está bien, actualizamos la solicitud
        UPDATE purchase_requests 
        SET status_id = v_status_id, 
            updated_at = NOW() 
        WHERE id = p_request_id;
    END IF;

END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_listar_catalogo`(IN p_category VARCHAR(50))
BEGIN
    SELECT 
        id, 
        code, 
        description, 
        num_1  -- <--- Ahora sí encontrará esta columna
    FROM master_catalogs 
    WHERE category = p_category 
      AND status = 1 
    ORDER BY description ASC;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_listar_clientes`()
BEGIN
    -- Seleccionamos los campos necesarios para la tabla de la interfaz
    SELECT 
        id,
        document_number,
        razon_social,
        email,
        phone,
        address,
        status,
        created_at
    FROM clientes
    WHERE status = 1
    ORDER BY razon_social ASC;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_listar_productos`()
BEGIN
    SELECT * FROM products 
    WHERE status = 1 
    ORDER BY created_at DESC;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_listar_solicitudes`(
    IN p_user_id INT,
    IN p_branch_id INT,
    IN p_code VARCHAR(50),
    IN p_desc VARCHAR(255),
    IN p_status_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    SELECT 
        pr.*,
        b.name as branch_name,
        mc.description as status_name,
        mc.code as status_code,
        u.name as requester_user_name
    FROM purchase_requests pr
    LEFT JOIN branches b ON pr.branch_id = b.id
    LEFT JOIN master_catalogs mc ON pr.status_id = mc.id
    LEFT JOIN users u ON pr.user_id = u.id
    WHERE 1=1
      -- Filtro por sucursal (Si es nulo, trae todas)
      AND (p_branch_id IS NULL OR pr.branch_id = p_branch_id)
      
      -- Filtro por descripción (Búsqueda parcial)
      AND (p_desc IS NULL OR p_desc = '' OR pr.description LIKE CONCAT('%', p_desc, '%'))
      
      -- Filtro por estado
      AND (p_status_id IS NULL OR pr.status_id = p_status_id)
      
      -- Filtro por rango de fechas (usando la fecha de emisión)
      AND (p_start_date IS NULL OR pr.issue_date >= p_start_date)
      AND (p_end_date IS NULL OR pr.issue_date <= p_end_date)
      
      -- Filtro por código (Busca si escriben "5" o "REQ-000005")
      AND (p_code IS NULL OR p_code = '' 
           OR pr.id = p_code 
           OR CONCAT('REQ-', LPAD(pr.id, 6, '0')) LIKE CONCAT('%', p_code, '%')
      )
    ORDER BY pr.created_at DESC;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_obtener_cliente`(IN p_id INT)
BEGIN
    SELECT c.*, mc.code as client_code 
    FROM clientes c
    INNER JOIN master_catalogs mc ON c.client_type_id = mc.id
    WHERE c.id = p_id;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_obtener_datos_emisor_oc`(IN p_request_id INT)
BEGIN
    SELECT 
        b.ruc AS mi_ruc,
        b.razon_social AS mi_razon_social,
        u.name AS solicitante_nombre,
        b.name AS sede_nombre
    FROM purchase_requests pr
    INNER JOIN branches b ON pr.branch_id = b.id
    INNER JOIN users u ON pr.user_id = u.id
    WHERE pr.id = p_request_id;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_obtener_detalle_solicitud`(IN p_request_id INT)
BEGIN
    SELECT 
        pr.*, 
        b.name AS branch_name, 
        u.name AS requester_name, 
        u.name AS user_name,
        mc.code AS status_code, 
        mc.description AS status_desc
    FROM purchase_requests pr
    LEFT JOIN branches b ON pr.branch_id = b.id
    LEFT JOIN users u ON pr.user_id = u.id
    LEFT JOIN master_catalogs mc ON pr.status_id = mc.id
    WHERE pr.id = p_request_id;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_obtener_historial_producto`(
    IN p_branch_id INT,
    IN p_product_id INT,
    IN p_page INT,
    IN p_limit INT,
    IN p_start_date VARCHAR(20),
    IN p_end_date VARCHAR(20)
)
BEGIN
    DECLARE v_offset INT;
    SET v_offset = (p_page - 1) * p_limit;

    -- 1. Obtener los datos con alias para el frontend
    SELECT 
        im.id,
        im.created_at,
        im.quantity,
        im.unit_measure,
        im.type,
        im.concept,
        im.document_number as guide_number,
        im.document_path as guide_path,
        u.name as user_name
    FROM inventory_movements im
    LEFT JOIN users u ON im.user_id = u.id
    WHERE im.branch_id = p_branch_id 
      AND im.product_id = p_product_id
      AND (p_start_date IS NULL OR im.created_at >= CONCAT(p_start_date, ' 00:00:00'))
      AND (p_end_date IS NULL OR im.created_at <= CONCAT(p_end_date, ' 23:59:59'))
    ORDER BY im.created_at DESC
    LIMIT p_limit OFFSET v_offset;

    -- 2. Obtener el total para la paginación
    SELECT COUNT(*) as total 
    FROM inventory_movements im 
    WHERE im.branch_id = p_branch_id 
      AND im.product_id = p_product_id
      AND (p_start_date IS NULL OR im.created_at >= CONCAT(p_start_date, ' 00:00:00'))
      AND (p_end_date IS NULL OR im.created_at <= CONCAT(p_end_date, ' 23:59:59'));
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_obtener_ordenes_compra`(IN p_req_id INT)
BEGIN
    SELECT * FROM orden_compra WHERE solicitud_id = p_req_id ORDER BY id ASC;
    SELECT * FROM orden_compra_detalle WHERE orden_compra_id IN (SELECT id FROM orden_compra WHERE solicitud_id = p_req_id);
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_obtener_recepciones_solicitud`(IN p_request_id INT)
BEGIN
    SELECT 
        r.id,
        r.document_number,
        r.product_name,
        r.quantity,
        r.unit_measure,
        COALESCE(u.name, 'Sistema') AS user_name,
        r.created_at,
        r.file_path
    FROM purchase_receptions r
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.request_id = p_request_id
    ORDER BY r.created_at DESC;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_obtener_rutas_cotizaciones`(IN p_ids VARCHAR(255))
BEGIN
    SET @s = CONCAT('SELECT file_path FROM purchase_quotations WHERE FIND_IN_SET(id, "', p_ids, '") > 0');
    PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_procesar_recepcion_item`(
    IN p_request_id INT,
    IN p_user_id INT,
    IN p_product_id INT,
    IN p_product_name VARCHAR(255),
    IN p_quantity DECIMAL(10,2),
    IN p_unit_measure VARCHAR(50),
    IN p_file_path VARCHAR(255),
    IN p_guide_number VARCHAR(50)
)
BEGIN
    DECLARE v_branch_id INT;

    -- 1. GUARDAR LA TARJETA AZUL (Documento)
    INSERT INTO purchase_receptions (request_id, document_number, product_id, product_name, quantity, unit_measure, file_path, created_by)
    VALUES (p_request_id, p_guide_number, p_product_id, p_product_name, p_quantity, p_unit_measure, p_file_path, p_user_id);

    -- 2. MARCAR SOLICITUD COMO COMPLETADA
    UPDATE purchase_requests SET status_id = 4 WHERE id = p_request_id;

    -- 3. CONEXION CON INVENTARIO
    IF p_product_id IS NOT NULL THEN
        
        -- Obtener a que sucursal va esta compra
        SELECT branch_id INTO v_branch_id FROM purchase_requests WHERE id = p_request_id LIMIT 1;

        -- A. Registrar en el Historial de Movimientos
        INSERT INTO inventory_movements (branch_id, user_id, type, concept, description, request_id, product_id, quantity)
        VALUES (v_branch_id, p_user_id, 1, 'COMPRA', CONCAT('Ingreso Guia: ', p_guide_number), p_request_id, p_product_id, p_quantity);

        -- B. Sumar el Stock en el Tablero Principal (AQUI ESTABA EL ERROR: stock_current)
        IF EXISTS (SELECT 1 FROM product_stocks WHERE product_id = p_product_id AND branch_id = v_branch_id) THEN
            -- Si ya existia, sumamos
            UPDATE product_stocks 
            SET stock_current = stock_current + p_quantity 
            WHERE product_id = p_product_id AND branch_id = v_branch_id;
        ELSE
            -- Si es nuevo en esta sucursal, lo insertamos
            INSERT INTO product_stocks (product_id, branch_id, stock_current) 
            VALUES (p_product_id, v_branch_id, p_quantity);
        END IF;
        
    END IF;

END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_registrar_ajuste_inventario`(
    IN p_branch_id INT,
    IN p_user_id INT,
    IN p_type ENUM('INGRESO', 'SALIDA'),
    IN p_product_id INT,
    IN p_quantity DECIMAL(10,2),
    IN p_reason TEXT
)
BEGIN
    DECLARE v_uom VARCHAR(20);
    DECLARE v_current_stock DECIMAL(10,2) DEFAULT 0;
    DECLARE v_stock_id INT;

    -- Iniciar transacción
    START TRANSACTION;

    -- 1. Obtener Unidad de Medida
    SELECT unit_measure INTO v_uom FROM products WHERE id = p_product_id;

    -- 2. Registrar el Movimiento
    INSERT INTO inventory_movements 
    (branch_id, user_id, type, concept, product_id, quantity, unit_measure, document_number, created_at)
    VALUES (p_branch_id, p_user_id, p_type, 'AJUSTE', p_product_id, p_quantity, v_uom, p_reason, NOW());

    -- 3. Gestionar el Stock
    SELECT id, stock_current INTO v_stock_id, v_current_stock 
    FROM product_stocks 
    WHERE branch_id = p_branch_id AND product_id = p_product_id;

    IF v_stock_id IS NOT NULL THEN
        -- Validar si es salida y hay suficiente stock
        IF p_type = 'SALIDA' AND v_current_stock < p_quantity THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock insuficiente para realizar el ajuste.';
        END IF;

        -- Actualizar
        UPDATE product_stocks 
        SET stock_current = IF(p_type = 'INGRESO', stock_current + p_quantity, stock_current - p_quantity),
            last_update = NOW()
        WHERE id = v_stock_id;
    ELSE
        -- Si no hay registro de stock y es salida, error
        IF p_type = 'SALIDA' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No hay stock registrado para descontar en esta sucursal.';
        END IF;

        -- Crear primer registro de stock
        INSERT INTO product_stocks (branch_id, product_id, stock_current, last_update)
        VALUES (p_branch_id, p_product_id, p_quantity, NOW());
    END IF;

    COMMIT;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_registrar_factura_compra`(IN p_req_id INT, IN p_user_id INT, IN p_inv_num VARCHAR(50), IN p_amount DECIMAL(10,2), IN p_path VARCHAR(255), IN p_prov_id INT)
BEGIN
    INSERT INTO purchase_invoices (request_id, user_id, invoice_number, amount, invoice_path, provider_id, status) 
    VALUES (p_req_id, p_user_id, p_inv_num, p_amount, p_path, p_prov_id, 'PENDIENTE');
    SELECT LAST_INSERT_ID() AS id;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_registrar_pago_compra`(IN p_inv_id INT, IN p_voucher VARCHAR(50), IN p_path VARCHAR(255), IN p_date DATE)
BEGIN
    DECLARE v_exist INT;
    SELECT id INTO v_exist FROM purchase_payments WHERE voucher_number = p_voucher AND invoice_id != p_inv_id LIMIT 1;
    IF v_exist IS NOT NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El N° de Operación ya fue utilizado en otra factura.';
    END IF;
    INSERT INTO purchase_payments (invoice_id, voucher_number, payment_proof_path, payment_date, status) VALUES (p_inv_id, p_voucher, p_path, p_date, 'PENDIENTE');
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_registrar_proveedor`(IN p_ruc VARCHAR(20), IN p_name VARCHAR(255), IN p_address TEXT)
BEGIN
    DECLARE v_id INT;
    SELECT id INTO v_id FROM providers WHERE ruc = p_ruc LIMIT 1;
    IF v_id IS NULL THEN
        INSERT INTO providers (ruc, name, address) VALUES (p_ruc, p_name, p_address);
        SET v_id = LAST_INSERT_ID();
    END IF;
    SELECT v_id AS id;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_validar_documento_compra`(
    IN p_type VARCHAR(50),
    IN p_id INT,
    IN p_user_id INT,
    IN p_status VARCHAR(50),
    IN p_observation TEXT
)
BEGIN
    IF p_type = 'INVOICE' THEN
        UPDATE purchase_invoices SET status = p_status WHERE id = p_id;
    ELSEIF p_type = 'VOUCHER' THEN
        UPDATE purchase_payments SET status = p_status WHERE id = p_id;
    END IF;
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_validar_expediente_compra`(
    IN p_request_id INT,
    IN p_user_id INT
)
BEGIN
    -- Actualizamos el estado de la solicitud al ID final (Asumiendo que 9 es "EXPEDIENTE CERRADO" o "VALIDADA")
    -- Si tu estado de Validado tiene otro ID en la tabla de estados, cambialo aqui (ej. 5 o 6)
    UPDATE purchase_requests 
    SET status_id = 9 
    WHERE id = p_request_id;

    -- Opcional: Podriamos registrar en una tabla de auditoria que el usuario p_user_id cerro este expediente.
END;

CREATE DEFINER=`dev_admin`@`%` PROCEDURE `sistema_erp`.`sp_validar_login`(
    IN p_email VARCHAR(150)
)
BEGIN
    SELECT 
        id, 
        name, 
        email, 
        password, 
        role 
    FROM users 
    WHERE email = p_email 
    LIMIT 1;
END;