import React, { useEffect, useState } from "react";

interface CompanyAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface CurrencyInfo {
  code: string;
  symbol: string;
}

interface CompanyProfileData {
  companyName: string;
  legalName: string;
  businessType: string;
  registrationNumber: string;
  industry: string;
  description: string;
  brandVoice: string;
  keyMessages: string[];
  targetAudience: string;
  websiteUrl: string;
  timeZone: string;
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  supportHours: string;
  primaryCurrency: CurrencyInfo;
  acceptedCurrencies: string[];
  preferredLanguages: string[];
  shippingRegions: string[];
  operatingCountries: string[];
  taxPolicy: string;
  vatNumber: string;
  returnPolicy: string;
  refundPolicy: string;
  warrantyPolicy: string;
  preferredMusicGenre: string;
  preferredVoiceType: string;
  preferredMusicLanguage: string;
  address: CompanyAddress;
  businessHours: string;
}

interface CompanyLocation {
  tempId: string;
  locationName: string;
  locationType: string;
  contactEmail: string;
  contactPhone: string;
  timezone: string;
  isPrimary: boolean;
  address: CompanyAddress;
  hoursNote: string;
}

interface CompanyFAQ {
  tempId: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  isActive: boolean;
}

const currencyOptions = [
  { code: "USD", label: "US Dollar (USD)", symbol: "$" },
  { code: "EUR", label: "Euro (EUR)", symbol: "€" },
  { code: "GBP", label: "British Pound (GBP)", symbol: "£" },
  { code: "CAD", label: "Canadian Dollar (CAD)", symbol: "$" },
  { code: "AUD", label: "Australian Dollar (AUD)", symbol: "$" },
  { code: "NGN", label: "Nigerian Naira (NGN)", symbol: "₦" },
  { code: "ZAR", label: "South African Rand (ZAR)", symbol: "R" },
  { code: "KES", label: "Kenyan Shilling (KES)", symbol: "KSh" },
  { code: "RWF", label: "Rwandan Franc (RWF)", symbol: "FRw" },
  { code: "GHS", label: "Ghanaian Cedi (GHS)", symbol: "₵" },
  { code: "INR", label: "Indian Rupee (INR)", symbol: "₹" },
  { code: "JPY", label: "Japanese Yen (JPY)", symbol: "¥" },
];

const timezoneOptions = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Africa/Nairobi",
  "Africa/Kigali",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
];

const generateTempId = () => Math.random().toString(36).substring(2, 11);

const emptyAddress: CompanyAddress = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const createEmptyLocation = (): CompanyLocation => ({
  tempId: generateTempId(),
  locationName: "",
  locationType: "",
  contactEmail: "",
  contactPhone: "",
  timezone: "",
  isPrimary: false,
  address: { ...emptyAddress },
  hoursNote: "",
});

const createEmptyFaq = (): CompanyFAQ => ({
  tempId: generateTempId(),
  question: "",
  answer: "",
  category: "",
  tags: [],
  isActive: true,
});

const CompanyProfile: React.FC = () => {
  const inputClass =
    "w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400";
  const labelClass = "block text-sm font-medium text-gray-300 mb-2";
  const [profile, setProfile] = useState<CompanyProfileData>({
    companyName: "",
    legalName: "",
    businessType: "",
    registrationNumber: "",
    industry: "",
    description: "",
    brandVoice: "",
    keyMessages: [],
    targetAudience: "",
    websiteUrl: "",
    timeZone: "",
    supportEmail: "",
    supportPhone: "",
    whatsappNumber: "",
    supportHours: "",
    primaryCurrency: { code: "", symbol: "" },
    acceptedCurrencies: [],
    preferredLanguages: [],
    shippingRegions: [],
    operatingCountries: [],
    taxPolicy: "",
    vatNumber: "",
    returnPolicy: "",
    refundPolicy: "",
    warrantyPolicy: "",
    preferredMusicGenre: "",
    preferredVoiceType: "",
    preferredMusicLanguage: "",
    address: { ...emptyAddress },
    businessHours: "",
  });
  const [locations, setLocations] = useState<CompanyLocation[]>([]);
  const [faqs, setFaqs] = useState<CompanyFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const handleListInput = (field: keyof CompanyProfileData, value: string) => {
    const parsed = value
      .split(/[,|\n]/)
      .map((entry) => entry.trim().toUpperCase())
      .filter(Boolean);
    setProfile((prev) => ({ ...prev, [field]: parsed }));
  };

  const handleAddressChange = (field: keyof CompanyAddress, value: string) => {
    setProfile((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
  };

  const updateProfile = (field: keyof CompanyProfileData, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const updateKeyMessages = (value: string) => {
    const messages = value
      .split("\n")
      .map((msg) => msg.trim())
      .filter(Boolean);
    setProfile((prev) => ({ ...prev, keyMessages: messages }));
  };

  const updateLocation = (
    tempId: string,
    field: keyof CompanyLocation,
    value: any,
  ) => {
    setLocations((prev) =>
      prev.map((loc) =>
        loc.tempId === tempId
          ? field === "address"
            ? { ...loc, address: value }
            : { ...loc, [field]: value }
          : loc,
      ),
    );
  };

  const updateLocationAddress = (
    tempId: string,
    field: keyof CompanyAddress,
    value: string,
  ) => {
    setLocations((prev) =>
      prev.map((loc) =>
        loc.tempId === tempId
          ? { ...loc, address: { ...loc.address, [field]: value } }
          : loc,
      ),
    );
  };

  const togglePrimaryLocation = (tempId: string) => {
    setLocations((prev) =>
      prev.map((loc) => ({ ...loc, isPrimary: loc.tempId === tempId })),
    );
  };

  const updateFaq = (tempId: string, field: keyof CompanyFAQ, value: any) => {
    setFaqs((prev) =>
      prev.map((faq) =>
        faq.tempId === tempId ? { ...faq, [field]: value } : faq,
      ),
    );
  };

  const handleFaqTagsChange = (tempId: string, value: string) => {
    const tags = value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    updateFaq(tempId, "tags", tags);
  };

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch("/api/company/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.profile) {
          const profileData = data.data.profile;
          setProfile({
            companyName: profileData.company_name || "",
            legalName: profileData.legal_name || "",
            businessType: profileData.business_type || "",
            registrationNumber: profileData.registration_number || "",
            industry: profileData.industry || "",
            description: profileData.company_description || "",
            brandVoice: profileData.brand_voice || "",
            keyMessages: profileData.key_messages || [],
            targetAudience: profileData.target_audience || "",
            websiteUrl: profileData.website_url || "",
            timeZone: profileData.time_zone || "",
            supportEmail: profileData.support_email || "",
            supportPhone: profileData.support_phone || "",
            whatsappNumber: profileData.whatsapp_number || "",
            supportHours: profileData.support_hours || "",
            primaryCurrency: {
              code: profileData.primary_currency_code || "",
              symbol: profileData.primary_currency_symbol || "",
            },
            acceptedCurrencies: profileData.accepted_currencies || [],
            preferredLanguages: profileData.preferred_languages || [],
            shippingRegions: profileData.shipping_regions || [],
            operatingCountries: profileData.operating_countries || [],
            taxPolicy: profileData.tax_policy || "",
            vatNumber: profileData.vat_number || "",
            returnPolicy: profileData.return_policy || "",
            refundPolicy: profileData.refund_policy || "",
            warrantyPolicy: profileData.warranty_policy || "",
            preferredMusicGenre: profileData.preferred_music_genre || "",
            preferredVoiceType: profileData.preferred_voice_type || "",
            preferredMusicLanguage: profileData.preferred_music_language || "",
            address: {
              line1: profileData.headquarters_address?.line1 || "",
              line2: profileData.headquarters_address?.line2 || "",
              city: profileData.headquarters_address?.city || "",
              state: profileData.headquarters_address?.state || "",
              postalCode: profileData.headquarters_address?.postalCode || "",
              country: profileData.headquarters_address?.country || "",
            },
            businessHours: profileData.business_hours?.notes || "",
          });

          const loadedLocations: CompanyLocation[] = (
            data.data.locations || []
          ).map((loc: any) => ({
            tempId: loc.id || generateTempId(),
            locationName: loc.location_name || "",
            locationType: loc.location_type || "",
            contactEmail: loc.contact_email || "",
            contactPhone: loc.contact_phone || "",
            timezone: loc.timezone || "",
            isPrimary: loc.is_primary || false,
            address: {
              line1: loc.address?.line1 || "",
              line2: loc.address?.line2 || "",
              city: loc.address?.city || "",
              state: loc.address?.state || "",
              postalCode: loc.address?.postalCode || "",
              country: loc.address?.country || "",
            },
            hoursNote: loc.hours?.notes || "",
          }));
          setLocations(
            loadedLocations.length ? loadedLocations : [createEmptyLocation()],
          );

          const loadedFaqs: CompanyFAQ[] = (data.data.faqs || []).map(
            (faq: any) => ({
              tempId: faq.id || generateTempId(),
              question: faq.question || "",
              answer: faq.answer || "",
              category: faq.category || "",
              tags: faq.tags || [],
              isActive: faq.is_active !== false,
            }),
          );
          setFaqs(loadedFaqs.length ? loadedFaqs : [createEmptyFaq()]);
        } else {
          setLocations([createEmptyLocation()]);
          setFaqs([createEmptyFaq()]);
        }
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
      setMessage({ type: "error", text: "Failed to load company profile" });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const payload = {
        ...profile,
        address: profile.address,
        businessHoursNotes: profile.businessHours,
        primaryCurrency: profile.primaryCurrency,
        acceptedCurrencies: profile.acceptedCurrencies,
        preferredLanguages: profile.preferredLanguages,
        shippingRegions: profile.shippingRegions,
        operatingCountries: profile.operatingCountries,
        locations: locations
          .filter((loc) => loc.locationName.trim() !== "")
          .map((loc) => ({
            locationName: loc.locationName,
            locationType: loc.locationType,
            contactEmail: loc.contactEmail,
            contactPhone: loc.contactPhone,
            timezone: loc.timezone,
            isPrimary: loc.isPrimary,
            address: loc.address,
            notes: loc.hoursNote,
          })),
        faqs: faqs
          .filter((faq) => faq.question.trim() && faq.answer.trim())
          .map((faq, index) => ({
            question: faq.question,
            answer: faq.answer,
            category: faq.category,
            tags: faq.tags,
            sortOrder: index,
            isActive: faq.isActive,
          })),
      };

      const response = await fetch("/api/company/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Company profile saved successfully!",
        });
        await loadProfile();
      } else {
        setMessage({ type: "error", text: "Failed to save company profile" });
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      setMessage({ type: "error", text: "Failed to save company profile" });
    } finally {
      setSaving(false);
    }
  };

  const calculateCompletion = () => {
    const required = [
      profile.companyName,
      profile.industry,
      profile.description,
      profile.brandVoice,
      profile.targetAudience,
      profile.primaryCurrency.code,
      profile.address.country,
      profile.supportEmail,
    ];
    const completed = required.filter(
      (value) => value && value.toString().trim() !== "",
    ).length;
    return Math.round((completed / required.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading company profile...</div>
      </div>
    );
  }

  const completion = calculateCompletion();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Company Knowledge Base
          </h2>
          <p className="text-gray-400 mt-1">
            Structure everything your agents need to know about your business.
          </p>
        </div>
        <button
          onClick={saveProfile}
          disabled={saving}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "💾 Saving..." : "💾 Save Profile"}
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-500/20 border border-green-500/30 text-green-300"
              : "bg-red-500/20 border border-red-500/30 text-red-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Business Identity */}
          <section className="bg-gray-700/50 border border-gray-600 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏢</span>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Business Identity
                </h3>
                <p className="text-sm text-gray-400">
                  Help agents introduce your company accurately.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Brand / Public Name *</label>
                <input
                  className={inputClass}
                  value={profile.companyName}
                  onChange={(e) => updateProfile("companyName", e.target.value)}
                  placeholder="Social Forx"
                />
              </div>
              <div>
                <label className={labelClass}>Legal Name</label>
                <input
                  className={inputClass}
                  value={profile.legalName}
                  onChange={(e) => updateProfile("legalName", e.target.value)}
                  placeholder="Social Forx LLC"
                />
              </div>
              <div>
                <label className={labelClass}>Industry *</label>
                <select
                  className={inputClass}
                  value={profile.industry}
                  onChange={(e) => updateProfile("industry", e.target.value)}
                >
                  <option value="">Select industry</option>
                  <option value="retail">Retail</option>
                  <option value="fashion">Fashion</option>
                  <option value="technology">Technology</option>
                  <option value="financial_services">Financial Services</option>
                  <option value="education">Education</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Business Type</label>
                <select
                  className={inputClass}
                  value={profile.businessType}
                  onChange={(e) =>
                    updateProfile("businessType", e.target.value)
                  }
                >
                  <option value="">Select type</option>
                  <option value="sole_proprietorship">
                    Sole Proprietorship
                  </option>
                  <option value="partnership">Partnership</option>
                  <option value="llc">LLC</option>
                  <option value="corporation">Corporation</option>
                  <option value="non_profit">Non Profit</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Registration / Tax Number</label>
                <input
                  className={inputClass}
                  value={profile.registrationNumber}
                  onChange={(e) =>
                    updateProfile("registrationNumber", e.target.value)
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Time Zone</label>
                <select
                  className={inputClass}
                  value={profile.timeZone}
                  onChange={(e) => updateProfile("timeZone", e.target.value)}
                >
                  <option value="">Select time zone</option>
                  {timezoneOptions.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Company Description *</label>
              <textarea
                className="input min-h-[120px]"
                value={profile.description}
                onChange={(e) => updateProfile("description", e.target.value)}
                placeholder="Share your mission, offering and the value you deliver."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Website URL</label>
                <input
                  className={inputClass}
                  value={profile.websiteUrl}
                  onChange={(e) => updateProfile("websiteUrl", e.target.value)}
                  placeholder="https://socialforx.com"
                />
              </div>
              <div>
                <label className={labelClass}>Primary Support Email</label>
                <input
                  className={inputClass}
                  value={profile.supportEmail}
                  onChange={(e) =>
                    updateProfile("supportEmail", e.target.value)
                  }
                  placeholder="support@socialforx.com"
                />
              </div>
              <div>
                <label className={labelClass}>Support Phone</label>
                <input
                  className={inputClass}
                  value={profile.supportPhone}
                  onChange={(e) =>
                    updateProfile("supportPhone", e.target.value)
                  }
                  placeholder="+1 555 123 4567"
                />
              </div>
              <div>
                <label className={labelClass}>WhatsApp / SMS Number</label>
                <input
                  className={inputClass}
                  value={profile.whatsappNumber}
                  onChange={(e) =>
                    updateProfile("whatsappNumber", e.target.value)
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>HQ Address Line 1</label>
                <input
                  className={inputClass}
                  value={profile.address.line1}
                  onChange={(e) => handleAddressChange("line1", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Address Line 2</label>
                <input
                  className={inputClass}
                  value={profile.address.line2}
                  onChange={(e) => handleAddressChange("line2", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input
                  className={inputClass}
                  value={profile.address.city}
                  onChange={(e) => handleAddressChange("city", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>State / Region</label>
                <input
                  className={inputClass}
                  value={profile.address.state}
                  onChange={(e) => handleAddressChange("state", e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Postal Code</label>
                <input
                  className={inputClass}
                  value={profile.address.postalCode}
                  onChange={(e) =>
                    handleAddressChange("postalCode", e.target.value)
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Country *</label>
                <input
                  className={inputClass}
                  value={profile.address.country}
                  onChange={(e) =>
                    handleAddressChange("country", e.target.value)
                  }
                  placeholder="United States"
                />
              </div>
            </div>
          </section>

          {/* Commerce Settings */}
          <section className="bg-gray-700/50 border border-gray-600 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💳</span>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Commerce Settings
                </h3>
                <p className="text-sm text-gray-400">
                  Currencies, tax policy and shipping insights.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Primary Currency *</label>
                <select
                  className={inputClass}
                  value={profile.primaryCurrency.code}
                  onChange={(e) => {
                    const option = currencyOptions.find(
                      (cur) => cur.code === e.target.value,
                    );
                    updateProfile("primaryCurrency", {
                      code: option?.code || "",
                      symbol: option?.symbol || "",
                    });
                  }}
                >
                  <option value="">Select currency</option>
                  {currencyOptions.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Support Hours / Time Window
                </label>
                <input
                  className={inputClass}
                  value={profile.supportHours}
                  onChange={(e) =>
                    updateProfile("supportHours", e.target.value)
                  }
                  placeholder="Mon - Fri, 9am - 6pm CAT"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Accepted Secondary Currencies
                </label>
                <input
                  className={inputClass}
                  value={profile.acceptedCurrencies.join(", ")}
                  onChange={(e) =>
                    handleListInput("acceptedCurrencies", e.target.value)
                  }
                  placeholder="USD, EUR, NGN"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Preferred Support Languages
                </label>
                <input
                  className={inputClass}
                  value={profile.preferredLanguages.join(", ")}
                  onChange={(e) =>
                    handleListInput("preferredLanguages", e.target.value)
                  }
                  placeholder="English, French, Swahili"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Shipping Regions / Countries
                </label>
                <input
                  className={inputClass}
                  value={profile.shippingRegions.join(", ")}
                  onChange={(e) =>
                    handleListInput("shippingRegions", e.target.value)
                  }
                  placeholder="US, Canada, UK, Nigeria"
                />
              </div>
              <div>
                <label className={labelClass}>Operating Countries</label>
                <input
                  className={inputClass}
                  value={profile.operatingCountries.join(", ")}
                  onChange={(e) =>
                    handleListInput("operatingCountries", e.target.value)
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Tax / VAT Policy</label>
                <textarea
                  className="input min-h-[90px]"
                  value={profile.taxPolicy}
                  onChange={(e) => updateProfile("taxPolicy", e.target.value)}
                  placeholder="e.g., VAT 18% applied to all domestic orders."
                />
              </div>
              <div>
                <label className={labelClass}>
                  VAT / Tax Registration Number
                </label>
                <input
                  className={inputClass}
                  value={profile.vatNumber}
                  onChange={(e) => updateProfile("vatNumber", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Return Policy Summary</label>
                <textarea
                  className="input min-h-[90px]"
                  value={profile.returnPolicy}
                  onChange={(e) =>
                    updateProfile("returnPolicy", e.target.value)
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Refund Policy</label>
                <textarea
                  className="input min-h-[90px]"
                  value={profile.refundPolicy}
                  onChange={(e) =>
                    updateProfile("refundPolicy", e.target.value)
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Warranty / Guarantee</label>
                <textarea
                  className="input min-h-[90px]"
                  value={profile.warrantyPolicy}
                  onChange={(e) =>
                    updateProfile("warrantyPolicy", e.target.value)
                  }
                />
              </div>
            </div>
          </section>

          {/* Brand Voice & Audience */}
          <section className="bg-gray-700/50 border border-gray-600 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎙️</span>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Brand Voice & Audience
                </h3>
                <p className="text-sm text-gray-400">
                  Define tone, messaging and who you serve.
                </p>
              </div>
            </div>
            <div>
              <label className={labelClass}>Brand Voice Description *</label>
              <textarea
                className="input min-h-[100px]"
                value={profile.brandVoice}
                onChange={(e) => updateProfile("brandVoice", e.target.value)}
                placeholder="Professional, innovative, warm..."
              />
            </div>
            <div>
              <label className={labelClass}>Key Messages (one per line)</label>
              <textarea
                className="input min-h-[120px]"
                value={profile.keyMessages.join("\n")}
                onChange={(e) => updateKeyMessages(e.target.value)}
                placeholder="We champion sustainable fashion...\nFree shipping on all orders...\nTrusted by 50K customers..."
              />
            </div>
            <div>
              <label className={labelClass}>Primary Audience *</label>
              <input
                className={inputClass}
                value={profile.targetAudience}
                onChange={(e) =>
                  updateProfile("targetAudience", e.target.value)
                }
                placeholder="Young adults, 18-30, fashion-forward shoppers."
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>
                  Preferred Music Genre (for agent content)
                </label>
                <select
                  className={inputClass}
                  value={profile.preferredMusicGenre}
                  onChange={(e) =>
                    updateProfile("preferredMusicGenre", e.target.value)
                  }
                >
                  <option value="">Auto-detect</option>
                  <option value="afrobeats">Afrobeats</option>
                  <option value="hip-hop">Hip-Hop</option>
                  <option value="rnb">R&B / Soul</option>
                  <option value="pop">Pop</option>
                  <option value="electronic">Electronic</option>
                  <option value="rock">Rock</option>
                  <option value="jazz">Jazz</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Preferred Voice Type</label>
                <select
                  className={inputClass}
                  value={profile.preferredVoiceType}
                  onChange={(e) =>
                    updateProfile("preferredVoiceType", e.target.value)
                  }
                >
                  <option value="">Auto</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Preferred Lyrics Language</label>
                <input
                  className={inputClass}
                  value={profile.preferredMusicLanguage}
                  onChange={(e) =>
                    updateProfile("preferredMusicLanguage", e.target.value)
                  }
                  placeholder="English"
                />
              </div>
            </div>
          </section>

          {/* Locations */}
          <section className="bg-gray-700/50 border border-gray-600 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Store & Office Locations
                  </h3>
                  <p className="text-sm text-gray-400">
                    Help agents recommend nearby locations or pickup spots.
                  </p>
                </div>
              </div>
              <button
                className="text-sm text-purple-300 hover:text-purple-100"
                onClick={() =>
                  setLocations((prev) => [...prev, createEmptyLocation()])
                }
              >
                + Add Location
              </button>
            </div>
            {locations.map((location, index) => (
              <div
                key={location.tempId}
                className="border border-gray-600 rounded-lg p-4 space-y-3 bg-gray-800/40"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">Location #{index + 1}</p>
                  {locations.length > 1 && (
                    <button
                      className="text-xs text-red-300"
                      onClick={() =>
                        setLocations((prev) =>
                          prev.filter((loc) => loc.tempId !== location.tempId),
                        )
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Location Name *</label>
                    <input
                      className={inputClass}
                      value={location.locationName}
                      onChange={(e) =>
                        updateLocation(
                          location.tempId,
                          "locationName",
                          e.target.value,
                        )
                      }
                      placeholder="Main Flagship Store"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Type</label>
                    <select
                      className={inputClass}
                      value={location.locationType}
                      onChange={(e) =>
                        updateLocation(
                          location.tempId,
                          "locationType",
                          e.target.value,
                        )
                      }
                    >
                      <option value="">Select type</option>
                      <option value="hq">Headquarters</option>
                      <option value="store">Retail Store</option>
                      <option value="warehouse">Warehouse</option>
                      <option value="pickup">Pickup Point</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Contact Email</label>
                    <input
                      className={inputClass}
                      value={location.contactEmail}
                      onChange={(e) =>
                        updateLocation(
                          location.tempId,
                          "contactEmail",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Contact Phone</label>
                    <input
                      className={inputClass}
                      value={location.contactPhone}
                      onChange={(e) =>
                        updateLocation(
                          location.tempId,
                          "contactPhone",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Time Zone</label>
                    <select
                      className={inputClass}
                      value={location.timezone}
                      onChange={(e) =>
                        updateLocation(
                          location.tempId,
                          "timezone",
                          e.target.value,
                        )
                      }
                    >
                      <option value="">Select time zone</option>
                      {timezoneOptions.map((zone) => (
                        <option key={zone} value={zone}>
                          {zone}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      id={`primary-${location.tempId}`}
                      type="checkbox"
                      checked={location.isPrimary}
                      onChange={() => togglePrimaryLocation(location.tempId)}
                    />
                    <label
                      htmlFor={`primary-${location.tempId}`}
                      className="text-sm text-gray-300"
                    >
                      Primary / Default Location
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Address Line 1</label>
                    <input
                      className={inputClass}
                      value={location.address.line1}
                      onChange={(e) =>
                        updateLocationAddress(
                          location.tempId,
                          "line1",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Address Line 2</label>
                    <input
                      className={inputClass}
                      value={location.address.line2}
                      onChange={(e) =>
                        updateLocationAddress(
                          location.tempId,
                          "line2",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>City</label>
                    <input
                      className={inputClass}
                      value={location.address.city}
                      onChange={(e) =>
                        updateLocationAddress(
                          location.tempId,
                          "city",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Country</label>
                    <input
                      className={inputClass}
                      value={location.address.country}
                      onChange={(e) =>
                        updateLocationAddress(
                          location.tempId,
                          "country",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Operating Hours / Notes</label>
                  <textarea
                    className="input min-h-[80px]"
                    value={location.hoursNote}
                    onChange={(e) =>
                      updateLocation(
                        location.tempId,
                        "hoursNote",
                        e.target.value,
                      )
                    }
                    placeholder="Mon-Fri 9am-8pm, Sat 10am-6pm"
                  />
                </div>
              </div>
            ))}
          </section>

          {/* FAQ Manager */}
          <section className="bg-gray-700/50 border border-gray-600 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">❓</span>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    FAQs & Help Snippets
                  </h3>
                  <p className="text-sm text-gray-400">
                    Agents will use these verbatim when answering.
                  </p>
                </div>
              </div>
              <button
                className="text-sm text-purple-300 hover:text-purple-100"
                onClick={() => setFaqs((prev) => [...prev, createEmptyFaq()])}
              >
                + Add FAQ
              </button>
            </div>
            {faqs.map((faq, index) => (
              <div
                key={faq.tempId}
                className="border border-gray-600 rounded-lg p-4 space-y-3 bg-gray-800/40"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">FAQ #{index + 1}</p>
                  {faqs.length > 1 && (
                    <button
                      className="text-xs text-red-300"
                      onClick={() =>
                        setFaqs((prev) =>
                          prev.filter((item) => item.tempId !== faq.tempId),
                        )
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Question *</label>
                    <input
                      className={inputClass}
                      value={faq.question}
                      onChange={(e) =>
                        updateFaq(faq.tempId, "question", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Category / Topic</label>
                    <input
                      className={inputClass}
                      value={faq.category}
                      onChange={(e) =>
                        updateFaq(faq.tempId, "category", e.target.value)
                      }
                      placeholder="Shipping, Payments, Returns..."
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Answer *</label>
                  <textarea
                    className="input min-h-[80px]"
                    value={faq.answer}
                    onChange={(e) =>
                      updateFaq(faq.tempId, "answer", e.target.value)
                    }
                    placeholder="Provide a clear, friendly response the agent can reuse."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Tags (comma separated)</label>
                    <input
                      className={inputClass}
                      value={faq.tags.join(", ")}
                      onChange={(e) =>
                        handleFaqTagsChange(faq.tempId, e.target.value)
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      id={`faq-active-${faq.tempId}`}
                      type="checkbox"
                      checked={faq.isActive}
                      onChange={(e) =>
                        updateFaq(faq.tempId, "isActive", e.target.checked)
                      }
                    />
                    <label
                      htmlFor={`faq-active-${faq.tempId}`}
                      className="text-sm text-gray-300"
                    >
                      Publish / allow agents to use
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* Preview + Completion */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-purple-200 mb-4">
              🔮 AI Agent Preview
            </h3>
            <div className="space-y-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">
                  User: “What does your company do?”
                </p>
                <p className="text-sm text-gray-100 bg-gray-800/60 rounded-lg p-3">
                  {profile.companyName
                    ? `We're ${profile.companyName}${profile.primaryCurrency.code ? ` (${profile.primaryCurrency.code})` : ""}! ${profile.description || "We help customers with tailored solutions."}`
                    : "Tell us about your company to preview responses."}
                </p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">
                  User: “Can I pay in my currency?”
                </p>
                <p className="text-sm text-gray-100 bg-gray-800/60 rounded-lg p-3">
                  {profile.primaryCurrency.code
                    ? `We charge in ${profile.primaryCurrency.code}${profile.acceptedCurrencies.length ? ` and also accept ${profile.acceptedCurrencies.join(", ")}.` : "."}`
                    : "Set your primary currency so agents can answer clearly."}
                </p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">
                  User: “Where are you located?”
                </p>
                <p className="text-sm text-gray-100 bg-gray-800/60 rounded-lg p-3">
                  {locations.some((loc) => loc.locationName)
                    ? `Our primary location is ${locations.find((loc) => loc.isPrimary)?.locationName || locations[0].locationName}, ${locations.find((loc) => loc.isPrimary)?.address.city || locations[0].address.city}.`
                    : "Add a store or HQ so agents can guide visitors."}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-700/50 border border-gray-600 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              ✅ Completion Status
            </h3>
            <div className="space-y-3">
              {[
                {
                  label: "Business Identity",
                  done: !!(
                    profile.companyName &&
                    profile.industry &&
                    profile.address.country
                  ),
                },
                { label: "Brand Voice", done: !!profile.brandVoice },
                { label: "Target Audience", done: !!profile.targetAudience },
                {
                  label: "Commerce Settings",
                  done: !!profile.primaryCurrency.code,
                },
                { label: "Support Contacts", done: !!profile.supportEmail },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-gray-400">{item.label}</span>
                  <span
                    className={`text-sm font-medium ${item.done ? "text-green-400" : "text-yellow-400"}`}
                  >
                    {item.done ? "Complete ✓" : "Incomplete"}
                  </span>
                </div>
              ))}
              <div
                className={`border rounded-lg p-3 mt-4 ${completion === 100 ? "bg-green-500/20 border-green-500/30" : "bg-yellow-500/20 border-yellow-500/30"}`}
              >
                <p
                  className={`text-sm font-medium ${completion === 100 ? "text-green-300" : "text-yellow-300"}`}
                >
                  {completion === 100
                    ? "🎉 Profile 100% Complete!"
                    : `Profile ${completion}% Complete`}
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  {completion === 100
                    ? "Agents now have commerce-ready context."
                    : "Complete the highlighted sections to unlock richer responses."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile;
