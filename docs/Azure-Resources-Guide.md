# Azure resources guide — Stock Transfer Application

This document lists what to provision in **your Azure subscription** (an Azure “subscription” is the billing/account boundary—you do not subscribe to each resource separately; you **create** resources inside a subscription).

Assumed architecture: **React (Static Web Apps or App Service)** + **ASP.NET Core 8 API (App Service)** + **Azure SQL Database** + optional supporting services.

---

## 1. Required (minimum to run the app)

| Resource | Azure product | Purpose |
|----------|----------------|---------|
| **Resource group** | Resource groups | Logical container for all resources; pick a region (e.g. `East US`). |
| **App Service Plan** | App Service | Compute for the API (and optionally the frontend). Defines SKU (size/cost). |
| **Web App (App Service)** | App Service | Hosts the **StockTransfer.Api** (.NET 8). Linux + .NET 8 or Windows + .NET 8. |
| **Azure SQL server** | Azure SQL | Logical server for SQL Database. |
| **Azure SQL Database** | Azure SQL | Application database (replaces on-prem SQL Server). Use **General Purpose** or **Basic** for dev/test. |
| **Static Web App** *(recommended for React)* | Azure Static Web Apps | Hosts the **Vite/React** build (`dist`), CDN, free TLS, easy GitHub integration. |

**Alternative (no Static Web Apps):** host the frontend on a **second Web App** on the same or another App Service Plan, or use **Azure Storage** (static website) + **Azure CDN**.

---

## 2. Strongly recommended (security & operations)

| Resource | Azure product | Purpose |
|----------|----------------|---------|
| **Key Vault** *(optional)* | Azure Key Vault | Store **JWT signing key**, SQL admin password references, API keys—not committed to Git. |
| **Application Insights** | Application Insights | API **logs, metrics, failures**, dependency tracking. Link to the API App Service. |
| **Log Analytics workspace** | Azure Monitor | Required backend for Application Insights (often created automatically). |
| **Managed identity** | App Service / SQL | API uses **managed identity** to access Key Vault or SQL (advanced); reduces secrets in app settings. |

---

## 3. Networking (optional, for production hardening)

| Resource | Purpose |
|----------|---------|
| **Private Endpoint** (SQL, Key Vault) | Keep traffic off the public internet. |
| **VNet integration** (App Service) | API reaches private SQL/Key Vault. |
| **Azure Front Door** or **Application Gateway** | Global entry, WAF, routing (larger setups). |

For a first deployment, **public SQL firewall rule** (Azure services + your IP) is common; tighten later.

---

## 4. Identity & CI/CD (what you use, not always “resources”)

| Item | Notes |
|------|--------|
| **Microsoft Entra ID** (Azure AD) | Included with the tenant; used for **sign-in to the portal** and optionally app auth later. |
| **GitHub Actions** or **Azure DevOps** | **Not** Azure billable resources by themselves; they **deploy to** App Service / Static Web Apps using secrets or OIDC. |
| **Service principal / OIDC** | Recommended instead of long-lived publish profiles for GitHub → Azure deploy. |

---

## 5. Suggested creation order

1. **Resource group** (region).  
2. **Azure SQL server** + **Azure SQL Database** (note server admin or Entra-only admin). Run schema + seed scripts.  
3. **App Service Plan** (e.g. **B1** dev / **P1v3** or higher for production).  
4. **Web App** for the API → set **.NET 8**, **connection string**, **JWT** app settings, **CORS** to your frontend URL.  
5. **Static Web App** (or second Web App / Storage for UI) → connect repo or deploy from pipeline; set **`VITE_API_BASE_URL`** at build time to the API’s public `https://.../api` URL.  
6. **Application Insights** → attach to the API Web App.  
7. (Optional) **Key Vault** + reference secrets from App Service.

---

## 6. App configuration checklist (on the API Web App)

Set in **Configuration** (application settings), examples:

- `ConnectionStrings__DefaultConnection` — Azure SQL connection string.  
- `Jwt__SigningKey` — long random secret.  
- `Jwt__Issuer` / `Jwt__Audience` — match your deployed URLs.  
- **CORS** — allow only your frontend origin (Static Web App URL or custom domain).

---

## 7. Cost awareness (high level)

- **Static Web Apps**: **Free** tier exists (limits apply); **Standard** for custom domains/SLA.  
- **App Service Plan**: billed by SKU (**B**, **S**, **P**, **Premium v3**); dev can use **B1**.  
- **Azure SQL**: **Serverless** or **DTU/vCore** tiers; **Basic** is cheapest for dev.  
- **Application Insights**: pay for ingestion; small apps are usually low cost.  
- **Key Vault**: small monthly fee + operations.

Use **[Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)** with your region and SKUs.

---

## 8. What you need before starting

- An **Azure subscription** (Pay-As-You-Go, CSP, Enterprise, etc.).  
- **Owner** or **Contributor** (plus **User Access Administrator** if using certain RBAC patterns) on the subscription or resource group.  
- **GitHub** (or Azure DevOps) repo with the pipeline secrets/variables described in `.github/workflows/azure-ci-cd.yml`.

---

## 9. Summary — “what to subscribe / create”

**Create in Azure (not marketplace “subscriptions”):**

1. Resource group  
2. Azure SQL server + database  
3. App Service Plan + Web App (API)  
4. Static Web App **or** alternate frontend hosting  
5. (Recommended) Application Insights + Log Analytics  
6. (Optional) Key Vault, private endpoints, Front Door  

**Subscribe to:** one **Azure subscription**; everything above is **resources inside that subscription**.

For step-by-step portal clicks and naming conventions, use this list with Microsoft Learn: [App Service](https://learn.microsoft.com/azure/app-service/), [Azure SQL](https://learn.microsoft.com/azure/azure-sql/), [Static Web Apps](https://learn.microsoft.com/azure/static-web-apps/).
