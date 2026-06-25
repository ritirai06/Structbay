import { AlertCircle, CheckCircle2 } from "lucide-react";

interface MinimumOrderBannerProps {
  cartSubtotal: number;
  minimumOrderValue: number;
  compact?: boolean;
}

export function MinimumOrderBanner({ cartSubtotal, minimumOrderValue, compact = false }: MinimumOrderBannerProps) {
  const meetsMinimum = cartSubtotal >= minimumOrderValue;
  const remainingAmount = Math.max(0, minimumOrderValue - cartSubtotal);
  const progressPercentage = Math.min(100, Math.round((cartSubtotal / minimumOrderValue) * 100));

  if (compact) {
    return (
      <div className={`rounded-lg p-3 ${meetsMinimum ? 'bg-green-50' : 'bg-amber-50'}`}>
        <div className="flex items-center gap-2">
          {meetsMinimum ? (
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span className={`text-sm font-medium ${meetsMinimum ? 'text-green-700' : 'text-amber-700'}`}>
            {meetsMinimum
              ? 'Ready for checkout!'
              : `Add ₹${remainingAmount.toLocaleString('en-IN')} more to checkout`
            }
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-4 ${
      meetsMinimum 
        ? 'bg-green-50 border-green-200' 
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-start gap-3">
        {meetsMinimum ? (
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          {meetsMinimum ? (
            <>
              <p className="font-semibold text-green-800">Minimum order requirement met!</p>
              <p className="text-sm text-green-700 mt-0.5">You can proceed to checkout.</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-amber-800">
                Add ₹{remainingAmount.toLocaleString('en-IN')} more to reach the minimum order value of ₹{minimumOrderValue.toLocaleString('en-IN')}.
              </p>
              <p className="text-sm text-amber-700 mt-0.5">
                {progressPercentage < 50 
                  ? `You're ${100 - progressPercentage}% away from checkout eligibility.`
                  : `You're only ₹${remainingAmount.toLocaleString('en-IN')} away from placing your order!`
                }
              </p>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className={meetsMinimum ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>
            ₹{cartSubtotal.toLocaleString('en-IN')} / ₹{minimumOrderValue.toLocaleString('en-IN')}
          </span>
          <span className={meetsMinimum ? 'text-green-700' : 'text-amber-700'}>
            {progressPercentage}%
          </span>
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              meetsMinimum ? 'bg-green-500' : 'bg-amber-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}