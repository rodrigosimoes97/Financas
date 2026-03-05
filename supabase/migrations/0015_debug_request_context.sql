create or replace function public.debug_request_context()
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'auth_uid', auth.uid(),
    'auth_role', auth.role(),
    'current_user', current_user,
    'jwt_role_claim', current_setting('request.jwt.claim.role', true),
    'jwt_sub_claim', current_setting('request.jwt.claim.sub', true),
    'role_setting', current_setting('role', true)
  );
$$;

grant execute on function public.debug_request_context() to authenticated, service_role;
revoke execute on function public.debug_request_context() from anon;
