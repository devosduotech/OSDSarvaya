# OSDSarvaya License API Documentation

## Base URL
```
https://dvarika.osduotech.com/api/method/
```

## Authentication

Include API credentials in the request header:
```
Authorization: token API_KEY:API_SECRET
```

**Credentials:**
- **API Key**: `a652ccfadaa8917`
- **API Secret**: `155057be1ff06fa`

---

## API Endpoints

### 1. Validate License
Check if a license key is valid and active.

**Endpoint:**
```
POST osdsarvaya_app.api.validate_license
```

**Request:**
```json
{
  "license_key": "OSDS-Q02V-BRE9-JGNF",
  "machine_id": "machine-001"
}
```

**Success Response:**
```json
{
  "valid": true,
  "message": "License is valid",
  "license_key": "OSDS-Q02V-BRE9-JGNF",
  "customer": "1004-00001",
  "customer_email": "test@example.com",
  "sales_order": "1005-2505-001-1",
  "machine_id": "machine-001",
  "activation_date": "2026-02-28 19:51:00.000000"
}
```

**Failure Response:**
```json
{
  "valid": false,
  "message": "License is not active. Please contact support."
}
```

---

### 2. Activate License
Activate a license on a specific machine.

**Endpoint:**
```
POST osdsarvaya_app.api.activate_license
```

**Request:**
```json
{
  "license_key": "OSDS-Q02V-BRE9-JGNF",
  "machine_id": "machine-001"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "License activated successfully",
  "license_key": "OSDS-Q02V-BRE9-JGNF",
  "customer": "1004-00001",
  "customer_email": "test@example.com"
}
```

**Failure Response:**
```json
{
  "success": false,
  "message": "License key not found"
}
```

---

### 3. Deactivate License
Deactivate a license (for machine reset / transfer).

**Endpoint:**
```
POST osdsarvaya_app.api.deactivate_license
```

**Request:**
```json
{
  "license_key": "OSDS-Q02V-BRE9-JGNF"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "License deactivated. Customer can now activate on new machine."
}
```

---

### 4. Generate New License (Admin Only)
Generate a new license key for an existing customer (deactivates old one).

**Endpoint:**
```
POST osdsarvaya_app.api.regenerate_license
```

**Request:**
```json
{
  "license_key": "OSDS-Q02V-BRE9-JGNF"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "New license generated successfully",
  "old_license_key": "OSDS-Q02V-BRE9-JGNF",
  "new_license_key": "OSDS-ABCD-EFGH-IJKL"
}
```

---

## Integration Examples

### cURL

```bash
# Validate License
curl -X POST "https://dvarika.osduotech.com/api/method/osdsarvaya_app.api.validate_license" \
  -H "Content-Type: application/json" \
  -H "Authorization: token a652ccfadaa8917:155057be1ff06fa" \
  -d '{"license_key": "OSDS-Q02V-BRE9-JGNF", "machine_id": "machine-001"}'

# Activate License
curl -X POST "https://dvarika.osduotech.com/api/method/osdsarvaya_app.api.activate_license" \
  -H "Content-Type: application/json" \
  -H "Authorization: token a652ccfadaa8917:155057be1ff06fa" \
  -d '{"license_key": "OSDS-Q02V-BRE9-JGNF", "machine_id": "machine-001"}'
```

### Python

```python
import requests

API_KEY = "a652ccfadaa8917"
API_SECRET = "155057be1ff06fa"
BASE_URL = "https://dvarika.osduotech.com/api/method/"

def make_request(method, data):
    url = BASE_URL + method
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"token {API_KEY}:{API_SECRET}"
    }
    response = requests.post(url, json=data, headers=headers)
    return response.json()

# Validate License
result = make_request("osdsarvaya_app.api.validate_license", {
    "license_key": "OSDS-Q02V-BRE9-JGNF",
    "machine_id": "machine-001"
})

# Activate License
result = make_request("osdsarvaya_app.api.activate_license", {
    "license_key": "OSDS-Q02V-BRE9-JGNF",
    "machine_id": "machine-001"
})
```

### C# / .NET

```csharp
using System.Net.Http;
using System.Text;
using System.Text.Json;

public class LicenseAPI
{
    private const string BaseUrl = "https://dvarika.osduotech.com/api/method/";
    private const string ApiKey = "a652ccfadaa8917";
    private const string ApiSecret = "155057be1ff06fa";

    public async Task<JsonDocument> ValidateLicense(string licenseKey, string machineId)
    {
        var client = new HttpClient();
        var request = new HttpRequestMessage(HttpMethod.Post, BaseUrl + "osdsarvaya_app.api.validate_license");
        
        request.Headers.Add("Authorization", $"token {ApiKey}:{ApiSecret}");
        request.Content = new StringContent(
            JsonSerializer.Serialize(new { license_key = licenseKey, machine_id = machineId }),
            Encoding.UTF8,
            "application/json"
        );

        var response = await client.SendAsync(request);
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }
}
```

### JavaScript / Node.js

```javascript
const axios = require('axios');

const API_KEY = 'a652ccfadaa8917';
const API_SECRET = '155057be1ff06fa';
const BASE_URL = 'https://dvarika.osduotech.com/api/method/';

async function validateLicense(licenseKey, machineId) {
    const response = await axios.post(
        BASE_URL + 'osdsarvaya_app.api.validate_license',
        { license_key: licenseKey, machine_id: machineId },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${API_KEY}:${API_SECRET}`
            }
        }
    );
    return response.data.message;
}

async function activateLicense(licenseKey, machineId) {
    const response = await axios.post(
        BASE_URL + 'osdsarvaya_app.api.activate_license',
        { license_key: licenseKey, machine_id: machineId },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `token ${API_KEY}:${API_SECRET}`
            }
        }
    );
    return response.data.message;
}
```

---

## Implementation Guidelines

### 1. On Application Startup
```
1. Read stored license_key from local config
2. Get machine_id (generate if not exists)
3. Call validate_license(license_key, machine_id)
4. If valid: Allow app to run
5. If invalid: Show error, prompt to contact support
```

### 2. First-Time Activation
```
1. User enters license_key (provided by admin)
2. Get/Generate machine_id
3. Call activate_license(license_key, machine_id)
4. If success: Store license_key, allow app to run
5. If failure: Show error message
```

### 3. Periodic Validation (Recommended)
```
- Validate license on app startup
- Re-validate every 24 hours or on significant app events
- If validation fails: Disable app functionality, show message
```

### 4. Machine ID Generation
```
- Use hardware ID (CPU, motherboard serial)
- Or use OS-specific identifier
- Should be unique per machine
- Should not change on hardware upgrades
```

---

## Error Codes

| Error Message | Meaning |
|---------------|---------|
| License key not found | Invalid license key |
| License is not active | License is inactive |
| License is bound to a different machine | License already activated on another machine |
| License already activated on a different machine | Machine mismatch |

---

## Test License Keys

| License Key | Customer | Status |
|-------------|----------|--------|
| OSDS-Q02V-BRE9-JGNF | 1004-00001 | Active |

---

## Support

For issues or questions:
- Email: support@osduotech.com

---

*Document Version: 1.0*
*Created: 2026-02-28*
*For: OSDuo Tech - OSDSarvaya Licensing*
