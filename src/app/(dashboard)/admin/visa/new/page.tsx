import { AdminChrome } from "@/app/(dashboard)/admin/_components/AdminChrome";
import { GuidanceEditor } from "@/app/(dashboard)/admin/_components/catalog/GuidanceEditor";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "New destination guidance",
};

export default function AdminNewVisaPage() {
  return (
    <AdminChrome
      title="New destination guidance"
      description="Country, study level and visa category. Official URLs and review dates are required before publish."
    >
      <GuidanceEditor
        initial={{
          country: "GB",
          studyLevel: "undergraduate",
          visaCategory: "student_visa",
          nationalityApplicability: "",
          officialUrl: "",
          officialAuthority: "",
          sourceDate: "",
          applicationFeeAmount: "",
          applicationFeeCurrency: "",
          visaFeeAmount: "",
          visaFeeCurrency: "",
          paymentNotes: "",
          processingMin: "",
          processingMax: "",
          processingUnit: "",
          documents: "passport, offer_letter, financial_proof, photos, visa_form, medical, insurance",
          countryRules: "",
          workHoursValue: "",
          workHoursPeriod: "",
          workHoursConditions: "",
          workHoursSource: "",
          workHoursSourceDate: "",
          faq: "",
          reapplicationNotes: "",
          studentAdvice: "",
          counselorNotes: "",
          nextReviewAt: "",
        }}
      />
    </AdminChrome>
  );
}
