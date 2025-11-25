-- Function to update customer balance and last transaction date from sales invoices
CREATE OR REPLACE FUNCTION update_customer_from_sales_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'posted' THEN
    -- Increase balance (debt) when invoice is posted
    UPDATE customers 
    SET balance = balance + NEW.total,
        last_transaction_date = NEW.invoice_date
    WHERE id = NEW.customer_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- If status changed to posted
    IF OLD.status != 'posted' AND NEW.status = 'posted' THEN
      UPDATE customers 
      SET balance = balance + NEW.total,
          last_transaction_date = NEW.invoice_date
      WHERE id = NEW.customer_id;
    -- If status changed from posted to cancelled/returned
    ELSIF OLD.status = 'posted' AND NEW.status IN ('cancelled', 'returned') THEN
      UPDATE customers 
      SET balance = balance - OLD.total
      WHERE id = NEW.customer_id;
    -- If amount changed on posted invoice
    ELSIF OLD.status = 'posted' AND NEW.status = 'posted' AND OLD.total != NEW.total THEN
      UPDATE customers 
      SET balance = balance - OLD.total + NEW.total,
          last_transaction_date = NEW.invoice_date
      WHERE id = NEW.customer_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'posted' THEN
    -- Decrease balance if posted invoice is deleted
    UPDATE customers 
    SET balance = balance - OLD.total
    WHERE id = OLD.customer_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for sales invoices
DROP TRIGGER IF EXISTS trg_update_customer_from_sales_invoice ON sales_invoices;
CREATE TRIGGER trg_update_customer_from_sales_invoice
AFTER INSERT OR UPDATE OR DELETE ON sales_invoices
FOR EACH ROW
EXECUTE FUNCTION update_customer_from_sales_invoice();

-- Function to update customer balance from payments
CREATE OR REPLACE FUNCTION update_customer_from_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'posted' THEN
    -- Decrease balance when payment is posted
    UPDATE customers 
    SET balance = balance - NEW.amount,
        last_transaction_date = NEW.payment_date
    WHERE id = NEW.customer_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- If status changed to posted
    IF OLD.status != 'posted' AND NEW.status = 'posted' THEN
      UPDATE customers 
      SET balance = balance - NEW.amount,
          last_transaction_date = NEW.payment_date
      WHERE id = NEW.customer_id;
    -- If status changed from posted to cancelled
    ELSIF OLD.status = 'posted' AND NEW.status = 'cancelled' THEN
      UPDATE customers 
      SET balance = balance + OLD.amount
      WHERE id = NEW.customer_id;
    -- If amount changed on posted payment
    ELSIF OLD.status = 'posted' AND NEW.status = 'posted' AND OLD.amount != NEW.amount THEN
      UPDATE customers 
      SET balance = balance + OLD.amount - NEW.amount,
          last_transaction_date = NEW.payment_date
      WHERE id = NEW.customer_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'posted' THEN
    -- Increase balance if posted payment is deleted
    UPDATE customers 
    SET balance = balance + OLD.amount
    WHERE id = OLD.customer_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for customer payments
DROP TRIGGER IF EXISTS trg_update_customer_from_payment ON customer_payments;
CREATE TRIGGER trg_update_customer_from_payment
AFTER INSERT OR UPDATE OR DELETE ON customer_payments
FOR EACH ROW
EXECUTE FUNCTION update_customer_from_payment();

-- Function to calculate loyalty points (1 point per 100 SAR)
CREATE OR REPLACE FUNCTION calculate_loyalty_points()
RETURNS TRIGGER AS $$
DECLARE
  points_earned INTEGER;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'posted' THEN
    -- Calculate points: 1 point per 100 SAR
    points_earned := FLOOR(NEW.total / 100);
    
    UPDATE customers 
    SET loyalty_points = loyalty_points + points_earned
    WHERE id = NEW.customer_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- If status changed to posted, add points
    IF OLD.status != 'posted' AND NEW.status = 'posted' THEN
      points_earned := FLOOR(NEW.total / 100);
      UPDATE customers 
      SET loyalty_points = loyalty_points + points_earned
      WHERE id = NEW.customer_id;
    -- If status changed from posted, remove points
    ELSIF OLD.status = 'posted' AND NEW.status IN ('cancelled', 'returned') THEN
      points_earned := FLOOR(OLD.total / 100);
      UPDATE customers 
      SET loyalty_points = GREATEST(0, loyalty_points - points_earned)
      WHERE id = NEW.customer_id;
    -- If amount changed on posted invoice, recalculate
    ELSIF OLD.status = 'posted' AND NEW.status = 'posted' AND OLD.total != NEW.total THEN
      points_earned := FLOOR(NEW.total / 100) - FLOOR(OLD.total / 100);
      UPDATE customers 
      SET loyalty_points = GREATEST(0, loyalty_points + points_earned)
      WHERE id = NEW.customer_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'posted' THEN
    -- Remove points if posted invoice is deleted
    points_earned := FLOOR(OLD.total / 100);
    UPDATE customers 
    SET loyalty_points = GREATEST(0, loyalty_points - points_earned)
    WHERE id = OLD.customer_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for loyalty points calculation
DROP TRIGGER IF EXISTS trg_calculate_loyalty_points ON sales_invoices;
CREATE TRIGGER trg_calculate_loyalty_points
AFTER INSERT OR UPDATE OR DELETE ON sales_invoices
FOR EACH ROW
EXECUTE FUNCTION calculate_loyalty_points();