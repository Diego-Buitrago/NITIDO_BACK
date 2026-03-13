
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS admin;

CREATE TABLE admin.status (status_id SERIAL PRIMARY KEY, name VARCHAR(100));

INSERT INTO admin.status (name)
VALUES ('Activo'), ('Inactivo'), ('Eliminado');

CREATE TABLE auth.profiles (
    profile_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    fk_status_id INT DEFAULT 1,
    register_user INT,
    register_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_user INT,
    update_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE auth.profiles
ADD CONSTRAINT fk_profiles_status
FOREIGN KEY (fk_status_id) 
REFERENCES  admin.status(status_id);

INSERT INTO auth.profiles (name,  register_user, update_user)
VALUES ('Administrador', 1, 1);

CREATE TABLE auth.users (
    user_id SERIAL PRIMARY KEY,
    fk_profile_id INT NOT NULL DEFAULT 1,
    name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(100),
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100),
    fk_status_id INT DEFAULT 1,
    register_user INT,
    register_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_user INT,
    update_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE auth.users
ADD CONSTRAINT fk_users_status
FOREIGN KEY (fk_status_id) 
REFERENCES  admin.status(status_id);

ALTER TABLE auth.users
ADD CONSTRAINT fk_users_profiles
FOREIGN KEY (fk_profile_id) 
REFERENCES  auth.profiles(profile_id);

CREATE INDEX idx_users_username ON auth.users(username);

INSERT INTO auth.users (fk_profile_id, name, last_name, email, username, password, fk_status_id, register_user, update_user)
VALUES (1, 'Super', 'Admin', 'super@admin.com', 'superadmin', '$2b$10$i0JXinkVoKIhzJeHqGXLUOjdjVPPn7TzHNx9BiZfKfs.MC8jcwB4S', 1, 1, 1);

CREATE TABLE admin.customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    last_name VARCHAR(100),
    document_number VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(100),
    cell_phone VARCHAR(100),
    address VARCHAR(100),
    fk_status_id INT DEFAULT 1,
    register_user INT,
    register_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_user INT,
    update_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE admin.customers
ADD CONSTRAINT fk_customers_status
FOREIGN KEY (fk_status_id) 
REFERENCES  admin.status(status_id);

CREATE TABLE admin.types_payment (
    type_payment_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    fk_status_id INT DEFAULT 1,
    register_user INT,
    register_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_user INT,
    update_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE admin.types_payment
ADD CONSTRAINT fk_types_payment_status
FOREIGN KEY (fk_status_id) 
REFERENCES  admin.status(status_id);

INSERT INTO admin.types_payment (name, register_user, update_user)
VALUES ('EFECTIVO', 1, 1), ('TARJETA DE CRÉDITO', 1, 1), ('TARJETA DE DÉBITO', 1, 1), ('TRANSFERENCIA', 1, 1), ('NEQUI', 1, 1), ('DAVIPLATA', 1, 1);

CREATE TABLE admin.products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    description VARCHAR(100),
    price DECIMAL(10, 2) DEFAULT 0.00,
    stock INT DEFAULT 0,
    fk_status_id INT DEFAULT 1,
    register_user INT,
    register_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_user INT,
    update_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE admin.products
ADD CONSTRAINT fk_products_status
FOREIGN KEY (fk_status_id) 
REFERENCES  admin.status(status_id);

CREATE SCHEMA IF NOT EXISTS sales;

CREATE TABLE sales.receipt_states (
    rec_state_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    register_user INT,
    register_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_user INT,
    update_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sales.receipt_states (name, register_user, update_user)
VALUES ('PENDIENTE', 1, 1), ('PAGADA', 1, 1), ('CANCELADA', 1, 1);

CREATE TABLE sales.receipts (
    receipt_id SERIAL PRIMARY KEY,
    prefix VARCHAR(10) DEFAULT 'REC',
    number INT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    fk_customer_id INT,
    fk_type_payment_id INT,
    subtotal DECIMAL(10, 2) DEFAULT 0.00,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    tax DECIMAL(10, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) DEFAULT 0.00,
    observation VARCHAR(100),
    fk_rec_state_id INT DEFAULT 1,
    register_user INT,
    register_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_user INT,
    update_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sales.receipts
ADD CONSTRAINT fk_receipts_customers
FOREIGN KEY (fk_customer_id) 
REFERENCES  admin.customers(customer_id);

ALTER TABLE sales.receipts
ADD CONSTRAINT fk_receipts_types_payment
FOREIGN KEY (fk_type_payment_id) 
REFERENCES  admin.types_payment(type_payment_id);

ALTER TABLE sales.receipts
ADD CONSTRAINT fk_receipts_rec_states
FOREIGN KEY (fk_rec_state_id)
REFERENCES  sales.receipt_states(rec_state_id);

-- Secuencia para el consecutivo de recibos
CREATE SEQUENCE sales.receipt_number_seq START 1;

CREATE TABLE sales.receipt_details (
    rec_det_id SERIAL PRIMARY KEY,
    fk_receipt_id INT,
    fk_product_id INT,
    quantity INT,
    price DECIMAL(10, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) DEFAULT 0.00,
    fk_status_id INT DEFAULT 1,
    register_user INT,
    register_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_user INT,
    update_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sales.receipt_details
ADD CONSTRAINT fk_receipt_details_receipts
FOREIGN KEY (fk_receipt_id) 
REFERENCES  sales.receipts(receipt_id);

ALTER TABLE sales.receipt_details
ADD CONSTRAINT fk_receipt_details_products
FOREIGN KEY (fk_product_id) 
REFERENCES  admin.products(product_id);

ALTER TABLE sales.receipt_details
ADD CONSTRAINT fk_receipt_details_status
FOREIGN KEY (fk_status_id) 
REFERENCES  admin.status(status_id);
