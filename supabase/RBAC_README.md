# Auth + RBAC Setup (MATWANA)

This project uses Supabase Auth with Role-Based Access Control (RBAC) enforced via Row Level Security (RLS) and JWT Custom Claim Injection.

## Roles
- **fan** (default): Can view everything, follow nganyas, and participate in sightings/voting.
- **crew**: Can manage live sessions for nganyas they are mapped to in `crew_nganyas`.
- **admin**: Full access to corridors, stages, nganyas, user roles, and crew mappings.

## 1. Enable Custom Access Token Hook
To make RBAC work correctly with RLS plan caching, you **MUST** enable the custom access token hook in the Supabase Dashboard:

1.  Go to **Authentication** -> **Hooks**.
2.  Enable the **Custom Access Token** hook.
3.  Select the `public.custom_access_token_hook` function.
4.  This allows RLS to use `(auth.jwt()->>'user_role')` without per-row DB lookups.

## 2. Safe Promotion Flows

### Promoting to Admin
Admins can promote other users directly via the `user_roles` table:
```sql
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = 'USER_UUID';
```

### Promoting to Crew
1. Assign the `crew` role:
```sql
UPDATE public.user_roles 
SET role = 'crew' 
WHERE user_id = 'USER_UUID';
```
2. Map the crew member to a nganya:
```sql
INSERT INTO public.crew_nganyas (crew_user_id, nganya_id)
VALUES ('USER_UUID', 'NGANYA_UUID');
```

## 3. Token Refresh
When a user's role is updated in the database, the current JWT remains valid with the *old* role until it expires. To reflect changes immediately, the client must refresh the session:

```javascript
const { data, error } = await supabase.auth.refreshSession();
```

## 4. Permissions Matrix

| Resource | Fan | Crew | Admin |
| :--- | :---: | :---: | :---: |
| Corridors/Stages | Read | Read | Read/Write |
| Nganyas | Read | Read | Read/Write |
| Nganya Media | Read/Create | Read/Create | Read/Write |
| Follows | Own Only | Own Only | Own Only |
| Sightings | Read/Create | Read/Create | Read/Write |
| Live Sessions | Read | Own/Mapped Only | Read/Write |
| User Roles | Read (Own) | Read (Own) | Read/Write |
