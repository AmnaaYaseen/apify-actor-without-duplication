# 🚀 Automatic Lead Finder & Enrichment Actor

**Automatically discover companies** based on industry and location, then enrich with complete contact details. No manual URL lists needed!

## ✨ What This Actor Does

1. **🔍 Searches Google Maps** for businesses matching your criteria
2. **🌐 Extracts Website URLs** from business listings
3. **📧 Enriches Data** by visiting each website to find:
   - Email addresses
   - Decision maker names & roles
   - Social media links
   - Industry classification
   - Website quality assessment
   - Lead scoring

## 🎯 Perfect For

- **Sales Teams**: Build targeted prospect lists automatically
- **Marketing Agencies**: Find potential clients needing services
- **Business Development**: Research companies in specific markets
- **Lead Generation**: Create qualified B2B lead databases
- **Market Research**: Analyze competitors and market presence

---

## 📥 Input Examples

### Example 1: Find Tech Companies in San Francisco
```json
{
  "searchQuery": "tech companies",
  "location": "San Francisco, CA",
  "maxResults": 50,
  "targetIndustry": "Technology",
  "includeWebsiteData": true
}
```

### Example 2: Find Dental Clinics in Chicago
```json
{
  "searchQuery": "dental clinics",
  "location": "Chicago, IL",
  "maxResults": 30,
  "targetIndustry": "Healthcare",
  "includeWebsiteData": true
}
```

### Example 3: Find Law Firms in New York
```json
{
  "searchQuery": "law firms",
  "location": "New York, NY",
  "maxResults": 40,
  "targetIndustry": "Legal",
  "includeWebsiteData": true
}
```

### Example 4: Find Marketing Agencies in London
```json
{
  "searchQuery": "marketing agencies",
  "location": "London, UK",
  "maxResults": 25,
  "targetIndustry": "Marketing",
  "includeWebsiteData": true
}
```

### Example 5: Quick Search (No Website Enrichment)
```json
{
  "searchQuery": "restaurants",
  "location": "Los Angeles",
  "maxResults": 100,
  "includeWebsiteData": false
}
```

---

## 🎨 Search Query Ideas

| Industry | Example Queries |
|----------|----------------|
| **Technology** | `"software companies"`, `"IT companies"`, `"SaaS companies"`, `"web development agencies"` |
| **Healthcare** | `"medical clinics"`, `"dental offices"`, `"chiropractors"`, `"physical therapy"` |
| **Legal** | `"law firms"`, `"attorneys"`, `"legal services"`, `"immigration lawyers"` |
| **Real Estate** | `"real estate agents"`, `"property management"`, `"realtors"` |
| **Finance** | `"accounting firms"`, `"financial advisors"`, `"insurance agencies"` |
| **Construction** | `"contractors"`, `"home builders"`, `"construction companies"` |
| **Retail** | `"boutiques"`, `"clothing stores"`, `"retail shops"` |
| **Food & Beverage** | `"restaurants"`, `"cafes"`, `"catering services"`, `"bakeries"` |
| **Marketing** | `"digital marketing agencies"`, `"advertising agencies"`, `"branding companies"` |
| **Education** | `"tutoring services"`, `"training centers"`, `"online courses"` |

---

## 📊 Output Data

Each lead contains:

```json
{
  "companyName": "TechStartup Inc",
  "websiteUrl": "https://techstartup.com",
  "industry": "Technology",
  "location": "San Francisco, CA",
  "companySize": null,
  "companyType": null,
  "decisionMakerName": "John Smith",
  "decisionMakerRole": "CEO",
  "email": "contact@techstartup.com",
  "phone": "+1-415-555-0123",
  "linkedIn": "https://linkedin.com/company/techstartup",
  "facebook": "https://facebook.com/techstartup",
  "twitter": "https://twitter.com/techstartup",
  "instagram": "https://instagram.com/techstartup",
  "websiteQualityScore": 75,
  "websiteQualityRating": "Good",
  "brandingNeeds": false,
  "leadScore": 85,
  "source": "Google Maps",
  "scrapedAt": "2024-01-15T10:30:00.000Z",
  "errors": []
}
```

---

## ⚙️ Configuration Guide

### `searchQuery` (Required)
What type of businesses to find. Be specific!
- ✅ Good: `"software companies"`, `"dental clinics"`, `"real estate agents"`
- ❌ Bad: `"businesses"`, `"companies"`, `"services"`

### `location` (Required)
Where to search. Can be:
- City: `"Chicago"`, `"Miami"`
- City + State: `"Austin, TX"`, `"Seattle, WA"`
- Country: `"United Kingdom"`, `"Canada"`
- Region: `"Silicon Valley"`, `"Manhattan"`

### `maxResults` (Optional, default: 50)
How many companies to find. Range: 5-200
- Small test: `10-20`
- Medium campaign: `50-100`
- Large campaign: `100-200`

### `targetIndustry` (Optional)
Filter results by industry after enrichment
- Leave empty to get all industries
- Or select: Technology, Healthcare, Finance, etc.

### `includeWebsiteData` (Optional, default: true)
- **true**: Visit websites to get emails, decision makers, etc. (slower, more complete)
- **false**: Just get basic Google Maps data (faster, less complete)

---

## 🚀 How to Use

### Step 1: Open Apify Console
Go to [console.apify.com](https://console.apify.com)

### Step 2: Create New Actor
1. Click **Actors** → **Create new**
2. Choose **Puppeteer & Playwright** template
3. Copy the code files into your actor

### Step 3: Configure Input
```json
{
  "searchQuery": "tech companies",
  "location": "New York",
  "maxResults": 20,
  "includeWebsiteData": true
}
```

### Step 4: Run & Download
1. Click **Start**
2. Wait 5-15 minutes (depends on maxResults)
3. Download as CSV/Excel from **Dataset** tab

---

## ⏱️ Performance

| Max Results | Website Enrichment | Estimated Time |
|-------------|-------------------|----------------|
| 10 | ✅ Yes | 5-10 minutes |
| 25 | ✅ Yes | 10-20 minutes |
| 50 | ✅ Yes | 20-40 minutes |
| 100 | ✅ Yes | 40-80 minutes |
| 50 | ❌ No | 3-5 minutes |
| 100 | ❌ No | 5-10 minutes |

---

## 💡 Pro Tips

### 1. Start Small
Begin with `maxResults: 10` to test your search query

### 2. Be Specific
- ✅ `"b2b saas companies"` → Better targeting
- ❌ `"companies"` → Too broad

### 3. Combine Location Types
- `"dental clinics in downtown Manhattan"`
- `"tech startups in Silicon Valley"`

### 4. Use Industry Filter
Set `targetIndustry` to focus results after enrichment

### 5. Batch Processing
For 500+ leads:
- Run multiple times with different locations
- Combine results in Google Sheets

### 6. Lead Scoring
Prioritize leads with scores 70+:
- High score = Good contact info + needs improvement
- Low score = Missing data or already good website

---

## 🎯 Lead Score Breakdown

| Score | Quality | What It Means |
|-------|---------|---------------|
| 80-100 | 🔥 Hot | Has email/phone + poor website (needs help!) |
| 60-79 | 🌡️ Warm | Good contact info, some missing data |
| 40-59 | ❄️ Cold | Limited contact info or good website |
| 0-39 | 🧊 Very Cold | Incomplete data, hard to reach |

---

## ⚠️ Important Notes

### Success Rates
- **Google Maps extraction**: 90-95% success
- **Website enrichment**: 60-80% success (many sites don't have public emails)
- **Decision makers**: 30-50% success (not all sites list leadership)

### Limitations
1. **Google Maps may block** after many requests (use Apify Proxy)
2. **Not all businesses have websites** (20-30% may not)
3. **Email detection** depends on websites displaying them publicly
4. **Rate limits** apply - don't run 1000+ at once

### Legal Compliance
- ✅ Only collects **publicly available** data
- ✅ GDPR compliant (can be deleted on request)
- ⚠️ Check your local laws for B2B outreach
- ⚠️ Use responsibly for legitimate business purposes

---

## 🔧 Troubleshooting

### "No businesses found"
- Try broader search query
- Check location spelling
- Make sure location exists on Google Maps

### "Too few results"
- Increase `maxResults`
- Broaden search query (e.g., "companies" instead of "b2b saas companies")
- Try different location

### "Missing emails/phones"
- Normal! Not all websites display this info
- Consider using external enrichment APIs (Hunter.io, Apollo.io)
- Focus on leads with higher lead scores

### "Actor running too long"
- Reduce `maxResults`
- Set `includeWebsiteData: false` for faster results
- Check if some websites are timing out (check logs)

---

## 📈 Next Steps

### Export & Use
1. **Download CSV** → Import to Excel/Google Sheets
2. **Connect to CRM** → HubSpot, Salesforce, Pipedrive
3. **Email Campaigns** → Mailchimp, SendGrid
4. **Cold Outreach** → LinkedIn, email sequences

### Enhance Data
- Use **Hunter.io API** for email verification
- Use **Clearbit** for company enrichment
- Use **LinkedIn Sales Navigator** for decision makers

---

## 📞 Support

Need help? Check:
- [Apify Documentation](https://docs.apify.com)
- [Crawlee Documentation](https://crawlee.dev)
- [Apify Community Forum](https://community.apify.com)

---

## 📄 License

Apache-2.0

---

**Ready to find leads automatically? Just tell it what to search for!** 🚀