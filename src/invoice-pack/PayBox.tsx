import { CONTACT_EMAIL } from './logic'
import { FreeAccess } from './FreeAccess'
import { onlinePaymentsEnabled } from './payments-api'
import { RazorpayPay } from './RazorpayPay'

export function PayBox() {
  const online = onlinePaymentsEnabled()
  return (
    <div className="ip-note" data-testid="pay-499">
      <h3>Pay ₹499</h3>
      {online ? (
        <>
          <RazorpayPay productId="invoice-pack" amountInr={499} />
          <FreeAccess />
        </>
      ) : (
        <p className="ip-lede">
          Razorpay checkout is not wired on this build. On the live site, pay ₹499 through Razorpay after you finish
          your invoice. Questions? Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      )}
    </div>
  )
}