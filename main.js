// ====================
// SMART LEAD FINDER - Automatically skips previously scraped companies
// ====================

import { Actor } from 'apify';
import { PuppeteerCrawler } from 'crawlee';

await Actor.init();

const input = await Actor.getInput() || {};
const {
    searchQuery = 'tech companies',
    location = 'New York',
    maxResults = 50,
    targetIndustry = null,
    includeWebsiteData = true,
    skipDuplicates = true,
    proxyConfiguration = { useApifyProxy: true }
} = input;

console.log('🚀 Starting Smart Lead Finder (No Duplicates)...');
console.log(`Search: "${searchQuery}" in "${location}"`);
console.log(`Max Results: ${maxResults}`);
console.log(`Skip Duplicates: ${skipDuplicates ? 'YES' : 'NO'}`);

// Track processed companies
const processedWebsites = new Set();
const processedNames = new Set();
let scrapedCompaniesHistory = new Set();

// Load previously scraped companies from Key-Value Store
if (skipDuplicates) {
    try {
        const kvStore = await Actor.openKeyValueStore();
        const history = await kvStore.getValue('SCRAPED_COMPANIES_HISTORY');
        
        if (history && Array.isArray(history)) {
            scrapedCompaniesHistory = new Set(history);
            console.log(`📚 Loaded ${scrapedCompaniesHistory.size} previously scraped companies`);
        } else {
            console.log('📚 No previous scraping history found - starting fresh');
        }
    } catch (error) {
        console.log('⚠️  Could not load history:', error.message);
    }
}

const createLeadObject = () => ({
    companyName: null,
    websiteUrl: null,
    industry: null,
    location: null,
    companySize: null,
    companyType: null,
    decisionMakerName: null,
    decisionMakerRole: null,
    email: null,
    phone: null,
    linkedIn: null,
    facebook: null,
    twitter: null,
    instagram: null,
    websiteQualityScore: null,
    websiteQualityRating: null,
    brandingNeeds: null,
    leadScore: 0,
    source: 'Google Maps',
    searchQuery: searchQuery,
    searchLocation: location,
    scrapedAt: new Date().toISOString(),
    errors: []
});

// Helper function to create unique company identifier
function getCompanyIdentifier(company) {
    // Use website URL if available, otherwise use name + location
    if (company.website) {
        return company.website.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    }
    return `${company.name.toLowerCase()}_${(company.address || company.fullAddress || '').toLowerCase()}`.replace(/\s+/g, '_');
}

function isAlreadyScraped(company) {
    const identifier = getCompanyIdentifier(company);
    return scrapedCompaniesHistory.has(identifier);
}

function markAsScraped(company) {
    const identifier = getCompanyIdentifier(company);
    scrapedCompaniesHistory.add(identifier);
}

// ====================
// GOOGLE MAPS SCRAPER with PAGINATION
// ====================

async function scrapeGoogleMaps(searchTerm, locationTerm, maxCount) {
    console.log('🗺️  Searching Google Maps...');
    
    const proxyConfig = await Actor.createProxyConfiguration(proxyConfiguration);
    const allResults = [];
    let scrollAttempts = 0;
    const maxScrollAttempts = 20; // Scroll more to find more unique companies

    const mapsCrawler = new PuppeteerCrawler({
        proxyConfiguration: proxyConfig,
        
        async requestHandler({ page }) {
            const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchTerm + ' ' + locationTerm)}`;
            
            await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await page.waitForTimeout(3000);

            console.log('🔄 Scrolling to load more results...');

            // Aggressive scrolling to find MORE companies
            while (scrollAttempts < maxScrollAttempts && allResults.length < maxCount * 3) {
                await page.evaluate(() => {
                    const scrollableDiv = document.querySelector('div[role="feed"]');
                    if (scrollableDiv) {
                        scrollableDiv.scrollTop = scrollableDiv.scrollHeight;
                    }
                });
                
                await page.waitForTimeout(2000);
                scrollAttempts++;

                // Check current count
                const currentCount = await page.evaluate(() => {
                    return document.querySelectorAll('div[role="article"]').length;
                });

                if (currentCount > 0 && scrollAttempts % 5 === 0) {
                    console.log(`  📊 Found ${currentCount} items so far... (scroll ${scrollAttempts}/${maxScrollAttempts})`);
                }
            }

            console.log('✓ Finished scrolling, extracting data...');

            // Extract business data
            const businesses = await page.evaluate(() => {
                const results = [];
                const items = document.querySelectorAll('div[role="article"]');
                
                items.forEach(item => {
                    try {
                        const nameEl = item.querySelector('div.fontHeadlineSmall');
                        const name = nameEl ? nameEl.textContent.trim() : null;
                        
                        const ratingEl = item.querySelector('span[role="img"]');
                        const rating = ratingEl ? ratingEl.getAttribute('aria-label') : null;
                        
                        const addressEl = item.querySelector('div.fontBodyMedium');
                        const address = addressEl ? addressEl.textContent.trim() : null;
                        
                        const link = item.querySelector('a');
                        const href = link ? link.href : null;
                        
                        if (name) {
                            results.push({
                                name,
                                rating,
                                address,
                                mapsUrl: href
                            });
                        }
                    } catch (e) {
                        console.log('Error extracting item:', e);
                    }
                });
                
                return results;
            });

            console.log(`✓ Found ${businesses.length} total businesses from Google Maps`);

            // Filter out duplicates from previous scraping sessions
            let newBusinessesCount = 0;
            let skippedCount = 0;

            for (const business of businesses) {
                if (allResults.length >= maxCount) break;

                // Check if already scraped
                if (skipDuplicates && isAlreadyScraped(business)) {
                    skippedCount++;
                    console.log(`  ⏭️  Skipping ${business.name} (already scraped before)`);
                    continue;
                }

                // Check if already in current batch
                const identifier = getCompanyIdentifier(business);
                if (processedNames.has(identifier)) {
                    continue;
                }

                try {
                    if (business.mapsUrl) {
                        await page.goto(business.mapsUrl, { waitUntil: 'networkidle2', timeout: 20000 });
                        await page.waitForTimeout(2000);

                        const details = await page.evaluate(() => {
                            const websiteLink = Array.from(document.querySelectorAll('a'))
                                .find(a => a.href && (a.href.includes('http') && !a.href.includes('google.com') && !a.href.includes('maps')));
                            
                            const phoneButton = Array.from(document.querySelectorAll('button'))
                                .find(btn => btn.getAttribute('data-item-id')?.includes('phone'));
                            const phone = phoneButton ? phoneButton.getAttribute('data-item-id')?.split(':')[1] : null;

                            const addressButton = Array.from(document.querySelectorAll('button'))
                                .find(btn => btn.getAttribute('data-item-id')?.includes('address'));
                            const address = addressButton ? addressButton.textContent.trim() : null;

                            return {
                                website: websiteLink ? websiteLink.href : null,
                                phone: phone,
                                fullAddress: address
                            };
                        });

                        const enrichedBusiness = { ...business, ...details };
                        allResults.push(enrichedBusiness);
                        processedNames.add(identifier);
                        newBusinessesCount++;

                        console.log(`  ✓ ${business.name} (NEW) - Website: ${details.website ? '✓' : '✗'}`);
                    }
                } catch (e) {
                    console.log(`  ✗ Error getting details for ${business.name}:`, e.message);
                    allResults.push(business);
                }

                if (allResults.length >= maxCount) break;
            }

            console.log(`\n📊 Summary:`);
            console.log(`  • New businesses found: ${newBusinessesCount}`);
            console.log(`  • Skipped (already scraped): ${skippedCount}`);
            console.log(`  • Total in this run: ${allResults.length}`);
        },
        
        maxRequestsPerCrawl: 1,
        maxConcurrency: 1,
    });

    await mapsCrawler.run([{ url: 'https://www.google.com/maps' }]);
    
    return allResults;
}

// ====================
// WEBSITE ENRICHMENT FUNCTIONS
// ====================

async function extractEmail(page) {
    try {
        return await page.evaluate(() => {
            const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
            const bodyText = document.body.innerText;
            const emails = bodyText.match(emailRegex) || [];
            const goodEmail = emails.find(email => {
                const lower = email.toLowerCase();
                return !lower.includes('example.com') &&
                       !lower.includes('yourdomain') &&
                       !lower.includes('placeholder') &&
                       !lower.startsWith('noreply') &&
                       !lower.startsWith('no-reply') &&
                       !lower.includes('privacy@') &&
                       !lower.includes('abuse@');
            });
            return goodEmail || null;
        });
    } catch (error) {
        return null;
    }
}

async function extractSocialLinks(page) {
    try {
        return await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href]'));
            const social = { linkedIn: null, facebook: null, twitter: null, instagram: null };
            links.forEach(link => {
                const href = link.href.toLowerCase();
                if (href.includes('linkedin.com') && !social.linkedIn) social.linkedIn = link.href;
                else if (href.includes('facebook.com') && !social.facebook) social.facebook = link.href;
                else if ((href.includes('twitter.com') || href.includes('x.com')) && !social.twitter) social.twitter = link.href;
                else if (href.includes('instagram.com') && !social.instagram) social.instagram = link.href;
            });
            return social;
        });
    } catch (error) {
        return { linkedIn: null, facebook: null, twitter: null, instagram: null };
    }
}

async function detectIndustry(page) {
    try {
        return await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            const metaDescription = document.querySelector('meta[name="description"]');
            const fullText = text + (metaDescription ? metaDescription.content.toLowerCase() : '');
            const industries = {
                'Technology': ['software', 'saas', 'tech', 'digital', 'app', 'platform', 'cloud', 'IT', 'development'],
                'Healthcare': ['health', 'medical', 'hospital', 'clinic', 'dental', 'pharmacy', 'wellness'],
                'Finance': ['finance', 'bank', 'accounting', 'insurance', 'investment', 'financial'],
                'Real Estate': ['real estate', 'property', 'realtor', 'mortgage', 'housing'],
                'Retail': ['retail', 'shop', 'store', 'ecommerce', 'boutique'],
                'Restaurant': ['restaurant', 'cafe', 'food', 'dining', 'catering'],
                'Legal': ['law', 'legal', 'attorney', 'lawyer', 'firm'],
                'Education': ['education', 'school', 'training', 'learning', 'university'],
                'Construction': ['construction', 'builder', 'contractor', 'renovation'],
                'Marketing': ['marketing', 'advertising', 'agency', 'branding', 'seo']
            };
            for (const [industry, keywords] of Object.entries(industries)) {
                if (keywords.some(keyword => fullText.includes(keyword))) return industry;
            }
            return 'Other';
        });
    } catch (error) {
        return 'Unknown';
    }
}

async function assessWebsiteQuality(page) {
    try {
        const metrics = await page.evaluate(() => {
            return {
                hasSSL: window.location.protocol === 'https:',
                hasMobileMeta: !!document.querySelector('meta[name="viewport"]'),
                hasLogo: !!document.querySelector('img[alt*="logo" i], img[class*="logo" i]'),
                hasContactPage: !!document.querySelector('a[href*="contact" i]'),
                imageCount: document.querySelectorAll('img').length,
                hasModernDesign: !!document.querySelector('[class*="flex"], [class*="grid"]'),
                hasSocialLinks: document.querySelectorAll('a[href*="facebook.com"], a[href*="linkedin.com"]').length > 0,
            };
        });
        let score = 0;
        if (metrics.hasSSL) score += 20;
        if (metrics.hasMobileMeta) score += 20;
        if (metrics.hasLogo) score += 15;
        if (metrics.hasContactPage) score += 10;
        if (metrics.imageCount >= 5) score += 10;
        if (metrics.hasModernDesign) score += 15;
        if (metrics.hasSocialLinks) score += 10;
        let rating = score >= 70 ? 'Good' : score >= 40 ? 'Average' : 'Poor';
        return { score, rating, needsBranding: score < 50 };
    } catch (error) {
        return { score: 0, rating: 'Unknown', needsBranding: true };
    }
}

async function findDecisionMakers(page) {
    try {
        const teamPageUrl = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const teamLink = links.find(a => /team|about|leadership/i.test(a.textContent) || /team|about|leadership/i.test(a.href));
            return teamLink ? teamLink.href : null;
        });
        if (teamPageUrl) await page.goto(teamPageUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        return await page.evaluate(() => {
            const titles = ['CEO', 'Founder', 'Co-Founder', 'President', 'Director', 'Owner'];
            const text = document.body.innerText;
            for (const title of titles) {
                const regex = new RegExp(`([A-Z][a-z]+\\s+[A-Z][a-z]+)(?:.*?)${title}`, 'i');
                const match = text.match(regex);
                if (match) return { name: match[1].trim(), role: title };
            }
            return null;
        });
    } catch (error) {
        return null;
    }
}

function calculateLeadScore(data) {
    let score = 0;
    if (data.email) score += 20;
    if (data.phone) score += 15;
    if (data.decisionMakerName) score += 5;
    if (data.websiteQualityScore !== null) {
        if (data.websiteQualityScore < 40) score += 30;
        else if (data.websiteQualityScore < 70) score += 20;
        else score += 10;
    }
    if (data.linkedIn) score += 5;
    if (data.facebook) score += 5;
    if (data.twitter || data.instagram) score += 5;
    if (data.industry && data.industry !== 'Unknown') score += 5;
    if (data.location) score += 5;
    if (data.companyName) score += 5;
    return Math.min(score, 100);
}

async function enrichWithWebsiteData(company) {
    if (!company.website) {
        console.log(`  ⚠️  No website for ${company.name}`);
        return company;
    }
    if (processedWebsites.has(company.website)) {
        console.log(`  ⏭️  Already processed ${company.website}`);
        return company;
    }
    processedWebsites.add(company.website);
    console.log(`  🔍 Enriching ${company.name}...`);

    const leadData = createLeadObject();
    leadData.companyName = company.name;
    leadData.websiteUrl = company.website;
    leadData.phone = company.phone || null;
    leadData.location = company.address || company.fullAddress || null;

    const proxyConfig = await Actor.createProxyConfiguration(proxyConfiguration);
    const enrichmentCrawler = new PuppeteerCrawler({
        proxyConfiguration: proxyConfig,
        async requestHandler({ page }) {
            try {
                await page.goto(company.website, { waitUntil: 'networkidle2', timeout: 30000 });
                if (!leadData.phone) {
                    leadData.phone = await page.evaluate(() => {
                        const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
                        const bodyText = document.body.innerText;
                        const phones = bodyText.match(phoneRegex);
                        return phones && phones.length > 0 ? phones[0].trim() : null;
                    });
                }
                leadData.email = await extractEmail(page);
                const socialLinks = await extractSocialLinks(page);
                Object.assign(leadData, socialLinks);
                leadData.industry = await detectIndustry(page);
                const websiteQuality = await assessWebsiteQuality(page);
                leadData.websiteQualityScore = websiteQuality.score;
                leadData.websiteQualityRating = websiteQuality.rating;
                leadData.brandingNeeds = websiteQuality.needsBranding;
                const decisionMaker = await findDecisionMakers(page);
                if (decisionMaker) {
                    leadData.decisionMakerName = decisionMaker.name;
                    leadData.decisionMakerRole = decisionMaker.role;
                }
                leadData.leadScore = calculateLeadScore(leadData);
                console.log(`  ✓ ${company.name} - Score: ${leadData.leadScore} | Email: ${leadData.email ? '✓' : '✗'}`);
            } catch (error) {
                console.error(`  ✗ Error enriching ${company.name}:`, error.message);
                leadData.errors.push(error.message);
            }
        },
        maxRequestsPerCrawl: 1,
        maxConcurrency: 1,
        requestHandlerTimeoutSecs: 60,
    });
    await enrichmentCrawler.run([{ url: company.website }]);
    return leadData;
}

// ====================
// MAIN EXECUTION
// ====================

try {
    const businesses = await scrapeGoogleMaps(searchQuery, location, maxResults);
    console.log(`\n✓ Found ${businesses.length} NEW businesses\n`);

    if (businesses.length === 0) {
        console.log('❌ No NEW businesses found. All companies in this search were already scraped!');
        console.log('💡 Try: Different location, different search query, or disable skipDuplicates');
        await Actor.exit();
    }

    if (includeWebsiteData) {
        console.log('🔍 Starting website enrichment...\n');
        for (const business of businesses) {
            const enrichedLead = await enrichWithWebsiteData(business);
            if (targetIndustry && enrichedLead.industry !== targetIndustry) {
                console.log(`  ⏭️  Skipping ${business.name} - Industry mismatch`);
                continue;
            }
            await Actor.pushData(enrichedLead);
            markAsScraped(business);
        }
    } else {
        for (const business of businesses) {
            const basicLead = createLeadObject();
            basicLead.companyName = business.name;
            basicLead.websiteUrl = business.website;
            basicLead.phone = business.phone;
            leadData.location = business.address || business.fullAddress;
            await Actor.pushData(basicLead);
            markAsScraped(business);
        }
    }

    // Save updated history
    if (skipDuplicates) {
        const kvStore = await Actor.openKeyValueStore();
        await kvStore.setValue('SCRAPED_COMPANIES_HISTORY', Array.from(scrapedCompaniesHistory));
        console.log(`\n💾 Saved ${scrapedCompaniesHistory.size} companies to history`);
    }

    console.log('\n✅ Lead scraping completed!');
    console.log(`Total NEW leads saved: ${businesses.length}`);

} catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
}

await Actor.exit();