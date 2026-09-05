-- A Paystack transaction that reports 'abandoned' or 'failed' can still succeed
-- later on the same reference, because the checkout link stays live and the
-- customer can retry on it. The original mark_order_paid only settled orders in
-- 'pending', so a late success left the buyer charged with the order unsettled.
-- Allow settlement from 'failed' as well.

create or replace function mark_order_paid(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated integer;
begin
  update orders
     set status = 'paid'
   where id = p_order_id
     and status in ('pending', 'failed');

  get diagnostics updated = row_count;
  if updated = 0 then
    return false;
  end if;

  update products p
     set stock = greatest(p.stock - oi.quantity, 0)
    from order_items oi
   where oi.order_id = p_order_id
     and p.id = oi.product_id;

  return true;
end;
$$;

revoke all on function mark_order_paid(uuid) from public, anon, authenticated;
