# Tawk.to Integration - Required Credentials

## 📋 Checklist

### ✅ Already Have (Configured)
| Name | Value | Purpose | Status |
|------|-------|---------|--------|
| `TAWKTO_WEBHOOK_SECRET` | `72c9d684cad026a2...` | Verify webhook signatures | ✅ In Vercel |
| `TAWK_PROPERTY_ID` | `5d403f11e5ae967ef80d7fdd` | SmotPro property ID | ✅ In Vercel |
| `DATABASE_URL` | `postgresql://neondb_owner...` | Neon PostgreSQL | ✅ In Vercel |

### ❌ Need to Get
| Name | Where to Get | Purpose |
|------|--------------|---------|
| `TAWK_API_KEY` | Tawk.to Dashboard → Profile → REST API Keys | Access REST API (requires approval) |
| `TAWK_API_SECRET` | Same as above | API authentication |

---

## 🔑 How to Get Tawk.to REST API Access

### Step 1: Request API Access
1. Go to: https://help.tawk.to/article/rest-api
2. Click "Request API Access"
3. Fill the form with:
   - Your name: Mani Bharadwaj
   - Company: SMOTPro
   - Use case: Automate webhook management across multiple properties
4. Submit and wait for approval email

### Step 2: Create API Keys (After Approval)
1. Login to Tawk.to Dashboard
2. Go to: Profile (top right) → REST API Keys
3. Click "Create New Key"
4. Name it: `SMOTPRO_INTEGRATION_KEY`
5. Copy both:
   - API Key (this is `TAWK_API_KEY`)
   - API Secret (this is `TAWK_API_SECRET`)

---

## 📊 Your Properties List

| # | Property Name | Property ID | Webhook Configured? |
|---|---------------|-------------|---------------------|
| 1 | SmotPro | `5d403f11e5ae967ef80d7fdd` | ✅ Yes |
| 2 | SmotVisa | `69c2446229e9681c3d64dff1` | ❌ No - Needs webhook |
| 3 | VisaAgentsInHyd | `69c27682ffb4f81c353b516e` | ❌ No - Needs webhook |
| 4 | VisaAgentsInDel | `69c3721046a6c41c341aae71` | ❌ No - Needs webhook |
| 5 | Property 5 | `pending...` | ❌ No |
| 5 | VisaAgentsInMum | `69c36a665b8e4d1c398bb1d6` | ❌ No - Needs webhook |
| 6 | VisaAgentsInBlr | `69c3672796fbf81c357213a0` | ❌ No - Needs webhook |
| 7 | VisaAgentsInChn | `69c25d92fb7ce31c36765087` | ❌ No - Needs webhook |
| 8 | Property 8 | `pending...` | ❌ No |
| 9 | Property 9 | `pending...` | ❌ No |
| 10 | Property 10 | `pending...` | ❌ No |

---

## 🚀 Webhook URL (Same for all properties)

```
https://tawk-to-eta.vercel.app/api/webhooks/tawkto
```

### Webhook Secret (Same for all)

```
72c9d684cad026a2fea33da14cc477fa9e5a8b5a5800ada58db1362d213bbbf33cce1825fb869451e100d1a5d81e1fd3
```

---

## ⚡ Quick Setup Instructions (For Each Property)

1. Login to Tawk.to Dashboard
2. Switch to the property (dropdown top left)
3. Go to: Administration (gear icon) → Webhooks
4. Click "Add Webhook"
5. Enter:
   - URL: `https://tawk-to-eta.vercel.app/api/webhooks/tawkto`
   - Secret: (paste the secret above)
   - Events: ✅ Chat start, ✅ Chat end, ✅ Chat transcript created
6. Click Save
7. Repeat for next property

---

## 📝 Notes

- All webhooks point to the same endpoint
- Dashboard filters by `property_name` to differentiate chats
- One database stores chats from all properties
- When API access is approved, automation can be built