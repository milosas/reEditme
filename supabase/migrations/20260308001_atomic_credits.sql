-- Atomic credit operations with row-level locking
-- Prevents race conditions on concurrent credit deductions/additions

-- deduct_credits: Atomically check balance, deduct, and log transaction
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Lock the row to prevent concurrent reads of stale balance
  SELECT credits INTO v_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- User not found or insufficient balance
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN QUERY SELECT FALSE, COALESCE(v_balance, 0);
    RETURN;
  END IF;

  -- Deduct credits
  UPDATE profiles
  SET credits = credits - p_amount
  WHERE id = p_user_id;

  -- Log the transaction
  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 'usage', p_description);

  RETURN QUERY SELECT TRUE, v_balance - p_amount;
END;
$$;

-- increment_credits: Atomically add credits and log transaction
CREATE OR REPLACE FUNCTION increment_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'purchase',
  p_stripe_session_id TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Lock the row to prevent concurrent modifications
  SELECT credits INTO v_balance
  FROM profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- User not found
  IF v_balance IS NULL THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  -- Add credits
  UPDATE profiles
  SET credits = credits + p_amount
  WHERE id = p_user_id;

  -- Log the transaction
  INSERT INTO credit_transactions (user_id, amount, type, description, stripe_session_id)
  VALUES (p_user_id, p_amount, p_type, p_description, p_stripe_session_id);

  RETURN QUERY SELECT TRUE, v_balance + p_amount;
END;
$$;
