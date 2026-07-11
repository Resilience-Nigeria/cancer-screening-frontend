// Add inside register.tsx or extract to components/RegistrationSuccess.tsx
function SuccessScreen({
  name,
  email,
  facility,
}: {
  name: string;
  email: string;
  facility: Facility | null;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 
                        rounded-full bg-green-100 mx-auto">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">You're all set!</h1>
          <p className="mt-2 text-gray-500 text-sm">
            Thank you{name ? `, ${name.split(" ")[0]}` : ""}. Your number has been
            verified and you've been linked to a screening centre.
            {email ? " Check your WhatsApp and email for details." : " Check your WhatsApp for details."}
          </p>
        </div>

        {facility ? (
          <div className="rounded-2xl bg-white border border-green-100 shadow-md p-5 text-left space-y-3">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
              Your Screening Centre
            </p>
            <p className="text-lg font-bold text-gray-900">{facility.facilityName}</p>
            {facility.facilityAddress && (
              <p className="text-sm text-gray-500">{facility.facilityAddress}</p>
            )}
            {facility.navigatorName && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Your Contact Person</p>
                <p className="font-semibold text-gray-800">{facility.navigatorName}</p>
                {facility.navigatorPhone && (
                  
                    href={`tel:${facility.navigatorPhone}`}
                    className="inline-flex items-center gap-1.5 mt-1 text-green-700 
                               font-medium text-sm hover:underline"
                  >
                    {facility.navigatorPhone}
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
            <p className="text-sm text-amber-700">
              Our team will reach out to you shortly with your screening centre details.
            </p>
          </div>
        )}

        <p className="text-xs text-gray-400">
          Please attend your screening as soon as possible. Early detection saves lives.
        </p>
      </div>
    </div>
  );
}