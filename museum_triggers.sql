USE defaultdb;

DELIMITER $$

--========================================
-- 1. Circular supervisor relationships
--========================================
DROP TRIGGER IF EXISTS trg_prevent_supervisor_cycle_insert$$

CREATE TRIGGER trg_prevent_supervisor_cycle_insert
BEFORE INSERT ON EMPLOYEE
FOR EACH ROW
BEGIN
    IF NEW.SupervisorID = NEW.EmployeeID THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Employee cannot supervise themselves';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_prevent_supervisor_cycle$$

CREATE TRIGGER trg_prevent_supervisor_cycle
BEFORE UPDATE ON EMPLOYEE
FOR EACH ROW
BEGIN
    DECLARE current_supervisor INT;

    IF NEW.SupervisorID IS NOT NULL THEN

        IF NEW.SupervisorID = NEW.EmployeeID THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Employee cannot supervise themselves';
        END IF;

        SET current_supervisor = NEW.SupervisorID;

        WHILE current_supervisor IS NOT NULL DO

            IF current_supervisor = NEW.EmployeeID THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Circular supervisor relationship detected';
            END IF;

            SELECT SupervisorID
            INTO current_supervisor
            FROM EMPLOYEE
            WHERE EmployeeID = current_supervisor;

        END WHILE;

    END IF;
END$$

--=======================================
-- 2. Artwork exhibition date overlaps
--=======================================
DROP TRIGGER IF EXISTS trg_artwork_exhibition_overlap_insert$$

CREATE TRIGGER trg_artwork_exhibition_overlap_insert
BEFORE INSERT ON EXHIBITION_ARTWORK
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1
        FROM EXHIBITION_ARTWORK EA
        JOIN EXHIBITION E
            ON EA.ExhibitionID = E.ExhibitionID
        JOIN EXHIBITION NEW_E
            ON NEW_E.ExhibitionID = NEW.ExhibitionID
        WHERE EA.ArtworkID = NEW.ArtworkID
          AND EA.ExhibitionID <> NEW.ExhibitionID
          AND COALESCE(NEW_E.StartDate, '1000-01-01')
              <= COALESCE(E.EndDate, '9999-12-31')
          AND COALESCE(E.StartDate, '1000-01-01')
              <= COALESCE(NEW_E.EndDate, '9999-12-31')
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Artwork is already assigned to another exhibition with overlapping dates';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_artwork_exhibition_overlap_update$$

CREATE TRIGGER trg_artwork_exhibition_overlap_update
BEFORE UPDATE ON EXHIBITION_ARTWORK
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1
        FROM EXHIBITION_ARTWORK EA
        JOIN EXHIBITION E
            ON EA.ExhibitionID = E.ExhibitionID
        JOIN EXHIBITION NEW_E
            ON NEW_E.ExhibitionID = NEW.ExhibitionID
        WHERE EA.ArtworkID = NEW.ArtworkID
          AND EA.ExhibitionID <> NEW.ExhibitionID
          AND NOT (
              EA.ArtworkID = OLD.ArtworkID
              AND EA.ExhibitionID = OLD.ExhibitionID
          )
          AND COALESCE(NEW_E.StartDate, '1000-01-01')
              <= COALESCE(E.EndDate, '9999-12-31')
          AND COALESCE(E.StartDate, '1000-01-01')
              <= COALESCE(NEW_E.EndDate, '9999-12-31')
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Artwork is already assigned to another exhibition with overlapping dates';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_artwork_exhibition_overlap_dates$$

CREATE TRIGGER trg_artwork_exhibition_overlap_dates
BEFORE UPDATE ON EXHIBITION
FOR EACH ROW
BEGIN
    IF EXISTS (
        SELECT 1
        FROM EXHIBITION_ARTWORK EA1
        JOIN EXHIBITION_ARTWORK EA2
            ON EA1.ArtworkID = EA2.ArtworkID
           AND EA1.ExhibitionID <> EA2.ExhibitionID
        JOIN EXHIBITION E2
            ON EA2.ExhibitionID = E2.ExhibitionID
        WHERE EA1.ExhibitionID = OLD.ExhibitionID
          AND COALESCE(NEW.StartDate, '1000-01-01')
              <= COALESCE(E2.EndDate, '9999-12-31')
          AND COALESCE(E2.StartDate, '1000-01-01')
              <= COALESCE(NEW.EndDate, '9999-12-31')
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Cannot change exhibition dates because an assigned artwork would overlap with another exhibition';
    END IF;
END$$

-- 3. Remaining database triggers

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

DROP TRIGGER IF EXISTS VERIFY_EXHIBITION_INSERT$$

CREATE TRIGGER VERIFY_EXHIBITION_INSERT
BEFORE INSERT ON TICKET
FOR EACH ROW
BEGIN
    DECLARE exhibition_end_date DATE;

    IF NEW.ExhibitionID IS NOT NULL THEN
        SELECT EndDate INTO exhibition_end_date
        FROM EXHIBITION
        WHERE EXHIBITION.ExhibitionID = New.ExhibitionID;

        IF exhibition_end_date IS NOT NULL AND NEW.VisitDate > exhibition_end_date THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insertion Rejected: Visit date is past Exhibition End Date';
        END IF;
    END IF;
END$$

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

DROP TRIGGER IF EXISTS trg_validate_single_exhibition_ticket$$

CREATE TRIGGER trg_validate_single_exhibition_ticket
BEFORE INSERT ON TICKET
FOR EACH ROW
BEGIN
    DECLARE admission_count INT;

    IF NEW.Type = 'Single Exhibition' THEN

        SELECT COUNT(*)
        INTO admission_count
        FROM TICKET
        WHERE TicketID = NEW.GeneralAdmissionTicketID
          AND Type = 'General Admission'
          AND VisitorID = NEW.VisitorID;

        IF admission_count = 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
            'Single Exhibition ticket must reference a General Admission ticket for the same visitor';
        END IF;

    END IF;
END$$

DROP TRIGGER IF EXISTS VERIFY_EXHIBITION_UPDATE$$

CREATE TRIGGER VERIFY_EXHIBITION_UPDATE
BEFORE UPDATE ON TICKET
FOR EACH ROW
BEGIN
    DECLARE exhibition_end_date DATE;

    IF NEW.ExhibitionID IS NOT NULL THEN
        SELECT EndDate INTO exhibition_end_date
        FROM EXHIBITION
        WHERE EXHIBITION.ExhibitionID = New.ExhibitionID;

        IF exhibition_end_date IS NOT NULL AND NEW.VisitDate > exhibition_end_date THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insertion Rejected: Visit date is past Exhibition End Date';
        END IF;
    END IF;
END$$

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

