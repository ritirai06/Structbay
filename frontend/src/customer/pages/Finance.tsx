import { useState } from "react";
import { User, IndianRupee, ChevronDown, CheckCircle2, AlertCircle } from "lucide-react";
import { getApiV1Base } from "../../lib/apiBase";
import { getCustomerAccessToken } from "../lib/authStorage";

export function Finance() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    employmentType: "Self Employed",
    currentSalary: "",
    companyName: "",
    yearsInBusiness: "<1",
    annualTurnover: "<1 crore",
    loanAmount: "0-50 lakh",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [ref, setRef] = useState("");

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const parseAmount = (raw: string) => {
    const n = parseFloat(String(raw).replace(/,/g, ""));
    return Number.isFinite(n) ? n : undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const loanAmountRequired = parseAmount(form.loanAmount) || 0;
      
      const base = getApiV1Base().replace(/\/$/, "");
      const token = getCustomerAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const selfEmployedDetails = form.employmentType === "Self Employed" ? `\nCompany Name: ${form.companyName}\nYears in Business: ${form.yearsInBusiness}\nAnnual Turnover: ${form.annualTurnover}` : "";
      const salariedDetails = form.employmentType === "Salaried" ? `\nCurrent Salary: ${form.currentSalary}` : "";
      const remarksText = `Structbay finance — submitted via storefront.\nEmployment Type: ${form.employmentType}${salariedDetails}${selfEmployedDetails}\nTyped Loan Amount: ${form.loanAmount}`;

      const res = await fetch(`${base}/finance/applications`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: form.name.trim(),
          mobile: form.phone.trim(),
          email: form.email.trim(),
          projectLocation: form.city.trim(),
          companyName: form.employmentType === "Self Employed" ? form.companyName.trim() : undefined,
          loanAmountRequired,
          remarks: remarksText,
        }),
      });

      const text = await res.text();
      let json: { success?: boolean; message?: string; data?: { financeNumber?: string } } = {};
      if (text) {
        try {
          json = JSON.parse(text) as typeof json;
        } catch {
          setError("Unexpected response from server.");
          setLoading(false);
          return;
        }
      }
      if (!res.ok || json.success === false) {
        setError(json.message || `Request failed (${res.status})`);
        setLoading(false);
        return;
      }
      setRef(json.data?.financeNumber || "");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="bg-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application submitted</h2>
          <p className="text-gray-600 mb-6">Our finance team will review your application and contact you shortly.</p>
          {ref && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Your reference number</p>
              <p className="font-mono font-bold text-gray-900">{ref}</p>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-xl transition-colors"
          >
            Submit another enquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 w-full max-w-2xl">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight">Finance Enquiry Form</h2>
        
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[13px] font-bold text-gray-500 mb-2">Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-orange-400 stroke-[1.5]" />
              </div>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
                className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl pl-11 pr-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-bold text-gray-500 mb-2">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              required
              className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-gray-500 mb-2">Email ID</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-gray-500 mb-2">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              required
              className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-[13px] font-bold text-gray-500 mb-2">Salaried or Self Employed</label>
            <div className="relative">
              <select
                value={form.employmentType}
                onChange={(e) => update("employmentType", e.target.value)}
                className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 transition-all duration-200 appearance-none pr-10"
              >
                <option value="Salaried">Salaried</option>
                <option value="Self Employed">Self Employed</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          {form.employmentType === "Salaried" && (
            <div className="space-y-6 pt-2">
              <div className="bg-[#fff4ed] border-l-[3px] border-[#f4722b] text-black font-extrabold text-[13px] tracking-wide px-4 py-3.5 rounded-r-lg">
                IF SALARIED
              </div>
              
              <div>
                <label className="block text-[13px] font-bold text-gray-500 mb-2">Current Salary</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <IndianRupee className="h-5 w-5 text-purple-800 stroke-[1.5]" />
                  </div>
                  <input
                    type="text"
                    value={form.currentSalary}
                    onChange={(e) => update("currentSalary", e.target.value)}
                    required={form.employmentType === "Salaried"}
                    className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl pl-11 pr-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          )}

          {form.employmentType === "Self Employed" && (
            <div className="space-y-6 pt-2">
              <div className="bg-[#fff4ed] border-l-[3px] border-[#f4722b] text-black font-extrabold text-[13px] tracking-wide px-4 py-3.5 rounded-r-lg">
                IF SELF EMPLOYED
              </div>
              
              <div>
                <label className="block text-[13px] font-bold text-gray-500 mb-2">Company Name</label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => update("companyName", e.target.value)}
                  required={form.employmentType === "Self Employed"}
                  className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-500 mb-2">Years in Business</label>
                <div className="relative">
                  <select
                    value={form.yearsInBusiness}
                    onChange={(e) => update("yearsInBusiness", e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 transition-all duration-200 appearance-none pr-10"
                  >
                    <option value="<1">&lt;1</option>
                    <option value="1-3">1-3</option>
                    <option value="3-5">3-5</option>
                    <option value="5+">5+</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-bold text-gray-500 mb-2">Annual Turnover</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <IndianRupee className="h-5 w-5 text-purple-800 stroke-[1.5]" />
                  </div>
                  <select
                    value={form.annualTurnover}
                    onChange={(e) => update("annualTurnover", e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl pl-11 pr-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 transition-all duration-200 appearance-none pr-10"
                  >
                    <option value="<1 crore">&lt;1 crore</option>
                    <option value="1-5 crore">1-5 crore</option>
                    <option value="5-10 crore">5-10 crore</option>
                    <option value="10+ crore">10+ crore</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <label className="block text-[13px] font-bold text-gray-500 mb-2">Loan Amount Required</label>
            <div className="relative">
              <input
                type="text"
                list="loanAmountOptions"
                value={form.loanAmount}
                onChange={(e) => update("loanAmount", e.target.value)}
                placeholder="Select or type amount manually..."
                required
                className="w-full bg-[#f8f9fa] border border-gray-100 rounded-xl px-4 py-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 transition-all duration-200 pr-10"
              />
              <datalist id="loanAmountOptions">
                <option value="0-50 lakh" />
                <option value="50 lakh - 1 Crore" />
                <option value="1 Crore+" />
              </datalist>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#f4722b] hover:bg-[#e66019] text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm text-[15px] disabled:opacity-70 flex items-center justify-center"
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

