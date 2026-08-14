# Credentials checklist — Staff Training Portal

Put values in local `.env` and in **Railway** for production. Never commit real secrets to GitHub.

## Required for core product

| Need | Env var | Who / where | Notes |
|---|---|---|---|
| Nucleus read key | `NUCLEUS_API_KEY_PATRON` | Nucleus / engineering admin | Role **patron** — beer list, pickers, view taps. Reaches `/api/patron/*` only |
| Nucleus write key | `NUCLEUS_API_KEY_PATRON_WRITE` | Nucleus / engineering admin | Role **patron** + `taps:pour` scope — edit taps (live menu), nothing else. Careful with production keys locally |
| Nucleus URL | `NUCLEUS_BASE_URL` | Same | Local: `https://nucleus.manhattanproject.beer` · Railway: internal Nucleus URL |

## Required for live staff schedule awareness

| Need | Env var | Who / where | Notes |
|---|---|---|---|
| 7shifts Access Token | `SEVEN_SHIFTS_ACCESS_TOKEN` | **7shifts Admin** → Company Settings → Developer Tools | Only admins can create this |
| 7shifts Company ID | `SEVEN_SHIFTS_COMPANY_ID` | Same (Resource IDs tab) | |
| Location / department | `SEVEN_SHIFTS_LOCATION_ID`, `SEVEN_SHIFTS_DEPARTMENT_ID` | From schedule URL | Defaults: `204356` / `287810` — confirm |

## Optional — live guest reviews

| Need | Env var | Who / where |
|---|---|---|
| Google Places API key | `GOOGLE_PLACES_API_KEY` | Google Cloud project |
| Google Place ID | `GOOGLE_PLACE_ID` | Maps / Place ID finder |
| Yelp Fusion API key | `YELP_API_KEY` | [Yelp Developers](https://www.yelp.com/developers) |
| Yelp business id | `YELP_BUSINESS_ID` | Default: `manhattan-project-beer-company-dallas` |

## Optional — better Ask MP answers

| Need | Env var | Who / where |
|---|---|---|
| OpenAI API key | `OPENAI_API_KEY` | OpenAI org owner |

## Usually already set (confirm)

| Need | Env var |
|---|---|
| Microsoft Entra | `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` |
| App URL | `APP_BASE_URL` (+ matching Entra redirect URI) |
| Bootstrap admins | `AZURE_ADMIN_EMAILS` |
| Email domain | `ALLOWED_EMAIL_DOMAIN=manhattanproject.beer` |
| Session secret | `JWT_SECRET` (must be set on Railway) |
| Database on volume | `DB_PATH=/data/training.db` (see [railway-db-setup.md](./railway-db-setup.md)) |

## Meeting ask (short)

1. Nucleus: staff read key + manager write key  
2. 7shifts admin: Access Token + Company ID  
3. Google / Yelp (optional): Places + Fusion keys  
4. Confirm Railway env matches the above for production  
