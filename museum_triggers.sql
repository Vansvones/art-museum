DELIMITER $$
--======================================================================
-- Prevent an exhibition's end date from being before its start date.
--======================================================================
DROP TRIGGER IF EXISTS check_exhibition_dates$$
CREATE TRIGGER check_exhibition_dates
BEFORE INSERT ON EXHIBITION
FOR EACH ROW
BEGIN
    IF NEW.StartDate IS NOT NULL
       AND NEW.EndDate IS NOT NULL
       AND NEW.EndDate < NEW.StartDate THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Exhibition end date cannot be before start date';
    END IF;
END$$


-- Prevent an exhibition's end date from being before its start date when updated.
DROP TRIGGER IF EXISTS check_exhibition_dates_update$$
CREATE TRIGGER check_exhibition_dates_update
BEFORE UPDATE ON EXHIBITION
FOR EACH ROW
BEGIN
    IF NEW.StartDate IS NOT NULL
       AND NEW.EndDate IS NOT NULL
       AND NEW.EndDate < NEW.StartDate THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Exhibition end date cannot be before start date';
    END IF;
END$$


-- Prevent a membership's end date from being before its start date.
DROP TRIGGER IF EXISTS check_membership_dates$$
CREATE TRIGGER check_membership_dates
BEFORE INSERT ON MEMBERSHIP
FOR EACH ROW
BEGIN
    IF NEW.EndDate IS NOT NULL
       AND NEW.EndDate < NEW.StartDate THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Membership end date cannot be before start date';
    END IF;
END$$


-- Prevent a membership from having a negative price.
DROP TRIGGER IF EXISTS check_membership_price$$
CREATE TRIGGER check_membership_price
BEFORE INSERT ON MEMBERSHIP
FOR EACH ROW
BEGIN
    IF NEW.Price IS NOT NULL AND NEW.Price < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Membership price cannot be negative';
    END IF;
END$$


-- Prevent a membership's end date from being before its start date when updated.
DROP TRIGGER IF EXISTS check_membership_dates_update$$
CREATE TRIGGER check_membership_dates_update
BEFORE UPDATE ON MEMBERSHIP
FOR EACH ROW
BEGIN
    IF NEW.EndDate IS NOT NULL
       AND NEW.EndDate < NEW.StartDate THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Membership end date cannot be before start date';
    END IF;
END$$


-- Prevent a membership from having a negative price when updated.
DROP TRIGGER IF EXISTS check_membership_price_update$$
CREATE TRIGGER check_membership_price_update
BEFORE UPDATE ON MEMBERSHIP
FOR EACH ROW
BEGIN
    IF NEW.Price IS NOT NULL AND NEW.Price < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Membership price cannot be negative';
    END IF;
END$$


-- Prevent a parking lot's capacity from being reduced below its current number of assigned passes.
DROP TRIGGER IF EXISTS check_parking_lot_capacity_update$$
CREATE TRIGGER check_parking_lot_capacity_update
BEFORE UPDATE ON PARKING_LOT
FOR EACH ROW
BEGIN
    DECLARE current_count INT;

    SELECT COUNT(*)
    INTO current_count
    FROM PARKING_PASS
    WHERE ParkingLotID = OLD.ParkingLotID;

    IF NEW.Capacity < current_count THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Parking lot capacity cannot be less than the number of assigned parking passes';
    END IF;
END$$


-- Prevent new parking passes from exceeding a parking lot's capacity.
DROP TRIGGER IF EXISTS PARKING_FULL$$
CREATE TRIGGER PARKING_FULL
BEFORE INSERT ON PARKING_PASS
FOR EACH ROW
BEGIN
    DECLARE current_capacity INT;
    DECLARE current_count INT;

    SELECT Capacity INTO current_capacity
    FROM PARKING_LOT
    WHERE PARKING_LOT.ParkingLotID = NEW.ParkingLotID;

    SELECT COUNT(*) INTO current_count
    FROM PARKING_PASS
    WHERE PARKING_PASS.ParkingLotID = NEW.ParkingLotID;

    IF current_count >= current_capacity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insertion Rejected: Lot Capacity is Reached';
    END IF;
END$$


-- Prevent parking pass updates from exceeding the destination parking lot's capacity.
DROP TRIGGER IF EXISTS parking_full_update$$
CREATE TRIGGER parking_full_update
BEFORE UPDATE ON PARKING_PASS
FOR EACH ROW
BEGIN
    DECLARE current_capacity INT;
    DECLARE current_count INT;

    SELECT Capacity INTO current_capacity
    FROM PARKING_LOT
    WHERE ParkingLotID = NEW.ParkingLotID;

    SELECT COUNT(*) INTO current_count
    FROM PARKING_PASS
    WHERE ParkingLotID = NEW.ParkingLotID
      AND ParkingPassID <> OLD.ParkingPassID;

    IF current_count >= current_capacity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insertion Rejected: Lot Capacity is Reached';
    END IF;
END$$


-- Prevent tickets from having a negative price when inserted.
DROP TRIGGER IF EXISTS check_ticket_price$$
CREATE TRIGGER check_ticket_price
BEFORE INSERT ON TICKET
FOR EACH ROW
BEGIN
    IF NEW.Price < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Ticket price cannot be negative';
    END IF;
END$$


-- Prevent a ticket's visit date from being after the associated exhibition's end date.
DROP TRIGGER IF EXISTS VERIFY_EXHIBITION_INSERT$$
CREATE TRIGGER VERIFY_EXHIBITION_INSERT
BEFORE INSERT ON TICKET
FOR EACH ROW
BEGIN
    DECLARE exhibition_end_date DATE;

    IF NEW.ExhibitionID IS NOT NULL THEN
        SELECT EndDate INTO exhibition_end_date
        FROM EXHIBITION
        WHERE EXHIBITION.ExhibitionID = NEW.ExhibitionID;

        IF exhibition_end_date IS NOT NULL
           AND NEW.VisitDate > exhibition_end_date THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insertion Rejected: Visit date is past Exhibition End Date';
        END IF;
    END IF;
END$$


-- Limit each exhibition to a maximum of 50 tickets per visit date when inserted.
DROP TRIGGER IF EXISTS trg_exhibition_daily_capacity$$
CREATE TRIGGER trg_exhibition_daily_capacity
BEFORE INSERT ON TICKET
FOR EACH ROW
BEGIN
    DECLARE visitor_count INT;

    SELECT COUNT(*)
    INTO visitor_count
    FROM TICKET
    WHERE ExhibitionID = NEW.ExhibitionID
      AND VisitDate = NEW.VisitDate;

    IF visitor_count >= 50 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Maximum daily capacity of 50 visitors reached for this exhibition';
    END IF;
END$$


-- Prevent a ticket's visit date from being before its purchase date.
DROP TRIGGER IF EXISTS check_ticket_visit_after_purchase$$
CREATE TRIGGER check_ticket_visit_after_purchase
BEFORE INSERT ON TICKET
FOR EACH ROW
BEGIN
    IF NEW.VisitDate IS NOT NULL
       AND NEW.PurchaseDate IS NOT NULL
       AND NEW.VisitDate < NEW.PurchaseDate THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Visit date cannot be before purchase date';
    END IF;
END$$


-- Prevent an updated ticket's visit date from being after the associated exhibition's end date.
DROP TRIGGER IF EXISTS VERIFY_EXHIBITION_UPDATE$$
CREATE TRIGGER VERIFY_EXHIBITION_UPDATE
BEFORE UPDATE ON TICKET
FOR EACH ROW
BEGIN
    DECLARE exhibition_end_date DATE;

    IF NEW.ExhibitionID IS NOT NULL THEN
        SELECT EndDate INTO exhibition_end_date
        FROM EXHIBITION
        WHERE EXHIBITION.ExhibitionID = NEW.ExhibitionID;

        IF exhibition_end_date IS NOT NULL
           AND NEW.VisitDate > exhibition_end_date THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insertion Rejected: Visit date is past Exhibition End Date';
        END IF;
    END IF;
END$$


-- Prevent an updated ticket from having a negative price.
DROP TRIGGER IF EXISTS check_ticket_price_update$$
CREATE TRIGGER check_ticket_price_update
BEFORE UPDATE ON TICKET
FOR EACH ROW
BEGIN
    IF NEW.Price < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Ticket price cannot be negative';
    END IF;
END$$


-- Prevent an updated ticket's visit date from being before its purchase date.
DROP TRIGGER IF EXISTS check_ticket_visit_after_purchase_update$$
CREATE TRIGGER check_ticket_visit_after_purchase_update
BEFORE UPDATE ON TICKET
FOR EACH ROW
BEGIN
    IF NEW.VisitDate IS NOT NULL
       AND NEW.PurchaseDate IS NOT NULL
       AND NEW.VisitDate < NEW.PurchaseDate THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Visit date cannot be before purchase date';
    END IF;
END$$

--==============================================================================================
-- Limit each exhibition to a maximum of 50 tickets per visit date when a ticket is updated.
--==============================================================================================
DROP TRIGGER IF EXISTS trg_exhibition_daily_capacity_update$$
CREATE TRIGGER trg_exhibition_daily_capacity_update
BEFORE UPDATE ON TICKET
FOR EACH ROW
BEGIN
    DECLARE visitor_count INT;

    IF NEW.ExhibitionID IS NOT NULL
       AND NEW.VisitDate IS NOT NULL THEN

        SELECT COUNT(*)
        INTO visitor_count
        FROM TICKET
        WHERE ExhibitionID = NEW.ExhibitionID
          AND VisitDate = NEW.VisitDate
          AND TicketID <> OLD.TicketID;

        IF visitor_count >= 50 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Maximum daily capacity of 50 visitors reached for this exhibition';
        END IF;

    END IF;
END$$

DELIMITER ;
