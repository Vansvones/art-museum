/*
Business Rules Enforced:
1. Exhibition end date cannot be before start date.
2. Ticket prices cannot be negative.
3. Parking lots cannot exceed capacity.
4. Ticket visit dates cannot be after an exhibition ends.
5. Ticket updates cannot violate exhibition end dates.
*/

DELIMITER $$

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


CREATE TRIGGER check_ticket_price
BEFORE INSERT ON TICKET
FOR EACH ROW
BEGIN
    IF NEW.Price < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Ticket price cannot be negative';
    END IF;
END$$


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

DELIMITER ;