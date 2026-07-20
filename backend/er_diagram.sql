-- Central Authentication Table
CREATE TABLE User (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    email VARCHAR(64) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(15) UNIQUE NOT NULL, -- Length 15 perfectly fits '+919876543210' or '+91-9876543210'
    role ENUM('ADMIN', 'CUSTOMER', 'DRIVER', 'RECYCLING_COMPANY') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Extension table for Drivers
CREATE TABLE Driver (
    driver_id INT PRIMARY KEY,
    vehicle_type VARCHAR(32),
    vehicle_registration_number VARCHAR(16) NOT NULL,
    max_capacity_kg DECIMAL(10, 2),
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (driver_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Extension table for Recycling Companies
CREATE TABLE Company (
    company_id INT PRIMARY KEY,
    certification_id VARCHAR(100),
    address TEXT NOT NULL,
    city VARCHAR(32),
    state VARCHAR(32),
    postal_code VARCHAR(8) NOT NULL,
    FOREIGN KEY (company_id) REFERENCES Users(id) ON DELETE CASCADE
);


-- Extension table for Customers
CREATE TABLE Customer (
    customer_id INT PRIMARY KEY,
    address TEXT NOT NULL,
    city VARCHAR(32),
    state VARCHAR(32),
    postal_code VARCHAR(8) NOT NULL,
    -- residential_type ENUM('HOUSE', 'APARTMENT', 'COMMERCIAL', 'OTHER') DEFAULT 'HOUSE',
    -- date_of_birth DATE,
    -- gender ENUM('MALE', 'FEMALE', 'OTHER'),
    FOREIGN KEY (customer_id) REFERENCES Users(id) ON DELETE CASCADE
);


-- Table connecting Customers and Drivers
CREATE TABLE pickup_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    driver_id INT, -- Nullable until a driver is assigned
    status ENUM('PENDING', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
    pickup_address TEXT NOT NULL,
    latitude DECIMAL(3, 6),
    longitude DECIMAL(3, 6),
    scheduled_date DATETIME NOT NULL,
    completed_date DATETIME,
    total_estimated_weight_kg DECIMAL(10, 2),
    total_estimated_price DECIMAL(10, 2),
    notes TEXT,
    FOREIGN KEY (customer_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES Users(id) ON DELETE SET NULL
);

-- Stores individual items belonging to a pickup request
CREATE TABLE e_waste_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    item_name VARCHAR(64),
    item_category VARCHAR(32) NOT NULL,
    width_cm DECIMAL(5, 2),
    length_cm DECIMAL(5, 2),
    height_cm DECIMAL(5, 2),
    estimated_weight_kg DECIMAL(5, 2),
    estimated_price DECIMAL(10, 2),
    FOREIGN KEY (request_id) REFERENCES pickup_requests(request_id) ON DELETE CASCADE
);