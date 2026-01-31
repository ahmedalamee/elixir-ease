-- =====================================================
-- PHARMACEUTICAL ALTERNATIVE PRODUCT SAFETY RULES
-- Enforces: Same Scientific Material = Valid Alternative
-- =====================================================

-- Trigger function: Validate alternative has same scientific material
CREATE OR REPLACE FUNCTION trg_validate_alternative_scientific_material()
RETURNS TRIGGER AS $$
DECLARE
  v_product_material_id UUID;
  v_alternative_material_id UUID;
  v_product_name TEXT;
  v_alternative_name TEXT;
BEGIN
  -- Get scientific material IDs for both products
  SELECT scientific_material_id, name INTO v_product_material_id, v_product_name
  FROM products WHERE id = NEW.product_id;
  
  SELECT scientific_material_id, name INTO v_alternative_material_id, v_alternative_name
  FROM products WHERE id = NEW.alternative_product_id;
  
  -- Rule 1: Product must have a scientific material to have alternatives
  IF v_product_material_id IS NULL THEN
    -- Log violation attempt
    INSERT INTO erp_violation_log (
      violation_type, table_name, attempted_action,
      violation_details, user_id
    ) VALUES (
      'ALTERNATIVE_NO_MATERIAL',
      'product_alternatives',
      TG_OP,
      jsonb_build_object(
        'product_id', NEW.product_id,
        'product_name', v_product_name,
        'alternative_id', NEW.alternative_product_id,
        'alternative_name', v_alternative_name,
        'reason', 'المنتج الأساسي لا يحتوي على مادة علمية'
      ),
      auth.uid()
    );
    
    RAISE EXCEPTION '❌ لا يمكن إضافة بدائل لمنتج بدون مادة علمية. المنتج: %', v_product_name;
  END IF;
  
  -- Rule 2: Alternative must have a scientific material
  IF v_alternative_material_id IS NULL THEN
    -- Log violation attempt
    INSERT INTO erp_violation_log (
      violation_type, table_name, attempted_action,
      violation_details, user_id
    ) VALUES (
      'ALTERNATIVE_NO_MATERIAL',
      'product_alternatives',
      TG_OP,
      jsonb_build_object(
        'product_id', NEW.product_id,
        'product_name', v_product_name,
        'alternative_id', NEW.alternative_product_id,
        'alternative_name', v_alternative_name,
        'reason', 'البديل لا يحتوي على مادة علمية'
      ),
      auth.uid()
    );
    
    RAISE EXCEPTION '❌ لا يمكن ربط بديل بدون مادة علمية. البديل: %', v_alternative_name;
  END IF;
  
  -- Rule 3: Both must share the SAME scientific material
  IF v_product_material_id != v_alternative_material_id THEN
    -- Log violation attempt
    INSERT INTO erp_violation_log (
      violation_type, table_name, attempted_action,
      violation_details, user_id
    ) VALUES (
      'ALTERNATIVE_MATERIAL_MISMATCH',
      'product_alternatives',
      TG_OP,
      jsonb_build_object(
        'product_id', NEW.product_id,
        'product_name', v_product_name,
        'product_material_id', v_product_material_id,
        'alternative_id', NEW.alternative_product_id,
        'alternative_name', v_alternative_name,
        'alternative_material_id', v_alternative_material_id,
        'reason', 'محاولة ربط بديل بمادة علمية مختلفة'
      ),
      auth.uid()
    );
    
    RAISE EXCEPTION '❌ لا يمكن ربط بديل بمادة علمية مختلفة. المنتج [%] والبديل [%] لهما مواد علمية مختلفة', v_product_name, v_alternative_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create/Replace the trigger
DROP TRIGGER IF EXISTS trg_validate_alternative_material ON product_alternatives;
CREATE TRIGGER trg_validate_alternative_material
  BEFORE INSERT OR UPDATE ON product_alternatives
  FOR EACH ROW
  EXECUTE FUNCTION trg_validate_alternative_scientific_material();

-- =====================================================
-- Auto-cleanup: Remove invalid alternatives when product's
-- scientific material changes
-- =====================================================
CREATE OR REPLACE FUNCTION trg_cleanup_alternatives_on_material_change()
RETURNS TRIGGER AS $$
DECLARE
  v_removed_count INTEGER;
BEGIN
  -- Only act if scientific_material_id changed
  IF OLD.scientific_material_id IS DISTINCT FROM NEW.scientific_material_id THEN
    -- Delete alternatives where materials no longer match
    WITH deleted AS (
      DELETE FROM product_alternatives pa
      WHERE pa.product_id = NEW.id
        AND EXISTS (
          SELECT 1 FROM products p 
          WHERE p.id = pa.alternative_product_id 
            AND (p.scientific_material_id IS NULL OR p.scientific_material_id != NEW.scientific_material_id)
        )
      RETURNING pa.alternative_product_id
    )
    SELECT COUNT(*) INTO v_removed_count FROM deleted;
    
    -- Also delete reverse relationships
    WITH deleted AS (
      DELETE FROM product_alternatives pa
      WHERE pa.alternative_product_id = NEW.id
        AND EXISTS (
          SELECT 1 FROM products p 
          WHERE p.id = pa.product_id 
            AND (p.scientific_material_id IS NULL OR p.scientific_material_id != NEW.scientific_material_id)
        )
      RETURNING pa.product_id
    )
    SELECT COUNT(*) + v_removed_count INTO v_removed_count FROM deleted;
    
    -- Log if alternatives were removed
    IF v_removed_count > 0 THEN
      INSERT INTO erp_violation_log (
        violation_type, table_name, attempted_action,
        violation_details, user_id
      ) VALUES (
        'ALTERNATIVES_AUTO_CLEANUP',
        'product_alternatives',
        'AUTO_DELETE',
        jsonb_build_object(
          'product_id', NEW.id,
          'product_name', NEW.name,
          'old_material_id', OLD.scientific_material_id,
          'new_material_id', NEW.scientific_material_id,
          'removed_alternatives_count', v_removed_count,
          'reason', 'تم إزالة البدائل تلقائياً بسبب تغيير المادة العلمية'
        ),
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on products table
DROP TRIGGER IF EXISTS trg_cleanup_alternatives_on_material_change ON products;
CREATE TRIGGER trg_cleanup_alternatives_on_material_change
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION trg_cleanup_alternatives_on_material_change();

-- =====================================================
-- View: Valid alternatives (same scientific material only)
-- =====================================================
CREATE OR REPLACE VIEW v_valid_product_alternatives AS
SELECT 
  pa.id,
  pa.product_id,
  pa.alternative_product_id,
  p1.name AS product_name,
  p1.scientific_material_id AS product_material_id,
  sm1.name AS product_material_name,
  p2.name AS alternative_name,
  p2.scientific_material_id AS alternative_material_id,
  sm2.name AS alternative_material_name,
  p1.barcode AS product_barcode,
  p2.barcode AS alternative_barcode,
  pa.created_at
FROM product_alternatives pa
JOIN products p1 ON p1.id = pa.product_id
JOIN products p2 ON p2.id = pa.alternative_product_id
LEFT JOIN scientific_materials sm1 ON sm1.id = p1.scientific_material_id
LEFT JOIN scientific_materials sm2 ON sm2.id = p2.scientific_material_id
WHERE p1.scientific_material_id = p2.scientific_material_id
  AND p1.scientific_material_id IS NOT NULL;

-- =====================================================
-- Function: Get valid alternatives for a product
-- =====================================================
CREATE OR REPLACE FUNCTION get_valid_alternatives(p_product_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  name_en TEXT,
  barcode TEXT,
  price NUMERIC,
  scientific_material_id UUID,
  scientific_material_name TEXT,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.name_en,
    p.barcode,
    p.price,
    p.scientific_material_id,
    sm.name AS scientific_material_name,
    p.is_active
  FROM products p
  LEFT JOIN scientific_materials sm ON sm.id = p.scientific_material_id
  WHERE p.scientific_material_id = (
    SELECT scientific_material_id FROM products WHERE id = p_product_id
  )
  AND p.id != p_product_id
  AND p.is_active = true
  AND p.scientific_material_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Cleanup existing invalid alternatives (one-time fix)
-- =====================================================
DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete alternatives where materials don't match
  WITH deleted AS (
    DELETE FROM product_alternatives pa
    WHERE NOT EXISTS (
      SELECT 1 
      FROM products p1, products p2
      WHERE p1.id = pa.product_id
        AND p2.id = pa.alternative_product_id
        AND p1.scientific_material_id IS NOT NULL
        AND p2.scientific_material_id IS NOT NULL
        AND p1.scientific_material_id = p2.scientific_material_id
    )
    RETURNING pa.id
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  
  IF v_deleted_count > 0 THEN
    RAISE NOTICE 'تم حذف % بديل غير صالح (مواد علمية مختلفة)', v_deleted_count;
  END IF;
END $$;