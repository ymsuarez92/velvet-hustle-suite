
-- ============================================================
-- get_available_slots: returns list of bookable timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_available_slots(
  _slug text,
  _date date,
  _service_id uuid
)
RETURNS TABLE(slot timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_duration int;
  v_weekday int;
  v_open time;
  v_close time;
  v_break_start time;
  v_break_end time;
  v_is_open boolean;
  v_blocked boolean;
  v_cursor timestamptz;
  v_end timestamptz;
  v_slot_end timestamptz;
  v_step interval := interval '15 minutes';
BEGIN
  SELECT b.id INTO v_business_id
  FROM businesses b
  WHERE b.slug = _slug AND b.status = 'published';
  IF v_business_id IS NULL THEN RETURN; END IF;

  SELECT s.duration_min INTO v_duration
  FROM services s
  WHERE s.id = _service_id AND s.business_id = v_business_id AND s.is_active = true;
  IF v_duration IS NULL THEN RETURN; END IF;

  -- Don't return slots in the past
  IF _date < (now() AT TIME ZONE 'UTC')::date THEN RETURN; END IF;

  v_weekday := EXTRACT(DOW FROM _date)::int;

  SELECT bh.is_open, bh.open_time, bh.close_time, bh.break_start, bh.break_end
    INTO v_is_open, v_open, v_close, v_break_start, v_break_end
  FROM business_hours bh
  WHERE bh.business_id = v_business_id AND bh.weekday = v_weekday;

  IF NOT COALESCE(v_is_open, false) OR v_open IS NULL OR v_close IS NULL THEN RETURN; END IF;

  SELECT EXISTS (
    SELECT 1 FROM blocked_dates bd
    WHERE bd.business_id = v_business_id AND bd.blocked_date = _date
  ) INTO v_blocked;
  IF v_blocked THEN RETURN; END IF;

  v_cursor := (_date::timestamp + v_open)::timestamptz;
  v_end := (_date::timestamp + v_close)::timestamptz;

  WHILE v_cursor + make_interval(mins => v_duration) <= v_end LOOP
    v_slot_end := v_cursor + make_interval(mins => v_duration);

    -- Skip past slots if today
    IF v_cursor <= now() THEN
      v_cursor := v_cursor + v_step;
      CONTINUE;
    END IF;

    -- Skip overlap with break
    IF v_break_start IS NOT NULL AND v_break_end IS NOT NULL THEN
      IF v_cursor < (_date::timestamp + v_break_end)::timestamptz
         AND v_slot_end > (_date::timestamp + v_break_start)::timestamptz THEN
        v_cursor := v_cursor + v_step;
        CONTINUE;
      END IF;
    END IF;

    -- Skip overlap with existing appointments
    IF EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.business_id = v_business_id
        AND a.status IN ('pending','confirmed')
        AND a.starts_at < v_slot_end
        AND a.ends_at > v_cursor
    ) THEN
      v_cursor := v_cursor + v_step;
      CONTINUE;
    END IF;

    slot := v_cursor;
    RETURN NEXT;
    v_cursor := v_cursor + v_step;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_available_slots(text, date, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_available_slots(text, date, uuid) TO anon, authenticated, service_role;

-- ============================================================
-- create_booking: validates and inserts an appointment
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_booking(
  _slug text,
  _service_id uuid,
  _starts_at timestamptz,
  _customer_name text,
  _customer_phone text,
  _customer_email text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_duration int;
  v_price numeric;
  v_ends_at timestamptz;
  v_customer_id uuid;
  v_appt_id uuid;
  v_name text;
  v_phone text;
BEGIN
  v_name := trim(coalesce(_customer_name,''));
  v_phone := trim(coalesce(_customer_phone,''));
  IF length(v_name) < 2 OR length(v_name) > 100 THEN
    RAISE EXCEPTION 'Invalid customer name';
  END IF;
  IF length(v_phone) < 6 OR length(v_phone) > 30 THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;
  IF _starts_at <= now() THEN
    RAISE EXCEPTION 'Slot is in the past';
  END IF;

  SELECT b.id INTO v_business_id
  FROM businesses b
  WHERE b.slug = _slug AND b.status = 'published';
  IF v_business_id IS NULL THEN RAISE EXCEPTION 'Business not available'; END IF;

  SELECT s.duration_min, s.price INTO v_duration, v_price
  FROM services s
  WHERE s.id = _service_id AND s.business_id = v_business_id AND s.is_active = true;
  IF v_duration IS NULL THEN RAISE EXCEPTION 'Service not available'; END IF;

  v_ends_at := _starts_at + make_interval(mins => v_duration);

  -- Re-validate availability: no overlap
  IF EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.business_id = v_business_id
      AND a.status IN ('pending','confirmed')
      AND a.starts_at < v_ends_at
      AND a.ends_at > _starts_at
  ) THEN
    RAISE EXCEPTION 'Slot no longer available';
  END IF;

  -- Re-validate slot falls within business hours and not blocked
  IF NOT EXISTS (
    SELECT 1 FROM public.get_available_slots(_slug, _starts_at::date, _service_id) g
    WHERE g.slot = _starts_at
  ) THEN
    RAISE EXCEPTION 'Slot is outside availability';
  END IF;

  -- Upsert customer by (business_id, phone)
  SELECT id INTO v_customer_id
  FROM customers
  WHERE business_id = v_business_id AND phone = v_phone
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO customers (business_id, full_name, phone, email)
    VALUES (v_business_id, v_name, v_phone, NULLIF(trim(coalesce(_customer_email,'')),''))
    RETURNING id INTO v_customer_id;
  ELSE
    UPDATE customers SET full_name = v_name,
           email = COALESCE(NULLIF(trim(coalesce(_customer_email,'')),''), email),
           updated_at = now()
    WHERE id = v_customer_id;
  END IF;

  INSERT INTO appointments (
    business_id, service_id, customer_id, customer_name, customer_phone, customer_email,
    starts_at, ends_at, status, notes
  ) VALUES (
    v_business_id, _service_id, v_customer_id, v_name, v_phone,
    NULLIF(trim(coalesce(_customer_email,'')),''),
    _starts_at, v_ends_at, 'pending', NULLIF(trim(coalesce(_notes,'')),'')
  ) RETURNING id INTO v_appt_id;

  RETURN v_appt_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_booking(text, uuid, timestamptz, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking(text, uuid, timestamptz, text, text, text, text) TO anon, authenticated, service_role;
